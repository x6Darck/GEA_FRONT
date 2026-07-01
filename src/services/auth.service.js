/**
 * Servicio de autenticación GEA.
 *
 * El token JWT viaja únicamente como cookie HttpOnly `gea_auth` — nunca se
 * almacena en localStorage. Lo que sí se guarda en localStorage son los
 * metadatos de display del usuario (nombre, rol, foto) bajo la clave `user`.
 */
import api from './api';

/**
 * Inicia sesión con credenciales locales.
 * Persiste los metadatos del usuario en localStorage para que la UI los lea sin
 * necesidad de una petición extra al backend en cada render.
 * @param {{ correo: string, password: string }} credentials
 * @param {import('axios').AxiosRequestConfig} [config] - Configuración adicional (ej. skipGlobalError).
 * @returns {Promise<Object>} Objeto con token (para mobile) y metadatos del usuario.
 */
export const login = async (credentials, config = {}) => {
  const raw = await api.post('/auth/login', credentials, config);

  // El token viaja en la cookie HttpOnly — no se almacena en localStorage
  const user = {
    id:            raw.id            || raw.idUsuario || null,
    nombre:        raw.nombre        || null,
    correo:        raw.correo        || null,
    rol:           raw.rol           || null,
    idOficina:     raw.idOficina     || null,
    oficinaNombre: raw.oficinaNombre || null,
    fotoUrl:       raw.fotoUrl       || null,
  };

  localStorage.setItem('user', JSON.stringify(user));
  return raw;
};

/**
 * Cierra la sesión del usuario.
 * Llama al backend para revocar la cookie HttpOnly (blacklist del JTI) y luego
 * limpia el localStorage. El fallo del backend se ignora intencionalmente: si el
 * token ya expiró el usuario debe poder cerrar sesión igualmente.
 * @returns {Promise<void>}
 */
export const logout = async () => {
  try {
    await api.post('/auth/logout');
  } catch {
    // El backend puede fallar si el token ya expiró — continuar igual
  } finally {
    localStorage.removeItem('user');
    // Limpiar token residual de sesiones anteriores a la migración
    localStorage.removeItem('token');
  }
};

/**
 * Recupera los metadatos del usuario actual desde localStorage.
 * Retorna `null` si no hay sesión o si el JSON está corrupto.
 * @returns {Object|null}
 */
export const getCurrentUser = () => {
  const user = localStorage.getItem('user');
  try {
    return user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
};

/**
 * Stub de compatibilidad. El token real es una cookie HttpOnly — no accesible
 * desde JS. Esta función existe para no romper código legacy que la importaba.
 * @returns {null}
 */
export const getToken = () => null;
