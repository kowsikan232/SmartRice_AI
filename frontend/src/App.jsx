import React from 'react';
import { ProfileProvider } from './context/ProfileContext';
import Dashboard from './pages/Dashboard';

function App() {
  return (
    <ProfileProvider>
      <Dashboard />
    </ProfileProvider>
  );
}

export default App;
