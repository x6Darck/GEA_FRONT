import api from './api';

const getLugaresFisicos = async () => {
  return await api.get('/lugares-fisicos');
};

export default {
  getLugaresFisicos,
};
