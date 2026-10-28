// npm run hojas: crea en el libro de Google Sheets las pestañas de HOJAS y sus encabezados. Se puede repetir sin riesgo.
// Necesita SHEETS_ID y GOOGLE_SA_JSON (en el entorno o en bot/.env), y el libro compartido con el correo de la cuenta de servicio.
import { MemoryKv } from '../src/store/kv'
import { crearHojas, sheetsDeEnv } from '../src/store/sheets'

try {
  process.loadEnvFile()
} catch {
  // Sin .env: se usa el entorno tal cual
}

const cliente = sheetsDeEnv({ SHEETS_ID: process.env.SHEETS_ID, GOOGLE_SA_JSON: process.env.GOOGLE_SA_JSON }, new MemoryKv())
if (!cliente) {
  console.error('Faltan SHEETS_ID y GOOGLE_SA_JSON: sin ellos no se puede crear las hojas en Google Sheets. Defínelas en el entorno o en bot/.env.')
  process.exit(1)
}

try {
  const cambiadas = await crearHojas(cliente)
  console.log(cambiadas.length === 0 ? 'Las hojas ya estaban listas.' : `Hojas creadas o con encabezados nuevos: ${cambiadas.join(', ')}`)
} catch (error) {
  console.error(`No se pudieron crear las hojas: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
}
