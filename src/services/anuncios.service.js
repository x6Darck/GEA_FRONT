import api from './api';

export const mapAnuncioDTO = (item) => ({
  id: item.id || item.idSolicitud,
  titulo: item.titulo || item.title || item.tituloVisible || '',
  descripcion: item.descripcion || item.desc || item.descripcionVisible || '',
  categoria: item.categoria || item.category || item.type || '',
  lugar: item.lugar || '',
  lugares: item.lugares || [],
  idsLugaresFisicos: item.idsLugaresFisicos || [],
  correoContacto: item.correoContacto || '',
  responsableAnuncio: item.responsableAnuncio || '',
  fechaInicioPublicacion: item.fechaInicioPublicacion || null,
  fechaFinPublicacion: item.fechaFinPublicacion || null,
  horaInicio: item.horaInicio || null,
  horaFin: item.horaFin || null,
  piezaGraficaUrl: item.piezaGraficaUrl || null,
  status: item.estado || item.status || 'PENDIENTE',
  motivoRechazo: item.motivoRechazo || null,
  visible: item.visible,
  fechaCreacion: item.fechaCreacion || null,
  oficina: item.oficinaNombre || item.oficina || '',
  usuarioSolicitanteCorreo: item.usuarioSolicitanteCorreo || '',
  usuarioSolicitanteNombre: item.usuarioSolicitanteNombre || ''
});

export const getAnuncios = async (role = '') => {
  const isOficina = role === 'OFICINA' || role === 'USUARIO_AUTENTICADO_APP';
  const endpoint = isOficina ? '/app/solicitudes-anuncio/mis-solicitudes' : '/comunicaciones/solicitudes-anuncio';
  const dataList = await api.get(endpoint);
  return (dataList || []).map(mapAnuncioDTO);
};

export const getAnunciosPublicados = async () => {
  const dataList = await api.get('/app/anuncios/publicados');
  return (dataList || []).map(mapAnuncioDTO);
};

export const createAnuncio = async (anuncio) => {
  return await api.post('/app/solicitudes-anuncio', anuncio);
};

export const updateAnuncio = async (id, anuncio) => {
  return await api.put(`/app/solicitudes-anuncio/${id}`, anuncio);
};

export const deleteAnuncio = async (id) => {
  return await api.delete(`/app/solicitudes-anuncio/${id}`);
};

export const aprobarAnuncio = async (id) => {
  return await api.post(`/comunicaciones/solicitudes-anuncio/${id}/aprobar`);
};

export const rechazarAnuncio = async (id, payload) => {
  return await api.post(`/comunicaciones/solicitudes-anuncio/${id}/rechazar`, payload);
};

export const publicarAnuncio = async (id, payload) => {
  return await api.post(`/comunicaciones/solicitudes-anuncio/${id}/publicar`, payload);
};

export const toggleVisibilidadAnuncio = async (id, visible) => {
  return await api.patch(`/comunicaciones/anuncios-publicados/${id}/visibilidad?visible=${visible}`);
};

export const deletePublicacionAnuncio = async (id) => {
  return await api.delete(`/comunicaciones/anuncios-publicados/${id}`);
};

export const updatePublicacionAnuncio = async (id, data) => {
  return await api.put(`/comunicaciones/anuncios-publicados/${id}`, data);
};
