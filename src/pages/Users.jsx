import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Eye, Camera } from 'lucide-react';
import styles from './Users.module.css';
import { getUsuarios, createUsuario } from '../services/usuarios.service';
import { getOficinas } from '../services/oficinas.service';
import { uploadArchivo } from '../services/archivos.service';
import { resolveImageUrl } from '../utils/url';
import Spinner from '../components/ui/Spinner';
import notification from '../utils/notification';
import Modal from '../components/ui/Modal';
import UserDetailDrawer from '../components/ui/UserDetailDrawer';
import { User, Mail, Phone, Lock, Shield, Building, Info, AlertCircle, X } from 'lucide-react';
import modalStyles from '../components/ui/DetailModal.module.css';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter & Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState(''); // '' (Todos), 'ACTIVO', 'INACTIVO'
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    correo: '',
    telefono: '',
    password: '',
    idRol: '4',
    idOficina: '1',
    fotoUrl: ''
  });
  const [isUploadingFoto, setIsUploadingFoto] = useState(false);
  const [offices, setOffices] = useState([]);

  // Drawer State
  const [selectedUser, setSelectedUser] = useState(null);
  const [drawerMode, setDrawerMode] = useState('VIEW');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch once on mount
  useEffect(() => {
    fetchOffices();
  }, []);

  // Fetch when search/filters change
  useEffect(() => {
    fetchUsers();
  }, [debouncedSearch, roleFilter, statusFilter]);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (debouncedSearch) params.q = debouncedSearch;
      if (roleFilter) params.rol = roleFilter;
      if (statusFilter) params.estado = statusFilter;

      const data = await getUsuarios(params);
      setUsers(Array.isArray(data) ? data : data.data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
      if (!err.handledByInterceptor) {
        notification.error('No se pudo cargar la lista de usuarios. Verifica tu conexión.');
      }
    } finally {
      setLoading(false);
    }
  };
  
  const fetchOffices = async () => {
    try {
      const data = await getOficinas();
      setOffices(Array.isArray(data) ? data : data.data || []);
      
      // Si hay oficinas y la actual no existe en el fetch, poner la primera
      if (data.length > 0 && !data.find(o => o.id.toString() === formData.idOficina)) {
        setFormData(prev => ({ ...prev, idOficina: data[0].id.toString() }));
      }
    } catch (err) {
      console.error('Error al cargar oficinas:', err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let nextFormData = { ...formData, [name]: value };

    // Si el rol cambia a Comunicaciones (ID 2), buscar y asignar automáticamente su oficina
    if (name === 'idRol' && value === '2') {
      const commOffice = offices.find(o => o.nombre.toLowerCase().includes('comunicaciones'));
      if (commOffice) {
        nextFormData.idOficina = commOffice.id.toString();
      }
    }

    setFormData(nextFormData);
  };

  const handleFotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingFoto(true);
      const res = await uploadArchivo(file);
      if (res && res.url) {
        setFormData(prev => ({ ...prev, fotoUrl: res.url }));
      }
    } catch (err) {
      console.error('Error uploading photo:', err);
      const msg = err.response?.data?.message || err.message;
      notification.error(`Error al subir la fotografía: ${msg}`);
    } finally {
      setIsUploadingFoto(false);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);
    try {
      const payload = {
        ...formData,
        idRol: parseInt(formData.idRol) || 4,
        idOficina: (formData.idOficina && formData.idOficina !== '0') ? parseInt(formData.idOficina) : null
      };
      await createUsuario(payload);
      notification.success('Usuario creado correctamente');
      setIsModalOpen(false);
      setFormData({ nombre: '', correo: '', telefono: '', password: '', idRol: '4', idOficina: '1', fotoUrl: '' });
      fetchUsers(); 
    } catch(err) {
      console.error('Error al crear usuario:', err);
      const backendMessage = err.response?.data?.message || err.message;
      notification.error(backendMessage);
    } finally {
      setFormLoading(false);
    }
  };

  const handleOpenDrawer = (user, mode) => {
    setSelectedUser(user);
    setDrawerMode(mode);
    setIsDrawerOpen(true);
  };

  const groupedUsers = users.reduce((acc, user) => {
    const roleName = user.roleName || 'Otros';
    if (!acc[roleName]) acc[roleName] = [];
    acc[roleName].push(user);
    return acc;
  }, {});

  return (
    <div className="page-container">
      <div className={styles.header}>
        <h1 className="page-title" style={{marginBottom: 0}}>Usuarios</h1>
      </div>

      <div className="card">
        <div className={styles.tabs}>
          <button 
            className={`${styles.tabBtn} ${statusFilter === '' ? styles.active : ''}`}
            onClick={() => setStatusFilter('')}
          >
            Todos
          </button>
          <button 
            className={`${styles.tabBtn} ${statusFilter === 'ACTIVO' ? styles.active : ''}`}
            onClick={() => setStatusFilter('ACTIVO')}
          >
            Activos
          </button>
          <button 
            className={`${styles.tabBtn} ${statusFilter === 'INACTIVO' ? styles.active : ''}`}
            onClick={() => setStatusFilter('INACTIVO')}
          >
            Inactivos
          </button>
        </div>

        <div className={styles.controlsBar}>
          <div className={styles.searchBar}>
            <input 
              type="text" 
              placeholder="Buscar por nombre, correo..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search size={18} className={styles.searchIcon}/>
          </div>
          
          <select 
            className={styles.roleSelect} 
            value={roleFilter} 
            onChange={(e) => setRoleFilter(e.target.value)}
          >
             <option value="">Todos los Roles</option>
             <option value="SUPER_ADMIN">Super Administrador</option>
             <option value="COMUNICACIONES">Comunicaciones</option>
             <option value="OFICINA">Oficina</option>
             <option value="USUARIO_AUTENTICADO_APP">Usuario Autenticado</option>
          </select>

          <button className={styles.createBtn} onClick={() => setIsModalOpen(true)}>
            <Plus size={18}/> Crear usuario
          </button>
        </div>

        <div className={styles.rolesGrid}>
           {loading ? (
              <Spinner message="Cargando usuarios..." />
           ) : error ? (
              <div style={{ padding: '20px', color: 'red' }}>{error}</div>
           ) : Object.keys(groupedUsers).length > 0 ? (
              Object.entries(groupedUsers).map(([role, roleUsers]) => (
                <div key={role} className={styles.roleSection} style={{ marginBottom: '20px' }}>
                   <h3 className={styles.roleTitle}>{role}</h3>
                   <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px' }}>
                     {roleUsers.map(user => (
                       <div key={user.id || user.idUsuario || Math.random()} className={styles.userCard}>
                          <div className={styles.userAvatar}>
                            {user.fotoUrl ? (
                              <img src={resolveImageUrl(user.fotoUrl)} alt={user.nombres} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '14px' }} />
                            ) : (
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                <circle cx="12" cy="7" r="4"></circle>
                              </svg>
                            )}
                          </div>
                          <div className={styles.userInfo}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <h4>{user.nombres || user.nombre || 'Sin Nombre'} {user.apellidos || ''}</h4>
                              <div className={`${styles.badge} ${user.estado === 'ACTIVO' ? styles.activeBadge : styles.inactiveBadge}`}>
                                <div className={`${styles.statusDot} ${user.estado === 'ACTIVO' ? styles.activeDot : styles.inactiveDot}`}></div>
                                {user.estado === 'ACTIVO' ? 'Activo' : 'Inactivo'}
                              </div>
                            </div>
                            <p>{user.celular || user.telefono || 'Sin celular'}</p>
                            <p>{user.email || user.correo || 'Sin correo'}</p>
                            <div className={styles.cardActions}>
                              <button className={styles.viewBtn} onClick={() => handleOpenDrawer(user, 'VIEW')}><Eye size={14}/> Ver Detalles</button>
                            </div>
                          </div>
                       </div>
                     ))}
                   </div>
                </div>
              ))
           ) : (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '100px 20px', color: '#94a3b8', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', borderRadius: '16px', border: '1px dashed #e2e8f0' }}>
                 <User size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
                 <p style={{ fontSize: '16px', fontWeight: '500' }}>No se encontraron usuarios activos.</p>
              </div>
           )}
        </div>
      </div>

      <UserDetailDrawer 
        key={selectedUser?.id || selectedUser?.idUsuario || 'none'}
        isOpen={isDrawerOpen} 
        onClose={() => { setIsDrawerOpen(false); setSelectedUser(null); }} 
        user={selectedUser} 
        initialMode={drawerMode}
        onRefreshData={fetchUsers} 
      />

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Crear Nuevo Usuario"
        style={{ maxWidth: '600px', width: '95%' }}
        bodyStyle={{ padding: '24px 32px' }}
      >
        <div className={modalStyles.container} style={{ maxHeight: '72vh', overflowY: 'auto', paddingRight: '8px' }}>
          <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {formError && (
              <div style={{ backgroundColor: '#fff1f2', border: '1px solid #fecaca', color: '#be123c', padding: '12px 16px', borderRadius: '12px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <AlertCircle size={18} />
                <span>{formError}</span>
              </div>
            )}
            
            {/* SECTION 1: DATOS PERSONALES */}
            <div className={modalStyles.card}>
              <h3 className={modalStyles.cardTitle} style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px', marginBottom: '16px' }}>
                <User size={16} color="#ce1126" /> Datos Personales
              </h3>
              
              {/* PHOTO UPLOAD BLOCK */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#f1f5f9', border: '2px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
                  {formData.fotoUrl ? (
                    <>
                      <img src={resolveImageUrl(formData.fotoUrl)} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => {
                        console.error("Error loading image preview:", formData.fotoUrl);
                        e.target.style.display = 'none';
                      }} />
                      <button type="button" onClick={() => setFormData(p => ({...p, fotoUrl: ''}))} style={{ position: 'absolute', top: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', padding: '2px', cursor: 'pointer', zIndex: 1, borderRadius: '0 0 0 4px' }}>
                        <X size={12} />
                      </button>
                    </>
                  ) : (
                    <User size={30} color="#94a3b8" />
                  )}
                  {isUploadingFoto && (
                    <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Spinner size="sm" />
                    </div>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <label className={modalStyles.btnSecondary} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0 }}>
                    <Camera size={16} /> {formData.fotoUrl ? 'Cambiar Foto' : 'Subir Foto de Perfil'}
                    <input type="file" accept="image/*" onChange={handleFotoUpload} style={{ display: 'none' }} disabled={isUploadingFoto} />
                  </label>
                  <p style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>JPG, PNG o WEBP. Máx 2MB.</p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label className={modalStyles.fieldLabel}>Nombre Completo</label>
                  <input type="text" name="nombre" value={formData.nombre} onChange={handleInputChange} required className={modalStyles.inputField} placeholder="Juan Pérez..." />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label className={modalStyles.fieldLabel}><Mail size={14}/> Correo</label>
                    <input type="email" name="correo" value={formData.correo} onChange={handleInputChange} required className={modalStyles.inputField} placeholder="user@unilibre.edu.co" />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label className={modalStyles.fieldLabel}><Phone size={14}/> Teléfono</label>
                    <input type="text" name="telefono" value={formData.telefono} onChange={handleInputChange} className={modalStyles.inputField} placeholder="300..." />
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 2: CONFIGURACIÓN DE CUENTA */}
            <div className={modalStyles.cardGrey}>
              <h3 className={modalStyles.cardTitle} style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '16px' }}>
                <Lock size={16} color="#ce1126" /> Configuración de Cuenta
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label className={modalStyles.fieldLabel}>Contraseña Temporal</label>
                  <input type="password" name="password" value={formData.password} onChange={handleInputChange} required className={modalStyles.inputField} placeholder="********" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label className={modalStyles.fieldLabel}><Shield size={14}/> Rol Institucional</label>
                    <select name="idRol" value={formData.idRol} onChange={handleInputChange} className={modalStyles.inputField}>
                      <option value="1">Super Administrador</option>
                      <option value="2">Comunicaciones</option>
                      <option value="3">Oficina</option>
                      <option value="4">Usuario Autenticado</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label className={modalStyles.fieldLabel}><Building size={14}/> Oficina</label>
                    <select 
                      name="idOficina" 
                      value={formData.idOficina} 
                      onChange={handleInputChange} 
                      className={modalStyles.inputField}
                    >
                      {offices.map(oficina => (
                        <option key={oficina.id} value={oficina.id.toString()}>
                          {oficina.nombre}
                        </option>
                      ))}
                      {offices.length === 0 && <option value="">No hay oficinas disponibles</option>}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* FOOTER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
              <div style={{ fontSize: '13px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '500' }}>
                 <AlertCircle size={15}/> El usuario deberá cambiar su clave al ingresar.
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className={modalStyles.btnSecondary}>
                  Cancelar
                </button>
                <button type="submit" disabled={formLoading} className={modalStyles.btnPrimary}>
                  {formLoading ? 'Guardando...' : 'Crear Usuario'}
                </button>
              </div>
            </div>

          </form>
        </div>
      </Modal>

    </div>
  );
};

export default Users;
