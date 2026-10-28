# Medicinas en Excel

Las medicinas, sus lotes y los contactos (proveedores, clínicas, padrinos, donantes, adoptantes, voluntarios) viven en **un solo libro de Excel**. Hoy es la base de datos interna del bot; más adelante el mismo contenido pasa a Google Sheets.

> Los datos que trae el libro de muestra son **ficticios**. Reemplácelos por los reales antes de usarlo.

## Dónde está

- Por defecto: `bot/datos/medicinas.xlsx` (relativo a la carpeta desde donde corre el bot).
- Para cambiarlo: variable de entorno `MEDICINAS_XLSX` con la ruta completa.
- Si el archivo no existe, el bot lo crea con datos de muestra. Para crearlo a mano:

```
cd bot
npm run medicinas:excel                 # crea datos/medicinas.xlsx
npm run medicinas:excel -- ruta.xlsx    # en otra ruta
npm run medicinas:excel -- --forzar     # reemplaza uno existente (pierde lo que tenga)
```

Sin `--forzar` el comando se niega a pisar un archivo que ya existe.

## Las hojas

| Hoja | Para qué |
|---|---|
| `LEEME` | Instrucciones y significado de cada columna (se puede leer dentro del propio Excel). |
| `Medicamentos` | Una fila por medicamento. Obligatorias: **Nombre, Categoría, Unidad**. |
| `Lotes` | Una fila por lote que entró. Obligatorias: **ID medicamento, Vence, Cantidad**. |
| `Contactos` | Una fila por persona o empresa. Obligatorias: **Tipo, Nombre**. |

Columnas principales:

- **Medicamentos**: ID, Nombre, Alias (otros nombres separados por ` | `), Principio activo, Categoría, Presentación, Unidad, Especies, Uso común, Dosis de referencia, Contraindicaciones, Requiere fórmula (Sí/No), Stock mínimo, ID proveedor, Precio unitario (COP).
- **Lotes**: ID, ID medicamento (el ID o el nombre exacto), Número de lote, Vence, Cantidad, Ingreso.
- **Contactos**: ID, Tipo, Nombre, Teléfono, Correo, Ciudad, Nota, Activo (Sí/No).

El libro guarda **solo datos de origen**. El stock no se escribe: el bot lo calcula sumando los lotes que no han vencido; igual las alertas de stock bajo y de vencimiento.

## Cómo editarlo

1. Ábralo en Excel, cambie, agregue filas al final y guarde. El bot detecta el cambio solo.
2. **Cierre Excel** si el bot va a guardar algo (por ejemplo, descontar stock): con el archivo abierto, Windows no deja reemplazarlo y el bot avisa con un mensaje; no se daña nada.
3. Reglas:
   - Fechas: `YYYY-MM-DD` (2027-03-15). También se entiende `15/03/2027`. Un lote sirve hasta el final del día que dice **Vence**.
   - Sí/No: `Sí`, `No` (se entiende también `si`, `SI`).
   - Varios valores en una celda: separados por ` | ` (`Perro | Gato`, `Amoxi | Clamoxyl`).
   - Categoría, Unidad y Tipo tienen lista desplegable.
   - Se toleran espacios de sobra, filas vacías y columnas en otro orden. Las columnas opcionales pueden faltar.
   - Si deja el **ID** vacío, se crea uno a partir del nombre.
4. Si algo no se entiende, el bot **no ignora la fila**: falla con un mensaje como `Hoja Lotes, fila 7: 'vence' no es una fecha (YYYY-MM-DD)`. Corrija esa celda y listo.
5. No agregue hojas propias dentro de este libro: al guardar, el bot reescribe `LEEME`, `Medicamentos`, `Lotes` y `Contactos` y lo demás se pierde. Haga una copia aparte para sus apuntes.

Cada guardado es atómico (se escribe un archivo temporal y se renombra), así que un corte de luz no deja el libro a medias. Aun así, haga copia del archivo de vez en cuando.

## Cómo calcula los días de stock

"Cuántos días alcanza" cruza los tratamientos activos hoy con el catálogo, por nombre o alias (`Fenobarbital (anticonvulsivo)` → `Fenobarbital`). El consumo diario es (tomas al día) × (cantidad por toma), llevada a la **Unidad** del medicamento:

- Misma unidad (`2 pastillas` y unidad `tableta`): tal cual. `media pastilla` y `0,5` cuentan 0,5.
- `ml`, `gotas` (20 por ml) o `baño` (30 ml) contra un frasco, ampolla o tubo: se pasa a ml y se divide por el volumen del envase, que se lee de **Presentación** (`Frasco 60 ml`). Por eso conviene escribir el volumen allí.
- Dosis que no se entiende o no se puede convertir: 1 unidad por toma.

## Migración a Google Sheets

La idea es que la dueña pueda ver y corregir rápido desde el navegador, sin tocar el código del bot.

1. Suba `medicinas.xlsx` a Google Drive y ábralo como Hoja de cálculo de Google. **Conserve los nombres de hoja y los encabezados** (`Medicamentos`, `Lotes`, `Contactos`; fila 1 igual). Las fechas deben seguir siendo texto `YYYY-MM-DD`.
2. Cree una cuenta de servicio de Google, comparta la hoja con ese correo y guarde sus credenciales fuera del repositorio.
3. Escriba un `AlmacenMedicinas` para la API de Sheets (`bot/src/medicinas/almacen-sheets.ts`, mismo contrato que `almacen-excel.ts`): `leer()` trae las tres hojas y reutiliza el mismo análisis de filas y mensajes de error; `guardar()` las reescribe.
4. En `crearMedicinas` (`bot/src/medicinas/index.ts`) cambie el almacén de Excel por el nuevo.

El servicio (búsqueda, stock, vencimientos, días de stock) y el resto del bot **no cambian**: solo conocen la interfaz `AlmacenMedicinas`. El adaptador de Sheets aún no está implementado.
