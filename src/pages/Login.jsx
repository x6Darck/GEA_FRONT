import React, { useState, useContext } from 'react';
import { Calendar } from 'lucide-react';
import styles from './Login.module.css';
import { useNavigate } from 'react-router-dom';
import geaLogo from '../assets/gea-logo.png';
import { login as authLogin, getCurrentUser } from '../services/auth.service';
import { AuthContext } from '../context/AuthContext';
import notification from '../utils/notification';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);
  const [credentials, setCredentials] = useState({ correo: '', password: '' });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setCredentials({ ...credentials, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // Llama al servicio que guarda token y user en localStorage
      await authLogin(credentials, { skipGlobalError: true });
      // Leer el user completo desde localStorage
      const savedUser = getCurrentUser();
      login(savedUser);
      notification.success(`¡Bienvenido, ${savedUser.nombre || 'Usuario'}!`);
      navigate('/calendario');
    } catch (err) {
      let msg = '';
      if (!err.response) {
        msg = 'No se pudo establecer conexión con el servidor. Por favor, verifica tu internet.';
      } else if (err.response.status === 401) {
        msg = 'Credenciales inválidas. Revisa tu correo y contraseña.';
      } else {
        msg = err.response?.data?.message || 'Error al iniciar sesión.';
      }
      setError(msg);
      notification.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.loginContainer}>
      <div className={styles.brandCorner}>
        <div className={styles.logoWrapper} style={{ overflow: 'hidden' }}>
            <img src={geaLogo} alt="GEA Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
        <span className={styles.brandName}>GEA</span>
      </div>
      
      <div className={styles.loginBox}>
        <div className={styles.header}>
          <div className={styles.userIconWrapper}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </div>
          <h1 className={styles.title}>Inicia sesion</h1>
        </div>

        <form onSubmit={handleLogin} className={styles.form}>
          {error && <div style={{ color: 'red', marginBottom: '10px', textAlign: 'center', backgroundColor: '#ffebe6', padding: '10px', borderRadius: '4px', fontSize: '14px' }}>{error}</div>}
          <div className={styles.inputGroup}>
            <label>Correo</label>
            <input 
              type="email" 
              name="correo"
              value={credentials.correo}
              onChange={handleChange}
              required 
            />
          </div>
          <div className={styles.inputGroup}>
            <label>Contraseña</label>
            <input 
              type="password" 
              name="password"
              value={credentials.password}
              onChange={handleChange}
              required 
            />
          </div>
          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? 'Cargando...' : 'LOGIN'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
