import { cpSync, mkdirSync } from 'node:fs'

const destino = new URL('../dist/src/catalogo/assets/', import.meta.url)
mkdirSync(destino, { recursive: true })
cpSync(new URL('../src/catalogo/assets/', import.meta.url), destino, { recursive: true })
