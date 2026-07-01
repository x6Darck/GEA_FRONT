/**
 * Resuelve una URL de imagen para que sea absoluta y apta para etiquetas `<img>`.
 *
 * Maneja cuatro casos:
 * 1. URLs de localhost con puerto — las reescribe como relativas al servidor actual
 *    para funcionar tanto en dev (puerto 5173) como en producción (sin cambiar config).
 * 2. URLs externas absolutas, blobs y data URIs — las retorna sin modificar.
 * 3. URLs relativas — construye la base dinámica usando `window.location.hostname`
 *    y el puerto 8083 del backend, añadiendo el prefijo `/api` del context-path.
 * 4. Nulo/vacío — retorna `null`.
 * @param {string|null} url
 * @returns {string|null}
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
