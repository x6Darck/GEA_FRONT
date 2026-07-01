/**
 * Servicio de reportes y métricas del dashboard GEA.
 *
 * Maneja tanto la generación/descarga de reportes en PDF/Excel como la obtención
 * de estadísticas para el dashboard. El alcance de los datos (global vs. por oficina)
 * lo controla el backend según el rol del usuario autenticado.
 */
import api from './api';

/**
 * Normaliza un reporte crudo del backend al formato de la UI.
 * @param {Object} report - DTO crudo del backend.
 * @returns {Object} Reporte normalizado.
 */
export const mapReporteDTO = (report) => ({
  id: report.id || report.idReporte,
  titulo: report.titulo || report.nombre || `Reporte #${report.id || report.idReporte}`,
  descripcion: report.descripcion || report.detalle,
  fecha: report.fechaCreacion || report.fecha || report.fechaGeneracion || '-',
  desde: report.desde,
  hasta: report.hasta,
  formato: report.formato || 'PDF',
  usuarioCorreo: report.usuarioGeneradorCorreo || 'Anónimo',
  usuarioOficina: report.usuarioGeneradorOficina || 'N/A'
});

/**
 * Obtiene el historial de reportes generados, con filtros opcionales de fecha y oficina.
 * @param {{ idOficina?: number, desde?: string, hasta?: string }} [filters={}]
 * @returns {Promise<Object[]>}
 */
export const getReportes = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.idOficina) params.append('idOficina', filters.idOficina);
  if (filters.desde) params.append('desde', filters.desde);
  if (filters.hasta) params.append('hasta', filters.hasta);

  const response = await api.get(`/reportes/solicitudes?${params.toString()}`);
  return (Array.isArray(response) ? response : []).map(mapReporteDTO);
};

export const createReporte = async (reportData) => {
  return await api.post('/reportes/solicitudes', reportData);
};

/**
 * Descarga el archivo generado de un reporte como Blob (PDF o Excel).
 * @param {number} id
 * @returns {Promise<Blob>}
 */
export const exportReporte = async (id) => {
  return await api.get(`/reportes/solicitudes/${id}/export`, {
    responseType: 'blob'
  });
};

export const updateReporte = async (id, data) => {
  return await api.put(`/reportes/solicitudes/${id}`, data);
};

/**
 * Obtiene las métricas del dashboard (KPIs + series de gráficas).
 * El backend aplica scope automáticamente según el rol: SUPER_ADMIN/ADMIN ven
 * datos globales; el resto ve solo su oficina.
 * @param {{ idOficina?: number, desde?: string, hasta?: string, tipo?: string }} [filters={}]
 * @returns {Promise<Object>} Objeto con resumen y series para las gráficas.
 */
export const getDashboardStats = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.idOficina) params.append('idOficina', filters.idOficina);
  if (filters.desde) params.append('desde', filters.desde);
  if (filters.hasta) params.append('hasta', filters.hasta);
  if (filters.tipo && filters.tipo !== 'GLOBAL') params.append('tipo', filters.tipo);

  return await api.get(`/reportes/dashboard?${params.toString()}`);
};
