from fastapi import FastAPI, HTTPException, Path, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List, Optional, Any, Union
import time
import uuid
from firestore_service import (
    create_document, read_document, update_document, initialize_firestore,
    get_user_learning_profile, store_generated_lesson, get_today_lesson,
    store_formula_entry, store_faq_entry, get_formula_entries, get_faq_entries,
    update_user_learning_profile
)
from openai_service import (
    generate_lesson, generate_revision_content, generate_formula_entry,
    generate_faq_entry, analyze_quiz_results, generate_daily_lesson,
    generate_diagnostic_questions, analyze_diagnostic_results
)

app = FastAPI(title="DCIO/Tech Exam Preparation Platform API")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Models
class LearningProfile(BaseModel):
    strengths: Dict[str, float] = {}
    weaknesses: Dict[str, float] = {}
    learning_pace: float = 1.0
    preferred_formats: Dict[str, int] = {"clarity": 0, "infographic": 0, "audio": 0, "practice_questions": 0}
    difficulty_adjustment: float = 1.0
    progress_map: Dict[str, Any] = {}
    daily_streak: int = 0
    total_study_time: int = 0

class QuizSubmission(BaseModel):
    lesson_id: str
    topic_id: str
    questions_attempted_json: str
    score: float
    correct_answers_count: int
    incorrect_answers_count: int
    time_taken_seconds: int
    confidence_ratings: List[int] = []

class DiagnosticSettings(BaseModel):
    questionCount: int = 10
    topicSelection: Union[str, List[str]] = 'random'
    difficultyDistribution: Dict[str, int] = {
        "easy": 30,
        "medium": 50,
        "hard": 20
    }
    timeLimit: Optional[int] = 600  # 10 minutes

class DiagnosticSubmission(BaseModel):
    questions: List[Dict[str, Any]]
    answers: List[Dict[str, Any]]
    learningStyle: str
    selfRating: Optional[str] = None
    weakTopics: List[str] = []
    strongTopics: List[str] = []

class TopicInteraction(BaseModel):
    topic_id: str
    interaction_type: str
    time_spent: int
    difficulty_rating: Optional[int] = None
    content_generated: bool = False
    user_feedback: Optional[str] = None

class LessonRequest(BaseModel):
    topic_id: str
    difficulty_level: Optional[str] = "intermediate"

class RevisionRequest(BaseModel):
    topic_id: str
    revision_type: str  # clarity, infographic, audio, practice_questions
    difficulty_level: Optional[str] = None

# Routes
@app.get("/")
def read_root():
    return {"message": "Welcome to the DCIO/Tech Exam Preparation Platform API"}

# Diagnostic Assessment Endpoints
@app.post("/api/diagnostic/generate")
def generate_diagnostic_questions_endpoint(
    settings: DiagnosticSettings,
    app_id: str,
    user_id: str
):
    """Generate diagnostic questions based on the provided settings"""
    try:
        # Get user's learning profile if it exists
        user_profile = get_user_learning_profile(app_id, user_id)
        
        # Define a simple syllabus (in a real app, this would be more comprehensive)
        syllabus_topics = [
            "digital_electronics",
            "analog_circuits",
            "communication_systems",
            "computer_networks",
            "operating_systems",
            "data_structures",
            "algorithms",
            "cyber_security",
            "cryptography",
            "information_theory"
        ]
        
        # Select topics based on settings
        selected_topics = []
        if settings.topicSelection == 'all':
            selected_topics = syllabus_topics
        elif settings.topicSelection == 'random':
            # Randomly select topics to cover
            import random
            topic_count = min(5, len(syllabus_topics))
            selected_topics = random.sample(syllabus_topics, topic_count)
        elif isinstance(settings.topicSelection, list):
            selected_topics = settings.topicSelection
        
        # Generate questions using OpenAI
        questions = generate_diagnostic_questions(
            topics=selected_topics,
            difficulty_distribution=settings.difficultyDistribution,
            question_count=settings.questionCount,
            user_profile=user_profile
        )
        
        # Shuffle the questions
        import random
        random.shuffle(questions)
        
        # Store the generated questions in Firestore for future reference
        questions_path = f"artifacts/{app_id}/users/{user_id}/diagnostic_questions"
        questions_id = f"diagnostic_{int(time.time())}"
        
        questions_data = {
            "questions": questions,
            "settings": settings.dict(),
            "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        }
        
        create_document(questions_path, questions_id, questions_data)
        
        return {
            "message": "Diagnostic questions generated successfully",
            "questions": questions
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating diagnostic questions: {str(e)}")

@app.post("/api/diagnostic/analyze")
def analyze_diagnostic_results_endpoint(
    submission: DiagnosticSubmission,
    app_id: str,
    user_id: str
):
    """Analyze diagnostic assessment results and update the learning profile"""
    try:
        # Get user's learning profile
        profile = get_user_learning_profile(app_id, user_id)
        
        # Use OpenAI to analyze the diagnostic results
        analysis_result = analyze_diagnostic_results(
            questions=submission.questions,
            answers=submission.answers,
            learning_style=submission.learningStyle,
            self_rating=submission.selfRating,
            weak_topics=submission.weakTopics,
            strong_topics=submission.strongTopics
        )
        
        # Extract key information from the analysis
        topic_scores = analysis_result["topic_scores"]
        strengths = analysis_result["strengths"]
        weaknesses = analysis_result["weaknesses"]
        overall_score = analysis_result["overall_score"]
        detailed_analysis = analysis_result.get("analysis", {})
        
        # Update the learning profile
        updates = {
            "strengths": {topic: 0.7 for topic in strengths},  # Initial strength score
            "weaknesses": {topic: 0.7 for topic in weaknesses},  # Initial weakness score
            "learning_style": submission.learningStyle,
            "self_rating": submission.selfRating,
            "diagnostic_completed": True,
            "diagnostic_results": {
                "topic_scores": topic_scores,
                "strengths": strengths,
                "weaknesses": weaknesses,
                "overall_score": overall_score,
                "detailed_analysis": detailed_analysis
            }
        }
        
        # Store the diagnostic submission in Firestore
        submission_path = f"artifacts/{app_id}/users/{user_id}/diagnostic_submissions"
        submission_id = f"submission_{int(time.time())}"
        
        submission_data = {
            "questions": submission.questions,
            "answers": submission.answers,
            "learning_style": submission.learningStyle,
            "self_rating": submission.selfRating,
            "weak_topics": submission.weakTopics,
            "strong_topics": submission.strongTopics,
            "analysis_result": analysis_result,
            "submitted_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        }
        
        create_document(submission_path, submission_id, submission_data)
        
        # Update profile in Firestore
        success = update_user_learning_profile(app_id, user_id, updates)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to update learning profile")
        
        return {
            "message": "Diagnostic results analyzed successfully",
            "analysis": {
                "topicScores": topic_scores,
                "strengths": strengths,
                "weaknesses": weaknesses,
                "overallScore": overall_score,
                "detailedAnalysis": detailed_analysis
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing diagnostic results: {str(e)}")

# Syllabus Endpoints
@app.get("/api/syllabus/topics")
def get_syllabus_topics_endpoint(app_id: str):
    """Get the list of syllabus topics"""
    # In a real application, this would be fetched from Firestore or a configuration file
    # For now, we'll use a hardcoded list
    syllabus_topics = [
        {"id": "electronics-semiconductors", "name": "Semiconductor Physics", "subjectArea": "Electronics"},
        {"id": "cs-datastructures", "name": "Data Structures", "subjectArea": "Computer Science"},
        {"id": "communication-systems", "name": "Communication Systems", "subjectArea": "Electronics"},
        {"id": "computer-networks", "name": "Computer Networks", "subjectArea": "Computer Science"},
        {"id": "operating-systems", "name": "Operating Systems", "subjectArea": "Computer Science"},
        {"id": "algorithms", "name": "Algorithms", "subjectArea": "Computer Science"},
        {"id": "cyber-security", "name": "Cyber Security", "subjectArea": "Computer Science"},
        {"id": "cryptography", "name": "Cryptography", "subjectArea": "Computer Science"},
        {"id": "information-theory", "name": "Information Theory", "subjectArea": "Electronics"},
        {"id": "digital-electronics", "name": "Digital Electronics", "subjectArea": "Electronics"},
        {"id": "analog-circuits", "name": "Analog Circuits", "subjectArea": "Electronics"},
        {"id": "database-management", "name": "Database Management", "subjectArea": "Computer Science"},
        {"id": "software-engineering", "name": "Software Engineering", "subjectArea": "Computer Science"},
        {"id": "web-technologies", "name": "Web Technologies", "subjectArea": "Computer Science"},
        {"id": "artificial-intelligence", "name": "Artificial Intelligence", "subjectArea": "Computer Science"},
        {"id": "machine-learning", "name": "Machine Learning", "subjectArea": "Computer Science"},
    ]
    return {"message": "Syllabus topics retrieved successfully", "topics": syllabus_topics}

# Learning Profile Endpoints
@app.get("/api/learning-profile/{app_id}/{user_id}")
def get_learning_profile(app_id: str = Path(...), user_id: str = Path(...)):
    """Get the user's learning profile"""
    profile_path = f"artifacts/{app_id}/users/{user_id}/learning_profile"
    profile = read_document(profile_path, "profile")
    
    if not profile:
        # Initialize profile if it doesn't exist
        initialize_firestore(app_id, user_id)
        profile = read_document(profile_path, "profile")
    
    return {"profile": profile}

@app.post("/api/learning-profile/{app_id}/{user_id}")
def update_learning_profile(
    profile: LearningProfile,
    app_id: str = Path(...),
    user_id: str = Path(...)
):
    """Update the user's learning profile"""
    profile_path = f"artifacts/{app_id}/users/{user_id}/learning_profile"
    
    # Check if profile exists
    existing_profile = read_document(profile_path, "profile")
    if not existing_profile:
        initialize_firestore(app_id, user_id)
    
    # Update profile
    success = update_document(profile_path, "profile", profile.dict())
    if not success:
        raise HTTPException(status_code=500, detail="Failed to update learning profile")
    
    return {"message": "Learning profile updated successfully"}

# Analytics Endpoints
@app.post("/api/analytics/quiz-submission/{app_id}/{user_id}")
def submit_quiz(
    submission: QuizSubmission,
    app_id: str = Path(...),
    user_id: str = Path(...)
):
    """Submit quiz answers and update the learning profile"""
    try:
        # Store quiz submission
        quiz_path = f"artifacts/{app_id}/users/{user_id}/quizzes"
        quiz_id = f"quiz_{int(time.time())}_{uuid.uuid4().hex[:8]}"
        
        quiz_data = submission.dict()
        quiz_data["submitted_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        
        success = create_document(quiz_path, quiz_id, quiz_data)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to store quiz submission")
        
        # Get user's learning profile
        profile = get_user_learning_profile(app_id, user_id)
        
        # Analyze quiz results using OpenAI
        analysis = analyze_quiz_results(quiz_data, profile)
        
        # Update learning profile based on analysis
        updates = {}
        
        # Update strengths and weaknesses based on analysis
        topic_id = submission.topic_id
        
        # Update strengths
        if "strengths_identified" in analysis and analysis["strengths_identified"]:
            for strength in analysis["strengths_identified"]:
                strength_key = strength.lower().replace(" ", "_")
                if strength_key not in profile.get("strengths", {}):
                    if "strengths" not in updates:
                        updates["strengths"] = {}
                    updates["strengths"][strength_key] = 0.7  # Initial strength score
        
        # Update weaknesses
        if "weaknesses_identified" in analysis and analysis["weaknesses_identified"]:
            for weakness in analysis["weaknesses_identified"]:
                weakness_key = weakness.lower().replace(" ", "_")
                if weakness_key not in profile.get("weaknesses", {}):
                    if "weaknesses" not in updates:
                        updates["weaknesses"] = {}
                    updates["weaknesses"][weakness_key] = 0.7  # Initial weakness score
        
        # Update difficulty adjustment based on analysis suggestion
        if "difficulty_adjustment_suggestion" in analysis:
            updates["difficulty_adjustment"] = analysis["difficulty_adjustment_suggestion"]
        
        # Update total study time
        updates["total_study_time"] = profile.get("total_study_time", 0) + submission.time_taken_seconds
        
        # Update profile in Firestore
        success = update_user_learning_profile(app_id, user_id, updates)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to update learning profile")
        
        # Return the analysis along with success message
        return {
            "message": "Quiz submitted and profile updated successfully",
            "analysis": analysis
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing quiz submission: {str(e)}")

@app.post("/api/analytics/topic-interaction/{app_id}/{user_id}")
def track_topic_interaction(
    interaction: TopicInteraction,
    app_id: str = Path(...),
    user_id: str = Path(...)
):
    """Track topic interactions and update the learning profile"""
    # Store interaction log
    log_path = f"artifacts/{app_id}/users/{user_id}/revision_logs"
    log_id = f"log_{int(time.time())}_{uuid.uuid4().hex[:8]}"
    
    log_data = interaction.dict()
    log_data["timestamp"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    
    success = create_document(log_path, log_id, log_data)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to store interaction log")
    
    # Update learning profile based on interaction
    profile_path = f"artifacts/{app_id}/users/{user_id}/learning_profile"
    profile = read_document(profile_path, "profile")
    
    if not profile:
        initialize_firestore(app_id, user_id)
        profile = read_document(profile_path, "profile")
    
    # Update preferred formats based on interaction type
    if interaction.interaction_type in ["clarity", "infographic", "audio", "practice_questions"]:
        profile["preferred_formats"][interaction.interaction_type] = profile["preferred_formats"].get(interaction.interaction_type, 0) + 1
    
    # Update total study time
    profile["total_study_time"] = profile.get("total_study_time", 0) + interaction.time_spent
    
    # Update last active date
    profile["last_active_date"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    
    # Update profile in Firestore
    success = update_document(profile_path, "profile", profile)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to update learning profile")
    
    return {"message": "Interaction tracked and profile updated successfully"}

# Lesson Endpoints
@app.get("/api/lessons/today")
def get_today_lesson_endpoint(app_id: str, user_id: str):
    """Get today's pre-generated lesson"""
    try:
        # Try to get a pre-generated lesson for today
        lesson = get_today_lesson(app_id, user_id)
        
        # If no lesson is found, generate one
        if not lesson:
            # Get user's learning profile
            user_profile = get_user_learning_profile(app_id, user_id)
            
            # Define a simple syllabus (in a real app, this would be more comprehensive)
            syllabus_topics = [
                "Data Structures", "Algorithms", "Computer Networks", 
                "Operating Systems", "Database Management", "Cyber Security",
                "Digital Electronics", "Microprocessors", "Software Engineering",
                "Web Technologies", "Artificial Intelligence", "Machine Learning"
            ]
            
            # Generate a daily lesson based on the user's profile
            lesson = generate_daily_lesson(user_profile, syllabus_topics)
            
            # Store the generated lesson
            lesson_id = store_generated_lesson(app_id, user_id, lesson)
            
            if not lesson_id:
                raise HTTPException(status_code=500, detail="Failed to store generated daily lesson")
            
            # Add the lesson ID to the response
            lesson["id"] = lesson_id
        
        return {
            "message": "Today's lesson retrieved successfully",
            "lesson": lesson
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving today's lesson: {str(e)}")

@app.post("/api/lessons/generate")
def generate_lesson_endpoint(request: LessonRequest, app_id: str, user_id: str):
    """Generate a lesson for a specific topic"""
    try:
        # Get user's learning profile
        user_profile = get_user_learning_profile(app_id, user_id)
        
        # Generate lesson using OpenAI
        lesson = generate_lesson(
            topic=request.topic_id,
            difficulty_level=request.difficulty_level,
            user_profile=user_profile
        )
        
        # Store the generated lesson
        lesson_id = store_generated_lesson(app_id, user_id, lesson)
        
        if not lesson_id:
            raise HTTPException(status_code=500, detail="Failed to store generated lesson")
        
        # Add the lesson ID to the response
        lesson["id"] = lesson_id
        
        return {
            "message": "Lesson generated successfully",
            "lesson": lesson
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating lesson: {str(e)}")

# Revision Endpoints
@app.post("/api/revision/generate")
def generate_revision_endpoint(request: RevisionRequest, app_id: str, user_id: str):
    """Generate revision content"""
    try:
        # Get user's learning profile
        user_profile = get_user_learning_profile(app_id, user_id)
        
        # Generate revision content using OpenAI
        revision = generate_revision_content(
            topic=request.topic_id,
            revision_type=request.revision_type,
            user_profile=user_profile,
            difficulty_level=request.difficulty_level or "intermediate"
        )
        
        # Store the revision log
        log_path = f"artifacts/{app_id}/users/{user_id}/revision_logs"
        log_id = f"revision_{int(time.time())}_{uuid.uuid4().hex[:8]}"
        
        log_data = {
            "topic_id": request.topic_id,
            "revision_type": request.revision_type,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "content_generated": True
        }
        
        create_document(log_path, log_id, log_data)
        
        # Update preferred formats in learning profile
        if request.revision_type in ["clarity", "infographic", "audio", "practice_questions"]:
            profile_path = f"artifacts/{app_id}/users/{user_id}/learning_profile"
            profile = read_document(profile_path, "profile")
            
            if profile:
                profile["preferred_formats"][request.revision_type] = profile["preferred_formats"].get(request.revision_type, 0) + 1
                update_document(profile_path, "profile", profile)
        
        return {
            "message": f"Generated {request.revision_type} revision content successfully",
            "revision": revision
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating revision content: {str(e)}")

# Formula Sheet Endpoints
@app.post("/api/formula-sheet/add/{app_id}/{user_id}")
def add_formula_entry_endpoint(
    app_id: str = Path(...),
    user_id: str = Path(...),
    topic: str = Body(...),
    concept: str = Body(...)
):
    """Add a formula entry to the user's formula sheet"""
    try:
        # Get user's learning profile
        user_profile = get_user_learning_profile(app_id, user_id)
        
        # Generate formula entry using OpenAI
        formula_entry = generate_formula_entry(
            topic=topic,
            concept=concept,
            user_profile=user_profile
        )
        
        # Store the formula entry
        formula_id = store_formula_entry(app_id, user_id, formula_entry)
        
        if not formula_id:
            raise HTTPException(status_code=500, detail="Failed to store formula entry")
        
        # Add the formula ID to the response
        formula_entry["id"] = formula_id
        
        return {
            "message": "Formula entry added successfully",
            "formula": formula_entry
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error adding formula entry: {str(e)}")

@app.get("/api/formula-sheet/{app_id}/{user_id}")
def get_formula_entries_endpoint(
    app_id: str = Path(...),
    user_id: str = Path(...),
    topic_id: Optional[str] = None
):
    """Get formula entries from the user's formula sheet"""
    try:
        # Get formula entries
        formulas = get_formula_entries(app_id, user_id, topic_id)
        
        return {
            "message": "Formula entries retrieved successfully",
            "formulas": formulas
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving formula entries: {str(e)}")

# FAQ Endpoints
@app.post("/api/faq-booklet/add/{app_id}/{user_id}")
def add_faq_entry_endpoint(
    app_id: str = Path(...),
    user_id: str = Path(...),
    topic: str = Body(...),
    question: str = Body(...)
):
    """Add an FAQ entry to the user's FAQ booklet"""
    try:
        # Get user's learning profile
        user_profile = get_user_learning_profile(app_id, user_id)
        
        # Generate FAQ entry using OpenAI
        faq_entry = generate_faq_entry(
            topic=topic,
            question=question,
            user_profile=user_profile
        )
        
        # Store the FAQ entry
        faq_id = store_faq_entry(app_id, user_id, faq_entry)
        
        if not faq_id:
            raise HTTPException(status_code=500, detail="Failed to store FAQ entry")
        
        # Add the FAQ ID to the response
        faq_entry["id"] = faq_id
        
        return {
            "message": "FAQ entry added successfully",
            "faq": faq_entry
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error adding FAQ entry: {str(e)}")

@app.get("/api/faq-booklet/{app_id}/{user_id}")
def get_faq_entries_endpoint(
    app_id: str = Path(...),
    user_id: str = Path(...),
    topic_id: Optional[str] = None
):
    """Get FAQ entries from the user's FAQ booklet"""
    try:
        # Get FAQ entries
        faqs = get_faq_entries(app_id, user_id, topic_id)
        
        return {
            "message": "FAQ entries retrieved successfully",
            "faqs": faqs
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving FAQ entries: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
