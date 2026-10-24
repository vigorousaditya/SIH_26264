import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('casebridge_token'));
  const [loading, setLoading] = useState(true);
  const [dbMode, setDbMode] = useState('LOCAL_MEMORY');

  useEffect(() => {
    async function initAuth() {
      if (token) {
        try {
          const res = await api.getMe();
          if (res.success) {
            setUser(res.user);
            setDbMode(res.dbMode || 'LOCAL_MEMORY');
          }
        } catch (err) {
          console.warn('Session expired or invalid, clearing token.');
          localStorage.removeItem('casebridge_token');
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    }
    initAuth();
  }, [token]);

  const login = async (email, password) => {
    const res = await api.login({ email, password });
    if (res.success) {
      localStorage.setItem('casebridge_token', res.token);
      setToken(res.token);
      setUser(res.user);
      setDbMode(res.dbMode || 'LOCAL_MEMORY');
    }
    return res;
  };

  const demoSwitch = async (role) => {
    const res = await api.demoSwitch(role);
    if (res.success) {
      localStorage.setItem('casebridge_token', res.token);
      setToken(res.token);
      setUser(res.user);
      setDbMode(res.dbMode || 'LOCAL_MEMORY');
    }
    return res;
  };

  const logout = () => {
    localStorage.removeItem('casebridge_token');
    setToken(null);
    setUser(null);
  };

  const resetDataToSeed = async () => {
    const res = await api.resetDemo();
    return res;
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      dbMode,
      isAuthenticated: !!user,
      login,
      demoSwitch,
      logout,
      resetDataToSeed
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
