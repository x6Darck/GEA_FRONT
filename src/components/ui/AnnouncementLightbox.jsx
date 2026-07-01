/**
 * Lightbox de anuncio para la galería pública de GEA.
 *
 * Muestra la pieza gráfica a tamaño completo (con `objectFit: contain` para no recortarla)
 * y un bloque de metadatos: vigencia, lugar, responsable y correo de contacto.
 * El overlay cierra el lightbox al hacer clic fuera del panel.
 * Usa {@link resolveImageUrl} para normalizar URLs relativas/localhost antes de pasarlas al `<img>`.
 *
 * @param {Object} announcement - Anuncio normalizado por {@link mapAnuncioDTO}.
 * @param {Function} onClose
 */
import React from 'react';
import { X, MapPin, User, Calendar, Mail } from 'lucide-react';
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
        position: 'fixed', inset: 0, zIndex: 'var(--z-modal-backdrop)',
        backgroundColor: 'rgba(20, 18, 16, 0.65)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '24px',
      }}
    >
      <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', marginBottom: '16px', fontWeight: '500' }}>
        Haz clic fuera para cerrar
      </p>
      <div
        className="scale-in"
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--surface)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          maxWidth: '680px', width: '100%',
          boxShadow: 'var(--shadow-modal)',
          border: '1px solid var(--border)',
          position: 'relative',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '16px', right: '16px',
            width: '36px', height: '36px', borderRadius: '50%',
            backgroundColor: 'var(--surface-2)',
            border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', zIndex: 10,
            color: 'var(--text-secondary)',
            transition: 'background-color var(--dur) var(--ease-standard)',
          }}
        >
          <X size={18} />
        </button>

        <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Imagen */}
          <div style={{
            backgroundColor: 'var(--surface-3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            minHeight: '260px', flexShrink: 0,
            borderBottom: '1px solid var(--border)',
          }}>
            {imgUrl ? (
              <img
                src={imgUrl}
                alt={announcement.titulo || announcement.title}
                style={{ width: '100%', display: 'block', maxHeight: '55vh', objectFit: 'contain' }}
              />
            ) : (
              <div style={{ padding: '60px', textAlign: 'center' }}>
                <p style={{ color: 'var(--text-muted)', fontWeight: '600', fontSize: '15px' }}>Sin pieza gráfica</p>
              </div>
            )}
          </div>

          {/* Contenido */}
          <div style={{ padding: '28px 32px', background: 'var(--surface)', flexShrink: 0 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '20px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.015em' }}>
              {announcement.titulo || announcement.title}
            </h3>

            {(announcement.descripcion || announcement.desc) && (
              <div style={{
                background: 'var(--surface-2)', padding: '16px 20px',
                borderRadius: 'var(--radius-md)', border: '1px solid var(--border)',
                marginBottom: '20px',
              }}>
                <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.65' }}>
                  {announcement.descripcion || announcement.desc}
                </p>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '13px' }}>
              <div>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.5px' }}>
                  <Calendar size={11} /> Vigencia
                </span>
                <span style={{ color: 'var(--text-main)', fontWeight: '500' }}>{fechaVigencia}</span>
              </div>
              <div>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.5px' }}>
                  <MapPin size={11} /> Lugar
                </span>
                <span style={{ color: 'var(--text-main)', fontWeight: '500' }}>{lugaresStr}</span>
              </div>
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.5px' }}>
                  <User size={11} /> Responsable
                </span>
                <span style={{ color: 'var(--text-main)', fontWeight: '500' }}>{announcement.responsableAnuncio || announcement.responsable || 'No especificado'}</span>
              </div>
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.5px' }}>
                  <Mail size={11} /> Contacto
                </span>
                {announcement.correoContacto ? (
                  <a href={`mailto:${announcement.correoContacto}`} style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: '600', fontSize: '13px' }}>
                    {announcement.correoContacto}
                  </a>
                ) : (
                  <span style={{ color: 'var(--text-muted)', fontWeight: '500' }}>No especificado</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnnouncementLightbox;
