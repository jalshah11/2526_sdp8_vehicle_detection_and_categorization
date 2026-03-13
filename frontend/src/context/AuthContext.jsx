import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Use sessionStorage so refreshing keeps the user logged in, but closing the tab logs them out.
  const [token, setToken] = useState(() => sessionStorage.getItem('va_token'));
  const [user, setUser] = useState(() => {
    try {
      const stored = sessionStorage.getItem('va_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    // Clean up old localStorage leftover from previous app versions just in case
    localStorage.removeItem('va_token');
    localStorage.removeItem('va_user');
  }, []);

  const login = useCallback((tokenStr, userData) => {
    sessionStorage.setItem('va_token', tokenStr);
    sessionStorage.setItem('va_user', JSON.stringify(userData));
    setToken(tokenStr);
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem('va_token');
    sessionStorage.removeItem('va_user');
    setToken(null);
    setUser(null);
  }, []);

  const isAuthenticated = Boolean(token && user);

  return (
    <AuthContext.Provider value={{ token, user, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

export default AuthContext;
