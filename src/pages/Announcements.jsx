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
        borderRadius: '16px',
        overflow: 'hidden',
        border: '1px solid #e2e8f0',
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
        <h4 style={{ margin: '0 0 6px', fontSize: '14px', fontWeight: 'bold', color: '#1e293b' }}>{title}</h4>
        <p style={{ margin: '0 0 12px', fontSize: '12px', color: '#64748b', lineHeight: '1.5', flex: 1 }}>{desc}</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#94a3b8', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Calendar size={12} /> {announcement.fechaInicioPublicacion?.split('T')[0] || 'N/A'}
          </div>
          <div style={{ fontWeight: '600', color: '#ce1126' }}>Ver más →</div>
        </div>
      </div>
    </div>
  );
};

const AnnouncementLightbox = ({ announcement, onClose }) => {
  if (!announcement) return null;
  const imgUrl = resolveImageUrl(announcement.piezaGraficaUrl);

  return (
    <div 
      className="fade-in"
      onClick={onClose} 
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        padding: '24px', backgroundColor: 'rgba(255, 255, 255, 0.98)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
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
          position: 'relative', display: 'flex', flexDirection: 'column'
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

        <div style={{ flex: 1, backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
          {imgUrl ? (
            <img src={imgUrl} alt={announcement.title}
              style={{ width: '100%', display: 'block', maxHeight: '60vh', objectFit: 'contain' }} />
          ) : (
            <div style={{ padding: '80px', textAlign: 'center' }}>
               <div style={{ fontSize: '70px', marginBottom: '20px' }}>📢</div>
               <p style={{ color: '#94a3b8', fontWeight: 'bold', fontSize: '18px' }}>Sin pieza gráfica</p>
            </div>
          )}
        </div>

        <div style={{ padding: '30px', background: 'white' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
             <div style={{ flex: 1 }}>
               <h3 style={{ margin: '0 0 5px', fontSize: '24px', fontWeight: '800', color: '#1e293b' }}>{announcement.titulo || announcement.title}</h3>
             </div>
             <div style={{ textAlign: 'right', paddingLeft: '20px' }}>
                <span style={{ display: 'block', fontSize: '14px', color: '#1e293b', fontWeight: 'bold' }}>{announcement.responsableAnuncio}</span>
                <span style={{ fontSize: '12px', color: '#64748b' }}>{announcement.correoContacto}</span>
             </div>
          </div>
          <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '15px', border: '1px solid #f1f5f9' }}>
            <p style={{ margin: 0, fontSize: '15px', color: '#334155', lineHeight: '1.7' }}>
              {announcement.descripcion || announcement.desc}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

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
    // Sincronizado con requerimiento: Filtrar por FECHA DE REGISTRO
    const dateStr = item.fechaCreacion || item.fechaInicioPublicacion || item.fechaPublicacion;
    if (!dateStr) return false;
    
    const now = new Date();
    
    const isSameDay = (d1, d2) => {
      if (!d1 || !d2) return false;
      const date1 = typeof d1 === 'string' ? new Date(d1.includes('T') ? d1 : d1 + 'T00:00:00') : d1;
      const date2 = d2;
      return date1.toLocaleDateString() === date2.toLocaleDateString();
    };

    if (filter === 'today') {
      return isSameDay(dateStr, now);
    }
    
    // Para otros filtros, normalizamos a medianoche local
    const iDate = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00');
    iDate.setHours(0, 0, 0, 0);

    if (filter === 'thisWeek') {
      const first = now.getDate() - now.getDay();
      const last = first + 6;
      const firstDay = new Date(now.getFullYear(), now.getMonth(), first);
      const lastDay = new Date(now.getFullYear(), now.getMonth(), last);
      return iDate >= firstDay && iDate <= lastDay;
    }
    
    if (filter === 'last30') {
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(now.getDate() - 30);
      return iDate >= thirtyDaysAgo && iDate <= now;
    }

    if (filter === 'thisMonth') {
      return iDate.getMonth() === now.getMonth() && iDate.getFullYear() === now.getFullYear();
    }
    
    if (filter === 'lastMonth') {
      const last = new Date(now.getFullYear(), now.getMonth() - 1);
      return iDate.getMonth() === last.getMonth() && iDate.getFullYear() === last.getFullYear();
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
          <button className={styles.createBtn} onClick={() => setIsModalOpen(true)}>
            <Plus size={18} /> Crear Anuncio
          </button>
        </div>
      </div>
      
      <div className="card">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
          <div className={styles.searchBar} style={{ width: '100%', position: 'relative' }}>
            <input type="text" placeholder="Buscar anuncios por título, categoría o responsable..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ width: '100%', padding: '12px 14px 12px 42px', borderRadius: '10px' }} />
            <Search size={20} className={styles.searchIcon} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}/>
          </div>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
            <select className={styles.monthSelect} value={dateFilter} onChange={e => setDateFilter(e.target.value)} style={{ minWidth: '180px', height: '40px', borderRadius: '8px' }}>
              {DATE_FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
            <div className={styles.tabs} style={{ flex: 1, justifyContent: 'flex-start' }}>
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
                   <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '100px 20px', color: '#94a3b8', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
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
                      <td style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>{index + 1}</td>
                      <td style={{ fontSize: '11px', color: '#94a3b8' }}>#{item.idPublicacion || item.id || item.idSolicitud}</td>
                      <td>
                        <div className={styles.truncate} style={{ fontWeight: 'bold', color: '#1e293b' }}>{item.titulo || item.title || 'Sin título'}</div>
                        <div className={styles.truncate} style={{ fontSize: '11px', color: '#64748b' }}>{item.descripcion || item.desc || '-'}</div>
                      </td>
                      <td>
                        <div style={{ fontSize: '13px', color: '#1e293b', fontWeight: 'bold' }}>
                          {item.usuarioSolicitanteNombre && item.usuarioSolicitanteNombre !== 'N/A' ? item.usuarioSolicitanteNombre : (item.responsableAnuncio || '-')}
                        </div>
                        <div style={{ fontSize: '10px', color: '#94a3b8', fontStyle: 'italic' }}>
                          {item.oficina} | {item.usuarioSolicitanteCorreo && item.usuarioSolicitanteCorreo !== '-' ? item.usuarioSolicitanteCorreo : (item.correoContacto || '-')}
                        </div>
                      </td>
                      <td style={{ fontSize: '12px' }}>
                        <div>{item.fechaInicioPublicacion?.split('T')[0] || '-'}</div>
                        <div style={{ color: '#94a3b8', fontSize: '10px' }}>al {item.fechaFinPublicacion?.split('T')[0] || '-'}</div>
                      </td>
                      <td>
                        {item.piezaGraficaUrl ? <div style={{ width: '28px', height: '28px', borderRadius: '4px', background: `url(${resolveImageUrl(item.piezaGraficaUrl)}) center/cover`, border: '1px solid #e2e8f0' }} /> : <FileText size={18} color="#cbd5e1"/>}
                      </td>
                      <td>
                        <span style={statusBadgeStyle(item)}>
                          {(item.estado || item.status || '').toUpperCase().includes('PUBLICAD') && item.visible === false ? 'OCULTO' : (item.estado || item.status || 'PENDIENTE').toUpperCase()}
                        </span>
                      </td>
                      <td><button className={styles.actionBtn}>Detalles</button></td>
                    </tr>
                ))}
                {filteredData.length === 0 && (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '80px 20px', color: '#94a3b8' }}>
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

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Crear Solicitud de Anuncio" style={{ maxWidth: '750px', width: '95%' }} bodyStyle={{ padding: '24px 32px' }}>
        <div style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain', transform: 'translateZ(0)' }}>
          <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                <Info size={16} color="#ce1126" /> Información General
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <input type="text" name="titulo" value={formData.titulo} onChange={handleInputChange} required style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1' }} placeholder="Título..." />
                <textarea name="descripcion" value={formData.descripcion} onChange={handleInputChange} rows="3" required style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1' }} placeholder="Descripción..." />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Lugares Físicos (Opcional)</label>
                    <select 
                      style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                      onChange={(e) => {
                        const id = parseInt(e.target.value);
                        if (!id) return;
                        if (!formData.idsLugaresFisicos.includes(id)) {
                          setFormData({...formData, idsLugaresFisicos: [...formData.idsLugaresFisicos, id]});
                        }
                        e.target.value = "";
                      }}
                    >
                      <option value="">Añadir lugar...</option>
                      {lugaresFisicos.map(l => (
                        <option key={l.id} value={l.id} disabled={formData.idsLugaresFisicos.includes(l.id)}>
                          {l.nombre}
                        </option>
                      ))}
                    </select>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {formData.idsLugaresFisicos.map(id => {
                        const lug = lugaresFisicos.find(l => l.id === id);
                        return (
                          <div key={id} style={{ background: '#f1f5f9', padding: '4px 10px', borderRadius: '16px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid #e2e8f0' }}>
                            <MapPin size={12}/> {lug?.nombre || 'Cargando...'}
                            <button type="button" onClick={() => setFormData({...formData, idsLugaresFisicos: formData.idsLugaresFisicos.filter(iid => iid !== id)})} style={{ border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex' }}>
                              <X size={12} color="#ce1126" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <input type="email" name="correoContacto" value={formData.correoContacto} readOnly placeholder="Correo de Contacto..." style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#64748b' }} title="Tu correo institucional" />
                    <input type="text" name="responsableAnuncio" value={formData.responsableAnuncio} onChange={handleInputChange} required placeholder="Nombre del Responsable..." style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                </div>
              </div>
            </div>
            
            <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                <Calendar size={16} color="#ce1126" /> Logística
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Fecha Inicio Publicación</label>
                  <input type="date" name="fechaInicioPublicacion" value={formData.fechaInicioPublicacion} onChange={handleInputChange} required style={{ padding: '10px', borderRadius: '8px' }} />
                  <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Fecha Fin Publicación</label>
                  <input type="date" name="fechaFinPublicacion" value={formData.fechaFinPublicacion} onChange={handleInputChange} required style={{ padding: '10px', borderRadius: '8px' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Hora Inicio Publicación</label>
                  <AmPmTimePicker value={formData.horaInicio} onChange={(e) => setFormData({...formData, horaInicio: e.target.value})} />
                  <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Hora Fin Publicación</label>
                  <AmPmTimePicker value={formData.horaFin} onChange={(e) => setFormData({...formData, horaFin: e.target.value})} />
                </div>
              </div>
            </div>

            <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
              <div onClick={() => document.getElementById('new-file').click()} style={{ border: '2px dashed #cbd5e1', borderRadius: '12px', padding: '40px', textAlign: 'center', cursor: 'pointer', opacity: formData.requierePiezaGrafica ? 0.5 : 1 }}>
                {filePreview ? <img src={filePreview} style={{ maxHeight: '200px' }} /> : <div>{formData.requierePiezaGrafica ? 'Opcional: Subir referencia' : 'Haz clic para subir imagen'}</div>}
                <input id="new-file" type="file" hidden onChange={handleFileChange} />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '12px', cursor: 'pointer', padding: '10px', backgroundColor: formData.requierePiezaGrafica ? '#fff1f2' : 'transparent', borderRadius: '8px', border: formData.requierePiezaGrafica ? '1px solid #fecaca' : '1px solid transparent' }}>
                <input 
                  type="checkbox" 
                  checked={formData.requierePiezaGrafica} 
                  onChange={e => setFormData({...formData, requierePiezaGrafica: e.target.checked})}
                  style={{ width: '18px', height: '18px' }}
                />
                <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e293b' }}>Solicitar creación de pieza gráfica a Comunicaciones</span>
              </label>
            </div>

            <button type="submit" disabled={formLoading} style={{ padding: '16px', borderRadius: '12px', background: '#ce1126', color: 'white', fontWeight: 'bold', fontSize: '16px' }}>
              {formLoading ? 'Procesando...' : 'Enviar Solicitud'}
            </button>
          </form>
        </div>
      </Modal>

      <Modal isOpen={isPublishedModalOpen} onClose={() => setIsPublishedModalOpen(false)} title="Galería de Anuncios" style={{ maxWidth: '1000px', width: '95%' }}>
        {loadingPublic ? (
          <Spinner message="Cargando galería..." />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px', padding: '10px' }}>
            {(publicAnnouncements || []).map(a => (
              <AnnouncementCard key={a.id} announcement={a} onClick={() => { handleOpenDetail(a, true); setIsPublishedModalOpen(false); }} />
            ))}
            {publicAnnouncements.length === 0 && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
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
    </div>
  );
};

export default Announcements;
