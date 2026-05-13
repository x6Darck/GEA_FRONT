import React, { useState, useEffect, useMemo, useContext } from 'react';
import { Search, Plus, Calendar, Filter, Trash2, Eye, EyeOff, MoreHorizontal, ChevronRight, ChevronDown, FileText, CheckCircle, Clock, Layers } from 'lucide-react';
import styles from './Events.module.css';
import { getEventosSolicitudes, getOficinaById, getEventosPublicados, getEventoById } from '../services/eventos.service';
import { getUsuarios } from '../services/usuarios.service';
import EventDetailModal from '../components/ui/EventDetailModal';
import EventModal from '../components/ui/EventModal';
import Spinner from '../components/ui/Spinner';
import PublishEventModal from '../components/ui/PublishEventModal';
import { AuthContext } from '../context/AuthContext';
import { resolveImageUrl } from '../utils/url';
import notification from '../utils/notification';
import { parseLocalDate, getTodayStr, isSameDay } from '../utils/dateUtils';

const resolveImg = (url) => resolveImageUrl(url);

const Events = () => {
  const { user } = useContext(AuthContext);
  const [eventsData, setEventsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [activeTab, setActiveTab] = useState('todos');
  const [dateFilter, setDateFilter] = useState('all');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [usersNamesMap, setUsersNamesMap] = useState({});

  const DATE_FILTERS = [
    { label: 'Todos', value: 'all' },
    { label: 'Hoy', value: 'today' },
    { label: 'Esta semana', value: 'thisWeek' },
    { label: 'Últimos 30 días', value: 'last30' },
    { label: 'Este mes', value: 'thisMonth' },
    { label: 'Mes anterior', value: 'lastMonth' },
  ];

  const TABS = [
    { key: 'todos',             label: 'Todos' },
    { key: 'PUBLICADA',         label: 'Publicados' },
    { key: 'OCULTO',            label: 'Ocultos' },
    { key: 'APROBADA',          label: 'Aprobados' },
    { key: 'PENDIENTE',         label: 'Pendientes' },
    { key: 'RECHAZADA',         label: 'Rechazados' },
  ];

  const fetchEvents = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getEventosSolicitudes(user?.rol);
      setEventsData(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      if (!err.handledByInterceptor) {
        notification.error('Error al cargar eventos: ' + (err.response?.data?.message || err.message));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
    cargarUsuarios();
  }, [activeTab, user]);

  const cargarUsuarios = async () => {
    // Solo admins/comunicaciones pueden ver la lista global de usuarios
    const isOficina = user?.rol === 'OFICINA' || user?.rol === 'USUARIO_AUTENTICADO_APP';
    if (isOficina) return;

    try {
      // Usar skipGlobalError para evitar que el interceptor muestre errores si falla esta carga secundaria
      const users = await getUsuarios({ skipGlobalError: true });
      const map = {};
      users.forEach(u => {
        map[u.email] = `${u.nombres} ${u.apellidos || ''}`.trim();
      });
      setUsersNamesMap(map);
    } catch (err) {
      console.warn("No se pudo cargar el mapa de nombres de usuarios (posible falta de permisos)");
    }
  };
  const matchesDateFilter = (event, filter) => {
    if (filter === 'all') return true;
    
    // BLINDAJE V16: Usar fecha de registro/creación para el histórico de gestión
    const dateStr = event.fechaRegistro || event.createdAt || event.fecha;
    if (!dateStr) return true;
    
    const eDate = parseLocalDate(dateStr);
    if (!eDate || isNaN(eDate.getTime())) return true;
    
    // Normalizar a medianoche local para comparaciones de rango
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

  const filteredData = useMemo(() => {
    if (!Array.isArray(eventsData)) return [];
    return eventsData.filter(item => {
      const status = (item.estado || item.status || '').toUpperCase();
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
        const name = (item.nombreEvento || item.nombre || '').toLowerCase();
        const desc = (item.descripcionEvento || item.desc || '').toLowerCase();
        const resp = (item.responsableEvento || item.responsable || '').toLowerCase();
        const type = (item.tipoEvento || '').toLowerCase();
        if (!name.includes(q) && !desc.includes(q) && !resp.includes(q) && !type.includes(q)) return false;
      }
      return true;
    });
  }, [eventsData, activeTab, dateFilter, searchTerm]);

  const groupedData = useMemo(() => {
    const groups = {};
    const result = [];

    // Pre-agrupar todo lo que tiene idGrupoRecurrencia
    filteredData.forEach(item => {
      if (item.idGrupoRecurrencia) {
        if (!groups[item.idGrupoRecurrencia]) {
          groups[item.idGrupoRecurrencia] = [];
        }
        groups[item.idGrupoRecurrencia].push(item);
      }
    });

    const processedGroups = new Set();

    filteredData.forEach(item => {
      const gid = item.idGrupoRecurrencia;
      if (gid) {
        if (!processedGroups.has(gid)) {
          const instances = [...groups[gid]].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
          result.push({
            isGroup: true,
            groupId: gid,
            main: instances[0],
            subItems: instances.slice(1)
          });
          processedGroups.add(gid);
        }
      } else {
        result.push({ isGroup: false, ...item });
      }
    });

    return result;
  }, [filteredData]);

  const toggleGroup = (groupId, e) => {
    e.stopPropagation();
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  const statusBadgeStyle = (item) => {
    const status = (item.estado || item.status || '').toUpperCase();
    const base = { padding: '3px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.4px' };
    if (status.includes('PUBLICAD') && item.visible === false) return { ...base, backgroundColor: '#fef3c7', color: '#b45309' };
    if (status.includes('PUBLICAD')) return { ...base, backgroundColor: '#dcfce7', color: '#16a34a' };
    if (status.includes('APROBAD')) return { ...base, backgroundColor: '#dbeafe', color: '#1d4ed8' };
    if (status.includes('RECHAZAD')) return { ...base, backgroundColor: '#fee2e2', color: '#dc2626' };
    return { ...base, backgroundColor: '#fefce8', color: '#854d0e' };
  };

  const [detailLoading, setDetailLoading] = useState(false);
  const handleOpenDetail = async (ev) => {
    if (!ev?.id) return;
    setDetailLoading(true);
    try {
      // First set the summary data we already have
      setSelectedEvent(ev);
      setIsDetailModalOpen(true);
      
      // Then fetch the full detail (including participants)
      const fullEvent = await getEventoById(ev.id, user?.rol);
      if (fullEvent) {
        setSelectedEvent(fullEvent);
      }
    } catch (err) {
      console.error("Error cargando detalle completo del evento:", err);
      // Fallback: stay with the summary data
    } finally {
      setDetailLoading(false);
    }
  };

  if (!user) return <Spinner message="Cargando perfil..." />;

  return (
    <div className="page-container">
      <div className={styles.header}>
        <h1 className="page-title" style={{marginBottom: 0}}>Gestión de Eventos</h1>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className={styles.secondaryBtn} onClick={() => window.open('/calendario', '_blank')}>
            <Calendar size={18} /> Ver Calendario Público
          </button>
          <button className={styles.createBtn} onClick={() => setIsCreateModalOpen(true)}>
            <Plus size={18} /> Nuevo Evento
          </button>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
          <div className={styles.searchBar} style={{ width: '100%', position: 'relative' }}>
            <input type="text" placeholder="Buscar por nombre, descripción o responsable..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ width: '100%', padding: '12px 14px 12px 42px', borderRadius: '10px' }} />
            <Search size={20} className={styles.searchIcon} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'center' }}>
            <select className={styles.monthSelect} value={dateFilter} onChange={e => setDateFilter(e.target.value)} style={{ minWidth: '200px', height: '42px', borderRadius: '10px' }}>
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

        <div className={styles.tableContainer} key={activeTab} style={{ animation: 'fadeIn 0.4s ease-out' }}>
          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; transform: translateY(8px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}</style>
          {loading ? (
            <Spinner message="Obteniendo solicitudes..." />
          ) : error ? (
            <div style={{ padding: '50px', textAlign: 'center', color: '#ef4444' }}>{error}</div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: '30px' }}>#</th>
                  <th style={{ width: '50px' }}>ID</th>
                  <th style={{ width: '130px' }}>Evento</th>
                  <th className={styles.hideMobile} style={{ width: '100px' }}>Categoría</th>
                  <th style={{ width: '110px' }}>Oficina</th>
                  <th style={{ width: '85px' }}>Vigencia</th>
                  <th style={{ width: '35px' }}>Img</th>
                  <th style={{ width: '90px' }}>Estado</th>
                  <th style={{ width: '80px' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {(groupedData || []).map((row, index) => {
                  const isGroup = row.isGroup;
                  const item = isGroup ? row.main : row;
                  const isExpanded = isGroup && expandedGroups.has(row.groupId);

                  return (
                    <React.Fragment key={isGroup ? `group-${row.groupId}` : `item-${item.id}`}>
                      <tr 
                        onClick={() => handleOpenDetail(item)} 
                        style={{ cursor: 'pointer', backgroundColor: isGroup ? '#fcfcfc' : 'inherit' }}
                      >
                        <td style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>
                          {isGroup && (
                            <button 
                              onClick={(e) => toggleGroup(row.groupId, e)}
                              style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '0 4px 0 0', display: 'inline-flex', alignItems: 'center' }}
                            >
                              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </button>
                          )}
                          {index + 1}
                        </td>
                        <td style={{ fontSize: '11px', color: '#94a3b8' }}>
                          #{item.id}
                          {isGroup && (
                            <div style={{ fontSize: '8px', color: '#ce1126', fontWeight: '900', marginTop: '2px' }}>
                              SERIE ({row.subItems.length + 1})
                            </div>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', maxWidth: '130px' }}>
                            <span style={{ 
                              fontWeight: '800', 
                              color: '#1e293b', 
                              overflow: 'hidden', 
                              textOverflow: 'ellipsis', 
                              whiteSpace: 'nowrap', 
                              flex: 1, 
                              minWidth: 0,
                              fontSize: '12px'
                            }} title={item.nombreEvento || item.nombre}>
                              {item.nombreEvento || item.nombre}
                            </span>
                            {isGroup && <Layers size={10} color="#ce1126" />}
                            {item.esImportante && (
                              <span style={{ 
                                backgroundColor: '#fff1f2', 
                                color: '#ce1126', 
                                padding: '1px 4px', 
                                borderRadius: '4px', 
                                fontSize: '8px', 
                                fontWeight: '900', 
                                border: '1px solid #fecaca',
                                flexShrink: 0
                              }}>
                                ★
                              </span>
                            )}
                          </div>
                          <div className={styles.truncate} style={{ fontSize: '10px', color: '#64748b', maxWidth: '130px' }}>{item.descripcionEvento || item.desc}</div>
                        </td>
                        <td className={styles.hideMobile}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: item.tipoEventoColorHex || '#ce1126', flexShrink: 0 }} />
                            <span style={{ fontSize: '11px', color: item.tipoEventoColorHex || '#ce1126', fontWeight: '800', textTransform: 'uppercase' }}>{item.tipoEvento || '-'}</span>
                          </div>
                        </td>
                        <td>
                          <div style={{ fontSize: '12px', color: '#1e293b', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '110px' }} title={item.office || item.oficinaNombre}>{item.office || item.oficinaNombre || '-'}</div>
                          <div style={{ fontSize: '9px', color: '#94a3b8', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '110px' }} title={item.solicitanteEmail || item.usuarioSolicitanteCorreo}>
                            {item.solicitanteEmail || item.usuarioSolicitanteCorreo || '-'}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontSize: '12px', color: '#1e293b' }}>
                            {item.fechaEvento?.split('T')[0] || item.fecha?.split('T')[0] || '-'}
                          </div>
                        </td>
                        <td>
                          {item.piezaGraficaUrl ? (
                            <div style={{ width: '28px', height: '28px', borderRadius: '4px', background: `url(${resolveImg(item.piezaGraficaUrl)}) center/cover`, border: '1px solid #e2e8f0' }} />
                          ) : (
                            <FileText size={18} color="#cbd5e1" />
                          )}
                        </td>
                        <td>
                          <span style={statusBadgeStyle(item)}>
                            {(item.estado || item.status || '').toUpperCase().includes('PUBLICAD') && item.visible === false ? 'OCULTO' : (item.estado || item.status || 'PENDIENTE').toUpperCase()}
                          </span>
                        </td>
                        <td>
                          <button className={styles.actionBtn}>Detalles</button>
                        </td>
                      </tr>

                      {/* SUB-ITEMS DESPLEGADOS */}
                      {isExpanded && row.subItems.map((sub, sIdx) => (
                        <tr 
                          key={sub.id} 
                          onClick={() => handleOpenDetail(sub)}
                          style={{ cursor: 'pointer', backgroundColor: '#f9fafb', borderLeft: '3px solid #ce1126' }}
                        >
                          <td style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'right' }}>{index + 1}.{sIdx + 1}</td>
                          <td style={{ fontSize: '10px', color: '#cbd5e1' }}>#{sub.id}</td>
                          <td colSpan={3}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <Clock size={10} color="#94a3b8" />
                              <span style={{ fontSize: '11px', color: '#475569' }}>Instancia recurrente del evento</span>
                            </div>
                          </td>
                          <td>
                            <div style={{ fontSize: '11px', color: '#1e293b', fontWeight: '600' }}>
                              {sub.fechaEvento?.split('T')[0] || sub.fecha?.split('T')[0]}
                            </div>
                          </td>
                          <td>-</td>
                          <td>
                            <span style={statusBadgeStyle(sub)}>
                              {(sub.estado || sub.status || 'PENDIENTE').toUpperCase()}
                            </span>
                          </td>
                          <td>
                             <button className={styles.actionBtn} style={{ opacity: 0.7, padding: '4px 8px', fontSize: '10px' }}>Detalles</button>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })}
                {filteredData.length === 0 && (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '80px 20px', color: '#94a3b8' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                        <Calendar size={40} style={{ opacity: 0.2 }} />
                        <span>No se encontraron registros coincidentes.</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {selectedEvent && <EventDetailModal 
        isOpen={isDetailModalOpen} 
        onClose={() => setIsDetailModalOpen(false)} 
        event={selectedEvent} 
        onSuccess={fetchEvents} 
        usersNamesMap={usersNamesMap}
      />}
      <PublishEventModal isOpen={isPublishModalOpen} onClose={() => setIsPublishModalOpen(false)} onSuccess={fetchEvents} />
      <EventModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} onSuccess={fetchEvents} allEvents={eventsData} />
    </div>
  );
};

export default Events;
