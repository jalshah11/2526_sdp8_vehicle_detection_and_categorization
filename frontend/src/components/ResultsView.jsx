import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const ResultsView = ({ analytics, loading, error }) => {
  const [videoUrl, setVideoUrl] = useState(null);

  useEffect(() => {
    // Check if backend is reachable or just construct the URL
    // We assume backend is at localhost:8000 based on standard setup
    // The timestamp cache-buster prevents browser caching old videos
    setVideoUrl(`http://localhost:8000/output/annotated.mp4?t=${Date.now()}`);
  }, [analytics]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <p className="text-slate-400 animate-pulse">Processing video... This may take a while.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/50 border border-red-700 text-red-100 px-4 py-8 rounded-lg text-center">
        <h3 className="text-lg font-bold mb-2">Analysis Failed</h3>
        <p>{error}</p>
      </div>
    );
  }

  if (!analytics || !analytics.counts) {
    return (
      <div className="text-center py-20 bg-slate-800/50 rounded-lg border-2 border-dashed border-slate-700">
        <p className="text-slate-400 text-lg">No analysis results yet. Please upload and process a video.</p>
      </div>
    );
  }

  const { counts } = analytics;
  const byCat = counts.by_category || {};
  const byIn = counts.by_category_in || {};
  const byOut = counts.by_category_out || {};

  const chartData = [
    { 
      name: 'Car', 
      Total: byCat.car || 0, 
      In: byIn.car || 0, 
      Out: byOut.car || 0 
    },
    { 
      name: 'Bike', 
      Total: byCat.bike || 0, 
      In: byIn.bike || 0, 
      Out: byOut.bike || 0 
    },
    { 
      name: 'Bus', 
      Total: byCat.bus || 0, 
      In: byIn.bus || 0, 
      Out: byOut.bus || 0 
    },
    { 
      name: 'Truck', 
      Total: byCat.truck || 0, 
      In: byIn.truck || 0, 
      Out: byOut.truck || 0 
    },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Column: Video & Key Stats */}
      <div className="space-y-6">
        <div className="bg-slate-800 rounded-xl overflow-hidden shadow-lg border border-slate-700">
          <div className="px-4 py-3 border-b border-slate-700 bg-slate-900/50">
            <h3 className="text-lg font-semibold text-white">Annotated Playback</h3>
          </div>
          <div className="aspect-video bg-black flex items-center justify-center relative">
            <video 
              key={videoUrl}
              src={videoUrl} 
              controls 
              className="w-full h-full object-contain"
              onError={(e) => console.error("Video load failed", e)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl p-4 shadow-lg">
            <p className="text-blue-100 text-sm font-medium uppercase tracking-wider">Total Vehicles</p>
            <p className="text-4xl font-bold text-white mt-1">{counts.total}</p>
          </div>
           <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-xl p-4 shadow-lg">
            <p className="text-indigo-100 text-sm font-medium uppercase tracking-wider">Processing Time</p>
            <p className="text-4xl font-bold text-white mt-1">
              {analytics.debug?.frames_total ? `${(analytics.debug.frames_total / 30).toFixed(1)}s` : 'N/A'}
            </p>
          </div>
        </div>
      </div>

      {/* Right Column: Detailed Analytics */}
      <div className="space-y-6">
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 shadow-lg">
           <h3 className="text-lg font-semibold text-white mb-6">Traffic Composition</h3>
           <div className="h-64">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={chartData}>
                 <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                 <XAxis dataKey="name" stroke="#94a3b8" />
                 <YAxis stroke="#94a3b8" />
                 <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }}
                    itemStyle={{ color: '#f1f5f9' }}
                 />
                 <Legend />
                 <Bar dataKey="Total" fill="#60a5fa" />
                 <Bar dataKey="In" fill="#34d399" />
                 <Bar dataKey="Out" fill="#f87171" />
               </BarChart>
             </ResponsiveContainer>
           </div>
        </div>

        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-lg">
          <div className="px-6 py-4 border-b border-slate-700">
            <h3 className="text-lg font-semibold text-white">Detailed Counts</h3>
          </div>
          <div className="p-0">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/50 text-slate-400 uppercase font-medium">
                <tr>
                  <th className="px-6 py-3">Category</th>
                  <th className="px-6 py-3">Total</th>
                  <th className="px-6 py-3">Inbound</th>
                  <th className="px-6 py-3">Outbound</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {chartData.map((row) => (
                  <tr key={row.name} className="hover:bg-slate-700/50 transition-colors">
                    <td className="px-6 py-3 font-medium text-white">{row.name}</td>
                    <td className="px-6 py-3">{row.Total}</td>
                    <td className="px-6 py-3 text-green-400">{row.In}</td>
                    <td className="px-6 py-3 text-red-400">{row.Out}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultsView;
