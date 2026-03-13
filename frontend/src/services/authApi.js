import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const authApi = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Auto-inject token for authenticated calls
authApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('va_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Auth ─────────────────────────────────────────────────────────────────────

export const register = async ({ username, email, password }) => {
  const res = await authApi.post('/api/auth/register', { username, email, password });
  return res.data; // { message }
};

export const login = async ({ email, password }) => {
  const res = await authApi.post('/api/auth/login', { email, password });
  return res.data; // { access_token, token_type, user }
};

export const getMe = async () => {
  const res = await authApi.get('/api/auth/me');
  return res.data;
};

// ── Email Verification OTP ────────────────────────────────────────────────────

export const sendVerificationOtp = async (email) => {
  const res = await authApi.post('/api/auth/send-verification-otp', { email });
  return res.data;
};

export const verifyEmail = async ({ email, otp }) => {
  const res = await authApi.post('/api/auth/verify-email', { email, otp });
  return res.data;
};

// ── Forgot / Reset Password ───────────────────────────────────────────────────

export const forgotPassword = async (email) => {
  const res = await authApi.post('/api/auth/forgot-password', { email });
  return res.data;
};

export const resetPassword = async ({ email, otp, new_password }) => {
  const res = await authApi.post('/api/auth/reset-password', { email, otp, new_password });
  return res.data;
};

// ── History ───────────────────────────────────────────────────────────────────

export const getHistory = async () => {
  const res = await authApi.get('/api/history');
  return res.data;
};

export const deleteHistoryRecord = async (recordId) => {
  await authApi.delete(`/api/history/${recordId}`);
};

// ── Profile ───────────────────────────────────────────────────────────────────

export const getProfile = async () => {
  const res = await authApi.get('/api/profile/me');
  return res.data;
};

export const updateProfile = async ({ username }) => {
  const res = await authApi.put('/api/profile/update', { username });
  return res.data;
};

export const uploadAvatar = async (file) => {
  const form = new FormData();
  form.append('file', file);
  const res = await authApi.post('/api/profile/avatar', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

export const removeAvatar = async () => {
  const res = await authApi.delete('/api/profile/avatar');
  return res.data;
};

export const changePassword = async ({ current_password, new_password }) => {
  const res = await authApi.put('/api/profile/change-password', { current_password, new_password });
  return res.data;
};

export const deleteAccount = async () => {
  const res = await authApi.delete('/api/profile/delete-account');
  return res.data;
};

export default authApi;
