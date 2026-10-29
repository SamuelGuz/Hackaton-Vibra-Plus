// Una cosa a la vez en todo el bot para "revisar si alguien ya lo reportó y guardar".
// Los mensajes de cada persona ya van en fila (app.ts), pero los de dos personas corren al tiempo:
// si Yesenia y Andrea mandan la misma dosis por audio en el mismo segundo, las dos verían que falta y la guardarían.
// Lo que va aquí adentro es corto (leer la base y guardar); la IA, que es lo lento, queda afuera.
// No alcanza a dos copias del bot corriendo a la vez: para eso haría falta un candado en la base.

let cola: Promise<unknown> = Promise.resolve()

/** Corre `fn` cuando termine lo anterior. No se debe llamar desde adentro de otro `unoALaVez`: se quedaría esperando. */
export function unoALaVez<T>(fn: () => Promise<T>): Promise<T> {
  const turno = cola.then(fn, fn)
  cola = turno.catch(() => {})
  return turno
}
