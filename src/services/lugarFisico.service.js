/**
 * Servicio de lugares físicos GEA.
 * Obtiene el catálogo de espacios disponibles para asociar a eventos.
 */
import api from './api';

/**
 * Retorna todos los lugares físicos activos del sistema (salas, auditorios, externos).
 * @returns {Promise<Object[]>}
 */
const getLugaresFisicos = async () => {
  return await api.get('/lugares-fisicos');
};

export default {
  getLugaresFisicos,
};
