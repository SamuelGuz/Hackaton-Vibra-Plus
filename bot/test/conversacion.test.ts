import { beforeEach, describe, expect, it } from 'vitest'
import { atender, MINUTOS_PARA_OLVIDAR } from '../src/conversacion/atender.js'
import type { Entrada, Estado, Usuario } from '../src/tipos.js'
import { ANDREA, CAROLINA, crearDeps, LUIS } from './fakes.js'

const texto = (t: string): Entrada => ({ tipo: 'texto', texto: t })
const boton = (id: string): Entrada => ({ tipo: 'boton', id, titulo: '' })
const audio = (id = 'aud1'): Entrada => ({ tipo: 'audio', mediaId: id, mime: 'audio/ogg' })
const foto = (id = 'img1'): Entrada => ({ tipo: 'imagen', mediaId: id, mime: 'image/jpeg' })

let t: ReturnType<typeof crearDeps>
const decir = (e: Entrada, u: Usuario = LUIS) => atender(t.deps, u, e)
const paso = (u: Usuario = LUIS) => t.repo.estados.get(u.id)?.estado.paso

beforeEach(async () => {
  t = crearDeps()
  // Ya se conocen: la bienvenida se prueba aparte
  for (const u of [LUIS, ANDREA, CAROLINA]) await t.repo.guardarEstado(u.id, { paso: 'menu' })
})

describe('primer contacto y menú', () => {
  it('la primera vez da la bienvenida y muestra el menú', async () => {
    t.repo.estados.clear()
    await decir(texto('hola'))
    expect(t.wa.enviados[0].salida.texto).toContain('Soy el ayudante del Refugio Yesenia')
    expect(t.wa.ultimo().tipo).toBe('lista')
    expect(t.wa.opciones()).toContain('m:med')
  })

  it('"menú" vuelve al inicio desde cualquier paso', async () => {
    await decir(boton('m:entro'))
    expect(paso()).toBe('plata_monto')
    await decir(texto('Menú'))
    expect(paso()).toBe('menu')
    expect(t.wa.ultimo().tipo).toBe('lista')
    expect(t.repo.registros).toHaveLength(0)
  })

  it('a un voluntario no le muestra las opciones de plata', async () => {
    const vol: Usuario = { id: 9, nombre: 'Sara', rol: 'voluntario', telefono: '573009' }
    await t.repo.guardarEstado(9, { paso: 'menu' })
    await decir(texto('menu'), vol)
    expect(t.wa.opciones()).not.toContain('m:entro')
    expect(t.wa.opciones()).toContain('m:bulto')
  })

  it('si pasan 30 minutos sin responder, olvida el paso sin regañar', async () => {
    await decir(boton('m:entro'))
    t.repo.estados.set(LUIS.id, {
      estado: { paso: 'plata_monto', tipo: 'ingreso' },
      actualizadoEn: new Date(t.repo.ahora.getTime() - (MINUTOS_PARA_OLVIDAR + 1) * 60_000),
    })
    t.ia.responder({ transcripcion: '50 mil' })
    await decir(texto('50 mil'))
    // Ya no se toma como el monto: se le pasa a la IA como registro libre
    expect(t.ia.llamadas).toHaveLength(1)
    expect(paso()).toBe('menu')
  })
})

describe('le di una medicina', () => {
  it('muestra las dosis pendientes de hoy y registra con dos toques', async () => {
    await decir(boton('m:med'))
    expect(t.wa.opciones()).toEqual(['d:101:08:00', 'd:100:14:00', 'd:101:20:00', 'd:otra'])
    const lista = t.wa.ultimo()
    expect(lista.tipo === 'lista' && lista.filas[1].titulo).toBe('Tobías · 2:00 p. m.')

    await decir(boton('d:100:14:00'))
    expect(t.wa.ultimoTexto()).toContain('*Tobías*')
    expect(t.wa.ultimoTexto()).toContain('*1 pastilla*')
    expect(t.wa.opciones()).toEqual(['si:1', 'corregir:1', 'borrar:1'])
    expect(t.repo.porEstado('por_confirmar')).toHaveLength(1)

    await decir(boton('si:1'))
    expect(t.repo.porEstado('confirmado')).toHaveLength(1)
    expect(t.wa.ultimoTexto()).toContain('quedó guardado')
    expect(t.repo.datos.dosisDadas).toHaveLength(1)
  })

  it('una dosis ya reportada por otra persona no se duplica', async () => {
    await decir(boton('d:100:14:00'), ANDREA)
    t.wa.limpiar()

    await decir(boton('d:100:14:00'))
    expect(t.wa.ultimoTexto()).toContain('ya la reportó *Andrea*')
    expect(t.wa.opciones()).toEqual(['dup:si', 'dup:no'])
    expect(t.repo.registros).toHaveLength(1)

    await decir(boton('dup:no'))
    expect(t.repo.registros).toHaveLength(1)
  })

  it('la dosis ya reportada no sale en la lista de pendientes', async () => {
    await decir(boton('d:100:14:00'), ANDREA)
    await decir(boton('m:med'))
    expect(t.wa.opciones()).not.toContain('d:100:14:00')
  })

  it('el mismo botón tocado dos veces no confirma dos veces', async () => {
    await decir(boton('d:100:14:00'))
    await decir(boton('si:1'))
    await decir(boton('si:1'))
    expect(t.wa.ultimoTexto()).toContain('ya estaba guardado')
    expect(t.repo.datos.dosisDadas).toHaveLength(1)
  })

  it('nadie confirma lo que reportó otra persona desde su chat', async () => {
    await decir(boton('d:100:14:00'), ANDREA)
    await decir(boton('si:1'))
    expect(t.repo.porEstado('por_confirmar')).toHaveLength(1)
    expect(t.wa.ultimoTexto()).toContain('otra persona')
  })
})

describe('audios', () => {
  it('"le voy a dar" no marca la dosis como dada', async () => {
    t.ia.responder({ transcripcion: 'Le voy a dar la pastilla a Tobías', acciones: [], futuras: 1 })
    await decir(audio())
    expect(t.repo.registros).toHaveLength(0)
    expect(t.wa.ultimoTexto()).toContain('todavía no se lo has dado')
  })

  it('un audio con varias cosas queda por confirmar y muestra lo que escuchó', async () => {
    t.ia.responder({
      transcripcion: 'Le di la pastilla a Tobi y abrí un bulto de perro',
      acciones: [
        { tipo: 'dosis', animalId: '10', tratamientoId: '100', hora: '14:00' },
        { tipo: 'inventario', especie: 'perro', cambio: -1 },
      ],
    })
    await decir(audio())
    const r = t.repo.registros[0]
    expect(r.estadoActual).toBe('por_confirmar')
    expect(r.tipoEntrada).toBe('audio')
    expect(r.mediaUrl).toMatch(/^\/archivos\//)
    expect(t.wa.ultimoTexto()).toContain('Escuché: «Le di la pastilla a Tobi')
    expect(t.wa.ultimoTexto()).toContain('1. 💊')
    expect(t.wa.ultimoTexto()).toContain('2. 🍖')
    expect(t.ia.llamadas[0].media?.mime).toBe('audio/ogg; codecs=opus')
  })

  it('si el audio repite una dosis ya reportada, la quita y avisa', async () => {
    await decir(boton('d:100:14:00'), ANDREA)
    t.ia.responder({
      transcripcion: 'Le di la pastilla a Tobías y abrí un bulto',
      acciones: [
        { tipo: 'dosis', animalId: '10', tratamientoId: '100', hora: '14:00' },
        { tipo: 'inventario', especie: 'perro', cambio: -1 },
      ],
    })
    await decir(audio())
    expect(t.repo.registros).toHaveLength(2)
    expect(t.repo.registros[1].acciones).toEqual([{ tipo: 'inventario', especie: 'perro', cambio: -1 }])
    expect(t.wa.ultimoTexto()).toContain('ya la reportó Andrea')
  })

  it('audio clarito (confianza ≥ 0,9): se guarda de una, sin tocar nada, y se puede corregir escribiendo', async () => {
    t.ia.responder({
      transcripcion: 'Le di la pastilla a Tobías',
      acciones: [{ tipo: 'dosis', animalId: '10', tratamientoId: '100', hora: '14:00' }],
      confianza: 0.95,
    })
    await decir(audio())
    expect(t.repo.registros[0].estadoActual).toBe('confirmado')
    expect(t.repo.datos.dosisDadas).toHaveLength(1)
    const msg = t.wa.ultimoTexto()
    expect(msg).toContain('✅ Anotado (3:00 p. m.)')
    expect(msg).toContain('*Tobías*')
    expect(msg).toContain('Si hubo un error, responde *corregir*')
    expect(msg).not.toContain('¿Está bien?')
    expect(t.wa.opciones()).toEqual(['corregir:1', 'borrar:1', 'menu'])
    // "corregir" deshace lo guardado y la dosis vuelve a la lista
    await decir(texto('corregir'))
    expect(t.repo.registros[0].estadoActual).toBe('corregido')
    expect(t.repo.datos.dosisDadas).toHaveLength(0)
    expect(paso()).toBe('medicina')
  })

  it('audio clarito de comida: se guarda solo y dice cuántos días quedan', async () => {
    t.ia.responder({ transcripcion: 'llegaron 15 kilos de carne', acciones: [], confianza: 0.93 })
    await decir(audio())
    expect(t.repo.registros[0]).toMatchObject({ estadoActual: 'confirmado', acciones: [{ tipo: 'inventario', cambio: 15, unidad: 'kg' }] })
    expect(t.wa.ultimoTexto()).toContain('Quedan *5 días* de comida de perro')
  })

  it('audio dudoso (confianza < 0,9): sigue preguntando "¿Está bien?"', async () => {
    t.ia.responder({
      transcripcion: 'le di la pastilla a... Tobi creo',
      acciones: [{ tipo: 'dosis', animalId: '10', tratamientoId: '100', hora: '14:00' }],
      confianza: 0.89,
    })
    await decir(audio())
    expect(t.repo.registros[0].estadoActual).toBe('por_confirmar')
    expect(t.wa.ultimoTexto()).toContain('¿Está bien?')
  })

  it('audio clarito con plata: lo del campo se guarda solo y la plata sigue esperando el "Sí"', async () => {
    t.ia.responder({
      transcripcion: 'Le di la pastilla a Tobías y entraron 50 mil de donación',
      acciones: [
        { tipo: 'dosis', animalId: '10', tratamientoId: '100', hora: '14:00' },
        { tipo: 'movimiento', movimiento: { tipo: 'ingreso', monto: 50_000, categoria: 'donacion', clinicaId: null, abonoDeuda: false, foto: null, nota: '' } },
      ],
      confianza: 0.97,
    })
    await decir(audio(), CAROLINA)
    expect(t.repo.registros.map((r) => [r.acciones[0].tipo, r.estadoActual])).toEqual([
      ['dosis', 'confirmado'],
      ['movimiento', 'por_confirmar'],
    ])
    expect(t.wa.ultimoTexto()).toContain('¿Está bien?')
    expect(t.wa.ultimoTexto()).toContain('$50.000')
  })

  it('audio clarito de una dosis que ya dio otra persona: frena y pregunta si es otra dosis', async () => {
    await decir(boton('d:100:14:00'), ANDREA)
    await decir(boton('si:1'), ANDREA)
    t.ia.responder({
      transcripcion: 'Le di la pastilla a Tobías',
      acciones: [{ tipo: 'dosis', animalId: '10', tratamientoId: '100', hora: '14:00' }],
      confianza: 0.99,
    })
    await decir(audio())
    expect(t.repo.registros).toHaveLength(1)
    expect(t.wa.ultimoTexto()).toContain('ya la reportó Andrea')
    expect(t.wa.opciones()).toEqual(['dup:si', 'dup:no'])
    expect(paso()).toBe('medicina_duplicada')
  })

  it('un texto clarito no se guarda solo: lo de guardar directo es para audios', async () => {
    t.ia.responder({ transcripcion: 'abrí un bulto de perro', acciones: [{ tipo: 'inventario', especie: 'perro', cambio: -1 }], confianza: 0.99 })
    await decir(texto('abrí un bulto de perro'))
    expect(t.repo.registros[0].estadoActual).toBe('por_confirmar')
  })

  it('si Gemini falla, no se cae: pide repetir el audio y muestra el menú', async () => {
    t.ia.respuesta = new Error('cuota agotada')
    await decir(audio())
    expect(t.repo.registros).toHaveLength(0)
    expect(t.wa.ultimoTexto()).toContain('No pude escuchar bien tu audio')
    expect(t.wa.ultimo().tipo).toBe('lista')
  })

  it('en el paso "¿cuánta plata?", un audio responde el monto', async () => {
    await decir(boton('m:entro'))
    t.ia.responder({ transcripcion: 'cincuenta mil pesos' })
    await decir(audio())
    expect(paso()).toBe('plata_categoria')
    expect(t.wa.ultimoTexto()).toContain('*$50.000*')
  })
})

describe('comida', () => {
  it('abrí un bulto: perro, confirmar y dice cuántos días quedan', async () => {
    await decir(boton('m:bulto'))
    expect(t.wa.opciones()).toEqual(['e:0:perro', 'e:0:gato', 'menu'])
    await decir(boton('e:0:perro'))
    await decir(boton('si:1'))
    // 3 bultos − 1 = 2 bultos × 25 kg / 16,875 kg al día = 2,96 días
    expect(t.wa.ultimoTexto()).toContain('Quedan *2 días* de comida de perro. Toca pedir hoy')
  })

  it('llegó comida con "otro número" escrito', async () => {
    await decir(boton('m:llego'))
    await decir(boton('e:1:gato'))
    await decir(boton('n:gato:otro'))
    await decir(texto('llegaron 6'))
    expect(t.repo.registros[0].acciones).toEqual([{ tipo: 'inventario', especie: 'gato', cambio: 6 }])
  })

  it('llegaron 15 kilos de carne de Don Carlos: botón "Kilos sueltos", confirmar y los kilos suman a los días', async () => {
    await decir(boton('m:llego'))
    await decir(boton('e:1:perro'))
    expect(t.wa.opciones()).toEqual(['n:perro:1', 'n:perro:otro', 'n:perro:kg'])
    await decir(boton('n:perro:kg'))
    expect(t.wa.ultimoTexto()).toContain('¿Cuántos kilos')
    await decir(texto('15'))
    expect(t.repo.registros[0].acciones).toEqual([{ tipo: 'inventario', especie: 'perro', cambio: 15, unidad: 'kg', producto: 'carne' }])
    expect(t.wa.ultimoTexto()).toContain('Llegaron *15 kg* de carne')
    await decir(boton('si:1'))
    // 3 bultos × 25 kg + 15 kg = 90 kg / 16,875 kg al día = 5,3 días
    expect(t.wa.ultimoTexto()).toContain('Quedan *5 días* de comida de perro')
  })

  it('"llegaron 20 kilos de carne" escrito: se anota en kilos aunque la IA no lo entienda', async () => {
    t.ia.respuesta = new Error('sin IA')
    await decir(texto('llegaron 20 kilos de carne'))
    expect(t.repo.registros[0].acciones).toEqual([{ tipo: 'inventario', especie: 'perro', cambio: 20, unidad: 'kg', producto: 'carne' }])
    expect(paso()).toBe('confirmar')
  })

  it('"se gastaron 12 kilos de menudencia": si la IA lo toma como 12 bultos, se corrige a kilos', async () => {
    t.ia.responder({
      transcripcion: 'se gastaron 12 kilos de menudencia',
      acciones: [{ tipo: 'inventario', especie: 'perro', cambio: -12 }],
      confianza: 0.7,
    })
    await decir(texto('se gastaron 12 kilos de menudencia'))
    expect(t.repo.registros[0].acciones).toEqual([{ tipo: 'inventario', especie: 'perro', cambio: -12, unidad: 'kg', producto: 'menudencia' }])
    expect(t.wa.ultimoTexto()).toContain('Se gastaron *12 kg* de menudencia')
  })

  it('en el paso "¿cuántos bultos?", "15 kilos" se anota en kilos, no como 15 bultos', async () => {
    await decir(boton('m:llego'))
    await decir(boton('e:1:perro'))
    await decir(boton('n:perro:otro'))
    await decir(texto('15 kilos de carnaza'))
    expect(t.repo.registros[0].acciones).toEqual([{ tipo: 'inventario', especie: 'perro', cambio: 15, unidad: 'kg', producto: 'carnaza' }])
  })
})

describe('plata', () => {
  it('entró plata: monto escrito → categoría → sin foto → confirmar', async () => {
    await decir(boton('m:entro'), CAROLINA)
    await decir(texto('50 mil'), CAROLINA)
    expect(t.wa.ultimoTexto()).toBe('Entró *$50.000*. ¿De dónde vino?')
    await decir(boton('cat:donacion'), CAROLINA)
    expect(t.wa.opciones()).toEqual(['mf', 'sf'])
    await decir(boton('sf'), CAROLINA)
    await decir(boton('si:1'), CAROLINA)
    expect(t.repo.datos.movimientos[0]).toMatchObject({ tipo: 'ingreso', monto: 50_000, categoria: 'donacion' })
    expect(t.wa.ultimoTexto()).toContain('En caja quedan *$1.050.000*')
  })

  it('abono a una clínica pide la clínica y guarda la foto', async () => {
    await decir(boton('m:salio'), CAROLINA)
    await decir(texto('$200.000'), CAROLINA)
    await decir(boton('cat:abono'), CAROLINA)
    expect(t.wa.opciones()).toEqual(['pk:50'])
    await decir(boton('pk:50'), CAROLINA)
    await decir(foto(), CAROLINA)
    const a = t.repo.registros[0].acciones[0]
    expect(a.tipo === 'movimiento' && a.movimiento).toMatchObject({ abonoDeuda: true, clinicaId: '50', monto: 200_000 })
    expect(t.repo.registros[0].mediaUrl).toMatch(/\.jpg$/)
  })

  it('un monto que no entiende se vuelve a pedir', async () => {
    await decir(boton('m:entro'))
    await decir(texto('no sé'))
    expect(paso()).toBe('plata_monto')
    expect(t.wa.ultimoTexto()).toContain('No te entendí el valor')
  })
})

describe('facturas', () => {
  it('si la IA no lee la clínica, la pregunta', async () => {
    await decir(boton('m:factura'))
    t.ia.responder({ transcripcion: 'Factura por $320.000', factura: { monto: 320_000, clinicaId: null, concepto: 'Consulta' } })
    await decir(foto())
    expect(paso()).toBe('factura_clinica')
    expect(t.ia.llamadas[0].pista).toBe('factura')
    await decir(boton('fk:50'))
    expect(t.repo.registros[0].acciones).toEqual([{ tipo: 'deuda', clinicaId: '50', monto: 320_000, nota: 'Consulta' }])
  })
})

describe('animales', () => {
  it('encuentra a Tobías por su apodo y guarda la nota', async () => {
    await decir(boton('m:animal'))
    await decir(boton('a:otro'))
    await decir(texto('tobi'))
    expect(paso()).toBe('animal_nota')
    await decir(texto('Ya no cojea'))
    expect(t.repo.registros[0].acciones).toEqual([{ tipo: 'nota', animalId: '10', texto: 'Ya no cojea' }])
  })

  it('si no encuentra el nombre, lo dice y sigue esperando', async () => {
    await decir(boton('a:otro'))
    await decir(texto('Firulais'))
    expect(t.wa.ultimoTexto()).toContain('No encontré a «Firulais»')
    expect(paso()).toBe('animal_nombre')
  })
})

describe('corregir y borrar', () => {
  it('corregir anula lo entendido y abre el camino guiado', async () => {
    t.ia.responder({ transcripcion: 'abrí un bulto de gato', acciones: [{ tipo: 'inventario', especie: 'gato', cambio: -1 }] })
    await decir(audio())
    await decir(boton('corregir:1'))
    expect(t.repo.registros[0].estadoActual).toBe('corregido')
    expect(t.wa.opciones()).toEqual(['e:0:perro', 'e:0:gato', 'menu'])
  })

  it('borrar anula y no deja nada', async () => {
    await decir(boton('d:100:14:00'))
    await decir(boton('borrar:1'))
    expect(t.repo.registros[0].estadoActual).toBe('anulado')
    // La dosis vuelve a quedar pendiente
    await decir(boton('m:med'))
    expect(t.wa.opciones()).toContain('d:100:14:00')
  })
})

describe('otros', () => {
  it('ver lo de hoy: a la administradora le muestra la caja y la deuda', async () => {
    await decir(boton('m:hoy'), CAROLINA)
    expect(t.wa.ultimoTexto()).toContain('Medicinas que faltan: 3')
    expect(t.wa.ultimoTexto()).toContain('En caja')
    expect(t.wa.ultimoTexto()).toContain('San Roque')
  })

  it('ver lo de hoy: al cuidador no le muestra la plata', async () => {
    await decir(boton('m:hoy'))
    expect(t.wa.ultimoTexto()).not.toContain('En caja')
  })

  it('abrir el panel manda un enlace personal', async () => {
    await decir(boton('m:panel'))
    expect(t.wa.ultimoTexto()).toContain('https://panel.huellitas.test/?t=token-1-0')
  })

  it('un botón viejo de un paso que ya pasó no rompe nada', async () => {
    await decir(boton('cat:donacion'))
    expect(t.wa.ultimoTexto()).toContain('Se me perdió el hilo')
  })

  it('un sticker recibe una respuesta amable', async () => {
    await decir({ tipo: 'otro' })
    expect(t.wa.ultimoTexto()).toContain('entiendo audios, fotos y mensajes escritos')
  })

  it('el estado final siempre queda guardado', async () => {
    await decir(boton('m:llego'))
    const e = t.repo.estados.get(LUIS.id)?.estado as Estado
    expect(e).toEqual({ paso: 'comida_especie', llegada: true })
  })
})
