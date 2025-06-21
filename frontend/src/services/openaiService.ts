import OpenAI from 'openai';
import { LearningStyle } from '../types';

// Define the system message for the ExamMaster AI Agent
const EXAMMASTER_SYSTEM_MESSAGE = `
You are ExamMaster AI, an intelligent educational assistant specialized in DCIO/Tech exam preparation.
Your primary goal is to help users master complex technical concepts through personalized learning.

Key characteristics:
1. Expert Knowledge: You possess deep expertise in electronics, communications, computer science, and cyber security.
2. Adaptive Teaching: You tailor explanations to match the user's learning style and proficiency level.
3. Exam-Focused: All content you generate is directly relevant to the DCIO/Tech examination.
4. Clear Communication: You explain complex concepts in accessible language without oversimplification.
5. Supportive Tone: You are encouraging and motivational, building the user's confidence.

When generating content, prioritize accuracy, clarity, and relevance to exam requirements.
`;

const DEFAULT_MODEL = "gpt-3.5-turbo"; // Or your preferred OpenAI model like "gpt-4"

let openaiInstance: OpenAI | null = null;
let currentApiKey: string | null = null;

const _initializeOpenAI = (apiKey: string) => {
  if (!apiKey) {
    openaiInstance = null;
    currentApiKey = null;
    console.warn("OpenAI API key is not provided. Service will not function.");
    return;
  }

  if (apiKey !== currentApiKey || !openaiInstance) {
    try {
      // dangerouslyAllowBrowser: true is needed for client-side usage
      openaiInstance = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
      currentApiKey = apiKey;
      console.log("OpenAI Service Initialized/Updated.");
    } catch (error) {
      openaiInstance = null;
      currentApiKey = null;
      console.error("Failed to initialize OpenAI:", error);
      throw new Error(`Failed to initialize OpenAI: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};

const _ensureInitialized = (): OpenAI => {
  if (!openaiInstance) {
    throw new Error("OpenAI Service not initialized. Please set a valid API key in Settings.");
  }
  return openaiInstance;
};

const setApiKey = (apiKey: string | undefined) => {
  if (apiKey && apiKey.trim() !== "") {
    _initializeOpenAI(apiKey.trim());
  } else {
    openaiInstance = null;
    currentApiKey = null;
    console.log("OpenAI API key cleared. Service is now inactive.");
  }
};

const generateText = async (prompt: string, model: string = DEFAULT_MODEL): Promise<string> => {
  const openai = _ensureInitialized();
  try {
    const completion = await openai.chat.completions.create({
      messages: [
        { role: "system", content: EXAMMASTER_SYSTEM_MESSAGE },
        { role: "user", content: prompt }
      ],
      model: model,
      temperature: 0.7, // Balanced between creativity and consistency
      max_tokens: 2000, // Adjust based on expected response length
    });
    if (!completion.choices[0]?.message?.content) {
      throw new Error("No content in OpenAI response.");
    }
    return completion.choices[0].message.content;
  } catch (error) {
    console.error("Error generating text with OpenAI:", error);
    throw new Error(`Failed to generate content with OpenAI: ${error instanceof Error ? error.message : String(error)}`);
  }
};

const testApiKeyConnection = async (): Promise<void> => {
  const openai = _ensureInitialized();
  try {
    // A simple, low-token request to test connectivity and authentication
    // Listing models is a good way to test auth without generating content
    await openai.models.list();
    console.log("OpenAI API Key test successful: Able to list models.");
  } catch (error) {
    console.error("OpenAI API Key test failed:", error);
    throw new Error(`OpenAI API key test failed: ${error instanceof Error ? error.message : String(error)}`);
  }
};

const generateLessonContent = async (topic: string, learningStyle: LearningStyle, level: string): Promise<string> => {
  const prompt = `Generate a lesson on "${topic}" for a student with a "${learningStyle}" learning style at a "${level}" level for the DCIO/Tech exam. Focus on concepts relevant to electronics, communications, computer science, and cyber security as applicable. Output in Markdown format.`;
  return generateText(prompt);
};

// Placeholder for future "Explain as Infographic" functionality
// This would likely involve generating a detailed prompt for an image generation model
const generateDailyLearningMaterials = async (topic: string, learningStyle: LearningStyle, level: string): Promise<string> => {
  const prompt = `Generate daily learning materials on "${topic}" for a student with a "${learningStyle}" learning style at a "${level}" level for the DCIO/Tech exam. Focus on concepts relevant to electronics, communications, computer science, and cyber security as applicable. Output in Markdown format. Include a lesson, practice questions, and a revision sheet.`;
  return generateText(prompt);
};

const generateInfographicPrompt = async (textSelection: string, context?: string): Promise<string> => {
  const prompt = `Based on the following text selection: "${textSelection}" ${context ? `within the context of the lesson: "${context}"` : ''}, generate a concise list of key points and relationships that could be visualized as an infographic. Output as a bulleted list.`;
  return generateText(prompt);
};

const generateQuiz = async (topic: string, difficulty: 'easy' | 'medium' | 'hard', questionCount: number = 5): Promise<string> => {
  const prompt = `
  Task: Generate a quiz on "${topic}" for DCIO/Tech exam preparation.
  
  Specific Requirements:
  1. Create ${questionCount} multiple-choice questions at ${difficulty} difficulty level.
  2. Each question should have 4 options with one correct answer.
  3. Include a brief explanation for each correct answer.
  4. Format the output in Markdown.
  5. Ensure questions test understanding of key concepts, not just memorization.
  6. Focus on concepts that frequently appear in technical exams.
  `;
  return generateText(prompt);
};

const generateRevisionSummary = async (topic: string, learningStyle: LearningStyle): Promise<string> => {
  const prompt = `
  Task: Generate a concise summary of "${topic}" for DCIO/Tech exam revision.
  
  Specific Requirements:
  1. Create a comprehensive but concise summary (300-500 words).
  2. Focus on key concepts, definitions, and principles.
  3. Highlight common exam topics and potential question areas.
  4. Format in Markdown with clear headings and bullet points.
  5. Tailor for a user with a "${learningStyle}" learning style.
  6. Include a "Key Takeaways" section at the end with 3-5 bullet points.
  `;
  return generateText(prompt);
};

const generateCrashSheet = async (topic: string): Promise<string> => {
  const prompt = `
  Task: Create a crash sheet for last-minute revision of "${topic}" for the DCIO/Tech exam.
  
  Specific Requirements:
  1. Create an ultra-condensed reference (maximum 250 words).
  2. Focus only on the most critical facts, formulas, and concepts.
  3. Use extremely concise bullet points, numbered lists, and tables where appropriate.
  4. Prioritize information most likely to appear in exam questions.
  5. Format in Markdown with clear organization.
  6. Design for quick scanning and memorization in the final hours before an exam.
  `;
  return generateText(prompt);
};

const generateFormulaSheet = async (topic: string): Promise<string> => {
  const prompt = `
  Task: Create a comprehensive formula sheet for "${topic}" for the DCIO/Tech exam.
  
  Specific Requirements:
  1. List all relevant formulas, equations, and mathematical relationships.
  2. For each formula, provide:
     - The formula itself (using proper notation)
     - Brief explanation of variables/terms
     - When/how to apply it
     - Any special cases or variations
  3. Organize logically by sub-topic or application.
  4. Format in Markdown with clear sections.
  5. Include any common formula transformations or derivations if relevant.
  `;
  return generateText(prompt);
};

const generateFAQ = async (topic: string, learningStyle: LearningStyle): Promise<string> => {
  const prompt = `
  Task: Generate a set of Frequently Asked Questions (FAQs) about "${topic}" for DCIO/Tech exam preparation.
  
  Specific Requirements:
  1. Create 5-7 common questions and detailed answers.
  2. Focus on questions that address common misconceptions or challenging aspects.
  3. Include questions that frequently appear in exams.
  4. Provide clear, concise answers with examples where helpful.
  5. Format in Markdown with questions as headings.
  6. Tailor explanations for a user with a "${learningStyle}" learning style.
  `;
  return generateText(prompt);
};

const analyzePerformance = async (
  topicScores: Record<string, number>,
  recentMistakes: string[],
  studyTime: number
): Promise<string> => {
  const prompt = `
  Task: Analyze the user's DCIO/Tech exam preparation performance and provide personalized recommendations.
  
  Performance Data:
  - Topic Scores: ${JSON.stringify(topicScores)}
  - Recent Mistakes: ${JSON.stringify(recentMistakes)}
  - Study Time: ${studyTime} hours in the past week
  
  Specific Requirements:
  1. Identify strengths and weaknesses based on topic scores.
  2. Analyze patterns in recent mistakes.
  3. Provide 3-5 specific, actionable recommendations to improve performance.
  4. Suggest an optimal study plan based on the data.
  5. Format in Markdown with clear sections.
  6. Be encouraging while honest about areas needing improvement.
  `;
  return generateText(prompt);
};

export const openaiService = {
  setApiKey,
  testApiKeyConnection,
  generateLessonContent,
  generateInfographicPrompt,
  generateDailyLearningMaterials,
  generateText,
  generateQuiz,
  generateRevisionSummary,
  generateCrashSheet,
  generateFormulaSheet,
  generateFAQ,
  analyzePerformance
};
