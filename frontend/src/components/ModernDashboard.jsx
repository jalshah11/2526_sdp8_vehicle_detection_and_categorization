import React, { useState } from 'react';
import Layout from './Layout';
import VideoUpload from './VideoUpload';
import ResultsView from './ResultsView';
import { processVideo } from '../services/api';

const ModernDashboard = () => {
  const [activeTab, setActiveTab] = useState('upload');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [analytics, setAnalytics] = useState(null);
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
    
    // Switch to results view immediately to show loading state
    setActiveTab('results');

    try {
      const result = await processVideo(videoPath, processingOptions);
      setAnalytics(result);
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.detail || 
        "Failed to process video. Ensure backend is running."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'upload' && (
        <div className="max-w-3xl mx-auto">
          <div className="bg-slate-800 rounded-xl shadow-xl border border-slate-700 p-8">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent mb-4">
                Start Analysis
              </h2>
              <p className="text-slate-400">
                Configure your detection settings and upload a video to begin.
              </p>
            </div>
            
            <VideoUpload 
              onProcess={handleProcessVideo}
              loading={loading}
              processingOptions={processingOptions}
              onOptionsChange={setProcessingOptions}
            />
          </div>
        </div>
      )}

      {activeTab === 'results' && (
        <ResultsView 
          analytics={analytics} 
          loading={loading} 
          error={error} 
        />
      )}
    </Layout>
  );
};

export default ModernDashboard;
