import os
import firebase_admin
from firebase_admin import credentials, firestore
from typing import Dict, Any, Optional, List
import time
import json

# Initialize Firebase Admin SDK
# In a production environment, use environment variables or secure storage for credentials
try:
    # Check if already initialized
    firebase_admin.get_app()
except ValueError:
    # If not initialized, initialize with credentials
    try:
        # Try to use environment variable for credentials
        cred_path = os.getenv("FIREBASE_CREDENTIALS_PATH")
        if cred_path and os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
        else:
            # Fallback to default credentials (for development)
            cred = credentials.ApplicationDefault()
        
        firebase_admin.initialize_app(cred)
    except Exception as e:
        print(f"Error initializing Firebase: {e}")
        # For development purposes, we'll continue without Firebase
        # In production, this should raise an exception

# Get Firestore client
try:
    db = firestore.client()
except Exception as e:
    print(f"Error getting Firestore client: {e}")
    db = None

def create_document(collection_path: str, document_id: str, data: Dict[str, Any]) -> bool:
    """
    Create a new document in Firestore.
    
    Args:
        collection_path: The path to the collection
        document_id: The ID of the document to create
        data: The data to store in the document
        
    Returns:
        True if successful, False otherwise
    """
    if not db:
        print("Firestore client not initialized")
        return False
    
    try:
        doc_ref = db.collection(collection_path).document(document_id)
        doc_ref.set(data)
        return True
    except Exception as e:
        print(f"Error creating document: {e}")
        return False

def read_document(collection_path: str, document_id: str) -> Optional[Dict[str, Any]]:
    """
    Read a document from Firestore.
    
    Args:
        collection_path: The path to the collection
        document_id: The ID of the document to read
        
    Returns:
        The document data as a dictionary, or None if not found
    """
    if not db:
        print("Firestore client not initialized")
        return None
    
    try:
        doc_ref = db.collection(collection_path).document(document_id)
        doc = doc_ref.get()
        
        if doc.exists:
            return doc.to_dict()
        else:
            return None
    except Exception as e:
        print(f"Error reading document: {e}")
        return None

def update_document(collection_path: str, document_id: str, data: Dict[str, Any]) -> bool:
    """
    Update a document in Firestore.
    
    Args:
        collection_path: The path to the collection
        document_id: The ID of the document to update
        data: The data to update in the document
        
    Returns:
        True if successful, False otherwise
    """
    if not db:
        print("Firestore client not initialized")
        return False
    
    try:
        doc_ref = db.collection(collection_path).document(document_id)
        doc_ref.update(data)
        return True
    except Exception as e:
        print(f"Error updating document: {e}")
        return False

def delete_document(collection_path: str, document_id: str) -> bool:
    """
    Delete a document from Firestore.
    
    Args:
        collection_path: The path to the collection
        document_id: The ID of the document to delete
        
    Returns:
        True if successful, False otherwise
    """
    if not db:
        print("Firestore client not initialized")
        return False
    
    try:
        doc_ref = db.collection(collection_path).document(document_id)
        doc_ref.delete()
        return True
    except Exception as e:
        print(f"Error deleting document: {e}")
        return False

def query_collection(collection_path: str, field: str, operator: str, value: Any) -> List[Dict[str, Any]]:
    """
    Query documents in a collection.
    
    Args:
        collection_path: The path to the collection
        field: The field to query on
        operator: The operator to use (==, >, <, >=, <=, array_contains)
        value: The value to compare against
        
    Returns:
        A list of documents matching the query
    """
    if not db:
        print("Firestore client not initialized")
        return []
    
    try:
        docs = db.collection(collection_path).where(field, operator, value).stream()
        return [doc.to_dict() for doc in docs]
    except Exception as e:
        print(f"Error querying collection: {e}")
        return []

def initialize_firestore(app_id: str, user_id: str) -> bool:
    """
    Initialize Firestore collections and documents for a new user.
    
    Args:
        app_id: The application ID
        user_id: The user ID
        
    Returns:
        True if successful, False otherwise
    """
    if not db:
        print("Firestore client not initialized")
        return False
    
    try:
        # Create learning profile
        profile_path = f"artifacts/{app_id}/users/{user_id}/learning_profile"
        profile_data = {
            "strengths": {},
            "weaknesses": {},
            "learning_pace": 1.0,
            "preferred_formats": {
                "clarity": 0,
                "infographic": 0,
                "audio": 0,
                "practice_questions": 0
            },
            "difficulty_adjustment": 1.0,
            "progress_map": {},
            "daily_streak": 0,
            "total_study_time": 0,
            "last_active_date": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        }
        
        create_document(profile_path, "profile", profile_data)
        
        # Create initial collections
        collections = [
            f"artifacts/{app_id}/users/{user_id}/lessons",
            f"artifacts/{app_id}/users/{user_id}/quizzes",
            f"artifacts/{app_id}/users/{user_id}/revision_logs",
            f"artifacts/{app_id}/users/{user_id}/formula_sheets",
            f"artifacts/{app_id}/users/{user_id}/faq_booklet"
        ]
        
        # Add a placeholder document to each collection
        for collection in collections:
            placeholder_data = {
                "placeholder": True,
                "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            }
            create_document(collection, "placeholder", placeholder_data)
        
        return True
    except Exception as e:
        print(f"Error initializing Firestore: {e}")
        return False

def get_user_learning_profile(app_id: str, user_id: str) -> Dict[str, Any]:
    """
    Get the user's learning profile, initializing it if it doesn't exist.
    
    Args:
        app_id: The application ID
        user_id: The user ID
        
    Returns:
        The user's learning profile
    """
    profile_path = f"artifacts/{app_id}/users/{user_id}/learning_profile"
    profile = read_document(profile_path, "profile")
    
    if not profile:
        # Initialize profile if it doesn't exist
        initialize_firestore(app_id, user_id)
        profile = read_document(profile_path, "profile")
    
    return profile or {}

def store_generated_lesson(app_id: str, user_id: str, lesson_data: Dict[str, Any]) -> str:
    """
    Store a generated lesson in Firestore.
    
    Args:
        app_id: The application ID
        user_id: The user ID
        lesson_data: The lesson data to store
        
    Returns:
        The ID of the created lesson document
    """
    lesson_path = f"artifacts/{app_id}/users/{user_id}/lessons"
    lesson_id = f"lesson_{int(time.time())}_{lesson_data.get('topic_id', 'unknown')}"
    
    # Add timestamp if not present
    if "generated_at" not in lesson_data:
        lesson_data["generated_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    
    success = create_document(lesson_path, lesson_id, lesson_data)
    
    if success:
        return lesson_id
    else:
        return ""

def store_quiz_result(app_id: str, user_id: str, quiz_data: Dict[str, Any]) -> str:
    """
    Store a quiz result in Firestore.
    
    Args:
        app_id: The application ID
        user_id: The user ID
        quiz_data: The quiz data to store
        
    Returns:
        The ID of the created quiz document
    """
    quiz_path = f"artifacts/{app_id}/users/{user_id}/quizzes"
    quiz_id = f"quiz_{int(time.time())}_{quiz_data.get('topic_id', 'unknown')}"
    
    # Add timestamp if not present
    if "submitted_at" not in quiz_data:
        quiz_data["submitted_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    
    success = create_document(quiz_path, quiz_id, quiz_data)
    
    if success:
        return quiz_id
    else:
        return ""

def get_today_lesson(app_id: str, user_id: str) -> Optional[Dict[str, Any]]:
    """
    Get today's pre-generated lesson.
    
    Args:
        app_id: The application ID
        user_id: The user ID
        
    Returns:
        The lesson data, or None if not found
    """
    if not db:
        print("Firestore client not initialized")
        return None
    
    try:
        # Get today's date in YYYY-MM-DD format
        today = time.strftime("%Y-%m-%d")
        
        # Query for lessons generated today
        lesson_path = f"artifacts/{app_id}/users/{user_id}/lessons"
        query = db.collection(lesson_path).where("type", "==", "daily_lesson")
        
        # Filter for lessons generated today
        lessons = []
        for doc in query.stream():
            lesson = doc.to_dict()
            generated_at = lesson.get("generated_at", "")
            if generated_at.startswith(today):
                lessons.append(lesson)
        
        # Return the most recent lesson if available
        if lessons:
            return sorted(lessons, key=lambda x: x.get("generated_at", ""), reverse=True)[0]
        else:
            return None
    except Exception as e:
        print(f"Error getting today's lesson: {e}")
        return None

def get_user_weak_areas(app_id: str, user_id: str, limit: int = 5) -> List[str]:
    """
    Get the user's weak areas based on their learning profile.
    
    Args:
        app_id: The application ID
        user_id: The user ID
        limit: Maximum number of weak areas to return
        
    Returns:
        A list of topic IDs representing the user's weak areas
    """
    profile = get_user_learning_profile(app_id, user_id)
    
    # Get weaknesses from profile
    weaknesses = profile.get("weaknesses", {})
    
    # Sort weaknesses by score (descending)
    sorted_weaknesses = sorted(weaknesses.items(), key=lambda x: x[1], reverse=True)
    
    # Return the top N weak areas
    return [topic_id for topic_id, _ in sorted_weaknesses[:limit]]

def get_user_strengths(app_id: str, user_id: str, limit: int = 5) -> List[str]:
    """
    Get the user's strengths based on their learning profile.
    
    Args:
        app_id: The application ID
        user_id: The user ID
        limit: Maximum number of strengths to return
        
    Returns:
        A list of topic IDs representing the user's strengths
    """
    profile = get_user_learning_profile(app_id, user_id)
    
    # Get strengths from profile
    strengths = profile.get("strengths", {})
    
    # Sort strengths by score (descending)
    sorted_strengths = sorted(strengths.items(), key=lambda x: x[1], reverse=True)
    
    # Return the top N strengths
    return [topic_id for topic_id, _ in sorted_strengths[:limit]]

def get_user_preferred_formats(app_id: str, user_id: str) -> Dict[str, int]:
    """
    Get the user's preferred content formats based on their learning profile.
    
    Args:
        app_id: The application ID
        user_id: The user ID
        
    Returns:
        A dictionary mapping format names to preference scores
    """
    profile = get_user_learning_profile(app_id, user_id)
    
    # Get preferred formats from profile
    preferred_formats = profile.get("preferred_formats", {})
    
    return preferred_formats

def update_user_learning_profile(app_id: str, user_id: str, updates: Dict[str, Any]) -> bool:
    """
    Update specific fields in the user's learning profile.
    
    Args:
        app_id: The application ID
        user_id: The user ID
        updates: Dictionary of fields to update
        
    Returns:
        True if successful, False otherwise
    """
    profile_path = f"artifacts/{app_id}/users/{user_id}/learning_profile"
    
    # Get current profile
    profile = get_user_learning_profile(app_id, user_id)
    
    # Update fields
    for key, value in updates.items():
        if isinstance(value, dict) and key in profile and isinstance(profile[key], dict):
            # Merge dictionaries for nested fields
            profile[key].update(value)
        else:
            # Replace value for non-dictionary fields
            profile[key] = value
    
    # Update last_active_date
    profile["last_active_date"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    
    # Update profile in Firestore
    return update_document(profile_path, "profile", profile)

def store_formula_entry(app_id: str, user_id: str, formula_data: Dict[str, Any]) -> str:
    """
    Store a formula entry in Firestore.
    
    Args:
        app_id: The application ID
        user_id: The user ID
        formula_data: The formula data to store
        
    Returns:
        The ID of the created formula document
    """
    formula_path = f"artifacts/{app_id}/users/{user_id}/formula_sheets"
    formula_id = f"formula_{int(time.time())}_{formula_data.get('topic_id', 'unknown')}"
    
    # Add timestamp if not present
    if "added_at" not in formula_data:
        formula_data["added_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    
    success = create_document(formula_path, formula_id, formula_data)
    
    if success:
        return formula_id
    else:
        return ""

def store_faq_entry(app_id: str, user_id: str, faq_data: Dict[str, Any]) -> str:
    """
    Store an FAQ entry in Firestore.
    
    Args:
        app_id: The application ID
        user_id: The user ID
        faq_data: The FAQ data to store
        
    Returns:
        The ID of the created FAQ document
    """
    faq_path = f"artifacts/{app_id}/users/{user_id}/faq_booklet"
    faq_id = f"faq_{int(time.time())}_{faq_data.get('topic_id', 'unknown')}"
    
    # Add timestamp if not present
    if "added_at" not in faq_data:
        faq_data["added_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    
    success = create_document(faq_path, faq_id, faq_data)
    
    if success:
        return faq_id
    else:
        return ""

def get_formula_entries(app_id: str, user_id: str, topic_id: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Get formula entries from Firestore.
    
    Args:
        app_id: The application ID
        user_id: The user ID
        topic_id: Optional topic ID to filter by
        
    Returns:
        A list of formula entries
    """
    if not db:
        print("Firestore client not initialized")
        return []
    
    try:
        formula_path = f"artifacts/{app_id}/users/{user_id}/formula_sheets"
        
        if topic_id:
            # Query for formulas with the specified topic ID
            docs = db.collection(formula_path).where("topic_id", "==", topic_id).stream()
        else:
            # Get all formulas
            docs = db.collection(formula_path).stream()
        
        # Filter out placeholder documents
        formulas = []
        for doc in docs:
            formula = doc.to_dict()
            if not formula.get("placeholder", False):
                formulas.append(formula)
        
        # Sort by added_at (descending)
        return sorted(formulas, key=lambda x: x.get("added_at", ""), reverse=True)
    
    except Exception as e:
        print(f"Error getting formula entries: {e}")
        return []

def get_faq_entries(app_id: str, user_id: str, topic_id: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Get FAQ entries from Firestore.
    
    Args:
        app_id: The application ID
        user_id: The user ID
        topic_id: Optional topic ID to filter by
        
    Returns:
        A list of FAQ entries
    """
    if not db:
        print("Firestore client not initialized")
        return []
    
    try:
        faq_path = f"artifacts/{app_id}/users/{user_id}/faq_booklet"
        
        if topic_id:
            # Query for FAQs with the specified topic ID
            docs = db.collection(faq_path).where("topic_id", "==", topic_id).stream()
        else:
            # Get all FAQs
            docs = db.collection(faq_path).stream()
        
        # Filter out placeholder documents
        faqs = []
        for doc in docs:
            faq = doc.to_dict()
            if not faq.get("placeholder", False):
                faqs.append(faq)
        
        # Sort by added_at (descending)
        return sorted(faqs, key=lambda x: x.get("added_at", ""), reverse=True)
    
    except Exception as e:
        print(f"Error getting FAQ entries: {e}")
        return []
