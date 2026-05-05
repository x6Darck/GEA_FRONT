import api from './api';

export const getTiposEvento = async () => {
  return await api.get('/usuario/tipos-evento');
};
