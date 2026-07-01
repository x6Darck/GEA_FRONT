/**
 * Página de gestión de solicitudes de evento GEA.
 *
 * Carga fuentes distintas según el rol:
 * - ADMIN/COMUNICACIONES: `getEventosSolicitudes` + `getEventosPublicados` (todas las oficinas).
 * - OFICINA: solo sus propias solicitudes vía `getEventosSolicitudes`.
 *
 * Los eventos se agrupan por oficina, filtran por estado (tabs) y fecha,
 * y se paginan de 25 en 25 en el cliente para no saturar el DOM.
 * El mapa `usersNamesMap` se construye una vez con `getUsuarios` para resolver
 * el nombre del solicitante sin requests adicionales por cada evento.
 */
import React, { useState, useEffect, useMemo, useContext, useRef } from 'react';
import { Search, Plus, Calendar, Filter, Trash2, Eye, EyeOff, MoreHorizontal, ChevronRight, FileText, CheckCircle, Clock, Layers, Star } from 'lucide-react';
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
  const [closingGroups, setClosingGroups] = useState(new Set());
  const [activeTab, setActiveTab] = useState('todos');
  const [sortConfig, setSortConfig] = useState({ key: null, dir: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 25;
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
    { key: 'EN_REVISION',       label: 'En revisión' },
  ];

  const fetchEvents = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getEventosSolicitudes(user?.rol);
      setEventsData(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || err.message || 'Error desconocido';
      setError(`No se pudieron cargar los eventos. ${err.response ? `(${err.response.status})` : 'Verifica tu conexión.'}`);
      if (!err.handledByInterceptor) {
        notification.error('Error al cargar eventos: ' + msg);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
    cargarUsuarios();
    // El filtrado por pestaña es client-side (useMemo); no se recarga la API al cambiar de tab
  }, [user]);

  const cargarUsuarios = async () => {
    // Solo admins/comunicaciones pueden ver la lista global de usuarios
    const isOficina = user?.rol === 'OFICINA' || user?.rol === 'USUARIO_AUTENTICADO_APP';
    if (isOficina) return;

    try {
      // Usar skipGlobalError para evitar que el interceptor muestre errores si falla esta carga secundaria
      const users = await getUsuarios({}, { skipGlobalError: true });
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

  // Reset to page 1 whenever filters change
  React.useEffect(() => { setCurrentPage(1); }, [activeTab, dateFilter, searchTerm]);

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

  const handleSort = (key) => {
    setSortConfig(prev =>
      prev.key === key
        ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: 'asc' }
    );
    setCurrentPage(1);
  };

  const sortedData = useMemo(() => {
    if (!sortConfig.key) return filteredData;
    const sorted = [...filteredData].sort((a, b) => {
      let aVal = '', bVal = '';
      if (sortConfig.key === 'nombre') {
        aVal = (a.nombreEvento || a.nombre || '').toLowerCase();
        bVal = (b.nombreEvento || b.nombre || '').toLowerCase();
      } else if (sortConfig.key === 'fecha') {
        aVal = a.fechaEvento || a.fecha || '';
        bVal = b.fechaEvento || b.fecha || '';
      } else if (sortConfig.key === 'estado') {
        aVal = (a.estado || a.status || '').toLowerCase();
        bVal = (b.estado || b.status || '').toLowerCase();
      } else if (sortConfig.key === 'oficina') {
        aVal = (a.oficinaNombre || a.office || '').toLowerCase();
        bVal = (b.oficinaNombre || b.office || '').toLowerCase();
      }
      if (aVal < bVal) return sortConfig.dir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.dir === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredData, sortConfig]);

  const totalPages = Math.ceil(sortedData.length / PAGE_SIZE);
  const paginatedData = useMemo(() =>
    sortedData.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [sortedData, currentPage]
  );

  const groupedData = useMemo(() => {
    const groups = {};
    const result = [];

    // Pre-agrupar todo lo que tiene idGrupoRecurrencia
    paginatedData.forEach(item => {
      if (item.idGrupoRecurrencia) {
        if (!groups[item.idGrupoRecurrencia]) {
          groups[item.idGrupoRecurrencia] = [];
        }
        groups[item.idGrupoRecurrencia].push(item);
      }
    });

    const processedGroups = new Set();

    paginatedData.forEach(item => {
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
  }, [paginatedData]);

  const toggleGroup = (groupId, e) => {
    e.stopPropagation();
    if (expandedGroups.has(groupId)) {
      setClosingGroups(prev => new Set(prev).add(groupId));
      setTimeout(() => {
        setExpandedGroups(prev => { const n = new Set(prev); n.delete(groupId); return n; });
        setClosingGroups(prev => { const n = new Set(prev); n.delete(groupId); return n; });
      }, 200);
    } else {
      setExpandedGroups(prev => new Set(prev).add(groupId));
    }
  };

  const statusBadgeStyle = (item) => {
    const status = (item.estado || item.status || '').toUpperCase();
    const base = { padding: '3px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.4px' };
    if (status.includes('PUBLICAD') && item.visible === false) return { ...base, backgroundColor: '#fef3c7', color: '#b45309' };
    if (status.includes('PUBLICAD')) return { ...base, backgroundColor: '#dcfce7', color: '#16a34a' };
    if (status.includes('APROBAD')) return { ...base, backgroundColor: '#dbeafe', color: '#1d4ed8' };
    if (status.includes('RECHAZAD')) return { ...base, backgroundColor: '#fee2e2', color: '#dc2626' };
    if (status === 'EN_REVISION') return { ...base, backgroundColor: '#ede9fe', color: '#7c3aed' };
    return { ...base, backgroundColor: '#fefce8', color: '#854d0e' };
  };

  const [detailLoading, setDetailLoading] = useState(false);
  const detailReqRef = useRef(0);
  const handleOpenDetail = async (ev) => {
    if (!ev?.id) return;
    const reqId = ++detailReqRef.current;
    setDetailLoading(true);
    try {
      // First set the summary data we already have
      setSelectedEvent(ev);
      setIsDetailModalOpen(true);

      // Then fetch the full detail (including participants)
      const fullEvent = await getEventoById(ev.id, user?.rol);
      // Solo aplicar si esta sigue siendo la petición de detalle más reciente
      if (fullEvent && detailReqRef.current === reqId) {
        setSelectedEvent(fullEvent);
      }
    } catch (err) {
      console.error("Error cargando detalle completo del evento:", err);
      // Fallback: stay with the summary data
    } finally {
      if (detailReqRef.current === reqId) setDetailLoading(false);
    }
  };

  if (!user) return <Spinner message="Cargando perfil..." />;

  return (
    <div className="page-container">
      <div className={styles.header}>
        <h1 className="page-title" style={{marginBottom: 0}}>Gestión de Eventos</h1>
        {user?.rol?.toString().toUpperCase() !== 'CONSULTORIA' && (
          <button className={styles.createBtn} onClick={() => setIsCreateModalOpen(true)}>
            <Plus size={18} /> Nuevo Evento
          </button>
        )}
      </div>

      <div className="card">
        <div className={styles.filterToolbar}>
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input type="text" placeholder="Buscar por nombre, descripción o responsable..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className={styles.searchInput} />
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
            <div style={{ padding: '60px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <Calendar size={40} style={{ opacity: 0.2, color: '#ef4444' }} />
              <p style={{ color: '#ef4444', fontWeight: '600', margin: 0 }}>{error}</p>
              <button onClick={fetchEvents} style={{ padding: '8px 20px', borderRadius: 'var(--radius-md)', border: '1px solid #ef4444', background: 'var(--surface)', color: '#ef4444', fontWeight: '600', cursor: 'pointer' }}>
                Reintentar
              </button>
            </div>
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
                  const isClosing = isGroup && closingGroups.has(row.groupId);

                  return (
                    <React.Fragment key={isGroup ? `group-${row.groupId}` : `item-${item.id}`}>
                      <tr
                        onClick={isGroup ? (e) => toggleGroup(row.groupId, e) : undefined}
                        style={{ cursor: isGroup ? 'pointer' : 'default', backgroundColor: isGroup ? '#fffafa' : 'inherit', ...(isGroup && { borderLeft: '3px solid #fecaca' }) }}
                      >
                        <td style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>
                          {index + 1}
                        </td>
                        <td style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          <div>#{item.id}</div>
                          {isGroup && (
                            <div style={{
                              display: 'inline-flex', alignItems: 'center', gap: '3px',
                              marginTop: '5px',
                              fontSize: '9px', fontWeight: '700',
                              color: isExpanded ? '#ce1126' : 'var(--text-muted)',
                              letterSpacing: '0.2px', textTransform: 'uppercase',
                              transition: 'color 0.2s ease'
                            }}>
                              <ChevronRight size={9} style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }} />
                              Serie · {row.subItems.length + 1}
                            </div>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', maxWidth: '130px' }}>
                            <span style={{ 
                              fontWeight: '800', 
                              color: 'var(--text-main)', 
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
                                backgroundColor: 'var(--primary-soft)', 
                                color: '#ce1126', 
                                padding: '1px 4px', 
                                borderRadius: '4px', 
                                fontSize: '8px', 
                                fontWeight: '900', 
                                border: '1px solid #fecaca',
                                flexShrink: 0
                              }}>
                                <Star size={13} fill="currentColor" />
                              </span>
                            )}
                          </div>
                          <div className={styles.truncate} style={{ fontSize: '10px', color: 'var(--text-secondary)', maxWidth: '200px' }} title={item.descripcionEvento || item.desc}>{item.descripcionEvento || item.desc}</div>
                        </td>
                        <td className={styles.hideMobile}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: item.tipoEventoColorHex || '#ce1126', flexShrink: 0 }} />
                            <span style={{ fontSize: '11px', color: item.tipoEventoColorHex || '#ce1126', fontWeight: '800', textTransform: 'uppercase' }}>{item.tipoEvento || '-'}</span>
                          </div>
                        </td>
                        <td>
                          <div style={{ fontSize: '12px', color: 'var(--text-main)', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '110px' }} title={item.office || item.oficinaNombre}>{item.office || item.oficinaNombre || '-'}</div>
                          <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '110px' }} title={item.solicitanteEmail || item.usuarioSolicitanteCorreo}>
                            {item.solicitanteEmail || item.usuarioSolicitanteCorreo || '-'}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontSize: '12px', color: 'var(--text-main)' }}>
                            {item.fechaEvento?.split('T')[0] || item.fecha?.split('T')[0] || '-'}
                          </div>
                        </td>
                        <td>
                          {item.piezaGraficaUrl ? (
                            <div style={{ width: '28px', height: '28px', borderRadius: '4px', background: `url(${resolveImg(item.piezaGraficaUrl)}) center/cover`, border: '1px solid var(--border)' }} />
                          ) : (
                            <FileText size={18} color="#cbd5e1" />
                          )}
                        </td>
                        <td>
                          <span style={statusBadgeStyle(item)}>
                            {(() => { const s = (item.estado || item.status || 'PENDIENTE').toUpperCase(); if (s.includes('PUBLICAD') && item.visible === false) return 'OCULTO'; if (s === 'EN_REVISION') return 'En revisión'; return s; })()}
                          </span>
                        </td>
                        <td>
                          <button className={styles.actionBtn} onClick={(e) => { e.stopPropagation(); handleOpenDetail(item); }}>Detalles</button>
                        </td>
                      </tr>

                      {/* SUB-ITEMS DESPLEGADOS */}
                      {(isExpanded || isClosing) && row.subItems.map((sub, sIdx) => (
                        <tr
                          key={sub.id}
                          className={isClosing ? styles.subRowExit : styles.subRowEnter}
                          style={{ cursor: 'default', backgroundColor: 'var(--surface-2)', border: '1px solid var(--border)', animationDelay: `${sIdx * 0.04}s` }}
                        >
                          <td style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'right' }}>{index + 1}.{sIdx + 1}</td>
                          <td style={{ fontSize: '10px', color: '#cbd5e1' }}>#{sub.id}</td>
                          <td colSpan={3}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <Clock size={10} color="var(--text-muted)" />
                              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Instancia recurrente del evento</span>
                            </div>
                          </td>
                          <td>
                            <div style={{ fontSize: '11px', color: 'var(--text-main)', fontWeight: '600' }}>
                              {sub.fechaEvento?.split('T')[0] || sub.fecha?.split('T')[0]}
                            </div>
                          </td>
                          <td>-</td>
                          <td>
                            <span style={statusBadgeStyle(sub)}>
                              {(() => { const s = (sub.estado || sub.status || 'PENDIENTE').toUpperCase(); if (s === 'EN_REVISION') return 'En revisión'; return s; })()}
                            </span>
                          </td>
                          <td>
                             <button className={styles.actionBtn} style={{ opacity: 0.7, padding: '4px 8px', fontSize: '10px' }} onClick={(e) => { e.stopPropagation(); handleOpenDetail(sub); }}>Detalles</button>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })}
                {groupedData.length === 0 && (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                        <Calendar size={40} style={{ opacity: 0.2 }} />
                        <span>{searchTerm ? `Sin resultados para "${searchTerm}". Intenta con otros términos o limpia los filtros.` : 'No se encontraron registros coincidentes.'}</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderTop: '1px solid var(--border)', flexWrap: 'wrap', gap: '8px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Mostrando {Math.min((currentPage - 1) * PAGE_SIZE + 1, sortedData.length)}–{Math.min(currentPage * PAGE_SIZE, sortedData.length)} de {sortedData.length} registros
              </span>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.4 : 1 }}>‹</button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  const page = totalPages <= 7 ? i + 1 : (currentPage <= 4 ? i + 1 : currentPage - 3 + i);
                  if (page < 1 || page > totalPages) return null;
                  return (
                    <button key={page} onClick={() => setCurrentPage(page)} style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid', borderColor: page === currentPage ? 'var(--primary)' : 'var(--border)', background: page === currentPage ? 'var(--primary)' : 'var(--surface)', color: page === currentPage ? '#fff' : 'var(--text-secondary)', fontWeight: page === currentPage ? '700' : '400', cursor: 'pointer' }}>
                      {page}
                    </button>
                  );
                })}
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? 0.4 : 1 }}>›</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedEvent && <EventDetailModal 
        isOpen={isDetailModalOpen} 
        onClose={() => { detailReqRef.current++; setIsDetailModalOpen(false); }} 
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
