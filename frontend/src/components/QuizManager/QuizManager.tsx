import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, AlertTriangle, Loader2, Brain, Award, BarChart2, Clock } from 'lucide-react';
import { openaiService } from '../../services/openaiService';
import { useApp } from '../../contexts/AppContext';

interface QuizManagerProps {
  topic: string;
}

interface Question {
  question: string;
  options: string[];
  answer: number; // Index of correct answer
  explanation: string;
}

interface QuizResults {
  score: number;
  correctCount: number;
  incorrectCount: number;
  timeTaken: number;
  weakAreas: string[];
}

const QuizManager: React.FC<QuizManagerProps> = ({ topic }) => {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [userAnswers, setUserAnswers] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quizStartTime, setQuizStartTime] = useState<Date | null>(null);
  const [quizResults, setQuizResults] = useState<QuizResults | null>(null);
  const [userConfidence, setUserConfidence] = useState<number>(3); // 1-5 scale
  
  // Extract topic ID from topic name for tracking progress
  const topicId = topic.toLowerCase().replace(/\s+/g, '-');

  useEffect(() => {
    const generateQuestions = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Get user's learning style and difficulty adjustment from context
        const learningStyle = state.user?.learningStyle || 'mixed';
        const difficultyAdjustment = 1.0; // This would come from the user's profile in a full implementation
        
        // Create a more sophisticated prompt based on the AI Prompting Guidelines
        const prompt = `
        Task: Generate 5 high-quality multiple-choice questions (MCQs) on the topic of "${topic}" for the DCIO/Tech exam.

        Specific Requirements:
        1. Each question should have 4 distinct options (A, B, C, D).
        2. The correct answer should be clearly indicated.
        3. Provide a brief explanation for each question that would help the user understand why the correct answer is right and common misconceptions.
        4. Difficulty should be ${difficultyAdjustment < 0.8 ? 'easier' : difficultyAdjustment > 1.2 ? 'challenging' : 'moderate'} based on the user's current learning profile.
        5. Questions should be relevant to the DCIO/Tech exam pattern.
        6. Focus on conceptual understanding rather than rote memorization.
        7. Tailor the questions to a user with a "${learningStyle}" learning style.

        Output Format: JSON array with the following structure:
        [
          {
            "question": "Question text here",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "answer": 0, // Index of correct answer (0-3)
            "explanation": "Explanation of why this answer is correct"
          },
          // More questions...
        ]`;

        const generatedContent = await openaiService.generateText(prompt);
        
        // Parse the JSON response
        try {
          // Extract JSON from the response (in case there's additional text)
          const jsonMatch = generatedContent.match(/\[[\s\S]*\]/);
          const jsonString = jsonMatch ? jsonMatch[0] : generatedContent;
          
          const parsedQuestions = JSON.parse(jsonString) as Question[];
          setQuestions(parsedQuestions);
          setQuizStartTime(new Date());
        } catch (parseError) {
          console.error("Failed to parse questions JSON:", parseError);
          setError("Failed to parse quiz questions. Please try again.");
        }
      } catch (error) {
        console.error("Failed to generate questions:", error);
        setError("Failed to generate quiz questions. Please check your internet connection and try again.");
      } finally {
        setIsLoading(false);
      }
    };

    generateQuestions();
  }, [topic, state.user]);

  const handleOptionSelect = (optionIndex: number) => {
    if (!isAnswerSubmitted) {
      setSelectedOption(optionIndex);
    }
  };

  const handleSubmitAnswer = () => {
    if (selectedOption === null || isAnswerSubmitted) return;
    
    // Record the user's answer
    const newUserAnswers = [...userAnswers];
    newUserAnswers[currentQuestionIndex] = selectedOption;
    setUserAnswers(newUserAnswers);
    
    // Mark the answer as submitted to show feedback
    setIsAnswerSubmitted(true);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedOption(null);
      setIsAnswerSubmitted(false);
    } else {
      // Quiz completed, calculate results
      finishQuiz();
    }
  };

  const finishQuiz = () => {
    if (!quizStartTime || questions.length === 0) return;
    
    // Calculate time taken
    const endTime = new Date();
    const timeTakenMs = endTime.getTime() - quizStartTime.getTime();
    const timeTakenSeconds = Math.floor(timeTakenMs / 1000);
    
    // Calculate score and count correct/incorrect answers
    let correctCount = 0;
    const incorrectQuestions: Question[] = [];
    
    userAnswers.forEach((userAnswer, index) => {
      if (index < questions.length) {
        if (userAnswer === questions[index].answer) {
          correctCount++;
        } else {
          incorrectQuestions.push(questions[index]);
        }
      }
    });
    
    const score = Math.round((correctCount / questions.length) * 100);
    
    // Identify weak areas based on incorrect answers
    // This is a simple implementation - in a full version, you'd analyze the questions more deeply
    const weakAreas = incorrectQuestions.map(q => {
      // Extract key concepts from the question - this is a placeholder
      // In a real implementation, you might use NLP or predefined tags
      const words = q.question.toLowerCase().split(' ');
      const keyTerms = words.filter(word => word.length > 5);
      return keyTerms.length > 0 ? keyTerms[0] : 'general';
    });
    
    const results: QuizResults = {
      score,
      correctCount,
      incorrectCount: questions.length - correctCount,
      timeTaken: timeTakenSeconds,
      weakAreas: [...new Set(weakAreas)] // Remove duplicates
    };
    
    setQuizResults(results);
    
    // Update the app context with the quiz results
    if (topicId) {
      dispatch({ 
        type: 'UPDATE_TOPIC_SCORE', 
        payload: { topicId, score } 
      });
      
      // If score is high enough, mark topic as completed
      if (score >= 80) {
        dispatch({
          type: 'COMPLETE_TOPIC',
          payload: topicId
        });
      }
    }
  };

  const handleRetakeQuiz = () => {
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setIsAnswerSubmitted(false);
    setUserAnswers([]);
    setQuizResults(null);
    setQuizStartTime(null);
    setIsLoading(true);
    
    // Re-fetch questions
    const generateQuestions = async () => {
      try {
        const prompt = `Generate 5 MCQs on the topic of ${topic} for the DCIO/Tech exam, focusing on areas the user previously struggled with. Each question should have 4 options and include an explanation. Output as JSON array with question, options (array), answer (index), and explanation fields.`;
        const generatedContent = await openaiService.generateText(prompt);
        
        try {
          const jsonMatch = generatedContent.match(/\[[\s\S]*\]/);
          const jsonString = jsonMatch ? jsonMatch[0] : generatedContent;
          
          const parsedQuestions = JSON.parse(jsonString) as Question[];
          setQuestions(parsedQuestions);
          setQuizStartTime(new Date());
        } catch (parseError) {
          console.error("Failed to parse questions JSON:", parseError);
          setError("Failed to parse quiz questions. Please try again.");
        }
      } catch (error) {
        console.error("Failed to generate questions:", error);
        setError("Failed to generate quiz questions. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    generateQuestions();
  };

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
        <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mb-4" />
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Generating Quiz</h2>
        <p className="text-gray-600">ExamMaster AI is preparing questions tailored to your learning profile...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 bg-red-50 rounded-xl">
        <AlertTriangle className="h-12 w-12 text-red-600 mb-4" />
        <h2 className="text-xl font-semibold text-red-800 mb-2">Error</h2>
        <p className="text-red-700 mb-4">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Results screen
  if (quizResults) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-4xl mx-auto p-6 bg-white rounded-xl shadow-lg"
      >
        <div className="text-center mb-8">
          <Award className="h-16 w-16 text-indigo-600 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Quiz Completed!</h2>
          <p className="text-gray-600">ExamMaster AI has analyzed your performance</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-indigo-50 p-4 rounded-lg text-center">
            <BarChart2 className="h-8 w-8 text-indigo-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-indigo-700">{quizResults.score}%</div>
            <div className="text-sm text-indigo-600">Score</div>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg text-center">
            <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-green-700">{quizResults.correctCount}</div>
            <div className="text-sm text-green-600">Correct</div>
          </div>
          
          <div className="bg-red-50 p-4 rounded-lg text-center">
            <XCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-red-700">{quizResults.incorrectCount}</div>
            <div className="text-sm text-red-600">Incorrect</div>
          </div>
          
          <div className="bg-blue-50 p-4 rounded-lg text-center">
            <Clock className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-blue-700">
              {Math.floor(quizResults.timeTaken / 60)}:{(quizResults.timeTaken % 60).toString().padStart(2, '0')}
            </div>
            <div className="text-sm text-blue-600">Time Taken</div>
          </div>
        </div>

        {quizResults.weakAreas.length > 0 && (
          <div className="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="text-lg font-semibold text-yellow-800 mb-2 flex items-center">
              <Brain className="h-5 w-5 mr-2 text-yellow-600" />
              ExamMaster AI's Assessment
            </h3>
            <p className="text-yellow-700 mb-2">
              Based on your answers, you might benefit from reviewing these areas:
            </p>
            <ul className="list-disc pl-5 text-yellow-700">
              {quizResults.weakAreas.map((area, index) => (
                <li key={index} className="capitalize">{area}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={handleRetakeQuiz}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center"
          >
            <Brain className="h-5 w-5 mr-2" />
            Retake Quiz
          </button>
          
          <button
            onClick={handleBackToDashboard}
            className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors flex items-center justify-center"
          >
            Back to Dashboard
          </button>
        </div>
      </motion.div>
    );
  }

  // Quiz in progress
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-4xl mx-auto p-6 bg-white rounded-xl shadow-lg"
    >
      {/* Quiz header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Quiz: {topic}</h2>
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Question {currentQuestionIndex + 1} of {questions.length}
          </div>
          <div className="w-1/2 bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-indigo-600 h-2.5 rounded-full" 
              style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Current question */}
      {questions.length > 0 && currentQuestionIndex < questions.length && (
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">
            {questions[currentQuestionIndex].question}
          </h3>
          
          <div className="space-y-3 mb-6">
            {questions[currentQuestionIndex].options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleOptionSelect(index)}
                className={`w-full text-left p-4 rounded-lg border transition-colors ${
                  selectedOption === index 
                    ? isAnswerSubmitted
                      ? index === questions[currentQuestionIndex].answer
                        ? 'bg-green-100 border-green-300 text-green-800' // Correct answer
                        : 'bg-red-100 border-red-300 text-red-800' // Incorrect answer
                      : 'bg-indigo-100 border-indigo-300 text-indigo-800' // Selected but not submitted
                    : isAnswerSubmitted && index === questions[currentQuestionIndex].answer
                      ? 'bg-green-100 border-green-300 text-green-800' // Show correct answer after submission
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100 text-gray-800' // Unselected
                }`}
                disabled={isAnswerSubmitted}
              >
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-6">
                    {String.fromCharCode(65 + index)}.
                  </div>
                  <div>{option}</div>
                </div>
              </button>
            ))}
          </div>
          
          {/* Explanation (shown after answering) */}
          {isAnswerSubmitted && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-lg mb-6 ${
                selectedOption === questions[currentQuestionIndex].answer
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
              }`}
            >
              <h4 className={`font-semibold flex items-center ${
                selectedOption === questions[currentQuestionIndex].answer
                  ? 'text-green-800'
                  : 'text-red-800'
              }`}>
                {selectedOption === questions[currentQuestionIndex].answer ? (
                  <>
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Correct!
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 mr-2" />
                    Incorrect
                  </>
                )}
              </h4>
              <div className="mt-2">
                <p className="text-gray-700">
                  <span className="font-medium">ExamMaster AI Notes:</span> {questions[currentQuestionIndex].explanation}
                </p>
              </div>
            </motion.div>
          )}
          
          {/* Confidence rating (shown after answering) */}
          {isAnswerSubmitted && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-6"
            >
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Help your AI Agent understand your confidence with this topic:
              </label>
              <div className="flex space-x-2">
                {[1, 2, 3, 4, 5].map((level) => (
                  <button
                    key={level}
                    onClick={() => setUserConfidence(level)}
                    className={`flex-1 py-2 rounded-md transition-colors ${
                      userConfidence === level
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {level === 1 ? 'Very Low' : 
                     level === 2 ? 'Low' : 
                     level === 3 ? 'Medium' : 
                     level === 4 ? 'High' : 'Very High'}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
          
          {/* Action buttons */}
          <div className="flex justify-center">
            {!isAnswerSubmitted ? (
              <button
                onClick={handleSubmitAnswer}
                disabled={selectedOption === null}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Submit Answer
              </button>
            ) : (
              <button
                onClick={handleNextQuestion}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'Finish Quiz'}
              </button>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default QuizManager;
