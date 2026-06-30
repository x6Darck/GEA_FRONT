import api from './api';

// Límite de tamaño de archivo en cliente (el servidor sigue siendo la barrera definitiva)
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

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
