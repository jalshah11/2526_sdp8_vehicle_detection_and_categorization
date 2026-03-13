import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import VideoUpload from './VideoUpload';
import Analytics from './Analytics';
import { processVideo } from '../services/api';
import { useAuth } from '../context/AuthContext';

function Dashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [processingOptions, setProcessingOptions] = useState({
    model: 'yolov8n.pt',
    line_y: 0.5,
    invert_directions: false,
    conf: 0.25,
  });

  const handleProcessVideo = async (videoPath) => {
    setLoading(true);
    setError(null);
    setAnalytics(null);

    try {
      const result = await processVideo(videoPath, processingOptions);
      setAnalytics(result);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to process video');
      console.error('Error processing video:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-900">
      {/* ── Top Navigation Bar ─────────────────────────────────────────── */}
      <nav className="bg-slate-800/80 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-30">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-600/30 border border-blue-500/40 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-white font-semibold text-sm hidden sm:block">Vehicle Analytics</span>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* History button */}
            <button
              onClick={() => navigate('/history')}
              className="flex items-center gap-1.5 text-slate-300 hover:text-white text-sm px-3 py-1.5 rounded-lg hover:bg-slate-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="hidden sm:inline">History</span>
            </button>

            {/* Divider */}
            <div className="w-px h-5 bg-slate-600" />

            {/* User info — click to go to profile */}
            {user && (
              <button
                onClick={() => navigate('/profile')}
                className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-slate-700 transition-colors"
                title="View Profile"
              >
                <div className="w-7 h-7 bg-blue-600/30 border border-blue-500/40 rounded-full flex items-center justify-center">
                  <span className="text-blue-300 text-xs font-bold uppercase">
                    {user.username?.charAt(0) || user.email?.charAt(0)}
                  </span>
                </div>
                <span className="text-slate-300 text-sm font-medium hidden sm:inline">{user.username}</span>
              </button>
            )}

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-slate-400 hover:text-red-400 text-sm px-3 py-1.5 rounded-lg hover:bg-red-900/20 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </nav>

      {/* ── Main Content ────────────────────────────────────────────────── */}
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Vehicle Detection &amp; Categorization Dashboard
          </h1>
          <p className="text-slate-400">
            Analyze vehicle traffic with YOLO-based detection and tracking
          </p>
        </header>

        {/* Video Processing Section */}
        <div className="mb-8">
          <div className="bg-slate-800 rounded-xl shadow-2xl p-6 border border-slate-700">
            <h2 className="text-2xl font-semibold text-white mb-4 flex items-center">
              <svg className="w-6 h-6 mr-2 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Video Processing
            </h2>
            
            <VideoUpload
              onProcess={handleProcessVideo}
              loading={loading}
              processingOptions={processingOptions}
              onOptionsChange={setProcessingOptions}
            />

            {/* Success banner: analytics saved notice */}
            {analytics && user && (
              <div className="mt-4 bg-green-900/20 border border-green-500/30 rounded-lg p-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-green-300 text-sm">
                  Analytics saved to your history.{' '}
                  <button onClick={() => navigate('/history')} className="underline hover:text-green-200 transition-colors">
                    View History →
                  </button>
                </p>
              </div>
            )}

            {error && (
              <div className="mt-4 bg-red-900/30 border border-red-500/50 rounded-lg p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-300">Error</h3>
                    <div className="mt-2 text-sm text-red-200">
                      <p>{error}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Analytics Section */}
        <Analytics data={analytics} loading={loading} />
      </div>
    </div>
  );
}

export default Dashboard;
