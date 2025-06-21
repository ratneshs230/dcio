import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, GenerativeModel, Content } from "@google/generative-ai";
import { LearningStyle } from '../types';

const MODEL_NAME = "gemini-1.5-flash-latest"; // Or your preferred Gemini model

let genAIInstance: GoogleGenerativeAI | null = null;
let generativeModel: GenerativeModel | null = null;
let currentApiKey: string | null = null;

const generationConfig = {
  temperature: 0.7, // Adjust as needed for creativity vs. factuality
  topK: 1,
  topP: 1,
  maxOutputTokens: 4096, // Adjust based on expected content length
};

const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

const _initializeGemini = (apiKey: string) => {
  if (!apiKey) {
    genAIInstance = null;
    generativeModel = null;
    currentApiKey = null;
    console.warn("Gemini API key is not provided. Service will not function.");
    return;
  }

  if (apiKey !== currentApiKey || !genAIInstance || !generativeModel) {
    try {
      genAIInstance = new GoogleGenerativeAI(apiKey);
      generativeModel = genAIInstance.getGenerativeModel({
        model: MODEL_NAME,
        generationConfig,
        safetySettings,
      });
      currentApiKey = apiKey;
      console.log("Gemini AI Service Initialized/Updated.");
    } catch (error) {
      genAIInstance = null;
      generativeModel = null;
      currentApiKey = null; // Keep the key that failed for re-test attempts if desired, or null it.
      console.error("Failed to initialize Gemini AI:", error);
      throw new Error(`Failed to initialize Gemini AI: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};

const _ensureInitialized = (): GenerativeModel => {
  if (!generativeModel) {
    throw new Error("Gemini AI Service not initialized. Please set a valid API key in Settings.");
  }
  return generativeModel;
};

const setApiKey = (apiKey: string | undefined) => {
  if (apiKey && apiKey.trim() !== "") {
    _initializeGemini(apiKey.trim());
  } else {
    genAIInstance = null;
    generativeModel = null;
    currentApiKey = null;
    console.log("Gemini API key cleared. Service is now inactive.");
  }
};

const generateText = async (prompt: string | (string | Content)[]): Promise<string> => {
  const model = _ensureInitialized();
  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    if (!response || typeof response.text !== 'function') {
        throw new Error("No response or text function found from Gemini API.");
    }
    return response.text();
  } catch (error) {
    console.error("Error generating text with Gemini:", error);
    throw new Error(`Failed to generate content: ${error instanceof Error ? error.message : String(error)}`);
  }
};

const testApiKeyConnection = async (): Promise<void> => {
  const model = _ensureInitialized(); // This will throw if not initialized (e.g. bad key format during _initializeGemini)
  try {
    await model.generateContent("Test connection by generating a short phrase."); // Simple test prompt
    console.log("API Key test successful.");
  } catch (error) {
    console.error("API Key test generation failed:", error);
    // Optionally, you might want to clear `generativeModel` here if the error indicates an invalid key for sure
    // generativeModel = null;
    throw new Error(`API key test generation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
};

const generateLessonContent = async (topic: string, learningStyle: LearningStyle, level: string): Promise<string> => {
  const prompt = `Generate a lesson on "${topic}" for a student with a "${learningStyle}" learning style at a "${level}" level for the DCIO/Tech exam. Focus on concepts relevant to electronics, communications, computer science, and cyber security as applicable. Output in Markdown.`;
  return generateText(prompt);
};

export const geminiService = {
  setApiKey,
  testApiKeyConnection,
  generateLessonContent,
  // Add more functions here: generateQuiz, generateInfographicPrompt, etc.
};