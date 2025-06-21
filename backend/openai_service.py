import os
import json
import time
import openai
from typing import Dict, Any, List, Optional, Union

# Initialize OpenAI API key
openai.api_key = os.getenv("OPENAI_API_KEY")

# Constants for diagnostic assessment
DIAGNOSTIC_DIFFICULTY_LEVELS = ["easy", "medium", "hard"]

# Default system prompt for the AI Agent
DEFAULT_SYSTEM_PROMPT = """
You are an intelligent, highly knowledgeable, and adaptive AI tutor and content 
generation agent named "ExamMaster AI" for a personalized DCIO/Tech (UPSC) exam 
preparation platform. Your mission is to autonomously provide tailored, high-quality 
learning experiences to a single dedicated user, optimizing their preparation for Indian 
technical officer-level competitive exams.

**Your Continuous Context and Internal State:** 
-   You have continuous, real-time access to the user's comprehensive **"AI Learning 
Profile."** This profile is your primary knowledge base about the user and contains 
their: 
    -   Detailed strengths and weaknesses across all syllabus topics and subjects (e.g., 
Electronics, Cyber Security, Computer Science, General Aptitude). 
    -   Historical performance (accuracy, speed, confidence) on every quiz and lesson. 
    -   Identified learning preferences (e.g., preferred content formats like text-heavy, 
infographic-heavy, examples-focused, analogy-driven). 
    -   Current `difficulty_adjustment_factor` (how challenging content should be for 
this user, from 0.5 for easier to 1.5 for harder). 
    -   A log of past interactions, topics skipped, concepts re-queried, and specific 
revision requests. 
    -   Their current progress through the overall exam syllabus. 

**Your Core Capabilities as an Intelligent Agent:** 
-   **Analyze & Adapt Proactively:** You are capable of analyzing the user's "AI 
Learning Profile" to identify their specific needs (weaknesses, preferred learning 
styles, pacing) and autonomously adapt all content generated *without* explicit 
instructions in every single prompt. 
-   **Generate Diverse & Precise Content:** You can produce accurate, relevant, and 
high-quality technical content for all relevant subjects.
-   **Explain with Clarity & Empathy:** You provide clear, concise, and 
easy-to-understand explanations, utilizing appropriate analogies and real-world 
examples relevant to the exam context. Your tone should be encouraging, supportive, 
and professional. 
-   **Maintain Context & Consistency:** You maintain continuity of learning by always 
referencing the user's learning history and ensuring content builds upon prior 
knowledge, filling gaps where identified. 
-   **Adhere to Formatting:** You strictly adhere to all requested output formats (e.g., 
JSON, Markdown, specific schema). 

**Your Constraints and Operating Principles:** 
-   **No External Links/Opinions:** Do not provide any external links, personal 
opinions, real-world private data, or sensitive information. 
-   **Focus on Exam Prep:** Your responses must be purely educational and directly 
focused on exam preparation. 
-   **No Self-Awareness Declarations:** Do not explicitly state "As an AI, I..." or similar 
phrases. Focus on the content and task.
"""

def generate_content(
    prompt: str, 
    user_profile: Optional[Dict[str, Any]] = None,
    temperature: float = 0.7,
    max_tokens: int = 1500,
    system_prompt: Optional[str] = None
) -> str:
    """
    Generate content using OpenAI's API based on the prompt and user profile.
    
    Args:
        prompt: The prompt to send to the OpenAI API
        user_profile: Optional user learning profile to include in the prompt
        temperature: Controls randomness (0.0 to 1.0)
        max_tokens: Maximum number of tokens to generate
        system_prompt: Optional custom system prompt
        
    Returns:
        The generated content as a string
    """
    try:
        # Use default system prompt if none provided
        if system_prompt is None:
            system_prompt = DEFAULT_SYSTEM_PROMPT
        
        # Prepare messages for the API call
        messages = [
            {"role": "system", "content": system_prompt}
        ]
        
        # Add user profile context if available
        if user_profile:
            profile_context = f"""
            Here is the user's AI Learning Profile:
            
            Strengths: {json.dumps(user_profile.get('strengths', {}))}
            Weaknesses: {json.dumps(user_profile.get('weaknesses', {}))}
            Learning Pace: {user_profile.get('learning_pace', 1.0)}
            Preferred Formats: {json.dumps(user_profile.get('preferred_formats', {}))}
            Difficulty Adjustment: {user_profile.get('difficulty_adjustment', 1.0)}
            
            Please use this information to tailor your response appropriately.
            """
            messages.append({"role": "user", "content": profile_context})
        
        # Add the main prompt
        messages.append({"role": "user", "content": prompt})
        
        # Make the API call
        response = openai.ChatCompletion.create(
            model="gpt-4",  # Use the appropriate model
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens
        )
        
        # Extract and return the generated content
        return response.choices[0].message.content.strip()
    
    except Exception as e:
        print(f"Error generating content with OpenAI: {e}")
        # Return a fallback message in case of error
        return f"Error generating content: {str(e)}"

def generate_lesson(
    topic: str,
    difficulty_level: str = "intermediate",
    user_profile: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Generate a complete lesson on a specific topic.
    
    Args:
        topic: The topic for the lesson
        difficulty_level: The difficulty level (beginner, intermediate, advanced)
        user_profile: Optional user learning profile
        
    Returns:
        A dictionary containing the lesson content and metadata
    """
    # Construct the prompt for lesson generation
    prompt = f"""
    Task: Generate a comprehensive daily lesson.
    
    Specific Topic Focus: "{topic}"
    
    Difficulty Level: {difficulty_level}
    
    Lesson Structure Requirements:
    1. **Introduction:** Briefly introduce the topic and its importance. (Approx. 50 words)
    2. **Main Content:** Explain the key concepts, principles, and applications. Include examples and illustrations where appropriate.
    3. **Technical Details:** Provide detailed technical information relevant to the exam.
    4. **Common Misconceptions:** Address any common misconceptions or areas where students typically struggle.
    5. **Summary:** Summarize the key points of the lesson. (Approx. 50 words)
    6. **Multiple Choice Questions (5 MCQs):** 
       * Provide 5 multiple-choice questions that test understanding of the topic.
       * Ensure questions are at the appropriate difficulty level.
       * Provide 4 distinct options for each question.
       * The correct answer should be clearly indicated.
       * Include a brief explanation for each answer.
    
    Output Format: Provide the lesson content in Markdown. For MCQs, provide them as a JSON array within a markdown code block, as shown below:
    
    ```json
    [
      {
        "id": "q1",
        "difficulty": "intermediate",
        "question": "What is...",
        "options": [
          {"id": "a", "text": "Option A"},
          {"id": "b", "text": "Option B"},
          {"id": "c", "text": "Option C"},
          {"id": "d", "text": "Option D"}
        ],
        "correctAnswer": "a",
        "explanation": "Explanation for why A is correct...",
        "misconceptions": {
          "b": "Why someone might choose B incorrectly...",
          "c": "Why someone might choose C incorrectly...",
          "d": "Why someone might choose D incorrectly..."
        },
        "conceptTested": "Specific concept this question tests"
      }
    ]
    ```
    """
    
    # Generate the lesson content
    lesson_content = generate_content(prompt, user_profile, temperature=0.7, max_tokens=3000)
    
    # Extract MCQs from the content (assuming they're in a JSON code block)
    mcqs_json = ""
    try:
        # Look for JSON code block
        if "```json" in lesson_content and "```" in lesson_content.split("```json")[1]:
            json_block = lesson_content.split("```json")[1].split("```")[0].strip()
            # Validate JSON
            json.loads(json_block)
            mcqs_json = json_block
        else:
            # If no JSON block found, extract anything that looks like JSON array
            import re
            json_match = re.search(r'\[\s*\{\s*"id":', lesson_content)
            if json_match:
                potential_json = lesson_content[json_match.start():]
                end_bracket = potential_json.rfind(']')
                if end_bracket > 0:
                    mcqs_json = potential_json[:end_bracket+1]
    except Exception as e:
        print(f"Error extracting MCQs JSON: {e}")
        mcqs_json = "[]"  # Empty array as fallback
    
    # Remove the MCQs JSON from the content to get clean lesson text
    lesson_text = lesson_content
    if "```json" in lesson_content:
        lesson_text = lesson_content.split("```json")[0].strip()
    
    # Create a summary if not already present
    summary = ""
    if "Summary" in lesson_text:
        try:
            summary_section = lesson_text.split("Summary")[1].strip()
            summary_end = summary_section.find("#")
            if summary_end > 0:
                summary = summary_section[:summary_end].strip()
            else:
                summary = summary_section
        except:
            summary = ""
    
    # Construct the lesson object
    lesson = {
        "topic_id": topic.lower().replace(" ", "_"),
        "title": topic,
        "content_text": lesson_text,
        "mcqs_json": mcqs_json,
        "summary_text": summary,
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "type": "generated_lesson",
        "difficulty_level": difficulty_level,
        "estimated_time_minutes": 15,  # Default estimate
        "profile_used": user_profile is not None
    }
    
    return lesson

def generate_revision_content(
    topic: str,
    revision_type: str,
    user_profile: Optional[Dict[str, Any]] = None,
    difficulty_level: str = "intermediate"
) -> Dict[str, Any]:
    """
    Generate revision content based on the specified type.
    
    Args:
        topic: The topic for revision
        revision_type: The type of revision content (clarity, infographic, practice_questions, etc.)
        user_profile: Optional user learning profile
        difficulty_level: The difficulty level
        
    Returns:
        A dictionary containing the revision content and metadata
    """
    # Define prompts for different revision types
    prompts = {
        "clarity": f"""
        Task: Re-explain the following topic in a clearer, more accessible manner. Focus on simplifying complex concepts, 
        using analogies where helpful, and addressing common points of confusion. This explanation should be tailored 
        based on the user's learning profile, especially focusing on any identified weaknesses or learning preferences.
        
        Topic: "{topic}"
        
        Output Format: Markdown with clear headings, bullet points, and examples.
        """,
        
        "infographic": f"""
        Task: Re-explain the following topic in a highly structured, concise manner, specifically designed for conversion 
        into an infographic. Focus on key components, relationships, and a clear flow. Do NOT generate any visual elements 
        or images directly; only textual descriptions of what should be depicted. This explanation should be tailored 
        based on the user's preferred content style.
        
        Topic: "{topic}"
        
        Key Components to Highlight for Infographic:
        ● Main concepts and their definitions
        ● Relationships between concepts
        ● Process flows or sequences (if applicable)
        ● Key examples or applications
        ● Common pitfalls or misconceptions
        
        Output Format: Markdown using clear headings, bullet points, and simple flow descriptions.
        """,
        
        "practice_questions": f"""
        Task: Generate a set of practice questions for the specified topic. Include a mix of multiple-choice questions 
        and short-answer questions that test understanding at various levels of difficulty. These questions should be 
        tailored based on the user's learning profile, focusing on areas where they might need more practice.
        
        Topic: "{topic}"
        Difficulty Level: {difficulty_level}
        
        Output Format: Provide 5 multiple-choice questions and 3 short-answer questions in the following JSON format:
        
        ```json
        {
          "mcqs": [
            {
              "id": "q1",
              "difficulty": "intermediate",
              "question": "What is...",
              "options": [
                {"id": "a", "text": "Option A"},
                {"id": "b", "text": "Option B"},
                {"id": "c", "text": "Option C"},
                {"id": "d", "text": "Option D"}
              ],
              "correctAnswer": "a",
              "explanation": "Explanation for why A is correct..."
            }
          ],
          "shortAnswers": [
            {
              "id": "s1",
              "difficulty": "intermediate",
              "question": "Explain the concept of...",
              "modelAnswer": "A concise model answer...",
              "keyPoints": ["Point 1", "Point 2", "Point 3"]
            }
          ]
        }
        ```
        """,
        
        "audio_summary": f"""
        Task: Create a concise audio-friendly summary of the following topic. This should be designed for text-to-speech 
        conversion, so avoid complex notation or visual references. Focus on clear, conversational language that flows 
        well when spoken aloud. The summary should be tailored based on the user's learning profile.
        
        Topic: "{topic}"
        
        Output Format: Plain text optimized for audio delivery. Keep sentences relatively short and use clear transitions.
        Aim for approximately 2-3 minutes of spoken content (about 300-450 words).
        """,
        
        "crash_sheet": f"""
        Task: Create a comprehensive but concise crash sheet for the specified topic. This should serve as a quick 
        reference guide that captures all essential information in a highly condensed format. Include formulas, 
        definitions, key concepts, and critical points to remember. This crash sheet should be tailored based on 
        the user's learning profile, especially focusing on areas they find challenging.
        
        Topic: "{topic}"
        
        Output Format: Markdown with clear sections, bullet points, tables where appropriate, and highlighted key points.
        """
    }
    
    # Use default prompt if revision type not found
    if revision_type not in prompts:
        prompt = f"""
        Task: Generate revision content for the topic "{topic}" in the style of {revision_type}.
        Difficulty Level: {difficulty_level}
        
        Output Format: Markdown with clear structure and organization.
        """
    else:
        prompt = prompts[revision_type]
    
    # Generate the revision content
    content = generate_content(prompt, user_profile, temperature=0.7, max_tokens=2000)
    
    # Construct the revision content object
    revision = {
        "topic_id": topic.lower().replace(" ", "_"),
        "revision_type": revision_type,
        "content_text": content,
        "difficulty_level": difficulty_level,
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    }
    
    return revision

def generate_formula_entry(
    topic: str,
    concept: str,
    user_profile: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Generate a formula sheet entry for a specific concept.
    
    Args:
        topic: The broader topic
        concept: The specific concept for the formula
        user_profile: Optional user learning profile
        
    Returns:
        A dictionary containing the formula entry
    """
    prompt = f"""
    Task: Create a key formula sheet entry for the given concept within the specified topic. Include the formula, 
    a brief explanation of terms, and its primary use case. Ensure the explanation explicitly links to concepts 
    the user has previously struggled with (if identified in their learning profile).
    
    Topic: "{topic}"
    Concept: "{concept}"
    
    Output Format: Markdown with the following sections:
    1. Formula (using LaTeX notation where appropriate)
    2. Explanation of terms
    3. Use cases or applications
    4. Common mistakes or pitfalls
    """
    
    # Generate the formula entry
    content = generate_content(prompt, user_profile, temperature=0.7, max_tokens=1000)
    
    # Construct the formula entry object
    formula_entry = {
        "topic_id": topic.lower().replace(" ", "_"),
        "formula_text": content,
        "explanation": "",  # This could be extracted from the content if needed
        "is_difficult": False,  # Default value
        "added_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    }
    
    return formula_entry

def generate_faq_entry(
    topic: str,
    question: str,
    user_profile: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Generate an FAQ entry for a specific question.
    
    Args:
        topic: The topic related to the question
        question: The question to answer
        user_profile: Optional user learning profile
        
    Returns:
        A dictionary containing the FAQ entry
    """
    prompt = f"""
    Task: Create a comprehensive answer to the following question related to the specified topic. The answer should be 
    clear, accurate, and tailored to the user's learning profile. Include examples or analogies where appropriate to 
    enhance understanding.
    
    Topic: "{topic}"
    Question: "{question}"
    
    Output Format: Markdown with clear explanations and examples.
    """
    
    # Generate the FAQ answer
    answer = generate_content(prompt, user_profile, temperature=0.7, max_tokens=1000)
    
    # Construct the FAQ entry object
    faq_entry = {
        "topic_id": topic.lower().replace(" ", "_"),
        "question": question,
        "answer": answer,
        "source_query": "user_generated",  # Default value
        "added_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    }
    
    return faq_entry

def analyze_quiz_results(
    quiz_data: Dict[str, Any],
    user_profile: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Analyze quiz results and provide personalized feedback.
    
    Args:
        quiz_data: The quiz data including questions and answers
        user_profile: The user's learning profile
        
    Returns:
        A dictionary containing analysis and feedback
    """
    # Extract relevant information from quiz data
    topic_id = quiz_data.get("topic_id", "unknown")
    score = quiz_data.get("score", 0)
    correct_count = quiz_data.get("correct_answers_count", 0)
    incorrect_count = quiz_data.get("incorrect_answers_count", 0)
    total_questions = correct_count + incorrect_count
    
    # Construct the prompt for analysis
    prompt = f"""
    Task: Analyze the following quiz results and provide personalized feedback. Focus on identifying strengths, 
    weaknesses, and specific areas for improvement. Suggest next steps for the user's learning journey based on 
    these results and their overall learning profile.
    
    Quiz Information:
    - Topic: {topic_id}
    - Score: {score}
    - Correct Answers: {correct_count} out of {total_questions}
    - Incorrect Answers: {incorrect_count} out of {total_questions}
    
    Output Format: Provide your analysis in the following JSON structure:
    
    ```json
    {{
      "overall_assessment": "Brief overall assessment of performance",
      "strengths_identified": ["Strength 1", "Strength 2"],
      "weaknesses_identified": ["Weakness 1", "Weakness 2"],
      "misconceptions": ["Potential misconception 1", "Potential misconception 2"],
      "recommended_next_steps": ["Recommendation 1", "Recommendation 2"],
      "difficulty_adjustment_suggestion": 1.0,
      "personalized_message": "Encouraging message tailored to the user's performance"
    }}
    ```
    
    The difficulty_adjustment_suggestion should be a number between 0.5 (easier) and 1.5 (harder) based on how 
    challenging future content should be for this user.
    """
    
    # Generate the analysis
    analysis_json = generate_content(prompt, user_profile, temperature=0.7, max_tokens=1000)
    
    # Extract the JSON from the response
    try:
        # Look for JSON code block
        if "```json" in analysis_json and "```" in analysis_json.split("```json")[1]:
            json_block = analysis_json.split("```json")[1].split("```")[0].strip()
            analysis = json.loads(json_block)
        else:
            # If no JSON block found, try to parse the entire response as JSON
            analysis = json.loads(analysis_json)
    except Exception as e:
        print(f"Error parsing analysis JSON: {e}")
        # Provide a default analysis if parsing fails
        analysis = {
            "overall_assessment": f"You scored {score} with {correct_count} correct answers out of {total_questions}.",
            "strengths_identified": [],
            "weaknesses_identified": [],
            "misconceptions": [],
            "recommended_next_steps": ["Review the topic material again"],
            "difficulty_adjustment_suggestion": 1.0,
            "personalized_message": "Keep practicing to improve your understanding."
        }
    
    return analysis

def generate_daily_lesson(
    user_profile: Dict[str, Any],
    syllabus_topics: List[str]
) -> Dict[str, Any]:
    """
    Generate a daily lesson based on the user's learning profile and syllabus.
    
    Args:
        user_profile: The user's learning profile
        syllabus_topics: List of topics in the syllabus
        
    Returns:
        A dictionary containing the daily lesson
    """
    # Extract relevant information from user profile
    strengths = user_profile.get("strengths", {})
    weaknesses = user_profile.get("weaknesses", {})
    progress_map = user_profile.get("progress_map", {})
    
    # Determine which topic to focus on
    # Priority: 1) Weak topics, 2) Untouched topics, 3) Topics due for revision
    
    # First, identify weak topics
    weak_topics = list(weaknesses.keys())
    
    # Then, identify untouched topics
    untouched_topics = [topic for topic in syllabus_topics if topic not in progress_map]
    
    # If we have weak topics, prioritize those
    if weak_topics:
        selected_topic = weak_topics[0]  # Take the first weak topic
        difficulty_level = "intermediate"  # Default difficulty
    # Otherwise, if we have untouched topics, start with those
    elif untouched_topics:
        selected_topic = untouched_topics[0]  # Take the first untouched topic
        difficulty_level = "beginner"  # Start with beginner difficulty for new topics
    # If all topics have been touched, select one for revision
    else:
        # Simple algorithm: just take the first topic in the syllabus
        # In a real implementation, this would be more sophisticated
        selected_topic = syllabus_topics[0]
        difficulty_level = "advanced"  # Increase difficulty for revision
    
    # Generate the lesson
    lesson = generate_lesson(selected_topic, difficulty_level, user_profile)
    
    # Mark this as a daily lesson
    lesson["type"] = "daily_lesson"
    
    return lesson

def generate_diagnostic_questions(
    topics: List[str],
    difficulty_distribution: Dict[str, int],
    question_count: int,
    user_profile: Optional[Dict[str, Any]] = None
) -> List[Dict[str, Any]]:
    """
    Generate diagnostic questions for the specified topics with the given difficulty distribution.
    
    Args:
        topics: List of topics to generate questions for
        difficulty_distribution: Distribution of questions by difficulty (e.g., {"easy": 30, "medium": 50, "hard": 20})
        question_count: Total number of questions to generate
        user_profile: Optional user learning profile
        
    Returns:
        A list of question objects
    """
    # Calculate how many questions to generate for each difficulty level
    questions_per_difficulty = {}
    remaining_questions = question_count
    
    for difficulty, percentage in difficulty_distribution.items():
        if difficulty not in DIAGNOSTIC_DIFFICULTY_LEVELS:
            continue
        
        count = int((percentage / 100) * question_count)
        questions_per_difficulty[difficulty] = count
        remaining_questions -= count
    
    # Distribute any remaining questions to medium difficulty
    if remaining_questions > 0:
        questions_per_difficulty["medium"] = questions_per_difficulty.get("medium", 0) + remaining_questions
    
    # Calculate how many questions to generate for each topic
    questions_per_topic = {}
    total_topics = len(topics)
    
    for difficulty, count in questions_per_difficulty.items():
        questions_per_topic_difficulty = max(1, count // total_topics)
        remainder = count % total_topics
        
        for i, topic in enumerate(topics):
            if topic not in questions_per_topic:
                questions_per_topic[topic] = {}
            
            # Add extra question to some topics if there's a remainder
            extra = 1 if i < remainder else 0
            questions_per_topic[topic][difficulty] = questions_per_topic_difficulty + extra
    
    # Generate questions for each topic and difficulty
    all_questions = []
    
    for topic in topics:
        for difficulty, count in questions_per_topic.get(topic, {}).items():
            if count <= 0:
                continue
            
            # Construct the prompt for question generation
            prompt = f"""
            Task: Generate {count} multiple-choice diagnostic questions about {topic} at {difficulty} difficulty level for the DCIO/Tech exam.
            
            Requirements:
            1. Each question should test understanding of key concepts related to {topic}.
            2. Questions should be at {difficulty} difficulty level.
            3. Each question should have 4 options with exactly one correct answer.
            4. Include a brief explanation for the correct answer.
            5. Format the output as a JSON array of question objects.
            
            Output Format:
            ```json
            [
              {{
                "id": "unique_id_1",
                "topicId": "{topic}",
                "text": "Question text goes here?",
                "options": [
                  "Option A (correct answer)",
                  "Option B",
                  "Option C",
                  "Option D"
                ],
                "correctOptionIndex": 0,
                "explanation": "Explanation for why Option A is correct",
                "difficulty": "{difficulty}",
                "tags": ["{topic}"]
              }},
              // More questions...
            ]
            ```
            
            Note: Ensure the correctOptionIndex matches the index of the correct answer in the options array (0-based indexing).
            """
            
            # Generate the questions
            response = generate_content(prompt, user_profile, temperature=0.7, max_tokens=2000)
            
            # Extract the JSON from the response
            try:
                # Look for JSON code block
                if "```json" in response and "```" in response.split("```json")[1]:
                    json_block = response.split("```json")[1].split("```")[0].strip()
                    questions = json.loads(json_block)
                elif "```" in response and "```" in response.split("```")[1]:
                    json_block = response.split("```")[1].split("```")[0].strip()
                    questions = json.loads(json_block)
                else:
                    # If no JSON block found, try to parse the entire response as JSON
                    questions = json.loads(response)
                
                # Validate and clean up the questions
                for question in questions:
                    # Ensure required fields are present
                    if not all(key in question for key in ["text", "options", "correctOptionIndex", "explanation"]):
                        continue
                    
                    # Add missing fields
                    if "id" not in question:
                        question["id"] = f"{topic}_{difficulty}_{len(all_questions)}"
                    if "topicId" not in question:
                        question["topicId"] = topic
                    if "difficulty" not in question:
                        question["difficulty"] = difficulty
                    if "tags" not in question:
                        question["tags"] = [topic]
                    
                    all_questions.append(question)
            except Exception as e:
                print(f"Error parsing questions JSON for {topic} at {difficulty} difficulty: {e}")
                # If parsing fails, generate a simple fallback question
                fallback_question = {
                    "id": f"{topic}_{difficulty}_{len(all_questions)}",
                    "topicId": topic,
                    "text": f"Sample {difficulty} question about {topic.replace('_', ' ')}",
                    "options": [
                        f"Correct answer for {topic}",
                        f"Wrong answer 1 for {topic}",
                        f"Wrong answer 2 for {topic}",
                        f"Wrong answer 3 for {topic}"
                    ],
                    "correctOptionIndex": 0,
                    "explanation": f"This is the explanation for the correct answer about {topic.replace('_', ' ')}",
                    "difficulty": difficulty,
                    "tags": [topic]
                }
                all_questions.append(fallback_question)
    
    # Ensure we have exactly the requested number of questions
    if len(all_questions) > question_count:
        all_questions = all_questions[:question_count]
    elif len(all_questions) < question_count:
        # If we don't have enough questions, duplicate some existing ones
        while len(all_questions) < question_count:
            # Choose a random question to duplicate
            import random
            question = random.choice(all_questions)
            
            # Create a copy with a new ID
            duplicate = question.copy()
            duplicate["id"] = f"{duplicate['topicId']}_{duplicate['difficulty']}_{len(all_questions)}"
            
            all_questions.append(duplicate)
    
    return all_questions

def analyze_diagnostic_results(
    questions: List[Dict[str, Any]],
    answers: List[Dict[str, Any]],
    learning_style: str,
    self_rating: Optional[str] = None,
    weak_topics: List[str] = [],
    strong_topics: List[str] = []
) -> Dict[str, Any]:
    """
    Analyze diagnostic assessment results and provide personalized feedback.
    
    Args:
        questions: The questions from the diagnostic assessment
        answers: The user's answers to the questions
        learning_style: The user's preferred learning style
        self_rating: The user's self-assessment of their learning ability
        weak_topics: Topics the user identified as weak
        strong_topics: Topics the user identified as strong
        
    Returns:
        A dictionary containing analysis and feedback
    """
    # Group questions by topic
    topic_results = {}
    
    for question in questions:
        topic = question.get("topicId", "unknown")
        
        if topic not in topic_results:
            topic_results[topic] = {"correct": 0, "total": 0, "questions": []}
        
        topic_results[topic]["total"] += 1
        topic_results[topic]["questions"].append(question)
        
        # Check if the answer was correct
        answer = next((a for a in answers if a.get("questionId") == question.get("id")), None)
        if answer and answer.get("isCorrect", False):
            topic_results[topic]["correct"] += 1
    
    # Calculate scores for each topic
    topic_scores = {}
    for topic, result in topic_results.items():
        if result["total"] > 0:
            topic_scores[topic] = round((result["correct"] / result["total"]) * 100)
    
    # Identify strengths and weaknesses based on scores
    strengths = []
    weaknesses = []
    
    for topic, score in topic_scores.items():
        if score >= 70:
            strengths.append(topic)
        elif score <= 40:
            weaknesses.append(topic)
    
    # Calculate overall score
    total_correct = sum(result["correct"] for result in topic_results.values())
    total_questions = sum(result["total"] for result in topic_results.values())
    overall_score = round((total_correct / total_questions) * 100) if total_questions > 0 else 0
    
    # Combine with user-provided strengths/weaknesses
    all_strengths = list(set(strengths + strong_topics))
    all_weaknesses = list(set(weaknesses + weak_topics))
    
    # Construct the prompt for AI analysis
    prompt = f"""
    Task: Analyze the following diagnostic assessment results for a DCIO/Tech exam preparation platform user and provide personalized feedback.
    
    Assessment Results:
    - Overall Score: {overall_score}%
    - Topic Scores: {json.dumps(topic_scores)}
    - Identified Strengths: {json.dumps(all_strengths)}
    - Identified Weaknesses: {json.dumps(all_weaknesses)}
    - User's Learning Style: {learning_style}
    - User's Self-Rating: {self_rating if self_rating else "Not provided"}
    
    Provide your analysis in the following JSON format:
    
    ```json
    {{
      "overall_assessment": "Brief overall assessment of the user's current knowledge level",
      "strengths_analysis": "Analysis of the user's strengths and how to leverage them",
      "weaknesses_analysis": "Analysis of the user's weaknesses and how to address them",
      "learning_style_recommendations": "Recommendations based on the user's learning style",
      "study_plan_suggestion": "Brief suggestion for an initial study plan",
      "estimated_preparation_time": "Estimated time needed for adequate preparation (in weeks)",
      "confidence_score": "A score from 1-10 indicating how confident the user should be about their preparation"
    }}
    ```
    """
    
    # Generate the analysis
    analysis_json = generate_content(prompt, temperature=0.7, max_tokens=1500)
    
    # Extract the JSON from the response
    try:
        # Look for JSON code block
        if "```json" in analysis_json and "```" in analysis_json.split("```json")[1]:
            json_block = analysis_json.split("```json")[1].split("```")[0].strip()
            analysis = json.loads(json_block)
        elif "```" in analysis_json and "```" in analysis_json.split("```")[1]:
            json_block = analysis_json.split("```")[1].split("```")[0].strip()
            analysis = json.loads(json_block)
        else:
            # If no JSON block found, try to parse the entire response as JSON
            analysis = json.loads(analysis_json)
    except Exception as e:
        print(f"Error parsing analysis JSON: {e}")
        # Provide a default analysis if parsing fails
        analysis = {
            "overall_assessment": f"You scored {overall_score}% overall in the diagnostic assessment.",
            "strengths_analysis": f"Your strengths include: {', '.join(all_strengths) if all_strengths else 'None identified yet'}.",
            "weaknesses_analysis": f"Areas to focus on: {', '.join(all_weaknesses) if all_weaknesses else 'None identified yet'}.",
            "learning_style_recommendations": f"Based on your {learning_style} learning style, focus on appropriate learning materials.",
            "study_plan_suggestion": "Start with the fundamentals of each topic before moving to advanced concepts.",
            "estimated_preparation_time": "8-12 weeks",
            "confidence_score": 5
        }
    
    # Return the complete analysis
    return {
        "topic_scores": topic_scores,
        "strengths": all_strengths,
        "weaknesses": all_weaknesses,
        "overall_score": overall_score,
        "analysis": analysis
    }
