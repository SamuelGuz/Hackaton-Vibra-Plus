import { randomBytes } from 'node:crypto'
import type pg from 'pg'
import { cargarHoy } from '../api/hoy.js'
import type { Accion, Estado, EstadoRegistro, NuevoRegistro, Registro, Repo, Usuario } from '../tipos.js'
import { normalizarTelefono } from '../wa/telefono.js'
import { enTransaccion, type Pool } from './db.js'

const DIAS_SESION = 90
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export interface RepoPg extends Repo {
  usuarioPorSesion(token: string): Promise<Usuario | null>
  pool: Pool
}

export function crearRepoPg(pool: Pool): RepoPg {
  const usuarioDe = (r: { id: number; nombre: string; rol: Usuario['rol']; telefono: string }): Usuario => ({
    id: r.id,
    nombre: r.nombre,
    rol: r.rol,
    telefono: r.telefono,
  })

  return {
    pool,

    async usuarioPorTelefono(telefono) {
      const r = await pool.query(
        `SELECT id, nombre, rol, telefono FROM usuarios
         WHERE activo AND regexp_replace(telefono, '\\D', '', 'g') = $1`,
        [normalizarTelefono(telefono)],
      )
      return r.rows[0] ? usuarioDe(r.rows[0]) : null
    },

    async anotarSolicitud(telefono, nombrePerfil) {
      await pool.query(
        `INSERT INTO solicitudes_equipo (telefono, nombre_perfil) VALUES ($1, $2)
         ON CONFLICT (telefono) DO UPDATE SET
           nombre_perfil = coalesce(EXCLUDED.nombre_perfil, solicitudes_equipo.nombre_perfil),
           mensajes = solicitudes_equipo.mensajes + 1,
           ultimo_mensaje_en = now()`,
        [normalizarTelefono(telefono), nombrePerfil?.trim() || null],
      )
    },

    async equipo() {
      const [personas, solicitudes] = await Promise.all([
        pool.query(`SELECT id, nombre, rol, telefono, activo FROM usuarios ORDER BY activo DESC, nombre`),
        pool.query(
          `SELECT telefono, nombre_perfil, mensajes, ultimo_mensaje_en FROM solicitudes_equipo ORDER BY ultimo_mensaje_en DESC`,
        ),
      ])
      return {
        personas: personas.rows.map((r) => ({ ...usuarioDe(r), id: Number(r.id), activo: r.activo })),
        solicitudes: solicitudes.rows.map((r) => ({
          telefono: r.telefono,
          nombre: r.nombre_perfil,
          mensajes: r.mensajes,
          ultimoMensajeEn: new Date(r.ultimo_mensaje_en).toISOString(),
        })),
      }
    },

    async agregarAlEquipo(m) {
      const telefono = normalizarTelefono(m.telefono)
      return enTransaccion(pool, async (c) => {
        const ya = await c.query(
          `UPDATE usuarios SET nombre = $2, rol = $3, activo = true
           WHERE regexp_replace(telefono, '\\D', '', 'g') = $1 RETURNING id, nombre, rol, telefono`,
          [telefono, m.nombre, m.rol],
        )
        const fila =
          ya.rows[0] ??
          (
            await c.query(`INSERT INTO usuarios (telefono, nombre, rol) VALUES ($1, $2, $3) RETURNING id, nombre, rol, telefono`, [
              telefono,
              m.nombre,
              m.rol,
            ])
          ).rows[0]
        await c.query(`DELETE FROM solicitudes_equipo WHERE telefono = $1`, [telefono])
        return { ...usuarioDe(fila), id: Number(fila.id) }
      })
    },

    async cambiarActivo(usuarioId, activo) {
      const r = await pool.query(`UPDATE usuarios SET activo = $2 WHERE id = $1`, [usuarioId, activo])
      return r.rowCount === 1
    },

    async descartarSolicitud(telefono) {
      await pool.query(`DELETE FROM solicitudes_equipo WHERE telefono = $1`, [normalizarTelefono(telefono)])
    },

    async contarSolicitudes() {
      const r = await pool.query(`SELECT count(*)::int AS n FROM solicitudes_equipo`)
      return r.rows[0].n
    },

    async usuarioPorId(id) {
      const r = await pool.query(`SELECT id, nombre, rol, telefono FROM usuarios WHERE activo AND id = $1`, [id])
      return r.rows[0] ? usuarioDe(r.rows[0]) : null
    },

    async usuarioPorSesion(token) {
      const r = await pool.query(
        `SELECT u.id, u.nombre, u.rol, u.telefono FROM sesiones_panel s JOIN usuarios u ON u.id = s.usuario_id
         WHERE s.token = $1 AND s.expira_en > now() AND u.activo`,
        [token],
      )
      return r.rows[0] ? usuarioDe(r.rows[0]) : null
    },

    async guardarEntrante(m, ahora) {
      const r = await pool.query(
        `INSERT INTO mensajes_wa (wa_message_id, telefono, nombre, entrada, estado, recibido_en, proximo_en)
         VALUES ($1, $2, $3, $4, 'pendiente', $5, $5) ON CONFLICT DO NOTHING`,
        [m.id, m.de, m.nombre, JSON.stringify(m.entrada), ahora],
      )
      return r.rowCount === 1
    },

    async entrantesPendientes(ahora, limite) {
      const r = await pool.query(
        `SELECT wa_message_id, telefono, nombre, entrada, intentos, recibido_en FROM mensajes_wa
         WHERE estado = 'pendiente' AND proximo_en <= $1
         ORDER BY recibido_en LIMIT $2`,
        [ahora, limite],
      )
      return r.rows.map((x) => ({
        id: x.wa_message_id,
        de: x.telefono,
        nombre: x.nombre,
        entrada: x.entrada,
        intentos: x.intentos,
        recibidoEn: x.recibido_en,
      }))
    },

    async cerrarEntrante(id, estado, error) {
      await pool.query(`UPDATE mensajes_wa SET estado = $2, error = $3 WHERE wa_message_id = $1`, [id, estado, error ?? null])
    },

    async reintentarEntrante(id, proximoEn, error) {
      await pool.query(
        `UPDATE mensajes_wa SET intentos = intentos + 1, proximo_en = $2, error = $3 WHERE wa_message_id = $1`,
        [id, proximoEn, error],
      )
    },

    async leerEstado(usuarioId) {
      const r = await pool.query(`SELECT paso, datos, actualizado_en FROM conversaciones WHERE usuario_id = $1`, [usuarioId])
      const f = r.rows[0]
      if (!f) return null
      return { estado: { ...f.datos, paso: f.paso } as Estado, actualizadoEn: f.actualizado_en }
    },

    async guardarEstado(usuarioId, estado) {
      const { paso, ...datos } = estado
      await pool.query(
        `INSERT INTO conversaciones (usuario_id, paso, datos, actualizado_en) VALUES ($1, $2, $3, now())
         ON CONFLICT (usuario_id) DO UPDATE SET paso = $2, datos = $3, actualizado_en = now()`,
        [usuarioId, paso, JSON.stringify(datos)],
      )
    },

    hoy: (ahora) => cargarHoy(pool, ahora),

    async crearRegistro(n) {
      return enTransaccion(pool, async (c) => {
        const ins = await c.query(
          `INSERT INTO registros_ia (usuario_id, canal, tipo_entrada, media_url, transcripcion, acciones_json, confianza, estado, cliente_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (cliente_id) DO NOTHING RETURNING id`,
          [
            n.usuarioId,
            n.canal,
            n.tipoEntrada,
            n.mediaUrl ?? null,
            n.transcripcion,
            JSON.stringify(n.acciones),
            n.confianza ?? null,
            n.estado,
            n.clienteId ?? null,
          ],
        )
        if (ins.rowCount === 0) {
          // El panel reenvió algo que ya estaba guardado
          const ya = await c.query(`SELECT id FROM registros_ia WHERE cliente_id = $1`, [n.clienteId])
          return String(ya.rows[0].id)
        }
        const registroId: number = ins.rows[0].id
        const origen = n.canal === 'panel' ? 'panel' : 'bot'
        const soporte = n.mediaUrl ?? null
        for (const a of n.acciones) await insertarAccion(c, a, { registroId, estado: n.estado, usuarioId: n.usuarioId, origen, soporte })
        return String(registroId)
      })
    },

    async leerRegistro(id) {
      if (!/^\d+$/.test(id)) return null
      const r = await pool.query(`SELECT id, usuario_id, estado, acciones_json, media_url FROM registros_ia WHERE id = $1`, [id])
      const f = r.rows[0]
      if (!f) return null
      const reg: Registro = {
        id: String(f.id),
        usuarioId: f.usuario_id,
        estado: f.estado,
        acciones: f.acciones_json ?? [],
        mediaUrl: f.media_url,
      }
      return reg
    },

    async cambiarEstado(ids, estado) {
      const numeros = ids.filter((x) => /^\d+$/.test(x))
      const uuids = ids.filter((x) => UUID.test(x))
      if (numeros.length + uuids.length === 0) return 0
      return enTransaccion(pool, async (c) => {
        // "anulado" no tiene vuelta atrás; confirmar solo aplica a lo que estaba por confirmar
        const desde: EstadoRegistro[] = estado === 'confirmado' ? ['por_confirmar'] : ['por_confirmar', 'confirmado', 'corregido']
        const r = await c.query<{ id: number; antes: EstadoRegistro }>(
          `WITH previo AS (
             SELECT id, estado FROM registros_ia
             WHERE (id = ANY($2::bigint[]) OR cliente_id = ANY($3::uuid[])) AND estado = ANY($4::text[])
             FOR UPDATE
           )
           UPDATE registros_ia r SET estado = $1 FROM previo WHERE r.id = previo.id
           RETURNING r.id, previo.estado AS antes`,
          [estado, numeros, uuids, desde],
        )
        const cambiados = r.rows.map((f) => f.id)
        if (cambiados.length === 0) return 0
        // Si se corrige, lo que se había guardado se anula y la versión buena llega como un registro nuevo
        const hijo = estado === 'confirmado' ? 'confirmado' : 'anulado'
        for (const tabla of ['eventos_salud', 'inventario_movimientos', 'movimientos_financieros']) {
          await c.query(`UPDATE ${tabla} SET estado = $1 WHERE registro_id = ANY($2::bigint[]) AND estado <> 'anulado'`, [
            hijo,
            cambiados,
          ])
        }
        // Cambios de estado del animal: se aplican al confirmar y se devuelven si se deshace algo ya aplicado
        if (estado === 'confirmado') {
          await c.query(
            `UPDATE animales a SET estado = h.estado_nuevo FROM historial_estados h
             WHERE h.registro_id = ANY($1::bigint[]) AND a.id = h.animal_id`,
            [cambiados],
          )
        } else {
          const aplicados = r.rows.filter((f) => f.antes === 'confirmado').map((f) => f.id)
          await c.query(
            `UPDATE animales a SET estado = h.estado_anterior FROM historial_estados h
             WHERE h.registro_id = ANY($1::bigint[]) AND a.id = h.animal_id
               AND a.estado = h.estado_nuevo AND h.estado_anterior IS NOT NULL`,
            [aplicados],
          )
        }
        return cambiados.length
      })
    },

    async crearSesion(usuarioId) {
      const token = randomBytes(24).toString('base64url')
      await pool.query(
        `INSERT INTO sesiones_panel (token, usuario_id, expira_en) VALUES ($1, $2, now() + make_interval(days => $3))`,
        [token, usuarioId, DIAS_SESION],
      )
      return token
    },
  }
}

interface Contexto {
  registroId: number
  estado: 'por_confirmar' | 'confirmado'
  usuarioId: number
  origen: 'bot' | 'panel'
  /** Foto de la factura o del comprobante, si llegó con el registro */
  soporte: string | null
}

/** Guarda una acción en su tabla. Falla (y deshace todo el registro) si apunta a algo que no existe. */
async function insertarAccion(c: pg.PoolClient, a: Accion, x: Contexto): Promise<void> {
  const exigir = (r: pg.QueryResult, que: string) => {
    if (r.rowCount !== 1) throw new Error(`No se pudo guardar ${que}: no existe en la base`)
  }
  switch (a.tipo) {
    case 'dosis': {
      const r = await c.query(
        `INSERT INTO eventos_salud (animal_id, tratamiento_id, tipo, detalle, valor, estado, creado_por, registro_id)
         SELECT animal_id, id, 'dosis', medicamento, $2, $3, $4, $5 FROM tratamientos WHERE id = $1`,
        [Number(a.tratamientoId), a.hora, x.estado, x.usuarioId, x.registroId],
      )
      return exigir(r, 'la dosis')
    }
    case 'nota': {
      const r = await c.query(
        `INSERT INTO eventos_salud (animal_id, tipo, detalle, estado, creado_por, registro_id)
         SELECT id, 'observacion', $2, $3, $4, $5 FROM animales WHERE id = $1`,
        [Number(a.animalId), a.texto, x.estado, x.usuarioId, x.registroId],
      )
      return exigir(r, 'la nota')
    }
    case 'inventario': {
      const r = await c.query(
        `INSERT INTO inventario_movimientos (item_id, cantidad, origen, estado, creado_por, registro_id)
         SELECT id, $2, $3, $4, $5, $6 FROM catalogo_items
         WHERE tipo = 'comida' AND especie_objetivo = $1 ORDER BY id LIMIT 1`,
        [a.especie, a.cambio, x.origen, x.estado, x.usuarioId, x.registroId],
      )
      return exigir(r, `la comida de ${a.especie}`)
    }
    case 'movimiento': {
      const m = a.movimiento
      const tipo = m.abonoDeuda ? 'abono' : m.tipo
      await c.query(
        `INSERT INTO movimientos_financieros (tipo, monto, categoria, entidad_id, concepto, soporte_url, estado, creado_por, registro_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          tipo,
          m.monto,
          m.categoria,
          m.clinicaId ? Number(m.clinicaId) : null,
          m.nota || null,
          m.foto ?? x.soporte,
          x.estado,
          x.usuarioId,
          x.registroId,
        ],
      )
      return
    }
    case 'estado_animal': {
      const r = await c.query(
        `INSERT INTO historial_estados (animal_id, estado_anterior, estado_nuevo, motivo, creado_por, registro_id)
         SELECT id, estado, $2, $3, $4, $5 FROM animales WHERE id = $1`,
        [Number(a.animalId), a.estado, x.origen === 'panel' ? 'Desde el panel' : 'Por WhatsApp', x.usuarioId, x.registroId],
      )
      exigir(r, 'el cambio de estado')
      if (x.estado === 'confirmado') await c.query(`UPDATE animales SET estado = $2 WHERE id = $1`, [Number(a.animalId), a.estado])
      return
    }
    case 'deuda': {
      await c.query(
        `INSERT INTO movimientos_financieros (tipo, monto, categoria, entidad_id, concepto, soporte_url, estado, creado_por, registro_id)
         VALUES ('factura', $1, 'veterinaria', $2, $3, $4, $5, $6, $7)`,
        [a.monto, Number(a.clinicaId), a.nota || null, x.soporte, x.estado, x.usuarioId, x.registroId],
      )
      return
    }
  }
}
