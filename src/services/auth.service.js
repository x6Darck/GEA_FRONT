import api from './api';

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

export const getCurrentUser = () => {
  const user = localStorage.getItem('user');
  try {
    return user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
};

export const getToken = () => null;
