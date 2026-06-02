import React, { useState, useContext } from 'react';
import { Calendar, Eye, EyeOff, AlertCircle } from 'lucide-react';
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
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setCredentials({ ...credentials, [e.target.name]: e.target.value });
    if (error) setError(null);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await authLogin(credentials, { skipGlobalError: true });
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
          <h1 className={styles.title}>Inicia sesión</h1>
        </div>

        <form onSubmit={handleLogin} className={styles.form} noValidate>
          {error && (
            <div className={styles.errorBox} role="alert">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div className={styles.inputGroup}>
            <label htmlFor="login-correo">Correo</label>
            <input
              id="login-correo"
              type="email"
              name="correo"
              value={credentials.correo}
              onChange={handleChange}
              required
              className={error ? styles.inputError : ''}
              autoComplete="email"
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="login-password">Contraseña</label>
            <div className={styles.passwordWrapper}>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={credentials.password}
                onChange={handleChange}
                required
                className={error ? styles.inputError : ''}
                autoComplete="current-password"
              />
              <button
                type="button"
                className={styles.eyeBtn}
                onClick={() => setShowPassword(v => !v)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? 'Verificando...' : 'LOGIN'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
