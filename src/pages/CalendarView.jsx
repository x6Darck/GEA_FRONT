import React, { useState, useEffect, useMemo, useContext } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ChevronDown, ChevronUp, Search, Plus, X } from 'lucide-react';
import styles from './CalendarView.module.css';
import { getEventosPublicados } from '../services/eventos.service';
import Spinner from '../components/ui/Spinner';
import EventModal from '../components/ui/EventModal';
import { resolveImageUrl } from '../utils/url';

/* ─── Helper: resolves image URL ─────────────────────────────────── */
const resolveImg = (url) => resolveImageUrl(url);

/* ─── Mini event card (shared between list and day-modal) ─────────── */
const EventCard = ({ evt, onClick }) => {
  const imgUrl = resolveImg(evt.piezaGraficaUrl);
  // Default color if none provided
  const eventColor = evt.tipoEventoColorHex || '#ce1126';
  
  const formatTime12h = (t) => {
    if (!t) return '';
    let h, m;
    if (Array.isArray(t)) {
      [h, m] = t;
    } else if (typeof t === 'string') {
      [h, m] = t.split(':');
    } else {
      return '';
    }
    let hour = parseInt(h, 10);
    const ap = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12 || 12;
    return `${hour}:${String(m).padStart(2, '0')} ${ap}`;
  };

  return (
    <div
      onClick={onClick}
      style={{
        borderRadius: '14px',
        overflow: 'hidden',
        border: '1px solid var(--border)',
        boxShadow: onClick ? '0 2px 10px rgba(0,0,0,0.07)' : 'none',
        transition: 'transform 0.18s, box-shadow 0.18s',
        cursor: onClick ? 'pointer' : 'default',
        background: '#ffffff',
        position: 'relative',
        height: '100%'
      }}
      onMouseEnter={e => { if (onClick) { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 10px 28px rgba(0,0,0,0.13)'; } }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = onClick ? '0 2px 10px rgba(0,0,0,0.07)' : 'none'; }}
    >
      {/* Visual Indicator: Left Color Bar */}
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', backgroundColor: eventColor, zIndex: 5 }} />

      {/* Image Banner */}
      <div style={{
        height: imgUrl ? '164px' : '68px',
        background: imgUrl
          ? `url(${imgUrl}) center/cover no-repeat`
          : `linear-gradient(135deg, ${eventColor} 0%, #000 160%)`,
        position: 'relative', display: 'flex', alignItems: 'flex-end',
      }}>
        {/* Gradient overlay */}
        <div style={{ position: 'absolute', inset: 0, background: imgUrl ? 'linear-gradient(to top,rgba(0,0,0,0.55) 0%,transparent 60%)' : 'none', pointerEvents: 'none' }} />

        {/* No-image placeholder */}
        {!imgUrl && (
          <div style={{ padding: '10px 14px', zIndex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>📅</span>
            <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1.2px' }}>Evento Institucional</span>
          </div>
        )}

        {/* Top badges */}
        <div style={{ position: 'absolute', top: '8px', left: '12px', right: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 2 }}>
          {evt.tipoEvento && (
            <span style={{ 
              background: `${eventColor}33`, // 20% opacity 
              backdropFilter: 'blur(10px)', 
              color: '#fff', 
              fontSize: '9px', 
              fontWeight: '800', 
              textTransform: 'uppercase', 
              letterSpacing: '0.8px', 
              padding: '4px 10px', 
              borderRadius: '20px',
              border: `1px solid ${eventColor}66` // 40% opacity
            }}>
              {evt.tipoEvento}
            </span>
          )}
          {imgUrl && onClick && (
            <span style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', color: '#fff', fontSize: '9px', fontWeight: '700', padding: '3px 9px', borderRadius: '20px', marginLeft: 'auto' }}>
              Ver pieza 🖼
            </span>
          )}
        </div>
      </div>

      {/* Info */}
      <div style={{ padding: '16px 20px 20px 22px', backgroundColor: '#ffffff' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '10px' }}>
          <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: '1.4', flex: 1, minWidth: 0 }} title={evt.nombre}>
            {evt.nombre || 'Sin título'}
          </h4>
          {evt.esImportante && (
            <div style={{ 
              backgroundColor: '#fff1f2', 
              color: '#ce1126', 
              padding: '2px 6px', 
              borderRadius: '6px', 
              fontSize: '14px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              flexShrink: 0,
              border: '1px solid #fecaca',
              lineHeight: 1
            }}>
              ★
            </div>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748b' }}>
            <span style={{ color: eventColor, fontSize: '14px' }}>📅</span>
            <span style={{ fontWeight: '500' }}>{evt.fecha ? evt.fecha.split('T')[0] : 'Fecha por confirmar'}</span>
            <span style={{ color: '#cbd5e1' }}>•</span>
            <span style={{ color: eventColor }}>🕐</span>
            <span style={{ fontWeight: '500' }}>{formatTime12h(evt.horaInicio) || '--:--'}</span>
          </div>
          {evt.lugar && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748b' }}>
              <span style={{ color: eventColor, fontSize: '14px' }}>📍</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{evt.lugar}</span>
            </div>
          )}
          {evt.linkConexion && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--text-secondary)' }}>
              <span style={{ color: eventColor, fontSize: '12px' }}>🔗</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#3b82f6' }}>Enlace virtual</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ─── Compact event card (for lists and filtered modal) ─────────── */
const CompactEventCard = ({ evt, onClick }) => {
  const imgUrl = resolveImg(evt.piezaGraficaUrl);
  const eventColor = evt.tipoEventoColorHex || '#ce1126';
  
  const formatTime12h = (t) => {
    if (!t) return '';
    let h, m;
    if (Array.isArray(t)) { [h, m] = t; } 
    else if (typeof t === 'string' && t.includes(':')) { [h, m] = t.split(':'); } 
    else if (typeof t === 'string' && !t.includes(':')) { return t; }
    else { return ''; }
    let hour = parseInt(h, 10);
    const ap = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12 || 12;
    return `${hour}:${String(m).padStart(2, '0')} ${ap}`;
  };

  return (
    <div 
      className={styles.compactCard} 
      onClick={onClick}
      style={evt.esImportante ? { 
        border: '1.5px solid #ce1126', 
        background: '#fff9f9',
        boxShadow: '0 4px 15px rgba(206,17,38,0.1)'
      } : {}}
    >
       {/* Thicker status indicator */}
       <div className={styles.statusIndicator} style={{ backgroundColor: evt.esImportante ? '#ce1126' : eventColor, width: evt.esImportante ? '8px' : '6px' }} />
       
       <div 
         className={styles.compactImg} 
         style={{ 
           backgroundImage: imgUrl ? `url(${imgUrl})` : `linear-gradient(135deg, ${eventColor}11 0%, #000 180%)`,
           display: 'flex', alignItems: 'center', justifyContent: 'center',
           position: 'relative'
         }} 
       >
         {!imgUrl && <span style={{ fontSize: '32px', opacity: 0.4 }}>📅</span>}
         {/* Subtle overlay for better text contrast if needed */}
         <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(0,0,0,0.05), transparent)' }} />
         
         {/* Badge movido abajo a la izquierda */}
         {evt.esImportante && (
           <div style={{ 
             position: 'absolute',
             bottom: '8px',
             left: '8px',
             background: 'linear-gradient(135deg, #ce1126 0%, #8b0000 100%)', 
             color: '#fff', 
             padding: '4px 8px', 
             borderRadius: '6px', 
             fontSize: '9px', 
             fontWeight: '900',
             display: 'flex',
             alignItems: 'center',
             gap: '4px',
             boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
             zIndex: 10,
             backdropFilter: 'blur(4px)',
             border: '1px solid rgba(255,255,255,0.2)'
           }}>
             <span style={{ fontSize: '11px' }}>★</span> IMPORTANTE
           </div>
         )}
       </div>

       <div className={styles.compactInfo}>
          <div className={styles.typeBadge} style={{ color: eventColor, borderBottom: `2px solid ${eventColor}22` }}>
            <span>{evt.tipoEvento || 'Sin Categoría'}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '2px' }}>
            <h4 className={styles.compactTitle} title={evt.nombre} style={{ 
              ...(evt.esImportante ? { color: '#991b1b', fontWeight: '900' } : {}),
              flex: 1,
              minWidth: 0,
              margin: 0
            }}>
              {evt.nombre}
            </h4>
            {evt.esImportante && (
              <div style={{ 
                backgroundColor: '#fff1f2', 
                color: '#ce1126', 
                padding: '2px 6px', 
                borderRadius: '6px', 
                fontSize: '12px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                flexShrink: 0,
                border: '1px solid #fecaca',
                lineHeight: 1
              }}>
                ★
              </div>
            )}
          </div>
          
          {evt.desc && (
            <p className={styles.compactDesc} title={evt.desc}>
              {evt.desc}
            </p>
          )}

          <div className={styles.compactMetaGrid}>
             <div className={styles.metaItem}>
                <span className={styles.metaIcon} style={{ color: eventColor }}>🕐</span>
                <span className={styles.metaText}>{formatTime12h(evt.horaInicio)} - {formatTime12h(evt.horaFin) || 'Fin'}</span>
             </div>
             {evt.lugar && (
               <div className={styles.metaItem}>
                  <span className={styles.metaIcon} style={{ color: eventColor }}>📍</span>
                  <span className={styles.metaText} title={evt.lugar}>{evt.lugar}</span>
               </div>
             )}
          </div>
       </div>
    </div>
  );
};

/* ─── Grid event card (for multi-event day modal) ───────────────── */
const GridEventCard = ({ evt, onClick }) => {
  const imgUrl = resolveImg(evt.piezaGraficaUrl);
  const eventColor = evt.tipoEventoColorHex || '#ce1126';
  
  const formatTime12h = (t) => {
    if (!t) return '';
    let h, m;
    if (Array.isArray(t)) { [h, m] = t; } 
    else if (typeof t === 'string' && t.includes(':')) { [h, m] = t.split(':'); } 
    else if (typeof t === 'string' && !t.includes(':')) { return t; }
    else { return ''; }
    let hour = parseInt(h, 10);
    const ap = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12 || 12;
    return `${hour}:${String(m).padStart(2, '0')} ${ap}`;
  };

  return (
    <div className={styles.gridCard} onClick={onClick}>
       <div className={styles.statusIndicator} style={{ backgroundColor: eventColor, width: '4px' }} />
       {evt.tipoEvento && (
         <div className={styles.gridBadge} style={{ background: `${eventColor}CC` }}>
           {evt.tipoEvento}
         </div>
       )}
       <div 
         className={styles.gridImg} 
         style={{ 
           backgroundImage: imgUrl ? `url(${imgUrl})` : `linear-gradient(135deg, ${eventColor}11 0%, #000 200%)`,
           display: 'flex', alignItems: 'center', justifyContent: 'center'
         }} 
       >
         {!imgUrl && <span style={{ fontSize: '32px', opacity: 0.5 }}>📅</span>}
       </div>
       <div className={styles.gridInfo}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', flex: 1, minWidth: 0 }}>
                <div className={styles.statusDot} style={{ backgroundColor: eventColor, marginTop: '6px' }} />
                <h4 className={styles.gridTitle} title={evt.nombre} style={{ margin: 0, flex: 1, minWidth: 0 }}>{evt.nombre}</h4>
              </div>
              {evt.esImportante && (
                <div style={{ 
                  backgroundColor: '#fff1f2', 
                  color: '#ce1126', 
                  padding: '2px 6px', 
                  borderRadius: '6px', 
                  fontSize: '12px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  flexShrink: 0,
                  border: '1px solid #fecaca',
                  lineHeight: 1
                }}>
                  ★
                </div>
              )}
          </div>

          {evt.desc && <p className={styles.gridDesc} title={evt.desc}>{evt.desc}</p>}

          <div className={styles.gridMeta}>
             <div className={styles.metaItem}>
                <span style={{ color: eventColor }}>🕐</span>
                <span className={styles.metaText}>{formatTime12h(evt.horaInicio)} - {formatTime12h(evt.horaFin) || 'Fin'}</span>
             </div>
             {evt.lugar && (
               <div className={styles.metaItem}>
                  <span style={{ color: eventColor }}>📍</span>
                  <span className={styles.metaText} title={evt.lugar}>{evt.lugar}</span>
               </div>
             )}
          </div>
       </div>
    </div>
  );
};

/* ─── Lightbox overlay ───────────────────────────────────────────── */
const Lightbox = ({ evt, onClose }) => {
  if (!evt) return null;
  const imgUrl = resolveImg(evt.piezaGraficaUrl);
  const formatTime12h = (t) => {
    if (!t) return '';
    let h, m;
    if (Array.isArray(t)) {
      [h, m] = t;
    } else if (typeof t === 'string') {
      [h, m] = t.split(':');
    } else {
      return '';
    }
    let hour = parseInt(h, 10);
    const ap = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12 || 12;
    return `${hour}:${String(m).padStart(2, '0')} ${ap}`;
  };

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      backgroundColor: 'rgba(255,255,255,0.88)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '24px', backdropFilter: 'blur(4px)',
    }}>
      <p style={{ color: 'rgba(0,0,0,0.3)', fontSize: '12px', marginBottom: '12px' }}>
        Clic fuera para cerrar
      </p>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#fff', borderRadius: '20px', overflow: 'hidden',
        maxWidth: '560px', width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
        border: '1px solid rgba(0,0,0,0.07)',
        position: 'relative'
      }}>
        {/* Close Button UI inside the card (consistent with DayEventsModal) */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '15px', right: '15px',
            width: '32px', height: '32px', borderRadius: '50%',
            backgroundColor: 'rgba(0,0,0,0.05)', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', zIndex: 10, transition: 'all 0.2s',
            color: '#1e293b'
          }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.1)'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)'}
        >
          <X size={18} />
        </button>

        {imgUrl ? (
          <img src={imgUrl} alt={evt.nombre}
            style={{ width: '100%', display: 'block', maxHeight: '70vh', objectFit: 'contain', backgroundColor: '#f8fafc' }} />
        ) : (
          <div style={{ height: '200px', background: 'linear-gradient(135deg,#cc0000 0%,#8b0000 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <span style={{ fontSize: '40px' }}>📅</span>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>Sin pieza gráfica</span>
          </div>
        )}
        <div style={{ padding: '18px 22px' }}>
          <h3 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: '700', color: '#1e293b' }}>{evt.nombre}</h3>
          
          {/* Enhanced details with description and end time */}
          <div style={{ marginBottom: '16px', fontSize: '13px', color: '#475569', lineHeight: '1.6', background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
             <p style={{ margin: 0 }}>{evt.desc || 'Sin descripción disponible.'}</p>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '12px', color: '#64748b' }}>
            <span>📆 {evt.fecha ? evt.fecha.split('T')[0] : '-'}</span>
            <span>🕐 {formatTime12h(evt.horaInicio)} {evt.horaFin ? ` a ${formatTime12h(evt.horaFin)}` : ''}</span>
            {evt.lugar && <span>📍 {evt.lugar}</span>}
            {evt.linkConexion && (
              <a href={evt.linkConexion} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                🔗 Unirse a reunión
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── Day events modal ───────────────────────────────────────────── */
const DayEventsModal = ({ dateStr, events, onClose, onSelectEvent }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return events;
    const q = searchTerm.toLowerCase();
    return events.filter(e => 
      (e.nombre || '').toLowerCase().includes(q) || 
      (e.lugar || '').toLowerCase().includes(q) ||
      (e.office || '').toLowerCase().includes(q)
    );
  }, [events, searchTerm]);

  if (!dateStr || !events || events.length === 0) return null;

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 9000,
      backgroundColor: 'rgba(255,255,255,0.88)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px', backdropFilter: 'blur(4px)',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#fff', borderRadius: '24px',
        maxWidth: '1000px', width: '95%', maxHeight: '88vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 30px 80px rgba(0,0,0,0.22)', overflow: 'hidden',
        border: '1px solid rgba(0,0,0,0.08)',
        transition: 'all 0.3s ease'
      }}>
        {/* Premium gradient header */}
        <div style={{
          padding: '24px 30px',
          background: 'linear-gradient(135deg, #cc0000 0%, #8b0000 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <h3 style={{ margin: '0 0 5px', fontSize: '20px', fontWeight: '800', color: '#fff', letterSpacing: '-0.5px' }}>Eventos del día</h3>
            <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontWeight: '500' }}>{dateStr}</span>
              <span style={{ background: 'rgba(255,255,255,0.25)', padding: '2px 10px', borderRadius: '20px', fontWeight: '800', fontSize: '11px', textTransform: 'uppercase' }}>
                {events.length} {events.length === 1 ? 'evento' : 'eventos'}
              </span>
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', cursor: 'pointer', color: '#fff', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '16px 30px', borderBottom: '1px solid #f1f5f9', backgroundColor: '#fafafa' }}>
           <div style={{ position: 'relative', maxWidth: '400px' }}>
             <input 
               type="text" 
               placeholder="Filtrar eventos por nombre o lugar..." 
               value={searchTerm}
               onChange={e => setSearchTerm(e.target.value)}
               style={{ 
                 width: '100%', padding: '10px 14px 10px 40px', borderRadius: '12px', border: '1px solid #e2e8f0', 
                 fontSize: '14px', outline: 'none', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
               }}
               onFocus={e => { e.target.style.borderColor = '#cc0000'; e.target.style.boxShadow = '0 0 0 3px rgba(204,0,0,0.1)'; }}
               onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)'; }}
             />
             <Search size={18} style={{ position: 'absolute', left: '14px', top: '12px', color: '#94a3b8' }} />
           </div>
        </div>

        <div style={{ 
          overflowY: 'auto', 
          padding: '24px 30px', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '20px', 
          flex: 1,
          backgroundColor: '#f8fafc',
          alignItems: 'center'
        }}>
          {filtered.length > 0 ? (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', 
              gap: '20px', 
              width: '100%',
              paddingBottom: '20px'
            }}>
              {filtered.map(evt => (
                <GridEventCard key={evt.id} evt={evt} onClick={() => { onClose(); onSelectEvent(evt); }} />
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8', fontSize: '15px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <div style={{ fontSize: '48px', opacity: 0.5 }}>🔍</div>
              <p>No se encontraron eventos para "{searchTerm}"</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ─── Main CalendarView ──────────────────────────────────────────── */
const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const CalendarView = () => {
  const days = ['DOM', 'LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB'];
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(today);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [pickerMode, setPickerMode] = useState('none'); // 'none' | 'month' | 'year'

  // Modals
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [lightboxEvt, setLightboxEvt] = useState(null);
  const [dayModalDate, setDayModalDate] = useState(null);

  const { user } = useContext(AuthContext);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    fetchEvents().then(events => {
      const eventoId = searchParams.get('evento');
      if (eventoId && events) {
        const evt = events.find(e => e.id.toString() === eventoId);
        if (evt) setLightboxEvt(evt);
      }
    });
  }, [searchParams]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const data = await getEventosPublicados(); 
      const eventList = Array.isArray(data) ? data : data.data || [];
      const filtered = eventList.filter(e => e.visible !== false);
      setUpcomingEvents(filtered); 
      return filtered;
    } catch (err) {
      console.error(err);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  const handlePrevMonth = () => { setCurrentDate(new Date(currentYear, currentMonth - 1, 1)); setPickerMode('none'); };
  const handleNextMonth = () => { setCurrentDate(new Date(currentYear, currentMonth + 1, 1)); setPickerMode('none'); };

  // Filtered list for search bar and upcoming list (only future events)
  const filteredEvents = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    
    // 1. First filter by date (only today onwards)
    const futureOnly = upcomingEvents.filter(e => {
      const evtDate = e.fecha ? e.fecha.split('T')[0] : '';
      return evtDate >= todayStr;
    });

    // 1.5 Sort by Priority (Important first) and then Proximity (ASC)
    futureOnly.sort((a, b) => {
      // 1. Prioridad: Importantes primero
      if (a.esImportante && !b.esImportante) return -1;
      if (!a.esImportante && b.esImportante) return 1;
      
      // 2. Cronológico: Por fecha
      const dateStrA = (a.fecha || '').split('T')[0];
      const dateStrB = (b.fecha || '').split('T')[0];
      if (dateStrA !== dateStrB) return dateStrA.localeCompare(dateStrB);
      
      // 3. Cronológico: Por hora (en el mismo día)
      const parseTime = (t) => {
        if (Array.isArray(t)) return t.map(x => String(x).padStart(2, '0')).join(':');
        return t || '00:00';
      };
      return parseTime(a.horaInicio).localeCompare(parseTime(b.horaInicio));
    });

    // 2. Then filter by search query
    if (!searchQuery.trim()) return futureOnly;
    const q = searchQuery.toLowerCase();
    return futureOnly.filter(e =>
      (e.nombre || '').toLowerCase().includes(q) ||
      (e.office || '').toLowerCase().includes(q) ||
      (e.lugar || '').toLowerCase().includes(q) ||
      (e.tipoEvento || '').toLowerCase().includes(q)
    );
  }, [upcomingEvents, searchQuery]);

  // Map of dateStr → events
  const eventsByDate = useMemo(() => {
    const map = {};
    upcomingEvents.forEach(evt => {
      const key = evt.fecha ? evt.fecha.split('T')[0] : null;
      if (key) {
        if (!map[key]) map[key] = [];
        map[key].push(evt);
      }
    });
    return map;
  }, [upcomingEvents]);

  // Build calendar cells
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

  const calendarCells = [];
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const y = currentMonth === 0 ? currentYear - 1 : currentYear;
    const m = currentMonth === 0 ? 12 : currentMonth;
    calendarCells.push({ dateStr: `${y}-${String(m).padStart(2,'0')}-${String(daysInPrevMonth-i).padStart(2,'0')}`, dayNum: daysInPrevMonth-i, isFaded: true, isToday: false, fullDate: new Date(y, m-1, daysInPrevMonth-i) });
  }
  for (let i = 1; i <= daysInMonth; i++) {
    const isToday = today.getDate()===i && today.getMonth()===currentMonth && today.getFullYear()===currentYear;
    calendarCells.push({ dateStr: `${currentYear}-${String(currentMonth+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`, dayNum: i, isFaded: false, isToday, fullDate: new Date(currentYear, currentMonth, i) });
  }
  const remaining = (Math.ceil(calendarCells.length/7)*7) - calendarCells.length;
  for (let i = 1; i <= remaining; i++) {
    const y = currentMonth===11 ? currentYear+1 : currentYear;
    const m = currentMonth===11 ? 1 : currentMonth+2;
    calendarCells.push({ dateStr: `${y}-${String(m).padStart(2,'0')}-${String(i).padStart(2,'0')}`, dayNum: i, isFaded: true, isToday: false, fullDate: new Date(y, m-1, i) });
  }

  const selectedDateString = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth()+1).padStart(2,'0')}-${String(selectedDate.getDate()).padStart(2,'0')}`;

  const isSameDate = (d1, d2) => d1.getFullYear()===d2.getFullYear() && d1.getMonth()===d2.getMonth() && d1.getDate()===d2.getDate();

  const handleDayClick = (cell) => {
    setSelectedDate(cell.fullDate);
    setPickerMode('none');
    if (cell.fullDate.getMonth() !== currentMonth) {
      setCurrentDate(new Date(cell.fullDate.getFullYear(), cell.fullDate.getMonth(), 1));
    }
    // Open day modal if there are events
    if (eventsByDate[cell.dateStr] && eventsByDate[cell.dateStr].length > 0) {
      setDayModalDate(cell.dateStr);
    }
  };

  const dayModalEvents = dayModalDate ? (eventsByDate[dayModalDate] || []) : [];

  return (
    <div className="page-container" style={{ maxWidth: '1800px' }}>
      <div className={styles.dashboardGrid}>

        {/* Left - Calendar */}
        <div className={`card ${styles.calendarCard}`}>
          {/* ── Calendar Header ──────────────────────────────── */}
          <div className={styles.header}>
            {/* Left: day + month/year picker trigger */}
            <div className={styles.monthSelector}>
              <span style={{ fontSize: '2rem', fontWeight: '600', letterSpacing: '-1px', color: 'var(--text)' }}>
                {selectedDate.getDate()}
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.1' }}>
                <button
                  onClick={() => setPickerMode(p => p === 'month' ? 'none' : 'month')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0', textAlign: 'left', fontWeight: '700', fontSize: '1rem', color: pickerMode === 'month' ? '#cc0000' : 'var(--text)', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  {MONTHS_ES[currentMonth]}
                  <span style={{ fontSize: '10px', opacity: 0.5 }}>▾</span>
                </button>
                <button
                  onClick={() => setPickerMode(p => p === 'year' ? 'none' : 'year')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0', textAlign: 'left', fontWeight: '400', fontSize: '0.85rem', color: pickerMode === 'year' ? '#cc0000' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  {currentYear}
                  <span style={{ fontSize: '10px', opacity: 0.5 }}>▾</span>
                </button>
              </div>
            </div>
            {/* Right: nav + new event */}
            <div className={styles.controls}>
              <button className={styles.iconBtn} onClick={handlePrevMonth} aria-label="Mes anterior"><ChevronDown size={18} style={{ transform:'rotate(90deg)' }}/></button>
              <button className={styles.iconBtn} onClick={handleNextMonth} aria-label="Mes siguiente"><ChevronUp size={18} style={{ transform:'rotate(90deg)' }}/></button>
              {user && (
                <button className={styles.primaryBtn} onClick={() => setIsEventModalOpen(true)}>
                  <Plus size={16} strokeWidth={2.5} /> Nuevo Evento
                </button>
              )}
            </div>
          </div>

          {/* ── Month Picker (inline, replaces calendar grid) ── */}
          {pickerMode === 'month' && (
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px', padding: '8px 4px', alignContent: 'center' }}>
              {MONTHS_ES.map((m, i) => {
                const isActive = i === currentMonth;
                return (
                  <button key={m}
                    onClick={() => { setCurrentDate(new Date(currentYear, i, 1)); setPickerMode('none'); }}
                    style={{
                      padding: '14px 8px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                      fontWeight: isActive ? '700' : '500', fontSize: '13px',
                      background: isActive ? 'linear-gradient(135deg,#cc0000,#8b0000)' : 'var(--secondary)',
                      color: isActive ? '#fff' : 'var(--text)',
                      boxShadow: isActive ? '0 4px 12px rgba(204,0,0,0.3)' : 'none',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'var(--border)'; e.currentTarget.style.transform = 'scale(1.03)'; } }}
                    onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'var(--secondary)'; e.currentTarget.style.transform = 'scale(1)'; } }}
                  >{m}</button>
                );
              })}
            </div>
          )}

          {/* ── Year Picker (inline, replaces calendar grid) ── */}
          {pickerMode === 'year' && (() => {
            const startYear = currentYear - 5;
            const years = Array.from({ length: 12 }, (_, i) => startYear + i);
            return (
              <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px', padding: '8px 4px', alignContent: 'center' }}>
                {years.map(y => {
                  const isActive = y === currentYear;
                  return (
                    <button key={y}
                      onClick={() => { setCurrentDate(new Date(y, currentMonth, 1)); setPickerMode('none'); }}
                      style={{
                        padding: '14px 6px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                        fontWeight: isActive ? '700' : '500', fontSize: '13px',
                        background: isActive ? 'linear-gradient(135deg,#cc0000,#8b0000)' : 'var(--secondary)',
                        color: isActive ? '#fff' : 'var(--text)',
                        boxShadow: isActive ? '0 4px 12px rgba(204,0,0,0.3)' : 'none',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'var(--border)'; e.currentTarget.style.transform = 'scale(1.03)'; } }}
                      onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'var(--secondary)'; e.currentTarget.style.transform = 'scale(1)'; } }}
                    >{y}</button>
                  );
                })}
              </div>
            );
          })()}

          {/* ── Calendar Grid (hidden when picker is open) ── */}
          {pickerMode === 'none' && (
            <div className={styles.calendarGrid}>
              {days.map(d => <div key={d} className={styles.dayName}>{d}</div>)}
              {calendarCells.map((cell, i) => {
                const eventsForDay = eventsByDate[cell.dateStr] || [];
                const uniqueColors = [...new Set(eventsForDay.map(e => e.tipoEventoColorHex || '#ce1126'))];
                const isSelected = isSameDate(cell.fullDate, selectedDate);
                
                return (
                  <div key={i} onClick={() => handleDayClick(cell)}
                    className={`${styles.dateCell} ${cell.isFaded?styles.faded:''} ${cell.isToday?styles.today:''} ${isSelected?styles.selected:''}`}
                    style={{ cursor: eventsForDay.length > 0 ? 'pointer' : 'default' }}
                  >
                    {cell.dayNum}
                    
                    {/* Star Indicator - Independent for maximum visibility */}
                    {eventsForDay.some(e => e.esImportante) && (
                      <div style={{
                        position: 'absolute',
                        top: '2px',
                        left: '4px',
                        zIndex: 10,
                        pointerEvents: 'none'
                      }}>
                        <span style={{ 
                          color: '#facc15', 
                          fontSize: '16px', 
                          fontWeight: '900', 
                          textShadow: '0 0 10px rgba(0,0,0,0.5)', 
                          animation: 'pulseStar 2s infinite ease-in-out',
                          lineHeight: '1'
                        }}>
                          ★
                        </span>
                      </div>
                    )}

                    {uniqueColors.length > 0 && (
                      <div className={styles.dotsContainer}>
                        {uniqueColors.slice(0, 4).map((color, idx) => (
                          <span 
                            key={idx} 
                            className={styles.dot} 
                            style={{ backgroundColor: color }} 
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );

              })}
            </div>
          )}

        </div>

          {/* Right - Upcoming */}
          <div className={styles.upcomingSide}>
            <div className={styles.upcomingHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2 className={styles.upcomingTitle}>Eventos próximos</h2>
                {filteredEvents.length > 0 && (
                  <span style={{ background: '#cc0000', color: '#fff', fontSize: '10px', fontWeight: '700', padding: '2px 9px', borderRadius: '20px', lineHeight: '1.6' }}>
                    {filteredEvents.length}
                  </span>
                )}
              </div>
              {/* Barra de búsqueda funcional */}
              <div className={styles.searchBar}>
                <input
                  type="text"
                  placeholder="Buscar por nombre, lugar..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
                <Search size={16} className={styles.searchIcon} />
              </div>
            </div>

          <div className={styles.eventsList} style={{ overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
            {loading ? (
              <Spinner message="" />
            ) : filteredEvents.length > 0 ? (
              filteredEvents.map(evt => (
                <div key={evt.id} style={{ marginBottom: '10px' }}>
                  <CompactEventCard evt={evt} onClick={() => setLightboxEvt(evt)} />
                </div>
              ))
            ) : (
              <div style={{ textAlign:'center', padding:'30px 10px', color:'var(--text-secondary)', fontSize:'13px' }}>
                <div style={{ fontSize:'32px', marginBottom:'8px' }}>📅</div>
                {searchQuery ? `Sin resultados para "${searchQuery}"` : 'No hay eventos publicados próximos'}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ── Modals ─────────────────────────────────── */}
      <EventModal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        onSuccess={fetchEvents}
        initialDate={selectedDateString}
        allEvents={upcomingEvents}
      />

      {/* Day Events Modal */}
      <DayEventsModal
        dateStr={dayModalDate}
        events={dayModalEvents}
        onClose={() => setDayModalDate(null)}
        onSelectEvent={setLightboxEvt}
      />

      {/* Lightbox */}
      <Lightbox evt={lightboxEvt} onClose={() => setLightboxEvt(null)} />
    </div>
  );
};

export default CalendarView;
