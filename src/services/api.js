import axios from 'axios';
import notification from '../utils/notification';

const getBaseURL = () => {
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  
  // Si estamos en red local (IP o localhost)
  if (hostname === 'localhost' || hostname.startsWith('192.168.') || hostname.startsWith('172.')) {
    return `${protocol}//${hostname}:8083`;
  }
  
  // Si no, usar la URL del túnel definida en .env
  return import.meta.env.VITE_API_URL || 'http://localhost:8083';
};

const API_URL = getBaseURL();

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Bypass-Tunnel-Reminder': 'true'
  }
});

api.interceptors.request.use(
  (config) => {
    let token = localStorage.getItem('token');
    
    if (token && token.startsWith('"')) {
      token = JSON.parse(token);
    }

    if (token && token !== 'undefined' && token !== 'null') {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
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
    } else {
      errorMessage = error.response.data?.message || error.response.data?.error || `Error ${error.response.status}: Servidor no disponible`;
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
