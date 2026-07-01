/**
 * Servicio de carga de archivos GEA.
 *
 * Valida el tamaño en el cliente antes de enviar para dar feedback inmediato al usuario,
 * pero el servidor siempre aplica su propia validación de tamaño, extensión y tipo MIME
 * como barrera definitiva de seguridad.
 */
import api from './api';

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB — debe coincidir con spring.servlet.multipart.max-file-size

/**
 * Sube un archivo al servidor y retorna la URL pública de acceso.
 * @param {File} file - Archivo seleccionado por el usuario.
 * @returns {Promise<string>} URL pública del archivo subido.
 * @throws {Error} Si no hay archivo o supera los 10 MB.
 */
export const uploadArchivo = async (file) => {
  if (!file) {
    throw new Error('No se seleccionó ningún archivo.');
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error('El archivo supera el tamaño máximo permitido (10 MB).');
  }
  const formData = new FormData();
  formData.append('archivo', file);
  return await api.post('/comunicaciones/archivos/upload', formData);
};
