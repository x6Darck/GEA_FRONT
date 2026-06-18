import React, { useContext, useState } from 'react';
import Modal from './Modal';
import { AuthContext } from '../../context/AuthContext';
import { resolveImageUrl } from '../../utils/url';
import AmPmTimePicker from './AmPmTimePicker';
import ParticipantModal from './ParticipantModal';
import { useEventManagement } from '../../hooks/useEventManagement';
import { getTiposEvento } from '../../services/tipoEvento.service';
import { getOficinas } from '../../services/oficinas.service';
import { 
  Eye, EyeOff, Trash2, Calendar, Clock, MapPin, Tag, 
  User as UserIcon, Plus, Send, CheckCircle, AlertCircle, 
  Edit2, ShieldCheck, Info, Users, Link, Image as ImageIcon, Upload, Download, Map, X
} from 'lucide-react';
import lugarFisicoService from '../../services/lugarFisico.service';
import styles from './DetailModal.module.css';

const EventDetailModal = ({ isOpen, onClose, event, onSuccess }) => {
  const { user } = useContext(AuthContext);
  const [tiposEvento, setTiposEvento] = useState([]);
  const [oficinas, setOficinas] = useState([]);
  const [lugaresFisicos, setLugaresFisicos] = useState([]);

  React.useEffect(() => {
    if (isOpen) {
      cargarCatalogos();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const cargarCatalogos = async () => {
    try {
      const userRol = user?.rol?.toString().toUpperCase() || '';
      const isPrivileged = ['SUPER_ADMIN', 'ADMIN', 'COMUNICACIONES'].includes(userRol);

      const [tipos, ofis, lugs] = await Promise.allSettled([
        getTiposEvento(),
        isPrivileged ? getOficinas({ skipGlobalError: true }) : Promise.resolve([]),
        lugarFisicoService.getLugaresFisicos()
      ]);
      if (tipos.status === 'fulfilled') setTiposEvento(Array.isArray(tipos.value) ? tipos.value : []);
      if (ofis.status === 'fulfilled') setOficinas(Array.isArray(ofis.value) ? ofis.value : []);
      if (lugs.status === 'fulfilled') setLugaresFisicos(Array.isArray(lugs.value) ? lugs.value : []);
    } catch (e) {
      console.error(e);
    }
  };
  
  const {
    isEditing, setIsEditing, formData, setFormData, handleInputChange,
    loadingAction, manageLoading, publishing,
    rejecting, setRejecting, rejectReason, setRejectReason,
    reviewing, setReviewing, reviewObservations, setReviewObservations,
    publishFile, setPublishFile, publishFilePreview, setPublishFilePreview, localVisible,
    aplicarASerie, setAplicarASerie,
    handleStatusUpdate, handleSaveEdition, handleToggleVisibility, handleDelete, handlePublish,
    handleSerieAction, handlePublishSerie
  } = useEventManagement(event, onSuccess, onClose);

  const handleDownloadImage = async (url, title) => {
    if (!url) return;
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `Evento_${title.replace(/\s+/g, '_')}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Error al descargar la imagen:", error);
      window.open(url, '_blank');
    }
  };

  const [showParticipantModal, setShowParticipantModal] = useState(false);
  const [participantMode, setParticipantMode] = useState('invitado');
  const [editingParticipantIndex, setEditingParticipantIndex] = useState(null);
  const [viewingParticipant, setViewingParticipant] = useState(null);

  const formatTime12h = (time) => {
    if (!time) return '';
    let h, m;
    if (Array.isArray(time)) {
      [h, m] = time;
    } else if (typeof time === 'string') {
      if (!time.includes(':')) return '—';
      [h, m] = time.split(':');
    } else {
      return '—';
    }
    let hour = parseInt(h, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12 || 12;
    return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
  };

  const getImageUrl = (url) => resolveImageUrl(url);

  if (!event) return null;

  const status = (event.status || '').toUpperCase();
  const isAdmin = user?.rol === 'SUPER_ADMIN' || user?.rol === 'COMUNICACIONES' || user?.rol === 'ADMIN';
  const isSuperAdmin = user?.rol === 'SUPER_ADMIN';

  const canReview = isAdmin && status === 'PENDIENTE';
  const canPublish = isAdmin && status === 'APROBADA';
  const canManage = isAdmin && (status === 'PUBLICADA' || status === 'APROBADA');
  const canEditOwn = !isAdmin && ['RECHAZADA', 'EN_REVISION'].includes(status);

  const handlePublishFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setPublishFile(file);
      setPublishFilePreview(URL.createObjectURL(file));
    }
  };

  const statusConfig = {
    PENDIENTE: { label: 'En Revisión', color: '#f59e0b', bg: '#fffbeb', border: '#fef3c7', text: '#d97706' },
    APROBADA: { label: 'Aprobada', color: '#10b981', bg: '#f0fdf4', border: '#dcfce7', text: '#059669' },
    RECHAZADA: { label: 'Rechazada', color: '#ef4444', bg: '#fef2f2', border: '#fee2e2', text: '#dc2626' },
    PUBLICADA: { label: 'Evento Publicado', color: '#0ea5e9', bg: '#f0f9ff', border: '#e0f2fe', text: '#0284c7' },
    EN_REVISION: { label: 'Devuelto para corrección', color: '#8b5cf6', bg: '#faf5ff', border: '#ede9fe', text: '#7c3aed' }
  }[status] || { label: status, color: '#64748b', bg: '#f8fafc', border: '#e2e8f0', text: '#475569' };

  const renderField = (label, value, isEditingLocal, fieldName, type = 'text', icon = null, forceReadOnly = false) => {
    if (isEditingLocal && !forceReadOnly) {
      return (
        <div style={{ marginBottom: '12px' }}>
          <label className={styles.fieldLabel}>{icon} {label}</label>
          {type === 'textarea' ? (
            <textarea
              name={fieldName}
              value={formData[fieldName]}
              onChange={handleInputChange}
              className={styles.inputField}
              style={{ minHeight: '80px', resize: 'vertical' }}
            />
          ) : type === 'time' ? (
              <AmPmTimePicker
                value={formData[fieldName]}
                onChange={(e) => {
                  setFormData(prev => ({...prev, [fieldName]: e.target.value}));
                }}
              />
          ) : type === 'date' ? (
              <input 
                type="date" 
                name={fieldName} 
                value={formData[fieldName]} 
                onChange={handleInputChange} 
                className={styles.inputField} 
              />
          ) : type === 'tipoEvento' ? (
              <select name={fieldName} value={formData[fieldName] || ''} onChange={(e) => {
                  const val = e.target.value;
                  const selected = tiposEvento.find(t => String(t.id || t.idTipoEvento) === val || t.nombre === val);
                  setFormData(prev => ({...prev, tipoEvento: selected ? selected.nombre : val, idTipoEvento: selected ? (selected.id || selected.idTipoEvento) : ''}));
              }} className={styles.inputField}>
                 <option value={formData[fieldName]}>{formData[fieldName] || 'Seleccione Categoría'}</option>
                 {(tiposEvento || []).map(t => (
                     <option key={t.id || t.idTipoEvento} value={t.nombre}>{t.nombre}</option>
                 ))}
              </select>
          ) : type === 'oficina' ? (
              <select name={fieldName} value={formData[fieldName] || ''} onChange={(e) => {
                  const val = e.target.value;
                  const selected = oficinas.find(o => String(o.id || o.idOficina) === val || o.nombre === val);
                  setFormData(prev => ({...prev, office: selected ? selected.nombre : val, idOficina: selected ? (selected.id || selected.idOficina) : val}));
              }} className={styles.inputField}>
                 <option value={formData[fieldName]}>{formData[fieldName] || 'Seleccione Oficina'}</option>
                 {(oficinas || []).map(o => (
                     <option key={o.id || o.idOficina} value={o.nombre}>{o.nombre}</option>
                 ))}
              </select>
          ) : (
            <input
              type={type}
              name={fieldName}
              value={formData[fieldName]}
              onChange={handleInputChange}
              className={styles.inputField}
            />
          )}
        </div>
      );
    }
    return (
      <div style={{ marginBottom: '15px' }}>
        <label className={styles.fieldLabel}>{icon} {label}</label>
        <div style={{ fontSize: '15px', color: '#1e293b', fontWeight: 'bold' }}>{value || '—'}</div>
      </div>
    );
  };

  // Filtrado robusto de participantes
  const participantsList = Array.isArray(formData.participantes) ? formData.participantes : [];
  const organizers = participantsList.filter(p => {
    const typeStr = (p.tipo || '').toString().toUpperCase();
    return typeStr === 'ORGANIZADOR';
  });
  const others = participantsList.filter(p => {
    const typeStr = (p.tipo || '').toString().toUpperCase();
    return typeStr !== 'ORGANIZADOR';
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Evento #${event.id}`} style={{ maxWidth: '750px', width: '95%' }} bodyStyle={{ padding: '24px 32px' }}>
      <div className={styles.container}>
        
        {/* Header Status Bar */}
        <div className={styles.statusBar} style={{ backgroundColor: statusConfig.bg, border: `1px solid ${statusConfig.border}33` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
             <div className={styles.statusIconContainer} style={{ background: statusConfig.text }}>
                <Send size={22} color="white" />
             </div>
             <div>
               <div className={styles.statusLabel} style={{ color: statusConfig.text }}>{statusConfig.label}</div>
               <div className={styles.statusValue}>{event.status}</div>
             </div>
          </div>
          {event.status === 'PUBLICADA' && (
            <div style={{ textAlign: 'right', backgroundColor: 'rgba(255,255,255,0.5)', padding: '8px 16px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)' }}>
               <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase' }}>Visibilidad</div>
               <div style={{ fontSize: '14px', fontWeight: '800', color: localVisible ? '#16a34a' : '#d97706', display: 'flex', alignItems: 'center', gap: '6px' }}>
                 {localVisible ? <><Eye size={16}/> Público</> : <><EyeOff size={16}/> Oculto</>}
               </div>
            </div>
          )}
        </div>

        {/* Banner observaciones de revisión */}
        {event.observacionesRevision && (
          <div style={{ margin: '16px 0 0', padding: '14px 18px', borderRadius: '12px', background: '#faf5ff', border: '1px solid #ede9fe' }}>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#7c3aed', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertCircle size={14} /> Observaciones del moderador
            </div>
            <p style={{ margin: 0, fontSize: '14px', color: '#1e293b', lineHeight: '1.6' }}>{event.observacionesRevision}</p>
          </div>
        )}

        {/* ── SECCIÓN HERO: PIEZA GRÁFICA / INVITACIÓN ── */}
        {status === 'PUBLICADA' && (
          <div className={styles.card} style={{ border: '2px solid #6ee7b7', background: 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)', marginTop: '0', marginBottom: '24px' }}>
              <div style={{ fontSize: '14px', fontWeight: '800', color: '#065f46', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <Send size={18} /> PIEZA GRÁFICA / INVITACIÓN
              </div>
              
              <div style={{
                height: '240px', background: 'white', borderRadius: '14px',
                border: '2px dashed #d1fae5', overflow: 'hidden',

                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative', cursor: isEditing ? 'pointer' : 'default',
                transition: 'all 0.3s ease'
              }} onClick={() => isEditing && document.getElementById(`edit-pieza-${event.id}`)?.click()}>
                {publishFilePreview
                  ? <img src={getImageUrl(publishFilePreview)} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="Pieza gráfica" />
                  : <div style={{ color: '#94a3b8', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                      <ImageIcon size={40} style={{ opacity: 0.5 }} />
                      <span style={{ fontSize: '13px', fontWeight: '600' }}>Sin pieza gráfica vinculada</span>
                    </div>
                }
              </div>
              
              {isEditing ? (
                <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {publishFilePreview && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleDownloadImage(getImageUrl(publishFilePreview), formData.nombreEvento)}
                        className={styles.btnSecondary}
                        style={{ width: '100%', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#fff', color: '#059669', border: '1px solid #d1fae5', borderRadius: '8px', cursor: 'pointer', fontWeight: '800' }}
                      >
                        <Download size={18} /> Descargar Imagen
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setPublishFile(null); setPublishFilePreview(null); }}
                        className={styles.btnSecondary}
                        style={{ width: '100%', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#fff', color: '#ef4444', border: '1px solid #fee2e2', borderRadius: '8px', cursor: 'pointer', fontWeight: '800' }}
                      >
                        <Trash2 size={18} /> Quitar Imagen Actual
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => document.getElementById(`edit-pieza-${event.id}`).click()}
                    className={styles.btnSecondary} 
                    style={{ width: '100%', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 'bold', background: '#1e293b', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                  >
                    <Upload size={18} /> {publishFilePreview ? 'Cambiar Pieza Gráfica' : 'Subir Pieza Gráfica'}
                  </button>
                  <input id={`edit-pieza-${event.id}`} type="file" accept="image/*" hidden onChange={handlePublishFileChange} />
                </div>
              ) : (
                publishFilePreview && (
                  <div style={{ marginTop: '14px' }}>
                    <button
                      type="button"
                      onClick={() => handleDownloadImage(getImageUrl(publishFilePreview), formData.nombreEvento)}
                      className={styles.btnSecondary}
                      style={{ width: '100%', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#fff', color: '#059669', border: '1px solid #d1fae5', borderRadius: '8px', cursor: 'pointer', fontWeight: '800' }}
                    >
                      <Download size={18} /> Descargar Imagen
                    </button>
                  </div>
                )
              )}


          </div>
        )}


        {/* Form Content */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div className={styles.card} style={{ gridColumn: '1 / -1', background: '#f8fafc' }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#64748b', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Tag size={14} color="#ce1126" /> Información General
            </div>
            {renderField(<span>Título del Evento <span style={{color: '#ce1126'}}>*</span></span>, formData.nombreEvento, isEditing, 'nombreEvento', 'text', <Tag size={14}/>)}
            {renderField('Descripción', formData.descripcionEvento, isEditing, 'descripcionEvento', 'textarea', <Info size={14}/>)}
            {renderField('Observaciones Adicionales', formData.observaciones, isEditing, 'observaciones', 'textarea', <Info size={14}/>)}
          </div>

          <div className={styles.card} style={{ gridColumn: '1 / -1', background: '#f8fafc' }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#64748b', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MapPin size={14} color="#ce1126" /> Ubicación y Tipo
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
              {renderField('Cita Virtual (Link)', formData.linkConexion, isEditing && isAdmin, 'linkConexion', 'text', <Link size={14}/>)}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <MapPin size={12}/> Lugares Físicos
                </span>
                {isEditing ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <select 
                      style={{ padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                      onChange={(e) => {
                        const id = parseInt(e.target.value);
                        if (!id) return;
                        if (!formData.idsLugaresFisicos.includes(id)) {
                          const lug = lugaresFisicos.find(l => l.id === id);
                          setFormData({
                            ...formData,
                            idsLugaresFisicos: [...formData.idsLugaresFisicos, id],
                            lugares: [...formData.lugares, lug.nombre]
                          });
                        }
                        e.target.value = "";
                      }}
                    >
                      <option value="">Añadir lugar...</option>
                      {lugaresFisicos.map(l => (
                        <option key={l.id} value={l.id} disabled={formData.idsLugaresFisicos.includes(l.id)}>{l.nombre}</option>
                      ))}
                    </select>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                      {formData.idsLugaresFisicos.map((id, idx) => (
                        <div key={id} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f1f5f9', padding: '2px 8px', borderRadius: '12px', fontSize: '11px' }}>
                          {formData.lugares[idx]}
                          <button onClick={() => {
                            const newIds = formData.idsLugaresFisicos.filter(iid => iid !== id);
                            const newNames = formData.lugares.filter((_, i) => i !== idx);
                            setFormData({...formData, idsLugaresFisicos: newIds, lugares: newNames});
                          }} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#ef4444' }}><X size={10}/></button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                    {formData.lugares.length > 0 ? formData.lugares.map((l, i) => (
                      <span key={i} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>{l}</span>
                    )) : <span style={{ fontSize: '11px', color: '#94a3b8' }}>No definido</span>}
                  </div>
                )}
              </div>
              {renderField('Tipo de Evento', formData.tipoEvento, isEditing, 'tipoEvento', 'tipoEvento', <Tag size={14}/>)}
            </div>
          </div>

          <div className={styles.card} style={{ gridColumn: '1 / -1', background: '#f8fafc' }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#64748b', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={14} color="#ce1126" /> Logística del Evento
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
               {renderField(<span>Fecha del Evento <span style={{color: '#ce1126'}}>*</span></span>, formData.fechaEvento, isEditing, 'fechaEvento', 'date', <Calendar size={14}/>)}
               {renderField(<span>Hora Inicio <span style={{color: '#ce1126'}}>*</span></span>, isEditing ? formData.horaInicio : formatTime12h(formData.horaInicio), isEditing, 'horaInicio', 'time', <Clock size={12}/>)}
               {renderField(<span>Hora Fin <span style={{color: '#ce1126'}}>*</span></span>, isEditing ? formData.horaFin : formatTime12h(formData.horaFin), isEditing, 'horaFin', 'time', <Clock size={12}/>)}
            </div>
          </div>
          
          <div className={styles.card} style={{ gridColumn: '1 / -1', background: '#f8fafc' }}>
             <div style={{ fontSize: '13px', fontWeight: '700', color: '#64748b', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={14} color="#ce1126"/> Información de la Solicitud
             </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                 {renderField('Oficina Solicitante', event.oficinaNombre || formData.office, false, 'office', 'oficina', <Tag size={12}/>, !isSuperAdmin)}
                 {renderField('Responsable de la Solicitud', event.solicitanteEmail || event.usuarioSolicitanteCorreo || event.responsable, false, 'responsable', 'text', <UserIcon size={12}/>, !isSuperAdmin)}
              </div>
              <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '15px' }}>
                 {isEditing ? (
                   <>
                    <label style={{ padding: '10px', borderRadius: '10px', background: formData.requiereTransmision ? '#f0f9ff' : '#fff', border: '1px solid #e2e8f0', fontSize: '11px', fontWeight: 'bold', color: formData.requiereTransmision ? '#0284c7' : '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                       <input type="checkbox" checked={formData.requiereTransmision} onChange={e => setFormData({...formData, requiereTransmision: e.target.checked})} />
                       Transmisión
                    </label>
                    <label style={{ padding: '10px', borderRadius: '10px', background: formData.requiereCubrimiento ? '#f0f9ff' : '#fff', border: '1px solid #e2e8f0', fontSize: '11px', fontWeight: 'bold', color: formData.requiereCubrimiento ? '#0284c7' : '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                       <input type="checkbox" checked={formData.requiereCubrimiento} onChange={e => setFormData({...formData, requiereCubrimiento: e.target.checked})} />
                       Cubrimiento
                    </label>
                    <label style={{ padding: '10px', borderRadius: '10px', background: formData.requierePiezaGrafica ? '#fff1f2' : '#fff', border: '1px solid #fecaca', fontSize: '11px', fontWeight: '900', color: formData.requierePiezaGrafica ? '#ce1126' : '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                       <input type="checkbox" checked={formData.requierePiezaGrafica} onChange={e => setFormData({...formData, requierePiezaGrafica: e.target.checked})} />
                       PIEZA GRÁFICA
                    </label>
                    {isAdmin && (
                      <label style={{ padding: '10px', borderRadius: '10px', background: formData.esImportante ? '#fff1f2' : '#fff', border: '1px solid #fecaca', fontSize: '11px', fontWeight: '900', color: formData.esImportante ? '#ce1126' : '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                         <input type="checkbox" checked={formData.esImportante} onChange={e => setFormData({...formData, esImportante: e.target.checked})} />
                         IMPORTANTE
                      </label>
                    )}
                   </>
                 ) : (
                   <>
                     <div style={{ padding: '10px', borderRadius: '10px', background: formData.requierePiezaGrafica ? '#fff1f2' : '#f8fafc', border: '1px solid #e2e8f0', fontSize: '12px', fontWeight: 'bold', color: formData.requierePiezaGrafica ? '#ce1126' : '#94a3b8' }}>
                        {formData.requierePiezaGrafica ? '✅ Requiere Pieza Gráfica' : '❌ No Pieza Gráfica'}
                     </div>
                    <div style={{ padding: '10px', borderRadius: '10px', background: formData.requiereTransmision ? '#f0f9ff' : '#f8fafc', border: '1px solid #e2e8f0', fontSize: '12px', fontWeight: 'bold', color: formData.requiereTransmision ? '#0284c7' : '#94a3b8' }}>
                       {formData.requiereTransmision ? '✅ Requiere Transmisión' : '❌ No Transmisión'}
                    </div>
                    <div style={{ padding: '10px', borderRadius: '10px', background: formData.requiereCubrimiento ? '#f0f9ff' : '#f8fafc', border: '1px solid #e2e8f0', fontSize: '12px', fontWeight: 'bold', color: formData.requiereCubrimiento ? '#0284c7' : '#94a3b8' }}>
                       {formData.requiereCubrimiento ? '✅ Requiere Cubrimiento' : '❌ No Cubrimiento'}
                    </div>
                    {formData.esImportante && (
                      <div style={{ padding: '10px', borderRadius: '10px', background: '#fff1f2', border: '1px solid #fecaca', fontSize: '12px', fontWeight: '900', color: '#ce1126' }}>
                         ★ EVENTO IMPORTANTE
                      </div>
                    )}
                    {formData.frecuenciaRecurrencia && formData.frecuenciaRecurrencia !== 'NINGUNA' && (
                      <div style={{ padding: '10px', borderRadius: '10px', background: '#f0f9ff', border: '1px solid #bae6fd', fontSize: '11px', fontWeight: '800', color: '#0369a1', gridColumn: '1 / -1' }}>
                         🔄 EVENTO RECURRENTE: {formData.frecuenciaRecurrencia} (Hasta {formData.fechaFinRecurrencia?.split('T')[0]})
                      </div>
                    )}
                   </>
                 )}
              </div>
          </div>
        </div>

        {/* ORGANIZERS CARD */}
        <div style={{ marginTop: '30px' }} className={styles.cardGradRed}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h4 className={styles.cardTitle} style={{ color: '#991b1b' }}><Users size={18} /> Equipo Organizador ({organizers.length})</h4>
              {isEditing && (
                <button onClick={() => { setParticipantMode('organizador'); setEditingParticipantIndex(null); setShowParticipantModal(true); }} style={{ padding: '6px 14px', borderRadius: '20px', background: '#ce1126', color: 'white', border: 'none', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Plus size={14} /> Añadir
                </button>
              )}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
              {organizers.map((p, idx) => {
                // BLINDAJE V12: Fallback inteligente. Si el participante no tiene foto, pero su nombre
                // coincide con el del usuario logueado, usamos su foto del contexto.
                const userFullName = `${user?.nombres || ''} ${user?.apellidos || ''}`.trim();
                const displayFoto = p.fotoUrl || (p.nombre === userFullName ? user?.fotoUrl : null);

                return (
                  <div key={idx} onClick={() => !isEditing && isAdmin && setViewingParticipant(p)} className={`${styles.participantBadge} ${(!isAdmin && !isEditing) ? styles.staticBadge : ''}`}>
                     <div className={styles.participantAvatar} style={{ backgroundColor: '#ce1126' }}>
                        {displayFoto ? (
                          <img src={getImageUrl(displayFoto)} alt="org" style={{width: '100%', height: '100%', objectFit: 'cover'}} />
                        ) : (
                          <UserIcon size={14} />
                        )}
                     </div>
                     <div style={{ display: 'flex', flexDirection: 'column' }}><span className={styles.participantName}>{p.nombre}</span><span className={styles.participantRole} style={{ color: '#dc2626' }}>{p.cargo || 'Organizador'}</span></div>
                     {isEditing && (
                        <div style={{ display: 'flex', gap: '4px', marginLeft: '6px' }}>
                          <button onClick={(e) => { e.stopPropagation(); setParticipantMode('organizador'); setEditingParticipantIndex(formData.participantes.indexOf(p)); setShowParticipantModal(true); }} style={{ padding: '4px', border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer' }}><Edit2 size={12}/></button>
                          <button onClick={(e) => { e.stopPropagation(); setFormData(prev => ({...prev, participantes: prev.participantes.filter(item => item !== p)})); }} style={{ padding: '4px', border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={12}/></button>
                        </div>
                     )}
                  </div>
                );
              })}
            </div>
        </div>

        {/* INVITED CARD */}
        <div style={{ marginTop: '15px' }} className={styles.cardGrey}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h4 className={styles.cardTitle}><Users size={18} /> Invitados y Patrocinadores / Aliados ({others.length})</h4>
              {isEditing && (
                <button onClick={() => { setParticipantMode('invitado'); setEditingParticipantIndex(null); setShowParticipantModal(true); }} style={{ padding: '6px 14px', borderRadius: '20px', background: '#1e293b', color: 'white', border: 'none', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Plus size={14} /> Añadir
                </button>
              )}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {others.map((p, idx) => (
                <div key={idx} onClick={() => !isEditing && isAdmin && setViewingParticipant(p)} className={`${styles.participantBadge} ${(!isAdmin && !isEditing) ? styles.staticBadge : ''}`}>
                   <div className={styles.participantAvatar} style={{ background: '#f1f5f9', color: '#475569' }}>{p.fotoUrl ? <img src={getImageUrl(p.fotoUrl)} alt="inv" style={{width: '100%', height: '100%', objectFit: 'cover'}} /> : <UserIcon size={12}/>}</div>
                   <div style={{ display: 'flex', flexDirection: 'column' }}><span className={styles.participantName}>{p.nombre}</span><span className={styles.participantRole}>{p.cargo || 'Invitado'}</span></div>
                   {isEditing && (
                      <div style={{ display: 'flex', gap: '4px', marginLeft: '6px' }}>
                        <button onClick={(e) => { e.stopPropagation(); setParticipantMode('invitado'); setEditingParticipantIndex(formData.participantes.indexOf(p)); setShowParticipantModal(true); }} style={{ padding: '4px', border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer' }}><Edit2 size={12}/></button>
                        <button onClick={(e) => { e.stopPropagation(); setFormData(prev => ({...prev, participantes: prev.participantes.filter(item => item !== p)})); }} style={{ padding: '4px', border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={12}/></button>
                      </div>
                   )}
                </div>
              ))}
            </div>
        </div>

        {/* Action Panels */}
        <div style={{ marginTop: '30px' }}>
          {canReview && (
            <div className={styles.actionPanel} style={{ border: '1px solid #e2e8f0', background: 'linear-gradient(135deg, #fff 0%, #f8fafc 100%)' }}>
              <h4 className={styles.actionPanelTitle}> <CheckCircle size={18} color="#ce1126"/> Decisión Administrativa</h4>
              {rejecting && (
                <div style={{ marginBottom: '16px' }}>
                  <label className={styles.fieldLabel}>Motivo del Rechazo</label>
                  <textarea
                    value={rejectReason}
                    onChange={e => setRejectReason(e.target.value)}
                    placeholder="Indique las razones..."
                    className={styles.inputField}
                    style={{ minHeight: '80px' }}
                  />
                </div>
              )}
              {reviewing && (
                <div style={{ marginBottom: '16px' }}>
                  <label className={styles.fieldLabel}>Observaciones para la oficina</label>
                  <textarea
                    value={reviewObservations}
                    onChange={e => setReviewObservations(e.target.value)}
                    placeholder="Describa qué debe corregir la oficina antes de reenviar..."
                    className={styles.inputField}
                    style={{ minHeight: '80px' }}
                  />
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                {(rejecting || reviewing) && (
                  <button onClick={() => { setRejecting(false); setReviewing(false); }} className={styles.btnSecondary}>Volver</button>
                )}
                {!reviewing && (
                  <button onClick={() => handleStatusUpdate('Rechazar')} disabled={loadingAction} className={styles.btnDanger}>
                    {rejecting ? 'Confirmar Rechazo' : 'Rechazar Solicitud'}
                  </button>
                )}
                {!rejecting && (
                  <button
                    onClick={() => handleStatusUpdate('Devolver')}
                    disabled={loadingAction}
                    style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 20px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}
                  >
                    {reviewing ? 'Confirmar Devolución' : 'En revisión'}
                  </button>
                )}
                {!rejecting && !reviewing && (
                  <button onClick={() => handleStatusUpdate('Aprobar')} disabled={loadingAction} className={styles.btnPrimary} style={{ background: 'linear-gradient(135deg, #ce1126 0%, #a50e1f 100%)' }}>Aprobar Solicitud</button>
                )}
              </div>
            </div>
          )}

          {canPublish && (
            <div className={styles.actionPanel} style={{ border: '1px solid #ecfdf5', background: 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)', marginTop: canReview ? '20px' : '0' }}>
              <h4 className={styles.actionPanelTitle}>🚀 Lanzamiento de Comunicación</h4>
              <div 
                onClick={() => document.getElementById(`file-up-${event.id}`).click()} 
                style={{ height: '200px', background: 'white', border: '2px dashed #d1fae5', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', marginBottom: '20px', overflow: 'hidden' }}
              >
                {publishFilePreview ? <img src={getImageUrl(publishFilePreview)} style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <div style={{ textAlign: 'center' }}><div style={{ fontSize: '42px', marginBottom: '12px' }}>🖼️</div><div style={{ color: '#059669', fontWeight: '800', fontSize: '14px' }}>Subir Pieza Gráfica para Publicar</div></div>}
              </div>
              <input id={`file-up-${event.id}`} type="file" hidden onChange={handlePublishFileChange} />
              
              {publishFilePreview && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '15px' }}>
                  <button 
                    onClick={() => handleDownloadImage(getImageUrl(publishFilePreview), formData.nombreEvento)}
                    className={styles.btnSecondary}
                    style={{ width: '100%', color: '#059669', borderColor: '#d1fae5', background: 'white', height: '48px', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  >
                    <Download size={18} /> Descargar Imagen
                  </button>
                  <button 
                    onClick={() => { setPublishFile(null); setPublishFilePreview(null); }}
                    className={styles.btnSecondary}
                    style={{ width: '100%', color: '#ef4444', borderColor: '#fee2e2', background: 'white', height: '48px', fontWeight: '800' }}
                  >
                    <Trash2 size={16} /> Quitar Imagen Actual
                  </button>
                </div>
              )}


              <button onClick={handlePublish} disabled={publishing} className={styles.btnPrimary} style={{ width: '100%', padding: '16px', background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', gap: '10px', fontSize: '14px' }}>
                {publishing ? 'Procesando Publicación...' : <><Send size={18}/> {event.status === 'PUBLICADA' ? 'Actualizar Publicación' : 'Publicar Evento'}</>}
              </button>
            </div>
          )}

          {canManage && (
            <div className={styles.actionPanel} style={{ background: 'white', border: '1px solid #f1f5f9', marginTop: canPublish || canReview ? '20px' : '0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
                <h4 className={styles.actionPanelTitle}>🛠️ Administración del Evento</h4>
                <div style={{ display: 'flex', gap: '12px' }}>
                  {event.status === 'PUBLICADA' && (
                    <button onClick={handleToggleVisibility} disabled={manageLoading} style={{ padding: '10px 20px', borderRadius: '30px', background: localVisible ? '#f8fafc' : '#1e293b', color: localVisible ? '#475569' : 'white', border: '1px solid #e2e8f0', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {localVisible ? <><EyeOff size={14}/> Ocultar Evento</> : <><Eye size={14}/> Mostrar Evento</>}
                    </button>
                  )}
                  <button onClick={handleDelete} disabled={manageLoading} style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#fff1f2', color: '#ef4444', border: '1px solid #fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Trash2 size={18}/></button>
                </div>
              </div>

              {/* ACCIONES DE SERIE RECURRENTE */}
              {event.idGrupoRecurrencia && event.esPrincipal && !isEditing && (
                <div style={{ marginBottom: '20px', padding: '15px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#64748b', fontSize: '12px', fontWeight: 'bold' }}>
                    <Calendar size={14} /> ACCIONES DE TODA LA SERIE
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {(event.status === 'PENDIENTE' || event.status === 'RECHAZADA') && isAdmin && (
                      <button 
                        onClick={() => handleSerieAction('aprobar')} 
                        disabled={loadingAction}
                        className={styles.btnSuccess} 
                        style={{ flex: 1, padding: '10px', fontSize: '12px', background: '#10b981' }}
                      >
                        <CheckCircle size={14} /> Aprobar Toda la Serie
                      </button>
                    )}
                    {event.status === 'APROBADA' && isAdmin && (
                      <button 
                        onClick={handlePublishSerie} 
                        disabled={publishing}
                        className={styles.btnDanger} 
                        style={{ flex: 1, padding: '10px', fontSize: '12px', background: '#ef4444' }}
                      >
                        <Send size={14} /> Publicar Toda la Serie
                      </button>
                    )}
                    <button 
                      onClick={() => handleSerieAction('eliminar')} 
                      disabled={loadingAction}
                      className={styles.btnSecondary} 
                      style={{ flex: 1, padding: '10px', fontSize: '12px', color: '#ef4444', borderColor: '#fecaca' }}
                    >
                      <Trash2 size={14} /> Eliminar Toda la Serie
                    </button>
                  </div>
                </div>
              )}

              {!isEditing ? (
                <button onClick={() => setIsEditing(true)} className={styles.btnSecondary} style={{ width: '100%', padding: '16px', color: '#1e293b', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                  <Edit2 size={18} /> Actualizar Información Pública
                </button>
              ) : (
                <>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button onClick={() => {
                      setIsEditing(false);
                      // Revert formData fully to what server sent
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
                        lugar: event.lugar || '',
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
                      setPublishFilePreview(event.piezaGraficaUrl || null);
                      setPublishFile(null);
                  }} className={styles.btnSecondary} style={{ flex: 1, padding: '14px' }}>Descartar cambios</button>
                  <button
                    onClick={handleSaveEdition}
                    disabled={manageLoading}
                    className={styles.btnDanger}
                    style={{ flex: 1, padding: '14px' }}
                  >
                    {manageLoading
                      ? 'Guardando...'
                      : (event.esPrincipal && event.idGrupoRecurrencia)
                        ? (aplicarASerie ? 'Guardar en toda la serie' : 'Guardar solo este evento')
                        : 'Guardar Cambios'
                    }
                  </button>
                </div>
                {event.esPrincipal && event.idGrupoRecurrencia && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                    <button
                      onClick={() => setAplicarASerie(false)}
                      style={{
                        flex: 1, padding: '10px', borderRadius: '10px', fontSize: '12px', fontWeight: 'bold',
                        cursor: 'pointer', border: '2px solid',
                        borderColor: !aplicarASerie ? '#ce1126' : '#e2e8f0',
                        background: !aplicarASerie ? '#fff1f2' : '#f8fafc',
                        color: !aplicarASerie ? '#ce1126' : '#64748b',
                        transition: 'all 0.2s'
                      }}
                    >
                      Solo este evento
                    </button>
                    <button
                      onClick={() => setAplicarASerie(true)}
                      style={{
                        flex: 1, padding: '10px', borderRadius: '10px', fontSize: '12px', fontWeight: 'bold',
                        cursor: 'pointer', border: '2px solid',
                        borderColor: aplicarASerie ? '#ce1126' : '#e2e8f0',
                        background: aplicarASerie ? '#fff1f2' : '#f8fafc',
                        color: aplicarASerie ? '#ce1126' : '#64748b',
                        transition: 'all 0.2s'
                      }}
                    >
                      Aplicar a toda la serie
                    </button>
                  </div>
                )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Panel de edición para oficina (PENDIENTE / RECHAZADA / EN_REVISION) */}
        {canEditOwn && (
          <div style={{ marginTop: '20px', padding: '20px', border: '1px solid #e2e8f0', borderRadius: '12px', background: 'white' }}>
            <h4 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: '700', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Edit2 size={16} color="#ce1126" /> Mi solicitud
            </h4>
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className={styles.btnSecondary}
                style={{ width: '100%', padding: '14px', color: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
              >
                <Edit2 size={16} /> Editar y reenviar solicitud
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setIsEditing(false)}
                  className={styles.btnSecondary}
                  style={{ flex: 1, padding: '14px' }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveEdition}
                  disabled={manageLoading}
                  className={styles.btnPrimary}
                  style={{ flex: 1, padding: '14px', background: 'linear-gradient(135deg, #ce1126 0%, #a50e1f 100%)' }}
                >
                  {manageLoading ? 'Guardando...' : 'Guardar y reenviar'}
                </button>
              </div>
            )}
          </div>
        )}

        <ParticipantModal
          isOpen={showParticipantModal}
          onClose={() => setShowParticipantModal(false)} 
          mode={participantMode} 
          initialData={editingParticipantIndex !== null ? formData.participantes[editingParticipantIndex] : null} 
          isReadOnly={false} 
          onSave={(data) => {
            if (editingParticipantIndex !== null) { 
               const updated = [...formData.participantes];
               updated[editingParticipantIndex] = { ...data, tipo: participantMode.toUpperCase() };
               setFormData(prev => ({...prev, participantes: updated}));
            } 
            else { 
               setFormData(prev => ({...prev, participantes: [...prev.participantes, { ...data, tipo: participantMode.toUpperCase(), id: Date.now() }]})); 
            }
            setShowParticipantModal(false);
          }} 
        />
        {viewingParticipant && (
          <ParticipantModal 
            isOpen={!!viewingParticipant} 
            onClose={() => setViewingParticipant(null)} 
            mode={viewingParticipant.tipo?.toLowerCase() || 'invitado'} 
            initialData={viewingParticipant} 
            isReadOnly={true} 
            onSave={() => setViewingParticipant(null)} 
          />
        )}
        </div>
    </Modal>
  );
};

export default EventDetailModal;

