/**
 * Página de gestión de usuarios GEA (solo accesible para ADMIN/SUPER_ADMIN).
 *
 * Agrupa los usuarios por rol usando `ROLE_ORDER` para el orden de los encabezados.
 * El debounce de 500ms en el campo de búsqueda evita una petición por cada tecla pulsada.
 *
 * Flujo de creación: Modal de creación → `createUsuario` → `fetchUsers` para refrescar.
 * Flujo de edición/vista: click en card → `UserDetailDrawer` en modo VIEW o EDIT.
 *
 * La foto de perfil se valida en el cliente (2 MB, JPG/PNG/WEBP) antes de subir
 * a `/comunicaciones/archivos/upload` para evitar rechazos del backend.
 */
import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Edit2, Eye, Camera } from 'lucide-react';
import styles from './Users.module.css';
import { getUsuarios, createUsuario } from '../services/usuarios.service';
import { getOficinasCache } from '../services/oficinas.cache';
import { uploadArchivo } from '../services/archivos.service';
import { resolveImageUrl } from '../utils/url';
import Spinner from '../components/ui/Spinner';
import notification from '../utils/notification';
import Modal from '../components/ui/Modal';
import UserDetailDrawer from '../components/ui/UserDetailDrawer';
import { User, Mail, Phone, Lock, Shield, Building, Info, AlertCircle, X } from 'lucide-react';
import modalStyles from '../components/ui/DetailModal.module.css';
import { ROLE_ORDER } from '../utils/roleUtils'; // We'll create this or define locally

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
    idOficina: '',
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
      const data = await getOficinasCache();
      setOffices(data);
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

    // Si el rol es Usuario Autenticado (ID 4), no requiere oficina
    if (name === 'idRol' && value === '4') {
      nextFormData.idOficina = ''; // O null, para indicar que no aplica
    }

    setFormData(nextFormData);
  };

  const handleFotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_SIZE_MB = 2;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      notification.error(`La imagen no puede superar ${MAX_SIZE_MB}MB. El archivo seleccionado pesa ${(file.size / 1024 / 1024).toFixed(1)}MB.`);
      e.target.value = '';
      return;
    }

    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
    if (!ALLOWED_TYPES.includes(file.type)) {
      notification.error('Formato no permitido. Usa JPG, PNG o WEBP.');
      e.target.value = '';
      return;
    }

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

  const groupedUsers = useMemo(() => users.reduce((acc, user) => {
    const roleName = user.roleName || 'Otros';
    if (!acc[roleName]) acc[roleName] = [];
    acc[roleName].push(user);
    return acc;
  }, {}), [users]);

  return (
    <div className="page-container">
      <div className={styles.header}>
        <h1 className="page-title" style={{marginBottom: 0}}>Usuarios</h1>
        <button className={styles.createBtn} onClick={() => setIsModalOpen(true)}>
          <Plus size={18}/> Crear usuario
        </button>
      </div>

      <div className="card">
        <div className={styles.filterToolbar}>
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input
              type="text"
              placeholder="Buscar por nombre, correo o teléfono..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
          </div>
          <div className={styles.filterRow}>
            <select className={styles.filterSelect} value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
              <option value="">Todos los Roles</option>
              <option value="SUPER_ADMIN">Super Administrador</option>
              <option value="COMUNICACIONES">Comunicaciones</option>
              <option value="OFICINA">Oficina</option>
              <option value="USUARIO_AUTENTICADO_APP">Usuario Autenticado</option>
              <option value="CONSULTORIA">Consultoría</option>
            </select>
            <div className={styles.filterDivider} />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              <button className={`${styles.tabBtn} ${statusFilter === '' ? styles.active : ''}`} onClick={() => setStatusFilter('')}>Todos</button>
              <button className={`${styles.tabBtn} ${statusFilter === 'ACTIVO' ? styles.active : ''}`} onClick={() => setStatusFilter('ACTIVO')}>Activos</button>
              <button className={`${styles.tabBtn} ${statusFilter === 'INACTIVO' ? styles.active : ''}`} onClick={() => setStatusFilter('INACTIVO')}>Inactivos</button>
            </div>
          </div>
        </div>

        <div className={styles.rolesGrid}>
           {loading ? (
              <Spinner message="Cargando usuarios..." />
           ) : error ? (
              <div style={{ padding: '20px', color: 'red' }}>{error}</div>
           ) : Object.keys(groupedUsers).length > 0 ? (
              Object.entries(groupedUsers)
                .sort(([roleA], [roleB]) => {
                   const orderA = ROLE_ORDER[roleA] || 99;
                   const orderB = ROLE_ORDER[roleB] || 99;
                   return orderA - orderB;
                })
                .map(([role, roleUsers]) => (
                 <div key={role} className={`${styles.roleSection} ${role === 'Oficina' ? styles.bigSection : ''}`} style={{ marginBottom: '20px' }}>
                   <h3 className={styles.roleTitle}>{role}</h3>
                   <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px' }}>
                     {roleUsers.map((user, idx) => (
                       <div key={user.id || user.idUsuario || user.correo || idx} className={styles.userCard}>
                          <div className={styles.userAvatar}>
                            {user.fotoUrl ? (
                              <img src={resolveImageUrl(user.fotoUrl)} alt={user.nombres} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '14px' }} onError={e => { e.currentTarget.style.display = 'none'; }} />
                            ) : (
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                <circle cx="12" cy="7" r="4"></circle>
                              </svg>
                            )}
                          </div>
                          <div className={styles.userInfo}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', minWidth: 0 }}>
                              <h4 style={{ flex: 1, minWidth: 0 }}>{user.nombres || user.nombre || 'Sin Nombre'} {user.apellidos || ''}</h4>
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
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '100px 20px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--surface-2)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border)' }}>
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
              <div style={{ backgroundColor: 'var(--danger-soft)', border: '1px solid var(--danger-soft)', color: 'var(--danger)', padding: '12px 16px', borderRadius: '12px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <AlertCircle size={18} />
                <span>{formError}</span>
              </div>
            )}
            
            {/* SECTION 1: DATOS PERSONALES */}
            <div className={modalStyles.card}>
              <h3 className={modalStyles.cardTitle} style={{ borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '16px' }}>
                <User size={16} color="var(--text-muted)" /> Datos Personales
              </h3>
              
              {/* PHOTO UPLOAD BLOCK */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'var(--surface-2)', border: '2px dashed var(--border-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
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
                    <User size={30} color="var(--text-muted)" />
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
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px' }}>JPG, PNG o WEBP. Máx 2MB.</p>
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
              <h3 className={modalStyles.cardTitle} style={{ borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '16px' }}>
                <Lock size={16} color="var(--text-muted)" /> Configuración de Cuenta
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
                      <option value="5">Consultoría</option>
                    </select>
                  </div>
                  {formData.idRol !== '4' && formData.idRol !== '5' && (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <label className={modalStyles.fieldLabel}><Building size={14}/> Oficina</label>
                      <select 
                        name="idOficina" 
                        value={formData.idOficina} 
                        onChange={handleInputChange} 
                        className={modalStyles.inputField}
                        required={formData.idRol !== '4'}
                      >
                        <option value="">Seleccionar Oficina...</option>
                        {offices.map(oficina => (
                          <option key={oficina.id} value={oficina.id.toString()}>
                            {oficina.nombre}
                          </option>
                        ))}
                        {offices.length === 0 && <option value="">No hay oficinas disponibles</option>}
                      </select>
                    </div>
                  )}
                  {formData.idRol === '4' && (
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                       <div style={{ backgroundColor: 'var(--surface-2)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Info size={14} color="var(--text-secondary)" />
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Los estudiantes no requieren asignación de oficina.</span>
                       </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* FOOTER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '500' }}>
                 <AlertCircle size={15}/> El usuario deberá cambiar su clave al ingresar.
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className={modalStyles.btnSecondary}>
                  Cancelar
                </button>
                <button type="submit" disabled={formLoading} className={modalStyles.btnPrimary} style={{ opacity: formLoading ? 0.7 : 1, cursor: formLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {formLoading && <Spinner size="sm" />}
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
