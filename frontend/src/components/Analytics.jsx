import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area } from 'recharts';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'];
const DARK_COLORS = ['#60A5FA', '#34D399', '#FBBF24', '#F87171'];

function Analytics({ data, loading }) {
  if (loading) {
    return (
      <div className="bg-slate-800 rounded-xl shadow-2xl p-6 border border-slate-700">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <svg className="animate-spin h-12 w-12 text-blue-500 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="mt-4 text-slate-300">Processing video...</p>
            <p className="text-sm text-slate-500 mt-2">This may take a few minutes</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-slate-800 rounded-xl shadow-2xl p-6 border border-slate-700">
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-slate-300">No Analytics Yet</h3>
          <p className="mt-1 text-sm text-slate-500">Process a video to see analytics here</p>
        </div>
      </div>
    );
  }

  const counts = data.counts || {};
  const categories = ['car', 'bike', 'bus', 'truck'];
  const total = counts.total || 0;
  const totalIn = counts.in?.total || 0;
  const totalOut = counts.out?.total || 0;

  // Calculate percentages and ratios
  const inPercentage = total > 0 ? ((totalIn / total) * 100).toFixed(1) : 0;
  const outPercentage = total > 0 ? ((totalOut / total) * 100).toFixed(1) : 0;
  const inOutRatio = totalOut > 0 ? (totalIn / totalOut).toFixed(2) : (totalIn > 0 ? '∞' : '0');

  // Prepare data for charts
  const categoryData = categories.map(cat => {
    const catTotal = counts.by_category?.[cat] || 0;
    const catIn = counts.in?.by_category?.[cat] || 0;
    const catOut = counts.out?.by_category?.[cat] || 0;
    const catPercentage = total > 0 ? ((catTotal / total) * 100).toFixed(1) : 0;
    return {
      name: cat.charAt(0).toUpperCase() + cat.slice(1),
      total: catTotal,
      in: catIn,
      out: catOut,
      percentage: parseFloat(catPercentage),
    };
  });

  const pieData = categories
    .map(cat => ({
      name: cat.charAt(0).toUpperCase() + cat.slice(1),
      value: counts.by_category?.[cat] || 0,
    }))
    .filter(item => item.value > 0);

  const directionData = [
    { name: 'In', value: totalIn, color: '#10B981', percentage: parseFloat(inPercentage) },
    { name: 'Out', value: totalOut, color: '#EF4444', percentage: parseFloat(outPercentage) },
  ].filter(item => item.value > 0);

  // Category breakdown by direction
  const categoryDirectionData = categories.map(cat => ({
    name: cat.charAt(0).toUpperCase() + cat.slice(1),
    In: counts.in?.by_category?.[cat] || 0,
    Out: counts.out?.by_category?.[cat] || 0,
  }));

  // Most common vehicle type
  const mostCommon = categoryData.reduce((max, cat) => 
    cat.total > max.total ? cat : max, 
    { name: 'N/A', total: 0 }
  );

  // Calculate category percentages for pie chart
  const categoryPercentages = categoryData
    .filter(cat => cat.total > 0)
    .map(cat => ({
      name: cat.name,
      value: cat.percentage,
    }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-lg">
          <p className="text-slate-200 font-medium mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {`${entry.name}: ${entry.value}`}
              {entry.payload?.percentage !== undefined && ` (${entry.payload.percentage}%)`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards - Enhanced */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl shadow-lg p-6 border border-blue-500/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-100 mb-1">Total Vehicles</p>
              <p className="text-3xl font-bold text-white">{total}</p>
              <p className="text-xs text-blue-200 mt-1">All categories</p>
            </div>
            <div className="w-12 h-12 bg-blue-500/30 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-xl shadow-lg p-6 border border-green-500/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-100 mb-1">In Lane</p>
              <p className="text-3xl font-bold text-white">{totalIn}</p>
              <p className="text-xs text-green-200 mt-1">{inPercentage}% of total</p>
            </div>
            <div className="w-12 h-12 bg-green-500/30 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-600 to-red-700 rounded-xl shadow-lg p-6 border border-red-500/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-100 mb-1">Out Lane</p>
              <p className="text-3xl font-bold text-white">{totalOut}</p>
              <p className="text-xs text-red-200 mt-1">{outPercentage}% of total</p>
            </div>
            <div className="w-12 h-12 bg-red-500/30 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl shadow-lg p-6 border border-purple-500/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-100 mb-1">In/Out Ratio</p>
              <p className="text-3xl font-bold text-white">{inOutRatio}</p>
              <p className="text-xs text-purple-200 mt-1">Traffic balance</p>
            </div>
            <div className="w-12 h-12 bg-purple-500/30 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-800 rounded-xl shadow-lg p-6 border border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-400 mb-1">Most Common Vehicle</p>
              <p className="text-2xl font-bold text-white">{mostCommon.name}</p>
              <p className="text-xs text-slate-500 mt-1">{mostCommon.total} vehicles</p>
            </div>
            <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl shadow-lg p-6 border border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-400 mb-1">Tracked Vehicles</p>
              <p className="text-2xl font-bold text-white">{data.counted_track_ids?.length || 0}</p>
              <p className="text-xs text-slate-500 mt-1">Unique IDs</p>
            </div>
            <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl shadow-lg p-6 border border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-400 mb-1">Detection Model</p>
              <p className="text-lg font-bold text-white truncate">{data.model || 'N/A'}</p>
              <p className="text-xs text-slate-500 mt-1">YOLO Model</p>
            </div>
            <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Video Information */}
      {data.video && (
        <div className="bg-slate-800 rounded-xl shadow-lg p-6 border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Video Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="bg-slate-700/50 rounded-lg p-3">
              <span className="text-slate-400">Video Path:</span>
              <p className="text-slate-200 font-mono text-xs mt-1 break-all">{data.video}</p>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-3">
              <span className="text-slate-400">Model:</span>
              <p className="text-slate-200 mt-1">{data.model || 'N/A'}</p>
            </div>

            {data.tracking?.tracker && (
              <div className="bg-slate-700/50 rounded-lg p-3">
                <span className="text-slate-400">Tracker:</span>
                <p className="text-slate-200 mt-1">{data.tracking.tracker}</p>
              </div>
            )}

            {data.debug && (
              <div className="bg-slate-700/50 rounded-lg p-3">
                <span className="text-slate-400">Debug:</span>
                <p className="text-slate-200 mt-1">
                  frames_used={data.debug.frames_used} / frames_total={data.debug.frames_total}
                </p>
                <p className="text-slate-200 mt-1">
                  vehicle_detections_total={data.debug.vehicle_detections_total}
                </p>
              </div>
            )}

            {data.line_y !== undefined && (
              <div className="bg-slate-700/50 rounded-lg p-3">
                <span className="text-slate-400">Line Position:</span>
                <p className="text-slate-200 mt-1">{data.line_y} ({(data.line_y * 100).toFixed(0)}% of frame height)</p>
              </div>
            )}
            {data.generated_at && (
              <div className="bg-slate-700/50 rounded-lg p-3">
                <span className="text-slate-400">Processed At:</span>
                <p className="text-slate-200 mt-1">{new Date(data.generated_at).toLocaleString()}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Category Breakdown Chart */}
      <div className="bg-slate-800 rounded-xl shadow-lg p-6 border border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4">Vehicle Count by Category</h3>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={categoryData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
            <XAxis dataKey="name" stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ color: '#e2e8f0' }} />
            <Bar dataKey="total" fill="#60A5FA" name="Total" radius={[8, 8, 0, 0]} />
            <Bar dataKey="in" fill="#34D399" name="In" radius={[8, 8, 0, 0]} />
            <Bar dataKey="out" fill="#F87171" name="Out" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Category Distribution Pie Chart */}
        {pieData.length > 0 && (
          <div className="bg-slate-800 rounded-xl shadow-lg p-6 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4">Category Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={DARK_COLORS[index % DARK_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Direction Distribution */}
        {directionData.length > 0 && (
          <div className="bg-slate-800 rounded-xl shadow-lg p-6 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4">Direction Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={directionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {directionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Category Direction Comparison */}
      <div className="bg-slate-800 rounded-xl shadow-lg p-6 border border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4">Category Direction Comparison</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={categoryDirectionData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
            <XAxis dataKey="name" stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ color: '#e2e8f0' }} />
            <Area type="monotone" dataKey="In" stackId="1" stroke="#34D399" fill="#34D399" fillOpacity={0.6} />
            <Area type="monotone" dataKey="Out" stackId="1" stroke="#F87171" fill="#F87171" fillOpacity={0.6} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Detailed Category Breakdown Table */}
      <div className="bg-slate-800 rounded-xl shadow-lg p-6 border border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4">Detailed Breakdown</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-700">
            <thead className="bg-slate-700/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Percentage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                  In
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Out
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                  In/Out Ratio
                </th>
              </tr>
            </thead>
            <tbody className="bg-slate-800 divide-y divide-slate-700">
              {categories.map((cat) => {
                const catTotal = counts.by_category?.[cat] || 0;
                const inCount = counts.in?.by_category?.[cat] || 0;
                const outCount = counts.out?.by_category?.[cat] || 0;
                const percentage = total > 0 ? ((catTotal / total) * 100).toFixed(1) : 0;
                const ratio = outCount > 0 ? (inCount / outCount).toFixed(2) : (inCount > 0 ? '∞' : '0');
                return (
                  <tr key={cat} className="hover:bg-slate-700/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                      {catTotal}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-400">
                      {percentage}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-400 font-medium">
                      {inCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-400 font-medium">
                      {outCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-400">
                      {ratio}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Analytics;
