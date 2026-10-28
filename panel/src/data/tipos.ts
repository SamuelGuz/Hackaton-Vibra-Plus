// Modelo de datos del panel. Vive en shared/ (@huellitas/shared) para que el panel y el servidor
// usen los mismos tipos (docs/PLAN_INTEGRADO.md, §3.2); este archivo solo lo reexporta.
// Los tipos de vista que sean solo del panel se declaran aquí, debajo de la reexportación.
export type * from '@huellitas/shared/tipos'
