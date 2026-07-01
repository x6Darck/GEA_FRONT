/**
 * Modal base de GEA con animación de apertura y cierre.
 *
 * Mantiene el componente en el DOM durante `CLOSE_MS` milisegundos después de que
 * `isOpen` cambia a `false`, para que la animación CSS de salida termine antes de
 * desmontar. `renderRef` evita activar la animación de salida en el primer render
 * cuando el modal ya empieza cerrado.
 * Bloquea el scroll del body mientras está abierto y lo restaura al cerrar.
 * El clic fuera del panel (en el overlay) llama a `onClose`.
 *
 * @param {boolean} isOpen
 * @param {Function} onClose
 * @param {string} title
 * @param {React.ReactNode} children
 * @param {React.CSSProperties} [style] - Estilos adicionales para el panel.
 * @param {React.CSSProperties} [bodyStyle] - Estilos adicionales para el cuerpo.
 */
import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import styles from './Modal.module.css';

const CLOSE_MS = 200;

const Modal = ({ isOpen, onClose, title, children, style = {}, bodyStyle = {} }) => {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);
  const renderRef = useRef(isOpen);

  useEffect(() => {
    if (isOpen) {
      renderRef.current = true;
      setShouldRender(true);
      setIsClosing(false);
    } else if (renderRef.current) {
      setIsClosing(true);
      const t = setTimeout(() => {
        renderRef.current = false;
        setShouldRender(false);
        setIsClosing(false);
      }, CLOSE_MS);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'auto';
    return () => { document.body.style.overflow = 'auto'; };
  }, [isOpen]);

  if (!shouldRender) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className={`${styles.overlay} ${isClosing ? styles.overlayClosing : ''}`}
      onClick={handleBackdropClick}
    >
      <div
        className={`${styles.modal} ${isClosing ? styles.modalClosing : ''}`}
        style={{ ...style }}
      >
        <div className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>
        <div className={styles.body} style={{ ...bodyStyle }}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
