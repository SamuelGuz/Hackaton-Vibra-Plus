// npm run seed: carga la semilla de 70 animales (generarSemilla) en Google Sheets. No duplica: omite las pestañas que ya tienen datos.
// Corre antes `npm run hojas`. Necesita SHEETS_ID y GOOGLE_SA_JSON (en el entorno o en bot/.env).
import { MemoryKv } from '../src/store/kv'
import { cargarSemilla, generarSemilla } from '../src/store/semilla'
import { sheetsDeEnv } from '../src/store/sheets'

try {
  process.loadEnvFile()
} catch {
  // Sin .env: se usa el entorno tal cual
}

const cliente = sheetsDeEnv({ SHEETS_ID: process.env.SHEETS_ID, GOOGLE_SA_JSON: process.env.GOOGLE_SA_JSON }, new MemoryKv())
if (!cliente) {
  console.error('Faltan SHEETS_ID y GOOGLE_SA_JSON: sin ellos no se puede cargar la semilla en Google Sheets. Defínelas en el entorno o en bot/.env.')
  process.exit(1)
}

try {
  const { cargadas, omitidas } = await cargarSemilla(cliente, generarSemilla())
  if (cargadas.length > 0) console.log(`Semilla cargada en: ${cargadas.join(', ')}`)
  if (omitidas.length > 0) console.log(`Ya tenían datos (no se tocaron): ${omitidas.join(', ')}`)
} catch (error) {
  console.error(`No se pudo cargar la semilla: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
}
