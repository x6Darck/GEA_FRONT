import axios from 'axios';
import notification from '../utils/notification';

// En dev usa la URL relativa '' para que el proxy de Vite enrute /api → localhost:8083
// En producción definir VITE_API_URL con el dominio real del backend
const API_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true,
  headers: {
    'Bypass-Tunnel-Reminder': 'true'
  }
});

api.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error)
);

let lastNotificationTime = 0;
const NOTIFICATION_COOLDOWN = 3000; // 3 segundos para evitar spam de conexión

api.interceptors.response.use(
  (response) => {
    // Si es un ApiResponse estandar del backend { success, data, message }
    if (response.data && Object.prototype.hasOwnProperty.call(response.data, 'success')) {
      if (response.data.success) {
        return response.data.data; 
      }
    }
    return response.data || response;
  },
  (error) => {
    const config = error.config || {};
    const status = error.response?.status;
    const url = config.url || '';

    // Marcar el error para que componentes sepan que ya se notificó
    error.handledByInterceptor = false;

    // Determinar si debemos omitir la notificación global
    const skipGlobalError = config.skipGlobalError || false;

    // Extraer mensaje
    let errorMessage = 'Error inesperado en el sistema';
    let isConnectivityError = false;

    if (!error.response) {
      errorMessage = 'Error de conexión: No se pudo contactar con el servidor';
      isConnectivityError = true;
    } else if (status >= 500) {
      // No exponer mensajes internos del servidor al usuario
      errorMessage = 'Error interno del servidor. Por favor intenta más tarde.';
    } else {
      errorMessage = error.response.data?.message || error.response.data?.error || 'Error inesperado en el sistema';
    }

    // 403: mensaje claro de permisos cuando el backend no especifica uno (no se cierra sesión)
    if (status === 403 && !error.response?.data?.message && !error.response?.data?.error) {
      errorMessage = 'No tienes permisos para realizar esta acción.';
    }

    // Lógica de Silencio para rutas específicas (ej. Login maneja sus propios 401)
    const isLoginPath = url.includes('/auth/login');
    const isAuthError = status === 401 || status === 403;

    // Evitar notificaciones globales si se solicita, o si es un error de auth en el login
    const shouldNotify = !skipGlobalError && !(isLoginPath && isAuthError);

    if (shouldNotify) {
      const now = Date.now();
      // Si es error de conexión, aplicar cooldown para no saturar si fallan 10 peticiones a la vez
      if (!isConnectivityError || (now - lastNotificationTime > NOTIFICATION_COOLDOWN)) {
        notification.error(errorMessage);
        if (isConnectivityError) lastNotificationTime = now;
        error.handledByInterceptor = true;
      } else if (isConnectivityError) {
        // Marcamos como manejado aunque no hayamos mostrado el toast esta vez (por el cooldown)
        error.handledByInterceptor = true;
      }
    }

    if (status === 401) {
      const silentRoutes = [
        '/auth/login',
        '/oficinas',
        '/usuario/tipos-evento',
        '/admin/usuarios',
      ];
      const isSilentRoute = silentRoutes.some(r => url.includes(r));

      if (!isSilentRoute) {
        window.dispatchEvent(new CustomEvent('auth-error', { detail: errorMessage }));
      }
    }

    return Promise.reject(error);
  }
);

export default api;
