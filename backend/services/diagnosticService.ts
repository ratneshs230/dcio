import { openaiService } from './openaiService';
import { Question } from '../types/index';

// Define the topics for the diagnostic assessment
const DIAGNOSTIC_TOPICS = [
  'digital_electronics',
  'analog_circuits',
  'communication_systems',
  'computer_networks',
  'operating_systems',
  'data_structures',
  'algorithms',
  'cyber_security',
  'cryptography',
  'information_theory'
];

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
   * Generate diagnostic questions based on the provided settings
   */
  generateQuestions: async (settings: Partial<DiagnosticSettings> = {}): Promise<Question[]> => {
    // Merge default settings with provided settings
    const mergedSettings: DiagnosticSettings = {
      ...DEFAULT_SETTINGS,
      ...settings
    };

    try {
      // In a real implementation, this would call the backend API
      // For now, we'll generate questions using the OpenAI service
      
      // Select topics based on settings
      let selectedTopics: string[] = [];
      if (mergedSettings.topicSelection === 'all') {
        selectedTopics = [...DIAGNOSTIC_TOPICS];
      } else if (mergedSettings.topicSelection === 'random') {
        // Randomly select topics to cover
        const topicCount = Math.min(5, DIAGNOSTIC_TOPICS.length);
        const shuffledTopics = [...DIAGNOSTIC_TOPICS].sort(() => 0.5 - Math.random());
        selectedTopics = shuffledTopics.slice(0, topicCount);
      } else if (Array.isArray(mergedSettings.topicSelection)) {
        selectedTopics = mergedSettings.topicSelection;
      }

      // Determine how many questions of each difficulty to generate
      const difficultyCount: Record<DifficultySetting, number> = {
        easy: Math.round((mergedSettings.difficultyDistribution.easy / 100) * mergedSettings.questionCount),
        medium: Math.round((mergedSettings.difficultyDistribution.medium / 100) * mergedSettings.questionCount),
        hard: Math.round((mergedSettings.difficultyDistribution.hard / 100) * mergedSettings.questionCount)
      };

      // Adjust counts to ensure we get exactly the requested number of questions
      let totalCount = difficultyCount.easy + difficultyCount.medium + difficultyCount.hard;
      if (totalCount < mergedSettings.questionCount) {
        difficultyCount.medium += mergedSettings.questionCount - totalCount;
      } else if (totalCount > mergedSettings.questionCount) {
        const excess = totalCount - mergedSettings.questionCount;
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
          const topicQuestions = await generateQuestionsForTopic(topic, difficulty, count);
          
          questions.push(...topicQuestions);
          remainingQuestions -= topicQuestions.length;
        }
        
        // If we still need more questions, generate them from random topics
        if (remainingQuestions > 0) {
          const randomTopic = selectedTopics[Math.floor(Math.random() * selectedTopics.length)];
          const additionalQuestions = await generateQuestionsForTopic(randomTopic, difficulty, remainingQuestions);
          questions.push(...additionalQuestions);
        }
      }

      // Shuffle the questions to mix difficulties and topics
      return questions.sort(() => 0.5 - Math.random());
    } catch (error) {
      console.error('Error generating diagnostic questions:', error);
      throw new Error('Failed to generate diagnostic questions. Please try again.');
    }
  },

  /**
   * Analyze the results of a diagnostic assessment
   */
  analyzeResults: (questions: Question[], answers: Array<{ questionId: string, selectedOptionIndex: number, isCorrect: boolean }>) => {
    // Group questions by topic
    const topicResults: Record<string, { correct: number, total: number }> = {};
    
    questions.forEach((question, index) => {
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
    
    return {
      topicScores,
      strengths,
      weaknesses,
      overallScore
    };
  }
};

/**
 * Helper function to generate questions for a specific topic and difficulty
 */
async function generateQuestionsForTopic(topic: string, difficulty: DifficultySetting, count: number): Promise<Question[]> {
  try {
    // In a real implementation, this would call the backend API
    // For now, we'll generate questions using the OpenAI service
    
    const prompt = `
    Generate ${count} multiple-choice questions about ${topic.replace('_', ' ')} for a diagnostic assessment.
    
    Requirements:
    1. Questions should be at ${difficulty} difficulty level
    2. Each question should have 4 options with only one correct answer
    3. Include a brief explanation for the correct answer
    4. Format as a JSON array of objects with the following structure:
       {
         "id": "unique_id",
         "topicId": "${topic}",
         "text": "question text",
         "options": ["option1", "option2", "option3", "option4"],
         "correctOptionIndex": 0-3,
         "explanation": "explanation text",
         "difficulty": "${difficulty}",
         "tags": ["relevant", "tags"]
       }
    `;
    
    const response = await openaiService.generateText(prompt);
    
    try {
      // Extract JSON from the response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in the response');
      }
      
      const questions: Question[] = JSON.parse(jsonMatch[0]);
      
      // Validate and clean up the questions
      return questions.map(q => ({
        ...q,
        id: q.id || `${topic}_${difficulty}_${Math.random().toString(36).substring(2, 9)}`,
        topicId: topic,
        difficulty: difficulty as any,
        tags: q.tags || [topic]
      }));
    } catch (parseError) {
      console.error('Error parsing questions JSON:', parseError);
      
      // Fallback: Generate mock questions if parsing fails
      return generateMockQuestions(topic, difficulty, count);
    }
  } catch (error) {
    console.error(`Error generating questions for ${topic} at ${difficulty} difficulty:`, error);
    
    // Fallback: Generate mock questions if API call fails
    return generateMockQuestions(topic, difficulty, count);
  }
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
