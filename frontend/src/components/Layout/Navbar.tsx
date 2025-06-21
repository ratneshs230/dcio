import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Brain, Home, RotateCcw, Target, Settings, User, Calendar, BookOpen } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';

export default function Navbar() {
  const location = useLocation();
  const { state } = useApp();

  // Navigation items updated to reflect the main sections of the app
  const navItems = [
    { path: '/dashboard', icon: Home, label: 'Dashboard' },
    { path: '/planner', icon: Calendar, label: 'Study Plan' },
    { path: '/revision', icon: RotateCcw, label: 'Revision' },
    { path: '/quiz', icon: Target, label: 'Mock Tests' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  // More robust check for active link, handles nested routes
  const isActive = (path: string) => {
    if (path === '/dashboard') return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/dashboard" className="flex items-center space-x-2">
            <Brain className="h-6 w-6 text-indigo-600" />
            <span className="text-xl font-bold text-gray-900">DCIO Prep</span>
          </Link>

          <div className="hidden md:flex items-center space-x-4">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive(item.path)
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            ))}
          </div>

          <div className="flex items-center space-x-3">
            {state.user && (
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5 text-gray-400" />
                <span className="text-sm text-gray-700">{state.user.name}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden border-t border-gray-200">
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium transition-colors ${
                isActive(item.path)
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
