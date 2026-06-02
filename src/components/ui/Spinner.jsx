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
