// Datos de ejemplo para las pruebas de la landing (no se usan en la app).
import type { PerritoPublico, RespuestaAgenteVoz, RespuestaBusqueda, RespuestaPerritos } from './tipos'

export function perritoEjemplo(parcial: Partial<PerritoPublico> = {}): PerritoPublico {
  return {
    id: 'toby',
    nombre: 'Toby',
    especie: 'perro',
    estado: 'adoptable',
    edadAnios: 3,
    edadTexto: '3 años',
    tamano: 'mediano',
    personalidad: ['juguetón', 'cariñoso'],
    historia: 'Toby llegó con una patica herida y hoy se duerme sobre tus zapatos.',
    historiaConfirmada: true,
    compatibilidad: { ninos: true, gatos: null, perros: true, apartamento: true },
    necesidadesMedicas: [],
    meta: { mensualCOP: 300000, padrinos: 4, cubiertoPct: 40 },
    foto: null,
    urgencia: 0.3,
    adoptable: true,
    hoy: { comioHoy: true, medicinas: { programadas: 2, tomadas: 1 }, notaDelDia: 'Estuvo muy juguetón en el patio' },
    ...parcial,
  }
}

export const LUNA = perritoEjemplo({
  id: 'luna',
  nombre: 'Luna',
  especie: 'gato',
  edadTexto: '8 meses',
  personalidad: ['tranquila'],
  historia: 'Luna fue rescatada de una caja en la lluvia.',
  meta: { mensualCOP: 200000, padrinos: 0, cubiertoPct: 0 },
  hoy: { comioHoy: null, medicinas: { programadas: 0, tomadas: 0 }, notaDelDia: null },
})

export function listaEjemplo(whatsapp: string | null = '573001112233'): RespuestaPerritos {
  return { total: 2, contacto: { whatsapp }, perritos: [perritoEjemplo(), LUNA] }
}

export function busquedaEjemplo(q: string, whatsapp: string | null = '573001112233'): RespuestaBusqueda {
  return {
    consulta: q,
    modo: 'hibrida',
    contacto: { whatsapp },
    resultados: [{ perrito: LUNA, puntaje: 0.9, motivo: 'Es tranquila y vive bien en apartamento' }],
  }
}

export function respuestaVozEjemplo(parcial: Partial<RespuestaAgenteVoz> = {}): RespuestaAgenteVoz {
  return {
    sesionId: 's1',
    transcripcion: 'hola',
    respuesta: 'Mira, te cuento la historia de Toby.',
    guionVoz: 'Mira, te cuento la historia de Toby, que llegó con una patica herida.',
    perritos: [{ id: 'toby', nombre: 'Toby', especie: 'perro', edadTexto: '3 años', foto: null }],
    accion: 'ninguna',
    ...parcial,
  }
}

/** Respuesta JSON de fetch */
export function json(cuerpo: unknown, estado = 200): Response {
  return new Response(JSON.stringify(cuerpo), { status: estado, headers: { 'Content-Type': 'application/json' } })
}
