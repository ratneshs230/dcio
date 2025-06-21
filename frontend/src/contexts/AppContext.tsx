import React, { createContext, useContext, useReducer, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { Progress, Topic, AppSettings, SyllabusTopic, User } from '../types/index';
import { openaiService } from '../services/openaiService';
import backendService from '../services/backendService';

// Define the AppState interface
interface AppState {
  progress: Progress;
  topics: Topic[];
  settings: AppSettings;
  isLoading: boolean;
  error: string | null;
  user: User; // User is always present after onboarding
}

// Define AppAction types
type AppAction = 
  | { type: 'SET_PROGRESS'; payload: Progress }
  | { type: 'SET_TOPICS'; payload: Topic[] }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<AppSettings> }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'COMPLETE_TOPIC'; payload: string }
  | { type: 'UPDATE_TOPIC_SCORE'; payload: { topicId: string; score: number } }
  | { type: 'SET_USER'; payload: User }
  | { type: 'MARK_TOPIC_CONFUSING'; payload: string };

// Initial state for the application
const initialState: AppState = {
  progress: {
    totalTopics: 0,
    completedTopics: 0,
    weakTopics: [],
    strongTopics: [],
    dailyStreak: 0,
    weeklyProgress: 0,
    overallScore: 0,
    topicProgress: {},
    lastScore: 0, // Initialize lastScore
    lastStudySession: '',
  },
  topics: [],
  settings: {
    darkMode: false,
    notifications: true,
    learningReminders: true,
    studyGoal: 120, // 2 hours per day
    openaiApiKey: undefined,
    examDate: new Date(new Date().getFullYear(), 11, 31).toISOString(), // Default to end of year
    syllabusTopics: [], // Initialize as empty, will be fetched from backend
    userPreferences: {}, // Initialize userPreferences
  },
  isLoading: false,
  error: null,
  user: {
    id: 'default_user_id', // Default ID
    name: "Guest User", // Default name
    email: "guest@example.com", // Default email
    learningStyle: "mixed",
    onboardingCompleted: false, // Default to false
    createdAt: new Date().toISOString(),
  },
};

// Helper to initialize topic progress based on syllabus
const initializeTopicProgress = (syllabus: SyllabusTopic[]): Progress['topicProgress'] => {
  const progress: Progress['topicProgress'] = {};
  if (syllabus && Array.isArray(syllabus)) {
    syllabus.forEach(topic => {
      if (topic && topic.id) {
        progress[topic.id] = { score: 0, attempts: 0, completed: false, markedConfusing: false };
      }
    });
  }
  return progress;
};

// Reducer function to manage state changes
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_PROGRESS':
      return { ...state, progress: action.payload };
    case 'SET_TOPICS':
      return { ...state, topics: action.payload };
    case 'UPDATE_SETTINGS':
      {
        const newSettings = { ...state.settings, ...action.payload };
        const totalTopics = newSettings.syllabusTopics?.length || 0;
        // Only update totalTopics in progress if syllabusTopics actually changed
        const progressNeedsUpdate = totalTopics !== state.progress.totalTopics;

        return {
          ...state,
          settings: newSettings,
          progress: progressNeedsUpdate
            ? { ...state.progress, totalTopics }
            : state.progress,
        };
      }
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'COMPLETE_TOPIC': {
      const topicId = action.payload;
      const topicProgress = state.progress.topicProgress[topicId];
      const wasCompleted = topicProgress?.completed || false;

      return {
        ...state,
        topics: state.topics.map(topic =>
          topic.id === topicId ? { ...topic, completed: true } : topic
        ),
        progress: {
          ...state.progress,
          completedTopics: wasCompleted
            ? state.progress.completedTopics
            : state.progress.completedTopics + 1,
          topicProgress: {
            ...state.progress.topicProgress,
            [topicId]: {
              ...(topicProgress || { score: 0, attempts: 0, markedConfusing: false }),
              completed: true,
            },
          },
        },
      };
    }
    case 'UPDATE_TOPIC_SCORE':
      return {
        ...state,
        progress: {
          ...state.progress,
          lastScore: action.payload.score,
          topicProgress: {
            ...state.progress.topicProgress,
            [action.payload.topicId]: {
              ...(state.progress.topicProgress[action.payload.topicId] || { score: 0, attempts: 0, completed: false, markedConfusing: false }),
              score: action.payload.score,
              attempts: (state.progress.topicProgress[action.payload.topicId]?.attempts || 0) + 1,
            }
          }
        }
      };
    case 'MARK_TOPIC_CONFUSING': {
      const topicId = action.payload;
      return {
        ...state,
        progress: {
          ...state.progress,
          topicProgress: {
            ...state.progress.topicProgress,
            [topicId]: {
              ...(state.progress.topicProgress[topicId] || { score: 0, attempts: 0, completed: false, markedConfusing: false }),
              markedConfusing: true,
            },
          },
        },
      };
    }
    case 'SET_USER':
      return { ...state, user: action.payload };
    default:
      return state;
  }
}

// Create the AppContext
const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | null>(null);

// AppProvider component to wrap the application and provide state
export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Effect for loading initial data and fetching syllabus topics
  useEffect(() => {
    const loadInitialData = async () => {
      dispatch({ type: 'SET_LOADING', payload: true });
      try {
        // Load settings from localStorage
        const savedSettings = localStorage.getItem('dcio-settings');
        let currentSettings: AppSettings = { ...initialState.settings };
        if (savedSettings) {
          try {
            const parsedSettings = JSON.parse(savedSettings) as Partial<AppSettings>;
            currentSettings = { ...currentSettings, ...parsedSettings };
          } catch (e) {
            console.error("Failed to parse settings from localStorage", e);
          }
        }
        // Get OpenAI API key from environment or settings
        const openaiApiKey = currentSettings.openaiApiKey || process.env.REACT_APP_OPENAI_API_KEY || '';
        currentSettings = { ...currentSettings, openaiApiKey };
        dispatch({ type: 'UPDATE_SETTINGS', payload: currentSettings });
        openaiService.setApiKey(openaiApiKey);
        openaiService.testApiKeyConnection().then(() => {
          console.log("API Key test successful");
        }).catch((error) => {
          console.error("API Key test failed", error);
        });

        // Load progress from localStorage
        const savedProgress = localStorage.getItem('dcio-progress');
        let currentProgress: Progress = { ...initialState.progress };
        if (savedProgress) {
          try {
            const parsedProgress = JSON.parse(savedProgress) as Partial<Progress>;
            currentProgress = { ...currentProgress, ...parsedProgress };
          } catch (e) {
            console.error("Failed to parse progress from localStorage", e);
          }
        }
        dispatch({ type: 'SET_PROGRESS', payload: currentProgress });

        // Fetch syllabus topics from backend
        const fetchedTopics = await backendService.getSyllabusTopics();
        dispatch({ type: 'UPDATE_SETTINGS', payload: { syllabusTopics: fetchedTopics } });
        
        // Update topic progress and total topics based on fetched syllabus
        const updatedTopicProgress = initializeTopicProgress(fetchedTopics);
        dispatch({ type: 'SET_PROGRESS', payload: { 
          ...currentProgress, 
          topicProgress: updatedTopicProgress,
          totalTopics: fetchedTopics.length
        }});
        
        // Set initial topics for the app based on fetched syllabus
        const initialTopics: Topic[] = fetchedTopics.map((st: SyllabusTopic) => ({
            id: st.id,
            title: st.name,
            description: st.description || '', // Provide default description
            category: 'electronics', // Default category, can be refined
            difficulty: st.difficulty || 'medium', // Use difficulty from syllabus or default
            tags: [], // Provide default empty tags
            estimatedTime: st.estimatedTime || 60, // Use estimatedTime or default
            completed: updatedTopicProgress[st.id]?.completed || false,
            score: updatedTopicProgress[st.id]?.score,
            subjectArea: st.subjectArea,
        }));
        dispatch({ type: 'SET_TOPICS', payload: initialTopics });

      } catch (err) {
        console.error("Error loading initial data:", err);
        dispatch({ type: 'SET_ERROR', payload: "Failed to load initial application data." });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    loadInitialData();
  }, []); // Empty dependency array ensures this runs only once on mount

  // Effect for saving data to localStorage whenever relevant state changes
  useEffect(() => {
    localStorage.setItem('dcio-progress', JSON.stringify(state.progress));
    localStorage.setItem('dcio-settings', JSON.stringify(state.settings));
  }, [state.progress, state.settings]); // Depend on relevant state slices

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

// Custom hook to use the AppContext
export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
