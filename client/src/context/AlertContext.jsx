import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

const AlertContext = createContext(null);

export const AlertProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [unacknowledgedCount, setUnacknowledgedCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [toast, setToast] = useState(null);

  const refreshNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await api.getNotifications();
      if (res.success) {
        setNotifications(res.data);
        setUnreadCount(res.unreadCount);
        setUnacknowledgedCount(res.unacknowledgedCount);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err.message);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      refreshNotifications();
      const interval = setInterval(refreshNotifications, 15000); // 15s refresh
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, refreshNotifications]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  return (
    <AlertContext.Provider value={{
      unreadCount,
      unacknowledgedCount,
      notifications,
      refreshNotifications,
      showToast,
      toast
    }}>
      {children}
      {toast && (
        <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-2.5 px-3.5 py-2.5 rounded-xs border text-xs font-medium bg-white text-gov-text shadow-sm ${
          toast.type === 'error'
            ? 'border-status-overdueBorder border-l-4 border-l-status-overdue'
            : toast.type === 'warning'
            ? 'border-status-pendingBorder border-l-4 border-l-status-pending'
            : 'border-status-disposedBorder border-l-4 border-l-status-disposed'
        }`}>
          <span>{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-3 text-gov-textMuted hover:text-gov-text text-xs p-0.5"
            title="Dismiss notification"
          >
            ✕
          </button>
        </div>
      )}
    </AlertContext.Provider>
  );
};

export const useAlert = () => useContext(AlertContext);
