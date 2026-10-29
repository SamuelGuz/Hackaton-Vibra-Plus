// En cada momento se puede responder tocando, escribiendo o mandando un audio: las tres formas llevan al mismo lugar.
import { beforeEach, describe, expect, it } from 'vitest'
import { atender } from '../src/conversacion/atender.js'
import { convertir } from '../src/ia/esquema.js'
import type { Entrada, Usuario } from '../src/tipos.js'
import { AHORA, CAROLINA, crearDeps, datosDePrueba, LUIS } from './fakes.js'

const texto = (t: string): Entrada => ({ tipo: 'texto', texto: t })
const boton = (id: string): Entrada => ({ tipo: 'boton', id, titulo: '' })
const audio = (id = 'aud1'): Entrada => ({ tipo: 'audio', mediaId: id, mime: 'audio/ogg' })

let t: ReturnType<typeof crearDeps>
const decir = (e: Entrada, u: Usuario = LUIS) => atender(t.deps, u, e)
/** Lo que la IA "escuchó" en el audio, sin sacar ninguna acción */
const dijo = (transcripcion: string, u: Usuario = LUIS) => {
  t.ia.responder({ transcripcion })
  return decir(audio(), u)
}
const paso = (u: Usuario = LUIS) => t.repo.estados.get(u.id)?.estado.paso
const todoLoEnviado = () => t.wa.enviados.map((e) => e.salida.texto ?? '').join('\n')

beforeEach(async () => {
  t = crearDeps()
  for (const u of [LUIS, CAROLINA]) await t.repo.guardarEstado(u.id, { paso: 'menu' })
})

describe('un audio del que no sale nada que anotar', () => {
  it('muestra lo que escuchó y abre el camino del tema: medicina', async () => {
    await dijo('Le di una medicina a un perro')
    expect(todoLoEnviado()).toContain('Escuché: «Le di una medicina a un perro»')
    expect(paso()).toBe('medicina')
    expect(t.wa.opciones()).toContain('d:100:14:00')
    expect(t.repo.registros).toHaveLength(0)
  })

  it('si nombra al animal, la lista solo trae sus dosis', async () => {
    await dijo('Le di la medicina a Mateo')
    expect(t.wa.opciones()).toEqual(['d:101:08:00', 'd:101:20:00', 'd:otra'])
  })

  it('si no hay tema, dice lo que escuchó y muestra el menú', async () => {
    await dijo('Sí, quiero registrar algo')
    expect(todoLoEnviado()).toContain('Escuché: «Sí, quiero registrar algo»')
    expect(t.wa.ultimo().tipo).toBe('lista')
    expect(t.wa.opciones()).toContain('m:med')
    expect(paso()).toBe('menu')
  })

  it('un texto sin nada que anotar también abre el camino del tema', async () => {
    t.ia.responder({ transcripcion: 'abrí un bulto' })
    await decir(texto('abrí un bulto'))
    expect(paso()).toBe('comida_especie')
    expect(t.wa.opciones()).toEqual(['e:0:perro', 'e:0:gato', 'menu'])
  })

  it('si la IA no responde a un audio, pide que lo repita o lo escriba', async () => {
    t.ia.respuesta = new Error('Gemini no respondió en 25 s')
    await decir(audio())
    expect(t.wa.ultimoTexto()).toContain('No pude escuchar bien tu audio')
    expect(t.wa.ultimo().tipo).toBe('lista')
  })
})

describe('¿a quién le diste la medicina?', () => {
  beforeEach(() => decir(boton('m:med')))

  it('escrito: el nombre del animal elige su única dosis', async () => {
    await decir(texto('a Tobi'))
    expect(t.repo.registros[0].acciones).toEqual([{ tipo: 'dosis', animalId: '10', tratamientoId: '100', hora: '14:00' }])
    expect(t.wa.opciones()).toEqual(['si:1', 'corregir:1', 'borrar:1'])
  })

  it('escrito: si el animal tiene varias, muestra solo las suyas', async () => {
    await decir(texto('Mateo'))
    expect(paso()).toBe('medicina')
    expect(t.wa.opciones()).toEqual(['d:101:08:00', 'd:101:20:00', 'd:otra'])
  })

  it('escrito: el nombre de la medicina también sirve', async () => {
    await decir(texto('el fenobarbital'))
    expect(t.repo.registros[0].acciones[0]).toMatchObject({ tipo: 'dosis', tratamientoId: '100' })
  })

  it('en audio: elige la dosis aunque la IA no saque la acción', async () => {
    await dijo('ya le di la de Tobías')
    expect(t.repo.registros[0].acciones[0]).toMatchObject({ tipo: 'dosis', tratamientoId: '100' })
    expect(todoLoEnviado()).toContain('Escuché: «ya le di la de Tobías»')
  })

  it('en audio: si la IA sí sacó la dosis, se usa la de la IA', async () => {
    t.ia.responder({ transcripcion: 'le di la amoxicilina a Mateo', acciones: [{ tipo: 'dosis', animalId: '11', tratamientoId: '101', hora: '08:00' }] })
    await decir(audio())
    expect(t.repo.registros[0].acciones).toEqual([{ tipo: 'dosis', animalId: '11', tratamientoId: '101', hora: '08:00' }])
  })
})

describe('¿la dosis repetida es otra?', () => {
  it('se responde escribiendo "no, ya está"', async () => {
    await decir(boton('d:100:14:00'), CAROLINA)
    await decir(boton('d:100:14:00'))
    expect(paso()).toBe('medicina_duplicada')
    await decir(texto('no, ya está'))
    expect(t.repo.registros).toHaveLength(1)
    expect(t.wa.ultimoTexto()).toContain('no la repito')
  })
})

describe('plata: categoría, clínica y foto', () => {
  it('la categoría se escribe', async () => {
    await decir(boton('m:entro'), CAROLINA)
    await decir(texto('50 mil'), CAROLINA)
    await decir(texto('fue una donación'), CAROLINA)
    expect(paso(CAROLINA)).toBe('plata_foto')
    await decir(texto('sin foto'), CAROLINA)
    const a = t.repo.registros[0].acciones[0]
    expect(a.tipo === 'movimiento' && a.movimiento).toMatchObject({ tipo: 'ingreso', categoria: 'donacion', monto: 50_000 })
  })

  it('la categoría y la clínica se dicen en audio, y "no tengo foto" también', async () => {
    await decir(boton('m:salio'), CAROLINA)
    await decir(texto('200 mil'), CAROLINA)
    await dijo('es un abono a la clínica', CAROLINA)
    expect(paso(CAROLINA)).toBe('plata_clinica')
    await dijo('a San Roque', CAROLINA)
    expect(paso(CAROLINA)).toBe('plata_foto')
    await dijo('no tengo foto', CAROLINA)
    const a = t.repo.registros[0].acciones[0]
    expect(a.tipo === 'movimiento' && a.movimiento).toMatchObject({ abonoDeuda: true, clinicaId: '50', monto: 200_000, foto: null })
  })

  it('si lo escrito no es ninguna categoría, la vuelve a pedir sin perder el monto', async () => {
    await decir(boton('m:entro'), CAROLINA)
    await decir(texto('50 mil'), CAROLINA)
    t.ia.responder({ transcripcion: 'pues no sé' })
    await decir(texto('pues no sé'), CAROLINA)
    expect(paso(CAROLINA)).toBe('plata_categoria')
    expect(t.wa.ultimo().tipo).toBe('lista')
    expect(t.wa.opciones()).toContain('cat:donacion')
  })
})

describe('factura sin foto', () => {
  it('se puede escribir el monto en vez de mandar la foto, y la clínica por nombre', async () => {
    await decir(boton('m:factura'))
    await decir(texto('320 mil'))
    expect(paso()).toBe('factura_clinica')
    await decir(texto('San Roque'))
    expect(t.repo.registros[0].acciones).toEqual([{ tipo: 'deuda', clinicaId: '50', monto: 320_000, nota: '' }])
  })
})

describe('¿está bien? se responde escribiendo o en audio', () => {
  beforeEach(async () => {
    await decir(boton('m:med'))
    await decir(boton('d:100:14:00'))
  })

  it('"sí" escrito confirma', async () => {
    await decir(texto('Sí'))
    expect(t.repo.porEstado('confirmado')).toHaveLength(1)
    expect(t.wa.ultimoTexto()).toContain('quedó guardado')
  })

  it('"bórralo" en audio anula', async () => {
    await dijo('No, bórralo')
    expect(t.repo.porEstado('anulado')).toHaveLength(1)
  })

  it('"corregir" escrito abre el camino guiado', async () => {
    await decir(texto('corregir'))
    expect(t.repo.porEstado('corregido')).toHaveLength(1)
    expect(paso()).toBe('medicina')
  })

  it('otra cosa escrita se toma como un registro nuevo', async () => {
    t.ia.responder({ transcripcion: 'abrí un bulto de perro', acciones: [{ tipo: 'inventario', especie: 'perro', cambio: -1 }] })
    await decir(texto('abrí un bulto de perro'))
    expect(t.repo.registros).toHaveLength(2)
    expect(t.repo.porEstado('por_confirmar')).toHaveLength(2)
  })
})

describe('perro o gato', () => {
  it('se dice en audio', async () => {
    await decir(boton('m:bulto'))
    await dijo('de perro')
    expect(t.repo.registros[0].acciones).toEqual([{ tipo: 'inventario', especie: 'perro', cambio: -1 }])
  })
})

describe('la IA de respaldo', () => {
  it('nunca devuelve la lista interna como si fuera lo que dijo la persona', () => {
    const e = convertir(
      { transcripcion: 'HORA ACTUAL: 17:46\n\nANIMALES (id: nombre):\n10: Tobías (perro)', confianza: 1, acciones: [] },
      datosDePrueba(),
      AHORA,
    )
    expect(e.transcripcion).toBe('')
  })
})
