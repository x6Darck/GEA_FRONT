import React, { createContext, useState, useEffect } from 'react';
import { getCurrentUser, logout as authLogout } from '../services/auth.service';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // La sesión está validada por la cookie HttpOnly — el user en localStorage
  // es solo metadatos de display (nombre, rol, foto). No depende del token.
  const [user, setUser] = useState(() => getCurrentUser());
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

  const logoutContext = async () => {
    setUser(null); // limpiar UI de inmediato
    await authLogout(); // llamar al backend para revocar la cookie + limpiar localStorage
  };

  // Escuchar el evento global 'auth-error' emitido por el interceptor de api.js
  // cuando el backend devuelve 401 en rutas no silenciosas (token expirado / inválido).
  // AuthProvider vive fuera de BrowserRouter, por eso usamos window.location.href
  // en lugar de useNavigate para redirigir a /login.
  useEffect(() => {
    const handleAuthError = () => {
      setUser(null);
      authLogout(); // fire-and-forget — ya redirigimos a login
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
