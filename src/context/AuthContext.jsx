import React, { createContext, useState, useEffect } from 'react';
import { getCurrentUser, getToken, logout as authLogout } from '../services/auth.service';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const token = getToken();
    const currentUser = getCurrentUser();
    return (token && currentUser) ? currentUser : null;
  });
  const [loading, setLoading] = useState(false);


  const loginContext = (userData) => {
    setUser(userData);
  };

  const updateUser = (data) => {
    setUser(prev => {
      const updated = { ...prev, ...data };
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  };

  const logoutContext = () => {
    authLogout();
    setUser(null);
  };

  // Escuchar el evento global 'auth-error' emitido por el interceptor de api.js
  // cuando el backend devuelve 401 en rutas no silenciosas (token expirado / inválido).
  // AuthProvider vive fuera de BrowserRouter, por eso usamos window.location.href
  // en lugar de useNavigate para redirigir a /login.
  useEffect(() => {
    const handleAuthError = () => {
      authLogout();
      setUser(null);
      window.location.href = '/login';
    };

    window.addEventListener('auth-error', handleAuthError);
    return () => window.removeEventListener('auth-error', handleAuthError);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login: loginContext, logout: logoutContext, updateUser, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
