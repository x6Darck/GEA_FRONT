/**
 * Orden de roles para ordenar listas de usuarios en la UI.
 * Los valores numéricos más bajos aparecen primero (Super Administrador = 1).
 * `Otros` tiene peso 99 para que roles desconocidos queden al final.
 * @type {Record<string, number>}
 */
export const ROLE_ORDER = {
  'Super Administrador': 1,
  'SuperAdmin': 1,
  'Comunicaciones': 2,
  'Consultoria': 3,
  'Consultoría': 3,
  'Usuario Autenticado': 4,
  'Oficina': 5,
  'Otros': 99
};

export default {
  ROLE_ORDER
};
