import React, { useContext, useState } from 'react';
import Modal from './Modal';
import { AuthContext } from '../../context/AuthContext';
import { resolveImageUrl } from '../../utils/url';
import AmPmTimePicker from './AmPmTimePicker';
import { useAnnouncementManagement } from '../../hooks/useAnnouncementManagement';
import { getOficinas } from '../../services/oficinas.service';
import { getTiposEvento } from '../../services/tipoEvento.service';
import { Eye, EyeOff, Trash2, Calendar, Clock, MapPin, Tag, Mail, Send, CheckCircle, AlertCircle, Edit2, ShieldCheck, Image as ImageIcon, X, Layers, User, Upload, Download, Map, Info } from 'lucide-react';
import lugarFisicoService from '../../services/lugarFisico.service';
import styles from './DetailModal.module.css';

const AnnouncementDetailModal = ({ isOpen, onClose, announcement, onSuccess, isReadOnly = false }) => {
  const { user } = useContext(AuthContext);
  const [oficinas, setOficinas] = useState([]);
  const [tiposEvento, setTiposEvento] = useState([]);
  const [lugaresFisicos, setLugaresFisicos] = useState([]);

  const cargarCatalogos = async () => {
    try {
      const userRol = user?.rol?.toString().toUpperCase() || '';
      const isPrivileged = ['SUPER_ADMIN', 'ADMIN', 'COMUNICACIONES'].includes(userRol);

      const [ofis, tipos, lugs] = await Promise.allSettled([
        isPrivileged ? getOficinas({ skipGlobalError: true }) : Promise.resolve([]),
        getTiposEvento(),
        lugarFisicoService.getLugaresFisicos()
      ]);
      if (ofis.status === 'fulfilled') setOficinas(Array.isArray(ofis.value) ? ofis.value : []);
      if (tipos.status === 'fulfilled') setTiposEvento(Array.isArray(tipos.value) ? tipos.value : []);
      if (lugs.status === 'fulfilled') setLugaresFisicos(Array.isArray(lugs.value) ? lugs.value : []);
    } catch (e) {
      console.error(e);
    }
  };

  React.useEffect(() => {
    if (isOpen) {
      cargarCatalogos();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const {
    isEditing, setIsEditing, formData, setFormData, handleInputChange,
    loadingAction, manageLoading, publishing,
    rejecting, setRejecting, rejectReason, setRejectReason,
    reviewing, setReviewing, reviewObservations, setReviewObservations,
    publishFile, setPublishFile, publishFilePreview, setPublishFilePreview, localVisible,
    handleStatusUpdate, handleSaveEdition, handleToggleVisibility, handleDelete, handlePublish
  } = useAnnouncementManagement(announcement, onSuccess, onClose);

  const getImageUrl = (url) => resolveImageUrl(url);

  const handleDownloadImage = async (url, title) => {
    if (!url) return;
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `Anuncio_${title.replace(/\s+/g, '_')}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Error al descargar la imagen:", error);
      window.open(url, '_blank');
    }
  };

  if (!announcement) return null;

  // Permisos
  const status = announcement.status?.toUpperCase() || '';
  const isAdmin = user?.rol === 'ADMIN' || user?.rol === 'SUPER_ADMIN' || user?.rol === 'COMUNICACIONES';
  const isSuperAdmin = user?.rol === 'SUPER_ADMIN';
  // CONSULTORIA es revisor de SOLO LECTURA
  const isReadOnlyReviewer = user?.rol === 'CONSULTORIA';

  const canReview = isAdmin && status === 'PENDIENTE';
  const canPublish = isAdmin && status === 'APROBADA';
  const canManage = isAdmin && (status === 'PUBLICADA' || status === 'APROBADA');
  const canEditOwn = !isAdmin && !isReadOnly && !isReadOnlyReviewer && (status === 'PENDIENTE' || status === 'RECHAZADA' || status === 'EN_REVISION');

  const formatTime12h = (time) => {
    if (!time) return '—';
    let h, m;
    if (Array.isArray(time)) { [h, m] = time; }
    else if (typeof time === 'string') {
      if (!time.includes(':')) return '—';
      [h, m] = time.split(':');
    } else { return '—'; }
    let hour = parseInt(h, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12 || 12;
    return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
  };

  const statusConfig = {
    PENDIENTE:   { label: 'Pendiente',    subtitle: 'En espera de revisión',        color: '#f59e0b', bg: '#fffbeb', border: '#fef3c7', text: '#d97706' },
    APROBADA:    { label: 'Aprobada',     subtitle: 'Lista para ser publicada',      color: '#10b981', bg: '#f0fdf4', border: '#dcfce7', text: '#059669' },
    RECHAZADA:   { label: 'Rechazada',    subtitle: 'Revisa el motivo del rechazo',  color: '#ef4444', bg: '#fef2f2', border: '#fee2e2', text: '#dc2626' },
    PUBLICADA:   { label: 'Publicada',    subtitle: 'Visible en la plataforma',      color: '#0ea5e9', bg: '#f0f9ff', border: '#e0f2fe', text: '#0284c7' },
    EN_REVISION: { label: 'En revisión',  subtitle: 'Correcciones solicitadas',      color: '#8b5cf6', bg: '#faf5ff', border: '#ede9fe', text: '#7c3aed' }
  }[status] || { label: status, subtitle: '', color: '#64748b', bg: '#f8fafc', border: '#e2e8f0', text: '#475569' };


  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPublishFile(file);
      setPublishFilePreview(URL.createObjectURL(file));
    }
  };

  // ─── Renderizado de campos (lectura / edición) ───────────────────────────────
  const renderField = (label, name, icon, value, isMultiline, type = 'text', additionalProps = {}, forceReadOnly = false) => (
    <div style={{ marginBottom: '15px' }}>
      <label className={styles.fieldLabel}>
        {icon}
        {label}
      </label>
      {(isEditing && !forceReadOnly) ? (
        isMultiline ? (
          <textarea
            name={name}
            value={formData[name]}
            onChange={handleInputChange}
            className={styles.inputField}
            style={{ minHeight: '100px' }}
          />
        ) : type === 'time' ? (
          <AmPmTimePicker
            value={formData[name]}
            onChange={(e) => setFormData(prev => ({ ...prev, [name]: e.target.value }))}
          />
        ) : type === 'tipoEvento' ? (
              <select name={name} value={formData[name] || ''} onChange={(e) => {
                  const val = e.target.value;
                  const selected = tiposEvento.find(t => String(t.id || t.idTipoEvento) === val || t.nombre === val);
                  setFormData(prev => ({...prev, categoria: selected ? selected.nombre : val}));
              }} className={styles.inputField}>
                 <option value={formData[name]}>{formData[name] || 'Seleccione Categoría'}</option>
                 {(tiposEvento || []).map(t => (
                     <option key={t.id || t.idTipoEvento} value={t.nombre}>{t.nombre}</option>
                 ))}
              </select>
        ) : type === 'oficina' ? (
          <select name={name} value={formData[name] || ''} onChange={(e) => {
              const val = e.target.value;
              const selected = oficinas.find(o => String(o.id || o.idOficina) === val || o.nombre === val);
              setFormData(prev => ({...prev, oficina: selected ? selected.nombre : val, idOficina: selected ? (selected.id || selected.idOficina) : ''}));
          }} className={styles.inputField}>
             <option value={formData[name]}>{formData[name] || 'Seleccione Oficina'}</option>
             {(oficinas || []).map(o => (
                 <option key={o.id || o.idOficina} value={o.nombre}>{o.nombre}</option>
             ))}
          </select>
        ) : (
          <input
            type={type}
            name={name}
            value={formData[name]}
            onChange={handleInputChange}
            className={styles.inputField}
            {...additionalProps}
          />
        )
      ) : (
        <div style={{ fontSize: '15px', color: '#1e293b', fontWeight: 'bold' }}>{value || '—'}</div>
      )}
    </div>
  );


  const showHeroSection = status === 'PUBLICADA' || (status === 'PENDIENTE' && publishFilePreview);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Anuncio #${announcement.id}`}
      style={{ maxWidth: '750px', width: '95%' }}>

      <div className={styles.container} style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '10px 0' }}>


        {/* ── Banner de Estado (Top) ── */}
        {!isReadOnly && (
          <div className={styles.statusBar} style={{
            background: statusConfig.bg, border: `1.5px solid ${statusConfig.border}`, marginBottom: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div className={styles.statusIconContainer} style={{ background: statusConfig.text }}>
                <Send size={20} color="white" />
              </div>
              <div>
                <div className={styles.statusLabel} style={{ color: statusConfig.text }}>{statusConfig.label}</div>
                <div className={styles.statusValue} style={{ fontSize: '14px' }}>{statusConfig.subtitle}</div>
              </div>
            </div>
            {canManage && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '800', marginBottom: '2px', textTransform: 'uppercase' }}>Visibilidad</div>
                <div style={{
                  fontSize: '14px', fontWeight: '800',
                  color: localVisible ? '#059669' : '#d97706',
                  display: 'flex', alignItems: 'center', gap: '6px'
                }}>
                  {localVisible ? <><Eye size={16} /> Público</> : <><EyeOff size={16} /> Oculto</>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Banner observaciones de revisión */}
        {!isReadOnly && announcement.observacionesRevision && (
          <div style={{ padding: '14px 18px', borderRadius: '12px', background: '#faf5ff', border: '1px solid #ede9fe' }}>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#7c3aed', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertCircle size={14} /> Observaciones del moderador
            </div>
            <p style={{ margin: 0, fontSize: '14px', color: '#1e293b', lineHeight: '1.6' }}>{announcement.observacionesRevision}</p>
          </div>
        )}

        {/* ── SECCIÓN HERO: PIEZA GRÁFICA / INVITACIÓN ── */}
        {showHeroSection && (
          <div className={styles.card} style={{ border: '2px solid #6ee7b7', background: 'linear-gradient(135deg,#ecfdf5,#f0fdf4)', marginTop: '0' }}>
              <div style={{ fontSize: '14px', fontWeight: '800', color: '#065f46', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <Send size={18} /> PIEZA GRÁFICA / INVITACIÓN
              </div>
              
              <div style={{
                height: '240px', background: 'white', borderRadius: '14px',
                border: '2px dashed #d1fae5', overflow: 'hidden',

                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative', cursor: isEditing ? 'pointer' : 'default',
                transition: 'all 0.3s ease'
              }} onClick={() => isEditing && document.getElementById(`ann-file-edit-${announcement.id}`)?.click()}>
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
                        onClick={() => handleDownloadImage(getImageUrl(publishFilePreview), announcement.titulo)}
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
                    onClick={() => document.getElementById(`ann-file-edit-${announcement.id}`).click()}
                    className={styles.btnSecondary} 
                    style={{ width: '100%', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 'bold', background: '#1e293b', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                  >
                    <Upload size={18} /> {publishFilePreview ? 'Cambiar Pieza Gráfica' : 'Subir Pieza Gráfica'}
                  </button>
                  <input id={`ann-file-edit-${announcement.id}`} type="file" accept="image/*" hidden onChange={handleFileChange} />
                </div>
              ) : (
                publishFilePreview && (
                  <div style={{ marginTop: '14px' }}>
                    <button
                      type="button"
                      onClick={() => handleDownloadImage(getImageUrl(publishFilePreview), announcement.titulo)}
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


        {/* ── Contenido Principal Layout ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          
          <div className={styles.card} style={{ gridColumn: '1 / -1', background: '#f8fafc' }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#64748b', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Tag size={14} color="#ce1126" /> Información General
            </div>
            {renderField("Título", "titulo", <Tag size={11} />, announcement.titulo, false)}
            {renderField("Descripción", "descripcion", <Info size={11} />, announcement.descripcion, true)}
          </div>

          <div className={styles.card} style={{ background: '#f8fafc' }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#64748b', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MapPin size={14} color="#ce1126" /> Ubicación y Contacto
            </div>
            <div style={{ marginBottom: '15px' }}>
                <label className={styles.fieldLabel}>
                  <MapPin size={11} /> Lugares Físicos
                </label>
                {isEditing ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <select 
                      className={styles.inputField}
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
                        <div key={id} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f1f5f9', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>
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
                    {(formData.lugares || []).length > 0 ? (formData.lugares || []).map((l, i) => (
                      <span key={i} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>{l}</span>
                    )) : <div style={{ fontSize: '15px', color: '#1e293b', fontWeight: 'bold' }}>No definido</div>}
                  </div>
                )}
            </div>
            {renderField("Correo de Contacto", "correoContacto", <Mail size={11} />, announcement.correoContacto, false, "email", { readOnly: true, style: isEditing ? { backgroundColor: '#f8fafc', color: '#64748b' } : {} })}
          </div>

          <div className={styles.card} style={{ background: '#f8fafc' }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#64748b', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldCheck size={14} color="#ce1126" /> Información de la Solicitud
            </div>
            {renderField("Oficina Solicitante", "oficina", <Layers size={11} />, announcement.oficinaNombre || announcement.oficina || 'N/A', false, 'oficina', {}, !isSuperAdmin)}
            {renderField("Usuario Solicitante", "responsable", <User size={11} />, 
              announcement.usuarioSolicitanteNombre && announcement.usuarioSolicitanteNombre !== 'N/A' ? announcement.usuarioSolicitanteNombre : (announcement.responsableAnuncio || announcement.responsable || 'N/A'), 
              false, 'text', {}, !isSuperAdmin)}
            {isEditing && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '12px', cursor: 'pointer', padding: '10px', backgroundColor: formData.requierePiezaGrafica ? '#fff1f2' : 'transparent', borderRadius: '8px', border: formData.requierePiezaGrafica ? '1px solid #fecaca' : '1px solid #e2e8f0' }}>
                <input 
                  type="checkbox" 
                  checked={formData.requierePiezaGrafica} 
                  onChange={e => setFormData({...formData, requierePiezaGrafica: e.target.checked})}
                  style={{ width: '18px', height: '18px' }}
                />
                <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e293b' }}>Requiere Pieza Gráfica</span>
              </label>
            )}
            {!isEditing && (
              <div style={{ padding: '10px', borderRadius: '10px', background: formData.requierePiezaGrafica ? '#fff1f2' : '#f8fafc', border: '1px solid #e2e8f0', fontSize: '12px', fontWeight: 'bold', color: formData.requierePiezaGrafica ? '#ce1126' : '#94a3b8', marginTop: '10px' }}>
                  {formData.requierePiezaGrafica ? '✅ Requiere Pieza Gráfica' : '❌ No Pieza Gráfica'}
              </div>
            )}
          </div>

          <div className={styles.cardGrey} style={{ gridColumn: '1 / -1' }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#64748b', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={14} color="#ce1126" /> Vigencia de la Publicación
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              {renderField("Fecha Inicio", "fechaInicioPublicacion", <Calendar size={11} />, formData.fechaInicioPublicacion, false, "date")}
              {renderField("Fecha Fin", "fechaFinPublicacion", <Calendar size={11} />, formData.fechaFinPublicacion, false, "date")}
              {renderField("Hora Inicio", "horaInicio", <Clock size={11} />, formatTime12h(formData.horaInicio), false, "time")}
              {renderField("Hora Fin", "horaFin", <Clock size={11} />, formatTime12h(formData.horaFin), false, "time")}
            </div>
          </div>
        </div>



        {/* ── Panel de Revisión (PENDIENTE) ── */}
        {(canReview && !isReadOnly) && (
          <div className={styles.actionPanel} style={{ border: '1px solid #e2e8f0', background: 'linear-gradient(135deg, #fff 0%, #f8fafc 100%)' }}>
            <h4 className={styles.actionPanelTitle}>
              <CheckCircle size={18} color="#ce1126" /> Decisión Administrativa
            </h4>
            {rejecting && (
              <div style={{ marginBottom: '16px' }}>
                <label className={styles.fieldLabel}>Motivo del Rechazo</label>
                <textarea
                  value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                  placeholder="Indique las razones..."
                  className={styles.inputField} style={{ minHeight: '80px' }}
                />
              </div>
            )}
            {reviewing && (
              <div style={{ marginBottom: '16px' }}>
                <label className={styles.fieldLabel}>Observaciones para la oficina</label>
                <textarea
                  value={reviewObservations} onChange={e => setReviewObservations(e.target.value)}
                  placeholder="Describa qué debe corregir la oficina antes de reenviar..."
                  className={styles.inputField} style={{ minHeight: '80px' }}
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
                  onClick={() => handleStatusUpdate('Devolver')} disabled={loadingAction}
                  style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 20px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}
                >
                  {reviewing ? 'Confirmar Devolución' : 'En revisión'}
                </button>
              )}
              {!rejecting && !reviewing && (
                <button onClick={() => handleStatusUpdate('Aprobar')} disabled={loadingAction} className={styles.btnPrimary} style={{ background: 'linear-gradient(135deg, #ce1126 0%, #a50e1f 100%)' }}>
                  Aprobar Solicitud
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Panel de Publicación (APROBADA) ── */}
        {(canPublish && !isReadOnly) && (
          <div className={styles.actionPanel} style={{ background: 'linear-gradient(135deg,#ecfdf5,#f0fdf4)', border: '1.5px solid #6ee7b7' }}>
            <h4 className={styles.actionPanelTitle} style={{ color: '#065f46' }}>
              🚀 Lanzamiento de Comunicación
            </h4>
            
            <div 
              onClick={() => document.getElementById(`ann-file-up-${announcement.id}`).click()} 
              style={{ height: '200px', background: 'white', border: '2px dashed #d1fae5', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', marginBottom: '20px', overflow: 'hidden' }}
            >
              {publishFilePreview ? (
                <img src={getImageUrl(publishFilePreview)} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="Preview" />
              ) : (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '42px', marginBottom: '12px' }}>🖼️</div>
                  <div style={{ color: '#059669', fontWeight: '800', fontSize: '14px' }}>Subir Pieza Gráfica para Publicar</div>
                </div>
              )}
            </div>
            <input id={`ann-file-up-${announcement.id}`} type="file" accept="image/*" hidden onChange={handleFileChange} />

            {publishFilePreview && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '15px' }}>
                <button 
                  onClick={() => handleDownloadImage(getImageUrl(publishFilePreview), announcement.titulo)}
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



            <button
              onClick={handlePublish} disabled={publishing}
              className={styles.btnPrimary} style={{ width: '100%', background: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '16px' }}
            >
              <Send size={15} /> {publishing ? 'Procesando...' : 'Hacer Público Ahora'}
            </button>
          </div>
        )}


        {/* ── Panel de Gestión de Contenido ── */}
        {(canManage && !isReadOnly) && (
          <div className={styles.actionPanel} style={{ border: '1px solid #f1f5f9', background: 'white', marginTop: canReview || canPublish ? '20px' : '0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
              <h4 className={styles.actionPanelTitle}>
                <ShieldCheck size={18} color="#ce1126"/> Administración del Anuncio
              </h4>
              <div style={{ display: 'flex', gap: '12px' }}>
                {announcement.status?.toUpperCase() === 'PUBLICADA' && (
                  <button
                    onClick={handleToggleVisibility} disabled={manageLoading}
                    style={{ 
                      padding: '10px 20px', borderRadius: '30px', 
                      background: localVisible ? '#f8fafc' : '#1e293b', 
                      color: localVisible ? '#475569' : 'white', 
                      border: '1px solid #e2e8f0', fontWeight: 'bold', 
                      fontSize: '12px', cursor: 'pointer', display: 'flex', 
                      alignItems: 'center', gap: '8px' 
                    }}
                  >
                    {localVisible ? <><EyeOff size={14}/> Ocultar Anuncio</> : <><Eye size={14}/> Mostrar Anuncio</>}
                  </button>
                )}
                <button
                  onClick={handleDelete} 
                  disabled={manageLoading}
                  style={{ 
                    width: '40px', height: '40px', borderRadius: '12px', 
                    background: '#fff5f5', color: '#ef4444', border: '1px solid #fee2e2', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' 
                  }}
                >
                  <Trash2 size={18}/>
                </button>
              </div>
            </div>

            {!isEditing ? (
              <button 
                onClick={() => setIsEditing(true)} 
                className={styles.btnSecondary} style={{ width: '100%', padding: '16px', color: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
              >
                <Edit2 size={18} /> Actualizar Información Pública
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  onClick={() => {
                      setIsEditing(false);
                      // Revert formData fully to what server sent
                      let formattedFechaPub = '';
                      if (announcement.fechaInicioPublicacion) {
                        if (typeof announcement.fechaInicioPublicacion === 'string') {
                          formattedFechaPub = announcement.fechaInicioPublicacion.split('T')[0];
                        } else if (Array.isArray(announcement.fechaInicioPublicacion)) {
                          formattedFechaPub = `${announcement.fechaInicioPublicacion[0]}-${String(announcement.fechaInicioPublicacion[1]).padStart(2, '0')}-${String(announcement.fechaInicioPublicacion[2]).padStart(2, '0')}`;
                        }
                      }
                      
                      let formattedFechaFin = '';
                      if (announcement.fechaFinPublicacion) {
                        if (typeof announcement.fechaFinPublicacion === 'string') {
                          formattedFechaFin = announcement.fechaFinPublicacion.split('T')[0];
                        } else if (Array.isArray(announcement.fechaFinPublicacion)) {
                          formattedFechaFin = `${announcement.fechaFinPublicacion[0]}-${String(announcement.fechaFinPublicacion[1]).padStart(2, '0')}-${String(announcement.fechaFinPublicacion[2]).padStart(2, '0')}`;
                        }
                      }

                      setFormData({
                        titulo: announcement.titulo || '',
                        descripcion: announcement.descripcion || '',
                        fechaInicioPublicacion: formattedFechaPub,
                        fechaFinPublicacion: formattedFechaFin,
                        horaInicio: announcement.horaInicio || '',
                        horaFin: announcement.horaFin || '',
                        lugar: announcement.lugar || '',
                        lugares: Array.isArray(announcement.lugares) ? announcement.lugares : [],
                        idsLugaresFisicos: Array.isArray(announcement.idsLugaresFisicos) ? announcement.idsLugaresFisicos : [],
                        correoContacto: announcement.correoContacto || '',
                        oficina: announcement.oficina || '',
                        idOficina: announcement.idOficina || '',
                        responsable: announcement.responsable || announcement.responsableAnuncio || ''
                      });
                      setPublishFilePreview(announcement.piezaGraficaUrl || null);
                      setPublishFile(null);
                  }} 
                  className={styles.btnSecondary} style={{ flex: 1, padding: '14px' }}
                >
                  Descartar cambios
                </button>
                <button 
                  onClick={handleSaveEdition} disabled={manageLoading} 
                  className={styles.btnDanger} style={{ flex: 1, padding: '14px', boxShadow: '0 8px 20px rgba(30,41,59,0.2)' }}
                >
                  {manageLoading ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Panel de edición para oficina (PENDIENTE / RECHAZADA / EN_REVISION) */}
        {canEditOwn && (
          <div style={{ padding: '20px', border: '1px solid #e2e8f0', borderRadius: '12px', background: 'white' }}>
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
        </div>
    </Modal>
  );
};

export default AnnouncementDetailModal;
