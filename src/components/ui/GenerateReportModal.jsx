import React, { useState, useEffect, useContext } from 'react';
import { FileText, Calendar, CheckCircle, Download, Info, Building, Tag, ShieldCheck } from 'lucide-react';
import Modal from './Modal';
import { createReporte } from '../../services/reportes.service';
import { getOficinas } from '../../services/oficinas.service';
import { getTiposEvento } from '../../services/tipoEvento.service';
import { AuthContext } from '../../context/AuthContext';
import notification from '../../utils/notification';

const GenerateReportModal = ({ isOpen, onClose, onSuccess }) => {
  // Defensive context access - if not in provider, user is null
  const authCtx = useContext(AuthContext);
  const user = authCtx?.user || null;

  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0); // 0: Form, 1: Generating, 2: Done
  const [oficinas, setOficinas] = useState([]);
  const [tiposEvento, setTiposEvento] = useState([]);

  // Detección robusta de administradores (SUPER_ADMIN o ADMIN)
  const rolName = typeof user?.rol === 'string' ? user.rol : user?.rol?.nombre;
  const isGlobalAdmin = rolName === 'SUPER_ADMIN' || rolName === 'ADMIN' || rolName === 'SUPERADMIN';
  const isSuperAdmin = isGlobalAdmin; // Mantener alias para compatibilidad

  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    formato: 'PDF',
    alcance: 'GLOBAL',
    desde: '',
    hasta: '',
    idOficina: '',
    idTipoEvento: ''
  });

  // Cargar filtros avanzados solo para SuperAdmin cuando el modal está abierto
  useEffect(() => {
    if (isOpen && isSuperAdmin) {
      cargarFiltros();
    }
    // Reiniciar estado al cerrar
    if (!isOpen) {
      setStep(0);
      setFormData({ nombre: '', descripcion: '', formato: 'PDF', alcance: 'GLOBAL', desde: '', hasta: '', idOficina: '', idTipoEvento: '' });
    }
  }, [isOpen]);

  const cargarFiltros = async () => {
    try {
      const [ofisRes, tiposRes] = await Promise.allSettled([
        getOficinas(),
        getTiposEvento()
      ]);

      if (ofisRes.status === 'fulfilled') {
        const val = ofisRes.value;
        setOficinas(Array.isArray(val) ? val : (val?.data || []));
      }
      if (tiposRes.status === 'fulfilled') {
        const val = tiposRes.value;
        setTiposEvento(Array.isArray(val) ? val : (val?.data || []));
      }
    } catch (err) {
      console.error('Error cargando filtros de reporte:', err);
    }
  };

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStep(1);

    try {
      // Construir payload limpio (sin campos vacíos opcionales)
      const payload = {
        nombre: formData.nombre,
        descripcion: formData.descripcion,
        formato: formData.formato,
        alcance: formData.alcance,
        desde: formData.desde,
        hasta: formData.hasta,
      };
      if (formData.idOficina) payload.idOficina = Number(formData.idOficina);
      if (formData.idTipoEvento) payload.idTipoEvento = Number(formData.idTipoEvento);

      await createReporte(payload);
      await new Promise(resolve => setTimeout(resolve, 1500));

      notification.success('Reporte generado exitosamente');
      setStep(2);
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Error exportando reporte:', err);
      const msg = err.response?.data?.message || 'No fue posible descargar el archivo. Por favor intente más tarde.';
      notification.error('Error al exportar: ' + msg);
      setStep(0);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const inputStyle = {
    padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1',
    fontSize: '13px', width: '100%', boxSizing: 'border-box', outline: 'none',
    backgroundColor: '#fff', color: 'var(--text-secondary)'
  };

  const labelStyle = { fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: '600', display: 'block' };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Generar Nuevo Reporte"
      style={{ maxWidth: '620px', width: '95%' }}
    >
      <div style={{ padding: '4px 8px' }}>

        {/* ── STEP 0: FORM ── */}
        {step === 0 && (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Sección 1: Información */}
            <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: '0 0 12px', fontSize: '14px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={16} color="#ce1126" /> Información del Reporte
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Nombre del Reporte *</label>
                  <input
                    type="text" name="nombre" value={formData.nombre} onChange={handleChange}
                    required placeholder="Ej: Reporte Mensual de Solicitudes" style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Descripción (Opcional)</label>
                  <textarea
                    name="descripcion" value={formData.descripcion} onChange={handleChange}
                    rows="2" placeholder="Detalles sobre el contenido del reporte..."
                    style={{ ...inputStyle, resize: 'vertical' }}
                  />
                </div>
              </div>
            </div>

            {/* Sección 2: Alcance */}
            <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: '0 0 12px', fontSize: '14px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Info size={16} color="#ce1126" /> Alcance del Reporte
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                {[
                  { val: 'GLOBAL', label: 'Todo' },
                  { val: 'EVENTOS', label: 'Solo Eventos' },
                  { val: 'ANUNCIOS', label: 'Solo Anuncios' }
                ].map(opt => (
                  <label key={opt.val} style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                    padding: '12px', borderRadius: '10px', border: `2px solid ${formData.alcance === opt.val ? '#ce1126' : '#e2e8f0'}`,
                    backgroundColor: formData.alcance === opt.val ? '#fff5f5' : 'transparent',
                    cursor: 'pointer', transition: 'background-color var(--dur) var(--ease-standard), color var(--dur) var(--ease-standard), transform var(--dur-fast) var(--ease-out)', textAlign: 'center'
                  }}>
                    <input type="radio" name="alcance" value={opt.val} checked={formData.alcance === opt.val} onChange={handleChange} style={{ display: 'none' }} />
                    <span style={{ fontSize: '12px', fontWeight: '700', color: formData.alcance === opt.val ? '#ce1126' : 'var(--text-secondary)' }}>
                      {opt.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Sección 3: Filtros Avanzados (solo SuperAdmin) */}
            {isSuperAdmin && (
              <div style={{ backgroundColor: '#f0f9ff', padding: '16px', borderRadius: '12px', border: '1px solid #bae6fd' }}>
                <h3 style={{ margin: '0 0 12px', fontSize: '14px', color: '#0369a1', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck size={16} /> Filtros Avanzados — SuperAdmin
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ ...labelStyle, color: '#0369a1', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Building size={13} /> Filtrar por Oficina
                    </label>
                    <select
                      name="idOficina" value={formData.idOficina} onChange={handleChange}
                      style={{ ...inputStyle, border: '1px solid #bae6fd' }}
                    >
                      <option value="">Todas las Oficinas</option>
                      {oficinas.map(o => (
                        <option key={o.id || o.idOficina} value={o.id || o.idOficina}>
                          {o.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ ...labelStyle, color: '#0369a1', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Tag size={13} /> Tipo de Evento
                    </label>
                    <select
                      name="idTipoEvento" value={formData.idTipoEvento} onChange={handleChange}
                      style={{ ...inputStyle, border: '1px solid #bae6fd' }}
                    >
                      <option value="">Todos los Tipos</option>
                      {tiposEvento.map(t => (
                        <option key={t.id || t.idTipoEvento} value={t.id || t.idTipoEvento}>
                          {t.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Sección 4: Fechas y Formato */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: '0 0 12px', fontSize: '14px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calendar size={16} color="#ce1126" /> Rango de Fechas
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div>
                    <label style={labelStyle}>Desde *</label>
                    <input type="date" name="desde" value={formData.desde} onChange={handleChange} required style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Hasta *</label>
                    <input type="date" name="hasta" value={formData.hasta} onChange={handleChange} required style={inputStyle} />
                  </div>
                </div>
              </div>

              <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: '0 0 12px', fontSize: '14px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Download size={16} color="#ce1126" /> Formato de Salida
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {[{ val: 'PDF', label: 'PDF Document', color: '#ce1126' }, { val: 'XLSX', label: 'Excel (XLSX)', color: '#16a34a' }].map(f => (
                    <label key={f.val} style={{
                      display: 'flex', alignItems: 'center', gap: '10px', padding: '10px',
                      borderRadius: '8px', border: '1px solid #e2e8f0',
                      backgroundColor: formData.formato === f.val ? '#fff' : 'transparent',
                      cursor: 'pointer', transition: 'background-color var(--dur) var(--ease-standard), color var(--dur) var(--ease-standard), transform var(--dur-fast) var(--ease-out)'
                    }}>
                      <input type="radio" name="formato" value={f.val} checked={formData.formato === f.val} onChange={handleChange} />
                      <span style={{ fontSize: '13px', fontWeight: '700', color: formData.formato === f.val ? f.color : 'var(--text-secondary)' }}>
                        {f.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '4px' }}>
              <button type="button" onClick={onClose} style={{
                padding: '10px 22px', borderRadius: '30px', border: 'none',
                backgroundColor: '#f1f5f9', color: 'var(--text-secondary)', fontWeight: '700', cursor: 'pointer', fontSize: '14px'
              }}>
                Cancelar
              </button>
              <button type="submit" disabled={loading} style={{
                padding: '10px 26px', borderRadius: '30px', border: 'none',
                backgroundColor: '#ce1126', color: 'white', fontWeight: '700',
                cursor: loading ? 'not-allowed' : 'pointer', fontSize: '14px',
                boxShadow: '0 4px 14px rgba(206,17,38,0.25)', opacity: loading ? 0.7 : 1
              }}>
                Generar Reporte
              </button>
            </div>
          </form>
        )}

        {/* ── STEP 1: LOADING ── */}
        {step === 1 && (
          <div style={{ padding: '48px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{
              width: '64px', height: '64px', border: '4px solid #f1f5f9', borderTop: '4px solid #ce1126',
              borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '24px'
            }} />
            <h2 style={{ margin: '0 0 8px', color: 'var(--text-main)', fontSize: '20px' }}>Generando Reporte...</h2>
            <p style={{ margin: 0, color: 'var(--text-secondary)', maxWidth: '380px' }}>
              Procesando los datos para crear tu archivo {formData.formato}. Esto tomará unos segundos.
            </p>
            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* ── STEP 2: SUCCESS ── */}
        {step === 2 && (
          <div style={{ padding: '48px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{
              width: '80px', height: '80px', backgroundColor: '#dcfce7', color: '#16a34a',
              borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px'
            }}>
              <CheckCircle size={42} />
            </div>
            <h2 style={{ margin: '0 0 12px', color: 'var(--text-main)', fontSize: '22px' }}>¡Reporte Generado!</h2>
            <p style={{ margin: '0 0 32px', color: 'var(--text-secondary)', maxWidth: '400px' }}>
              El reporte ha sido creado exitosamente y ya está disponible en tu historial para descarga.
            </p>
            <button onClick={onClose} style={{
              padding: '12px 36px', borderRadius: '30px', border: 'none',
              backgroundColor: '#ce1126', color: 'white', fontWeight: '700',
              cursor: 'pointer', fontSize: '15px', boxShadow: '0 4px 14px rgba(206,17,38,0.25)'
            }}>
              Cerrar Ventana
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default GenerateReportModal;
