import api from './api';

export const mapEventoDTO = (evt) => {
  // Para depuración rápida si sigue fallando (ver consola F12)
  if (evt && (evt.nombreEvento || evt.idSolicitud)) {
    console.log("Evento Pirot (Detalle/Lista):", evt);
  }

  // Normalizar participantes uno por uno
  const rawParticipantes = evt.participantes || evt.participante || evt.participants || 
                           evt.solicitudParticipantes || evt.eventoParticipantes || 
                           evt.participantesList || [];
  
  let normParticipantes = (Array.isArray(rawParticipantes) && rawParticipantes.length > 0) ? rawParticipantes.map(p => {
    // Manejar tipo que puede ser String o un Objeto { id, nombre }
    let normTipo = p.tipo;
    if (p.tipo && typeof p.tipo === 'object') {
      normTipo = p.tipo.nombre || p.tipo.tipo || p.tipo.id;
    }
    
    return {
      ...p,
      tipo: (normTipo || '').toString().toUpperCase(), // Siempre uppercase para el filtro de la UI
      nombre: p.nombre || p.fullName || p.full_name || p.nombres || 'Sin nombre',
      cargo: p.cargo || p.position || p.role || 'Participante',
      fotoUrl: p.fotoUrl || p.foto_url || p.avatar || p.image || null
    };
  }) : [];

  // BLINDAJE V11/V12: Capa de Hidratación Local. Si no hay participantes, buscar en el caché de la sesión
  const eventId = evt.id || evt.idSolicitud;
  const nombreEvento = evt.nombreEvento || evt.nombre || '';
  const fechaEvento = evt.fechaEvento || evt.fecha || '';
  
  if (normParticipantes.length === 0) {
    try {
      // 1. Intentar por ID
      let cachedString = eventId ? localStorage.getItem(`event_hydra_${eventId}`) : null;
      
      // 2. Intentar por CLAVE DIFUSA si la anterior falló (Nombre + Fecha)
      if (!cachedString && nombreEvento && fechaEvento) {
        const fuzzyKey = `event_hydra_f_${nombreEvento.substring(0,20)}_${fechaEvento}`;
        cachedString = localStorage.getItem(fuzzyKey);
      }

      if (cachedString) {
        const cache = JSON.parse(cachedString);
        if (cache && Array.isArray(cache.participantes)) {
          console.log(`Hidratando evento ${eventId || 'fuzzy'} desde caché local...`);
          normParticipantes = cache.participantes;
        }
      }
    } catch (e) {
      console.warn("Error leyendo caché de hidratación:", e);
    }
  }
  
  // BLINDAJE V10: Si al final no hay nada, pero hay un responsable, crear participante virtual 
  if (normParticipantes.length === 0 && (evt.responsableEvento || evt.responsable)) {
     normParticipantes.push({
        id: 'virtual-resp',
        nombre: evt.responsableEvento || evt.responsable,
        tipo: 'ORGANIZADOR',
        cargo: 'Organizador Responsable',
        fotoUrl: evt.responsableFotoUrl || evt.fotoResponsable || evt.logoResponsable || evt.responsableFoto || null, 
        descripcion: 'Asignado como responsable de esta solicitud.',
        virtual: true
     });
  }

  return {
    id: evt.id || evt.idSolicitud,
    nombre: evt.nombreEvento || evt.tituloVisible || evt.nombre || evt.titulo || '',
    desc: evt.descripcionEvento || evt.descripcionVisible || evt.desc || evt.descripcion || '',
    fecha: (() => {
      const f = evt.fechaEvento || evt.start || evt.fechaHoraInicio || null;
      if (Array.isArray(f) && f.length >= 3) {
        return `${f[0]}-${String(f[1]).padStart(2, '0')}-${String(f[2]).padStart(2, '0')}`;
      }
      return f;
    })(),
    horaInicio: evt.horaInicio || null,
    horaFin: evt.horaFin || null,
    office: evt.oficinaNombre || evt.office || evt.oficina?.nombre || '',
    status: evt.estado || evt.status || 'Pendiente',
    lugar: evt.lugar || '',
    responsable: evt.responsableEvento || evt.responsable || '',
    motivoRechazo: evt.motivoRechazo || null,
    observacionesRevision: evt.observacionesRevision || null,
    participantes: normParticipantes,
    tipoEvento: evt.tipoEvento || '',
    tipoEventoColorHex: evt.tipoEventoColorHex || null,
    tipoIngreso: evt.tipoIngreso || 'LIBRE',
    piezaGraficaUrl: evt.piezaGraficaUrl || null,
    linkConexion: evt.linkConexion || evt.enlace || evt.link || '',
    solicitanteEmail: evt.usuarioSolicitanteCorreo || '',
    fechaRegistro: evt.fechaCreacion || evt.createdAt || evt.fechaPeticion || null,
    visible: evt.visible,
    // CAMPOS NUEVOS: Propagar directamente desde el objeto original (evt)
    lugares: evt.lugares || [],
    idsLugaresFisicos: evt.idsLugaresFisicos || [],
    requiereTransmision: evt.requiereTransmision || evt.requiere_transmision || false,
    requiereCubrimiento: evt.requiereCubrimiento || evt.requiere_cubrimiento || false,
    requierePiezaGrafica: evt.requierePiezaGrafica || evt.requiere_pieza_grafica || false,
    requiereServiciosGenerales: evt.requiereServiciosGenerales || evt.requiere_servicios_generales || false,
    observaciones: evt.observaciones || evt.observaciones_adicionales || '',
    esImportante: evt.esImportante || evt.es_importante || false,
    idGrupoRecurrencia: evt.idGrupoRecurrencia || null,
    frecuenciaRecurrencia: evt.frecuenciaRecurrencia || 'NINGUNA',
    fechaFinRecurrencia: evt.fechaFinRecurrencia || null,
    esPrincipal: evt.esPrincipal || false
  };
};

export const getEventosSolicitudes = async (role = '') => {
  const isOficina = role === 'OFICINA' || role === 'USUARIO_AUTENTICADO_APP';
  const endpoint = isOficina ? '/oficina/solicitudes-evento' : '/comunicaciones/solicitudes-evento';
  const dataList = await api.get(endpoint);
  return (dataList || []).map(mapEventoDTO);
};

export const getEventosPublicados = async () => {
  const dataList = await api.get('/app/eventos/publicados');
  return (dataList || []).map(mapEventoDTO);
};

export const getEventos = getEventosSolicitudes;

export const getOficinaById = async (id) => {
  return await api.get(`/oficina/${id}`);
};

export const getEventoById = async (id, role = '') => {
  const isOficina = role === 'OFICINA' || role === 'USUARIO_AUTENTICADO_APP';
  const endpoint = isOficina ? `/oficina/solicitudes-evento/${id}` : `/comunicaciones/solicitudes-evento/${id}`;
  const data = await api.get(endpoint);
  return mapEventoDTO(data);
};

export const createEvento = async (evento) => {
  return await api.post('/oficina/solicitudes-evento', evento);
};

export const updateEvento = async (id, evento) => {
  return await api.put(`/oficina/solicitudes-evento/${id}`, evento);
};

export const updateEventoSerie = async (idGrupo, payload) => {
  return await api.put(`/oficina/solicitudes-evento/serie/${idGrupo}`, payload);
};

export const publicarEvento = async (id, publicacionPayload) => {
  return await api.post(`/comunicaciones/solicitudes-evento/${id}/publicar`, publicacionPayload);
};

export const deleteEvento = async (id) => {
  return await api.delete(`/oficina/solicitudes-evento/${id}`);
};

export const toggleVisibilidadEvento = async (id, visible) => {
  return await api.patch(`/comunicaciones/eventos-publicados/${id}/visibilidad?visible=${visible}`);
};

export const deletePublicacionEvento = async (id) => {
  return await api.delete(`/comunicaciones/eventos-publicados/${id}`);
};

export const updatePublicacionEvento = async (id, data) => {
  return await api.put(`/comunicaciones/eventos-publicados/${id}`, data);
};

export const aprobarEvento = async (id) => {
  return await api.post(`/comunicaciones/solicitudes-evento/${id}/aprobar`);
};

export const rechazarEvento = async (id, payload) => {
  return await api.post(`/comunicaciones/solicitudes-evento/${id}/rechazar`, payload);
};

export const devolverEvento = async (id, payload) => {
  return await api.post(`/comunicaciones/solicitudes-evento/${id}/devolver`, payload);
};

export const addParticipante = async (eventoId, participante) => {
  return await api.post(`/comunicaciones/solicitudes-evento/${eventoId}/participantes`, participante);
};

export const deleteParticipante = async (eventoId, participanteId) => {
  return await api.delete(`/comunicaciones/solicitudes-evento/${eventoId}/participantes/${participanteId}`);
};

export const aprobarSerie = async (idGrupo) => {
  return await api.post(`/comunicaciones/solicitudes-evento/serie/${idGrupo}/aprobar`);
};

export const publicarSerie = async (idGrupo, payload) => {
  return await api.post(`/comunicaciones/solicitudes-evento/serie/${idGrupo}/publicar`, payload);
};

export const eliminarSerie = async (idGrupo, role = '') => {
  const isOficina = role === 'OFICINA' || role === 'USUARIO_AUTENTICADO_APP';
  const endpoint = isOficina ? `/oficina/solicitudes-evento/serie/${idGrupo}` : `/comunicaciones/solicitudes-evento/serie/${idGrupo}`;
  return await api.delete(endpoint);
};

export const exportarAgendaPdf = async (desde, hasta) => {
  return await api.get(`/app/eventos/agenda/export/pdf?desde=${desde}&hasta=${hasta}`, {
    responseType: 'blob'
  });
};
