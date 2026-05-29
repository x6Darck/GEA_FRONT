import React, { useState, useEffect, useContext } from 'react';
import Drawer from './Drawer';
import { User, Mail, Phone, Lock, Shield, Building, Camera, X, Info } from 'lucide-react';
import modalStyles from './DetailModal.module.css';
import { AuthContext } from '../../context/AuthContext';
import { updateUsuario, deleteUsuario } from '../../services/usuarios.service';
import { uploadArchivo } from '../../services/archivos.service';
import { getOficinas } from '../../services/oficinas.service';
import { resolveImageUrl } from '../../utils/url';
import Spinner from './Spinner';
import notification from '../../utils/notification';

const getRolId = (rol) => {
  if (!rol) return '4';
  const directId = rol.id?.toString() || rol.toString();
  if (['1', '2', '3', '4'].includes(directId)) return directId;

  if (typeof rol === 'object') {
    const name = (rol.nombre || '').toString().toUpperCase();
    if (name === 'SUPER_ADMIN' || name === 'ADMIN') return '1';
    if (name === 'COMUNICACIONES') return '2';
    if (name === 'OFICINA') return '3';
    return '4';
  }

  const n = rol.toString().toUpperCase();
  if (n === 'SUPER_ADMIN' || n === 'ADMIN') return '1';
  if (n === 'COMUNICACIONES') return '2';
  if (n === 'OFICINA') return '3';
  return '4';
};

const UserDetailDrawer = ({ isOpen, onClose, user, initialMode = 'VIEW', onRefreshData }) => {
  const [mode, setMode] = useState(initialMode);
  const [loading, setLoading] = useState(false);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [formError, setFormError] = useState(null);
  const [offices, setOffices] = useState([]);
  const { user: currentUserSession, updateUser } = useContext(AuthContext);
  
  const [formData, setFormData] = useState({
    nombre: '',
    correo: '',
    telefono: '',
    password: '',
    idRol: '4',
    idOficina: '1',
    fotoUrl: '',
    estado: 'ACTIVO'
  });

  useEffect(() => {
    if (isOpen && user) {
      setMode(initialMode);
      setFormError(null);
      
      const phoneVal = (user.celular || user.telefono || '');
      const officeId = (user.idOficina || user.oficina?.id)?.toString() || '';
      
      setFormData({
        nombre: user.nombre || user.nombres || '',
        correo: user.correo || user.email || '',
        telefono: phoneVal.toString().trim(),
        password: '',
        idRol: getRolId(user.rol),
        idOficina: officeId,
        fotoUrl: user.fotoUrl || '',
        estado: user.estado || 'ACTIVO'
      });
      
      // Si entramos directamente en modo EDIT y no hay oficina, intentar pre-seleccionar la primera
      if (initialMode === 'EDIT' && !officeId && offices.length > 0) {
        setFormData(prev => ({ ...prev, idOficina: offices[0].id.toString() }));
      }
      
      fetchOffices();
    }
  }, [isOpen, user, initialMode, offices.length]);

  // Si no tenemos oficinaNombre en el user, intentamos buscarla en la lista cargada
  const displayOficina = formData.idRol === '4' 
    ? 'N/A (Estudiante)' 
    : (user?.oficinaNombre && user.oficinaNombre !== 'No asignada' 
        ? user.oficinaNombre 
        : offices.find(o => o.id?.toString() === formData.idOficina)?.nombre || 'No asignada');

  const fetchOffices = async () => {
    try {
      const data = await getOficinas();
      setOffices(Array.isArray(data) ? data : data.data || []);
    } catch (err) {
      console.error('Error oficinas:', err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let nextData = { ...formData, [name]: value };
    if (name === 'idRol' && value === '2') {
      const commOffice = offices.find(o => (o.nombre || '').toLowerCase().includes('comunicaciones'));
      if (commOffice) nextData.idOficina = (commOffice.id || 1).toString();
    }
    if (name === 'idRol' && value === '4') {
      nextData.idOficina = '';
    }
    setFormData(nextData);
  };

  const handleFotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingFoto(true);
      const res = await uploadArchivo(file);
      if (res && res.url) setFormData(prev => ({ ...prev, fotoUrl: res.url }));
    } catch (err) {
       notification.error(`Error al subir la fotografía`);
    } finally {
      setUploadingFoto(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar permanentemente a este usuario? Esta acción no se puede deshacer.')) return;
    setLoading(true);
    try {
      await deleteUsuario(user?.id || user?.idUsuario);
      notification.success('Usuario eliminado permanentemente');
      if (onRefreshData) onRefreshData();
      onClose();
    } catch(err) {
      notification.error(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    const isActivo = (user?.estado || 'ACTIVO') === 'ACTIVO';
    if (!window.confirm(`¿Estás seguro de que deseas ${isActivo ? 'desactivar' : 'activar'} esta cuenta?`)) return;
    setLoading(true);
    try {
      await updateUsuario(user?.id || user?.idUsuario, {
        ...formData,
        password: formData.password || null,
        idRol: parseInt(formData.idRol) || 4,
        idOficina: formData.idOficina ? parseInt(formData.idOficina) : null,
        estado: isActivo ? 'INACTIVO' : 'ACTIVO'
      });
      notification.success(isActivo ? 'Cuenta desactivada' : 'Cuenta activada correctamente');
      if (onRefreshData) onRefreshData();
      onClose();
    } catch(err) {
      notification.error(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setFormError(null);
    const updatePayload = {
      ...formData,
      password: formData.password || null,
      idRol: parseInt(formData.idRol) || 4,
      idOficina: (formData.idOficina && formData.idOficina !== '0') ? parseInt(formData.idOficina) : null,
      estado: user?.estado || 'ACTIVO'
    };
    try {
      await updateUsuario(user?.id || user?.idUsuario, updatePayload);
      
      // Sincronizar sesión si el usuario editado es el mismo que está logueado
      const loggedUserId = currentUserSession?.id || currentUserSession?.idUsuario;
      const editedUserId = user?.id || user?.idUsuario;
      
      if (loggedUserId && editedUserId && loggedUserId.toString() === editedUserId.toString()) {
        updateUser({
          nombre: formData.nombre,
          correo: formData.correo,
          fotoUrl: formData.fotoUrl
        });
      }

      notification.success('Usuario actualizado correctamente');
      if (onRefreshData) onRefreshData();
      onClose();
    } catch(err) {
      notification.error(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !user) return null;

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title={mode === 'EDIT' ? 'Editar Usuario' : 'Perfil de Usuario'} width="500px">
      <div className={modalStyles.container} style={{ height: '100%', overflowY: 'auto', padding: '24px' }}>
        
        {/* AVATAR COMÚN */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px' }}>
          <div style={{ width: mode === 'EDIT' ? '100px' : '120px', height: mode === 'EDIT' ? '100px' : '120px', borderRadius: '50%', backgroundColor: '#f1f5f9', border: '3px solid white', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
            {formData.fotoUrl ? (
              <img src={resolveImageUrl(formData.fotoUrl)} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <User size={mode === 'EDIT' ? 40 : 50} color="#94a3b8" />
            )}
            {mode === 'EDIT' && uploadingFoto && (
                <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Spinner size="sm"/>
                </div>
            )}
          </div>

          {mode === 'EDIT' ? (
            <div style={{ marginTop: '12px' }}>
               <label className={modalStyles.btnSecondary} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0, padding: '6px 14px', borderRadius: '20px', fontSize: '13px' }}>
                 <Camera size={14} /> Cambiar Foto
                 <input type="file" accept="image/*" onChange={handleFotoUpload} style={{ display: 'none' }} disabled={uploadingFoto} />
               </label>
            </div>
          ) : (
            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <h2 style={{ margin: '0 0 4px 0', fontSize: '20px', color: '#0f172a', fontWeight: '800' }}>{formData.nombre || 'Usuario'}</h2>
              <span style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700' }}>
                {user?.roleName || 'Usuario'}
              </span>
            </div>
          )}
        </div>

        {formError && (
          <div style={{ backgroundColor: '#fff1f2', border: '1px solid #fecaca', color: '#be123c', padding: '12px 16px', borderRadius: '12px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <X size={18} /><span>{formError}</span>
          </div>
        )}

        {/* MODO VISTA (Sin formulario) */}
        {mode === 'VIEW' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className={modalStyles.card}>
              <h3 className={modalStyles.cardTitle} style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px', marginBottom: '16px' }}><User size={16} color="#ce1126" /> Información Personal</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                 <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label className={modalStyles.fieldLabel}>Nombre Completo</label>
                    <div style={{ color: '#0f172a', fontWeight: '500', fontSize: '14px' }}>{formData.nombre || 'Sin nombre'}</div>
                 </div>
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                       <label className={modalStyles.fieldLabel}><Mail size={14} style={{ marginRight: '4px' }}/> Correo</label>
                       <div style={{ color: '#0f172a', fontWeight: '500', fontSize: '14px' }}>{formData.correo || 'Sin correo'}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                       <label className={modalStyles.fieldLabel}><Phone size={14} style={{ marginRight: '4px' }}/> Teléfono</label>
                       <div style={{ color: '#0f172a', fontWeight: '500', fontSize: '14px' }}>{formData.telefono || 'Sin celular'}</div>
                    </div>
                 </div>
              </div>
            </div>

            <div className={modalStyles.cardGrey}>
              <h3 className={modalStyles.cardTitle} style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '16px' }}><Lock size={16} color="#ce1126" /> Configuración de Cuenta</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                       <label className={modalStyles.fieldLabel}><Shield size={14} style={{ marginRight: '4px' }}/> Rol Institucional</label>
                       <div style={{ color: '#0f172a', fontWeight: '500', fontSize: '14px' }}>{user?.roleName || 'Usuario'}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                       <label className={modalStyles.fieldLabel}><Building size={14} style={{ marginRight: '4px' }}/> Oficina</label>
                       <div style={{ color: '#0f172a', fontWeight: '500', fontSize: '14px' }}>{displayOficina}</div>
                    </div>
                 </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
               <button type="button" onClick={onClose} className={modalStyles.btnSecondary}>Cerrar</button>
               <button type="button" onClick={(e) => { e.preventDefault(); setMode('EDIT'); }} className={modalStyles.btnPrimary}>Modificar</button>
            </div>
          </div>
        )}

        {/* MODO EDICIÓN (Con formulario real) */}
        {mode === 'EDIT' && (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className={modalStyles.card}>
              <h3 className={modalStyles.cardTitle} style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px', marginBottom: '16px' }}><User size={16} color="#ce1126" /> Información Personal</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                 <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label className={modalStyles.fieldLabel}>Nombre Completo</label>
                    <input type="text" name="nombre" value={formData.nombre} onChange={handleChange} required className={modalStyles.inputField} />
                 </div>
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                       <label className={modalStyles.fieldLabel}><Mail size={14} style={{ marginRight: '4px' }}/> Correo</label>
                       <input type="email" name="correo" value={formData.correo} onChange={handleChange} required className={modalStyles.inputField} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                       <label className={modalStyles.fieldLabel}><Phone size={14} style={{ marginRight: '4px' }}/> Teléfono</label>
                       <input type="text" name="telefono" value={formData.telefono} onChange={handleChange} className={modalStyles.inputField} />
                    </div>
                 </div>
              </div>
            </div>

            <div className={modalStyles.cardGrey}>
              <h3 className={modalStyles.cardTitle} style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '16px' }}><Lock size={16} color="#ce1126" /> Configuración de Cuenta</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                 <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label className={modalStyles.fieldLabel}>Contraseña (Dejar en blanco para no cambiar)</label>
                    <input type="password" name="password" value={formData.password} onChange={handleChange} className={modalStyles.inputField} placeholder="********" />
                 </div>
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                       <label className={modalStyles.fieldLabel}><Shield size={14} style={{ marginRight: '4px' }}/> Rol Institucional</label>
                       <select name="idRol" value={formData.idRol} onChange={handleChange} className={modalStyles.inputField}>
                          <option value="1">Super Administrador</option>
                          <option value="2">Comunicaciones</option>
                          <option value="3">Oficina</option>
                          <option value="4">Usuario Autenticado</option>
                       </select>
                    </div>
                     {formData.idRol !== '4' && (
                       <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <label className={modalStyles.fieldLabel}><Building size={14} style={{ marginRight: '4px' }}/> Oficina</label>
                           <select name="idOficina" value={formData.idOficina || ''} onChange={handleChange} className={modalStyles.inputField} required={formData.idRol !== '4'}>
                              <option value="">Seleccione una oficina...</option>
                              {offices.map((oficina) => (
                                 <option key={oficina.id} value={oficina.id.toString()}>{oficina.nombre || 'Oficina'}</option>
                              ))}
                           </select>
                       </div>
                     )}
                     {formData.idRol === '4' && (
                       <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                          <div style={{ backgroundColor: '#f8fafc', padding: '8px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '8px', height: '40px' }}>
                             <Info size={14} color="#64748b" />
                             <span style={{ fontSize: '11px', color: '#64748b' }}>Los estudiantes no requieren oficina.</span>
                          </div>
                       </div>
                     )}
                 </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
               <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" onClick={handleToggleStatus} disabled={loading} className={modalStyles.btnSecondary} style={{ color: (user?.estado || 'ACTIVO') === 'ACTIVO' ? '#be123c' : '#059669', borderColor: (user?.estado || 'ACTIVO') === 'ACTIVO' ? '#fecaca' : '#a7f3d0' }}>
                    {(user?.estado || 'ACTIVO') === 'ACTIVO' ? 'Desactivar Cuenta' : 'Activar Cuenta'}
                  </button>
                  <button type="button" onClick={handleDelete} disabled={loading} className={modalStyles.btnSecondary} style={{ color: '#be123c', borderColor: '#fecaca' }}>Eliminar</button>
               </div>
               <div style={{ display: 'flex', gap: '12px' }}>
                  <button type="button" onClick={() => setMode('VIEW')} className={modalStyles.btnSecondary}>Cancelar</button>
                  <button type="submit" disabled={loading} className={modalStyles.btnPrimary}>{loading ? 'Guardando...' : 'Guardar'}</button>
               </div>
            </div>
          </form>
        )}
      </div>
    </Drawer>
  );
};

export default UserDetailDrawer;
