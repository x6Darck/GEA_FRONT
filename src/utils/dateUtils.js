/**
 * Utilidades para el manejo de fechas en CALLAPP.
 * Garantiza que las fechas enviadas por el backend (LocalDate/LocalDateTime)
 * sean interpretadas correctamente en el entorno local del usuario sin desplazamientos por Timezone.
 */

/**
 * Parsea una cadena de fecha (YYYY-MM-DD o ISO) a un objeto Date local.
 * Si solo viene la fecha, se asume medianoche local.
 */
export const parseLocalDate = (dateStr) => {
  if (!dateStr) return null;
  
  // Si contiene 'T', es un ISO completo o LocalDateTime
  if (dateStr.includes('T')) {
    // Si ya trae zona horaria (Z o +/-), lo dejamos al constructor de JS
    if (dateStr.endsWith('Z') || /[-+]\d{2}:?\d{2}$/.test(dateStr)) {
      return new Date(dateStr);
    }
    // Si no trae zona, lo tratamos como LocalDateTime (Local al usuario)
    // Reemplazamos 'T' por un espacio para que la mayoría de navegadores lo traten como Local
    return new Date(dateStr.replace('T', ' '));
  }
  
  // Si es solo YYYY-MM-DD
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // 0-indexed
    const day = parseInt(parts[2], 10);
    return new Date(year, month, day);
  }
  
  return new Date(dateStr);
};

/**
 * Formatea una fecha local para mostrar en la UI.
 * @param {string|Date} date - La fecha a formatear
 * @param {Object} options - Opciones de toLocaleDateString
 */
export const formatLocalDate = (date, options = { day: 'numeric', month: 'short' }) => {
  const d = typeof date === 'string' ? parseLocalDate(date) : date;
  if (!d || isNaN(d.getTime())) return 'Pendiente';
  return d.toLocaleDateString('es-ES', options);
};

/**
 * Obtiene la fecha de hoy en formato YYYY-MM-DD local.
 */
export const getTodayStr = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * Compara si dos fechas son el mismo día (local).
 */
export const isSameDay = (d1, d2) => {
  const date1 = typeof d1 === 'string' ? parseLocalDate(d1) : d1;
  const date2 = typeof d2 === 'string' ? parseLocalDate(d2) : d2;
  
  if (!date1 || !date2) return false;
  
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

export default {
  parseLocalDate,
  formatLocalDate,
  getTodayStr,
  isSameDay
};
