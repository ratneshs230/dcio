import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Key, Bell, Palette, User, Save, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import type { LearningStyle, AppSettings } from '../../types/index'; 
import { openaiService } from '../../services/openaiService'; // Changed

export default function Settings() {
  const { state, dispatch } = useApp();
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKey, setApiKey] = useState(state.settings.openaiApiKey || ''); // Changed
  const [isTestingApi, setIsTestingApi] = useState(false);
  const [apiTestResult, setApiTestResult] = useState<'success' | 'error' | null>(null);
  const [userName, setUserName] = useState(state.user?.name || '');
  const [examDate, setExamDate] = useState('');

  useEffect(() => {
    if (state.settings.examDate) {
      // Handles potential timezone issues by splitting on 'T'
      setExamDate(state.settings.examDate.split('T')[0]);
    }
  }, [state.settings.examDate]);

  const handleSaveApiKey = async () => {
    const trimmedApiKey = apiKey.trim();
    if (!trimmedApiKey) {
      openaiService.setApiKey(undefined); // Changed
      dispatch({ type: 'UPDATE_SETTINGS', payload: { openaiApiKey: undefined } }); // Changed
      setApiTestResult(null); // Clear any previous test result message
      return;
    }

    setIsTestingApi(true);
    setApiTestResult(null);
    try {
      openaiService.setApiKey(trimmedApiKey); // Changed
      await openaiService.testApiKeyConnection(); // Changed
      
      dispatch({ type: 'UPDATE_SETTINGS', payload: { openaiApiKey: trimmedApiKey } }); // Changed
      setApiTestResult('success');
    } catch (error) {
      setApiTestResult('error');
      console.error('API key setup/test failed:', error);
      // Do not dispatch the failing key to global state.
      // The geminiService.setApiKey might have already cleared its internal key if initialization failed.
    } finally {
      setIsTestingApi(false);
    }
  };

  const handleToggleNotifications = () => {
    dispatch({ 
      type: 'UPDATE_SETTINGS', 
      payload: { notifications: !state.settings.notifications } 
    });
  };

  const handleToggleLearningReminders = () => {
    dispatch({ 
      type: 'UPDATE_SETTINGS', 
      payload: { learningReminders: !state.settings.learningReminders } 
    });
  };

  const handleStudyGoalChange = (goal: number) => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: { studyGoal: goal } });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-2">Customize your learning experience</p>
      </div>
      <div className="space-y-8">
          {/* API Configuration */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-xl shadow-sm p-6"
          >
            <div className="flex items-center space-x-3 mb-6">
              <Key className="h-6 w-6 text-indigo-600" />
              <h2 className="text-xl font-semibold text-gray-900">API Configuration</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  OpenAI API Key {/* Changed */}
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    placeholder="Enter your OpenAI API Key" // Changed
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showApiKey ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                
                {apiTestResult === 'success' && (
                  <div className="mt-2 flex items-center space-x-2 text-emerald-600">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                    <span className="text-sm">API key is valid and working</span>
                  </div>
                )}
                
                {apiTestResult === 'error' && (
                  <div className="mt-2 flex items-center space-x-2 text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">Invalid API key or connection error</span>
                  </div>
                )}
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>How to get your API key:</strong>
                </p>
                <ol className="text-sm text-blue-700 mt-2 space-y-1">
                  <li>1. Go to <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline">OpenAI Platform</a></li> {/* Changed */}
                  <li>2. Create a new API key</li>
                  <li>3. Copy and paste it here</li>
                  <li>4. Your API key is stored securely on your device</li>
                </ol>
              </div>

              <button
                onClick={handleSaveApiKey}
                disabled={isTestingApi}
                className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Save className="h-4 w-4 mr-2" />
                {isTestingApi ? 'Testing...' : 'Save & Test API Key'}
              </button>
            </div>
          </motion.div>

          {/* Profile Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-white rounded-xl shadow-sm p-6"
          >
            <div className="flex items-center space-x-3 mb-6">
              <User className="h-6 w-6 text-indigo-600" />
              <h2 className="text-xl font-semibold text-gray-900">Profile</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Learning Style
                </label>
                <select
                  value={state.user?.learningStyle || 'mixed'}
                  onChange={(e) => {
                    if (state.user) {
                      dispatch({
                        type: 'SET_USER',
                        payload: { ...state.user, learningStyle: e.target.value as LearningStyle }
                      });
                    }
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                >
                  <option value="visual">Visual</option>
                  <option value="audio">Audio</option>
                  <option value="text">Text</option>
                  <option value="mixed">Mixed</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Daily Study Goal (minutes)
                </label>
                <select
                  value={state.settings.studyGoal}
                  onChange={(e) => handleStudyGoalChange(parseInt(e.target.value))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                >
                  <option value={60}>1 hour</option>
                  <option value={90}>1.5 hours</option>
                  <option value={120}>2 hours</option>
                  <option value={180}>3 hours</option>
                  <option value={240}>4 hours</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Exam Date
                </label>
                <input
                  type="date"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                />
                 <p className="text-xs text-gray-500 mt-1">Used for the countdown on your dashboard.</p>
              </div>
            </div>
            <div className="mt-6 text-right">
              <button
                onClick={() => {
                  if (state.user) {
                    dispatch({ type: 'SET_USER', payload: { ...state.user, name: userName } });
                  }
                  if (examDate) {
                    dispatch({ type: 'UPDATE_SETTINGS', payload: { examDate: new Date(examDate).toISOString() } });
                  }
                }}
                className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Profile & Date
              </button>
            </div>
          </motion.div>

          {/* Notifications */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-white rounded-xl shadow-sm p-6"
          >
            <div className="flex items-center space-x-3 mb-6">
              <Bell className="h-6 w-6 text-indigo-600" />
              <h2 className="text-xl font-semibold text-gray-900">Notifications</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">Push Notifications</h3>
                  <p className="text-sm text-gray-600">Receive general app notifications</p>
                </div>
                <button
                  onClick={handleToggleNotifications}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    state.settings.notifications ? 'bg-indigo-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      state.settings.notifications ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">Learning Reminders</h3>
                  <p className="text-sm text-gray-600">Daily study reminders and streak notifications</p>
                </div>
                <button
                  onClick={handleToggleLearningReminders}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    state.settings.learningReminders ? 'bg-indigo-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      state.settings.learningReminders ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </motion.div>

          {/* Appearance */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="bg-white rounded-xl shadow-sm p-6"
          >
            <div className="flex items-center space-x-3 mb-6">
              <Palette className="h-6 w-6 text-indigo-600" />
              <h2 className="text-xl font-semibold text-gray-900">Appearance</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">Dark Mode</h3>
                  <p className="text-sm text-gray-600">Toggle between light and dark themes</p>
                </div>
                <button
                  onClick={() => dispatch({ type: 'UPDATE_SETTINGS', payload: { darkMode: !state.settings.darkMode } })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    state.settings.darkMode ? 'bg-indigo-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      state.settings.darkMode ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </motion.div>
      </div>
    </div>
  );
}
