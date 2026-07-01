import { toast } from 'react-toastify';

/**
 * Sistema de notificaciones toast de GEA.
 *
 * Centraliza el estilo visual de todos los toasts para que cualquier cambio de
 * marca (color, borde, fuente) se aplique a toda la aplicación desde un solo lugar.
 * Usa `toastId = message` en errores para evitar mostrar el mismo mensaje dos veces
 * cuando múltiples peticiones fallan simultáneamente.
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
