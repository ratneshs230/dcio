import axios from 'axios';
import type { AxiosResponse } from 'axios';

// Define the base URL for the API
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

// Define the app ID and user ID
// In a real application, these would be dynamically determined
const APP_ID = 'dcio_tech_platform';
const USER_ID = 'default_user'; // This would be replaced with the actual user ID from authentication

// Define interfaces for API responses
interface ApiResponse<T> {
  data: T;
  status: number;
  statusText: string;
}

// Define interfaces for data models
export interface LearningProfile {
  strengths: Record<string, number>;
  weaknesses: Record<string, number>;
  learning_pace: number;
  preferred_formats: Record<string, number>;
  difficulty_adjustment: number;
  progress_map: Record<string, any>;
  daily_streak: number;
  total_study_time: number;
  last_active_date?: string;
  created_at?: string;
}

export interface Lesson {
  topic_id: string;
  title: string;
  content_text: string;
  content?: string; // For backward compatibility with Dashboard component
  mcqs_json: string;
  summary_text?: string;
  generated_at: string;
  type: string;
  difficulty_level: string;
  estimated_time_minutes?: number;
  profile_used?: boolean; // Whether the user's learning profile was used to generate this lesson
}

export interface Quiz {
  lesson_id: string;
  topic_id: string;
  questions_attempted_json: string;
  score: number;
  correct_answers_count: number;
  incorrect_answers_count: number;
  time_taken_seconds: number;
  confidence_ratings?: number[];
  submitted_at: string;
}

export interface QuizQuestion {
  id: string;
  difficulty: string;
  question: string;
  options: { id: string; text: string }[];
  correctAnswer: string;
  explanation: string;
  misconceptions?: Record<string, string>;
  conceptTested?: string;
}

export interface RevisionContent {
  topic_id: string;
  revision_type: string;
  content_text: string;
  difficulty_level: string;
  generated_at: string;
}

export interface FormulaEntry {
  topic_id: string;
  formula_text: string;
  explanation: string;
  is_difficult: boolean;
  added_at: string;
  last_viewed?: string;
  view_count?: number;
}

export interface FAQEntry {
  topic_id: string;
  question: string;
  answer: string;
  source_query?: string;
  added_at: string;
  last_viewed?: string;
  view_count?: number;
}

export interface TopicInteraction {
  topic_id: string;
  interaction_type: string;
  time_spent: number;
  difficulty_rating?: number;
  content_generated: boolean;
  user_feedback?: string;
}

// Create an axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// API service functions
const backendService = {
  // Generic API methods
  get: async <T>(url: string): Promise<ApiResponse<T>> => {
    try {
      const response: AxiosResponse = await api.get(url);
      return {
        data: response.data,
        status: response.status,
        statusText: response.statusText,
      };
    } catch (error) {
      console.error(`Error in GET request to ${url}:`, error);
      throw error;
    }
  },
  
  post: async <T>(url: string, data?: any): Promise<ApiResponse<T>> => {
    try {
      const response: AxiosResponse = await api.post(url, data);
      return {
        data: response.data,
        status: response.status,
        statusText: response.statusText,
      };
    } catch (error) {
      console.error(`Error in POST request to ${url}:`, error);
      throw error;
    }
  },
  // System API
  checkBackendStatus: async (): Promise<boolean> => {
    try {
      const response: AxiosResponse = await api.get('/');
      return response.status === 200;
    } catch (error) {
      console.error('Error checking backend status:', error);
      return false;
    }
  },
  
  initializeFirestore: async (): Promise<boolean> => {
    try {
      // This is a placeholder. In a real implementation, this would initialize Firestore
      // For now, we'll just return true to simulate success
      return true;
    } catch (error) {
      console.error('Error initializing Firestore:', error);
      return false;
    }
  },
  
  // Learning Profile API
  getLearningProfile: async (): Promise<LearningProfile> => {
    try {
      const response: AxiosResponse = await api.get(`/api/learning-profile/${APP_ID}/${USER_ID}`);
      return response.data.profile;
    } catch (error) {
      console.error('Error fetching learning profile:', error);
      throw error;
    }
  },

  updateLearningProfile: async (profile: Partial<LearningProfile>): Promise<ApiResponse<any>> => {
    try {
      const response: AxiosResponse = await api.post(`/api/learning-profile/${APP_ID}/${USER_ID}`, profile);
      return {
        data: response.data,
        status: response.status,
        statusText: response.statusText,
      };
    } catch (error) {
      console.error('Error updating learning profile:', error);
      throw error;
    }
  },

  // Lesson API
  getTodayLesson: async (): Promise<Lesson> => {
    try {
      const response: AxiosResponse = await api.get(`/api/lessons/today?app_id=${APP_ID}&user_id=${USER_ID}`);
      return response.data.lesson;
    } catch (error) {
      console.error('Error fetching today\'s lesson:', error);
      throw error;
    }
  },

  generateLesson: async (topic_id: string, difficulty_level: string = 'intermediate'): Promise<Lesson> => {
    try {
      const response: AxiosResponse = await api.post(`/api/lessons/generate?app_id=${APP_ID}&user_id=${USER_ID}`, {
        topic_id,
        difficulty_level,
      });
      return response.data.lesson;
    } catch (error) {
      console.error('Error generating lesson:', error);
      throw error;
    }
  },

  // Quiz API
  submitQuiz: async (quiz: Quiz): Promise<ApiResponse<any>> => {
    try {
      const response: AxiosResponse = await api.post(`/api/analytics/quiz-submission/${APP_ID}/${USER_ID}`, quiz);
      return {
        data: response.data,
        status: response.status,
        statusText: response.statusText,
      };
    } catch (error) {
      console.error('Error submitting quiz:', error);
      throw error;
    }
  },

  // Revision API
  trackTopicInteraction: async (interaction: TopicInteraction): Promise<ApiResponse<any>> => {
    try {
      const response: AxiosResponse = await api.post(`/api/analytics/topic-interaction/${APP_ID}/${USER_ID}`, interaction);
      return {
        data: response.data,
        status: response.status,
        statusText: response.statusText,
      };
    } catch (error) {
      console.error('Error tracking topic interaction:', error);
      throw error;
    }
  },

  generateRevisionContent: async (
    topic_id: string,
    revision_type: string,
    difficulty_level?: string
  ): Promise<RevisionContent> => {
    try {
      const response: AxiosResponse = await api.post(`/api/revision/generate?app_id=${APP_ID}&user_id=${USER_ID}`, {
        topic_id,
        revision_type,
        difficulty_level,
      });
      return response.data.revision;
    } catch (error) {
      console.error('Error generating revision content:', error);
      throw error;
    }
  },

  // Formula Sheet API
  getFormulaEntries: async (topic_id?: string): Promise<FormulaEntry[]> => {
    try {
      const url = topic_id 
        ? `/api/formula-sheet/${APP_ID}/${USER_ID}?topic_id=${topic_id}`
        : `/api/formula-sheet/${APP_ID}/${USER_ID}`;
      
      const response: AxiosResponse = await api.get(url);
      return response.data.formulas;
    } catch (error) {
      console.error('Error fetching formula entries:', error);
      throw error;
    }
  },

  addFormulaEntry: async (topic: string, concept: string): Promise<FormulaEntry> => {
    try {
      const response: AxiosResponse = await api.post(`/api/formula-sheet/add/${APP_ID}/${USER_ID}`, {
        topic,
        concept
      });
      return response.data.formula;
    } catch (error) {
      console.error('Error adding formula entry:', error);
      throw error;
    }
  },

  // FAQ Booklet API
  getFAQEntries: async (topic_id?: string): Promise<FAQEntry[]> => {
    try {
      const url = topic_id 
        ? `/api/faq-booklet/${APP_ID}/${USER_ID}?topic_id=${topic_id}`
        : `/api/faq-booklet/${APP_ID}/${USER_ID}`;
      
      const response: AxiosResponse = await api.get(url);
      return response.data.faqs;
    } catch (error) {
      console.error('Error fetching FAQ entries:', error);
      throw error;
    }
  },

  addFAQEntry: async (topic: string, question: string): Promise<FAQEntry> => {
    try {
      const response: AxiosResponse = await api.post(`/api/faq-booklet/add/${APP_ID}/${USER_ID}`, {
        topic,
        question
      });
      return response.data.faq;
    } catch (error) {
      console.error('Error adding FAQ entry:', error);
      throw error;
    }
  },

  // Helper functions
  parseQuizQuestions: (mcqs_json: string): QuizQuestion[] => {
    try {
      return JSON.parse(mcqs_json);
    } catch (error) {
      console.error('Error parsing quiz questions:', error);
      return [];
    }
  },

  formatMarkdown: (markdown: string): string => {
    // This is a placeholder. In a real application, you would use a markdown parser
    // like marked.js or react-markdown to convert markdown to HTML
    return markdown;
  },

  // Utility function to handle API errors
  handleApiError: (error: any): string => {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      return `Error ${error.response.status}: ${error.response.data.detail || 'Unknown error'}`;
    } else if (error.request) {
      // The request was made but no response was received
      return 'No response received from server. Please check your connection.';
    } else {
      // Something happened in setting up the request that triggered an Error
      return `Error: ${error.message}`;
    }
  },

  // Syllabus API
  getSyllabusTopics: async (): Promise<any[]> => {
    try {
      const response: AxiosResponse = await api.get(`/api/syllabus/topics?app_id=${APP_ID}`);
      return response.data.topics;
    } catch (error) {
      console.error('Error fetching syllabus topics:', error);
      throw error;
    }
  },
};

export default backendService;
