/**
 * Modal de detalle de un reporte GEA generado.
 *
 * Muestra los metadatos del reporte (rango de fechas, formato, autor) y permite
 * editar su título y descripción en línea sin cerrar el modal.
 * Delega la descarga del archivo al callback `onExport` del padre, que ya tiene
 * la lógica de fetch como Blob.
 *
 * @param {boolean} isOpen
 * @param {Function} onClose
 * @param {Object} report - Reporte normalizado por {@link mapReporteDTO}.
 * @param {Function} onExport - Callback `(report) => void` para descargar el archivo.
 * @param {Function} [onSuccess] - Callback que refresca la lista tras guardar edición.
 */
import React, { useState, useEffect } from 'react';
import { X, FileText, Calendar, Clock, User, Download, Info, CheckCircle, Layers, Edit2, Save, RotateCcw } from 'lucide-react';
import Modal from './Modal';
import { updateReporte } from '../../services/reportes.service';

const ReportDetailModal = ({ isOpen, onClose, report, onExport, onSuccess }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ titulo: '', descripcion: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (report) {
      setFormData({
        titulo: report.titulo || '',
        descripcion: report.descripcion || ''
      });
      setIsEditing(false);
    }
  }, [report]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateReporte(report.id, formData);
      setIsEditing(false);
      if (onSuccess) onSuccess();
      // Keep modal open but update local values if needed, 
      // though typically fetchData refreshes the parent.
    } catch (error) {
      alert('Error al actualizar el reporte: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Format date helper
  const formatDate = (dateStr) => {
    if (!dateStr || dateStr === '-') return 'N/A';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('es-CO', { 
        year: 'numeric', month: 'long', day: 'numeric', 
        hour: '2-digit', minute: '2-digit' 
      });
    } catch {
      return dateStr;
    }
  };

  if (!report || !isOpen) return null;

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Detalles del Reporte"
      style={{ maxWidth: '600px', width: '90%' }}
    >
      <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* HEADER INFO */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '20px' }}>
          <div style={{ 
            width: '60px', height: '60px', backgroundColor: 'rgba(206,17,38,0.05)', 
            color: '#ce1126', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' 
          }}>
            <FileText size={32} />
          </div>
          <div style={{ flex: 1 }}>
            {isEditing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input
                  name="titulo"
                  value={formData.titulo}
                  onChange={handleInputChange}
                  style={{ 
                    padding: '8px 12px', borderRadius: '8px', border: '2px solid #ce1126', 
                    fontSize: '16px', fontWeight: 'bold', width: '100%' 
                  }}
                  placeholder="Título del reporte"
                />
                <textarea
                  name="descripcion"
                  value={formData.descripcion}
                  onChange={handleInputChange}
                  style={{ 
                    padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', 
                    fontSize: '14px', width: '100%', minHeight: '60px' 
                  }}
                  placeholder="Descripción del reporte"
                />
              </div>
            ) : (
              <>
                <h2 style={{ margin: '0 0 4px', fontSize: '20px', color: 'var(--text-main)' }}>{report.titulo}</h2>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px' }}>{report.descripcion || 'Sin descripción adicional'}</p>
              </>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
            <div style={{ 
              padding: '6px 14px', borderRadius: '20px', backgroundColor: '#dcfce7', color: '#16a34a', 
              fontSize: '11px', fontWeight: '800', letterSpacing: '0.5px' 
            }}>
              GENERADO
            </div>
            {!isEditing && (
              <button 
                onClick={() => setIsEditing(true)}
                style={{ 
                  background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', 
                  display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 'bold' 
                }}
              >
                <Edit2 size={12} /> Editar Info
              </button>
            )}
          </div>
        </div>

        {/* METADATA GRID */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <Calendar size={12} /> Rango de Consulta
            </span>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600' }}>
              {report.desde} <span style={{ color: 'var(--text-muted)', fontWeight: 'normal' }}>hasta</span> {report.hasta}
            </p>
          </div>

          <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <Clock size={12} /> Generado el
            </span>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600' }}>
              {formatDate(report.fecha)}
            </p>
          </div>

          <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <Download size={12} /> Formato
            </span>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600' }}>
              {report.formato} Document
            </p>
          </div>

          <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <User size={12} /> Generado por
            </span>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {report.usuarioCorreo}
            </p>
          </div>

          <div style={{ backgroundColor: '#f1f5f9', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', gridColumn: 'span 2' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <Layers size={12} /> Alcance del Reporte
            </span>
            <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-main)', fontWeight: '700' }}>
              {report.alcance === 'GLOBAL' ? 'General (Anuncios y Eventos)' : report.alcance === 'EVENTOS' ? 'Solo Eventos' : 'Solo Anuncios'}
            </p>
          </div>
        </div>

        {/* BOTTOM TIP */}
        <div style={{ 
          padding: '12px 16px', borderRadius: '12px', backgroundColor: '#eff6ff', 
          border: '1px solid #dbeafe', display: 'flex', gap: '12px', alignItems: 'center' 
        }}>
          <Info size={18} color="#2563eb" />
          <p style={{ margin: 0, fontSize: '12px', color: '#1e40af', lineHeight: '1.5' }}>
            Este reporte contiene el resumen de solicitudes registradas en el periodo seleccionado. El archivo se conserva de forma permanente para auditoría.
          </p>
        </div>

        {/* ACTIONS */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
          {isEditing ? (
            <>
              <button 
                onClick={() => setIsEditing(false)} 
                className="btn-secondary"
                style={{ padding: '10px 24px', borderRadius: '30px', border: 'none', backgroundColor: '#f1f5f9', color: 'var(--text-secondary)', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <RotateCcw size={16} /> Cancelar
              </button>
              <button 
                onClick={handleSave} 
                disabled={loading}
                style={{ padding: '10px 24px', borderRadius: '30px', border: 'none', backgroundColor: '#ce1126', color: 'white', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(206,17,38,0.2)' }}
              >
                <Save size={18} /> {loading ? 'Guardando...' : 'Guardar Información'}
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={onClose} 
                className="btn-secondary"
                style={{ padding: '10px 24px', borderRadius: '30px', border: 'none', backgroundColor: '#f1f5f9', color: 'var(--text-secondary)', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Cerrar
              </button>
              <button 
                onClick={() => onExport(report)} 
                style={{ padding: '10px 24px', borderRadius: '30px', border: 'none', backgroundColor: '#ce1126', color: 'white', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(206,17,38,0.2)' }}
              >
                <Download size={18} /> Descargar {report.formato}
              </button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default ReportDetailModal;
