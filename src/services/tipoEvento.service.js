/**
 * Servicio del catálogo de tipos de evento GEA.
 * Cada tipo tiene un nombre y un color hexadecimal (#RRGGBB) para la UI del calendario.
 */
import api from './api';

/**
 * Obtiene todos los tipos de evento activos del catálogo.
 * @returns {Promise<Array<{ id: number, nombre: string, colorHex: string }>>}
 */
export const getTiposEvento = async () => {
  return await api.get('/usuario/tipos-evento');
};
