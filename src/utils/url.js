/**
 * Resuelve una URL de imagen para asegurar que sea absoluta y válida para etiquetas <img>.
 * @param {string} url - La URL original (puede ser relativa, absoluta o nula).
 * @returns {string|null} - La URL resuelta o null si no hay entrada.
 */
export const resolveImageUrl = (url) => {
  if (!url) return null;

  // Si es una URL absoluta de localhost, la normalizamos para usar el puerto actual
  if (url.startsWith('http://localhost') || url.startsWith('https://localhost') || url.startsWith('http://127.0.0.1')) {
    const relativePart = url.split('/api/').pop() || url.split('/archivos/').pop();
    if (relativePart && relativePart !== url) {
      url = `/archivos/${relativePart.includes('public/') ? '' : 'public/'}${relativePart.replace('public/', '')}`;
    }
  }

  // Si ya es una URL absoluta (HTTP/HTTPS) externa o un Blob/Data, retornar tal cual
  if ((url.startsWith('http') && !url.includes('localhost')) || url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }

  // Obtener la URL base dinámica (IGUAL que en api.js)
  const getBaseURL = () => {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    if (hostname === 'localhost' || hostname.startsWith('192.168.') || hostname.startsWith('172.')) {
      return `${protocol}//${hostname}:8083`;
    }
    return import.meta.env.VITE_API_URL || 'http://localhost:8083';
  };

  let base = getBaseURL();
  base = base.endsWith('/') ? base.slice(0, -1) : base;

  // IMPORTANTE: El backend tiene server.servlet.context-path=/api
  if (!base.endsWith('/api')) {
    base = `${base}/api`;
  }

  const path = url.startsWith('/') ? url : `/${url}`;
  return `${base}${path}`;
};
