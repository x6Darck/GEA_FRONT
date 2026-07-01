/**
 * Contexto global de autenticación de GEA.
 *
 * La sesión real está validada por la cookie HttpOnly `gea_auth` que gestiona el backend.
 * Lo que este contexto almacena en estado son únicamente los metadatos de display
 * (nombre, rol, foto, oficina) leídos de localStorage, que no son sensibles.
 *
 * Flujo de cierre de sesión por expiración de token:
 * el interceptor de {@link api} emite `auth-error` en el `window`,
 * `AuthProvider` lo escucha, limpia el estado y redirige a `/login` via
 * `window.location.href` (no `useNavigate`) porque el provider vive fuera del BrowserRouter.
 */
import React, { createContext, useState, useEffect } from 'react';
import { getCurrentUser, logout as authLogout } from '../services/auth.service';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // La sesión está validada por la cookie HttpOnly — el user en localStorage
  // es solo metadatos de display (nombre, rol, foto). No depende del token.
  const [user, setUser] = useState(() => getCurrentUser());
  const [loading, setLoading] = useState(false);

  /** Actualiza el estado React tras un login exitoso. */
  const loginContext = (userData) => {
    setUser(userData);
  };

  /**
   * Actualiza parcialmente los metadatos del usuario en estado y en localStorage.
   * Usado para reflejar cambios de perfil (foto, nombre) sin requerir nuevo login.
   */
  const updateUser = (data) => {
    setUser(prev => {
      const updated = { ...prev, ...data };
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  };

  /**
   * Cierra la sesión: limpia el estado React de inmediato para que la UI responda
   * rápido, y luego llama al backend para revocar la cookie HttpOnly.
   */
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
