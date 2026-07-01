/**
 * Servicio de anuncios GEA.
 *
 * Gestiona el ciclo de vida completo de anuncios internos:
 * creación, revisión (aprobar/rechazar/devolver), publicación y visibilidad.
 * El flujo de estados es PENDIENTE → APROBADA → PUBLICADA con posibilidad de RECHAZADA.
 */
import api from './api';

/**
 * Normaliza un anuncio crudo del backend al formato uniforme de la UI.
 * Acepta múltiples alias de campo para ser compatible con diferentes versiones de la API.
 * @param {Object} item - DTO crudo del backend.
 * @returns {Object} Anuncio normalizado.
 */
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
  observacionesRevision: item.observacionesRevision || null,
  visible: item.visible,
  fechaCreacion: item.fechaCreacion || null,
  oficina: item.oficinaNombre || item.oficina || '',
  usuarioSolicitanteCorreo: item.usuarioSolicitanteCorreo || '',
  usuarioSolicitanteNombre: item.usuarioSolicitanteNombre || '',
  requierePiezaGrafica: item.requierePiezaGrafica !== undefined ? item.requierePiezaGrafica : false
});

/**
 * Obtiene anuncios según el rol. OFICINA ve solo sus solicitudes propias;
 * Comunicaciones ve todas las solicitudes del sistema.
 * @param {string} [role='']
 * @returns {Promise<Object[]>}
 */
export const getAnuncios = async (role = '') => {
  const isOficina = role === 'OFICINA' || role === 'USUARIO_AUTENTICADO_APP';
  const endpoint = isOficina ? '/app/solicitudes-anuncio/mis-solicitudes' : '/comunicaciones/solicitudes-anuncio';
  const dataList = await api.get(endpoint);
  return (dataList || []).map(mapAnuncioDTO);
};

/**
 * Obtiene todos los anuncios publicados visibles (endpoint público).
 * @returns {Promise<Object[]>}
 */
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

export const devolverAnuncio = async (id, payload) => {
  return await api.post(`/comunicaciones/solicitudes-anuncio/${id}/devolver`, payload);
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
