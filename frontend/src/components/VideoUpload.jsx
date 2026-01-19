import { useState } from 'react';

function VideoUpload({ onProcess, loading, processingOptions, onOptionsChange }) {
  const [videoPath, setVideoPath] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (videoPath.trim()) {
      // Normalize the path - remove quotes and trim whitespace
      let normalizedPath = videoPath.trim();
      // Remove surrounding quotes if present
      if ((normalizedPath.startsWith('"') && normalizedPath.endsWith('"')) ||
          (normalizedPath.startsWith("'") && normalizedPath.endsWith("'"))) {
        normalizedPath = normalizedPath.slice(1, -1);
      }
      // Convert forward slashes to backslashes for Windows (optional, Path handles both)
      // normalizedPath = normalizedPath.replace(/\//g, '\\');
      onProcess(normalizedPath);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="video-path" className="block text-sm font-medium text-slate-300 mb-2">
          Video File Path
        </label>
        <input
          type="text"
          id="video-path"
          value={videoPath}
          onChange={(e) => setVideoPath(e.target.value)}
          placeholder='C:\\Users\\YourName\\Downloads\\video.mp4'
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm text-slate-100 placeholder-slate-500"
          disabled={loading}
          required
        />
        <p className="mt-1 text-xs text-slate-400">
          Enter the absolute path to your video file.
        </p>
      </div>

      {/* Processing Options */}
      <div className="space-y-4 pt-4 border-t border-slate-700">
        <h3 className="text-sm font-semibold text-slate-300">Processing Options</h3>

        <div>
          <label htmlFor="model" className="block text-sm font-medium text-slate-300 mb-1">
            Model
          </label>
          <select
            id="model"
            value={processingOptions.model}
            onChange={(e) => onOptionsChange({ ...processingOptions, model: e.target.value })}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-100"
            disabled={loading}
          >
            <option value="yolov8n.pt">YOLOv8 Nano (Fastest)</option>
            <option value="yolov8s.pt">YOLOv8 Small</option>
            <option value="yolov8m.pt">YOLOv8 Medium</option>
            <option value="yolov8l.pt">YOLOv8 Large</option>
            <option value="yolov8x.pt">YOLOv8 Extra Large (Most Accurate)</option>
          </select>
        </div>

        <div>
          <label htmlFor="line-y" className="block text-sm font-medium text-slate-300 mb-1">
            Line Position (0.0 - 1.0)
          </label>
          <input
            type="number"
            id="line-y"
            min="0"
            max="1"
            step="0.1"
            value={processingOptions.line_y}
            onChange={(e) => onOptionsChange({ ...processingOptions, line_y: parseFloat(e.target.value) })}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-100"
            disabled={loading}
          />
          <p className="mt-1 text-xs text-slate-400">
            Horizontal line position as fraction of frame height (0.5 = middle)
          </p>
        </div>

        <div>
          <label htmlFor="conf" className="block text-sm font-medium text-slate-300 mb-1">
            Confidence Threshold (0.0 - 1.0)
          </label>
          <input
            type="number"
            id="conf"
            min="0"
            max="1"
            step="0.05"
            value={processingOptions.conf}
            onChange={(e) => onOptionsChange({ ...processingOptions, conf: parseFloat(e.target.value) })}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-100"
            disabled={loading}
          />
        </div>




        <div className="flex items-center">
          <input
            type="checkbox"
            id="invert-directions"
            checked={processingOptions.invert_directions}
            onChange={(e) => onOptionsChange({ ...processingOptions, invert_directions: e.target.checked })}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-600 rounded bg-slate-700"
            disabled={loading}
          />
          <label htmlFor="invert-directions" className="ml-2 block text-sm text-slate-300">
            Invert Directions (swap in/out)
          </label>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || !videoPath.trim()}
        className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors font-medium shadow-lg"
      >
        {loading ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Processing...
          </span>
        ) : (
          'Process Video'
        )}
      </button>
    </form>
  );
}

export default VideoUpload;
