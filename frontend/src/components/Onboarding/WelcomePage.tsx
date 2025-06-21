import React from 'react';
import { useNavigate } from 'react-router-dom';

function WelcomePage() {
  const navigate = useNavigate();

  const handleStartLearning = () => {
    navigate('/dashboard');
  };

  return (
    <div>
      <h1>Welcome to the AI-Powered DCIO/Tech Exam Preparation Platform</h1>
      <p>Your AI Agent is ready to help you prepare for your exam.</p>
      <button onClick={handleStartLearning}>Start Learning</button>
    </div>
  );
}

export default WelcomePage;
