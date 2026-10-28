// Albergue de prueba para el motor de respuestas: 10 animales con casos distintos, medicinas falsas y una base
// de conocimiento corta. Todo inventado, todo determinista.
import type { Animal, DatosAlbergue } from '../../src/panel-tipos.js'
import type { Contacto, DatosMedicinas, LoteQueVence, ResumenMedicamento, ServicioMedicinas, TipoContacto } from '../../src/medicinas/tipos.js'
import { crearRag } from '../../src/rag/servicio.js'
import { crearRespuestas, type OpcionesRespuestas } from '../../src/rag/respuestas.js'
import type { EntradaConocimiento, Llm, PerfilCurado, ServicioRespuestas } from '../../src/rag/tipos.js'
import { AHORA, datosDePrueba } from '../fakes.js'

export { AHORA }

const animal = (a: Partial<Animal> & Pick<Animal, 'id' | 'nombre'> & { alias?: string[] }): Animal =>
  ({ especie: 'perro', estado: 'adoptable', foto: null, fechaIngreso: '2026-03-10', advertencias: [], caracter: '', padrino: null, ...a }) as Animal

export function datosRespuestas(): DatosAlbergue {
  const d = datosDePrueba()
  d.animales = [
    animal({ id: '1', nombre: 'Mateo', estado: 'tratamiento', fechaIngreso: '2026-01-05', padrino: 'Familia Ríos', advertencias: ['Todavía no puede subir escaleras ni saltar.'] }),
    animal({ id: '2', nombre: 'Rocky', fechaIngreso: '2026-06-20' }),
    animal({ id: '3', nombre: 'Tobías', estado: 'hogar_temporal', fechaIngreso: '2025-11-02', alias: ['Tobi', 'Toby'] }),
    animal({ id: '4', nombre: 'Luna', especie: 'gato', padrino: 'Valentina G.', fechaIngreso: '2026-02-14' }),
    animal({ id: '5', nombre: 'Firulais', estado: 'adoptado' }),
    animal({ id: '6', nombre: 'Pepe', estado: 'fallecido' }),
    animal({ id: '7', nombre: 'Canela', fechaIngreso: '2026-09-01' }),
    animal({ id: '8', nombre: 'Pelusa', especie: 'gato', fechaIngreso: '2024-12-01' }),
    animal({ id: '9', nombre: 'Max', padrino: 'Ana M.', fechaIngreso: '2026-04-18' }),
    animal({ id: '10', nombre: 'Bruno', estado: 'cuarentena', fechaIngreso: '2026-10-20' }),
  ]
  d.tratamientos = [
    { id: 't1', animalId: '1', medicamento: 'Amoxicilina', dosis: '3 ml', horas: ['08:00', '20:00'], inicio: '2026-10-20', fin: '2026-11-05' },
    { id: 't2', animalId: '1', medicamento: 'Meloxicam', dosis: '0,5 pastilla', horas: ['08:00'], inicio: '2026-10-20', fin: '2026-10-30' },
    { id: 't3', animalId: '3', medicamento: 'Fenobarbital', dosis: '1 pastilla', horas: ['14:00'], inicio: '2026-10-01', fin: '2026-12-31' },
    { id: 't4', animalId: '8', medicamento: 'Gotas para los ojos', dosis: '2 gotas', horas: ['08:00', '14:00', '20:00'], inicio: '2026-11-10', fin: '2026-11-20' },
  ]
  d.dosisDadas = [{ id: 'd1', tratamientoId: 't1', hora: '08:00', fechaHora: '2026-10-27T08:10', quien: '1', origen: 'bot' }]
  d.notas = [
    { id: 'n1', animalId: '2', texto: 'Ya comió todo su concentrado', fechaHora: '2026-10-27T09:00', quien: '1' },
    { id: 'n2', animalId: '9', texto: 'No quiso comer en la mañana', fechaHora: '2026-10-27T09:30', quien: '1' },
  ]
  d.movimientos = [
    { id: 'm1', fechaHora: '2026-10-26T09:10', tipo: 'ingreso', monto: 40_000, categoria: 'padrino', clinicaId: null, abonoDeuda: false, foto: null, quien: '3', nota: 'Padrino de Luna' },
  ]
  d.vidasCambiadas = 214
  return d
}

export const PERFILES_RESP: Record<string, PerfilCurado> = {
  mateo: {
    edadAnios: 9, tamano: 'mediano', personalidad: ['viejito', 'tranquilo', 'consentido'], historia: 'Lo atropellaron en la vía. Después de la cirugía es el consentido del albergue.',
    compatibilidad: { ninos: true, gatos: null, perros: true, apartamento: true }, necesidadesMedicas: ['Evitar escaleras'], mensualCOP: 60000,
    vacunado: true, esterilizado: true, desparasitado: true, microchip: false, pesoKg: 18, comidaFavorita: 'Pollo desmechado con arroz', rutinaDia: 'Duerme hasta las 8, camina un rato por el patio y toma el sol en la tarde.',
    cuidadosEspeciales: ['Superficies antideslizantes'], curiosidades: ['Se sabe el sonido del bulto de comida'], fechaRescate: '2026-01-05', lugarRescate: 'la vía a Girardota',
  },
  rocky: {
    edadAnios: 2, tamano: 'grande', personalidad: ['juguetón', 'enérgico'], historia: 'Llegó cachorro a la fundación y no ha dejado de correr desde entonces.',
    compatibilidad: { ninos: true, gatos: false, perros: true, apartamento: false }, necesidadesMedicas: [], pesoKg: 32, vacunado: true, esterilizado: false,
  },
  toby: {
    edadAnios: 3, tamano: 'mediano', personalidad: ['tranquilo', 'cariñoso'], historia: 'Lo encontraron bajo un puente, con frío. Aun así mueve la cola con todos.',
    compatibilidad: { ninos: true, gatos: null, perros: true, apartamento: true }, necesidadesMedicas: [], pesoKg: 15, vacunado: true, esterilizado: true, comidaFavorita: 'Pollo cocido',
  },
  tobias: {
    edadAnios: 3, tamano: 'mediano', personalidad: ['tranquilo', 'cariñoso'], historia: 'Lo encontraron bajo un puente, con frío. Aun así mueve la cola con todos.',
    compatibilidad: { ninos: true, gatos: null, perros: true, apartamento: true }, necesidadesMedicas: ['Fenobarbital para las convulsiones'], pesoKg: 15, vacunado: true, esterilizado: true, comidaFavorita: 'Pollo cocido',
  },
  luna: {
    edadAnios: 2, tamano: 'pequeno', personalidad: ['independiente'], historia: 'Apareció en una caja de cartón frente a una tienda. Hoy ronronea en cualquier regazo.',
    compatibilidad: { ninos: true, gatos: true, perros: false, apartamento: true }, necesidadesMedicas: [], pesoKg: 3.5, vacunado: true, esterilizado: true,
  },
  canela: {
    edadAnios: 1, tamano: 'mediano', personalidad: ['tímida', 'dulce'], historia: 'La dejaron amarrada en la portería de una finca. Poco a poco confía en las personas.',
    compatibilidad: { ninos: null, gatos: null, perros: null, apartamento: true }, necesidadesMedicas: [],
  },
  pelusa: {
    edadAnios: 10, tamano: 'pequeno', personalidad: ['tranquila', 'viejita', 'cariñosa'], historia: 'Vivió con una señora que falleció; llegó al refugio con diez años y mucho amor.',
    compatibilidad: { ninos: false, gatos: true, perros: null, apartamento: true }, necesidadesMedicas: ['Gotas para los ojos'],
  },
  max: {
    edadAnios: 5, tamano: 'grande', personalidad: ['guardián', 'ladrador', 'leal'], historia: 'Cuidaba una finca y avisaba de cualquier visita con sus ladridos.',
    compatibilidad: { ninos: true, gatos: false, perros: null, apartamento: false }, necesidadesMedicas: [], pesoKg: 30,
  },
  bruno: {
    edadAnios: 6, tamano: 'mediano', personalidad: ['noble', 'se estresa con los cambios'], historia: 'Es noble y tranquilo, aunque se pone nervioso con los cambios bruscos.',
    compatibilidad: { ninos: true, gatos: null, perros: null, apartamento: true }, necesidadesMedicas: ['Baño con champú medicado'], pesoKg: 20,
  },
}

export const CONOCIMIENTO_RESP: EntradaConocimiento[] = [
  {
    id: 'adoptar-proceso', tema: 'adopcion', preguntas: ['¿Cómo puedo adoptar?', '¿Cuál es el proceso de adopción?', '¿Qué pasos debo seguir para adoptar un perro?', '¿Qué requisitos piden para adoptar?'],
    respuesta: 'Para adoptar llenas un formulario, hablas con una asesora, nos visitas para conocer al peludito y firmas un compromiso de adopción. Hacemos seguimiento los primeros meses.', palabrasClave: ['adoptar', 'adopcion', 'requisitos', 'proceso', 'formulario'],
  },
  {
    id: 'adoptar-costo', tema: 'adopcion', preguntas: ['¿Cuánto cuesta adoptar?', '¿Adoptar tiene algún costo?', '¿Cobran por adoptar un perro?'],
    respuesta: 'Adoptar no tiene costo, pero te pedimos cubrir la esterilización si aún no la tiene y mantener sus vacunas al día.', palabrasClave: ['costo', 'cuesta', 'cobran', 'precio adopcion'],
  },
  {
    id: 'apadrinar', tema: 'apadrinamiento', preguntas: ['¿Cómo apadrino a un perrito?', '¿Cuánto cuesta ser padrino?', '¿Qué es apadrinar?'],
    respuesta: 'Apadrinar es aportar cada mes para la comida y los cuidados de un peludito, desde $20.000 COP. Tú escoges a quién apadrinar y te mandamos noticias suyas.', palabrasClave: ['apadrinar', 'padrino', 'apadrinamiento', 'aporte mensual'],
  },
  {
    id: 'donar', tema: 'donaciones', preguntas: ['¿Cómo puedo donar?', '¿Dónde hago una donación?', '¿Aceptan donaciones de plata?'],
    respuesta: 'Puedes donar por transferencia o llevando comida, medicinas y cobijas a la fundación. Escríbenos por WhatsApp y te damos los datos.', palabrasClave: ['donar', 'donacion', 'transferencia', 'cobijas'],
  },
  {
    id: 'visitas', tema: 'visitas', preguntas: ['¿Cuál es el horario de visitas?', '¿Puedo visitar el refugio?', '¿Qué días puedo ir a conocer a los perros?'],
    respuesta: 'Recibimos visitas los sábados y domingos de 10:00 a. m. a 4:00 p. m., con cita previa por WhatsApp.', palabrasClave: ['visita', 'visitar', 'horario', 'conocer', 'cita'],
  },
  {
    id: 'voluntariado', tema: 'voluntariado', preguntas: ['¿Cómo puedo ser voluntario?', '¿Necesitan voluntarios?', '¿Puedo ayudar paseando perros?'],
    respuesta: 'Necesitamos voluntarios para paseos, baños y eventos. Llena el formulario de voluntariado y te asignamos un turno según tu tiempo.', palabrasClave: ['voluntario', 'voluntariado', 'turno', 'paseos'],
  },
  {
    id: 'devolucion', tema: 'devoluciones', preguntas: ['¿Qué pasa si no me puedo quedar con el perro?', '¿Puedo devolver un animal adoptado?'],
    respuesta: 'Si por algún motivo no puedes seguir con tu peludito, nos avisas y él vuelve al refugio: nunca debe quedar en la calle.', palabrasClave: ['devolver', 'devolucion', 'regresar'],
  },
  {
    id: 'comida-donar', tema: 'comida', preguntas: ['¿Qué comida les puedo llevar?', '¿Qué concentrado necesitan?'],
    respuesta: 'Recibimos concentrado para perros y gatos adultos, sellado y sin vencer, además de latas para los viejitos.', palabrasClave: ['comida', 'concentrado', 'alimento', 'latas'],
  },
]

/** Catálogo de medicinas falso. Se pasa a crearRespuestas como ServicioMedicinas. */
export class MedicinasFalsas implements ServicioMedicinas {
  llamadas = 0
  private d: DatosMedicinas = {
    medicamentos: [
      { id: 'm1', nombre: 'Amoxicilina', alias: ['amoxi'], principioActivo: 'amoxicilina', categoria: 'antibiotico', presentacion: 'Jarabe de 60 ml y tabletas de 500 mg', unidad: 'frasco', especies: ['perro', 'gato'], usoComun: 'Infecciones bacterianas de piel, oído y heridas.', dosisReferencia: '10 a 20 mg por kg cada 12 horas.', contraindicaciones: 'Alergia a las penicilinas.', requiereFormula: true, stockMinimo: 10, proveedorId: 'c1', precioUnitarioCOP: 18_500 },
      { id: 'm2', nombre: 'Meloxicam', alias: ['meloxicam'], principioActivo: 'meloxicam', categoria: 'antiinflamatorio', presentacion: 'Tabletas de 7,5 mg', unidad: 'tableta', especies: ['perro'], usoComun: 'Dolor e inflamación, por ejemplo después de una cirugía.', dosisReferencia: '0,1 mg por kg una vez al día.', contraindicaciones: 'No usar en gatos ni con problemas de riñón.', requiereFormula: true, stockMinimo: 20, proveedorId: 'c1', precioUnitarioCOP: 2_200 },
      { id: 'm3', nombre: 'Ivermectina', alias: ['ivermec'], principioActivo: 'ivermectina', categoria: 'antiparasitario', presentacion: 'Solución inyectable de 50 ml', unidad: 'frasco', especies: ['perro', 'gato'], usoComun: 'Parásitos de la piel, sarna y garrapatas.', dosisReferencia: '0,2 mg por kg.', contraindicaciones: 'Cuidado en collies y razas similares.', requiereFormula: false, stockMinimo: 2, proveedorId: null, precioUnitarioCOP: 32_000 },
    ],
    lotes: [
      { id: 'l1', medicamentoId: 'm1', numeroLote: 'A-77', vence: '2026-11-15', cantidad: 6, ingreso: '2026-08-01' },
      { id: 'l2', medicamentoId: 'm2', numeroLote: 'M-12', vence: '2027-03-01', cantidad: 120, ingreso: '2026-09-01' },
      { id: 'l3', medicamentoId: 'm3', numeroLote: 'I-03', vence: '2027-01-10', cantidad: 4, ingreso: '2026-07-01' },
    ],
    contactos: [
      { id: 'c1', tipo: 'proveedor', nombre: 'Droguería Veterinaria El Corral', telefono: '3105550101', correo: 'ventas@elcorral.example', ciudad: 'Medellín', nota: 'Entrega los martes.', activo: true },
      { id: 'c2', tipo: 'padrino', nombre: 'Familia Ríos', telefono: '3205550202', correo: 'rios@example.com', ciudad: 'Medellín', nota: '', activo: true },
    ],
  }
  async datos() {
    this.llamadas++
    return this.d
  }
  private resumen(id: string): ResumenMedicamento | null {
    const m = this.d.medicamentos.find((x) => x.id === id)
    if (!m) return null
    const lotes = this.d.lotes.filter((l) => l.medicamentoId === id)
    const stock = lotes.reduce((s, l) => s + l.cantidad, 0)
    return { medicamento: m, stock, lotes, bajoMinimo: stock < m.stockMinimo, venceProximo: lotes.map((l) => l.vence).sort()[0] ?? null, proveedor: this.d.contactos.find((c) => c.id === m.proveedorId) ?? null }
  }
  async buscar(texto: string, limite = 5) {
    const t = texto.toLowerCase()
    return this.d.medicamentos
      .filter((m) => [m.nombre, m.usoComun, m.categoria, m.principioActivo, ...m.alias].join(' ').toLowerCase().split(/\W+/).some((w) => w.length > 3 && t.includes(w)))
      .slice(0, limite)
      .map((m) => this.resumen(m.id)!)
  }
  async porId(id: string) {
    return this.resumen(id)
  }
  async stockBajo() {
    return this.d.medicamentos.map((m) => this.resumen(m.id)!).filter((r) => r.bajoMinimo)
  }
  async porVencer(dias: number, ahora: Date): Promise<LoteQueVence[]> {
    const limite = ahora.getTime() + dias * 86_400_000
    return this.d.lotes
      .filter((l) => new Date(l.vence).getTime() <= limite && new Date(l.vence).getTime() >= ahora.getTime())
      .map((lote) => ({ ...this.resumen(lote.medicamentoId)!, lote, diasRestantes: Math.ceil((new Date(lote.vence).getTime() - ahora.getTime()) / 86_400_000) }))
  }
  async vencidos(): Promise<LoteQueVence[]> {
    return []
  }
  async contactos(tipo?: TipoContacto): Promise<Contacto[]> {
    return this.d.contactos.filter((c) => !tipo || c.tipo === tipo)
  }
  async diasDeStock() {
    return 3.4
  }
}

export interface MontajeResp {
  rag: ReturnType<typeof crearRag>
  crear: (o?: Partial<OpcionesRespuestas>) => ServicioRespuestas
}

export function montarRespuestas(opciones: { datos?: () => DatosAlbergue; llm?: Llm } = {}): MontajeResp {
  const fuente = opciones.datos ?? datosRespuestas
  const rag = crearRag({ datos: async () => fuente(), ahora: () => AHORA, perfiles: PERFILES_RESP, ttlMs: 0 })
  return {
    rag,
    crear: (o = {}) =>
      crearRespuestas({ rag, datos: async () => fuente(), conocimiento: CONOCIMIENTO_RESP, ahora: () => AHORA, medicinas: new MedicinasFalsas(), whatsappPublico: '573001234567', llm: opciones.llm, ...o }),
  }
}
