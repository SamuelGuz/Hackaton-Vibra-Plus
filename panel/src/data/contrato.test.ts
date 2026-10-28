// El panel y el servidor hablan con los mismos tipos (odd/tasks/backend-y-adopcion.md, S5).
import { describe, expectTypeOf, it } from 'vitest'
import type * as P from './api'
import type * as Sh from '@huellitas/shared/api'
import type * as T from './tipos'
import type * as ST from '@huellitas/shared/tipos'

describe('contrato panel ↔ shared', () => {
  it('los tipos del panel son los de shared', () => {
    expectTypeOf<P.Evento>().toEqualTypeOf<Sh.Evento>()
    expectTypeOf<P.Envio>().toEqualTypeOf<Sh.Envio>()
    expectTypeOf<P.DatosServidor>().toEqualTypeOf<Sh.DatosServidor>()
    expectTypeOf<T.Propuesta>().toEqualTypeOf<ST.Propuesta>()
  })

  it('la respuesta del servidor cabe en lo que lee mandar()', () => {
    expectTypeOf<Sh.RespuestaEventos>().toMatchTypeOf<{ errores?: { error: string }[] }>()
  })
})
