// src/components/Toast.jsx
//
// Lightweight toast popup — replaces browser alert() calls.
// Usage:  import { ToastProvider, useToast } from './Toast';
//         Wrap app in <ToastProvider>, then call toast('message') anywhere.

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { PlanetIcon } from './EphiIcons.jsx';

const ToastContext = createContext(() => {});

export function useToast() {
  return useContext(ToastContext);
}

function ToastItem({ message, onDone }) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setExiting(true), 2800);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (exiting) {
      const t = setTimeout(onDone, 300);
      return () => clearTimeout(t);
    }
  }, [exiting, onDone]);

  return (
    <div style={{
      ...styles.toast,
      animation: exiting ? 'toastOut 0.3s ease forwards' : 'toastIn 0.3s ease forwards',
    }}>
      <span style={styles.icon}><PlanetIcon name="moon" size={15} color="#c9a0dc" /></span>
      <span style={styles.text}>{message}</span>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((message) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message }]);
  }, []);

  const remove = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Toast container */}
      {toasts.length > 0 && (
        <div style={styles.container}>
          {toasts.map(t => (
            <ToastItem key={t.id} message={t.message} onDone={() => remove(t.id)} />
          ))}
        </div>
      )}
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(16px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes toastOut {
          from { opacity: 1; transform: translateY(0) scale(1); }
          to   { opacity: 0; transform: translateY(-8px) scale(0.96); }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

const styles = {
  container: {
    position: 'fixed',
    bottom: '80px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    pointerEvents: 'none',
  },
  toast: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    background: '#1e293b',
    color: '#fdfbf7',
    padding: '12px 20px',
    borderRadius: '10px',
    fontFamily: "'Outfit', sans-serif",
    fontSize: '0.88rem',
    fontWeight: '500',
    boxShadow: '0 8px 30px rgba(0,0,0,0.18)',
    maxWidth: '380px',
    pointerEvents: 'auto',
  },
  icon: {
    fontSize: '1rem',
    color: '#c9a0dc',
    flexShrink: 0,
  },
  text: {
    lineHeight: 1.4,
  },
};
