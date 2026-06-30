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
    padding: '10px 14px', borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border)', fontSize: '13px',
    width: '100%', boxSizing: 'border-box', outline: 'none',
    backgroundColor: 'var(--surface)', color: 'var(--text-main)',
    transition: 'border-color var(--dur) var(--ease-standard), box-shadow var(--dur) var(--ease-standard)',
  };

  const labelStyle = {
    fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px',
    fontWeight: '700', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em',
  };

  return (
    <div
      className="fade-in"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 'var(--z-modal-backdrop)',
        backgroundColor: 'rgba(20, 18, 16, 0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        className="scale-in"
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--surface)', borderRadius: 'var(--radius-lg)',
          maxWidth: '480px', width: '100%',
          boxShadow: 'var(--shadow-modal)',
          border: '1px solid var(--border)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText size={18} color="var(--text-muted)" />
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: 'var(--text-main)' }}>
                Exportar Agenda
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>
                Genera un PDF listo para compartir
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'var(--surface-2)', border: '1px solid var(--border)', cursor: 'pointer',
              color: 'var(--text-secondary)', borderRadius: '50%', width: '32px', height: '32px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background-color var(--dur) var(--ease-standard)',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px' }}>

          {/* Vista previa del formato */}
          <div style={{
            backgroundColor: 'var(--surface-2)', borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)', padding: '16px', marginBottom: '20px',
            display: 'flex', alignItems: 'flex-start', gap: '14px',
          }}>
            <div style={{
              width: '42px', height: '54px', backgroundColor: 'var(--surface)',
              borderRadius: '6px', border: '1px solid var(--border)', flexShrink: 0,
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
              boxShadow: 'var(--shadow-sm)',
            }}>
              <div style={{ height: '10px', backgroundColor: 'var(--primary)' }} />
              {[1,2,3].map(i => (
                <div key={i} style={{ margin: '4px 6px 0', height: '4px', backgroundColor: i===1?'var(--text-main)':'var(--border)', borderRadius: '2px' }} />
              ))}
            </div>
            <div>
              <p style={{ margin: '0 0 4px', fontSize: '13px', fontWeight: '700', color: 'var(--text-main)' }}>
                Agenda PDF — Marca GEA
              </p>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
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
                padding: '10px 22px', borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-strong)',
                backgroundColor: 'var(--surface)', color: 'var(--text-secondary)',
                fontWeight: '600', cursor: 'pointer', fontSize: '13px',
                transition: 'background-color var(--dur) var(--ease-standard), transform var(--dur-fast) var(--ease-out)',
              }}
              onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
              onMouseUp={e => e.currentTarget.style.transform = ''}
            >
              Cancelar
            </button>
            <button
              onClick={handleExport}
              disabled={loading}
              style={{
                padding: '10px 24px', borderRadius: 'var(--radius-sm)', border: 'none',
                backgroundColor: loading ? 'var(--text-muted)' : 'var(--primary)',
                color: '#fff', fontWeight: '700',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px',
                transition: 'background-color var(--dur) var(--ease-standard), transform var(--dur-fast) var(--ease-out)',
                opacity: loading ? 0.7 : 1,
              }}
              onMouseDown={e => !loading && (e.currentTarget.style.transform = 'scale(0.98)')}
              onMouseUp={e => e.currentTarget.style.transform = ''}
            >
              {loading ? (
                <>
                  <span style={{
                    width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.4)',
                    borderTop: '2px solid #fff', borderRadius: '50%',
                    animation: 'spin 0.6s linear infinite', display: 'inline-block',
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
