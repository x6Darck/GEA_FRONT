/**
 * Caché de oficinas a nivel de módulo ES.
 *
 * Reutiliza la misma promesa mientras el módulo esté cargado en memoria, evitando
 * peticiones duplicadas al backend cuando múltiples componentes montan en paralelo.
 * La invalidación manual existe para el caso (poco frecuente) de que un admin
 * cree o elimine una oficina durante la sesión.
 */
import api from './api';

let _promise = null;

/**
 * Retorna la lista de oficinas, usando la promesa cacheada si ya existe.
 * En caso de error de red, limpia el caché para que el siguiente llamado reintente.
 * @returns {Promise<Object[]>}
 */
export const getOficinasCache = () => {
  if (!_promise) {
    _promise = api.get('/admin/oficinas')
      .then(data => Array.isArray(data) ? data : data?.data ?? [])
      .catch(err => { _promise = null; throw err; }); // clear on failure so next call retries
  }
  return _promise;
};

/**
 * Fuerza la recarga de oficinas en el próximo llamado a {@link getOficinasCache}.
 * Llamar después de crear o eliminar una oficina para mantener la UI sincronizada.
 */
export const invalidateOficinasCache = () => {
  _promise = null;
};
