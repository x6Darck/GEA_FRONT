import React, { useState, useEffect, useContext } from 'react';
import Modal from './Modal';
import ParticipantModal from './ParticipantModal';
import { createEvento } from '../../services/eventos.service';
import { getTiposEvento } from '../../services/tipoEvento.service';
import { getOficinas } from '../../services/oficinas.service';
import lugarFisicoService from '../../services/lugarFisico.service';
import { resolveImageUrl } from '../../utils/url';
import { Plus, Edit2, Trash2, X, Info, MapPin, Users, Calendar, AlertCircle, Clock, ShieldCheck, Building, User } from 'lucide-react';
import AmPmTimePicker from './AmPmTimePicker';
import { AuthContext } from '../../context/AuthContext';
import notification from '../../utils/notification';

const EventModal = ({ isOpen, onClose, onSuccess, initialDate, allEvents }) => {
  const { user } = useContext(AuthContext);
  const [formLoading, setFormLoading] = useState(false);
  
  // Participant Sub-Modal State
  const [partModalOpen, setPartModalOpen] = useState(false);
  const [partMode, setPartMode] = useState('invitado');
  const [editingIndex, setEditingIndex] = useState(null);
  const [partInitialData, setPartInitialData] = useState(null);

  // SIAPAC Confirmation State
  const [siapacDialogOpen, setSiapacDialogOpen] = useState(false);
  const [pendingLugar, setPendingLugar] = useState(null);

  // Form State
  const [tiposEvento, setTiposEvento] = useState([]);
  const [oficinas, setOficinas] = useState([]);
  const [lugaresFisicos, setLugaresFisicos] = useState([]);
  const [lugaresSeleccionados, setLugaresSeleccionados] = useState([]);
  const [formData, setFormData] = useState({
    nombreEvento: '',
    descripcionEvento: '',
    fechaEvento: '',
    // lugar: '', // Deprecated in favor of lugaresSeleccionados
    oficinaResponsable: '',
    idOficina: '',
    horaInicio: '08:00',
    horaFin: '10:00',
    tipoEvento: '',
    idTipoEvento: '',
    hasInvitados: 'No',
    hasPatrocinadores: 'No', // Renombrado de hasColaboradores
    requiereTransmision: false,
    requiereCubrimiento: false,
    requierePiezaGrafica: false,
    requiereServiciosGenerales: false,
    frecuenciaRecurrencia: 'NINGUNA',
    fechaFinRecurrencia: '',
    observaciones: '',
    esImportante: false,
    tipoIngreso: 'LIBRE',
    ubicacionExterna: '',
  });

  const [organizadoresList, setOrganizadoresList] = useState([]);
  const [invitadosList, setInvitadosList] = useState([]);
  const [patrocinadoresList, setPatrocinadoresList] = useState([]); // Renombrado

  const rolName = typeof user?.rol === 'string' ? user.rol : (user?.rol?.nombre || '');
  const isAdmin = ['SUPER_ADMIN', 'ADMIN', 'SUPERADMIN', 'COMUNICACIONES'].includes(rolName.toUpperCase());

  useEffect(() => {
    if (isOpen) {
      resetForm();
      if (initialDate) {
        setFormData(prev => ({ ...prev, fechaEvento: initialDate }));
      }
      cargarDatosMaestros();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDate, isOpen, user]);

  const cargarDatosMaestros = async () => {
    try {
      const [tipos, ofis, lugs] = await Promise.allSettled([
        getTiposEvento(),
        isAdmin ? getOficinas() : Promise.resolve([]),
        lugarFisicoService.getLugaresFisicos()
      ]);

      if (tipos.status === 'fulfilled') {
        const data = tipos.value;
        setTiposEvento(Array.isArray(data) ? data : []);
        if (data.length > 0 && !formData.tipoEvento) {
          setFormData(prev => ({ 
            ...prev, 
            tipoEvento: data[0].nombre,
            idTipoEvento: data[0].id || data[0].idTipoEvento
          }));
        }
      }

      if (ofis.status === 'fulfilled' && isAdmin) {
        const data = ofis.value;
        const ofisList = Array.isArray(data) ? data : [];
        setOficinas(ofisList);
        
        // Si el usuario es admin y no tiene oficina o queremos que elija una
        if (ofisList.length > 0 && !user?.oficinaNombre) {
           const primera = ofisList[0];
           setFormData(prev => ({ 
             ...prev, 
             oficinaResponsable: primera.nombre,
             idOficina: primera.id || primera.idOficina
           }));
        }
      }

      if (lugs.status === 'fulfilled') {
        setLugaresFisicos(Array.isArray(lugs.value) ? lugs.value : []);
      }
    } catch (err) {
      console.error("Error cargando datos maestros:", err);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAddParticipantClick = (mode) => {
    setPartMode(mode);
    setEditingIndex(null);
    setPartInitialData(null);
    setPartModalOpen(true);
  };

  const handleEditParticipant = (mode, index) => {
    setPartMode(mode);
    setEditingIndex(index);
    if (mode === 'organizador') {
      setPartInitialData(organizadoresList[index]);
    } else if (mode === 'invitado') {
      setPartInitialData(invitadosList[index]);
    } else {
      setPartInitialData(patrocinadoresList[index]);
    }
    setPartModalOpen(true);
  };

  const handleDeleteParticipant = (mode, index) => {
    if (mode === 'organizador') {
      setOrganizadoresList(organizadoresList.filter((_, i) => i !== index));
    } else if (mode === 'invitado') {
      setInvitadosList(invitadosList.filter((_, i) => i !== index));
    } else {
      setPatrocinadoresList(patrocinadoresList.filter((_, i) => i !== index));
    }
  };

  const onSaveParticipant = (participant) => {
    if (partMode === 'organizador') {
      if (editingIndex !== null) {
        const updated = [...organizadoresList];
        updated[editingIndex] = participant;
        setOrganizadoresList(updated);
      } else {
        setOrganizadoresList([...organizadoresList, participant]);
      }
    } else if (partMode === 'invitado') {
      if (editingIndex !== null) {
        const updated = [...invitadosList];
        updated[editingIndex] = participant;
        setInvitadosList(updated);
      } else {
        setInvitadosList([...invitadosList, participant]);
      }
    } else {
      if (editingIndex !== null) {
        const updated = [...patrocinadoresList];
        updated[editingIndex] = participant;
        setPatrocinadoresList(updated);
      } else {
        setPatrocinadoresList([...patrocinadoresList, participant]);
      }
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();

    // Helper para comparar horas numéricamente (evita comparaciones lexicográficas de strings)
    const toMinutes = (hhmm) => {
      if (!hhmm || typeof hhmm !== 'string' || !hhmm.includes(':')) return null;
      const [h, m] = hhmm.split(':').map(Number);
      return h * 60 + m;
    };

    // Validaciones de cliente antes de enviar
    if (!formData.nombreEvento || !formData.nombreEvento.trim()) {
      notification.error('El nombre del evento es obligatorio.');
      return;
    }
    if (!formData.fechaEvento) {
      notification.error('Debes seleccionar la fecha del evento.');
      return;
    }
    const hoyStr = new Date().toISOString().split('T')[0];
    if (formData.fechaEvento < hoyStr) {
      notification.error('La fecha del evento no puede ser en el pasado.');
      return;
    }
    {
      const ini = toMinutes(formData.horaInicio);
      const fin = toMinutes(formData.horaFin);
      if (ini == null || fin == null || fin <= ini) {
        notification.error('La hora de fin debe ser posterior a la hora de inicio.');
        return;
      }
    }
    if (formData.frecuenciaRecurrencia && formData.frecuenciaRecurrencia !== 'NINGUNA') {
      if (!formData.fechaFinRecurrencia) {
        notification.error('Debes indicar la fecha fin de la recurrencia.');
        return;
      }
      if (formData.fechaFinRecurrencia < formData.fechaEvento) {
        notification.error('La fecha fin de recurrencia no puede ser anterior a la fecha del evento.');
        return;
      }
    }

    // VALIDACIÓN DE CONFLICTOS (Lugar + Hora)
    if (allEvents && lugaresSeleccionados.length > 0 && formData.fechaEvento) {
      const conflict = allEvents.find(ev => {
         const evDate = (ev.fechaEvento || ev.fecha || '').split('T')[0];
         if (evDate !== formData.fechaEvento) return false;
         
         // Verificar si alguno de los lugares seleccionados coincide con los del evento existente
         const evLugaresIds = ev.idsLugaresFisicos || [];
         const hasCommonLocation = lugaresSeleccionados.some(l => evLugaresIds.includes(l.id));
         
         if (!hasCommonLocation) return false;
         
         const s1 = toMinutes(formData.horaInicio);
         const e1 = toMinutes(formData.horaFin);
         const s2 = toMinutes(ev.horaInicio);
         const e2 = toMinutes(ev.horaFin);
         if (s1 == null || e1 == null || s2 == null || e2 == null) return false;
         return (s1 < e2 && e1 > s2);
      });

      if (conflict) {
         const confirmacion = window.confirm(
           `ADVERTENCIA DE CONFLICTO:\n\n` +
           `Uno de los lugares seleccionados ya está ocupado por el evento:\n` +
           `"${conflict.nombreEvento || conflict.nombre}"\n` +
           `Horario: ${conflict.horaInicio} - ${conflict.horaFin}\n\n` +
           `¿Deseas registrar tu evento de todas formas?`
         );
         if (!confirmacion) return;
      }
    }

    if (lugaresSeleccionados.some(l => l.esExterno) && !formData.ubicacionExterna?.trim()) {
      notification.error('Debes indicar el lugar donde se realizará el evento externo.');
      return;
    }

    if (organizadoresList.length === 0) {
      notification.error("Debes asignar al menos un organizador para el evento.");
      return;
    }
    setFormLoading(true);
    try {
      // Limpiar el payload para enviar tipos de datos correctos
      const payload = {
        nombreEvento: formData.nombreEvento,
        descripcionEvento: formData.descripcionEvento,
        fechaEvento: formData.fechaEvento,
        horaInicio: formData.horaInicio,
        horaFin: formData.horaFin,
        idsLugaresFisicos: lugaresSeleccionados.map(l => l.id),
        linkConexion: formData.linkConexion,
        ubicacionExterna: formData.ubicacionExterna || null,
        responsableEvento: organizadoresList[0]?.nombre || '',
        tipoEvento: formData.tipoEvento,
        tipoIngreso: formData.tipoIngreso || 'LIBRE',
        requierePiezaGrafica: !!formData.requierePiezaGrafica,
        requiereTransmision: !!formData.requiereTransmision,
        requiereCubrimiento: !!formData.requiereCubrimiento,
        requiereServiciosGenerales: !!formData.requiereServiciosGenerales,
        observaciones: formData.observaciones,
        esImportante: !!formData.esImportante,
        frecuenciaRecurrencia: formData.frecuenciaRecurrencia || 'NINGUNA',
        fechaFinRecurrencia: formData.fechaFinRecurrencia || null,
        idOficina: formData.idOficina ? parseInt(formData.idOficina) : null,
        participantes: [
          ...organizadoresList.map(org => ({ 
             nombre: org.nombre, cargo: org.cargo, descripcion: org.descripcion, 
             fotoUrl: org.fotoUrl, telefono: org.telefono, correo: org.correo, tipo: 'ORGANIZADOR' 
          })),
          ...invitadosList.map(inv => ({ 
             nombre: inv.nombre, cargo: inv.cargo, descripcion: inv.descripcion, 
             fotoUrl: inv.fotoUrl, telefono: inv.telefono, correo: inv.correo, tipo: 'INVITADO' 
          })),
          ...patrocinadoresList.map(col => ({ 
             nombre: col.nombre, cargo: col.cargo, descripcion: col.descripcion, 
             fotoUrl: col.fotoUrl, telefono: col.telefono, correo: col.correo, tipo: 'PATROCINADOR_ALIADO' 
          }))
        ]
      };

      const createdEvent = await createEvento(payload);
      
      if (createdEvent) {
        const id = createdEvent.id || createdEvent.idSolicitud;
        const participantes = payload.participantes;
        
        const cacheData = { participantes, cacheTime: Date.now() };
        
        if (id) {
          localStorage.setItem(`event_hydra_${id}`, JSON.stringify(cacheData));
        }
        
        const fuzzyKey = `event_hydra_f_${(formData.nombreEvento || '').substring(0,20)}_${formData.fechaEvento}`;
        localStorage.setItem(fuzzyKey, JSON.stringify(cacheData));
      }
      
      notification.success('Solicitud de evento enviada correctamente');
      resetForm();
      if (onSuccess) onSuccess();
      onClose();
    } catch(err) {
      console.error("ERROR DETALLADO:", err);
      const errorData = err.response?.data;
      
      if (errorData?.data && typeof errorData.data === 'object') {
        const fieldErrors = Object.entries(errorData.data)
          .map(([field, msg]) => `• ${field}: ${msg}`)
          .join('\n');
        notification.error(`Error de validación:\n${fieldErrors}`);
      } else {
        notification.error('Error al crear evento: ' + (errorData?.message || err.message));
      }
    } finally {
      setFormLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      nombreEvento: '', descripcionEvento: '', fechaEvento: '',
      lugar: '', oficinaResponsable: user?.oficinaNombre || '', horaInicio: '08:00', horaFin: '10:00',
      tipoEvento: tiposEvento[0]?.nombre || '', hasInvitados: 'No', hasPatrocinadores: 'No',
      requiereTransmision: false, requiereCubrimiento: false, requierePiezaGrafica: false, requiereServiciosGenerales: false,
      frecuenciaRecurrencia: 'NINGUNA', fechaFinRecurrencia: '',
      observaciones: '', esImportante: false, tipoIngreso: 'LIBRE',
      ubicacionExterna: '',
    });
    setOrganizadoresList([]);
    setInvitadosList([]);
    setPatrocinadoresList([]);
    setLugaresSeleccionados([]);
  };

  const getImageUrl = (url) => resolveImageUrl(url);

  // PREMIUM STYLES
  const glassCard = {
    background: '#fff',
    border: '1px solid #f1f5f9',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)',
    marginBottom: '20px'
  };

  const inputStyle = { 
    padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '14px', 
    width: '100%', backgroundColor: '#fff', color: 'var(--text-main)', transition: 'border-color 0.2s ease, box-shadow 0.2s ease', outline: 'none',
    boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
  };

  const labelStyle = { 
    fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '800', 
    display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', letterSpacing: '0.5px'
  };

  const sectionHeader = {
    margin: '0 0 20px 0', fontSize: '16px', fontWeight: '800', color: 'var(--text-main)',
    display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px'
  };

  const renderParticipantsSleek = (list, mode) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '12px', alignItems: 'center' }}>
      {(list || []).map((item, index) => (
        <div key={item.id || index} style={{ 
          display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 14px', 
          backgroundColor: '#fff', borderRadius: '40px', border: '1px solid #e2e8f0', 
          boxShadow: '0 4px 10px rgba(0,0,0,0.03)', transition: 'transform 0.2s ease'
        }} className="participant-card">
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: mode === 'organizador' ? '#ce1126' : '#3b82f6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
             {item.fotoUrl ? <img src={getImageUrl(item.fotoUrl)} alt="perfil" style={{width: '100%', height:'100%', objectFit: 'cover'}} /> : <User size={16} />}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-main)', lineHeight: '1.1' }}>{item.nombre}</span>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '600' }}>{item.cargo || (mode === 'organizador' ? 'Organizador' : 'Invitado')}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '8px', borderLeft: '1px solid #f1f5f9', paddingLeft: '8px' }}>
             <button type="button" onClick={() => handleEditParticipant(mode, index)} style={{ padding: '6px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} onMouseEnter={e => e.currentTarget.style.color = '#3b82f6'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}><Edit2 size={14} /></button>
             <button type="button" onClick={() => handleDeleteParticipant(mode, index)} style={{ padding: '6px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} onMouseEnter={e => e.currentTarget.style.color = '#ef4444'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}><Trash2 size={14} /></button>
          </div>
        </div>
      ))}
      <button 
        type="button" 
        onClick={() => handleAddParticipantClick(mode)}
        style={{ 
          display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', 
          backgroundColor: mode === 'organizador' ? '#fff5f5' : '#f0f9ff', border: `1px dashed ${mode === 'organizador' ? '#fecaca' : '#bae6fd'}`, borderRadius: '40px', 
          cursor: 'pointer', color: mode === 'organizador' ? '#dc2626' : '#0284c7', fontWeight: '800', fontSize: '12px', transition: 'background-color var(--dur) var(--ease-standard), color var(--dur) var(--ease-standard), transform var(--dur-fast) var(--ease-out)'
        }} onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)'; }}>
         <Plus size={16} /> Añadir {mode === 'organizador' ? 'Organizador' : mode === 'invitado' ? 'Invitado' : 'Colaborador'}
      </button>
    </div>
  );

  return (
    <>
      {/* Diálogo de confirmación SIAPAC */}
      {siapacDialogOpen && (
        <div className="fade-in" style={{
          position: 'fixed', inset: 0, zIndex: 'var(--z-toast)',
          backgroundColor: 'rgba(20, 18, 16, 0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#fff', borderRadius: '20px', padding: '36px 32px',
            maxWidth: '460px', width: '100%',
            boxShadow: '0 25px 60px rgba(0,0,0,0.18)',
            border: '1px solid #f1f5f9',
            display: 'flex', flexDirection: 'column', gap: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '14px',
                backgroundColor: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0
              }}>
                <Building size={24} color="#ea580c" />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '11px', fontWeight: '800', color: '#ea580c', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Confirmación requerida — SIAPAC
                </p>
                <p style={{ margin: '4px 0 0', fontSize: '16px', fontWeight: '800', color: 'var(--text-main)' }}>
                  Préstamo de espacio
                </p>
              </div>
            </div>

            <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.65' }}>
              Ha seleccionado el espacio <strong style={{ color: 'var(--text-main)' }}>"{pendingLugar?.nombre}"</strong>.
            </p>
            <div style={{
              backgroundColor: '#fff7ed', border: '1px solid #fed7aa',
              borderRadius: '12px', padding: '16px 18px',
              display: 'flex', alignItems: 'flex-start', gap: '12px'
            }}>
              <AlertCircle size={20} color="#ea580c" style={{ flexShrink: 0, marginTop: '1px' }} />
              <p style={{ margin: 0, fontSize: '14px', color: '#9a3412', fontWeight: '600', lineHeight: '1.5' }}>
                ¿Usted ya realizó el préstamo de este espacio en el sistema <strong>SIAPAC</strong>?
              </p>
            </div>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              Recuerde que el préstamo en SIAPAC debe realizarse <strong>antes</strong> de registrar el lugar en GEA.
              Si aún no lo ha hecho, cancele y complete el proceso en el sistema de préstamo de aulas y espacios.
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '4px' }}>
              <button
                type="button"
                onClick={() => { setSiapacDialogOpen(false); setPendingLugar(null); }}
                style={{
                  padding: '11px 24px', borderRadius: '30px', border: '1px solid #e2e8f0',
                  backgroundColor: '#f8fafc', color: 'var(--text-secondary)', fontWeight: '700',
                  cursor: 'pointer', fontSize: '14px'
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (pendingLugar) {
                    setLugaresSeleccionados(prev => [...prev, pendingLugar]);
                  }
                  setSiapacDialogOpen(false);
                  setPendingLugar(null);
                }}
                style={{
                  padding: '11px 28px', borderRadius: '30px', border: 'none',
                  backgroundColor: 'var(--text-main)', color: '#fff', fontWeight: '800',
                  cursor: 'pointer', fontSize: '14px',
                  boxShadow: '0 4px 12px rgba(30,41,59,0.25)'
                }}
              >
                Sí, ya realicé el préstamo en SIAPAC
              </button>
            </div>
          </div>
        </div>
      )}

      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Crear Nueva Solicitud de Evento" 
        style={{ maxWidth: '900px', width: '95%' }}
        bodyStyle={{ padding: '32px', backgroundColor: '#fdfdfe' }}
      >
        <div style={{ paddingRight: '12px', WebkitOverflowScrolling: 'touch', transform: 'translateZ(0)' }}>
          <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
            
            {/* SECTION 1: INFO GENERAL */}
            <div style={glassCard}>
              <h3 style={sectionHeader}>
                <div style={{ padding: '8px', borderRadius: '10px', background: 'var(--surface-2)', display: 'flex' }}><Info size={20} color="var(--text-secondary)" /></div>
                Información del Evento
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label style={labelStyle}>Título del Evento <span style={{color: '#ce1126'}}>*</span></label>
                  <input type="text" name="nombreEvento" value={formData.nombreEvento} onChange={handleInputChange} style={inputStyle} required placeholder="Ej: Congreso Internacional de Ingeniería" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label style={labelStyle}>Descripción Detallada <span style={{color: '#ce1126'}}>*</span></label>
                  <textarea name="descripcionEvento" value={formData.descripcionEvento} onChange={handleInputChange} style={{ ...inputStyle, height: '100px', resize: 'vertical' }} required placeholder="Describe el propósito y alcance del evento..." />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '20px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={labelStyle}>Oficina Responsable <span style={{color: '#ce1126'}}>*</span></label>
                    {isAdmin ? (
                      <select 
                        name="idOficina" 
                        value={formData.idOficina} 
                        onChange={(e) => {
                          const selected = oficinas.find(o => String(o.id || o.idOficina) === e.target.value);
                          setFormData({ 
                            ...formData, 
                            idOficina: e.target.value,
                            oficinaResponsable: selected ? selected.nombre : '' 
                          });
                        }} 
                        style={inputStyle} 
                        required
                      >
                        <option value="">Seleccionar Oficina</option>
                        {oficinas.map(o => (
                          <option key={o.id || o.idOficina} value={o.id || o.idOficina}>{o.nombre}</option>
                        ))}
                      </select>
                    ) : (
                      <div style={{ ...inputStyle, backgroundColor: '#f8fafc', border: '1px solid #f1f5f9', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <ShieldCheck size={16} /> {formData.oficinaResponsable || user?.oficinaNombre || 'Cargando oficina...'}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={labelStyle}>Categoría <span style={{color: '#ce1126'}}>*</span></label>
                    <select 
                      name="idTipoEvento" 
                      value={formData.idTipoEvento} 
                      onChange={(e) => {
                        const selected = tiposEvento.find(t => String(t.id || t.idTipoEvento) === e.target.value);
                        setFormData({ 
                          ...formData, 
                          idTipoEvento: e.target.value,
                          tipoEvento: selected ? selected.nombre : '' 
                        });
                      }} 
                      style={inputStyle} 
                      required
                    >
                      <option value="">Seleccionar Categoría</option>
                      {(tiposEvento || []).map(tipo => (
                        <option key={tipo.id || tipo.idTipoEvento} value={tipo.id || tipo.idTipoEvento}>{tipo.nombre}</option>
                      ))}
                    </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={labelStyle}>Tipo de ingreso <span style={{color: '#ce1126'}}>*</span></label>
                    <select
                      name="tipoIngreso"
                      value={formData.tipoIngreso}
                      onChange={(e) => setFormData({ ...formData, tipoIngreso: e.target.value })}
                      style={inputStyle}
                      required
                    >
                      <option value="LIBRE">Libre</option>
                      <option value="PAGO">Pago</option>
                      <option value="PRIVADO">Evento privado</option>
                    </select>
                </div>
              </div>
            </div>
          </div>

            {/* SECTION 2: LOGÍSTICA */}
            <div style={glassCard}>
              <h3 style={sectionHeader}>
                <div style={{ padding: '8px', borderRadius: '10px', background: 'var(--surface-2)', display: 'flex' }}><Calendar size={20} color="var(--text-secondary)" /></div>
                Ubicación y Tiempo
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={labelStyle}><MapPin size={14} style={{ marginRight: '2px' }}/> Lugares Físicos (Presencial)</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <select 
                        style={inputStyle}
                        onChange={(e) => {
                          const id = parseInt(e.target.value);
                          if (!id) return;
                          const selected = lugaresFisicos.find(l => l.id === id);
                          if (selected && !lugaresSeleccionados.find(l => l.id === id)) {
                            if (selected.esExterno) {
                              setLugaresSeleccionados(prev => [...prev, selected]);
                            } else {
                              setPendingLugar(selected);
                              setSiapacDialogOpen(true);
                            }
                          }
                          e.target.value = "";
                        }}
                      >
                        <option value="">Añadir un lugar...</option>
                        {lugaresFisicos.map(l => (
                          <option key={l.id} value={l.id} disabled={lugaresSeleccionados.some(s => s.id === l.id)}>
                            {l.nombre}
                          </option>
                        ))}
                      </select>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', minHeight: '32px' }}>
                        {lugaresSeleccionados.length === 0 && (
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>Ningún lugar seleccionado</span>
                        )}
                        {lugaresSeleccionados.map(lugar => (
                          <div 
                            key={lugar.id} 
                            style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '6px', 
                              backgroundColor: '#f1f5f9', 
                              padding: '4px 10px', 
                              borderRadius: '20px', 
                              fontSize: '12px', 
                              fontWeight: '600',
                              border: '1px solid #e2e8f0'
                            }}
                          >
                            <MapPin size={12} />
                            {lugar.nombre}
                            <button 
                              type="button" 
                              onClick={() => setLugaresSeleccionados(lugaresSeleccionados.filter(s => s.id !== lugar.id))}
                              style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '2px', display: 'flex' }}
                            >
                              <X size={12} color="#ce1126" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  {lugaresSeleccionados.some(l => l.esExterno) && (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <label style={labelStyle}><MapPin size={14} style={{ marginRight: '2px' }}/> ¿Dónde será el evento? <span style={{color: '#ce1126'}}>*</span></label>
                      <input
                        type="text"
                        name="ubicacionExterna"
                        value={formData.ubicacionExterna}
                        onChange={handleInputChange}
                        placeholder="Ej: Auditorio Central, Hotel Ramada, Parque Municipal…"
                        style={inputStyle}
                        maxLength={300}
                      />
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={labelStyle}>Fecha del Evento <span style={{color: '#ce1126'}}>*</span></label>
                    <input type="date" name="fechaEvento" value={formData.fechaEvento} onChange={handleInputChange} style={{...inputStyle, width: 'fit-content'}} required />
                  </div>
                </div>
                <div style={{ backgroundColor: '#f8fafc', padding: '24px', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                    <div style={{ marginBottom: '20px' }}>
                       <label style={labelStyle}><Clock size={14} /> Inicio <span style={{color: '#ce1126'}}>*</span></label>
                       <AmPmTimePicker value={formData.horaInicio} onChange={(e) => setFormData({...formData, horaInicio: e.target.value})} />
                    </div>
                    <div>
                       <label style={labelStyle}><Clock size={14} /> Finalización <span style={{color: '#ce1126'}}>*</span></label>
                       <AmPmTimePicker value={formData.horaFin} onChange={(e) => setFormData({...formData, horaFin: e.target.value})} />
                    </div>
                </div>
              </div>

              {/* RECURRENCIA */}
              <div style={{ backgroundColor: '#f0f9ff', padding: '20px', borderRadius: '12px', border: '1px solid #e0f2fe' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                  <Calendar size={18} color="#0369a1" />
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: '#0369a1', textTransform: 'uppercase' }}>Repetir este evento (Recurrencia)</h4>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ ...labelStyle, color: '#0369a1' }}>Frecuencia</label>
                    <select 
                      name="frecuenciaRecurrencia" 
                      value={formData.frecuenciaRecurrencia} 
                      onChange={handleInputChange} 
                      style={{ ...inputStyle, borderColor: '#bae6fd' }}
                    >
                      <option value="NINGUNA">No repetir</option>
                      <option value="DIARIA">Diariamente</option>
                      <option value="SEMANAL">Semanalmente</option>
                      <option value="MENSUAL">Mensualmente</option>
                    </select>
                  </div>
                  {formData.frecuenciaRecurrencia !== 'NINGUNA' && (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <label style={{ ...labelStyle, color: '#0369a1' }}>Repetir hasta <span style={{color: '#ce1126'}}>*</span></label>
                      <input 
                        type="date" 
                        name="fechaFinRecurrencia" 
                        value={formData.fechaFinRecurrencia} 
                        onChange={handleInputChange} 
                        style={{ ...inputStyle, borderColor: '#bae6fd' }} 
                        required={formData.frecuenciaRecurrencia !== 'NINGUNA'}
                        min={formData.fechaEvento}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* SECTION 3: PERFILES */}
            <div style={{ ...glassCard, border: '1px solid var(--border)', background: 'var(--surface)' }}>
              <h3 style={{ ...sectionHeader, color: 'var(--text-main)', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ padding: '8px', borderRadius: '10px', background: '#f8fafc', display: 'flex' }}><Users size={20} color="var(--text-secondary)" /></div>
                Equipo Organizador
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '-12px', marginBottom: '16px', fontWeight: '500' }}>
                Añade a las personas encargadas de la gestión y ejecución del evento.
              </p>
              {renderParticipantsSleek(organizadoresList, 'organizador')}
            </div>

            <div style={glassCard}>
              <h3 style={sectionHeader}>
                <div style={{ padding: '8px', borderRadius: '10px', background: 'var(--surface-2)', display: 'flex' }}><Users size={20} color="var(--text-secondary)" /></div>
                Otros Participantes
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div>
                  <label style={labelStyle}>Invitados Especiales</label>
                  <select name="hasInvitados" value={formData.hasInvitados} onChange={handleInputChange} style={{ ...inputStyle, width: '160px', marginBottom: '10px' }}>
                    <option value="No">No requiere</option>
                    <option value="Sí">Si, añadir perfiles</option>
                  </select>
                  {formData.hasInvitados === 'Sí' && renderParticipantsSleek(invitadosList, 'invitado')}
                </div>
                <div>
                  <label style={labelStyle}>Patrocinadores / Aliados</label>
                  <select name="hasPatrocinadores" value={formData.hasPatrocinadores} onChange={handleInputChange} style={{ ...inputStyle, width: '160px', marginBottom: '10px' }}>
                    <option value="No">No requiere</option>
                    <option value="Sí">Si, añadir perfiles</option>
                  </select>
                  {formData.hasPatrocinadores === 'Sí' && renderParticipantsSleek(patrocinadoresList, 'patrocinador')}
                </div>
              </div>
            </div>

            {/* SECTION 4: REQUERIMIENTOS TÉCNICOS */}
            <div style={glassCard}>
              <h3 style={sectionHeader}>
                <div style={{ padding: '8px', borderRadius: '10px', background: 'var(--surface-2)', display: 'flex' }}><ShieldCheck size={20} color="var(--text-secondary)" /></div>
                Requerimientos Técnicos y Adicionales
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '24px' }}>
                <label style={{ padding: '9px 14px', borderRadius: '10px', background: formData.requiereTransmision ? 'var(--primary-soft)' : 'var(--surface-2)', border: `1px solid ${formData.requiereTransmision ? 'var(--primary)' : 'var(--border)'}`, fontSize: '12px', fontWeight: '600', color: formData.requiereTransmision ? 'var(--primary)' : 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'background-color var(--dur) var(--ease-standard), border-color var(--dur) var(--ease-standard), color var(--dur) var(--ease-standard)' }}>
                  <input type="checkbox" style={{ accentColor: 'var(--primary)' }} checked={formData.requiereTransmision} onChange={e => setFormData({...formData, requiereTransmision: e.target.checked})} />
                  Transmisión
                </label>
                <label style={{ padding: '9px 14px', borderRadius: '10px', background: formData.requiereCubrimiento ? 'var(--primary-soft)' : 'var(--surface-2)', border: `1px solid ${formData.requiereCubrimiento ? 'var(--primary)' : 'var(--border)'}`, fontSize: '12px', fontWeight: '600', color: formData.requiereCubrimiento ? 'var(--primary)' : 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'background-color var(--dur) var(--ease-standard), border-color var(--dur) var(--ease-standard), color var(--dur) var(--ease-standard)' }}>
                  <input type="checkbox" style={{ accentColor: 'var(--primary)' }} checked={formData.requiereCubrimiento} onChange={e => setFormData({...formData, requiereCubrimiento: e.target.checked})} />
                  Cubrimiento
                </label>
                <label style={{ padding: '9px 14px', borderRadius: '10px', background: formData.requierePiezaGrafica ? 'var(--primary-soft)' : 'var(--surface-2)', border: `1px solid ${formData.requierePiezaGrafica ? 'var(--primary)' : 'var(--border)'}`, fontSize: '12px', fontWeight: '600', color: formData.requierePiezaGrafica ? 'var(--primary)' : 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'background-color var(--dur) var(--ease-standard), border-color var(--dur) var(--ease-standard), color var(--dur) var(--ease-standard)' }}>
                  <input type="checkbox" style={{ accentColor: 'var(--primary)' }} checked={formData.requierePiezaGrafica} onChange={e => setFormData({...formData, requierePiezaGrafica: e.target.checked})} />
                  Pieza gráfica
                </label>
                <label style={{ padding: '9px 14px', borderRadius: '10px', background: formData.requiereServiciosGenerales ? 'var(--primary-soft)' : 'var(--surface-2)', border: `1px solid ${formData.requiereServiciosGenerales ? 'var(--primary)' : 'var(--border)'}`, fontSize: '12px', fontWeight: '600', color: formData.requiereServiciosGenerales ? 'var(--primary)' : 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'background-color var(--dur) var(--ease-standard), border-color var(--dur) var(--ease-standard), color var(--dur) var(--ease-standard)' }}>
                  <input type="checkbox" style={{ accentColor: 'var(--primary)' }} checked={formData.requiereServiciosGenerales} onChange={e => setFormData({...formData, requiereServiciosGenerales: e.target.checked})} />
                  Servicios generales
                </label>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={labelStyle}>Información Adicional / Observaciones</label>
                <textarea 
                  name="observaciones" 
                  value={formData.observaciones} 
                  onChange={handleInputChange} 
                  style={{ ...inputStyle, height: '80px', resize: 'vertical' }} 
                  placeholder="Cualquier otra información relevante para la logística..." 
                />
              </div>
            </div>

            {/* FOOTER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', padding: '20px', backgroundColor: 'var(--surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '500' }}>
                 <AlertCircle size={18} color="#ce1126" /> Por favor, valida que los perfiles y horarios sean correctos.
              </div>
              <div style={{ display: 'flex', gap: '16px' }}>
                <button type="button" onClick={onClose} style={{ padding: '12px 28px', borderRadius: '30px', backgroundColor: '#f1f5f9', color: 'var(--text-secondary)', border: 'none', fontWeight: '800', cursor: 'pointer', fontSize: '14px', transition: 'background-color var(--dur) var(--ease-standard), color var(--dur) var(--ease-standard), transform var(--dur-fast) var(--ease-out)' }}>
                  Descartar
                </button>
                <button type="submit" disabled={formLoading} style={{ padding: '14px 40px', borderRadius: '30px', backgroundColor: 'var(--text-main)', color: 'white', border: 'none', fontWeight: '800', cursor: formLoading ? 'not-allowed' : 'pointer', fontSize: '14px', boxShadow: '0 10px 20px rgba(30,41,59,0.2)', transition: 'background-color var(--dur) var(--ease-standard), color var(--dur) var(--ease-standard), transform var(--dur-fast) var(--ease-out)' }}>
                  {formLoading ? 'Procesando...' : 'Enviar Solicitud de Evento'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </Modal>

      <ParticipantModal 
        isOpen={partModalOpen} 
        onClose={() => setPartModalOpen(false)} 
        onSave={onSaveParticipant} 
        mode={partMode}
        initialData={partInitialData}
      />
    </>
  );
};

export default EventModal;
