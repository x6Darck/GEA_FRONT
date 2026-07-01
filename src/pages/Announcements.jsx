/**
 * Página de gestión de solicitudes de anuncio GEA.
 *
 * Estructura análoga a {@link Events}: mismos filtros de estado y fecha,
 * paginación en cliente y modal de detalle (`AnnouncementDetailModal`).
 * La diferencia es que los anuncios tienen pieza gráfica obligatoria al publicar
 * y vigencia (`fechaInicioPublicacion` / `fechaFinPublicacion`) en vez de horario.
 *
 * El formulario de creación carga lugares físicos y tipos de evento bajo demanda
 * para los campos de categoría y lugar. La pieza gráfica se sube antes de crear
 * el anuncio y la URL resultante se incluye en el payload.
 */
import React, { useState, useEffect, useMemo, useContext } from 'react';
import { Info, Calendar, Mail, User, MapPin, AlertCircle, Clock, Plus, Search, Upload, FileText, CheckCircle, X, LayoutGrid } from 'lucide-react';
import styles from './Events.module.css'; 
import { getAnuncios, createAnuncio, getAnunciosPublicados } from '../services/anuncios.service';
import lugarFisicoService from '../services/lugarFisico.service';
import { uploadArchivo } from '../services/archivos.service';
import { getTiposEvento } from '../services/tipoEvento.service';
import Modal from '../components/ui/Modal';
import Spinner from '../components/ui/Spinner';
import AmPmTimePicker from '../components/ui/AmPmTimePicker';
import AnnouncementDetailModal from '../components/ui/AnnouncementDetailModal';
import { AuthContext } from '../context/AuthContext';
import { resolveImageUrl } from '../utils/url';
import notification from '../utils/notification';
import { parseLocalDate, getTodayStr, isSameDay, formatLocalDate } from '../utils/dateUtils';

const DATE_FILTERS = [
  { label: 'Todos', value: 'all' },
  { label: 'Hoy', value: 'today' },
  { label: 'Esta semana', value: 'thisWeek' },
  { label: 'Últimos 30 días', value: 'last30' },
  { label: 'Este mes', value: 'thisMonth' },
  { label: 'Mes anterior', value: 'lastMonth' },
];


const AnnouncementCard = ({ announcement, onClick }) => {
  const imgUrl = resolveImageUrl(announcement.piezaGraficaUrl);
  const title = announcement.titulo || announcement.title || 'Sin título';
  const desc = announcement.descripcion || announcement.desc || '';

  return (
    <div 
      className="ann-card-animate"
      onClick={onClick}
      style={{
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        border: '1px solid var(--border)',
        background: 'var(--surface)',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
        boxShadow: 'var(--shadow-sm)',
        height: '100%',
        transition: 'transform var(--dur) var(--ease-out), box-shadow var(--dur) var(--ease-standard), border-color var(--dur) var(--ease-standard)'
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.borderColor = 'var(--border-strong)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
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

import AnnouncementLightbox from '../components/ui/AnnouncementLightbox';
const Announcements = () => {
  const { user } = useContext(AuthContext);
  const [announcementsData, setAnnouncementsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  // Detail & Lightbox state
  const [selectedAnuncio, setSelectedAnuncio] = useState(null);
  const [selectedPublicAnuncio, setSelectedPublicAnuncio] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isPublishedModalOpen, setIsPublishedModalOpen] = useState(false);
  const [publicAnnouncements, setPublicAnnouncements] = useState([]);
  const [loadingPublic, setLoadingPublic] = useState(false);
  const [isReadOnlyView, setIsReadOnlyView] = useState(false);

  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
    categoria: '',
    // lugar: '', // Deprecated
    idsLugaresFisicos: [],
    correoContacto: user?.correo || user?.email || '',
    responsableAnuncio: user?.nombre || user?.nombres || '',
    fechaInicioPublicacion: '',
    fechaFinPublicacion: '',
    horaInicio: '08:00',
    horaFin: '18:00',
    piezaGraficaUrl: '',
    requierePiezaGrafica: false
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [publishStep, setPublishStep] = useState(0); 
  const [tiposEvento, setTiposEvento] = useState([]);
  const [lugaresFisicos, setLugaresFisicos] = useState([]);

  useEffect(() => {
    if (isModalOpen) {
      if (tiposEvento.length === 0) {
        getTiposEvento().then(res => setTiposEvento(Array.isArray(res) ? res : [])).catch(console.error);
      }
      if (lugaresFisicos.length === 0) {
        lugarFisicoService.getLugaresFisicos().then(res => setLugaresFisicos(Array.isArray(res) ? res : [])).catch(console.error);
      }
      // Asegurar que el correo se cargue si el usuario tardó en cargar
      if (!formData.correoContacto && (user?.correo || user?.email)) {
        setFormData(prev => ({ 
          ...prev, 
          correoContacto: user.correo || user.email, 
          responsableAnuncio: prev.responsableAnuncio || user.nombre || user.nombres || '' 
        }));
      }
    }
  }, [isModalOpen, tiposEvento.length, user, formData.correoContacto]);

  const fetchAnuncios = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Para OFICINA, la pestaña por defecto es 'todos' (que son sus propias solicitudes)
      const data = await getAnuncios(user?.rol);
      setAnnouncementsData(Array.isArray(data) ? data : []);
    } catch(err) {
      console.error(err);
      if (!err.handledByInterceptor) {
        notification.error('No se pudieron cargar los anuncios. Por favor, intenta de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnuncios();
  }, [activeTab, user]);

  const fetchPublicAnnouncements = async () => {
    setLoadingPublic(true);
    try {
      const data = await getAnunciosPublicados();
      setPublicAnnouncements(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching public announcements:", err);
    } finally {
      setLoadingPublic(false);
    }
  };

  useEffect(() => {
    if (isPublishedModalOpen) {
      fetchPublicAnnouncements();
    }
  }, [isPublishedModalOpen]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const matchesDateFilter = (item, filter) => {
    if (filter === 'all') return true;
    
    // BLINDAJE V16: Filtrar por FECHA DE REGISTRO
    const dateStr = item.fechaCreacion || item.fechaInicioPublicacion || item.fechaPublicacion;
    if (!dateStr) return false;
    
    const eDate = parseLocalDate(dateStr);
    if (!eDate || isNaN(eDate.getTime())) return false;
    
    const eventMidnight = new Date(eDate.getFullYear(), eDate.getMonth(), eDate.getDate());
    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (filter === 'today') {
      return isSameDay(eDate, now);
    }
    
    if (filter === 'thisWeek') {
      const first = todayMidnight.getDate() - todayMidnight.getDay();
      const last = first + 6;
      const firstDay = new Date(todayMidnight.getFullYear(), todayMidnight.getMonth(), first);
      const lastDay = new Date(todayMidnight.getFullYear(), todayMidnight.getMonth(), last);
      return eventMidnight >= firstDay && eventMidnight <= lastDay;
    }
    
    if (filter === 'last30') {
      const thirtyDaysAgo = new Date(todayMidnight);
      thirtyDaysAgo.setDate(todayMidnight.getDate() - 30);
      return eventMidnight >= thirtyDaysAgo && eventMidnight <= todayMidnight;
    }

    if (filter === 'thisMonth') {
      return eventMidnight.getMonth() === todayMidnight.getMonth() && eventMidnight.getFullYear() === todayMidnight.getFullYear();
    }
    
    if (filter === 'lastMonth') {
      const last = new Date(todayMidnight.getFullYear(), todayMidnight.getMonth() - 1);
      return eventMidnight.getMonth() === last.getMonth() && eventMidnight.getFullYear() === last.getFullYear();
    }
    
    return true;
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      let finalImageUrl = '';
      if (selectedFile) {
        setPublishStep(1); // Subiendo
        const uploadRes = await uploadArchivo(selectedFile);
        finalImageUrl = uploadRes.urlAcceso || uploadRes.urlDescarga || uploadRes.url;
        setPublishStep(2); // Procesando
        setPublishStep(3); // Creando
      }

      const dataToSend = {
        ...formData,
        piezaGraficaUrl: finalImageUrl,
        idsLugaresFisicos: formData.idsLugaresFisicos,
        horaInicio: formData.horaInicio.length === 5 ? `${formData.horaInicio}:00` : formData.horaInicio,
        horaFin: formData.horaFin.length === 5 ? `${formData.horaFin}:00` : formData.horaFin
      };

      await createAnuncio(dataToSend);
      
      if (selectedFile) {
        setPublishStep(4); // Hecho
        await new Promise(r => setTimeout(r, 800));
      }

      notification.success('Solicitud de anuncio enviada correctamente');
      setIsModalOpen(false);
      resetForm();
      fetchAnuncios();
    } catch(err) {
      console.error(err);
      notification.error('Error al crear anuncio: ' + (err.response?.data?.message || err.message));
    } finally {
      setFormLoading(false);
      setPublishStep(0);
    }
  };

  const resetForm = () => {
    setFormData({
      titulo: '', descripcion: '', categoria: '', idsLugaresFisicos: [],
      correoContacto: user?.correo || user?.email || '', 
      responsableAnuncio: user?.nombre || user?.nombres || '', 
      fechaInicioPublicacion: '',
      fechaFinPublicacion: '', horaInicio: '08:00', horaFin: '18:00', piezaGraficaUrl: '',
      requierePiezaGrafica: false
    });
    setSelectedFile(null);
    setFilePreview(null);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setFilePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleOpenDetail = (anuncio, readOnly = false) => {
    setSelectedAnuncio(anuncio);
    setIsReadOnlyView(readOnly);
    setIsDetailModalOpen(true);
  };

  const statusBadgeStyle = (item) => {
    const status = (item.estado || item.status || '').toUpperCase();
    const base = { padding: '3px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: '700', letterSpacing: '0.4px', textTransform: 'uppercase', whiteSpace: 'nowrap' };
    if (status.includes('PUBLICAD') && item.visible === false) return { ...base, backgroundColor: '#fef3c7', color: '#b45309' };
    if (status.includes('PUBLICAD')) return { ...base, backgroundColor: '#dcfce7', color: '#16a34a' };
    if (status.includes('APROBAD')) return { ...base, backgroundColor: '#dbeafe', color: '#1d4ed8' };
    if (status.includes('RECHAZAD')) return { ...base, backgroundColor: '#fee2e2', color: '#dc2626' };
    if (status === 'EN_REVISION') return { ...base, backgroundColor: '#ede9fe', color: '#7c3aed' };
    return { ...base, backgroundColor: '#fef9c3', color: '#814e07' };
  };

  const isOficina = user?.rol === 'OFICINA';

  const TABS = [
    { key: 'todos',             label: 'Todos' },
    { key: 'PUBLICADA',         label: 'Publicados' },
    { key: 'OCULTO',            label: 'Ocultos' },
    { key: 'APROBADA',          label: 'Aprobados' },
    { key: 'PENDIENTE',         label: 'Pendientes' },
    { key: 'RECHAZADA',         label: 'Rechazados' },
    { key: 'EN_REVISION',       label: 'En revisión' },
  ];

  const filteredData = useMemo(() => {
    if (!Array.isArray(announcementsData)) return [];
    return announcementsData.filter(item => {
      const status = (item.estado || item.status || '').toUpperCase();
      
      // Filtrado por pestañas administrativas

      if (activeTab === 'OCULTO') {
        if (!status.includes('PUBLICAD') || item.visible !== false) return false;
      } else if (activeTab === 'PUBLICADA') {
        if (!status.includes('PUBLICAD') || item.visible === false) return false;
      } else if (activeTab !== 'todos' && status !== activeTab) {
        return false;
      }
      if (!matchesDateFilter(item, dateFilter)) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const title = (item.titulo || item.title || '').toLowerCase();
        const desc = (item.descripcion || item.desc || '').toLowerCase();
        const resp = (item.responsableAnuncio || '').toLowerCase();
        if (!title.includes(q) && !desc.includes(q) && !resp.includes(q)) return false;
      }
      return true;
    });
  }, [announcementsData, activeTab, dateFilter, searchTerm]);

  if (!user) return <Spinner message="Cargando perfil..." />;

  return (
    <div className="page-container">
      <div className={styles.header}>
        <h1 className="page-title" style={{marginBottom: 0}}>Gestión de Anuncios</h1>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className={styles.secondaryBtn} onClick={() => setIsPublishedModalOpen(true)}>
            <LayoutGrid size={18} /> Ver Galería Pública
          </button>
          {user?.rol?.toString().toUpperCase() !== 'CONSULTORIA' && (
            <button className={styles.createBtn} onClick={() => setIsModalOpen(true)}>
              <Plus size={18} /> Crear Anuncio
            </button>
          )}
        </div>
      </div>
      
      <div className="card">
        <div className={styles.filterToolbar}>
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input type="text" placeholder="Buscar anuncios por título, categoría o responsable..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className={styles.searchInput} />
          </div>
          <div className={styles.filterRow}>
            <select className={styles.filterSelect} value={dateFilter} onChange={e => setDateFilter(e.target.value)}>
              {DATE_FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
            <div className={styles.filterDivider} />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {TABS.map(tab => (
                <button key={tab.key} className={`${styles.tabBtn} ${activeTab === tab.key ? styles.active : ''}`} onClick={() => setActiveTab(tab.key)}>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        <div className={styles.tableContainer}>
          {loading ? (
            <Spinner message="Sincronizando con el servidor..." />
          ) : error ? (
             <div style={{ padding: '40px', textAlign: 'center', color: '#ef4444' }}>{error}</div>
          ) : activeTab === 'PUBLICADOS_GLOBAL' ? (
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px', padding: '10px' }}>
                {(filteredData || []).map(a => (
                  <AnnouncementCard key={a.id} announcement={a} onClick={() => handleOpenDetail(a, true)} />
                ))}
                {filteredData.length === 0 && (
                   <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '100px 20px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                     <LayoutGrid size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
                     <p style={{ fontSize: '16px', fontWeight: '500' }}>No hay anuncios públicos disponibles en este momento.</p>
                   </div>
                )}
             </div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>#</th>
                  <th style={{ width: '60px' }}>ID</th>
                  <th>Anuncio</th>
                  <th>Usuario solicitante</th>
                  <th>Vigencia</th>
                  <th>Visualización</th>
                  <th>Estado</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {(filteredData || []).map((item, index) => (
                    <tr key={item.id || item.idSolicitud} onClick={() => handleOpenDetail(item, false)} style={{ cursor: 'pointer' }}>
                      <td style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>{index + 1}</td>
                      <td style={{ fontSize: '11px', color: 'var(--text-muted)' }}>#{item.idPublicacion || item.id || item.idSolicitud}</td>
                      <td>
                        <div className={styles.truncate} style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>{item.titulo || item.title || 'Sin título'}</div>
                        <div className={styles.truncate} style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{item.descripcion || item.desc || '-'}</div>
                      </td>
                      <td>
                        <div style={{ fontSize: '13px', color: 'var(--text-main)', fontWeight: 'bold' }}>
                          {item.usuarioSolicitanteNombre && item.usuarioSolicitanteNombre !== 'N/A' ? item.usuarioSolicitanteNombre : (item.responsableAnuncio || '-')}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          {item.oficina} | {item.usuarioSolicitanteCorreo && item.usuarioSolicitanteCorreo !== '-' ? item.usuarioSolicitanteCorreo : (item.correoContacto || '-')}
                        </div>
                      </td>
                      <td style={{ fontSize: '12px' }}>
                        <div>{item.fechaInicioPublicacion?.split('T')[0] || '-'}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>al {item.fechaFinPublicacion?.split('T')[0] || '-'}</div>
                      </td>
                      <td>
                        {item.piezaGraficaUrl ? <div style={{ width: '28px', height: '28px', borderRadius: '4px', background: `url(${resolveImageUrl(item.piezaGraficaUrl)}) center/cover`, border: '1px solid var(--border)' }} /> : <FileText size={18} color="#cbd5e1"/>}
                      </td>
                      <td>
                        <span style={statusBadgeStyle(item)}>
                          {(() => { const s = (item.estado || item.status || 'PENDIENTE').toUpperCase(); if (s.includes('PUBLICAD') && item.visible === false) return 'OCULTO'; if (s === 'EN_REVISION') return 'En revisión'; return s; })()}
                        </span>
                      </td>
                      <td><button className={styles.actionBtn}>Detalles</button></td>
                    </tr>
                ))}
                {filteredData.length === 0 && (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                        <Search size={40} style={{ opacity: 0.2 }} />
                        <span>No se encontraron anuncios correspondientes.</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Crear Nueva Solicitud de Anuncio" style={{ maxWidth: '860px', width: '95%' }} bodyStyle={{ padding: '32px', backgroundColor: '#fdfdfe' }}>
        <div style={{ paddingRight: '12px', WebkitOverflowScrolling: 'touch', transform: 'translateZ(0)' }}>
          <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column' }}>

            {/* SECCIÓN 1: INFO GENERAL */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '24px', boxShadow: 'var(--shadow-sm)', marginBottom: '20px' }}>
              <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', fontWeight: '800', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                <div style={{ padding: '8px', borderRadius: '10px', background: 'var(--surface-2)', display: 'flex' }}><Info size={20} color="var(--text-muted)" /></div>
                Información del Anuncio
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Título del Anuncio <span style={{ color: '#ce1126' }}>*</span>
                  </label>
                  <input type="text" name="titulo" value={formData.titulo} onChange={handleInputChange} required style={{ padding: '12px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '14px', width: '100%', backgroundColor: 'var(--surface)', color: 'var(--text-main)', outline: 'none' }} placeholder="Ej: Bienvenida a nuevos estudiantes..." />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Descripción Detallada <span style={{ color: '#ce1126' }}>*</span>
                  </label>
                  <textarea name="descripcion" value={formData.descripcion} onChange={handleInputChange} rows="3" required style={{ padding: '12px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '14px', width: '100%', backgroundColor: 'var(--surface)', color: 'var(--text-main)', outline: 'none', resize: 'vertical' }} placeholder="Describe el contenido y propósito del anuncio..." />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '0', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    <MapPin size={14} /> Lugares Físicos (Opcional)
                  </label>
                  <select
                    id="ann-lugares"
                    style={{ padding: '12px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '14px', backgroundColor: 'var(--surface)', color: 'var(--text-main)', outline: 'none' }}
                    onChange={(e) => {
                      const id = parseInt(e.target.value);
                      if (!id) return;
                      if (!formData.idsLugaresFisicos.includes(id)) {
                        setFormData({...formData, idsLugaresFisicos: [...formData.idsLugaresFisicos, id]});
                      }
                      e.target.value = "";
                    }}
                  >
                    <option value="">Añadir un lugar...</option>
                    {lugaresFisicos.map(l => (
                      <option key={l.id} value={l.id} disabled={formData.idsLugaresFisicos.includes(l.id)}>
                        {l.nombre}
                      </option>
                    ))}
                  </select>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', minHeight: '32px' }}>
                    {formData.idsLugaresFisicos.length === 0 && (
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>Ningún lugar seleccionado</span>
                    )}
                    {formData.idsLugaresFisicos.map(id => {
                      const lug = lugaresFisicos.find(l => l.id === id);
                      return (
                        <div key={id} style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'var(--surface-2)', padding: '4px 10px', borderRadius: 'var(--radius-pill)', fontSize: '11px', fontWeight: '700', border: '1px solid var(--border)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          <MapPin size={12} /> {lug?.nombre || 'Cargando...'}
                          <button type="button" onClick={() => setFormData({...formData, idsLugaresFisicos: formData.idsLugaresFisicos.filter(iid => iid !== id)})} style={{ border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', padding: '2px' }}>
                            <X size={12} color="#ce1126" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      <Mail size={14} /> Correo de Contacto
                    </label>
                    <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '14px', backgroundColor: 'var(--surface-2)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Mail size={16} /> {formData.correoContacto || 'Sin correo registrado'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      <User size={14} /> Responsable <span style={{ color: '#ce1126' }}>*</span>
                    </label>
                    <input type="text" name="responsableAnuncio" value={formData.responsableAnuncio} onChange={handleInputChange} required style={{ padding: '12px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '14px', backgroundColor: 'var(--surface)', color: 'var(--text-main)', outline: 'none' }} placeholder="Nombre del responsable del anuncio..." />
                  </div>
                </div>
              </div>
            </div>

            {/* SECCIÓN 2: VIGENCIA */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '24px', boxShadow: 'var(--shadow-sm)', marginBottom: '20px' }}>
              <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', fontWeight: '800', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                <div style={{ padding: '8px', borderRadius: '10px', background: '#f0fdf4', display: 'flex' }}><Calendar size={20} color="#16a34a" /></div>
                Vigencia de Publicación
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Fecha de Inicio <span style={{ color: '#ce1126' }}>*</span>
                    </label>
                    <input id="ann-fecha-inicio" type="date" name="fechaInicioPublicacion" value={formData.fechaInicioPublicacion} onChange={handleInputChange} required min={getTodayStr()} style={{ padding: '12px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '14px', backgroundColor: 'var(--surface)', color: 'var(--text-main)', outline: 'none', width: 'fit-content' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Fecha de Fin <span style={{ color: '#ce1126' }}>*</span>
                    </label>
                    <input id="ann-fecha-fin" type="date" name="fechaFinPublicacion" value={formData.fechaFinPublicacion} onChange={handleInputChange} required min={formData.fechaInicioPublicacion || getTodayStr()} style={{ padding: '12px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '14px', backgroundColor: 'var(--surface)', color: 'var(--text-main)', outline: 'none', width: 'fit-content' }} />
                  </div>
                </div>
                <div style={{ backgroundColor: 'var(--surface-2)', padding: '24px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      <Clock size={14} /> Hora Inicio <span style={{ color: '#ce1126' }}>*</span>
                    </label>
                    <AmPmTimePicker value={formData.horaInicio} onChange={(e) => setFormData({...formData, horaInicio: e.target.value})} />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      <Clock size={14} /> Hora Fin <span style={{ color: '#ce1126' }}>*</span>
                    </label>
                    <AmPmTimePicker value={formData.horaFin} onChange={(e) => setFormData({...formData, horaFin: e.target.value})} />
                  </div>
                </div>
              </div>
            </div>

            {/* SECCIÓN 3: MATERIAL GRÁFICO */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '24px', boxShadow: 'var(--shadow-sm)', marginBottom: '20px' }}>
              <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', fontWeight: '800', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                <div style={{ padding: '8px', borderRadius: '10px', background: '#f0f9ff', display: 'flex' }}><Upload size={20} color="#0284c7" /></div>
                Material Gráfico
              </h3>
              <div
                onClick={() => !formData.requierePiezaGrafica && document.getElementById('new-file').click()}
                style={{ border: '2px dashed var(--border-strong)', borderRadius: 'var(--radius-sm)', padding: '40px', textAlign: 'center', cursor: formData.requierePiezaGrafica ? 'default' : 'pointer', opacity: formData.requierePiezaGrafica ? 0.5 : 1, transition: 'border-color 0.2s' }}
              >
                {filePreview ? (
                  <img src={filePreview} style={{ maxHeight: '200px', borderRadius: '8px' }} alt="Preview" />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', color: 'var(--text-muted)' }}>
                    <Upload size={32} />
                    <div>
                      <p style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: 'var(--text-secondary)' }}>
                        {formData.requierePiezaGrafica ? 'Opcional: Subir referencia visual' : 'Haz clic para subir imagen'}
                      </p>
                      <p style={{ margin: '4px 0 0', fontSize: '12px' }}>PNG, JPG, GIF — máx. 5MB</p>
                    </div>
                  </div>
                )}
                <input id="new-file" type="file" hidden onChange={handleFileChange} />
              </div>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '16px', cursor: 'pointer', padding: '9px 14px', background: formData.requierePiezaGrafica ? '#fff1f2' : '#f8fafc', borderRadius: '10px', border: `1px solid ${formData.requierePiezaGrafica ? '#fecaca' : '#e2e8f0'}`, fontSize: '12px', fontWeight: '600', color: formData.requierePiezaGrafica ? '#ce1126' : 'var(--text-secondary)', transition: 'background-color var(--dur) var(--ease-standard), border-color var(--dur) var(--ease-standard), color var(--dur) var(--ease-standard)' }}>
                <input type="checkbox" style={{ accentColor: '#ce1126' }} checked={formData.requierePiezaGrafica} onChange={e => setFormData({...formData, requierePiezaGrafica: e.target.checked})} />
                Solicitar pieza gráfica a Comunicaciones
              </label>
            </div>

            {/* FOOTER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', padding: '20px', backgroundColor: 'var(--surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '500' }}>
                <AlertCircle size={18} color="#ce1126" /> Verifica las fechas de vigencia antes de enviar.
              </div>
              <div style={{ display: 'flex', gap: '16px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '10px 24px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)', fontWeight: '700', cursor: 'pointer', fontSize: '14px' }}>
                  Descartar
                </button>
                <button type="submit" disabled={formLoading} style={{ padding: '10px 24px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--primary)', color: 'white', border: 'none', fontWeight: '700', cursor: formLoading ? 'not-allowed' : 'pointer', fontSize: '14px' }}>
                  {formLoading
                    ? (publishStep === 1 ? 'Subiendo imagen...' : publishStep === 2 ? 'Procesando...' : publishStep === 3 ? 'Creando anuncio...' : publishStep === 4 ? '¡Listo!' : 'Procesando...')
                    : 'Enviar Solicitud de Anuncio'}
                </button>
              </div>
            </div>

          </form>
        </div>
      </Modal>

      <Modal isOpen={isPublishedModalOpen} onClose={() => setIsPublishedModalOpen(false)} title="Galería de Anuncios" style={{ maxWidth: '1000px', width: '95%' }}>
        {loadingPublic ? (
          <Spinner message="Cargando galería..." />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px', padding: '10px' }}>
            {(publicAnnouncements || []).map(a => (
              <AnnouncementCard key={a.id} announcement={a} onClick={() => { setSelectedPublicAnuncio(a); }} />
            ))}
            {publicAnnouncements.length === 0 && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
                No hay anuncios publicados globalmente en este momento.
              </div>
            )}
          </div>
        )}
      </Modal>

      {selectedAnuncio && (
        <AnnouncementDetailModal 
          isOpen={isDetailModalOpen} 
          onClose={() => setIsDetailModalOpen(false)} 
          announcement={selectedAnuncio} 
          onSuccess={fetchAnuncios}
          isReadOnly={isReadOnlyView}
        />
      )}

      <AnnouncementLightbox 
        announcement={selectedPublicAnuncio}
        onClose={() => setSelectedPublicAnuncio(null)}
      />
    </div>
  );
};

export default Announcements;
