// Solicitud base para las pruebas de adopción: cumple todo (cae en 🟢). Cada prueba cambia lo que necesita.
import type { Solicitud } from '../../src/adopcion/tipos'

export function solicitud(parcial: Partial<Solicitud> = {}): Solicitud {
  return {
    id: 'sol-1',
    fecha: '2026-10-20T09:00:00',
    nombre: 'Laura Ortiz',
    telefono: '300 000 0001',
    cedula: '1.000.000.001',
    direccion: 'Calle 1 # 2-3, Bogotá',
    animalId: 'perro-1',
    familiaDeAcuerdo: true,
    paraQuien: 'yo',
    vivienda: 'casa',
    viviendaConMallas: true,
    dondeVivira: 'dentro_casa',
    aceptaEsterilizar: true,
    aceptaVacunar: true,
    aceptaSeguimiento: true,
    quiereEntregaInmediata: false,
    preguntoPorCaracter: true,
    planEmergencia: 'Si se enferma lo llevo a la clínica 24 horas del barrio; mi hermana me ayuda con los gastos.',
    mascotasAnteriores: 'Tuve una perrita 12 años, murió de vieja.',
    motivo: 'Quiero compañía para mis caminatas.',
    montonManual: null,
    nota: '',
    llamadaAgendada: null,
    ...parcial,
  }
}
