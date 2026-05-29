import React, { useState, useEffect } from 'react';
import { FileText, Calendar, Download, X } from 'lucide-react';
import { exportarAgendaPdf } from '../../services/eventos.service';
import notification from '../../utils/notification';

const toYMD = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const ExportAgendaModal = ({ isOpen, onClose, currentDate }) => {
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [loading, setLoading] = useState(false);

  // Pre-rellenar con el mes visible en el calendario
  useEffect(() => {
    if (!isOpen) return;
    const base = currentDate || new Date();
    const primerDia = new Date(base.getFullYear(), base.getMonth(), 1);
    const ultimoDia = new Date(base.getFullYear(), base.getMonth() + 1, 0);
    setDesde(toYMD(primerDia));
    setHasta(toYMD(ultimoDia));
  }, [isOpen, currentDate]);

  const handleExport = async () => {
    if (!desde || !hasta) {
      notification.error('Debes seleccionar ambas fechas');
      return;
    }
    if (hasta < desde) {
      notification.error('La fecha de fin no puede ser anterior a la de inicio');
      return;
    }
    try {
      setLoading(true);
      const blob = await exportarAgendaPdf(desde, hasta);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `agenda-gea-${desde}-al-${hasta}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      notification.success('Agenda descargada exitosamente');
      onClose();
    } catch (err) {
      console.error('Error exportando agenda:', err);
      notification.error('No fue posible generar la agenda. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const inputStyle = {
    padding: '10px 14px', borderRadius: '8px',
    border: '1px solid #cbd5e1', fontSize: '13px',
    width: '100%', boxSizing: 'border-box', outline: 'none',
    backgroundColor: '#fff', color: '#334155',
  };

  const labelStyle = {
    fontSize: '12px', color: '#64748b', marginBottom: '4px',
    fontWeight: '600', display: 'block',
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        backgroundColor: 'rgba(15,23,42,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px', backdropFilter: 'blur(4px)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: '20px',
          maxWidth: '480px', width: '100%',
          boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
          border: '1px solid rgba(0,0,0,0.06)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          background: 'linear-gradient(135deg, #CE1126 0%, #8b0000 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText size={20} color="#fff" />
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#fff' }}>
                Exportar Agenda
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.75)' }}>
                Genera un PDF listo para compartir
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.2)', border: 'none', cursor: 'pointer',
              color: '#fff', borderRadius: '50%', width: '32px', height: '32px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px' }}>

          {/* Vista previa del formato */}
          <div style={{
            backgroundColor: '#f8fafc', borderRadius: '12px',
            border: '1px solid #e2e8f0', padding: '16px', marginBottom: '20px',
            display: 'flex', alignItems: 'flex-start', gap: '14px',
          }}>
            <div style={{
              width: '42px', height: '54px', backgroundColor: '#fff',
              borderRadius: '6px', border: '1px solid #e2e8f0', flexShrink: 0,
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
              boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
            }}>
              <div style={{ height: '10px', backgroundColor: '#CE1126' }} />
              {[1,2,3].map(i => (
                <div key={i} style={{ margin: '4px 6px 0', height: '4px', backgroundColor: i===1?'#1e293b':'#e2e8f0', borderRadius: '2px' }} />
              ))}
            </div>
            <div>
              <p style={{ margin: '0 0 4px', fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>
                Agenda PDF — Marca GEA
              </p>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748b', lineHeight: '1.5' }}>
                Eventos agrupados por día, con hora, lugar y oficina.
                Ideal para publicar en grupos o imprimir.
              </p>
            </div>
          </div>

          {/* Rango de fechas */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '24px' }}>
            <div>
              <label style={labelStyle}>
                <Calendar size={11} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                Desde
              </label>
              <input
                type="date" value={desde}
                onChange={e => setDesde(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>
                <Calendar size={11} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                Hasta
              </label>
              <input
                type="date" value={hasta}
                min={desde}
                onChange={e => setHasta(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Botones */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              onClick={onClose}
              style={{
                padding: '10px 20px', borderRadius: '30px', border: 'none',
                backgroundColor: '#f1f5f9', color: '#475569',
                fontWeight: '700', cursor: 'pointer', fontSize: '13px',
              }}
            >
              Cancelar
            </button>
            <button
              onClick={handleExport}
              disabled={loading}
              style={{
                padding: '10px 24px', borderRadius: '30px', border: 'none',
                backgroundColor: loading ? '#94a3b8' : '#CE1126',
                color: '#fff', fontWeight: '700',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px',
                boxShadow: loading ? 'none' : '0 4px 14px rgba(206,17,38,0.3)',
                transition: 'all 0.2s',
              }}
            >
              {loading ? (
                <>
                  <span style={{
                    width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.4)',
                    borderTop: '2px solid #fff', borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite', display: 'inline-block',
                  }} />
                  Generando...
                </>
              ) : (
                <><Download size={15} /> Descargar Agenda</>
              )}
            </button>
          </div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
};

export default ExportAgendaModal;
