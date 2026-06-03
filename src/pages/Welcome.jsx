import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Welcome.module.css';
import geaLogo from '../assets/gea-logo.png';

const Welcome = () => {
  const navigate = useNavigate();

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <img src={geaLogo} alt="GEA Logo" className={styles.logo} />
        <h1 className={styles.title}>GEA</h1>
        <p className={styles.subtitle}>Gestión de Eventos y Anuncios</p>
        <p className={styles.institution}>Unilibre CUC</p>
        <button
          className={styles.button}
          onClick={() => navigate('/login')}
        >
          Iniciar sesión
        </button>
      </div>
    </div>
  );
};

export default Welcome;
