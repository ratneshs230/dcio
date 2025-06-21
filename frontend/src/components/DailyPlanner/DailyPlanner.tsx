import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, ChevronDown, ChevronUp, BookOpen, 
  CheckCircle, Clock, Brain, AlertTriangle, 
  Loader2, Zap, FileText, ArrowRight
} from 'lucide-react';
import { openaiService } from '../../services/openaiService';
import { firestoreService, StudyPlan } from '../../services/firestoreService';
import { useApp } from '../../contexts/AppContext';

interface DailyPlan {
  topic: string;
  description: string;
  objectives: string[];
  category: 'electronics' | 'communications' | 'computer-science' | 'cyber-security';
  estimatedTime: number;
  difficulty: 'easy' | 'medium' | 'hard';
  completed?: boolean;
}

interface WeeklyPlan {
  week: number;
  theme: string;
  days: DailyPlan[];
}

const DailyPlanner: React.FC = () => {
  const { state } = useApp();
  const navigate = useNavigate();
  
  const weeks = Array.from({ length: 8 }, (_, i) => i + 1);
  const days = Array.from({ length: 7 }, (_, i) => i + 1);
  
  const [weeklyPlans, setWeeklyPlans] = useState<WeeklyPlan[]>([]);
  const [expandedWeeks, setExpandedWeeks] = useState<number[]>([1]); // First week expanded by default
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<{week: number, day: number} | null>(null);
  const [completedDays, setCompletedDays] = useState<{week: number, day: number}[]>([]);

  useEffect(() => {
    const loadOrGenerateWeeklyPlans = async () => {
      // Check if user exists and has an ID
      if (!state.user || !('id' in state.user)) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        // Check if the user already has a study plan in Firestore
        const existingPlan = await firestoreService.getUserStudyPlan(state.user.id as string);
        
        if (existingPlan) {
          // If a plan exists, use it
          setWeeklyPlans(existingPlan.weeks);
          
          // Set completed days based on the existing plan
          const completed: {week: number, day: number}[] = [];
          existingPlan.weeks.forEach((week) => {
            week.days.forEach((day, dayIndex) => {
              if (day.completed) {
                completed.push({ week: week.week, day: dayIndex + 1 });
              }
            });
          });
          setCompletedDays(completed);
          setIsLoading(false);
          return;
        }
        
        // If no plan exists, generate a new one
        const plans: WeeklyPlan[] = [];
        
        // Generate weekly themes first
        const themesPrompt = `
        Task: Generate 8 weekly themes for a DCIO/Tech exam preparation course.
        
        Specific Requirements:
        1. Each theme should focus on a major area of the DCIO/Tech exam syllabus.
        2. Themes should progress logically from foundational to advanced topics.
        3. Return the themes as a JSON array of objects, where each object has:
           - "week" (number, 1-8)
           - "theme" (string, descriptive title for the week's focus)
        
        Example format:
        [
          {"week": 1, "theme": "Fundamentals of Digital Electronics"},
          {"week": 2, "theme": "Communication Protocols and Standards"}
        ]
        `;
        
        const themesResponse = await openaiService.generateText(themesPrompt);
        let weeklyThemes: {week: number, theme: string}[] = [];
        
        try {
          weeklyThemes = JSON.parse(themesResponse);
        } catch (error) {
          console.error("Failed to parse weekly themes JSON:", error);
          throw new Error("Failed to generate weekly themes");
        }
        
        // Now generate daily topics for each week
        for (const weekTheme of weeklyThemes) {
          const weekNumber = weekTheme.week;
          
          const prompt = `
          Task: Generate a detailed study plan for Week ${weekNumber}: "${weekTheme.theme}" of the DCIO/Tech exam preparation.
          
          Specific Requirements:
          1. Create 7 daily topics that fit within the weekly theme of "${weekTheme.theme}".
          2. For each day, include:
             - "topic" (string): Specific topic name
             - "description" (string): 1-2 sentence description of what will be covered
             - "objectives" (array of strings): 2-4 specific learning objectives
             - "category" (string): One of "electronics", "communications", "computer-science", or "cyber-security"
             - "estimatedTime" (number): Estimated study time in minutes (between 30-120)
             - "difficulty" (string): One of "easy", "medium", or "hard"
          3. Ensure topics progress logically through the week.
          4. Return as a valid JSON array.
          
          Example format:
          [
            {
              "topic": "Introduction to Semiconductors",
              "description": "Fundamentals of semiconductor materials and their properties.",
              "objectives": ["Understand p-n junctions", "Identify semiconductor types", "Explain doping process"],
              "category": "electronics",
              "estimatedTime": 60,
              "difficulty": "medium"
            }
          ]
          `;
          
          try {
            const generatedPlan = await openaiService.generateText(prompt);
            let dailyTopics: DailyPlan[] = [];
            
            try {
              dailyTopics = JSON.parse(generatedPlan);
              
              // Validate and fix any issues with the parsed data
              dailyTopics = dailyTopics.map(day => ({
                ...day,
                objectives: Array.isArray(day.objectives) ? day.objectives : [day.objectives || "Complete the lesson"],
                category: ['electronics', 'communications', 'computer-science', 'cyber-security'].includes(day.category) 
                  ? day.category as any 
                  : 'electronics',
                difficulty: ['easy', 'medium', 'hard'].includes(day.difficulty) 
                  ? day.difficulty as any 
                  : 'medium',
                estimatedTime: typeof day.estimatedTime === 'number' ? day.estimatedTime : 60
              }));
              
            } catch (error) {
              console.error(`Failed to parse JSON for week ${weekNumber}:`, error);
              throw new Error(`Failed to generate plan for week ${weekNumber}`);
            }
            
            plans.push({
              week: weekNumber,
              theme: weekTheme.theme,
              days: dailyTopics
            });
            
          } catch (error) {
            console.error(`Failed to generate plan for week ${weekNumber}:`, error);
            throw new Error(`Failed to generate plan for week ${weekNumber}`);
          }
        }
        
        // Sort plans by week number
        plans.sort((a, b) => a.week - b.week);
        setWeeklyPlans(plans);
        
        // Save the generated plan to Firestore
        if (state.user && 'id' in state.user) {
          try {
            // Convert the weekly plans to the StudyPlan format
            const studyPlan: Omit<StudyPlan, 'id' | 'userId' | 'createdAt' | 'lastUpdated'> = {
              weeks: plans.map(weekPlan => ({
                ...weekPlan,
                days: weekPlan.days.map((day, index) => ({
                  ...day,
                  day: index + 1,
                  completed: false
                }))
              }))
            };
            
            await firestoreService.saveStudyPlan(state.user.id as string, studyPlan);
          } catch (saveError) {
            console.error('Error saving study plan to Firestore:', saveError);
            // Don't throw here, as we still want to display the generated plan
          }
        }
        
      } catch (error) {
        console.error("Error generating study plan:", error);
        setError("Failed to generate study plan. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    // Check if the user is logged in and has completed onboarding
    if (state.user?.onboardingCompleted) {
      loadOrGenerateWeeklyPlans();
    }
  }, [state.user?.onboardingCompleted]);

  const toggleWeek = (week: number) => {
    if (expandedWeeks.includes(week)) {
      setExpandedWeeks(expandedWeeks.filter((w) => w !== week));
    } else {
      setExpandedWeeks([...expandedWeeks, week]);
    }
  };
  
  const handleDayClick = (week: number, day: number) => {
    setSelectedDay({week, day});
  };
  
  const markDayAsCompleted = async (week: number, day: number) => {
    // Check if user exists and has an ID
    if (!state.user || !('id' in state.user)) return;
    
    setCompletedDays(prev => [...prev, {week, day}]);
    setSelectedDay(null);
    
    // Update the completion status in Firestore
    try {
      // Find the week index in the array
      const weekIndex = weeklyPlans.findIndex(w => w.week === week);
      if (weekIndex !== -1) {
        // Update in Firestore
        await firestoreService.updateStudyPlanDay(state.user.id as string, weekIndex, day - 1, true);
        
        // Update local state
        const updatedPlans = [...weeklyPlans];
        if (updatedPlans[weekIndex]?.days[day - 1]) {
          updatedPlans[weekIndex].days[day - 1].completed = true;
          setWeeklyPlans(updatedPlans);
        }
      }
    } catch (error) {
      console.error('Error updating study plan day:', error);
      setError('Failed to mark day as completed. Please try again.');
    }
  };
  
  const isDayCompleted = (week: number, day: number) => {
    return completedDays.some(item => item.week === week && item.day === day);
  };
  
  const getProgressPercentage = () => {
    const totalDays = weeks.length * days.length;
    return (completedDays.length / totalDays) * 100;
  };
  
  const getCurrentWeekDay = () => {
    // In a real implementation, this would be based on the user's exam date
    // and calculate which week/day they should be on
    return {
      week: 1,
      day: 1
    };
  };
  
  const currentPosition = getCurrentWeekDay();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
        <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mb-4" />
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Generating Your Study Plan</h2>
        <p className="text-gray-600">ExamMaster AI is creating a personalized 8-week study plan...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center bg-red-50 rounded-xl shadow-lg max-w-4xl mx-auto">
        <AlertTriangle className="h-12 w-12 text-red-600 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-red-800 mb-2">Error Creating Study Plan</h2>
        <p className="text-red-700 mb-6">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
        <Calendar className="h-8 w-8 mr-3 text-indigo-600"/>
        AI-Powered Daily Learning Planner
      </h1>
      
      <p className="text-gray-600 mb-6">
        ExamMaster AI has created a personalized 8-week study plan to help you prepare for your DCIO/Tech exam.
      </p>
      
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">Your Progress</span>
          <span className="text-sm font-medium text-indigo-600">{Math.round(getProgressPercentage())}% Complete</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div 
            className="bg-indigo-600 h-2.5 rounded-full" 
            style={{ width: `${getProgressPercentage()}%` }}
          ></div>
        </div>
      </div>
      
      {/* Current Position Indicator */}
      <div className="mb-8 p-4 bg-indigo-50 border border-indigo-100 rounded-lg flex items-start">
        <Brain className="h-5 w-5 mr-3 text-indigo-600 mt-0.5" />
        <div>
          <h3 className="font-medium text-indigo-800 mb-1">ExamMaster AI Recommendation</h3>
          <p className="text-indigo-700">
            You should be on <span className="font-semibold">Week {currentPosition.week}, Day {currentPosition.day}</span> of your study plan. 
            {weeklyPlans.length > 0 && currentPosition.week <= weeklyPlans.length && (
              <>
                {' '}Today's topic: <span className="font-semibold">
                  {weeklyPlans[currentPosition.week - 1]?.days[currentPosition.day - 1]?.topic || "Loading..."}
                </span>
              </>
            )}
          </p>
          {weeklyPlans.length > 0 && currentPosition.week <= weeklyPlans.length && (
            <button 
              className="mt-2 flex items-center text-sm px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              onClick={() => handleDayClick(currentPosition.week, currentPosition.day)}
            >
              <ArrowRight className="h-4 w-4 mr-1" />
              Go to Today's Topic
            </button>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Weekly Plan List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-lg p-6 overflow-hidden">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <Calendar className="h-5 w-5 mr-2 text-indigo-600"/>
              8-Week Study Plan
            </h2>
            
            <div className="space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto pr-2">
              {weeklyPlans.map((weekPlan) => (
                <div key={weekPlan.week} className="border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    className={`w-full flex justify-between items-center p-4 text-left ${
                      expandedWeeks.includes(weekPlan.week) ? 'bg-indigo-50' : 'bg-gray-50'
                    } hover:bg-indigo-50 transition-colors`}
                    onClick={() => toggleWeek(weekPlan.week)}
                  >
                    <div>
                      <h3 className="font-medium text-gray-900">Week {weekPlan.week}</h3>
                      <p className="text-sm text-gray-600">{weekPlan.theme}</p>
                    </div>
                    {expandedWeeks.includes(weekPlan.week) 
                      ? <ChevronUp className="h-5 w-5 text-gray-500" />
                      : <ChevronDown className="h-5 w-5 text-gray-500" />
                    }
                  </button>
                  
                  {expandedWeeks.includes(weekPlan.week) && (
                    <div className="p-4 border-t border-gray-200">
                      <ul className="space-y-3">
                        {weekPlan.days.map((dailyPlan, dayIndex) => (
                          <li key={dayIndex} className="relative">
                            <button
                              className={`w-full text-left p-3 rounded-lg border ${
                                selectedDay?.week === weekPlan.week && selectedDay?.day === dayIndex + 1
                                  ? 'bg-indigo-50 border-indigo-200'
                                  : isDayCompleted(weekPlan.week, dayIndex + 1)
                                    ? 'bg-green-50 border-green-200'
                                    : 'bg-white border-gray-200 hover:bg-gray-50'
                              }`}
                              onClick={() => handleDayClick(weekPlan.week, dayIndex + 1)}
                            >
                              <div className="flex justify-between items-start">
                                <div className="pr-6">
                                  <h4 className="font-medium text-gray-900">Day {dayIndex + 1}: {dailyPlan.topic}</h4>
                                  <div className="flex items-center mt-1 space-x-2">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                      dailyPlan.category === 'electronics' 
                                        ? 'bg-blue-100 text-blue-800' 
                                        : dailyPlan.category === 'communications'
                                          ? 'bg-purple-100 text-purple-800'
                                          : dailyPlan.category === 'computer-science'
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-red-100 text-red-800'
                                    }`}>
                                      {dailyPlan.category.replace('-', ' ')}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                      dailyPlan.difficulty === 'easy' 
                                        ? 'bg-green-100 text-green-800' 
                                        : dailyPlan.difficulty === 'medium'
                                          ? 'bg-yellow-100 text-yellow-800'
                                          : 'bg-red-100 text-red-800'
                                    }`}>
                                      {dailyPlan.difficulty}
                                    </span>
                                  </div>
                                </div>
                                {isDayCompleted(weekPlan.week, dayIndex + 1) && (
                                  <CheckCircle className="absolute top-3 right-3 h-5 w-5 text-green-500" />
                                )}
                              </div>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Daily Plan Details */}
        <div className="lg:col-span-2">
          {!selectedDay ? (
            <div className="bg-white rounded-xl shadow-lg p-8 text-center">
              <Calendar className="h-16 w-16 mx-auto mb-4 text-indigo-300" />
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Select a Day to View Details</h2>
              <p className="text-gray-600 mb-6">
                Choose a day from the study plan to view detailed information and learning materials.
              </p>
              <div className="p-4 bg-indigo-50 rounded-lg inline-block text-left">
                <h3 className="font-medium text-indigo-800 mb-2 flex items-center">
                  <Zap className="h-4 w-4 mr-1" />
                  ExamMaster AI Tip
                </h3>
                <p className="text-indigo-700 text-sm">
                  For optimal results, follow the study plan in order and complete each day's objectives before moving to the next.
                </p>
              </div>
            </div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl shadow-lg p-6"
            >
              {weeklyPlans.length > 0 && selectedDay.week <= weeklyPlans.length && (
                <>
                  {(() => {
                    const weekPlan = weeklyPlans[selectedDay.week - 1];
                    const dailyPlan = weekPlan?.days[selectedDay.day - 1];
                    
                    if (!dailyPlan) {
                      return <div>Loading plan details...</div>;
                    }
                    
                    return (
                      <>
                        <div className="mb-6">
                          <div className="flex justify-between items-start">
                            <div>
                              <h2 className="text-2xl font-semibold text-gray-900">
                                Day {selectedDay.day}: {dailyPlan.topic}
                              </h2>
                              <p className="text-gray-600">Week {selectedDay.week}: {weekPlan.theme}</p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                dailyPlan.category === 'electronics' 
                                  ? 'bg-blue-100 text-blue-800' 
                                  : dailyPlan.category === 'communications'
                                    ? 'bg-purple-100 text-purple-800'
                                    : dailyPlan.category === 'computer-science'
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-red-100 text-red-800'
                              }`}>
                                {dailyPlan.category.replace('-', ' ')}
                              </span>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                dailyPlan.difficulty === 'easy' 
                                  ? 'bg-green-100 text-green-800' 
                                  : dailyPlan.difficulty === 'medium'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-red-100 text-red-800'
                              }`}>
                                {dailyPlan.difficulty}
                              </span>
                            </div>
                          </div>
                          
                          <div className="mt-4 flex items-center text-gray-600">
                            <Clock className="h-4 w-4 mr-1" />
                            <span>Estimated time: {dailyPlan.estimatedTime} minutes</span>
                          </div>
                        </div>
                        
                        <div className="mb-6">
                          <h3 className="text-lg font-semibold text-gray-800 mb-2">Description</h3>
                          <p className="text-gray-700">{dailyPlan.description}</p>
                        </div>
                        
                        <div className="mb-6">
                          <h3 className="text-lg font-semibold text-gray-800 mb-2">Learning Objectives</h3>
                          <ul className="space-y-2">
                            {dailyPlan.objectives.map((objective, index) => (
                              <li key={index} className="flex items-start">
                                <span className="inline-block bg-indigo-100 text-indigo-800 rounded-full w-6 h-6 flex items-center justify-center mr-2 flex-shrink-0 mt-0.5">
                                  {index + 1}
                                </span>
                                <span className="text-gray-700">{objective}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        
                        <div className="flex flex-wrap gap-3">
                          <button 
                            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                            onClick={() => {
                              // Find a matching topic in the topics list
                              const matchingTopic = state.topics.find(t => 
                                t.title.toLowerCase().includes(dailyPlan.topic.toLowerCase())
                              );
                              
                              if (matchingTopic) {
                                navigate(`/lessons/${matchingTopic.id}/${encodeURIComponent(matchingTopic.title)}`);
                              } else {
                                // If no exact match, navigate to a search or create a new lesson
                                navigate(`/lessons/new/${encodeURIComponent(dailyPlan.topic)}`);
                              }
                            }}
                          >
                            <BookOpen className="h-4 w-4 mr-2" />
                            Start Lesson
                          </button>
                          
                          <button 
                            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                            onClick={() => navigate(`/quiz?topic=${encodeURIComponent(dailyPlan.topic)}`)}
                          >
                            <Zap className="h-4 w-4 mr-2" />
                            Take Quiz
                          </button>
                          
                          <button 
                            className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                            onClick={() => markDayAsCompleted(selectedDay.week, selectedDay.day)}
                            disabled={isDayCompleted(selectedDay.week, selectedDay.day)}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            {isDayCompleted(selectedDay.week, selectedDay.day) 
                              ? 'Completed' 
                              : 'Mark as Completed'}
                          </button>
                        </div>
                        
                        {/* AI Insight */}
                        <div className="mt-8 p-4 bg-indigo-50 border border-indigo-100 rounded-lg">
                          <h3 className="font-medium text-indigo-800 mb-2 flex items-center">
                            <Brain className="h-5 w-5 mr-2 text-indigo-600" />
                            ExamMaster AI Insight
                          </h3>
                          <p className="text-indigo-700">
                            This topic is {dailyPlan.difficulty} difficulty and builds on concepts from previous days. 
                            {dailyPlan.difficulty === 'hard' && " Take extra time to review the fundamentals before diving in."}
                            {dailyPlan.difficulty === 'medium' && " Focus on understanding the core principles and their applications."}
                            {dailyPlan.difficulty === 'easy' && " This is a good opportunity to solidify your understanding of the basics."}
                          </p>
                        </div>
                      </>
                    );
                  })()}
                </>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DailyPlanner;
