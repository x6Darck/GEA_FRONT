/**
 * Indicador de carga de GEA.
 * `size="sm"` renderiza solo el círculo (sin texto) para uso inline dentro de botones.
 * `size="md"` (por defecto) muestra el spinner centrado con un mensaje descriptivo.
 *
 * @param {string} [message='Cargando información...']
 * @param {'sm'|'md'} [size='md']
 */
import React from 'react';
import styles from './Spinner.module.css';

const Spinner = ({ message = 'Cargando información...', size = 'md' }) => {
  if (size === 'sm') {
    return <div className={styles.spinnerSm} />;
  }

  return (
    <div className={styles.spinnerWrapper}>
      <div className={styles.spinner}></div>
      <p className={styles.spinnerText}>{message}</p>
    </div>
  );
};

export default Spinner;
