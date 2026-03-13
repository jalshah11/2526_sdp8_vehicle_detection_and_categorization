import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  getProfile, updateProfile, uploadAvatar,
  removeAvatar, changePassword, deleteAccount,
} from '../../services/authApi';

// ── Reusable alert banner ─────────────────────────────────────────────────────
function Alert({ type, msg, onClose }) {
  if (!msg) return null;
  const styles = type === 'success'
    ? 'bg-green-900/30 border-green-500/50 text-green-300'
    : 'bg-red-900/30 border-red-500/50 text-red-300';
  return (
    <div className={`flex items-center justify-between gap-3 border rounded-lg px-4 py-2.5 text-sm mb-5 ${styles}`}>
      <span>{msg}</span>
      <button onClick={onClose} className="opacity-60 hover:opacity-100 transition-opacity">✕</button>
    </div>
  );
}

// ── Section card wrapper ──────────────────────────────────────────────────────
function Card({ title, icon, children }) {
  return (
    <div className="bg-slate-800/80 backdrop-blur-sm border border-slate-700 rounded-2xl p-6 shadow-xl">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <h2 className="text-lg font-semibold text-white">{title}</h2>
      </div>
      {children}
    </div>
  );
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, logout, login: authLogin } = useAuth();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const avatarInputRef = useRef(null);

  // Per-section feedback
  const [infoMsg, setInfoMsg]  = useState({ type: '', msg: '' });
  const [pwMsg,   setPwMsg]    = useState({ type: '', msg: '' });
  const [delMsg,  setDelMsg]   = useState({ type: '', msg: '' });
  const [avatarMsg, setAvatarMsg] = useState({ type: '', msg: '' });

  // Edit info form
  const [username, setUsername] = useState('');
  const [infoLoading, setInfoLoading] = useState(false);

  // Change password form
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwLoading, setPwLoading] = useState(false);

  // Avatar
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarLoading, setAvatarLoading] = useState(false);

  // Delete confirm
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [delLoading, setDelLoading] = useState(false);

  // ── Load profile ───────────────────────────────────────────────────────────
  useEffect(() => {
    getProfile()
      .then(p => {
        setProfile(p);
        setUsername(p.username);
        setAvatarPreview(p.avatar || null);
      })
      .catch(() => navigate('/login', { replace: true }))
      .finally(() => setLoading(false));
  }, [navigate]);

  // ── Save profile info ──────────────────────────────────────────────────────
  const handleSaveInfo = async (e) => {
    e.preventDefault();
    setInfoMsg({ type: '', msg: '' });
    setInfoLoading(true);
    try {
      await updateProfile({ username });
      setInfoMsg({ type: 'success', msg: '✅ Profile updated successfully.' });
    } catch (err) {
      setInfoMsg({ type: 'error', msg: err.response?.data?.detail || 'Update failed.' });
    } finally {
      setInfoLoading(false);
    }
  };

  // ── Avatar upload ─────────────────────────────────────────────────────────
  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarMsg({ type: '', msg: '' });
    setAvatarLoading(true);
    try {
      const res = await uploadAvatar(file);
      setAvatarPreview(res.avatar);
      setAvatarMsg({ type: 'success', msg: '✅ Profile picture updated.' });
    } catch (err) {
      setAvatarMsg({ type: 'error', msg: err.response?.data?.detail || 'Upload failed.' });
    } finally {
      setAvatarLoading(false);
      e.target.value = '';
    }
  };

  const handleRemoveAvatar = async () => {
    setAvatarMsg({ type: '', msg: '' });
    setAvatarLoading(true);
    try {
      await removeAvatar();
      setAvatarPreview(null);
      setAvatarMsg({ type: 'success', msg: 'Profile picture removed.' });
    } catch (err) {
      setAvatarMsg({ type: 'error', msg: 'Failed to remove picture.' });
    } finally {
      setAvatarLoading(false);
    }
  };

  // ── Change password ───────────────────────────────────────────────────────
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwMsg({ type: '', msg: '' });
    if (pwForm.next !== pwForm.confirm) {
      setPwMsg({ type: 'error', msg: 'New passwords do not match.' }); return;
    }
    if (pwForm.next.length < 6) {
      setPwMsg({ type: 'error', msg: 'New password must be at least 6 characters.' }); return;
    }
    setPwLoading(true);
    try {
      await changePassword({ current_password: pwForm.current, new_password: pwForm.next });
      setPwMsg({ type: 'success', msg: '✅ Password changed successfully.' });
      setPwForm({ current: '', next: '', confirm: '' });
    } catch (err) {
      setPwMsg({ type: 'error', msg: err.response?.data?.detail || 'Password change failed.' });
    } finally {
      setPwLoading(false);
    }
  };

  // ── Delete account ────────────────────────────────────────────────────────
  const handleDeleteAccount = async () => {
    setDelLoading(true);
    try {
      await deleteAccount();
      logout();
      navigate('/login', { replace: true });
    } catch (err) {
      setDelMsg({ type: 'error', msg: 'Failed to delete account. Try again.' });
      setDelLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  // ── Initials for fallback avatar ──────────────────────────────────────────
  const initials = profile
    ? (profile.username?.charAt(0) || profile.email?.charAt(0) || '?').toUpperCase()
    : '?';

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <svg className="animate-spin w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Background blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-60 -left-60 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-60 -right-60 w-[500px] h-[500px] bg-purple-600/5 rounded-full blur-3xl" />
      </div>

      {/* ── Navbar ───────────────────────────────────────────────────────── */}
      <nav className="bg-slate-800/80 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-30">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-600/30 border border-blue-500/40 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-white font-semibold text-sm hidden sm:block">Vehicle Analytics</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/')}
              className="text-slate-400 hover:text-white text-sm px-3 py-1.5 rounded-lg hover:bg-slate-700 transition-colors"
            >← Dashboard</button>
          </div>
        </div>
      </nav>

      {/* ── Page content ─────────────────────────────────────────────────── */}
      <div className="container mx-auto px-4 py-8 max-w-3xl relative z-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Account Settings</h1>
          <p className="text-slate-400 mt-1 text-sm">Manage your profile, security, and account preferences</p>
        </div>

        <div className="space-y-6">

          {/* ── Avatar ─────────────────────────────────────────────────── */}
          <Card
            title="Profile Picture"
            icon={<svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
          >
            <Alert type={avatarMsg.type} msg={avatarMsg.msg} onClose={() => setAvatarMsg({ type: '', msg: '' })} />
            <div className="flex items-center gap-6">
              {/* Avatar preview */}
              <div className="relative flex-shrink-0">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" className="w-24 h-24 rounded-2xl object-cover border-2 border-slate-600" />
                ) : (
                  <div className="w-24 h-24 rounded-2xl bg-blue-600/20 border-2 border-blue-500/40 flex items-center justify-center">
                    <span className="text-3xl font-bold text-blue-300">{initials}</span>
                  </div>
                )}
                {avatarLoading && (
                  <div className="absolute inset-0 bg-slate-900/70 rounded-2xl flex items-center justify-center">
                    <svg className="animate-spin w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  </div>
                )}
              </div>
              {/* Buttons */}
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={avatarLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Upload Photo
                </button>
                {avatarPreview && (
                  <button
                    onClick={handleRemoveAvatar}
                    disabled={avatarLoading}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-medium rounded-lg transition-colors"
                  >
                    Remove
                  </button>
                )}
                <p className="text-slate-500 text-xs">JPG, PNG, WebP — max 2 MB</p>
              </div>
            </div>
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </Card>

          {/* ── Edit Info ────────────────────────────────────────────── */}
          <Card
            title="Profile Information"
            icon={<svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
          >
            <Alert type={infoMsg.type} msg={infoMsg.msg} onClose={() => setInfoMsg({ type: '', msg: '' })} />
            <form onSubmit={handleSaveInfo} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Username</label>
                <input
                  type="text"
                  required
                  minLength={3}
                  maxLength={30}
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-700/60 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={profile?.email || ''}
                  disabled
                  className="w-full px-4 py-2.5 bg-slate-700/30 border border-slate-700 rounded-lg text-slate-500 cursor-not-allowed"
                />
                <p className="text-slate-500 text-xs mt-1">Email cannot be changed for security reasons.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Member Since</label>
                <input
                  type="text"
                  value={profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : ''}
                  disabled
                  className="w-full px-4 py-2.5 bg-slate-700/30 border border-slate-700 rounded-lg text-slate-500 cursor-not-allowed"
                />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <div className={`w-2 h-2 rounded-full ${profile?.is_verified ? 'bg-green-400' : 'bg-yellow-400'}`} />
                <span className={`text-xs font-medium ${profile?.is_verified ? 'text-green-400' : 'text-yellow-400'}`}>
                  {profile?.is_verified ? 'Email Verified' : 'Email Not Verified'}
                </span>
              </div>
              <div className="pt-1">
                <button
                  type="submit"
                  disabled={infoLoading}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2"
                >
                  {infoLoading ? (
                    <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Saving...</>
                  ) : 'Save Changes'}
                </button>
              </div>
            </form>
          </Card>

          {/* ── Change Password ───────────────────────────────────────── */}
          <Card
            title="Change Password"
            icon={<svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>}
          >
            <Alert type={pwMsg.type} msg={pwMsg.msg} onClose={() => setPwMsg({ type: '', msg: '' })} />
            <form onSubmit={handleChangePassword} className="space-y-4">
              {[
                { label: 'Current Password', key: 'current', placeholder: 'Your current password' },
                { label: 'New Password', key: 'next', placeholder: 'Min 6 characters' },
                { label: 'Confirm New Password', key: 'confirm', placeholder: 'Repeat new password' },
              ].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">{label}</label>
                  <input
                    type="password"
                    required
                    placeholder={placeholder}
                    value={pwForm[key]}
                    onChange={e => setPwForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-slate-700/60 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              ))}
              <div className="pt-1">
                <button
                  type="submit"
                  disabled={pwLoading}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2"
                >
                  {pwLoading ? (
                    <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Updating...</>
                  ) : 'Update Password'}
                </button>
              </div>
            </form>
          </Card>

          {/* ── Danger Zone ───────────────────────────────────────────── */}
          <div className="bg-slate-800/80 backdrop-blur-sm border border-red-500/30 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-lg bg-red-600/20 border border-red-500/30 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-red-400">Danger Zone</h2>
            </div>

            <Alert type={delMsg.type} msg={delMsg.msg} onClose={() => setDelMsg({ type: '', msg: '' })} />

            <p className="text-slate-400 text-sm mb-4">
              Permanently delete your account and all your data — videos history, analytics, and profile. <strong className="text-red-400">This action cannot be undone.</strong>
            </p>

            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-5 py-2.5 bg-red-600/20 hover:bg-red-600/40 border border-red-500/50 text-red-400 hover:text-red-300 text-sm font-semibold rounded-lg transition-colors"
              >
                Delete My Account
              </button>
            ) : (
              <div className="bg-red-900/20 border border-red-500/40 rounded-xl p-4">
                <p className="text-red-300 text-sm font-medium mb-4">
                  Are you absolutely sure? All your data will be permanently deleted.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={handleDeleteAccount}
                    disabled={delLoading}
                    className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:bg-slate-600 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2"
                  >
                    {delLoading ? (
                      <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Deleting...</>
                    ) : 'Yes, Delete Everything'}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-medium rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
