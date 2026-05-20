import React, { useContext } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Calendar, CalendarDays, Megaphone, FileText, Users } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import { resolveImageUrl } from '../../utils/url';
import geaLogo from '../../assets/gea-logo.png';
import styles from './Sidebar.module.css';

const Sidebar = () => {
  const { user, logout } = useContext(AuthContext);

  const navigate = useNavigate();

  const displayName = user ? (user.nombre || user.nombres || user.email?.split('@')[0] || 'Usuario') : 'Invitado';
  const displayEmail = user ? (user.correo || user.email || '') : 'Modo de solo lectura';
  const profileImg = user ? resolveImageUrl(user.fotoUrl) : null;

  return (
    <aside className={styles.sidebar}>
      <div className={styles.profileSection}>
        <div className={styles.avatar}>
          {profileImg ? (
            <img src={profileImg} alt="Perfil" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
               <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
               <circle cx="12" cy="7" r="4"></circle>
            </svg>
          )}
        </div>
        <h2 className={styles.userName}>{displayName}</h2>
        <p className={styles.userEmail}>{displayEmail}</p>
      </div>

      <nav className={styles.navMenu}>
        <NavLink 
          to="/calendario" 
          className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
        >
          <Calendar className={styles.icon} size={20} />
          Calendario
        </NavLink>

        {!user && (
          <NavLink 
            to="/galeria-anuncios" 
            className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
          >
            <Megaphone className={styles.icon} size={20} />
            Anuncios
          </NavLink>
        )}
        
        {user && (
          <>
            <NavLink 
              to="/eventos"
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
            >
              <CalendarDays className={styles.icon} size={20} />
              Eventos
            </NavLink>
            
            <NavLink 
              to="/anuncios"
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
            >
              <Megaphone className={styles.icon} size={20} />
              Anuncios
            </NavLink>
            
            <NavLink 
              to="/reportes"
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
            >
              <FileText className={styles.icon} size={20} />
              Reportes
            </NavLink>
            
            {['SUPER_ADMIN', 'ADMIN'].includes(user?.rol?.toString().toUpperCase()) && (
              <NavLink 
                to="/usuarios"
                className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
              >
                <Users className={styles.icon} size={20} />
                Usuarios
              </NavLink>
            )}
          </>
        )}
      </nav>

      <div className={styles.sidebarFooter}>
        {user ? (
          <button 
            onClick={() => {
              logout();
              navigate('/calendario');
            }}
            className={styles.logoutBtn}
          >
            <svg style={{ marginRight: '10px' }} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            <span>Cerrar sesión</span>
          </button>
        ) : (
          <button 
            onClick={() => navigate('/login')}
            className={styles.loginBtn}
          >
            <svg style={{ marginRight: '8px' }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
              <polyline points="10 17 15 12 10 7"></polyline>
              <line x1="15" y1="12" x2="3" y2="12"></line>
            </svg>
            <span>Iniciar Sesión</span>
          </button>
        )}

        <div className={styles.footerBrand}>
          <div className={styles.brandLogo} style={{ overflow: 'hidden' }}>
             <img src={geaLogo} alt="GEA Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div className={styles.brandName}>GEA</div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
