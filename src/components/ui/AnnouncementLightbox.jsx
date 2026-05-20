import React from 'react';
import { X } from 'lucide-react';
import { resolveImageUrl } from '../../utils/url';

import { formatLocalDate } from '../../utils/dateUtils';

const AnnouncementLightbox = ({ announcement, onClose }) => {
  if (!announcement) return null;
  const imgUrl = resolveImageUrl(announcement.piezaGraficaUrl);
  
  const lugaresArr = announcement.lugares || announcement.lugaresFisicos || [];
  const lugaresStr = lugaresArr.length > 0
    ? lugaresArr.map(l => typeof l === 'object' ? l.nombre : l).join(', ')
    : 'General / Múltiples ubicaciones';

  const fechaVigencia = announcement.fechaInicioPublicacion 
    ? `${formatLocalDate(announcement.fechaInicioPublicacion)} al ${announcement.fechaFinPublicacion ? formatLocalDate(announcement.fechaFinPublicacion) : 'N/A'}`
    : 'Vigencia no especificada';

  return (
    <div 
      className="fade-in"
      onClick={onClose} 
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        padding: '24px', backgroundColor: 'rgba(255, 255, 255, 0.98)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(4px)'
      }}
    >
      <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '20px', fontWeight: '500' }}>
        Haz clic fuera para cerrar
      </p>
      <div 
        className="scale-in"
        onClick={e => e.stopPropagation()} 
        style={{
          background: '#fff', borderRadius: '30px', overflow: 'hidden',
          maxWidth: '700px', width: '100%',
          boxShadow: '0 40px 100px rgba(0,0,0,0.15)',
          border: '1px solid #f1f5f9',
          position: 'relative', 
          maxHeight: '85vh',
          display: 'flex', 
          flexDirection: 'column'
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '20px', right: '20px',
            width: '40px', height: '40px', borderRadius: '50%',
            backgroundColor: 'white', border: '1px solid #f1f5f9',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', zIndex: 10, boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
            color: '#1e293b'
          }}
        >
          <X size={20} />
        </button>

        {/* Contenedor scrolleable interno */}
        <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px', flexShrink: 0 }}>
            {imgUrl ? (
              <img src={imgUrl} alt={announcement.titulo || announcement.title}
                style={{ width: '100%', display: 'block', maxHeight: '60vh', objectFit: 'contain' }} />
            ) : (
              <div style={{ padding: '80px', textAlign: 'center' }}>
                 <div style={{ fontSize: '70px', marginBottom: '20px' }}>📢</div>
                 <p style={{ color: '#94a3b8', fontWeight: 'bold', fontSize: '18px' }}>Sin pieza gráfica</p>
              </div>
            )}
          </div>

          <div style={{ padding: '30px', background: 'white', flexShrink: 0 }}>
            <h3 style={{ margin: '0 0 15px', fontSize: '24px', fontWeight: '800', color: '#1e293b' }}>
              {announcement.titulo || announcement.title}
            </h3>
            
            <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '15px', border: '1px solid #f1f5f9', marginBottom: '20px' }}>
              <p style={{ margin: 0, fontSize: '15px', color: '#334155', lineHeight: '1.7' }}>
                {announcement.descripcion || announcement.desc}
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', fontSize: '13px', color: '#475569' }}>
              <div>
                <span style={{ display: 'block', fontWeight: '700', color: '#1e293b', marginBottom: '4px', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.5px' }}>📆 Vigencia</span>
                {fechaVigencia}
              </div>
              <div>
                <span style={{ display: 'block', fontWeight: '700', color: '#1e293b', marginBottom: '4px', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.5px' }}>📍 Lugar</span>
                {lugaresStr}
              </div>
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '15px', marginTop: '5px' }}>
                <span style={{ display: 'block', fontWeight: '700', color: '#1e293b', marginBottom: '4px', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.5px' }}>👤 Responsable</span>
                {announcement.responsableAnuncio || announcement.responsable || 'No especificado'}
              </div>
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '15px', marginTop: '5px' }}>
                <span style={{ display: 'block', fontWeight: '700', color: '#1e293b', marginBottom: '4px', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.5px' }}>✉️ Contacto</span>
                <a href={`mailto:${announcement.correoContacto}`} style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: '600' }}>
                  {announcement.correoContacto || 'No especificado'}
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnnouncementLightbox;
