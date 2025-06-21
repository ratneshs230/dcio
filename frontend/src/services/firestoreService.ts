import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp,
  arrayUnion,
  increment,
  deleteDoc
} from 'firebase/firestore';
import { firestore } from '../firebase';
import { User } from '../types';

// Define the missing types that were previously imported
interface Topic {
  id: string;
  title: string;
  description: string;
  category: 'electronics' | 'communications' | 'computer-science' | 'cyber-security';
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
  estimatedTime: number;
  prerequisites?: string[];
}

interface Progress {
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
}

interface Lesson {
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

interface Question {
  id: string;
  topicId: string;
  text: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
}

interface QuizResult {
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

interface RevisionMaterial {
  id: string;
  topicId: string;
  userId: string;
  type: 'summary' | 'flashcards' | 'cheatsheet' | 'practice-questions' | 'formula-sheet';
  content: string;
  createdAt: string;
  updatedAt: string;
}

// User-related operations
export const getUserProfile = async (userId: string): Promise<User | null> => {
  try {
    const userDoc = await getDoc(doc(firestore, 'users', userId));
    if (userDoc.exists()) {
      return userDoc.data() as User;
    }
    return null;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw error;
  }
};

export const createUserProfile = async (userId: string, userData: Partial<User>): Promise<void> => {
  try {
    const newUser: User = {
      id: userId,
      name: userData.name || 'User',
      email: userData.email || '',
      learningStyle: userData.learningStyle || 'mixed',
      onboardingCompleted: userData.onboardingCompleted || false,
      createdAt: new Date().toISOString(),
      examDate: userData.examDate
    };
    
    await setDoc(doc(firestore, 'users', userId), newUser);
  } catch (error) {
    console.error('Error creating user profile:', error);
    throw error;
  }
};

export const updateUserProfile = async (userId: string, userData: Partial<User>): Promise<void> => {
  try {
    await updateDoc(doc(firestore, 'users', userId), userData);
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};

// Progress-related operations
export const getUserProgress = async (userId: string): Promise<Progress | null> => {
  try {
    const progressDoc = await getDoc(doc(firestore, 'progress', userId));
    if (progressDoc.exists()) {
      return progressDoc.data() as Progress;
    }
    return null;
  } catch (error) {
    console.error('Error fetching user progress:', error);
    throw error;
  }
};

export const initializeUserProgress = async (userId: string): Promise<void> => {
  try {
    const initialProgress: Progress = {
      totalTopics: 0,
      completedTopics: 0,
      weakTopics: [],
      strongTopics: [],
      dailyStreak: 0,
      weeklyProgress: 0,
      overallScore: 0,
      topicProgress: {},
      lastStudySession: new Date().toISOString()
    };
    
    await setDoc(doc(firestore, 'progress', userId), initialProgress);
  } catch (error) {
    console.error('Error initializing user progress:', error);
    throw error;
  }
};

export const updateUserProgress = async (userId: string, progressData: Partial<Progress>): Promise<void> => {
  try {
    await updateDoc(doc(firestore, 'progress', userId), progressData);
  } catch (error) {
    console.error('Error updating user progress:', error);
    throw error;
  }
};

export const updateTopicProgress = async (
  userId: string, 
  topicId: string, 
  score: number, 
  completed: boolean = false,
  markedConfusing: boolean = false
): Promise<void> => {
  try {
    const userProgress = await getUserProgress(userId);
    if (!userProgress) {
      await initializeUserProgress(userId);
    }
    
    const topicProgressUpdate = {
      [`topicProgress.${topicId}`]: {
        score,
        attempts: increment(1),
        completed,
        markedConfusing
      }
    };
    
    await updateDoc(doc(firestore, 'progress', userId), topicProgressUpdate);
    
    // Update weak/strong topics lists
    const progressRef = doc(firestore, 'progress', userId);
    if (score >= 80) {
      await updateDoc(progressRef, {
        strongTopics: arrayUnion(topicId),
        weakTopics: userProgress?.weakTopics.filter(id => id !== topicId) || []
      });
    } else if (score < 50) {
      await updateDoc(progressRef, {
        weakTopics: arrayUnion(topicId),
        strongTopics: userProgress?.strongTopics.filter(id => id !== topicId) || []
      });
    }
    
    // Update completed topics count if needed
    if (completed) {
      await updateDoc(progressRef, {
        completedTopics: increment(1)
      });
    }
  } catch (error) {
    console.error('Error updating topic progress:', error);
    throw error;
  }
};

// Topic-related operations
export const getAllTopics = async (): Promise<Topic[]> => {
  try {
    const topicsSnapshot = await getDocs(collection(firestore, 'topics'));
    return topicsSnapshot.docs.map((doc) => doc.data() as Topic);
  } catch (error) {
    console.error('Error fetching topics:', error);
    throw error;
  }
};

export const getTopicById = async (topicId: string): Promise<Topic | null> => {
  try {
    const topicDoc = await getDoc(doc(firestore, 'topics', topicId));
    if (topicDoc.exists()) {
      return topicDoc.data() as Topic;
    }
    return null;
  } catch (error) {
    console.error('Error fetching topic:', error);
    throw error;
  }
};

export const createTopic = async (topicData: Omit<Topic, 'id'>): Promise<string> => {
  try {
    const topicsRef = collection(firestore, 'topics');
    const newTopicRef = doc(topicsRef);
    const topicId = newTopicRef.id;
    
    const newTopic: Topic = {
      id: topicId,
      ...topicData
    };
    
    await setDoc(newTopicRef, newTopic);
    return topicId;
  } catch (error) {
    console.error('Error creating topic:', error);
    throw error;
  }
};

// Lesson-related operations
export const getLessonByTopicId = async (topicId: string): Promise<Lesson | null> => {
  try {
    const lessonsQuery = query(
      collection(firestore, 'lessons'),
      where('topicId', '==', topicId),
      limit(1)
    );
    
    const lessonsSnapshot = await getDocs(lessonsQuery);
    if (!lessonsSnapshot.empty) {
      return lessonsSnapshot.docs[0].data() as Lesson;
    }
    return null;
  } catch (error) {
    console.error('Error fetching lesson:', error);
    throw error;
  }
};

export const createLesson = async (lessonData: Omit<Lesson, 'id'>): Promise<string> => {
  try {
    const lessonsRef = collection(firestore, 'lessons');
    const newLessonRef = doc(lessonsRef);
    const lessonId = newLessonRef.id;
    
    const newLesson: Lesson = {
      id: lessonId,
      ...lessonData
    };
    
    await setDoc(newLessonRef, newLesson);
    return lessonId;
  } catch (error) {
    console.error('Error creating lesson:', error);
    throw error;
  }
};

// Quiz-related operations
export const getQuestionsByTopicId = async (topicId: string, limit: number = 10): Promise<Question[]> => {
  try {
    const questionsQuery = query(
      collection(firestore, 'questions'),
      where('topicId', '==', topicId),
      limit
    );
    
    const questionsSnapshot = await getDocs(questionsQuery);
    return questionsSnapshot.docs.map((doc) => doc.data() as Question);
  } catch (error) {
    console.error('Error fetching questions:', error);
    throw error;
  }
};

export const saveQuizResult = async (userId: string, quizResult: Omit<QuizResult, 'id'>): Promise<string> => {
  try {
    const resultsRef = collection(firestore, 'quizResults');
    const newResultRef = doc(resultsRef);
    const resultId = newResultRef.id;
    
    const newResult: QuizResult = {
      id: resultId,
      ...quizResult
    };
    
    await setDoc(newResultRef, newResult);
    
    // Update user progress with the quiz result
    await updateTopicProgress(
      userId,
      quizResult.topicId,
      quizResult.score,
      quizResult.score >= 70 // Mark as completed if score is 70% or higher
    );
    
    return resultId;
  } catch (error) {
    console.error('Error saving quiz result:', error);
    throw error;
  }
};

export const getUserQuizResults = async (userId: string): Promise<QuizResult[]> => {
  try {
    const resultsQuery = query(
      collection(firestore, 'quizResults'),
      where('userId', '==', userId),
      orderBy('completedAt', 'desc')
    );
    
    const resultsSnapshot = await getDocs(resultsQuery);
    return resultsSnapshot.docs.map((doc) => doc.data() as QuizResult);
  } catch (error) {
    console.error('Error fetching quiz results:', error);
    throw error;
  }
};

// Revision materials operations
export const getRevisionMaterialsByTopicId = async (topicId: string): Promise<RevisionMaterial[]> => {
  try {
    const materialsQuery = query(
      collection(firestore, 'revisionMaterials'),
      where('topicId', '==', topicId)
    );
    
    const materialsSnapshot = await getDocs(materialsQuery);
    return materialsSnapshot.docs.map((doc) => doc.data() as RevisionMaterial);
  } catch (error) {
    console.error('Error fetching revision materials:', error);
    throw error;
  }
};

export const saveRevisionMaterial = async (material: Omit<RevisionMaterial, 'id'>): Promise<string> => {
  try {
    const materialsRef = collection(firestore, 'revisionMaterials');
    const newMaterialRef = doc(materialsRef);
    const materialId = newMaterialRef.id;
    
    const newMaterial: RevisionMaterial = {
      id: materialId,
      ...material
    };
    
    await setDoc(newMaterialRef, newMaterial);
    return materialId;
  } catch (error) {
    console.error('Error saving revision material:', error);
    throw error;
  }
};

// Study plan operations
export interface StudyPlan {
  id: string;
  userId: string;
  weeks: Array<{
    week: number;
    theme: string;
    days: Array<{
      day: number;
      topic: string;
      description: string;
      objectives: string[];
      category: 'electronics' | 'communications' | 'computer-science' | 'cyber-security';
      estimatedTime: number;
      difficulty: 'easy' | 'medium' | 'hard';
      completed: boolean;
    }>;
  }>;
  createdAt: string;
  lastUpdated: string;
}

export const getUserStudyPlan = async (userId: string): Promise<StudyPlan | null> => {
  try {
    const planDoc = await getDoc(doc(firestore, 'studyPlans', userId));
    if (planDoc.exists()) {
      return planDoc.data() as StudyPlan;
    }
    return null;
  } catch (error) {
    console.error('Error fetching study plan:', error);
    throw error;
  }
};

export const saveStudyPlan = async (userId: string, plan: Omit<StudyPlan, 'id' | 'userId' | 'createdAt' | 'lastUpdated'>): Promise<void> => {
  try {
    const now = new Date().toISOString();
    const studyPlan: StudyPlan = {
      id: userId, // Using userId as the plan ID for simplicity
      userId,
      ...plan,
      createdAt: now,
      lastUpdated: now
    };
    
    await setDoc(doc(firestore, 'studyPlans', userId), studyPlan);
  } catch (error) {
    console.error('Error saving study plan:', error);
    throw error;
  }
};

export const updateStudyPlanDay = async (userId: string, weekIndex: number, dayIndex: number, completed: boolean): Promise<void> => {
  try {
    const planDoc = await getDoc(doc(firestore, 'studyPlans', userId));
    if (!planDoc.exists()) {
      throw new Error('Study plan not found');
    }
    
    const plan = planDoc.data() as StudyPlan;
    
    // Update the specific day's completion status
    if (plan.weeks[weekIndex] && plan.weeks[weekIndex].days[dayIndex]) {
      plan.weeks[weekIndex].days[dayIndex].completed = completed;
      
      await updateDoc(doc(firestore, 'studyPlans', userId), {
        [`weeks.${weekIndex}.days.${dayIndex}.completed`]: completed,
        lastUpdated: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Error updating study plan day:', error);
    throw error;
  }
};

// Export all functions
export const firestoreService = {
  // User operations
  getUserProfile,
  createUserProfile,
  updateUserProfile,
  
  // Progress operations
  getUserProgress,
  initializeUserProgress,
  updateUserProgress,
  updateTopicProgress,
  
  // Topic operations
  getAllTopics,
  getTopicById,
  createTopic,
  
  // Lesson operations
  getLessonByTopicId,
  createLesson,
  
  // Quiz operations
  getQuestionsByTopicId,
  saveQuizResult,
  getUserQuizResults,
  
  // Revision materials operations
  getRevisionMaterialsByTopicId,
  saveRevisionMaterial,
  
  // Study plan operations
  getUserStudyPlan,
  saveStudyPlan,
  updateStudyPlanDay
};