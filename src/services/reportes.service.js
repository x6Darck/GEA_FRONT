import api from './api';

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

export const exportReporte = async (id) => {
  return await api.get(`/reportes/solicitudes/${id}/export`, {
    responseType: 'blob'
  });
};

export const updateReporte = async (id, data) => {
  return await api.put(`/reportes/solicitudes/${id}`, data);
};

export const getDashboardStats = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.idOficina) params.append('idOficina', filters.idOficina);
  if (filters.desde) params.append('desde', filters.desde);
  if (filters.hasta) params.append('hasta', filters.hasta);
  if (filters.tipo && filters.tipo !== 'GLOBAL') params.append('tipo', filters.tipo);

  return await api.get(`/reportes/dashboard?${params.toString()}`);
};
