// Audio, foto o texto → acciones, con Gemini Flash y salida JSON por esquema.
import { GoogleGenAI } from '@google/genai'
import { fechaLocal } from '../formato.js'
import type { DatosAlbergue } from '../panel-tipos.js'
import type { EntradaIa, Ia } from '../tipos.js'
import { convertir, ESQUEMA, type RespuestaCruda } from './esquema.js'
import { quitarDatosSensibles } from './redactar.js'

const ESPERA_MAXIMA_MS = 25_000

const INSTRUCCIONES = `Eres el ayudante del albergue de animales Huellitas (Colombia). El equipo te cuenta por WhatsApp, \
casi siempre en audio y con ruido de fondo (ladridos, agua), lo que acaba de hacer. Tu trabajo es anotar lo que YA pasó.

Reglas:
- Solo cuenta lo que ya ocurrió. "Le voy a dar", "toca darle", "hay que comprar" van con ya_ocurrio = false.
- dosis: usa el tratamiento_id de la lista DOSIS DE HOY que corresponda al animal y al medicamento. \
"hora" es la hora programada de esa dosis (HH:MM), no la hora actual.
- inventario: "abrí un bulto de perro" es especie perro, cantidad -1. "Llegaron 3 bultos de gato" es especie gato, cantidad 3.
- movimiento: plata que entró (ingreso) o salió (gasto), o un abono para pagar la deuda de una clínica (abono, con clinica_id). \
Montos en pesos enteros: "50 mil" = 50000, "un millón y medio" = 1500000, "$150.000" = 150000.
- Una captura de Nequi o de una transferencia recibida es un ingreso con categoría donacion, salvo que diga otra cosa.
- factura: compra a crédito en una clínica (sube la deuda). Lleva clinica_id, monto y en texto qué se compró.
- observacion: lo que se notó de un animal ("ya camina solito", "no quiso comer"). Lleva animal_id y texto corto.
- Los animales se nombran a veces con apodos o mal pronunciados: busca el más parecido en la lista.
- Si no entiendes nada útil, devuelve acciones vacías y confianza baja. Nunca inventes ids.
- transcripcion: lo que dijo la persona tal cual. Si es una foto, lo que dice en una frase.`

function contexto(datos: DatosAlbergue, ahora: Date): string {
  const hoy = fechaLocal(ahora)
  const animales = datos.animales
    .filter((a) => !['adoptado', 'fallecido'].includes(a.estado))
    .map((a) => `${a.id}: ${a.nombre} (${a.especie})`)
  const nombreAnimal = new Map(datos.animales.map((a) => [a.id, a.nombre]))
  const dosis = datos.tratamientos
    .filter((t) => t.inicio <= hoy && t.fin >= hoy)
    .map((t) => `tratamiento_id ${t.id}: ${nombreAnimal.get(t.animalId)} · ${t.medicamento} · ${t.dosis} · horas ${t.horas.join(', ')}`)
  const clinicas = datos.clinicas.map((c) => `${c.id}: ${c.nombre}`)
  const hora = ahora.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Bogota' })
  return [
    `HORA ACTUAL: ${hora}`,
    `ANIMALES (id: nombre):\n${animales.join('\n')}`,
    `DOSIS DE HOY:\n${dosis.join('\n') || '(ninguna)'}`,
    `CLÍNICAS (id: nombre):\n${clinicas.join('\n')}`,
  ].join('\n\n')
}

function conTiempoLimite<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolver, rechazar) => {
    const t = setTimeout(() => rechazar(new Error(`Gemini no respondió en ${ms / 1000} s`)), ms)
    p.then(
      (v) => (clearTimeout(t), resolver(v)),
      (e) => (clearTimeout(t), rechazar(e)),
    )
  })
}

export function crearIa(c: { apiKey: string; modelo: string }): Ia {
  const ai = new GoogleGenAI({ apiKey: c.apiKey })

  return {
    async entender(e: EntradaIa) {
      const partes: { text?: string; inlineData?: { mimeType: string; data: string } }[] = [
        { text: contexto(e.datos, e.ahora) },
      ]
      if (e.pista === 'factura') partes.push({ text: 'La persona está mandando la foto de una FACTURA de una clínica.' })
      if (e.texto) partes.push({ text: `MENSAJE:\n${quitarDatosSensibles(e.texto)}` })
      if (e.media) {
        partes.push({
          // WhatsApp manda 'audio/ogg; codecs=opus'; Gemini quiere el tipo sin parámetros
          inlineData: { mimeType: e.media.mime.split(';')[0].trim(), data: e.media.datos.toString('base64') },
        })
      }

      const r = await conTiempoLimite(
        ai.models.generateContent({
          model: c.modelo,
          contents: [{ role: 'user', parts: partes }],
          config: {
            systemInstruction: INSTRUCCIONES,
            responseMimeType: 'application/json',
            responseSchema: ESQUEMA,
            temperature: 0.1,
          },
        }),
        ESPERA_MAXIMA_MS,
      )
      const crudo = JSON.parse(r.text ?? '{}') as RespuestaCruda
      return convertir(crudo, e.datos, e.ahora)
    },
  }
}
