// Datos de demostración: la misma historia que panel/src/data/demo.ts (Mateo, Bruno, Tobías, Luna…).
// Las fechas se calculan desde hoy para que la demo siempre se vea del día.
//
// Uso: npm run semilla              (solo si la base no tiene animales)
//      npm run semilla -- --borrar  (borra TODO y vuelve a sembrar)

import { crearPool } from '../src/datos/db.js'
import { normalizarTelefono } from '../src/wa/telefono.js'
import type { Rol } from '../src/panel-tipos.js'

const PERROS = [
  'Mateo', 'Bruno', 'Canela', 'Pecas', 'Toby', 'Lola', 'Max', 'Manchas', 'Negra', 'Rocky',
  'Chispa', 'Paco', 'Kira', 'Coco', 'Tobías', 'Mona', 'Lucas', 'Princesa', 'Sultán', 'Bombón',
  'Café', 'Nala', 'Zeus', 'Mota', 'Pelusa', 'Rufo', 'Tina', 'Simón', 'Galleta', 'Lupe',
  'Oso', 'Dulce', 'Pancho', 'Tango', 'Frida', 'Benito', 'Sombra', 'Kiara', 'Panela', 'Arepa',
  'Chocolate', 'Bruna', 'Gordo', 'Linda', 'Firulais',
]

const GATOS = [
  'Luna', 'Tigre', 'Misu', 'Nube', 'Tomate', 'Salem', 'Mango', 'Ágata', 'Bigotes', 'Pantera',
  'Kiwi', 'Morris', 'Pimienta', 'Menta', 'Olivia', 'Felipe', 'Copito', 'Sushi', 'Oreo', 'Mía',
  'Lucero', 'Gris', 'Zapatico', 'Jengibre', 'Tito',
]

const ESTADO_ESPECIAL: Record<string, string> = {
  Mateo: 'tratamiento', Bruno: 'tratamiento', Pecas: 'tratamiento', Rocky: 'tratamiento', Kira: 'tratamiento',
  Tobías: 'tratamiento', Luna: 'tratamiento', Tigre: 'tratamiento', Misu: 'tratamiento', Salem: 'tratamiento',
  Negra: 'cuarentena', Chispa: 'cuarentena', Nube: 'cuarentena', Mango: 'cuarentena',
  Toby: 'hogar_temporal', Lola: 'hogar_temporal', Copito: 'hogar_temporal', Oreo: 'hogar_temporal',
}

const CARACTER_PERRO = [
  'Juguetón, se lleva bien con otros perros.',
  'Tranquilo, le gusta que lo acaricien despacio.',
  'Tímido al principio; hay que dejar que se acerque.',
  'Mucha energía, necesita caminar todos los días.',
  'Cariñoso con la gente, celoso con la comida.',
  'Viejito y calmado, duerme casi todo el día.',
]

const CARACTER_GATO = [
  'Independiente, se deja cargar poco.',
  'Ronronea con cualquiera que se siente cerca.',
  'Asustadizo con los perros, mejor en casa sin perros.',
  'Curioso, se sube a todo.',
]

const ESPECIALES: Record<string, { caracter?: string; advertencias?: string[]; alias?: string[] }> = {
  Mateo: {
    caracter: 'Lo atropellaron en la vía. Después de la cirugía es el consentido del albergue.',
    advertencias: ['Todavía no puede subir escaleras ni saltar.'],
  },
  Bruno: {
    caracter: 'Lleva 8 meses con nosotros. Noble, se estresa con los cambios bruscos.',
    advertencias: [
      'NO pisos lisos (cerámica, baldosa): se resbala y se lastima la piel.',
      'Está terminando tratamiento de piel: baño con champú medicado cada día.',
    ],
  },
  Tobías: {
    caracter: 'Tiene convulsiones controladas con medicina. Muy apegado a la gente.',
    advertencias: ['Anticonvulsivo todos los días a las 2:00 p. m. No saltarse la dosis.'],
    alias: ['Tobi', 'Tobias'],
  },
  Negra: { advertencias: ['En cuarentena: no juntar con otros perros todavía.'] },
  Manchas: { alias: ['Mancha'] },
}

function dias(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Momento de hace `diasAtras` días a la hora dada, en hora de Bogotá */
const momento = (diasAtras: number, hora: string) => `${dias(-diasAtras)} ${hora}:00-05`

function leerEquipo(): { nombre: string; rol: Rol; telefono: string }[] {
  const texto = process.env.EQUIPO ?? ''
  const equipo = texto
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const [nombre, rol, telefono] = s.split(':').map((x) => x.trim())
      if (!nombre || !rol || !telefono) throw new Error(`EQUIPO mal escrito en "${s}". Debe ser Nombre:rol:telefono`)
      return { nombre, rol: rol as Rol, telefono: normalizarTelefono(telefono) }
    })
  if (equipo.length === 0) throw new Error('Falta EQUIPO en .env (ver .env.example)')
  return equipo
}

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('Falta DATABASE_URL en .env')
  const borrar = process.argv.includes('--borrar')
  const equipo = leerEquipo()
  const pool = crearPool(url)
  const cliente = await pool.connect()
  const q = (sql: string, p: unknown[] = []) => cliente.query(sql, p)

  try {
    await q('BEGIN')
    const { rows } = await q('SELECT count(*)::int AS n FROM animales')
    if (rows[0].n > 0 && !borrar) {
      await q('ROLLBACK')
      console.log('La base ya tiene animales. Para empezar de cero: npm run semilla -- --borrar')
      return
    }
    if (borrar) {
      const t = await q(`SELECT string_agg(quote_ident(tablename), ', ') AS lista FROM pg_tables WHERE schemaname = 'public'`)
      await q(`TRUNCATE ${t.rows[0].lista} RESTART IDENTITY CASCADE`)
      console.log('Base borrada.')
    }

    // Equipo
    const usuario: Record<string, number> = {}
    for (const p of equipo) {
      const r = await q(
        `INSERT INTO usuarios (telefono, nombre, rol, recibe_alertas) VALUES ($1, $2, $3, $4) RETURNING id`,
        [p.telefono, p.nombre, p.rol, p.rol === 'admin' || p.rol === 'cuidador'],
      )
      usuario[p.rol] ??= r.rows[0].id
    }
    const cuidador = usuario.cuidador ?? Object.values(usuario)[0]
    const admin = usuario.admin ?? cuidador
    const bienestar = usuario.bienestar ?? cuidador

    // Animales
    const animal: Record<string, number> = {}
    const lista = [
      ...PERROS.map((nombre, i) => ({ nombre, especie: 'perro', i })),
      ...GATOS.map((nombre, i) => ({ nombre, especie: 'gato', i })),
    ]
    for (const { nombre, especie, i } of lista) {
      const caracteres = especie === 'perro' ? CARACTER_PERRO : CARACTER_GATO
      const e = ESPECIALES[nombre] ?? {}
      const r = await q(
        `INSERT INTO animales (nombre, alias, especie, estado, fecha_ingreso, caracter, advertencias, creado_por)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [
          nombre,
          e.alias ?? [],
          especie,
          ESTADO_ESPECIAL[nombre] ?? 'adoptable',
          nombre === 'Bruno' ? dias(-240) : dias(-(10 + ((i * 37) % 330))),
          e.caracter ?? caracteres[i % caracteres.length],
          e.advertencias ?? [],
          admin,
        ],
      )
      animal[nombre] = r.rows[0].id
    }

    // Padrinos
    for (const [nombre, padrino] of [['Mateo', 'Familia Ríos'], ['Luna', 'Valentina G.']]) {
      const p = await q(`INSERT INTO personas (nombre, es_padrino) VALUES ($1, true) RETURNING id`, [padrino])
      await q(`INSERT INTO padrinazgos (persona_id, animal_id, monto_mensual, desde) VALUES ($1, $2, 40000, $3)`, [
        p.rows[0].id,
        animal[nombre],
        dias(-60),
      ])
    }

    // Adopciones ya entregadas, para los seguimientos de los días 2, 5, 15, 30 y 90:
    // Firulais hace 5 días (toca hoy el día 5) y Canelita hace 30 (toca hoy el día 30). Las llamadas anteriores ya salieron bien.
    const entregas: [string, string, string, string, number, number[]][] = [
      ['Firulais', 'perro', 'Juan Gómez', '573115550101', 5, [2]],
      ['Canelita', 'gato', 'María López', '573105550202', 30, [2, 5, 15]],
    ]
    for (const [nombre, especie, adoptante, telefono, hace, llamadas] of entregas) {
      const a = await q(
        `INSERT INTO animales (nombre, alias, especie, estado, fecha_ingreso, caracter, advertencias, creado_por)
         VALUES ($1, '{}', $2, 'adoptado', $3, '', '{}', $4) RETURNING id`,
        [nombre, especie, dias(-(hace + 60)), admin],
      )
      const p = await q(`INSERT INTO personas (nombre, telefono, es_adoptante) VALUES ($1, $2, true) RETURNING id`, [adoptante, telefono])
      const ad = await q(`INSERT INTO adopciones (animal_id, persona_id, fecha_entrega, creado_por) VALUES ($1, $2, $3, $4) RETURNING id`, [
        a.rows[0].id,
        p.rows[0].id,
        dias(-hace),
        admin,
      ])
      for (const dia of llamadas) {
        await q(
          `INSERT INTO checkins (adopcion_id, dia, programado_para, riesgo, atendido_por, atendido_en) VALUES ($1, $2, $3, 'verde', $4, now())`,
          [ad.rows[0].id, dia, dias(-hace + dia), admin],
        )
      }
    }

    // Tratamientos: [animal, medicamento, dosis, unidad, cada cuántas horas, primera hora, desde, hasta]
    const tratamientos: [string, string, number, string, number, string, number, number][] = [
      ['Mateo', 'Amoxicilina', 3, 'ml', 12, '08:00', -4, 6],
      ['Mateo', 'Meloxicam (dolor)', 0.5, 'pastilla', 24, '08:00', -4, 3],
      ['Bruno', 'Baño con champú medicado', 1, 'baño', 24, '10:00', -20, 2],
      ['Canela', 'Desparasitante', 1, 'pastilla', 24, '07:00', 0, 0],
      ['Luna', 'Gotas para los ojos', 2, 'gotas', 6, '08:00', -2, 5],
      ['Tigre', 'Antibiótico', 1, 'ml', 12, '09:00', -1, 7],
      ['Pecas', 'Vitaminas', 5, 'ml', 24, '12:00', -10, 20],
      ['Tobías', 'Fenobarbital (anticonvulsivo)', 1, 'pastilla', 24, '14:00', -30, 60],
    ]
    const tratamiento: Record<string, number> = {}
    for (const [nombre, medicamento, dosis, unidad, cada, hora, desde, hasta] of tratamientos) {
      const r = await q(
        `INSERT INTO tratamientos (animal_id, medicamento, dosis, unidad, frecuencia_horas, hora_inicio, fecha_inicio, fecha_fin, indicado_por, creado_por)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Clínica Veterinaria San Roque', $9) RETURNING id`,
        [animal[nombre], medicamento, dosis, unidad, cada, hora, dias(desde), dias(hasta), bienestar],
      )
      tratamiento[`${nombre}/${medicamento}`] = r.rows[0].id
    }

    // Catálogo de comida (placa viva): perro 25 kg y 0,375 kg/animal/día; gato 10 kg y 0,065 kg/animal/día
    const perro = await q(
      `INSERT INTO catalogo_items (nombre, tipo, unidad, kg_por_unidad, especie_objetivo, consumo_diario_kg_por_animal, precio_ref, umbral_dias)
       VALUES ('Concentrado para perro', 'comida', 'bulto', 25, 'perro', 0.375, 95000, 4) RETURNING id`,
    )
    await q(
      `INSERT INTO catalogo_items (nombre, tipo, unidad, kg_por_unidad, especie_objetivo, consumo_diario_kg_por_animal, precio_ref, umbral_dias)
       VALUES ('Concentrado para gato', 'comida', 'bulto', 10, 'gato', 0.065, 70000, 4)`,
    )
    // Kilos sueltos: carne y recortes del carnicero (db/sql/007_kilos_sueltos.sql)
    await q(
      `INSERT INTO catalogo_items (nombre, tipo, unidad, kg_por_unidad, especie_objetivo)
       VALUES ('Carne y recortes para perro', 'comida', 'kg', 1, 'perro'), ('Carne y recortes para gato', 'comida', 'kg', 1, 'gato')`,
    )

    // Clínicas con la deuda de la entrevista (≈ $4,15 M entre las dos)
    const clinicas: [string, number, number][] = [
      ['Clínica Veterinaria San Roque', 2_500_000, 1_550_000],
      ['Clínica Veterinaria 24 Horas', 3_000_000, 2_600_000],
    ]
    const clinica: number[] = []
    for (const [nombre, limite, deuda] of clinicas) {
      const r = await q(`INSERT INTO entidades (nombre, tipo, limite_credito) VALUES ($1, 'clinica', $2) RETURNING id`, [nombre, limite])
      clinica.push(r.rows[0].id)
      await q(
        `INSERT INTO movimientos_financieros (tipo, monto, categoria, entidad_id, concepto, fecha, estado, creado_por)
         VALUES ('factura', $1, 'veterinaria', $2, 'Saldo que se debía al empezar', $3, 'confirmado', $4)`,
        [deuda, r.rows[0].id, dias(-30), admin],
      )
    }

    // Caja, bodega y reglas
    const config: [string, string, string][] = [
      ['caja_inicial_fecha', dias(-3), 'Fecha del último cuadre de caja'],
      ['caja_inicial_monto', '1050000', 'Plata en caja el día del último cuadre'],
      ['conteo_fecha', dias(-2), 'Fecha del último conteo de bultos en bodega'],
      ['conteo_bultos_perro', '5', 'Bultos de perro cerrados en ese conteo'],
      ['conteo_bultos_gato', '3', 'Bultos de gato cerrados en ese conteo'],
      ['dias_aviso', '6', 'Días de comida desde los que el panel dice "Ojo"'],
      ['dias_urgente', '4', 'Días de comida desde los que es urgente (y sale la alerta)'],
      ['vidas_cambiadas', '214', 'Adopciones antes de usar el sistema'],
    ]
    for (const [clave, valor, descripcion] of config) {
      await q(`INSERT INTO config (clave, valor, descripcion) VALUES ($1, $2, $3)`, [clave, valor, descripcion])
    }

    // Plata de los últimos días
    const movimientos: [string, number, string, string, number, string][] = [
      ['ingreso', 300_000, 'donacion', 'Donación por la publicación de Mateo', 2, '19:20'],
      ['ingreso', 40_000, 'padrino', 'Padrino de Luna', 1, '09:10'],
      ['gasto', 150_000, 'limpieza', 'Varsol, jabón y bolsas', 1, '15:30'],
    ]
    for (const [tipo, monto, categoria, concepto, atras, hora] of movimientos) {
      await q(
        `INSERT INTO movimientos_financieros (tipo, monto, categoria, concepto, fecha, estado, creado_en, creado_por)
         VALUES ($1, $2, $3, $4, $5, 'confirmado', $6, $7)`,
        [tipo, monto, categoria, concepto, dias(-atras), momento(atras, hora), admin],
      )
    }

    // Bultos abiertos desde el conteo
    for (const [atras, hora] of [[1, '06:40'], [0, '06:35']] as const) {
      await q(
        `INSERT INTO inventario_movimientos (item_id, cantidad, origen, fecha_hora, estado, creado_por)
         VALUES ($1, -1, 'panel', $2, 'confirmado', $3)`,
        [perro.rows[0].id, momento(atras, hora), cuidador],
      )
    }

    // Canela ya recibió su desparasitante si ya pasaron las 7 a. m.
    if (new Date().getHours() >= 7) {
      await q(
        `INSERT INTO eventos_salud (animal_id, tratamiento_id, tipo, detalle, valor, fecha_hora, estado, creado_por)
         VALUES ($1, $2, 'dosis', 'Desparasitante', '07:00', $3, 'confirmado', $4)`,
        [animal.Canela, tratamiento['Canela/Desparasitante'], momento(0, '06:58'), cuidador],
      )
    }

    await q(
      `INSERT INTO eventos_salud (animal_id, tipo, detalle, fecha_hora, estado, creado_por)
       VALUES ($1, 'observacion', 'La piel ya casi no se ve roja.', $2, 'confirmado', $3)`,
      [animal.Bruno, momento(2, '11:20'), bienestar],
    )

    // Lo que dejó el bot por confirmar esta mañana (aparece en la bandeja del panel)
    const amoxicilina = tratamiento['Mateo/Amoxicilina']
    const r1 = await q(
      `INSERT INTO registros_ia (usuario_id, canal, tipo_entrada, transcripcion, acciones_json, confianza, estado, creado_en)
       VALUES ($1, 'whatsapp', 'audio', $2, $3, 0.92, 'por_confirmar', $4) RETURNING id`,
      [
        cuidador,
        'Le di la amoxicilina a Mateo, ya camina solito, y abrí un bulto de perro.',
        JSON.stringify([
          { tipo: 'dosis', animalId: String(animal.Mateo), tratamientoId: String(amoxicilina), hora: '08:00' },
          { tipo: 'nota', animalId: String(animal.Mateo), texto: 'Ya camina solito.' },
          { tipo: 'inventario', especie: 'perro', cambio: -1 },
        ]),
        momento(0, '08:12'),
      ],
    )
    const reg1 = r1.rows[0].id
    await q(
      `INSERT INTO eventos_salud (animal_id, tratamiento_id, tipo, detalle, valor, fecha_hora, estado, creado_por, registro_id)
       VALUES ($1, $2, 'dosis', 'Amoxicilina', '08:00', $3, 'por_confirmar', $4, $5),
              ($1, NULL, 'observacion', 'Ya camina solito.', NULL, $3, 'por_confirmar', $4, $5)`,
      [animal.Mateo, amoxicilina, momento(0, '08:12'), cuidador, reg1],
    )
    await q(
      `INSERT INTO inventario_movimientos (item_id, cantidad, origen, fecha_hora, estado, creado_por, registro_id)
       VALUES ($1, -1, 'bot', $2, 'por_confirmar', $3, $4)`,
      [perro.rows[0].id, momento(0, '08:12'), cuidador, reg1],
    )

    const r2 = await q(
      `INSERT INTO registros_ia (usuario_id, canal, tipo_entrada, transcripcion, acciones_json, confianza, estado, creado_en)
       VALUES ($1, 'whatsapp', 'imagen', $2, $3, 0.88, 'por_confirmar', $4) RETURNING id`,
      [
        admin,
        'Captura de Nequi: "Recibiste $150.000 de Laura M."',
        JSON.stringify([
          {
            tipo: 'movimiento',
            movimiento: { tipo: 'ingreso', monto: 150_000, categoria: 'donacion', clinicaId: null, abonoDeuda: false, foto: null, nota: 'Nequi · Laura M.' },
          },
        ]),
        momento(0, '07:40'),
      ],
    )
    await q(
      `INSERT INTO movimientos_financieros (tipo, monto, categoria, concepto, medio, estado, creado_en, creado_por, registro_id)
       VALUES ('ingreso', 150000, 'donacion', 'Nequi · Laura M.', 'nequi', 'por_confirmar', $1, $2, $3)`,
      [momento(0, '07:40'), admin, r2.rows[0].id],
    )

    await q('COMMIT')
    console.log(
      `Listo: ${equipo.length} personas del equipo, ${lista.length} animales, ${tratamientos.length} tratamientos, ` +
        `${clinica.length} clínicas y 2 registros por confirmar.`,
    )
  } catch (e) {
    await q('ROLLBACK').catch(() => {})
    throw e
  } finally {
    cliente.release()
    await pool.end()
  }
}

main().catch((e) => {
  console.error(e.message)
  process.exit(1)
})
