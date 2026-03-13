import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getHistory, deleteHistoryRecord } from '../services/authApi';
import { useAuth } from '../context/AuthContext';

const VEHICLE_ICONS = {
  car: '🚗',
  bike: '🏍️',
  bus: '🚌',
  truck: '🚛',
};

function HistoryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const data = await getHistory();
      setRecords(data);
    } catch (err) {
      setError('Failed to load history.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e, recordId) => {
    e.stopPropagation();
    if (!window.confirm('Delete this analytics record?')) return;
    setDeletingId(recordId);
    try {
      await deleteHistoryRecord(recordId);
      setRecords((prev) => prev.filter((r) => r.id !== recordId));
      if (expandedId === recordId) setExpandedId(null);
    } catch {
      alert('Failed to delete record.');
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (isoStr) => {
    const d = new Date(isoStr);
    return d.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  const getVideoName = (path) => {
    if (!path) return 'Unknown';
    const parts = path.replace(/\\/g, '/').split('/');
    return parts[parts.length - 1];
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors mb-4"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </button>
            <h1 className="text-4xl font-bold text-white mb-2">Analytics History</h1>
            <p className="text-slate-400">
              {user?.username && <span className="text-blue-400 font-medium">{user.username}'s</span>} processed video records
            </p>
          </div>
          <div className="text-right">
            <div className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3">
              <p className="text-slate-400 text-xs mb-0.5">Total Records</p>
              <p className="text-2xl font-bold text-white">{records.length}</p>
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <svg className="animate-spin h-10 w-10 text-blue-500 mx-auto" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="mt-3 text-slate-400">Loading history...</p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-900/30 border border-red-500/50 rounded-xl p-4 text-red-300 text-sm">{error}</div>
        )}

        {/* Empty */}
        {!loading && !error && records.length === 0 && (
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-16 text-center">
            <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No History Yet</h3>
            <p className="text-slate-400 mb-6">Process a video from the dashboard to see your analytics history here.</p>
            <button
              onClick={() => navigate('/')}
              className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        )}

        {/* Records list */}
        {!loading && records.length > 0 && (
          <div className="space-y-4">
            {records.map((record) => {
              const isExpanded = expandedId === record.id;
              const categories = ['car', 'bike', 'bus', 'truck'];
              const counts = record.counts || {};

              return (
                <div
                  key={record.id}
                  className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden hover:border-slate-600 transition-colors"
                >
                  {/* Summary Row — clickable */}
                  <div
                    className="p-5 cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : record.id)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        {/* Icon */}
                        <div className="w-10 h-10 bg-blue-600/20 border border-blue-500/30 rounded-lg flex items-center justify-center flex-shrink-0">
                          <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-semibold truncate" title={record.video_path}>
                            {getVideoName(record.video_path)}
                          </p>
                          <p className="text-slate-400 text-xs font-mono truncate mt-0.5" title={record.video_path}>
                            {record.video_path}
                          </p>
                          <div className="flex items-center gap-4 mt-2 flex-wrap">
                            <span className="text-xs text-slate-500">{formatDate(record.processed_at)}</span>
                            <span className="text-xs bg-slate-700 text-slate-300 rounded px-2 py-0.5">{record.model}</span>
                          </div>
                        </div>
                      </div>

                      {/* Stats + controls */}
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-right">
                          <p className="text-2xl font-bold text-white">{record.total_vehicles}</p>
                          <p className="text-xs text-slate-400">vehicles</p>
                        </div>

                        {/* In / Out pills */}
                        <div className="hidden sm:flex flex-col gap-1">
                          <span className="text-xs bg-green-900/40 border border-green-500/30 text-green-400 rounded px-2 py-0.5">
                            ↑ {counts.in?.total ?? 0} in
                          </span>
                          <span className="text-xs bg-red-900/40 border border-red-500/30 text-red-400 rounded px-2 py-0.5">
                            ↓ {counts.out?.total ?? 0} out
                          </span>
                        </div>

                        {/* Expand chevron */}
                        <svg
                          className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          fill="none" viewBox="0 0 24 24" stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>

                        {/* Delete */}
                        <button
                          onClick={(e) => handleDelete(e, record.id)}
                          disabled={deletingId === record.id}
                          className="p-1.5 text-slate-500 hover:text-red-400 transition-colors disabled:opacity-50"
                          title="Delete record"
                        >
                          {deletingId === record.id ? (
                            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded detail section */}
                  {isExpanded && (
                    <div className="border-t border-slate-700 bg-slate-900/40 p-5">
                      {/* Category breakdown */}
                      <h4 className="text-sm font-semibold text-slate-300 mb-3">Vehicle Breakdown by Category</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                        {categories.map((cat) => {
                          const total = counts.by_category?.[cat] || 0;
                          const inCount = counts.in?.by_category?.[cat] || 0;
                          const outCount = counts.out?.by_category?.[cat] || 0;
                          return (
                            <div key={cat} className="bg-slate-800 rounded-lg p-3 border border-slate-700">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-lg">{VEHICLE_ICONS[cat] || '🚘'}</span>
                                <span className="text-sm font-medium text-slate-300 capitalize">{cat}</span>
                              </div>
                              <p className="text-xl font-bold text-white">{total}</p>
                              <div className="flex gap-2 mt-1">
                                <span className="text-xs text-green-400">↑{inCount}</span>
                                <span className="text-xs text-red-400">↓{outCount}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Processing settings */}
                      <h4 className="text-sm font-semibold text-slate-300 mb-3">Processing Settings</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                          { label: 'Line Y', value: record.video_info?.line_y ?? 'N/A' },
                          { label: 'Confidence', value: record.video_info?.conf ?? 'N/A' },
                          { label: 'Anchor', value: record.video_info?.anchor ?? 'N/A' },
                          { label: 'Invert Dir.', value: record.video_info?.invert_directions ? 'Yes' : 'No' },
                        ].map(({ label, value }) => (
                          <div key={label} className="bg-slate-800 rounded-lg p-3 border border-slate-700">
                            <p className="text-xs text-slate-400 mb-1">{label}</p>
                            <p className="text-sm font-semibold text-white">{String(value)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default HistoryPage;
