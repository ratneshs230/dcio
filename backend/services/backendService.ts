import axios from 'axios';

// Backend API base URL
const API_BASE_URL = 'http://localhost:8000';

// Create axios instance with base URL
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Generate a lesson for a given topic using the backend API
 * @param topic The topic to generate a lesson for
 * @returns The generated lesson content
 */
export const generateLesson = async (topic: string): Promise<{ topic: string; content: string }> => {
  try {
    const response = await api.get(`/api/lessons/generate?topic=${encodeURIComponent(topic)}`);
    return response.data;
  } catch (error) {
    console.error('Error generating lesson:', error);
    throw error;
  }
};

/**
 * Initialize the Firestore collections for a user
 * @param appId The application ID
 * @param userId The user ID
 * @returns A message indicating success
 */
export const initializeFirestore = async (appId: string, userId: string): Promise<{ message: string }> => {
  try {
    const response = await api.get(`/api/initialize?app_id=${encodeURIComponent(appId)}&user_id=${encodeURIComponent(userId)}`);
    return response.data;
  } catch (error) {
    console.error('Error initializing Firestore:', error);
    throw error;
  }
};

/**
 * Check if the backend API is running
 * @returns A boolean indicating if the backend is running
 */
export const checkBackendStatus = async (): Promise<boolean> => {
  try {
    const response = await api.get('/');
    return response.data.status === 'ok';
  } catch (error) {
    console.error('Backend API is not available:', error);
    return false;
  }
};

// Export all functions
export const backendService = {
  generateLesson,
  initializeFirestore,
  checkBackendStatus,
};

export default backendService;
