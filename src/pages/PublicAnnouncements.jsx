/**
 * Galería pública de anuncios GEA (accesible sin autenticación).
 *
 * Carga solo los anuncios en estado PUBLICADA con `getAnunciosPublicados`.
 * Soporta deep link vía query param `?anuncio=<id>`: si llega ese parámetro
 * (p.ej. desde un correo de notificación), se busca el anuncio en la lista
 * ya cargada y se abre su {@link AnnouncementLightbox} automáticamente.
 */
import React, { useState, useEffect } from 'react';
import { Megaphone, Calendar, LayoutGrid } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { getAnunciosPublicados } from '../services/anuncios.service';
import { resolveImageUrl } from '../utils/url';
import { formatLocalDate } from '../utils/dateUtils';
import Spinner from '../components/ui/Spinner';
import AnnouncementLightbox from '../components/ui/AnnouncementLightbox';

const AnnouncementCard = ({ announcement, onClick }) => {
  const imgUrl = resolveImageUrl(announcement.piezaGraficaUrl);
  const title = announcement.titulo || announcement.title || 'Sin título';
  const desc = announcement.descripcion || announcement.desc || '';

  return (
    <div 
      onClick={onClick}
      style={{
        borderRadius: '16px',
        overflow: 'hidden',
        border: '1px solid var(--border)',
        background: 'white',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
        height: '100%',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease'
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.boxShadow = '0 12px 30px rgba(0,0,0,0.15)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)'; }}
    >
      <div style={{
        height: imgUrl ? '160px' : '90px',
        background: imgUrl ? `url(${imgUrl}) center/cover no-repeat` : 'linear-gradient(135deg,#ce1126 0%,#7f1d1d 100%)',
        position: 'relative'
      }}>
      </div>
      <div style={{ padding: '15px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <h4 style={{ margin: '0 0 6px', fontSize: '14px', fontWeight: 'bold', color: 'var(--text-main)' }}>{title}</h4>
        <p style={{ margin: '0 0 12px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5', flex: 1 }}>{desc}</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--text-muted)', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Calendar size={12} /> {announcement.fechaInicioPublicacion ? formatLocalDate(announcement.fechaInicioPublicacion) : 'N/A'}
          </div>
          <div style={{ fontWeight: '600', color: '#ce1126' }}>Ver más →</div>
        </div>
      </div>
    </div>
  );
};

const PublicAnnouncements = () => {
  const [publicAnnouncements, setPublicAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnuncio, setSelectedAnuncio] = useState(null);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const data = await getAnunciosPublicados();
        const list = Array.isArray(data) ? data : [];
        setPublicAnnouncements(list);

        // Auto-open from email deep link (?anuncio=N)
        const anuncioId = searchParams.get('anuncio');
        if (anuncioId) {
          const found = list.find(a => a.id?.toString() === anuncioId);
          if (found) setSelectedAnuncio(found);
        }
      } catch (err) {
        console.error('Error al cargar anuncios públicos:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnnouncements();
  }, []);

  const handleOpenDetail = (anuncio) => {
    setSelectedAnuncio(anuncio);
  };

  return (
    <div className="page-container">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <h1 className="page-title" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Megaphone color="#ce1126" size={28} /> Anuncios Públicos
        </h1>
      </div>

      <div className="card" style={{ minHeight: '60vh' }}>
        {loading ? (
          <Spinner message="Cargando anuncios..." />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px', padding: '10px' }}>
            {publicAnnouncements.map(a => (
              <AnnouncementCard key={a.id} announcement={a} onClick={() => handleOpenDetail(a)} />
            ))}
            {publicAnnouncements.length === 0 && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '100px 20px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <LayoutGrid size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
                <p style={{ fontSize: '16px', fontWeight: '500' }}>No hay anuncios disponibles en este momento.</p>
              </div>
            )}
          </div>
        )}
      </div>

      <AnnouncementLightbox 
        announcement={selectedAnuncio}
        onClose={() => setSelectedAnuncio(null)}
      />
    </div>
  );
};

export default PublicAnnouncements;
