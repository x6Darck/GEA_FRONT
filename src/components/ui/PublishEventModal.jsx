/**
 * Modal para publicar eventos aprobados pendientes de publicación.
 *
 * Carga automáticamente todos los eventos en estado APROBADA al abrirse,
 * permite adjuntar una pieza gráfica opcional por evento y lanzarlos al público.
 * La lista se refresca tras cada publicación exitosa para reflejar el estado actual.
 *
 * @param {boolean} isOpen
 * @param {Function} onClose
 * @param {Function} [onSuccess] - Callback invocado tras publicar exitosamente.
 */
import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { getEventos, publicarEvento } from '../../services/eventos.service';
import { uploadArchivo } from '../../services/archivos.service';
import Spinner from './Spinner';
import notification from '../../utils/notification';

const PublishEventModal = ({ isOpen, onClose, onSuccess }) => {
  const [approvedEvents, setApprovedEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [publishingId, setPublishingId] = useState(null);
  
  // Track selected files per event id
  const [selectedFiles, setSelectedFiles] = useState({});

  useEffect(() => {
    if (isOpen) {
      setSelectedFiles({});
      fetchApprovedEvents();
    }
  }, [isOpen]);

  const fetchApprovedEvents = async () => {
    try {
      setLoading(true);
      const data = await getEventos();
      const filtered = data.filter(evt => evt.status === 'APROBADA' || evt.estado === 'APROBADA');
      setApprovedEvents(filtered);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (eventId, e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFiles(prev => ({ ...prev, [eventId]: e.target.files[0] }));
    }
  };

  const handlePublish = async (event) => {
    try {
      setPublishingId(event.id);
      
      let uploadedUrl = null;
      if (selectedFiles[event.id]) {
        const uploadResult = await uploadArchivo(selectedFiles[event.id]);
        uploadedUrl = uploadResult.urlAcceso || uploadResult.urlDescarga || uploadResult.url;
      }

      const payload = {
        tituloVisible: event.nombre || 'Evento Institucional',
        descripcionVisible: event.desc || 'Sin descripción detallada.',
        piezaGraficaUrl: uploadedUrl,
        fechaPublicacion: new Date().toISOString()
      };

      await publicarEvento(event.id, payload);
      notification.success('Evento publicado correctamente');
      await fetchApprovedEvents();
      
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error(error);
      notification.error('Error publicando evento: ' + (error.response?.data?.message || error.message));
    } finally {
      setPublishingId(null);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Publicar Eventos Aprobados">
      <div style={{ minWidth: '400px', maxWidth: '600px', maxHeight: '60vh', overflowY: 'auto', paddingRight: '10px' }}>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '15px' }}>
          Selecciona un evento previamente aprobado para adjuntar su pieza gráfica y lanzarlo al público.
        </p>
        
        {loading ? (
          <Spinner message="Buscando eventos..." />
        ) : approvedEvents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px', background: '#f5f5f5', borderRadius: '8px' }}>
             No hay solicitudes aprobadas pendientes por publicar.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {approvedEvents.map(evt => (
              <div key={evt.id} style={{ display: 'flex', flexDirection: 'column', padding: '15px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--card-bg)' }}>
                 <h4 style={{ margin: '0 0 5px 0', color: 'var(--primary)', fontSize: '16px' }}>{evt.nombre}</h4>
                 <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: 'var(--text-secondary)' }}>Fecha: {evt.fecha || evt.start} | Lugar: {evt.office}</p>
                 
                 <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
                   <div style={{ flex: 1 }}>
                     <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Pieza Gráfica (Opcional)</label>
                     <input type="file" accept="image/*" onChange={(e) => handleFileChange(evt.id, e)} style={{ fontSize: '12px', width: '100%' }} />
                   </div>
                   <button 
                     onClick={() => handlePublish(evt)}
                     disabled={publishingId === evt.id}
                     style={{
                       padding: '10px 15px',
                       backgroundColor: '#000',
                       color: '#fff',
                       border: 'none',
                       borderRadius: '6px',
                       cursor: publishingId === evt.id ? 'not-allowed' : 'pointer',
                       fontWeight: 'bold',
                       alignSelf: 'flex-end'
                     }}
                   >
                     {publishingId === evt.id ? 'Publicando...' : 'Publish'}
                   </button>
                 </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default PublishEventModal;
