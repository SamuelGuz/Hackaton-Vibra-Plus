// Audios y fotos en el disco del VPS. Se piden por /archivos/<nombre> con sesión.
import { randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Archivos } from '../tipos.js'

const EXTENSION: Record<string, string> = {
  'audio/ogg': 'ogg',
  'audio/mpeg': 'mp3',
  'audio/mp4': 'm4a',
  'audio/aac': 'aac',
  'audio/amr': 'amr',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}
const MIME = Object.fromEntries(Object.entries(EXTENSION).map(([m, e]) => [e, m]))

export interface ArchivosDisco extends Archivos {
  leer(nombre: string): Promise<{ datos: Buffer; mime: string } | null>
}

export function crearArchivosDisco(carpeta: string): ArchivosDisco {
  return {
    async guardar(datos, mime) {
      const ext = EXTENSION[mime.split(';')[0].trim()] ?? 'bin'
      const nombre = `${randomUUID()}.${ext}`
      await mkdir(carpeta, { recursive: true })
      await writeFile(join(carpeta, nombre), datos)
      return `/archivos/${nombre}`
    },
    async leer(nombre) {
      // Solo nombres que crea guardar(): nada de "../"
      if (!/^[0-9a-f-]{36}\.[a-z0-9]{2,4}$/.test(nombre)) return null
      try {
        const datos = await readFile(join(carpeta, nombre))
        return { datos, mime: MIME[nombre.split('.').pop()!] ?? 'application/octet-stream' }
      } catch {
        return null
      }
    },
  }
}
