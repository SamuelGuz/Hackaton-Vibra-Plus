// Lo que Gemini debe devolver y cómo se convierte en acciones válidas.
// La IA solo propone: todo id que no exista en la base se descarta aquí.

import { Type, type Schema } from '@google/genai'
import type { CategoriaGasto, CategoriaIngreso, DatosAlbergue } from '../panel-tipos.js'
import { MAX_KG } from '../conversacion/kilos.js'
import { parsearMonto } from '../conversacion/numeros.js'
import { TIPOS_INFORME, type TipoInforme } from '../informes/armar.js'
import type { Accion, Entendido } from '../tipos.js'

export const CATEGORIAS_GASTO: CategoriaGasto[] = ['comida', 'veterinaria', 'limpieza', 'servicios', 'transporte', 'otro']
export const CATEGORIAS_INGRESO: CategoriaIngreso[] = ['donacion', 'padrino', 'rifa', 'otro']

export const ESQUEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    transcripcion: { type: Type.STRING, description: 'Lo que dijo la persona palabra por palabra, o lo que dice la foto en una frase' },
    confianza: { type: Type.NUMBER, description: 'De 0 a 1, qué tan seguro estás de haber entendido' },
    acciones: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          tipo: { type: Type.STRING, enum: ['dosis', 'inventario', 'movimiento', 'factura', 'observacion'] },
          ya_ocurrio: { type: Type.BOOLEAN, description: 'false si la persona dice que lo va a hacer, que toca o que hay que hacerlo' },
          animal_id: { type: Type.STRING },
          tratamiento_id: { type: Type.STRING },
          hora: { type: Type.STRING, description: 'Hora programada de la dosis, formato HH:MM' },
          especie: { type: Type.STRING, enum: ['perro', 'gato'] },
          cantidad: { type: Type.NUMBER, description: 'Bultos o kilos: negativo si se abrió o se gastó, positivo si llegó' },
          unidad: { type: Type.STRING, enum: ['bultos', 'kilos'], description: 'kilos si la persona habla de kilos sueltos (carne, recortes, menudencia)' },
          producto: { type: Type.STRING, description: 'En kilos sueltos: qué llegó o se gastó (carne, menudencia, huesos…)' },
          movimiento: { type: Type.STRING, enum: ['ingreso', 'gasto', 'abono'] },
          monto: { type: Type.NUMBER, description: 'Pesos colombianos enteros' },
          categoria: { type: Type.STRING, enum: [...new Set([...CATEGORIAS_GASTO, ...CATEGORIAS_INGRESO])] },
          clinica_id: { type: Type.STRING },
          texto: { type: Type.STRING, description: 'Nota corta en palabras de la persona' },
        },
        required: ['tipo', 'ya_ocurrio'],
      },
    },
    respuesta: {
      type: Type.STRING,
      description: 'Si la persona pregunta, saluda, agradece o conversa: tu respuesta corta con los DATOS. Si solo cuenta lo que hizo: vacío',
    },
    informe: {
      type: Type.STRING,
      enum: ['ninguno', ...TIPOS_INFORME],
      description: 'Si la persona PIDE ver un informe, reporte, gráfica o resumen, cuál. Si no pide nada de eso: ninguno',
    },
  },
  required: ['transcripcion', 'confianza', 'acciones'],
}

export interface AccionCruda {
  tipo: string
  ya_ocurrio: boolean
  animal_id?: string
  tratamiento_id?: string
  hora?: string
  especie?: string
  cantidad?: number
  unidad?: string
  producto?: string
  movimiento?: string
  monto?: number
  categoria?: string
  clinica_id?: string
  texto?: string
}

export interface RespuestaCruda {
  transcripcion: string
  confianza: number
  acciones: AccionCruda[]
  informe?: string
  respuesta?: string
}

function minutos(hora: string): number {
  const [h, m] = hora.split(':').map(Number)
  return h * 60 + m
}

/** La hora programada más cercana a `ahora`, para cuando la persona no dice cuál dosis fue */
export function horaMasCercana(horas: string[], ahora: Date): string {
  const actual = ahora.getHours() * 60 + ahora.getMinutes()
  return [...horas].sort((a, b) => Math.abs(minutos(a) - actual) - Math.abs(minutos(b) - actual))[0]
}

const montoValido = (m: unknown): m is number => typeof m === 'number' && Number.isFinite(m) && m > 0

/** Valida lo que devolvió la IA contra los datos reales del albergue. */
export function convertir(crudo: RespuestaCruda, datos: DatosAlbergue, ahora: Date): Entendido {
  const acciones: Accion[] = []
  let futuras = 0
  let factura: Entendido['factura']
  const animal = (id?: string) => datos.animales.find((a) => a.id === id)
  const clinica = (id?: string) => datos.clinicas.find((c) => c.id === id)
  // A veces la IA entiende la plata pero deja el monto vacío: se lee de su nota o, si es la única
  // plata del mensaje, de lo que dijo la persona.
  const conPlata = (crudo.acciones ?? []).filter((a) => a.ya_ocurrio !== false && (a.tipo === 'movimiento' || a.tipo === 'factura'))
  const montoDe = (a: AccionCruda): number | null => {
    if (montoValido(a.monto)) return Math.round(a.monto)
    return parsearMonto(a.texto ?? '') ?? (conPlata.length === 1 ? parsearMonto(crudo.transcripcion ?? '') : null)
  }

  for (const a of crudo.acciones ?? []) {
    if (a.ya_ocurrio === false) {
      futuras++
      continue
    }
    switch (a.tipo) {
      case 'dosis': {
        const t = datos.tratamientos.find((x) => x.id === a.tratamiento_id)
        if (!t || t.horas.length === 0) break
        const hora = a.hora && t.horas.includes(a.hora) ? a.hora : horaMasCercana(t.horas, ahora)
        acciones.push({ tipo: 'dosis', animalId: t.animalId, tratamientoId: t.id, hora })
        break
      }
      case 'observacion': {
        const texto = a.texto?.trim()
        if (animal(a.animal_id) && texto) acciones.push({ tipo: 'nota', animalId: a.animal_id!, texto })
        break
      }
      case 'inventario': {
        if (a.unidad === 'kilos') {
          // Los kilos sueltos casi siempre son carne para los perros
          const kg = Math.round((a.cantidad ?? 0) * 10) / 10
          if (kg !== 0 && Math.abs(kg) <= MAX_KG) {
            const especie = a.especie === 'gato' ? 'gato' : 'perro'
            acciones.push({ tipo: 'inventario', especie, cambio: kg, unidad: 'kg', producto: a.producto?.trim().toLowerCase() || 'carne' })
          }
          break
        }
        const cambio = Math.round(a.cantidad ?? 0)
        if ((a.especie === 'perro' || a.especie === 'gato') && cambio !== 0) {
          acciones.push({ tipo: 'inventario', especie: a.especie, cambio })
        }
        break
      }
      case 'movimiento': {
        const monto = montoDe(a)
        if (!monto) break
        if (a.movimiento === 'abono') {
          if (!clinica(a.clinica_id)) break
          acciones.push({
            tipo: 'movimiento',
            movimiento: { tipo: 'gasto', monto, categoria: 'veterinaria', clinicaId: a.clinica_id!, abonoDeuda: true, foto: null, nota: a.texto ?? '' },
          })
          break
        }
        const tipo = a.movimiento === 'ingreso' ? 'ingreso' : 'gasto'
        const validas: string[] = tipo === 'ingreso' ? CATEGORIAS_INGRESO : CATEGORIAS_GASTO
        const categoria = (a.categoria && validas.includes(a.categoria) ? a.categoria : 'otro') as CategoriaGasto
        acciones.push({
          tipo: 'movimiento',
          movimiento: {
            tipo,
            monto,
            categoria,
            clinicaId: clinica(a.clinica_id) ? a.clinica_id! : null,
            abonoDeuda: false,
            foto: null,
            nota: a.texto ?? '',
          },
        })
        break
      }
      case 'factura': {
        const k = clinica(a.clinica_id)
        const monto = montoDe(a)
        factura = { monto, clinicaId: k ? k.id : null, concepto: a.texto ?? '' }
        if (k && monto) acciones.push({ tipo: 'deuda', clinicaId: k.id, monto, nota: a.texto ?? '' })
        break
      }
    }
  }

  const confianza = Math.min(1, Math.max(0, Number(crudo.confianza) || 0))
  const informe = TIPOS_INFORME.includes(crudo.informe as TipoInforme) ? (crudo.informe as TipoInforme) : undefined
  const respuesta = typeof crudo.respuesta === 'string' ? sinEco(crudo.respuesta.trim()).slice(0, 1200) : ''
  return { transcripcion: sinEco(crudo.transcripcion ?? ''), acciones, confianza, futuras, factura, informe, respuesta }
}

/** Algunos modelos de respaldo "transcriben" la lista interna que se les pasa en vez de lo que dijo la persona */
const ECO_DEL_CONTEXTO = /HORA ACTUAL:|ANIMALES \(id|DOSIS DE HOY:|CLÍNICAS \(id|tratamiento_id \d/
const sinEco = (t: string) => (ECO_DEL_CONTEXTO.test(t) ? '' : t)
