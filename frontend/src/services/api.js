import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// ── Auto-inject Bearer token on every request ─────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('va_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const processVideo = async (videoPath, options = {}) => {
  const {
    model = 'yolov8n.pt',
    line_y = 0.5,
    invert_directions = false,
    conf = 0.25,
  } = options;

  const response = await api.post('/api/process-video', {
    video_path: videoPath,
    model,
    line_y,
    invert_directions,
    conf,
  });

  return response.data;
};

export const getAnalytics = async () => {
  const response = await api.get('/api/analytics');
  return response.data;
};

export const healthCheck = async () => {
  const response = await api.get('/health');
  return response.data;
};

export default api;
