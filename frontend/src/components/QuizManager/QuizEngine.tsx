import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Clock, ArrowRight, Loader2 } from 'lucide-react';
import { Question } from '../../types/index';

interface QuizEngineProps {
  questions: Question[];
  onComplete: (results: QuizResult) => void;
  isLoading?: boolean;
  showFeedbackImmediately?: boolean;
  timeLimit?: number; // in seconds, optional
}

export interface QuizResult {
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
}

const QuizEngine: React.FC<QuizEngineProps> = ({
  questions,
  onComplete,
  isLoading = false,
  showFeedbackImmediately = false,
  timeLimit
}) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<number[]>(Array(questions.length).fill(-1));
  const [questionStartTimes, setQuestionStartTimes] = useState<number[]>(Array(questions.length).fill(0));
  const [questionTimeTaken, setQuestionTimeTaken] = useState<number[]>(Array(questions.length).fill(0));
  const [showExplanation, setShowExplanation] = useState(false);
  const [quizStartTime, setQuizStartTime] = useState(0);
  const [remainingTime, setRemainingTime] = useState(timeLimit || 0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentQuestion = questions[currentQuestionIndex];
  const hasSelectedOption = selectedOptions[currentQuestionIndex] !== -1;
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  // Initialize the quiz
  useEffect(() => {
    if (questions.length > 0 && !isLoading) {
      const now = Date.now();
      setQuizStartTime(now);
      setQuestionStartTimes(prev => {
        const newTimes = [...prev];
        newTimes[0] = now;
        return newTimes;
      });
    }
  }, [questions, isLoading]);

  // Handle time limit if provided
  useEffect(() => {
    if (!timeLimit || isLoading) return;

    const timer = setInterval(() => {
      setRemainingTime(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitQuiz();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLimit, isLoading]);

  const handleOptionSelect = (optionIndex: number) => {
    if (showExplanation && !showFeedbackImmediately) return; // Prevent changing after viewing explanation

    const now = Date.now();
    const timeTaken = now - questionStartTimes[currentQuestionIndex];

    setSelectedOptions(prev => {
      const newSelections = [...prev];
      newSelections[currentQuestionIndex] = optionIndex;
      return newSelections;
    });

    setQuestionTimeTaken(prev => {
      const newTimes = [...prev];
      newTimes[currentQuestionIndex] = timeTaken;
      return newTimes;
    });

    if (showFeedbackImmediately) {
      setShowExplanation(true);
    }
  };

  const handleNextQuestion = () => {
    setShowExplanation(false);
    
    if (isLastQuestion) {
      handleSubmitQuiz();
      return;
    }

    setCurrentQuestionIndex(prev => prev + 1);
    
    // Set start time for the next question
    const now = Date.now();
    setQuestionStartTimes(prev => {
      const newTimes = [...prev];
      newTimes[currentQuestionIndex + 1] = now;
      return newTimes;
    });
  };

  const handleSubmitQuiz = () => {
    setIsSubmitting(true);
    
    const totalTimeSpent = Date.now() - quizStartTime;
    
    const results: QuizResult = {
      score: 0, // Will be calculated below
      totalQuestions: questions.length,
      correctAnswers: 0,
      timeSpent: totalTimeSpent,
      answers: []
    };

    // Process each question's result
    questions.forEach((question, index) => {
      const selectedOption = selectedOptions[index];
      const isCorrect = selectedOption === question.correctOptionIndex;
      
      if (isCorrect) {
        results.correctAnswers += 1;
      }

      results.answers.push({
        questionId: question.id,
        selectedOptionIndex: selectedOption === -1 ? 0 : selectedOption, // Default to first option if not answered
        isCorrect,
        timeSpent: questionTimeTaken[index] || 0
      });
    });

    // Calculate final score (percentage)
    results.score = Math.round((results.correctAnswers / results.totalQuestions) * 100);

    // Call the onComplete callback with the results
    onComplete(results);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-white rounded-lg shadow-md">
        <Loader2 className="h-12 w-12 text-indigo-600 animate-spin mb-4" />
        <p className="text-lg text-gray-700">Loading questions...</p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="p-8 bg-white rounded-lg shadow-md">
        <p className="text-lg text-gray-700 text-center">No questions available.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Quiz Header */}
      <div className="bg-indigo-600 p-4 text-white flex justify-between items-center">
        <div>
          <h3 className="font-medium">Question {currentQuestionIndex + 1} of {questions.length}</h3>
          <p className="text-sm text-indigo-200">
            {currentQuestion.difficulty.charAt(0).toUpperCase() + currentQuestion.difficulty.slice(1)} difficulty
          </p>
        </div>
        {timeLimit && (
          <div className="flex items-center">
            <Clock className="h-5 w-5 mr-2" />
            <span className={`font-mono ${remainingTime < 30 ? 'text-red-300' : ''}`}>
              {Math.floor(remainingTime / 60)}:{(remainingTime % 60).toString().padStart(2, '0')}
            </span>
          </div>
        )}
      </div>

      {/* Question */}
      <div className="p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-6">{currentQuestion.text}</h2>

        {/* Options */}
        <div className="space-y-3 mb-6">
          {currentQuestion.options.map((option: string, index: number) => {
            const isSelected = selectedOptions[currentQuestionIndex] === index;
            const isCorrect = index === currentQuestion.correctOptionIndex;
            const showResult = showExplanation && showFeedbackImmediately;
            
            let optionClass = "p-4 border rounded-lg transition-all";
            
            if (isSelected) {
              optionClass += " border-indigo-600 bg-indigo-50";
              
              if (showResult) {
                optionClass = isCorrect 
                  ? "p-4 border border-green-600 bg-green-50 rounded-lg" 
                  : "p-4 border border-red-600 bg-red-50 rounded-lg";
              }
            } else if (showResult && isCorrect) {
              optionClass += " border-green-600 bg-green-50";
            } else {
              optionClass += " border-gray-300 hover:border-indigo-400 hover:bg-indigo-50";
            }

            return (
              <motion.div
                key={index}
                whileTap={{ scale: 0.98 }}
                className={optionClass}
                onClick={() => handleOptionSelect(index)}
              >
                <div className="flex items-start">
                  <div className={`flex-shrink-0 h-6 w-6 rounded-full border flex items-center justify-center mr-3 ${
                    isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-gray-400'
                  }`}>
                    {String.fromCharCode(65 + index)}
                  </div>
                  <div className="flex-grow">
                    <p className="text-gray-800">{option}</p>
                  </div>
                  {showResult && (
                    <div className="flex-shrink-0 ml-2">
                      {isCorrect ? (
                        <CheckCircle className="h-6 w-6 text-green-600" />
                      ) : (
                        isSelected && <XCircle className="h-6 w-6 text-red-600" />
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Explanation (shown after selection if immediate feedback is enabled) */}
        {showExplanation && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6"
          >
            <h4 className="font-semibold text-blue-800 mb-2">Explanation</h4>
            <p className="text-blue-900">{currentQuestion.explanation}</p>
          </motion.div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8">
          <div></div> {/* Spacer for flex alignment */}
          <button
            onClick={handleNextQuestion}
            disabled={!hasSelectedOption || isSubmitting}
            className={`flex items-center px-6 py-2 rounded-md font-medium transition-colors ${
              hasSelectedOption && !isSubmitting
                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin h-5 w-5 mr-2" />
                Submitting...
              </>
            ) : isLastQuestion ? (
              <>
                Finish
                <ArrowRight className="h-5 w-5 ml-2" />
              </>
            ) : (
              <>
                Next
                <ArrowRight className="h-5 w-5 ml-2" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuizEngine;
