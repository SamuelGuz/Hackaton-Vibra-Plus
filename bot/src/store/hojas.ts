// Encabezados de las pestañas de Google Sheets (placa viva Task 17, adaptada al modelo compartido: D3 y D4).
// Cada pestaña lleva en su fila 1 estos encabezados, en este orden; los mappers (mappers.ts) leen y escriben por nombre.
//
// Nombres de pestaña de placa viva con su equivalente en el modelo compartido:
//   Usuarios -> Persona · Eventos -> Registro · Entidades -> Clinica · Catalogo -> ItemCatalogo
// `Eventos` tiene exactamente los campos de `Registro`; `propuesta` va como JSON en una sola celda.
// Las listas (alias, advertencias, horas) van separadas con `|`; los booleanos como TRUE/FALSE.

export const HOJAS: Record<string, string[]> = {
  /** Persona: el equipo. `telefono` en E.164 sin "+". */
  Usuarios: ['id', 'nombre', 'cargo', 'rol', 'color', 'foto', 'telefono', 'activo'],
  /** Pares clave/valor: parámetros de placa viva, consumo de comida y punto de partida de /api/hoy. */
  Config: ['clave', 'valor'],
  Animales: ['id', 'nombre', 'especie', 'estado', 'foto', 'fechaIngreso', 'advertencias', 'caracter', 'padrino', 'codigo', 'alias', 'canil'],
  Tratamientos: ['id', 'animalId', 'medicamento', 'dosis', 'horas', 'inicio', 'fin', 'critico', 'activo'],
  /** Registro: la bitácora. */
  Eventos: [
    'id',
    'fechaHora',
    'agenteId',
    'origen',
    'estado',
    'propuesta',
    'fraseExacta',
    'confianza',
    'registroIaId',
    'mediaUrl',
    'compromisoId',
    'confirmadoPor',
    'confirmadoEn',
  ],
  Catalogo: ['id', 'nombre', 'tipo', 'kgPorUnidad', 'especieObjetivo', 'consumoDiarioKgPorAnimal'],
  /** Clinica: `deuda` es la deuda base; la de hoy suma las deudas y abonos de Eventos. */
  Entidades: ['id', 'nombre', 'deuda', 'limite'],
  Padrinazgos: ['id', 'personaTelefono', 'personaNombre', 'animalId', 'activo'],
  /** Auditoría de cada llamada a la IA (la escribe el flujo de registro; sin teléfonos ni cédulas). Sin mapper: nada del modelo la lee. */
  RegistrosIA: ['registroIaId', 'fechaHora', 'agenteId', 'origen', 'entrada', 'salida', 'modelo', 'latenciaMs'],
  /** Solicitud de adopción (Google Form). Trae cédula y dirección: nunca va a Gemini. */
  Solicitudes: [
    'id',
    'fecha',
    'nombre',
    'telefono',
    'cedula',
    'direccion',
    'animalId',
    'familiaDeAcuerdo',
    'paraQuien',
    'destinatario',
    'vivienda',
    'viviendaConMallas',
    'dondeVivira',
    'aceptaEsterilizar',
    'aceptaVacunar',
    'aceptaSeguimiento',
    'quiereEntregaInmediata',
    'preguntoPorCaracter',
    'planEmergencia',
    'mascotasAnteriores',
    'motivo',
    'montonManual',
    'nota',
    'llamadaAgendada',
  ],
  Seguimientos: ['id', 'solicitudId', 'adoptanteNombre', 'adoptanteTelefono', 'animalId', 'fechaEntrega', 'dia', 'fecha', 'resultado', 'llamadaHumana', 'nota'],
}
