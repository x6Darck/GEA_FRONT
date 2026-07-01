/**
 * Layout principal del dashboard GEA.
 *
 * Compone {@link Sidebar} con el contenido de la ruta activa renderizado vía `<Outlet>`.
 * En pantallas pequeñas el sidebar se colapsa y se accede con el botón hamburguesa.
 * El overlay cierra el sidebar al hacer clic fuera en móvil.
 */
import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import styles from './DashboardLayout.module.css';
import { Menu } from 'lucide-react';

const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className={styles.layout}>
      <button
        className={styles.hamburger}
        onClick={() => setSidebarOpen(true)}
        aria-label="Abrir menú de navegación"
      >
        <Menu size={22} />
      </button>

      {sidebarOpen && (
        <div
          className={styles.overlay}
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className={styles.mainContent}>
        <div className={styles.topBar}></div>
        <div className={styles.contentWrapper}>
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
