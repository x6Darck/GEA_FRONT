/**
 * Servicio de gestión de usuarios GEA (solo accesible para SUPER_ADMIN / ADMIN).
 *
 * Incluye un mapeo de roles que acepta tanto el ID numérico como el nombre interno
 * del backend, para ser resiliente a cambios en la representación del rol entre versiones.
 */
import api from './api';

/**
 * Convierte el valor de rol del backend (ID numérico, nombre interno u objeto)
 * al nombre legible para la UI. Centralizado aquí para que cualquier cambio en
 * los nombres de rol del backend se resuelva en un solo lugar.
 * @param {string|number|Object} rol
 * @returns {string} Nombre de rol legible.
 */
const getRoleDisplayName = (rol) => {
  if (!rol) return 'Otros';
  
  // Mapeo unificado para todo tipo de entrada (ID o Nombre Interno)
  const rolesMap = {
    '1': 'Super Administrador',
    'SUPER_ADMIN': 'Super Administrador',
    'ADMIN': 'Administrador',
    '2': 'Comunicaciones',
    'COMUNICACIONES': 'Comunicaciones',
    '3': 'Oficina',
    'OFICINA': 'Oficina',
    '4': 'Usuario Autenticado',
    'USUARIO_AUTENTICADO_APP': 'Usuario Autenticado',
    '5': 'Consultoría',
    'CONSULTORIA': 'Consultoría',
    'USUARIO_APP': 'Usuario APP'
  };
  
  // 1. Si es un objeto, intentar con 'id' o 'nombre'
  if (typeof rol === 'object') {
    const idStr = rol.id?.toString();
    if (idStr && rolesMap[idStr]) return rolesMap[idStr];
    
    const nameStr = (rol.nombre || '').toString().toUpperCase();
    if (nameStr && rolesMap[nameStr]) return rolesMap[nameStr];
    
    return rol.nombre || 'Otros';
  }

  // 2. Si es un número o string directo
  const key = rol.toString().toUpperCase();
  return rolesMap[key] || key || 'Otros';
};

/**
 * Normaliza un usuario crudo del backend al formato uniforme de la UI.
 * Preserva `rol` e `idOficina` en su forma original para que el drawer de edición
 * pueda rellenar los selectores correctamente.
 * @param {Object} user - DTO crudo del backend.
 * @returns {Object} Usuario normalizado.
 */
export const mapUsuarioDTO = (user) => ({
  id: user.id || user.idUsuario,
  nombres: user.nombres || user.nombre,
  apellidos: user.apellidos,
  celular: user.celular || user.telefono || '',
  email: user.email || user.correo || 'Sin correo',
  roleName: getRoleDisplayName(user.rol),
  fotoUrl: user.fotoUrl || null,
  estado: user.estado || 'ACTIVO',
  rol: user.rol, // RESTAURADO: Necesario para que el Drawer identifique el rol original
  idOficina: user.idOficina || user.oficina?.id, // RESTAURADO: Necesario para que el Drawer identifique la oficina original
  oficinaNombre: user.oficina?.nombre || user.oficinaNombre || 'No asignada'
});

/**
 * Obtiene la lista de usuarios del sistema con filtros opcionales.
 * @param {Object} [params={}] - Parámetros de query (ej. { estado: 'ACTIVO' }).
 * @param {import('axios').AxiosRequestConfig} [config={}]
 * @returns {Promise<Object[]>} Lista de usuarios normalizados.
 */
export const getUsuarios = async (params = {}, config = {}) => {
  const dataList = await api.get('/admin/usuarios', { params, ...config });
  return (dataList || []).map(mapUsuarioDTO);
};

export const createUsuario = async (usuario) => {
  return await api.post('/admin/usuarios', usuario);
};

export const updateUsuario = async (id, usuario) => {
  return await api.put(`/admin/usuarios/${id}`, usuario);
};

export const deleteUsuario = async (id) => {
  return await api.delete(`/admin/usuarios/${id}`);
};
