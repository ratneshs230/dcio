import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Zap, BarChart2, CheckCircle, Loader2, AlertCircle, ArrowLeft, ArrowRight } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import type { Question, LearningStyle, SelfRating, SyllabusTopic, User } from '../../types/index';
import QuizEngine from '../QuizManager/QuizEngine';
import type { QuizResult } from '../QuizManager/QuizEngine';
import { diagnosticService } from '../../services/diagnosticService';

export default function LearningStyleDiagnostic() {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();

  const [learningStyle, setLearningStyle] = useState<LearningStyle>((state.user?.learningStyle as LearningStyle) || 'mixed');
  const [selfRating, setSelfRating] = useState<SelfRating | undefined>(undefined);
  const [weakTopics, setWeakTopics] = useState<string[]>([]);
  const [strongTopics, setStrongTopics] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Diagnostic quiz state
  const [currentStep, setCurrentStep] = useState<'preferences' | 'quiz' | 'results'>('preferences');
  const [diagnosticQuestions, setDiagnosticQuestions] = useState<Question[]>([]);
  const [quizResults, setQuizResults] = useState<QuizResult | null>(null);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<{
    topicScores: Record<string, number>;
    strengths: string[];
    weaknesses: string[];
    overallScore: number;
  } | null>(null);

  // Get syllabus topics from settings
  const syllabusTopics = state.settings.syllabusTopics || [];

  const handleWeakTopicChange = (topicId: string, isChecked: boolean) => {
    setWeakTopics(prev =>
      isChecked ? [...prev, topicId] : prev.filter(id => id !== topicId)
    );
  };

  const handleStrongTopicChange = (topicId: string, isChecked: boolean) => {
    setStrongTopics(prev =>
      isChecked ? [...prev, topicId] : prev.filter(id => id !== topicId)
    );
  };

  // Load diagnostic questions
  useEffect(() => {
    if (currentStep === 'quiz' && diagnosticQuestions.length === 0 && !isLoadingQuestions) {
      loadDiagnosticQuestions();
    }
  }, [currentStep, diagnosticQuestions.length, isLoadingQuestions]);

  const loadDiagnosticQuestions = async () => {
    setIsLoadingQuestions(true);
    setError(null);
    
    try {
      // Generate questions based on selected weak/strong topics
      const selectedTopics = [...new Set([...weakTopics, ...strongTopics])];
      const allSyllabusTopicIds = syllabusTopics.map(topic => topic.id);

      const questions = await diagnosticService.generateQuestions(
        {
          questionCount: 10,
          topicSelection: selectedTopics.length > 0 ? selectedTopics : 'random',
          timeLimit: 600 // 10 minutes
        },
        allSyllabusTopicIds // Pass all syllabus topic IDs for local fallback
      );
      
      setDiagnosticQuestions(questions);
    } catch (err) {
      console.error("Error loading diagnostic questions:", err);
      setError("Failed to load diagnostic questions. Please try again.");
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  const handleStartQuiz = () => {
    if (!learningStyle || !selfRating) {
      setError("Please select your learning style and self-rating.");
      return;
    }
    
    setError(null);
    setCurrentStep('quiz');
  };

  const handleQuizComplete = async (results: QuizResult) => {
    setQuizResults(results);
    setIsLoading(true);
    
    try {
      // Analyze the results
      const analysis = await diagnosticService.analyzeResults(
        diagnosticQuestions,
        results.answers,
        learningStyle,
        selfRating,
        weakTopics,
        strongTopics
      );
      
      setAnalysisResults(analysis);
      
      // Update weak/strong topics based on quiz results
      setWeakTopics(prev => [...new Set([...prev, ...analysis.weaknesses])]);
      setStrongTopics(prev => [...new Set([...prev, ...analysis.strengths])]);
      
      setCurrentStep('results');
    } catch (err) {
      console.error("Error analyzing diagnostic results:", err);
      setError("Failed to analyze diagnostic results. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartPrep = async () => {
    if (!learningStyle || !selfRating) {
      setError("Please select your learning style and self-rating.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Save all the collected data
      // For now, we'll just update the user's learning style in the state
      // In a real implementation, we would save all the diagnostic data to the backend
      dispatch({
        type: 'SET_USER',
        payload: {
          id: state.user?.id || 'default_user_id',
          name: state.user?.name || 'User',
          email: state.user?.email || 'user@example.com',
          learningStyle: learningStyle,
          onboardingCompleted: true,
          createdAt: state.user?.createdAt || new Date().toISOString(),
          selfRating,
          weakTopics,
          strongTopics,
          diagnosticResults: analysisResults || undefined
        },
      });
      
      // Update settings to store the diagnostic results
      dispatch({
        type: 'UPDATE_SETTINGS',
        payload: {
          userPreferences: {
            selfRating,
            weakTopics,
            strongTopics,
            diagnosticResults: analysisResults || undefined // Pass undefined instead of null
          }
        }
      });

      navigate('/dashboard');
    } catch (err) {
      console.error("Error completing onboarding step 2:", err);
      setError("Failed to complete setup. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Group topics by subject area for easier selection
  const topicsBySubject = (syllabusTopics || []).reduce((acc: Record<string, SyllabusTopic[]>, topic: SyllabusTopic) => {
    acc[topic.subjectArea] = acc[topic.subjectArea] || [];
    acc[topic.subjectArea].push(topic);
    return acc;
  }, {} as Record<SyllabusTopic['subjectArea'], SyllabusTopic[]>);

  // Ensure we have an array to map over even if topicsBySubject is empty
  const subjectEntries = Object.entries(topicsBySubject).length > 0 
    ? Object.entries(topicsBySubject) 
    : [] as [string, SyllabusTopic[]][];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-600 to-purple-600 p-4">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 md:p-12 rounded-xl shadow-2xl w-full max-w-2xl"
      >
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">Personalize Your Prep</h1>
        <p className="text-center text-gray-600 mb-8">Help us tailor your learning experience.</p>

        <div className="space-y-8">
          {/* Learning Style */}
          <div>
            <label className="block text-lg font-medium text-gray-700 mb-3 flex items-center"><BookOpen className="h-5 w-5 mr-2 text-indigo-600"/> Preferred Learning Style</label>
            <div className="mt-1 grid grid-cols-2 gap-4">
              {['visual', 'audio', 'text', 'mixed'].map(style => (
                <button
                  key={style}
                  type="button"
                  onClick={() => setLearningStyle(style as LearningStyle)}
                  className={`px-4 py-3 rounded-lg border transition-colors ${
                    learningStyle === style
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                      : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                  }`}
                >
                  {style.charAt(0).toUpperCase() + style.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Self-Rating */}
          <div>
            <label className="block text-lg font-medium text-gray-700 mb-3 flex items-center"><BarChart2 className="h-5 w-5 mr-2 text-indigo-600"/> Self-Rating</label>
            <div className="mt-1 grid grid-cols-3 gap-4">
              {['quick learner', 'deep learner', 'needs more revision'].map(rating => (
                <button
                  key={rating}
                  type="button"
                  onClick={() => setSelfRating(rating as SelfRating)}
                  className={`px-4 py-3 rounded-lg border text-sm transition-colors ${
                    selfRating === rating
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                      : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                  }`}
                >
                  {rating.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Weakest/Strongest Subjects */}
          <div>
            <label className="block text-lg font-medium text-gray-700 mb-3 flex items-center"><AlertCircle className="h-5 w-5 mr-2 text-indigo-600"/> Weakest / Strongest Topics</label>
            <p className="text-sm text-gray-600 mb-4">Select topics you feel weakest/strongest in (optional).</p>
            
            <div className="space-y-4 max-h-60 overflow-y-auto p-4 border rounded-md bg-gray-50">
              {subjectEntries.map(([subjectArea, topics]) => (
                <div key={subjectArea}>
                  <h4 className="text-md font-semibold text-gray-800 mb-2">{subjectArea}</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(Array.isArray(topics) ? topics : []).map((topic: SyllabusTopic) => (
                      <div key={topic.id} className="flex items-center justify-between bg-white p-3 rounded-md shadow-sm">
                        <span className="text-sm text-gray-700">{topic.name}</span>
                        <div className="flex items-center space-x-4">
                          <label className="flex items-center text-sm text-red-600">
                            <input
                              type="checkbox"
                              checked={weakTopics.includes(topic.id)}
                              onChange={(e) => handleWeakTopicChange(topic.id, e.target.checked)}
                              className="h-4 w-4 text-red-600 border-gray-300 rounded mr-1"
                            />
                            Weak
                          </label>
                          <label className="flex items-center text-emerald-600">
                            <input
                              type="checkbox"
                              checked={strongTopics.includes(topic.id)}
                              onChange={(e) => handleStrongTopicChange(topic.id, e.target.checked)}
                              className="h-4 w-4 text-emerald-600 border-gray-300 rounded mr-1"
                            />
                            Strong
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Diagnostic Quiz Section */}
          <div className="p-6 bg-blue-50 rounded-lg text-center">
            <Zap className="h-8 w-8 text-blue-600 mx-auto mb-3"/>
            <h3 className="text-xl font-semibold text-blue-800 mb-2">Diagnostic Quiz</h3>
            <p className="text-blue-700 mb-4">A quick quiz will help us assess your current knowledge level for better personalization.</p>
            <button
              onClick={handleStartQuiz}
              disabled={isLoading || !learningStyle || !selfRating}
              className="flex justify-center items-center py-2 px-4 mx-auto border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              Take Diagnostic Quiz
              <ArrowRight className="h-4 w-4 ml-2" />
            </button>
          </div>

          {error && <div className="flex items-center text-sm text-red-600 bg-red-50 p-3 rounded-md"><AlertCircle className="h-5 w-5 mr-2" /> {error}</div>}

          <button
            onClick={handleStartPrep}
            disabled={isLoading || !learningStyle || !selfRating} // Disable if loading or required fields are empty
            className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : <CheckCircle className="h-5 w-5 mr-2" />}
            Skip Quiz & Start My Prep
          </button>
        </div>
      </motion.div>

      {/* Quiz Step */}
      {currentStep === 'quiz' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 md:p-12 rounded-xl shadow-2xl w-full max-w-3xl"
        >
          <div className="flex justify-between items-center mb-6">
            <button
              onClick={() => setCurrentStep('preferences')}
              className="flex items-center text-indigo-600 hover:text-indigo-800"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Preferences
            </button>
            <h2 className="text-2xl font-bold text-gray-800">Diagnostic Assessment</h2>
            <div className="w-24"></div> {/* Spacer for alignment */}
          </div>

          <p className="text-gray-600 mb-6 text-center">
            This quick assessment will help us understand your current knowledge level and tailor your learning experience.
          </p>

          <QuizEngine
            questions={diagnosticQuestions}
            onComplete={handleQuizComplete}
            isLoading={isLoadingQuestions}
            showFeedbackImmediately={true}
            timeLimit={600}
          />

          {error && (
            <div className="mt-4 flex items-center text-sm text-red-600 bg-red-50 p-3 rounded-md">
              <AlertCircle className="h-5 w-5 mr-2" /> {error}
            </div>
          )}
        </motion.div>
      )}

      {/* Results Step */}
      {currentStep === 'results' && analysisResults && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 md:p-12 rounded-xl shadow-2xl w-full max-w-3xl"
        >
          <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">Diagnostic Results</h2>
          <p className="text-center text-gray-600 mb-6">Based on your assessment, we've identified your strengths and areas for improvement.</p>

          <div className="mb-6 p-4 bg-indigo-50 rounded-lg">
            <h3 className="text-lg font-semibold text-indigo-800 mb-2">Overall Score</h3>
            <div className="flex items-center justify-center">
              <div className="w-24 h-24 rounded-full bg-white border-4 border-indigo-500 flex items-center justify-center">
                <span className="text-2xl font-bold text-indigo-700">{analysisResults.overallScore}%</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-green-50 rounded-lg">
              <h3 className="text-lg font-semibold text-green-800 mb-2">Strengths</h3>
              {analysisResults.strengths.length > 0 ? (
                <ul className="list-disc list-inside text-green-700">
                  {analysisResults.strengths.map(topic => (
                    <li key={topic}>{topic.replace('_', ' ')}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-green-700">No clear strengths identified yet.</p>
              )}
            </div>
            <div className="p-4 bg-red-50 rounded-lg">
              <h3 className="text-lg font-semibold text-red-800 mb-2">Areas to Improve</h3>
              {analysisResults.weaknesses.length > 0 ? (
                <ul className="list-disc list-inside text-red-700">
                  {analysisResults.weaknesses.map(topic => (
                    <li key={topic}>{topic.replace('_', ' ')}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-red-700">No clear weaknesses identified yet.</p>
              )}
            </div>
          </div>

          <div className="p-4 bg-blue-50 rounded-lg mb-6">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">Topic Scores</h3>
            <div className="space-y-3">
              {Object.entries(analysisResults.topicScores).map(([topic, score]) => (
                <div key={topic}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700">{topic.replace('_', ' ')}</span>
                    <span className="text-gray-600">{score}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className={`h-2.5 rounded-full ${
                        score >= 70 ? 'bg-green-600' : score >= 40 ? 'bg-yellow-500' : 'bg-red-600'
                      }`}
                      style={{ width: `${score}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleStartPrep}
            disabled={isLoading}
            className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : <CheckCircle className="h-5 w-5 mr-2" />}
            Start My Personalized Prep
          </button>
        </motion.div>
      )}
    </div>
  );
}
