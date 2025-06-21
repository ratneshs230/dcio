import backendService from './backendService';
import type { Question } from '../types/index';

// DIAGNOSTIC_TOPICS will now be dynamically fetched from the backend via AppContext

// Define difficulty levels for the diagnostic assessment
const DIFFICULTY_LEVELS = ['easy', 'medium', 'hard'] as const;
type DifficultySetting = typeof DIFFICULTY_LEVELS[number];

interface DiagnosticSettings {
  questionCount: number;
  topicSelection: 'all' | 'random' | string[];
  difficultyDistribution: Record<DifficultySetting, number>; // Percentage of questions at each difficulty
  timeLimit?: number; // in seconds, optional
}

const DEFAULT_SETTINGS: DiagnosticSettings = {
  questionCount: 10,
  topicSelection: 'random',
  difficultyDistribution: {
    easy: 30,
    medium: 50,
    hard: 20
  },
  timeLimit: 600 // 10 minutes
};

/**
 * Service for generating and managing diagnostic assessments
 */
export const diagnosticService = {
  /**
   * Generate diagnostic questions based on the provided settings and all available syllabus topics.
   * The `allSyllabusTopics` parameter is crucial for local fallback generation.
   */
  generateQuestions: async (settings: Partial<DiagnosticSettings> = {}, allSyllabusTopics: string[] = []): Promise<Question[]> => {
    // Merge default settings with provided settings
    const mergedSettings: DiagnosticSettings = {
      ...DEFAULT_SETTINGS,
      ...settings
    };

    try {
      // Call the backend API to generate questions
      const response = await backendService.post<{
        message: string;
        questions: Question[];
      }>('/api/diagnostic/generate', {
        settings: mergedSettings,
        app_id: 'dcio_tech_platform', // This would come from your app configuration
        user_id: 'current_user' // This would come from your auth context
      });
      
      if (!response.data || !response.data.questions) {
        throw new Error('Invalid response from server');
      }
      
      return response.data.questions;
    } catch (error) {
      console.error('Error generating diagnostic questions:', error);
      
      // Fallback to local generation if backend fails, using provided syllabus topics
      return generateLocalQuestions(mergedSettings, allSyllabusTopics);
    }
  },

  /**
   * Analyze the results of a diagnostic assessment
   */
  analyzeResults: async (
    questions: Question[], 
    answers: Array<{ questionId: string, selectedOptionIndex: number, isCorrect: boolean }>,
    learningStyle: string,
    selfRating?: string,
    weakTopics: string[] = [],
    strongTopics: string[] = []
  ) => {
    try {
      // Call the backend API to analyze results
      const response = await backendService.post<{
        message: string;
        analysis: {
          topicScores: Record<string, number>;
          strengths: string[];
          weaknesses: string[];
          overallScore: number;
        };
      }>('/api/diagnostic/analyze', {
        questions,
        answers,
        learningStyle,
        selfRating,
        weakTopics,
        strongTopics,
        app_id: 'dcio_tech_platform', // This would come from your app configuration
        user_id: 'current_user' // This would come from your auth context
      });
      
      if (!response.data || !response.data.analysis) {
        throw new Error('Invalid response from server');
      }
      
      return response.data.analysis;
    } catch (error) {
      console.error('Error analyzing diagnostic results:', error);
      
      // Fallback to local analysis if backend fails
      return analyzeResultsLocally(questions, answers, weakTopics, strongTopics);
    }
  }
};

/**
 * Generate questions locally as a fallback when the backend API is unavailable
 */
async function generateLocalQuestions(settings: DiagnosticSettings, allSyllabusTopics: string[]): Promise<Question[]> {
  // Select topics based on settings
  let selectedTopics: string[] = [];
  if (settings.topicSelection === 'all') {
    selectedTopics = [...allSyllabusTopics];
  } else if (settings.topicSelection === 'random') {
    // Randomly select topics to cover
    const topicCount = Math.min(5, allSyllabusTopics.length);
    const shuffledTopics = [...allSyllabusTopics].sort(() => 0.5 - Math.random());
    selectedTopics = shuffledTopics.slice(0, topicCount);
  } else if (Array.isArray(settings.topicSelection)) {
    selectedTopics = settings.topicSelection;
  }

  if (selectedTopics.length === 0) {
    console.warn("No topics selected for local question generation. Using all available syllabus topics.");
    selectedTopics = [...allSyllabusTopics];
    if (selectedTopics.length === 0) {
      console.error("No syllabus topics available for local question generation. Returning empty array.");
      return [];
    }
  }

  // Determine how many questions of each difficulty to generate
  const difficultyCount: Record<DifficultySetting, number> = {
    easy: Math.round((settings.difficultyDistribution.easy / 100) * settings.questionCount),
    medium: Math.round((settings.difficultyDistribution.medium / 100) * settings.questionCount),
    hard: Math.round((settings.difficultyDistribution.hard / 100) * settings.questionCount)
  };

  // Adjust counts to ensure we get exactly the requested number of questions
  let totalCount = difficultyCount.easy + difficultyCount.medium + difficultyCount.hard;
  if (totalCount < settings.questionCount) {
    difficultyCount.medium += settings.questionCount - totalCount;
  } else if (totalCount > settings.questionCount) {
    const excess = totalCount - settings.questionCount;
    if (difficultyCount.hard >= excess) {
      difficultyCount.hard -= excess;
    } else if (difficultyCount.medium >= excess) {
      difficultyCount.medium -= excess;
    } else {
      difficultyCount.easy -= excess;
    }
  }

  // Generate questions for each difficulty level
  const questions: Question[] = [];
  
  for (const difficulty of DIFFICULTY_LEVELS) {
    if (difficultyCount[difficulty] <= 0) continue;
    
    // Distribute questions across selected topics
    const questionsPerTopic = Math.max(1, Math.floor(difficultyCount[difficulty] / selectedTopics.length));
    let remainingQuestions = difficultyCount[difficulty];
    
    for (const topic of selectedTopics) {
      if (remainingQuestions <= 0) break;
      
      const count = Math.min(questionsPerTopic, remainingQuestions);
      const topicQuestions = generateMockQuestions(topic, difficulty, count);
      
      questions.push(...topicQuestions);
      remainingQuestions -= topicQuestions.length;
    }
    
    // If we still need more questions, generate them from random topics
    if (remainingQuestions > 0) {
      const randomTopic = selectedTopics[Math.floor(Math.random() * selectedTopics.length)];
      const additionalQuestions = generateMockQuestions(randomTopic, difficulty, remainingQuestions);
      questions.push(...additionalQuestions);
    }
  }

  // Shuffle the questions to mix difficulties and topics
  return questions.sort(() => 0.5 - Math.random());
}

/**
 * Generate mock questions for testing when API is unavailable
 */
function generateMockQuestions(topic: string, difficulty: DifficultySetting, count: number): Question[] {
  const questions: Question[] = [];
  
  for (let i = 0; i < count; i++) {
    const id = `${topic}_${difficulty}_${Math.random().toString(36).substring(2, 9)}`;
    
    questions.push({
      id,
      topicId: topic,
      text: `Sample ${difficulty} question about ${topic.replace('_', ' ')} (${i + 1})`,
      options: [
        `Correct answer for ${topic}`,
        `Wrong answer 1 for ${topic}`,
        `Wrong answer 2 for ${topic}`,
        `Wrong answer 3 for ${topic}`
      ],
      correctOptionIndex: 0,
      explanation: `This is the explanation for the correct answer about ${topic.replace('_', ' ')}`,
      difficulty: difficulty as any,
      tags: [topic]
    });
  }
  
  return questions;
}

/**
 * Analyze results locally as a fallback when the backend API is unavailable
 */
function analyzeResultsLocally(
  questions: Question[], 
  answers: Array<{ questionId: string, selectedOptionIndex: number, isCorrect: boolean }>,
  weakTopics: string[] = [],
  strongTopics: string[] = []
) {
  // Group questions by topic
  const topicResults: Record<string, { correct: number, total: number }> = {};
  
  questions.forEach((question) => {
    const answer = answers.find(a => a.questionId === question.id);
    if (!answer) return;
    
    const topic = question.topicId;
    
    if (!topicResults[topic]) {
      topicResults[topic] = { correct: 0, total: 0 };
    }
    
    topicResults[topic].total += 1;
    if (answer.isCorrect) {
      topicResults[topic].correct += 1;
    }
  });
  
  // Calculate scores and identify strengths/weaknesses
  const topicScores: Record<string, number> = {};
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  
  Object.entries(topicResults).forEach(([topic, result]) => {
    const score = Math.round((result.correct / result.total) * 100);
    topicScores[topic] = score;
    
    if (score >= 70) {
      strengths.push(topic);
    } else if (score <= 40) {
      weaknesses.push(topic);
    }
  });
  
  // Calculate overall score
  const totalCorrect = answers.filter(a => a.isCorrect).length;
  const overallScore = Math.round((totalCorrect / questions.length) * 100);
  
  // Combine with user-provided strengths/weaknesses
  const allStrengths = [...new Set([...strengths, ...strongTopics])];
  const allWeaknesses = [...new Set([...weaknesses, ...weakTopics])];
  
  return {
    topicScores,
    strengths: allStrengths,
    weaknesses: allWeaknesses,
    overallScore
  };
}
