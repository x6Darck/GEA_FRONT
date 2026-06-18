import { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import {
  publicarEvento,
  toggleVisibilidadEvento,
  deleteEvento,
  updateEvento,
  updateEventoSerie,
  updatePublicacionEvento,
  aprobarSerie,
  publicarSerie,
  eliminarSerie,
  devolverEvento
} from '../services/eventos.service';
import { uploadArchivo } from '../services/archivos.service';
import api from '../services/api';
import notification from '../utils/notification';

export const useEventManagement = (event, onSuccess, onClose) => {
  const { user } = useContext(AuthContext);
  
  // States
  const [isEditing, setIsEditing] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const [manageLoading, setManageLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [reviewObservations, setReviewObservations] = useState('');

  // Form fields
  const [formData, setFormData] = useState({
    nombreEvento: '',
    descripcionEvento: '',
    fechaEvento: '',
    horaInicio: '',
    horaFin: '',
    // lugar: '', // Deprecated
    lugares: [],
    idsLugaresFisicos: [],
    linkConexion: '',
    tipoEvento: '',
    participantes: [],
    esImportante: false,
    requierePiezaGrafica: false,
    frecuenciaRecurrencia: 'NINGUNA',
    fechaFinRecurrencia: '',
  });

  // Serie recurrente: aplicar cambios a toda la serie o solo a esta iteración
  const [aplicarASerie, setAplicarASerie] = useState(false);

  // Media states
  const [publishFile, setPublishFile] = useState(null);
  const [publishFilePreview, setPublishFilePreview] = useState(null);
  const [localVisible, setLocalVisible] = useState(true);

  // Initialize form
  useEffect(() => {
    if (event) {
      setLocalVisible(event.visible !== false);
      setPublishFilePreview(event.piezaGraficaUrl || null);
      
      let formattedFecha = '';
      if (event.fecha) {
        if (typeof event.fecha === 'string') {
          formattedFecha = event.fecha.split('T')[0];
        } else if (Array.isArray(event.fecha)) {
          formattedFecha = `${event.fecha[0]}-${String(event.fecha[1]).padStart(2, '0')}-${String(event.fecha[2]).padStart(2, '0')}`;
        }
      }

      setFormData({
        nombreEvento: event.nombreEvento || event.nombre || '',
        descripcionEvento: event.descripcionEvento || event.desc || '',
        fechaEvento: formattedFecha,
        horaInicio: event.horaInicio || '',
        horaFin: event.horaFin || '',
        lugares: event.lugares || [],
        idsLugaresFisicos: event.idsLugaresFisicos || [],
        linkConexion: event.linkConexion || '',
        tipoEvento: event.tipoEvento || '',
        office: event.oficinaNombre || event.office || '',
        idOficina: event.oficinaId || event.idOficina || '',
        responsable: event.responsableEvento || event.responsable || '',
        participantes: Array.isArray(event.participantes) ? event.participantes : [],
        requiereTransmision: event.requiereTransmision || false,
        requiereCubrimiento: event.requiereCubrimiento || false,
        observaciones: event.observaciones || '',
        esImportante: event.esImportante || false,
        requierePiezaGrafica: event.requierePiezaGrafica || false,
        frecuenciaRecurrencia: event.frecuenciaRecurrencia || 'NINGUNA',
        fechaFinRecurrencia: event.fechaFinRecurrencia ? (typeof event.fechaFinRecurrencia === 'string' ? event.fechaFinRecurrencia.split('T')[0] : event.fechaFinRecurrencia) : '',
      });
    }
  }, [event]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleStatusUpdate = async (type) => {
    if (type === 'Rechazar' && !rejecting) { setRejecting(true); return; }
    if (type === 'Rechazar' && (!rejectReason || rejectReason.trim() === '')) {
      alert('Por favor, ingrese un motivo de rechazo.'); return;
    }
    if (type === 'Devolver' && !reviewing) { setReviewing(true); return; }
    if (type === 'Devolver' && (!reviewObservations || reviewObservations.trim() === '')) {
      alert('Por favor, ingrese las observaciones para la oficina.'); return;
    }
    setLoadingAction(true);
    try {
      if (type === 'Aprobar') {
        await api.post(`/comunicaciones/solicitudes-evento/${event.id}/aprobar`);
        notification.success('Evento aprobado correctamente');
      } else if (type === 'Devolver') {
        await devolverEvento(event.id, { observaciones: reviewObservations });
        setReviewing(false);
        setReviewObservations('');
        notification.success('Solicitud devuelta para revisión');
      } else {
        await api.post(`/comunicaciones/solicitudes-evento/${event.id}/rechazar`, { motivo: rejectReason });
        notification.success('Evento rechazado');
      }
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      notification.error('Error al actualizar estado: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoadingAction(false);
    }
  };

  const handleSaveEdition = async () => {
    setManageLoading(true);
    try {
      let piezaUrl = event.piezaGraficaUrl;
      
      if (!publishFilePreview) {
          piezaUrl = null;
      }
      
      if (publishFile) {
        const uploadResult = await uploadArchivo(publishFile);
        piezaUrl = uploadResult.urlAcceso || uploadResult.urlDescarga || uploadResult.url;
      }
      
      const payload = {
        ...formData,
        responsableEvento: formData.responsable,
        idOficina: formData.idOficina,
        piezaGraficaUrl: piezaUrl,
        esImportante: formData.esImportante,
        requierePiezaGrafica: formData.requierePiezaGrafica,
        frecuenciaRecurrencia: formData.frecuenciaRecurrencia,
        fechaFinRecurrencia: formData.fechaFinRecurrencia || null,
        idsLugaresFisicos: formData.idsLugaresFisicos
      };
      
      const status = (event.status || '').toUpperCase();
      
      if (status === 'PUBLICADA') {
        const participantesPayload = (formData.participantes || [])
          .filter(p => !p.virtual)
          .map(p => ({
            nombre: p.nombre,
            cargo: p.cargo || '',
            descripcion: p.descripcion || '',
            fotoUrl: p.fotoUrl || null,
            telefono: p.telefono || null,
            correo: p.correo || null,
            tipo: (p.tipo || 'INVITADO').toString().toUpperCase()
          }));

        const pubPayload = {
          tituloVisible: formData.nombreEvento,
          descripcionVisible: formData.descripcionEvento,
          piezaGraficaUrl: piezaUrl,
          nombreEvento: formData.nombreEvento,
          descripcionEvento: formData.descripcionEvento,
          fechaEvento: formData.fechaEvento || null,
          horaInicio: formData.horaInicio && formData.horaInicio !== '-' ? formData.horaInicio : null,
          horaFin: formData.horaFin && formData.horaFin !== '-' ? formData.horaFin : null,
          idsLugaresFisicos: formData.idsLugaresFisicos,
          linkConexion: formData.linkConexion,
          responsableEvento: formData.responsable,
          idOficina: formData.idOficina,
          tipoEvento: formData.tipoEvento,
          requiereTransmision: formData.requiereTransmision,
          requiereCubrimiento: formData.requiereCubrimiento,
          observaciones: formData.observaciones,
          esImportante: formData.esImportante,
          requierePiezaGrafica: formData.requierePiezaGrafica,
          participantes: participantesPayload
        };
        await updatePublicacionEvento(event.id, pubPayload);

        // Actualizar caché local para que el modal refleje los datos correctos al reabrir
        try {
          localStorage.setItem(`event_hydra_${event.id}`, JSON.stringify({ participantes: participantesPayload, cacheTime: Date.now() }));
        } catch (_) { /* no crítico */ }
      } else {
        const cleanPayload = {
            ...payload,
            fechaEvento: formData.fechaEvento || null,
            horaInicio: formData.horaInicio && formData.horaInicio !== '-' ? formData.horaInicio : null,
            horaFin: formData.horaFin && formData.horaFin !== '-' ? formData.horaFin : null
        };
        if (aplicarASerie && event.esPrincipal && event.idGrupoRecurrencia) {
          await updateEventoSerie(event.idGrupoRecurrencia, cleanPayload);
        } else {
          await updateEvento(event.id, cleanPayload);
        }

        // Actualizar caché local
        try {
          const cached = (formData.participantes || []).filter(p => !p.virtual);
          localStorage.setItem(`event_hydra_${event.id}`, JSON.stringify({ participantes: cached, cacheTime: Date.now() }));
        } catch (_) { /* no crítico */ }
      }

      notification.success('Cambios guardados correctamente');
      setIsEditing(false);
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      notification.error('Error al guardar: ' + (error.response?.data?.message || error.message));
    } finally {
      setManageLoading(false);
    }
  };

  const handleToggleVisibility = async () => {
    setManageLoading(true);
    try {
      const newVisible = !localVisible;
      await toggleVisibilidadEvento(event.id, newVisible);
      setLocalVisible(newVisible);
      if (onSuccess) onSuccess();
    } catch (error) {
      alert('Error: ' + (error.response?.data?.message || error.message));
    } finally {
      setManageLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('¿Eliminar este evento permanentemente?')) return;
    setManageLoading(true);
    try {
      await deleteEvento(event.id);
      notification.success('Evento eliminado');
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      notification.error('Error al eliminar: ' + (error.response?.data?.message || error.message));
    } finally {
      setManageLoading(false);
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      let piezaUrl = event.piezaGraficaUrl;
      if (publishFile) {
        const uploadResult = await uploadArchivo(publishFile);
        piezaUrl = uploadResult.urlAcceso || uploadResult.urlDescarga || uploadResult.url;
      }
      await publicarEvento(event.id, {
        tituloVisible: formData.nombreEvento,
        descripcionVisible: formData.descripcionEvento,
        piezaGraficaUrl: piezaUrl,
        fechaPublicacion: new Date().toISOString(),
      });
      notification.success('Evento publicado exitosamente');
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      notification.error('Error al publicar: ' + (error.response?.data?.message || error.message));
    } finally {
      setPublishing(false);
    }
  };

  const handleSerieAction = async (actionType) => {
    if (!event.idGrupoRecurrencia) return;
    if (actionType === 'eliminar' && !window.confirm('¿Estás seguro de eliminar TODA la serie de eventos? Esta acción no se puede deshacer.')) return;
    
    setLoadingAction(true);
    try {
      if (actionType === 'aprobar') {
        await aprobarSerie(event.idGrupoRecurrencia);
      } else if (actionType === 'eliminar') {
        const isAdmin = user?.rol === 'ADMIN' || user?.rol === 'SUPER_ADMIN' || user?.rol === 'COMUNICACIONES';
        await eliminarSerie(event.idGrupoRecurrencia, isAdmin ? '' : user?.rol);
      }
      if (onSuccess) onSuccess();
      onClose();
    } catch (e) {
      console.error(e);
      alert('Error al procesar la serie');
    } finally {
      setLoadingAction(false);
    }
  };

  const handlePublishSerie = async () => {
    if (!event.idGrupoRecurrencia) return;
    if (!window.confirm('¿Deseas publicar toda la serie con esta misma información y pieza gráfica?')) return;
    
    setPublishing(true);
    try {
      let finalUrl = publishFilePreview;
      if (publishFile) {
        const uploadResult = await uploadArchivo(publishFile);
        finalUrl = uploadResult.urlAcceso || uploadResult.urlDescarga || uploadResult.url;
      }
      const payload = {
        tituloVisible: formData.nombreEvento,
        descripcionVisible: formData.descripcionEvento,
        piezaGraficaUrl: finalUrl,
        fechaPublicacion: new Date().toISOString()
      };
      await publicarSerie(event.idGrupoRecurrencia, payload);
      if (onSuccess) onSuccess();
      onClose();
    } catch (e) {
      console.error(e);
      alert('Error al publicar la serie');
    } finally {
      setPublishing(false);
    }
  };

  return {
    isEditing, setIsEditing, formData, setFormData, handleInputChange,
    loadingAction, manageLoading, publishing,
    rejecting, setRejecting, rejectReason, setRejectReason,
    reviewing, setReviewing, reviewObservations, setReviewObservations,
    publishFile, setPublishFile, publishFilePreview, setPublishFilePreview, localVisible,
    aplicarASerie, setAplicarASerie,
    handleStatusUpdate, handleSaveEdition, handleToggleVisibility,
    handleDelete, handlePublish,
    handleSerieAction, handlePublishSerie
  };
};
