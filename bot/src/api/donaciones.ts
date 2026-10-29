// Donaciones que avisa alguien de afuera: por WhatsApp (foto del comprobante) o desde la página web ("Ya doné").
// Quedan por confirmar y a la administración le llega "¿Te llegó la plata?" con dos botones:
// "Sí" la registra como ingreso (conversacion/comprobante.ts) y "No" la anula. Nada entra a la caja sin una persona.
import { buscarAdministradoras } from '../adopciones-agente/avisos.js'
import { textosAgente } from '../adopciones-agente/textos.js'
import { pesos } from '../formato.js'
import type { Accion, Deps, Salida } from '../tipos.js'

export interface AvisoDonacion {
  monto: number
  /** Quién avisa: "+573001234567" o "la página web" */
  de: string
  /** Medio, fecha, referencia, apodo… en una línea */
  detalle: string
  /** La foto del comprobante, si llegó */
  foto?: { datos: Buffer; mime: string; url: string }
}

/** Crea el registro por confirmar y le avisa a cada administradora. Devuelve el id del registro. */
export async function avisarDonacion(deps: Deps, d: AvisoDonacion): Promise<string> {
  const accion: Accion = {
    tipo: 'movimiento',
    movimiento: {
      tipo: 'ingreso',
      monto: d.monto,
      categoria: 'donacion',
      clinicaId: null,
      abonoDeuda: false,
      foto: d.foto?.url ?? null,
      nota: `Donación avisada por ${d.de}${d.detalle ? ` · ${d.detalle}` : ''}`.slice(0, 200),
    },
  }
  // Queda por confirmar (también se ve en la bandeja del panel) hasta que la administración diga si llegó
  const id = await deps.repo.crearRegistro({
    usuarioId: null,
    canal: 'whatsapp',
    tipoEntrada: d.foto ? 'imagen' : 'texto',
    mediaUrl: d.foto?.url ?? null,
    transcripcion: `Donación avisada por ${d.de}: ${pesos(d.monto)}${d.detalle ? ` · ${d.detalle}` : ''}`,
    acciones: [accion],
    confianza: null,
    estado: 'por_confirmar',
  })
  const admins = (await buscarAdministradoras(deps).catch(() => [])).filter((a) => a.rol === 'admin')
  for (const a of admins) {
    const mensajes: Salida[] = [
      ...(d.foto ? [{ tipo: 'imagen' as const, png: d.foto.datos, mime: d.foto.mime, texto: `🧾 Comprobante que mandó ${d.de}` }] : []),
      {
        tipo: 'botones',
        texto: textosAgente.comprobanteLlego(a.nombre, d.de, pesos(d.monto), d.detalle),
        botones: [
          { id: `cpb:si:${id}`, titulo: '✅ Sí, me llegó' },
          { id: `cpb:no:${id}`, titulo: '❌ No me llegó' },
        ],
      },
    ]
    try {
      for (const m of mensajes) await deps.wa.enviar(a.telefono, m)
    } catch (e) {
      console.error(`No se pudo avisar a ${a.nombre} de la donación:`, e instanceof Error ? e.message : e)
    }
  }
  return id
}
