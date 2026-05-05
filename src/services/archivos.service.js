import api from './api';

export const uploadArchivo = async (file) => {
  const formData = new FormData();
  formData.append('archivo', file);
  return await api.post('/comunicaciones/archivos/upload', formData);
};
