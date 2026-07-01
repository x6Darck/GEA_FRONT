/**
 * Guardia de ruta que verifica autenticación y rol antes de renderizar la ruta hija.
 *
 * - Sin sesión → redirige a `/login`.
 * - Con sesión pero sin el rol requerido → muestra pantalla de "Acceso Denegado".
 * - Con sesión y rol correcto → renderiza `<Outlet />`.
 *
 * También escucha el evento `auth-error` del interceptor de Axios para que, en rutas
 * protegidas, la expiración del token cierre sesión y redirija usando `useNavigate`
 * (a diferencia de `AuthProvider`, que usa `window.location.href` porque vive fuera del Router).
 */
import React, { useContext, useEffect } from 'react';
import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const ProtectedRoute = ({ allowedRoles }) => {
  const { user, loading, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthError = () => {
      logout(); 
      navigate('/login', { replace: true });
    };

    window.addEventListener('auth-error', handleAuthError);
    return () => window.removeEventListener('auth-error', handleAuthError);
  }, [navigate, logout]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f5f7fa' }}>
        <p>Cargando aplicación...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // HALLAZGO AUDITORÍA: Verificar roles permitidos
  if (allowedRoles && !allowedRoles.includes(user.rol)) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f5f7fa', padding: '20px', textAlign: 'center' }}>
        <h2 style={{ color: '#dc2626' }}>Acceso Denegado</h2>
        <p>No tienes permisos suficientes para acceder a esta sección.</p>
        <button 
          onClick={() => navigate('/calendario')}
          style={{ marginTop: '20px', padding: '10px 20px', background: 'var(--text-main)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
        >
          Volver al Calendario
        </button>
      </div>
    );
  }

  return <Outlet />;
};

export default ProtectedRoute;
