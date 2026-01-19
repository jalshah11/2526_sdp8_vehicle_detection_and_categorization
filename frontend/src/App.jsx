import React, { useEffect, useState } from 'react';
import Dashboard from './components/Dashboard';
import { healthCheck } from './services/api';

function App() {
  const [backendStatus, setBackendStatus] = useState('checking');

  useEffect(() => {
    // Simple health check to ensure backend is reachable
    healthCheck()
      .then(() => setBackendStatus('online'))
      .catch(() => setBackendStatus('offline'));
  }, []);

  if (backendStatus === 'offline') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="text-center p-8 bg-slate-800 rounded-xl shadow-2xl border border-red-500/50">
          <h1 className="text-2xl font-bold text-red-500 mb-2">Backend Offline</h1>
          <p className="text-slate-400 text-lg mb-4">Please start the FastAPI backend server.</p>
          <code className="block bg-black/50 p-4 rounded text-sm font-mono text-green-400 text-left">
            py -m uvicorn backend.app.main:app --reload --port 8000
          </code>
        </div>
      </div>
    );
  }

  return <Dashboard />;
}

export default App;
