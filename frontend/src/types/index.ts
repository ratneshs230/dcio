// User-related types
export type LearningStyle = 'visual' | 'auditory' | 'reading' | 'kinesthetic' | 'mixed';
export type SelfRating = 'quick learner' | 'deep learner' | 'needs more revision';

export interface User {
  id: string;
  name: string;
  email: string;
  learningStyle: LearningStyle;
  selfRating?: SelfRating;
  weakTopics?: string[];
  strongTopics?: string[];
  onboardingCompleted: boolean;
  createdAt: string;
  examDate?: string;
  diagnosticResults?: {
    topicScores: Record<string, number>;
    strengths: string[];
    weaknesses: string[];
    overallScore: number;
  };
}

// Syllabus-related types
export interface SyllabusTopic {
  id: string;
  name: string;
  subjectArea: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedTime: number;
}

// Topic-related types
export interface Topic {
  id: string;
  title: string;
  description: string;
  category: 'electronics' | 'communications' | 'computer-science' | 'cyber-security';
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
  estimatedTime: number;
  prerequisites?: string[];
  completed?: boolean;
  lastReviewed?: string;
  subjectArea?: string; // Added to match SyllabusTopic
}

// Progress-related types
export interface Progress {
  totalTopics: number;
  completedTopics: number;
  weakTopics: string[];
  strongTopics: string[];
  dailyStreak: number;
  weeklyProgress: number;
  overallScore: number;
  topicProgress: Record<string, {
    score: number;
    attempts: number;
    completed: boolean;
    markedConfusing: boolean;
  }>;
  lastStudySession: string;
  lastScore: number; // Added for "Last Score" snapshot
}

// Lesson-related types
export interface Lesson {
  id: string;
  topicId: string;
  title: string;
  content: string;
  keyPoints: string[];
  examples: string[];
  diagrams?: string[];
  videoUrl?: string;
  audioSummaryUrl?: string;
  createdAt: string;
  updatedAt: string;
}

// Quiz-related types
export interface Question {
  id: string;
  topicId: string;
  text: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
}

export interface QuizResult {
  id: string;
  userId: string;
  topicId: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  timeSpent: number;
  answers: Array<{
    questionId: string;
    selectedOptionIndex: number;
    isCorrect: boolean;
    timeSpent: number;
  }>;
  completedAt: string;
}

// Revision-related types
export interface RevisionMaterial {
  id: string;
  topicId: string;
  userId: string;
  type: 'summary' | 'flashcards' | 'cheatsheet' | 'practice-questions' | 'formula-sheet';
  content: string;
  createdAt: string;
  updatedAt: string;
}

// App state types
export interface AppSettings {
  darkMode: boolean;
  notifications: boolean;
  learningReminders: boolean;
  studyGoal: number;
  openaiApiKey?: string;
  examDate: string;
  syllabusTopics: SyllabusTopic[];
  userPreferences?: {
    selfRating?: SelfRating;
    weakTopics?: string[];
    strongTopics?: string[];
    diagnosticResults?: {
      topicScores: Record<string, number>;
      strengths: string[];
      weaknesses: string[];
      overallScore: number;
    };
  };
}

export interface AppState {
  user: User | null;
  topics: Topic[];
  currentTopic: Topic | null;
  progress: Progress | null;
  isLoading: boolean;
  error: string | null;
  settings: AppSettings; // Use the new AppSettings interface
}

export interface AppAction {
  type: 'SET_USER' | 'SET_TOPICS' | 'SET_CURRENT_TOPIC' | 'SET_PROGRESS' | 
        'SET_LOADING' | 'SET_ERROR' | 'COMPLETE_TOPIC' | 'UPDATE_TOPIC_SCORE' | 
        'MARK_TOPIC_CONFUSING' | 'UPDATE_SETTINGS' | 'COMPLETE_ONBOARDING_STEP2';
  payload?: any;
}

export interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}
