import api from './api';

export const login = async (credentials, config = {}) => {
  const raw = await api.post('/auth/login', credentials, config);

  const token = raw.token;

  // Mapeo explícito de todos los campos del usuario
  const user = {
    id:            raw.id            || raw.idUsuario || null,
    nombre:        raw.nombre        || null,
    correo:        raw.correo        || null,
    rol:           raw.rol           || null,
    idOficina:     raw.idOficina     || null,
    oficinaNombre: raw.oficinaNombre || null,
    fotoUrl:       raw.fotoUrl       || null,
  };

  if (token) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  }
  return raw;
};

export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

export const getCurrentUser = () => {
  const user = localStorage.getItem('user');
  try {
    return user ? JSON.parse(user) : null;
  } catch(e) {
    return null;
  }
};

export const getToken = () => {
  // Asegurarnos de limpiar comillas si se guardó mal en algún momento
  let token = localStorage.getItem('token');
  if (token && token.startsWith('"')) {
    token = JSON.parse(token);
  }
  return token;
};
