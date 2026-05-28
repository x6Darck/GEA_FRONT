import React, { useState, useEffect, useMemo, useContext } from 'react';
import { FileText, Download, Plus, Search, Calendar, Info, BarChart3, CheckCircle2, Clock, XCircle, TrendingUp, Building2, CalendarRange, Layers } from 'lucide-react';
import styles from './Reports.module.css';
import { getReportes, exportReporte, getDashboardStats } from '../services/reportes.service';
import { getOficinas } from '../services/oficinas.service';
import Spinner from '../components/ui/Spinner';
import GenerateReportModal from '../components/ui/GenerateReportModal';
import ReportDetailModal from '../components/ui/ReportDetailModal';
import ErrorBoundary from '../components/ErrorBoundary';
import { AuthContext } from '../context/AuthContext';
import notification from '../utils/notification';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  PieChart, Pie, Cell, BarChart, Bar, Legend 
} from 'recharts';

// ─── Constants ──────────────────────────────────────────────────────────────
const DATE_FILTERS = [
  { label: 'Todas las fechas', value: 'all' },
  { label: 'Hoy', value: 'today' },
  { label: 'Esta semana', value: 'week' },
  { label: 'Este mes', value: 'month' },
];

const today = new Date();
const toYMD = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const STAT_COLORS = ['#ce1126', '#16a34a', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899'];

const STATUS_COLORS = {
  'APROBADA': '#16a34a',
  'PENDIENTE': '#f59e0b',
  'RECHAZADA': '#ce1126',
  'PUBLICADA': '#0ea5e9'
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ backgroundColor: '#fff', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '10px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
        <p style={{ margin: 0, fontWeight: 'bold', fontSize: '13px', color: '#1e293b' }}>{label}</p>
        <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#ce1126', fontWeight: '800' }}>
          {`${payload[0].name}: ${payload[0].value}`}
        </p>
      </div>
    );
  }
  return null;
};

const TIPO_OPTIONS = [
  { val: 'GLOBAL', label: 'Todo' },
  { val: 'EVENTOS', label: 'Eventos' },
  { val: 'ANUNCIOS', label: 'Anuncios' },
];

const StatsDashboard = ({ stats, loading, tipoFilter, onTipoChange, oficinaLabel, desde, hasta }) => {
  // Solo retornamos nulo si no hay datos NI estamos cargando (error crítico)
  if (!stats && !loading) return null;

  const safeStats = stats || {
    totalSolicitudes: 0, totalAprobados: 0, totalPendientes: 0,
    totalRechazados: 0, tasaAprobacion: 0,
    eventosPorTipo: [], solicitudesPorOficina: [], tendenciaEstado: [], solicitudesPorMes: []
  };

  const meses = safeStats.solicitudesPorMes || [];
  const porOficina = safeStats.solicitudesPorOficina || [];
  const estados = safeStats.tendenciaEstado || [];
  const categorias = safeStats.eventosPorTipo || [];

  const publicadas = (estados.find(e => (e.etiqueta || '').toUpperCase() === 'PUBLICADA')?.valor) || 0;
  const esAnuncios = tipoFilter === 'ANUNCIOS';

  const fmt = (n) => new Intl.NumberFormat('es-CO').format(n ?? 0);

  const kpis = [
    { label: 'Total Solicitudes', value: fmt(safeStats.totalSolicitudes), Icon: BarChart3, color: '#3b82f6' },
    { label: 'Aprobadas', value: fmt(safeStats.totalAprobados), Icon: CheckCircle2, color: '#16a34a' },
    { label: 'Pendientes', value: fmt(safeStats.totalPendientes), Icon: Clock, color: '#f59e0b' },
    { label: 'Rechazadas', value: fmt(safeStats.totalRechazados), Icon: XCircle, color: '#ce1126' },
    { label: 'Tasa Aprobación', value: `${safeStats.tasaAprobacion ?? 0}%`, Icon: TrendingUp, color: '#8b5cf6' },
  ];

  // recharts 3.x con React 19 necesita height numérico explícito en el contenedor
  // NO usar height="100%" en el div wrapper — dar valor fijo en px
  const CHART_HEIGHT = 250;

  const tipoLabel = TIPO_OPTIONS.find(t => t.val === tipoFilter)?.label || 'Todo';

  return (
    <div className={styles.dashboard} style={{ position: 'relative' }}>
      {/* Cabecera del panel: título + selector segmentado */}
      <div className={styles.statsHeader}>
        <div>
          <h2 className={styles.statsTitle}>Panel de Estadísticas</h2>
          <p className={styles.statsSubtitle}>Análisis de solicitudes según los filtros seleccionados</p>
        </div>
        <div className={styles.tabs} role="tablist" aria-label="Filtrar estadísticas por tipo">
          {TIPO_OPTIONS.map(opt => (
            <button
              key={opt.val}
              role="tab"
              aria-selected={tipoFilter === opt.val}
              className={`${styles.tabBtn} ${tipoFilter === opt.val ? styles.active : ''}`}
              onClick={() => onTipoChange(opt.val)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chips de filtros activos */}
      <div className={styles.filterChips}>
        <span className={styles.chip}><Layers size={12} /> {tipoLabel}</span>
        {oficinaLabel && <span className={styles.chip}><Building2 size={12} /> {oficinaLabel}</span>}
        {(desde || hasta) && (
          <span className={styles.chip}>
            <CalendarRange size={12} /> {desde || '...'} → {hasta || '...'}
          </span>
        )}
      </div>

      {/* Overlay de carga elegante */}
      {loading && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          zIndex: 50, background: 'rgba(255,255,255,0.7)',
          backdropFilter: 'blur(3px)', borderRadius: '16px',
          display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center'
        }}>
          <div style={{ width: '40px', height: '40px', border: '4px solid #f3f3f3', borderTop: '4px solid #ce1126', borderRadius: '50%', marginBottom: '12px', animation: 'spin 1s linear infinite' }}></div>
          <p style={{ color: '#1e293b', fontSize: '14px', fontWeight: '800' }}>Actualizando Analíticas...</p>
        </div>
      )}

      <div className={styles.statsGrid}>
        {kpis.map((kpi, idx) => (
          <div key={idx} className={styles.statCard}>
            <div className={styles.statIcon} style={{ background: `${kpi.color}15`, color: kpi.color }}>
              <kpi.Icon size={24} />
            </div>
            <div className={styles.statInfo}>
              <div className={styles.statValue}>{kpi.value}</div>
              <div className={styles.statLabel}>{kpi.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.chartsGrid}>
        {/* Gráfico de Tendencia Mensual */}
        <div className={styles.chartContainer} style={{ minHeight: '340px' }}>
          <div className={styles.chartTitle}>Tendencia Mensual de Solicitudes</div>
          {/* height numérico explícito — clave para recharts 3.x + React 19 */}
          <div style={{ height: CHART_HEIGHT, width: '100%', marginTop: '20px' }}>
            {meses.length > 0 ? (
              <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                <AreaChart data={meses} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ce1126" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#ce1126" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="etiqueta" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b'}} dy={10} />
                  <YAxis hide={true} domain={[0, 'dataMax + 1']} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="valor" name="Solicitudes" stroke="#ce1126" strokeWidth={3} fillOpacity={1} fill="url(#colorVal)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className={styles.noDataPlaceholder}>No hay tendencia registrada en este periodo</div>
            )}
          </div>
        </div>

        {/* Gráfico por Oficina */}
        <div className={styles.chartContainer} style={{ minHeight: '340px' }}>
          <div className={styles.chartTitle}>Solicitudes por Oficina</div>
          <div style={{ height: CHART_HEIGHT, width: '100%', marginTop: '20px' }}>
            {porOficina.length > 0 ? (
              <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                <BarChart layout="vertical" data={porOficina.slice(0, 5)} margin={{ left: 20, right: 10, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" hide allowDecimals={false} />
                  <YAxis dataKey="etiqueta" type="category" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b'}} width={90} />
                  <Tooltip formatter={(value) => [value, 'Solicitudes']} />
                  <Bar dataKey="valor" name="Solicitudes" radius={[0, 6, 6, 0]}>
                    {porOficina.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={STAT_COLORS[index % STAT_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className={styles.noDataPlaceholder}>No hay datos por oficina</div>
            )}
          </div>
        </div>

        {/* Distribución de Estados */}
        <div className={styles.chartContainer} style={{ minHeight: '340px' }}>
          <div className={styles.chartTitle}>Distribución de Estados</div>
          <div style={{ height: CHART_HEIGHT, width: '100%' }}>
            {estados.length > 0 ? (
              <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                <PieChart>
                  <Pie
                    data={estados}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="valor"
                    nameKey="etiqueta"
                  >
                    {estados.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.etiqueta] || STAT_COLORS[index % STAT_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name) => [value, name]} />
                  <Legend iconType="circle" wrapperStyle={{fontSize: '11px'}} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className={styles.noDataPlaceholder}>Sin estados registrados</div>
            )}
          </div>
        </div>

        {/* Eventos por tipo (solo aplica a eventos) */}
        {!esAnuncios && (
          <div className={styles.chartContainer}>
            <div className={styles.chartTitle}>Eventos por tipo</div>
            <div style={{ height: CHART_HEIGHT, width: '100%', marginTop: '10px', overflowY: 'auto' }}>
              {categorias.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {categorias.slice(0, 6).map((item, idx) => (
                    <div key={idx} style={{ padding: '8px 12px', background: '#f8fafc', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.color || STAT_COLORS[idx % STAT_COLORS.length], flexShrink: 0 }} />
                        <span style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>{item.etiqueta}</span>
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: '800', color: '#1e293b' }}>{item.valor}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.noDataPlaceholder}>No hay tipos de evento registrados</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


const Reports = () => {
  const { user } = useContext(AuthContext);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [exportingId, setExportingId] = useState(null);
  const [oficinas, setOficinas] = useState([]);
  const [oficinaFilter, setOficinaFilter] = useState('');
  const [desdeFilter, setDesdeFilter] = useState('');
  const [hastaFilter, setHastaFilter] = useState('');
  const [tipoFilter, setTipoFilter] = useState('GLOBAL');
  const [stats, setStats] = useState({
    totalSolicitudes: 0,
    totalAprobados: 0,
    totalPendientes: 0,
    totalRechazados: 0,
    tasaAprobacion: 0,
    eventosPorTipo: [],
    solicitudesPorOficina: [],
    tendenciaEstado: [],
    solicitudesPorMes: []
  });
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    const loadOficinas = async () => {
      const userRol = user?.rol?.toString().toUpperCase() || '';
      const isPrivileged = ['SUPER_ADMIN', 'ADMIN', 'COMUNICACIONES'].includes(userRol);
      if (!isPrivileged) return;

      try {
        const response = await getOficinas({ skipGlobalError: true });
        setOficinas(Array.isArray(response) ? response : response?.data || []);
      } catch (err) {
        console.error("Error cargando oficinas:", err);
      }
    };
    if (user) loadOficinas();
  }, [user]);

  // BLINDAJE: Si es rol OFICINA, fijar el filtro a su propia oficina
  useEffect(() => {
    if (user && (user.rol === 'OFICINA' || user.rol === 'USUARIO_AUTENTICADO_APP') && user.idOficina) {
      setOficinaFilter(user.idOficina.toString());
    }
  }, [user]);

  const canViewStats = user && ['SUPER_ADMIN', 'COMUNICACIONES'].includes(user?.rol?.toString().toUpperCase());

  useEffect(() => {
    if (user) {
      const filters = {
        idOficina: oficinaFilter !== 'all' ? oficinaFilter : null,
        desde: desdeFilter,
        hasta: hastaFilter
      };

      fetchData(filters);
      if (canViewStats) {
        fetchDashboardStats({ ...filters, tipo: tipoFilter });
      }
    }
  }, [user, oficinaFilter, desdeFilter, hastaFilter, tipoFilter, canViewStats]);

  const fetchDashboardStats = async (filters) => {
    try {
      setStatsLoading(true);
      const res = await getDashboardStats(filters);
      setStats(res || {
        totalSolicitudes: 0,
        totalAprobados: 0,
        totalPendientes: 0,
        totalRechazados: 0,
        tasaAprobacion: 0,
        eventosPorTipo: [],
        solicitudesPorOficina: [],
        tendenciaEstado: [],
        solicitudesPorMes: []
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchData = async (filters = {}) => {
    try {
      setLoading(true);
      const data = await getReportes(filters);
      setReports(Array.isArray(data) ? data : data.data || []);
    } catch (err) {
      if (!err.handledByInterceptor) {
        notification.error('Error al cargar la lista de reportes');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredReports = useMemo(() => {
    return reports.filter(item => {
      // Search filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const title = (item.titulo || '').toLowerCase();
        const desc = (item.descripcion || '').toLowerCase();
        if (!title.includes(q) && !desc.includes(q)) return false;
      }

      return true;
    });
  }, [reports, searchTerm]);

  const handleExport = async (report) => {
    try {
      setExportingId(report.id);
      const blob = await exportReporte(report.id);
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const extension = (report.formato || 'PDF').toLowerCase();
      link.setAttribute('download', `reporte-${report.id}.${extension}`);
      
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      notification.success('Reporte exportado correctamente');
    } catch (err) {
      console.error('Error exportando reporte:', err);
      const msg = err.response?.data?.message || 'No fue posible descargar el archivo. Por favor intente más tarde.';
      notification.error('Error al exportar: ' + msg);
    } finally {
      setExportingId(null);
    }
  };

  if (!user) return <Spinner message="Cargando perfil..." />;

  return (
    <div className="page-container">
      <div className={styles.header}>
        <h1 className="page-title" style={{marginBottom: 0}}>Gestión de Reportes</h1>
        <button 
          className={styles.createBtn}
          onClick={() => setIsGenerateModalOpen(true)}
        >
          <Plus size={18}/> Nuevo Reporte
        </button>
      </div>


      <div className="card">
        <div className={styles.controlsBar}>
          <div className={styles.searchBar}>
            <Search size={20} className={styles.searchIcon}/>
            <input 
              type="text" 
              placeholder="Buscar reporte por título o descripción..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          
          <select
            className={styles.monthSelect}
            value={dateFilter}
            onChange={e => {
              const val = e.target.value;
              setDateFilter(val);
              
              if (val === 'all') {
                setDesdeFilter('');
                setHastaFilter('');
              } else {
                const now = new Date();
                let start = new Date(now);
                let end = new Date(now);
                
                if (val === 'today') {
                  // Ya están en now
                } else if (val === 'week') {
                  start.setDate(now.getDate() - now.getDay());
                  end.setDate(now.getDate() + (6 - now.getDay()));
                } else if (val === 'month') {
                  start = new Date(now.getFullYear(), now.getMonth(), 1);
                  end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                }
                
                setDesdeFilter(toYMD(start));
                setHastaFilter(toYMD(end));
              }
            }}
          >
            {DATE_FILTERS.map(f => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>

        <div className={styles.controlsBar} style={{ borderTop: '1px solid #f1f5f9', paddingTop: '20px', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '12px', fontWeight: '800', color: '#ce1126', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Oficina:</span>
            <select 
              className={styles.monthSelect}
              style={{ 
                minWidth: '180px', height: '38px', padding: '0 12px',
                backgroundColor: (user?.rol === 'OFICINA' || user?.rol === 'USUARIO_AUTENTICADO_APP') ? '#f8fafc' : 'white',
                cursor: (user?.rol === 'OFICINA' || user?.rol === 'USUARIO_AUTENTICADO_APP') ? 'not-allowed' : 'pointer'
              }}
              value={oficinaFilter}
              onChange={e => setOficinaFilter(e.target.value)}
              disabled={user?.rol === 'OFICINA' || user?.rol === 'USUARIO_AUTENTICADO_APP'}
            >
              {!(user?.rol === 'OFICINA' || user?.rol === 'USUARIO_AUTENTICADO_APP') && <option value="">Todas las oficinas</option>}
              
              {/* BLINDAJE: Si el usuario es de oficina y la lista no ha cargado, asegurar que su opción exista */}
              {(user?.rol === 'OFICINA' || user?.rol === 'USUARIO_AUTENTICADO_APP') && oficinas.length === 0 && user.idOficina && (
                <option value={user.idOficina}>{user.oficinaNombre || 'Cargando oficina...'}</option>
              )}

              {oficinas.map(o => (
                <option key={o.id} value={o.id}>{o.nombre}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '12px', fontWeight: '800', color: '#ce1126', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Desde:</span>
            <input 
              type="date" 
              className={styles.monthSelect}
              style={{ height: '38px', padding: '0 12px' }}
              value={desdeFilter}
              onChange={e => setDesdeFilter(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '12px', fontWeight: '800', color: '#ce1126', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Hasta:</span>
            <input 
              type="date" 
              className={styles.monthSelect}
              style={{ height: '38px', padding: '0 12px' }}
              value={hastaFilter}
              onChange={e => setHastaFilter(e.target.value)}
            />
          </div>

          <button 
            className={styles.actionBtn}
            style={{ marginLeft: 'auto', background: '#f8fafc', fontWeight: '800', fontSize: '11px', textTransform: 'uppercase' }}
            onClick={() => {
              if (!(user?.rol === 'OFICINA' || user?.rol === 'USUARIO_AUTENTICADO_APP')) {
                setOficinaFilter('');
              }
              setDesdeFilter('');
              setHastaFilter('');
              setSearchTerm('');
              setDateFilter('all');
              setTipoFilter('GLOBAL');
            }}
          >
            Limpiar Filtros
          </button>
        </div>

        <div className={styles.tableContainer}>
          {loading ? (
            <Spinner message="Obteniendo reportes..." />
          ) : error ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#dc2626' }}>
              <Info size={32} style={{ marginBottom: '12px' }} />
              <p>{error}</p>
            </div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>#</th>
                  <th style={{ width: '60px' }}>ID</th>
                  <th>Nombre del Reporte</th>
                  <th>Descripción</th>
                  <th>Oficina</th>
                  <th>Usuario</th>
                  <th>Fecha Generación</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {(filteredReports || []).map((report, index) => (
                  <tr key={report.id}>
                    <td style={{ fontSize: '12x', fontWeight: 'bold', color: '#64748b' }}>{index + 1}</td>
                    <td style={{ fontSize: '11px', color: '#94a3b8' }}>#{report.id}</td>
                    <td>
                      <div className={styles.truncate} style={{ color: 'var(--primary)', fontWeight: 'bold' }} title={report.titulo}>
                        {report.titulo}
                      </div>
                    </td>
                    <td className={styles.truncate} title={report.descripcion}>{report.descripcion}</td>
                    <td style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>{report.usuarioOficina}</td>
                    <td style={{ fontSize: '11px', color: '#94a3b8' }}>{report.usuarioCorreo}</td>
                    <td style={{ fontSize: '12px' }}>
                      {report.fecha !== '-' ? new Date(report.fecha).toLocaleDateString('es-CO') : '-'}
                    </td>
                    <td>
                      <span style={{ 
                        padding: '3px 10px', borderRadius: '12px', fontSize: '10px', fontWeight: '800', 
                        backgroundColor: '#dcfce7', color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.5px'
                      }}>
                        GENERADO
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex' }}>
                        <button 
                          className={styles.actionBtn}
                          onClick={() => setSelectedReport(report)}
                        >
                          Ver
                        </button>
                        <button 
                          className={styles.exportBtn}
                          disabled={exportingId === report.id}
                          onClick={() => handleExport(report)}
                        >
                          {exportingId === report.id ? '...' : <><Download size={14} style={{ marginRight: '4px' }} /> {report.formato || 'PDF'}</>}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredReports.length === 0 && (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '80px 20px', color: '#94a3b8' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                        <FileText size={40} style={{ opacity: 0.2 }} />
                        <span>No se encontraron reportes con los filtros aplicados.</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {canViewStats && (
        <div style={{ marginTop: '32px' }}>
          <ErrorBoundary resetOnPropsChange={stats}>
            <StatsDashboard
              stats={stats}
              loading={statsLoading}
              tipoFilter={tipoFilter}
              onTipoChange={setTipoFilter}
              oficinaLabel={oficinaFilter ? (oficinas.find(o => String(o.id) === String(oficinaFilter))?.nombre || null) : null}
              desde={desdeFilter}
              hasta={hastaFilter}
            />
          </ErrorBoundary>
        </div>
      )}

      {/* ── Modal de Creación protegido con ErrorBoundary ── */}
      <ErrorBoundary isModal={true} resetOnPropsChange={isGenerateModalOpen}>
        <GenerateReportModal 
          isOpen={isGenerateModalOpen}
          onClose={() => setIsGenerateModalOpen(false)}
          onSuccess={fetchData}
        />
      </ErrorBoundary>

      <ErrorBoundary isModal={true} resetOnPropsChange={!!selectedReport}>
        <ReportDetailModal 
          isOpen={!!selectedReport}
          onClose={() => setSelectedReport(null)}
          report={selectedReport}
          onExport={handleExport}
        />
      </ErrorBoundary>
    </div>
  );
};

export default Reports;
