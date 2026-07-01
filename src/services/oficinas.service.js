/**
 * Servicio de oficinas GEA.
 * Para lecturas frecuentes preferir {@link getOficinasCache} de `oficinas.cache.js`
 * que evita peticiones repetidas mientras el módulo vive.
 */
import api from './api';

/**
 * Obtiene la lista completa de oficinas registradas en el sistema.
 * @param {import('axios').AxiosRequestConfig} [config={}]
 * @returns {Promise<Object[]>}
 */
export const getOficinas = async (config = {}) => {
  return await api.get('/admin/oficinas', config);
};
