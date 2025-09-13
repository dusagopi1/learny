import React, { useState, useEffect, createContext, useContext } from 'react';
import { FaCheckCircle, FaTimesCircle } from 'react-icons/fa';

const ToastContext = createContext();

export const useToast = () => {
  return useContext(ToastContext);
};

export const ToastProvider = ({ children }) => {
  const [toast, setToast] = useState(null); // { message, type: 'success' | 'error' }

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 3000); // Toast disappears after 3 seconds
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <div className={`toast-notification toast-${toast.type} slide-in-right`}>
          {toast.type === 'success' ? <FaCheckCircle /> : <FaTimesCircle />}
          <span>{toast.message}</span>
        </div>
      )}
    </ToastContext.Provider>
  );
};

export default function Toast() {
  const { toast } = useToast(); // The actual toast state is managed in ToastProvider

  if (!toast) return null;

  return (
    <div className={`toast-notification toast-${toast.type} slide-in-right`}>
      {toast.type === 'success' ? <FaCheckCircle /> : <FaTimesCircle />}
      <span>{toast.message}</span>
    </div>
  );
}
