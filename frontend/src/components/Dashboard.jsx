import { useState } from 'react';
import VideoUpload from './VideoUpload';
import Analytics from './Analytics';
import { processVideo } from '../services/api';

function Dashboard() {
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

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Vehicle Detection & Categorization Dashboard
          </h1>
          <p className="text-slate-400">
            Analyze vehicle traffic with YOLO-based detection and tracking
          </p>
        </header>

        {/* Video Processing Section - Top */}
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

        {/* Analytics Section - Below */}
        <Analytics data={analytics} loading={loading} />
      </div>
    </div>
  );
}

export default Dashboard;
