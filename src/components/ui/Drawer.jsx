import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import styles from './Drawer.module.css';

const CLOSE_MS = 250;

const Drawer = ({ isOpen, onClose, title, children, width = '550px' }) => {
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

  return (
    <div className={`${styles.overlay} ${isClosing ? styles.overlayClosing : ''}`}>
      <div
        className={`${styles.drawer} ${isClosing ? styles.drawerClosing : ''}`}
        style={{ width: `min(${width}, 100%)` }}
      >
        <div className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>
        <div className={styles.body}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default Drawer;
