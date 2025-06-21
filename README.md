# AI-Powered DCIO/Tech Exam Preparation Platform

An intelligent, adaptive learning platform designed to help users prepare for DCIO/Tech (UPSC) and similar technical officer-level examinations in India.

## Project Overview

This platform leverages OpenAI's GPT-4 to create a personalized learning experience that adapts to the user's strengths, weaknesses, and learning preferences. The AI Agent, named "ExamMaster AI," functions as an intelligent tutor that continuously monitors the user's progress and tailors content accordingly.

## Key Features

- **Daily Adaptive Lessons**: Automatically generated lessons based on the user's learning profile
- **Personalized Quizzes**: MCQs tailored to test understanding and identify knowledge gaps
- **On-Demand Revision**: Multiple ways to revise content (clarity explanations, infographics, practice questions)
- **Smart Master Revision Hub**: Organized topics by performance for targeted revision
- **Adaptive Formula Sheets & FAQ Booklet**: Personalized reference materials
- **Quick Revision Sprints**: Time-bound revision sessions focused on weak areas
- **AI Learning Profile**: Continuously updated profile tracking strengths, weaknesses, and preferences

## Technology Stack

### Frontend
- React with TypeScript
- Tailwind CSS for styling
- React Context API for state management
- Vite for build tooling

### Backend
- FastAPI (Python)
- OpenAI API integration
- Firebase/Firestore for database

## Project Structure

```
project/
├── docs/                      # Project documentation
│   ├── modules-design.md      # Core modules and their interactions
│   ├── implementation-plan.md # Phased development approach
│   ├── technical-architecture.md # System architecture details
│   └── prompt-engineering-strategies.md # AI prompting guidelines
├── backend/                   # FastAPI backend
│   ├── main.py                # API endpoints
│   ├── openai_service.py      # OpenAI integration
│   ├── firestore_service.py   # Firestore database operations
│   └── requirements.txt       # Python dependencies
└── frontend/                  # React frontend
    ├── src/
    │   ├── components/        # React components
    │   ├── services/          # API services
    │   ├── contexts/          # React contexts
    │   └── assets/            # Static assets
    └── public/                # Public assets
```

## Current State

The project has established its foundational architecture with:

1. **Backend API**: FastAPI endpoints for lessons, quizzes, revision, formula sheets, and FAQs
2. **OpenAI Integration**: Service for generating various types of content
3. **Firestore Database**: Schema and operations for storing user data and content
4. **Frontend Components**: Basic UI for dashboard, lessons, and user profile
5. **Documentation**: Comprehensive documentation of architecture, modules, and implementation plan

## Getting Started

### Prerequisites

- Node.js (v16+)
- Python (v3.9+)
- Firebase account
- OpenAI API key

### Backend Setup

1. Navigate to the backend directory:
   ```
   cd backend
   ```

2. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

3. Set environment variables:
   ```
   export OPENAI_API_KEY=your_openai_api_key
   export FIREBASE_CREDENTIALS_PATH=path_to_firebase_credentials.json
   ```

4. Run the FastAPI server:
   ```
   uvicorn main:app --reload
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```
   cd frontend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file with your Firebase configuration:
   ```
   REACT_APP_API_BASE_URL=http://localhost:8000
   ```

4. Start the development server:
   ```
   npm run dev
   ```

## Next Development Steps

Based on the current state of the project, the following are the next logical steps for development:

1. **Enhance the Learning Profile System**:
   - Implement a diagnostic assessment for new users
   - Create a more sophisticated analytics engine for profile updates
   - Add visualization of learning progress

2. **Improve the Lesson Engine**:
   - Implement markdown rendering for lesson content
   - Add syntax highlighting for code snippets
   - Create a more interactive quiz experience

3. **Develop the Revision Hub**:
   - Build the topic organization UI by performance
   - Implement filtering and sorting capabilities
   - Create the sprint configuration interface

4. **Enhance UI/UX**:
   - Apply the design system from the UX documentation
   - Implement responsive layouts for all components
   - Add animations and transitions for a more engaging experience

5. **Implement Advanced AI Features**:
   - Refine prompt engineering for better content generation
   - Add image generation for infographics
   - Implement text-to-speech for audio summaries

## Contributing

This project is currently in active development. If you'd like to contribute, please follow these steps:

1. Review the documentation in the `docs/` directory
2. Check the implementation plan for current priorities
3. Create a new branch for your feature
4. Submit a pull request with a clear description of your changes

## License

[MIT License](LICENSE)
