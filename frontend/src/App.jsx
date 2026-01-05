import { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import { healthCheck } from './services/api';

function App() {
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [backendError, setBackendError] = useState(null);

  useEffect(() => {
    const checkBackend = async () => {
      try {
        await healthCheck();
        setIsBackendConnected(true);
        setBackendError(null);
      } catch (error) {
        setIsBackendConnected(false);
        setBackendError(error.message || 'Failed to connect to backend');
      }
    };

    checkBackend();
    const interval = setInterval(checkBackend, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-900">
      {!isBackendConnected && (
        <div className="bg-red-900/30 border-l-4 border-red-500 text-red-200 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium">
                Backend not connected. Please ensure the FastAPI server is running on port 8000.
              </p>
              {backendError && (
                <p className="text-xs mt-1 text-red-300">Error: {backendError}</p>
              )}
            </div>
          </div>
        </div>
      )}
      <Dashboard />
    </div>
  );
}

export default App;
