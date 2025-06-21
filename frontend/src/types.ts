export type LearningStyle = 'visual' | 'audio' | 'text' | 'mixed' | '';

export interface User {
  id: string;
  name: string;
  email: string;
  learningStyle: LearningStyle;
  examDate?: string;
  onboardingCompleted: boolean;
  createdAt: string;
}

// You can add other shared application types here
// For example, if AppContext uses specific types for settings or progress:
// export interface AppSettings { geminiApiKey?: string; notifications: boolean; learningReminders: boolean; studyGoal: number; darkMode: boolean; }
// export interface AppProgress { completedTopics: number; totalTopics: number; }