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

  return (
    <AuthContext.Provider value={{ user, login: loginContext, logout: logoutContext, updateUser, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
