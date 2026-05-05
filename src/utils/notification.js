import { toast } from 'react-toastify';

/**
 * Unified notification system for CallApp.
 * Provides a consistent style across the entire application.
 */
const notification = {
  success: (message) => {
    toast.success(message, {
      style: {
        borderRadius: '10px',
        background: '#fff',
        color: '#16a34a', // var(--success)
        borderLeft: '5px solid #16a34a',
        fontWeight: '500'
      },
      icon: '✅'
    });
  },
  
  error: (message, toastId = null) => {
    toast.error(message, {
      toastId: toastId || message, // Prevent duplicates if same message
      style: {
        borderRadius: '10px',
        background: '#fff',
        color: '#333',
        borderLeft: '5px solid #D32F2F', // var(--primary)
        fontWeight: '500'
      },
      icon: '⚠️'
    });
  },
  
  info: (message) => {
    toast.info(message, {
      style: {
        borderRadius: '10px',
        background: '#fff',
        color: '#1976D2', // var(--info)
        borderLeft: '5px solid #1976D2',
        fontWeight: '500'
      },
      icon: 'ℹ️'
    });
  },
  
  warning: (message) => {
    toast.warning(message, {
      style: {
        borderRadius: '10px',
        background: '#fff',
        color: '#FFA000', // var(--warning)
        borderLeft: '5px solid #FFA000',
        fontWeight: '500'
      },
      icon: '🔔'
    });
  }
};

export default notification;
