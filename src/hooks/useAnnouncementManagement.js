import { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { 
  publicarAnuncio, 
  toggleVisibilidadAnuncio, 
  deleteAnuncio, 
  updateAnuncio,
  updatePublicacionAnuncio
} from '../services/anuncios.service';
import { uploadArchivo } from '../services/archivos.service';
import api from '../services/api';
import notification from '../utils/notification';

export const useAnnouncementManagement = (announcement, onSuccess, onClose) => {
  const { user } = useContext(AuthContext);
  
  // States
  const [isEditing, setIsEditing] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const [manageLoading, setManageLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // Form fields
  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
    categoria: '',
    // lugar: '', // Deprecated
    lugares: [],
    idsLugaresFisicos: [],
    correoContacto: '',
    responsableAnuncio: '',
    fechaInicioPublicacion: '',
    fechaFinPublicacion: '',
    horaInicio: '',
    horaFin: '',
    oficina: '',
    idOficina: '',
    responsable: '',
    requierePiezaGrafica: false
  });

  // Media states
  const [publishFile, setPublishFile] = useState(null);
  const [publishFilePreview, setPublishFilePreview] = useState(null);
  const [localVisible, setLocalVisible] = useState(true);

  // Initialize form
  useEffect(() => {
    if (announcement) {
      setLocalVisible(announcement.visible !== false);
      setPublishFilePreview(announcement.piezaGraficaUrl || null);
      
      const formatFecha = (raw) => {
        if (!raw) return '';
        if (typeof raw === 'string') return raw.split('T')[0];
        if (Array.isArray(raw)) return `${raw[0]}-${String(raw[1]).padStart(2, '0')}-${String(raw[2]).padStart(2, '0')}`;
        return '';
      };

      setFormData({
        titulo: announcement.titulo || '',
        descripcion: announcement.descripcion || '',
        categoria: announcement.categoria || '',
        lugares: announcement.lugares || [],
        idsLugaresFisicos: announcement.idsLugaresFisicos || [],
        correoContacto: announcement.correoContacto || '',
        responsableAnuncio: announcement.responsableAnuncio || '',
        fechaInicioPublicacion: formatFecha(announcement.fechaInicioPublicacion),
        fechaFinPublicacion: formatFecha(announcement.fechaFinPublicacion),
        horaInicio: announcement.horaInicio || '',
        horaFin: announcement.horaFin || '',
        oficina: announcement.oficinaNombre || announcement.oficina || '',
        idOficina: announcement.oficinaId || announcement.idOficina || '',
        responsable: announcement.responsableAnuncio || announcement.responsable || '',
        requierePiezaGrafica: announcement.requierePiezaGrafica || false
      });
    }
  }, [announcement]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleStatusUpdate = async (type) => {
    if (type === 'Rechazar' && !rejecting) { setRejecting(true); return; }
    if (type === 'Rechazar' && (!rejectReason || rejectReason.trim() === '')) {
      alert('Por favor, ingrese un motivo de rechazo.'); return;
    }
    setLoadingAction(true);
    try {
      if (type === 'Aprobar') {
        await api.post(`/comunicaciones/solicitudes-anuncio/${announcement.id}/aprobar`);
        notification.success('Anuncio aprobado correctamente');
      } else {
        await api.post(`/comunicaciones/solicitudes-anuncio/${announcement.id}/rechazar`, { motivo: rejectReason });
        notification.success('Anuncio rechazado');
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
      let piezaUrl = announcement.piezaGraficaUrl;
      
      if (!publishFilePreview) {
          piezaUrl = null;
      }
      
      if (publishFile) {
        const uploadResult = await uploadArchivo(publishFile);
        piezaUrl = uploadResult.urlAcceso || uploadResult.urlDescarga || uploadResult.url;
      }
      
      const payload = {
        ...formData,
        responsableAnuncio: formData.responsable,
        idOficina: formData.idOficina,
        piezaGraficaUrl: piezaUrl,
        requierePiezaGrafica: formData.requierePiezaGrafica,
        idsLugaresFisicos: formData.idsLugaresFisicos
      };
      
      const status = announcement.status?.toUpperCase() || '';
      if (status === 'PUBLICADA') {
        // Si ya está publicado, actualizamos tanto la solicitud como la publicación (Sincronización Administrativa)
        await updatePublicacionAnuncio(announcement.id, {
          tituloVisible: formData.titulo,
          descripcionVisible: formData.descripcion,
          piezaGraficaUrl: piezaUrl,
          // Campos para sincronizar la solicitud base
          titulo: formData.titulo,
          descripcion: formData.descripcion,
          categoria: formData.categoria,
          idsLugaresFisicos: formData.idsLugaresFisicos,
          correoContacto: formData.correoContacto,
          responsableAnuncio: formData.responsable,
          idOficina: formData.idOficina,
          fechaInicioPublicacion: formData.fechaInicioPublicacion || null,
          fechaFinPublicacion: formData.fechaFinPublicacion || null,
          horaInicio: formData.horaInicio && formData.horaInicio !== '-' ? formData.horaInicio : null,
          horaFin: formData.horaFin && formData.horaFin !== '-' ? formData.horaFin : null
        });
      } else {
        const createPayload = {
            ...payload,
            fechaInicioPublicacion: formData.fechaInicioPublicacion || null,
            fechaFinPublicacion: formData.fechaFinPublicacion || null,
            horaInicio: formData.horaInicio && formData.horaInicio !== '-' ? formData.horaInicio : null,
            horaFin: formData.horaFin && formData.horaFin !== '-' ? formData.horaFin : null
        };
        // Si no está publicado, solo actualizamos la solicitud original
        await updateAnuncio(announcement.id, createPayload);
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
      await toggleVisibilidadAnuncio(announcement.id, newVisible);
      setLocalVisible(newVisible);
      notification.success(newVisible ? 'Anuncio visible en cartelera' : 'Anuncio oculto de la cartelera');
      if (onSuccess) onSuccess();
    } catch (error) {
      notification.error('Error: ' + (error.response?.data?.message || error.message));
    } finally {
      setManageLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('¿Eliminar esta solicitud permanentemente?')) return;
    setManageLoading(true);
    try {
      await deleteAnuncio(announcement.id);
      notification.success('Anuncio eliminado');
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
      let piezaUrl = announcement.piezaGraficaUrl;
      if (publishFile) {
        const uploadResult = await uploadArchivo(publishFile);
        piezaUrl = uploadResult.urlAcceso || uploadResult.urlDescarga || uploadResult.url;
      }
      await publicarAnuncio(announcement.id, {
        tituloVisible: formData.titulo,
        descripcionVisible: formData.descripcion,
        piezaGraficaUrl: piezaUrl,
        fechaPublicacion: new Date().toISOString(),
      });
      notification.success('Anuncio publicado exitosamente');
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      notification.error('Error al publicar: ' + (error.response?.data?.message || error.message));
    } finally {
      setPublishing(false);
    }
  };

  return {
    isEditing, setIsEditing, formData, setFormData, handleInputChange,
    loadingAction, manageLoading, publishing,
    rejecting, setRejecting, rejectReason, setRejectReason,
    publishFile, setPublishFile, publishFilePreview, setPublishFilePreview, localVisible,
    handleStatusUpdate, handleSaveEdition, handleToggleVisibility, handleDelete, handlePublish
  };
};
