import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom'; // Importante para escapar de modales anidados
import { uploadArchivo } from '../../services/archivos.service';
import { 
  User, 
  Mail, 
  Phone, 
  FileText, 
  Plus as BriefcaseIcon, 
  Camera, 
  Check,
  X,
  Download
} from 'lucide-react';
import { resolveImageUrl } from '../../utils/url';
import notification from '../../utils/notification';

// Sub-componente Drawer con PORTALS para evitar el "Atrapado en Modal"
const DrawerPortal = ({ isOpen, onClose, title, children, width = '520px' }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => { document.body.style.overflow = 'auto'; };
  }, [isOpen]);

  if (!isOpen) return null;

  const overlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.85)', // Más oscuro para aislamiento total
    display: 'flex',
    justifyContent: 'flex-end',
    zIndex: 10000, 
    backdropFilter: 'blur(4px)', // Más desenfoque para efecto premium
    animation: 'fadeIn 0.2s ease-out'
  };

  const drawerStyle = {
    backgroundColor: '#ffffff',
    height: '100%',
    width: `min(${width}, 100%)`,
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '-15px 0 35px rgba(0, 0, 0, 0.2)',
    position: 'relative',
    borderLeft: '1px solid #e2e8f0',
    animation: 'slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards'
  };

  const headerStyle = {
    padding: '24px 32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '1px solid #f1f5f9',
    background: '#fff',
    zIndex: 10
  };

  // Renderizamos en document.body para que NADA lo atrape
  return createPortal(
    <div style={overlayStyle} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={drawerStyle}>
        <div style={headerStyle}>
          <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>{title}</h2>
          <button 
            onClick={onClose} 
            style={{ 
              background: '#f8fafc', border: '1px solid #e2e8f0', color: '#64748b', 
              width: '36px', height: '36px', borderRadius: '50%', display: 'flex', 
              alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Cuerpo con Scroll propio */}
        <div style={{ flex: 1, overflowY: 'auto', background: '#fff' }}>
          {children}
        </div>
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>,
    document.body
  );
};

const ParticipantModal = ({ isOpen, onClose, onSave, mode, initialData, isReadOnly = false }) => {
  const [participant, setParticipant] = useState({
    nombre: '',
    descripcion: '',
    cargo: '',
    correo: '',
    telefono: '',
    fotoUrl: null
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setParticipant(initialData);
      } else {
        setParticipant({ nombre: '', descripcion: '', cargo: '', correo: '', telefono: '', fotoUrl: null });
      }
    }
  }, [isOpen, initialData]);

  const handleChange = (e) => {
    if (isReadOnly) return;
    const { name, value } = e.target;
    setParticipant(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = async (e) => {
    if (isReadOnly || !e.target.files || !e.target.files[0]) return;
    try {
      setUploading(true);
      const uploadResult = await uploadArchivo(e.target.files[0]);
      const url = uploadResult.urlAcceso || uploadResult.urlDescarga || uploadResult.url;
      setParticipant(prev => ({ ...prev, fotoUrl: url }));
    } catch (error) {
      console.error("Error subiendo imagen:", error);
      notification.error('Error al subir la imagen: ' + (error.response?.data?.message || error.message || 'Verifica el formato y tamaño del archivo'));
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadImage = async (url, name) => {
    if (!url) return;
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `Perfil_${name.replace(/\s+/g, '_')}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Error al descargar la imagen:", error);
      // Fallback: abrir en nueva pestaña si falla el blob
      window.open(url, '_blank');
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (isReadOnly) {
      onClose();
      return;
    }
    onSave({ ...participant, id: participant.id || Date.now() });
    onClose();
  };

  const title = isReadOnly 
    ? 'Información del Perfil'
    : (initialData 
        ? (mode === 'invitado' ? 'Editar Invitado' : mode === 'colaborador' ? 'Editar Colaborador' : 'Editar Organizador') 
        : (mode === 'invitado' ? 'Nuevo Invitado' : mode === 'colaborador' ? 'Nuevo Colaborador' : 'Nuevo Organizador'));

  const getImageUrl = (url) => resolveImageUrl(url);

  if (!isOpen) return null;

  const inputStyle = (isRead) => ({
    padding: '16px 20px', 
    borderRadius: '16px', 
    border: isRead ? '1.5px solid #f1f5f9' : '1.5px solid #f1f5f9', 
    background: isRead ? '#f8fafc' : '#ffffff', 
    fontSize: '14px', 
    outline: 'none', 
    transition: 'all 0.2s',
    color: isRead ? '#475569' : '#0f172a',
    cursor: isRead ? 'default' : 'text'
  });

  return (
    <DrawerPortal isOpen={isOpen} onClose={onClose} title={title}>
      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
        
        {/* Contenido principal scrolleable */}
        <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '32px', flex: 1 }}>
          
          {/* Avatar Section Premium */}
          <div style={{ 
            display: 'flex', flexDirection: 'column', alignItems: 'center', 
            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', 
            padding: '40px', borderRadius: '32px', border: '1px solid #e2e8f0'
          }}>
            <div style={{ position: 'relative' }}>
              <div style={{ 
                width: '120px', height: '120px', borderRadius: '50%', backgroundColor: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                border: '4px solid #fff', boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
              }}>
                {uploading ? (
                  <div style={{ width: '20px', height: '20px', border: '3px solid #ce1126', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                ) : participant.fotoUrl ? (
                  <img src={getImageUrl(participant.fotoUrl)} alt="Perfil" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <User size={48} color="#cbd5e1" />
                )}
              </div>
              {!isReadOnly && (
                <button 
                  type="button" onClick={() => document.getElementById('av-up-3').click()}
                  style={{
                    position: 'absolute', bottom: '5px', right: '5px', width: '36px', height: '36px',
                    borderRadius: '12px', background: '#ce1126', color: 'white', border: '3px solid #fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(206,17,38,0.4)', transition: 'transform 0.2s'
                  }}
                >
                  <Camera size={16} />
                </button>
              )}
              <input id="av-up-3" type="file" accept="image/*" hidden onChange={handleImageChange} />
            </div>
            <div style={{ marginTop: '20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>{participant.nombre || 'Nuevo Perfil'}</h3>
              <p style={{ margin: '6px 0 0', fontSize: '14px', color: '#64748b', fontWeight: '600' }}>{participant.cargo || 'Cargo no asignado'}</p>
              
              {participant.fotoUrl && (
                <button
                  type="button"
                  onClick={() => handleDownloadImage(getImageUrl(participant.fotoUrl), participant.nombre)}
                  style={{
                    marginTop: '16px',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    background: '#fff',
                    border: '1.5px solid #e2e8f0',
                    color: '#64748b',
                    fontSize: '12px',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.borderColor = '#ce1126'; e.currentTarget.style.color = '#ce1126'; }}
                  onMouseOut={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#64748b'; }}
                >
                  <Download size={14} /> Descargar Imagen
                </button>
              )}
            </div>
          </div>

          {/* Form Fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <User size={12}/> Nombre Completo <span style={{color: '#ce1126'}}>*</span>
              </label>
              <input type="text" name="nombre" value={participant.nombre} onChange={handleChange} readOnly={isReadOnly} required placeholder="Nombre completo del participante" style={inputStyle(isReadOnly)} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BriefcaseIcon size={12}/> Cargo / Posición <span style={{color: '#ce1126'}}>*</span>
              </label>
              <input type="text" name="cargo" value={participant.cargo} onChange={handleChange} readOnly={isReadOnly} required placeholder="Ej. Director General" style={inputStyle(isReadOnly)} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '8px' }}><Mail size={12}/> Correo</label>
                <input type="email" name="correo" value={participant.correo} onChange={handleChange} readOnly={isReadOnly} placeholder={isReadOnly ? "N/A" : "nombre@ejemplo.com"} style={inputStyle(isReadOnly)} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '8px' }}><Phone size={12}/> Teléfono</label>
                <input type="tel" name="telefono" value={participant.telefono} onChange={handleChange} readOnly={isReadOnly} placeholder={isReadOnly ? "N/A" : "+57 300 0000000"} style={inputStyle(isReadOnly)} />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '8px' }}><FileText size={12}/> Biografía / Experiencia</label>
              <textarea name="descripcion" value={participant.descripcion} onChange={handleChange} readOnly={isReadOnly} rows="6" placeholder={isReadOnly ? "Sin descripción." : "Cuéntanos un poco sobre el perfil..."} style={{ ...inputStyle(isReadOnly), resize: 'none' }} />
            </div>
          </div>
        </div>

        {/* Footer FIJO (Sticky) */}
        <div style={{ 
          padding: '24px 32px', borderTop: '1px solid #f1f5f9', background: '#fff', 
          display: 'flex', gap: '16px', position: 'sticky', bottom: 0, 
          zIndex: 100, boxShadow: '0 -4px 15px rgba(0,0,0,0.03)' 
        }}>
          {isReadOnly ? (
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '16px', borderRadius: '32px', background: '#1e293b', color: '#fff', fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s', border: 'none' }}>
              Cerrar Vista
            </button>
          ) : (
            <>
              <button type="button" onClick={onClose} style={{ flex: 1, padding: '16px', borderRadius: '32px', background: '#fff', border: '2px solid #e2e8f0', color: '#64748b', fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s' }}>
                Cancelar
              </button>
              <button type="submit" disabled={uploading} style={{ flex: 2, padding: '16px', borderRadius: '32px', background: '#ce1126', color: '#fff', fontWeight: '800', cursor: 'pointer', boxShadow: '0 8px 25px rgba(206,17,38,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                {uploading ? 'Procesando...' : <><Check size={20}/> {initialData ? 'Guardar Cambios' : 'Confirmar Registro'}</>}
              </button>
            </>
          )}
        </div>
      </form>
    </DrawerPortal>
  );
};

export default ParticipantModal;
