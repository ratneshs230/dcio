import os
import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Firebase with environment variables or use a mock for development
try:
    # Check if we have a service account key file path in environment variables
    service_account_path = os.getenv('FIREBASE_SERVICE_ACCOUNT_PATH')
    
    if service_account_path and os.path.exists(service_account_path):
        cred = credentials.Certificate(service_account_path)
        app = firebase_admin.initialize_app(cred)
    else:
        # For development, initialize with a mock or default configuration
        print("Warning: Using Firebase in development mode. Set FIREBASE_SERVICE_ACCOUNT_PATH for production.")
        app = firebase_admin.initialize_app()
    
    db = firestore.client()
except Exception as e:
    print(f"Firebase initialization error: {e}")
    # Create a mock database for development
    from unittest.mock import MagicMock
    db = MagicMock()

def get_db():
    return db
