import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import { useApp } from '../../contexts/AppContext';

export default function Layout() {
  const { state } = useApp();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* The Navbar is only shown after the user has completed the onboarding process. */}
      {state.user?.onboardingCompleted && <Navbar />}
      <main>
        {/* The content for each route (e.g., Dashboard, Settings) is rendered here. */}
        <Outlet />
      </main>
    </div>
  );
}
