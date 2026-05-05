import React from 'react';
import styles from './Spinner.module.css';

const Spinner = ({ message = 'Cargando información...' }) => {
  return (
    <div className={styles.spinnerWrapper}>
      <div className={styles.spinner}></div>
      <p className={styles.spinnerText}>{message}</p>
    </div>
  );
};

export default Spinner;
