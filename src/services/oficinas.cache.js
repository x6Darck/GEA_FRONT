import api from './api';

// Caché a nivel módulo: la promesa se reutiliza mientras el módulo vive.
// Se invalida al mutar (crear/eliminar oficina), lo que no ocurre en esta app.
let _promise = null;

export const getOficinasCache = () => {
  if (!_promise) {
    _promise = api.get('/admin/oficinas')
      .then(data => Array.isArray(data) ? data : data?.data ?? [])
      .catch(err => { _promise = null; throw err; }); // clear on failure so next call retries
  }
  return _promise;
};

export const invalidateOficinasCache = () => {
  _promise = null;
};
