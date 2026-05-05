import api from './api';

export const getOficinas = async (config = {}) => {
  return await api.get('/admin/oficinas', config);
};
