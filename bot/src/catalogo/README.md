# Catálogo público de demostración

El arranque externo activa por defecto los cinco perros de `CATALOGO_DEMO`: Mateo, Bruno, Canela, Pecas y Toby. Filtra perfiles públicos sin borrar los demás animales del repositorio. `CATALOGO_DEMO=apagado` conserva el catálogo anterior de un despliegue. El motor genérico `crearRag` sigue sin restricción salvo que se indique `catalogoDemo: true`.

Las cinco imágenes se asignaron para una demostración; no son evidencia de identidad. Los perfiles llevan `datosDemo: true` e `historiaConfirmada: false`. Una historia curada solo se confirma con `historiaConfirmada: true` explícito fuera del modo demo.

`montarRutasFotosCatalogo(app)` sirve exclusivamente los cinco PNG de `assets/` en `/api/publico/catalogo/fotos/{nombre}.png`. No sirve rutas de archivos ni URLs proporcionadas por usuarios. `crearSalidaCatalogo` genera el HTML con hasta tres candidatos, escapa el texto e incrusta estos mismos archivos locales antes de llamar al dibujante de informes. Solo asigna estas fotos cuando `datosDemo` es `true`; un animal real homónimo nunca hereda una foto demo. Las fotos remotas de animales reales se representan con un marcador, sin descargar URLs arbitrarias.

`npm run build` compila TypeScript y copia los cinco PNG a `bot/dist/src/catalogo/assets/`. Se prueba primero el directorio contiguo al módulo y luego el directorio fuente. Nunca se busca un archivo fuera de esas rutas fijas.

Para preparar los registros de la base, `npm run catalogo:preparar` muestra una vista previa sin conectar a Postgres. Con el entorno de la base ya seleccionado, `node --env-file=.env --import tsx scripts/catalogo-demo.ts --aplicar` inserta los cinco nombres que falten y asigna sus fotos a los existentes, en una sola transacción. No borra los otros registros ni cambia estados sanitarios. Si hay nombres duplicados o un perro adoptado/fallecido, cancela la transacción. Las asignaciones son de demostración y no deben confundirse con identidades verificadas.

Configurar `PUBLICO_API_URL` (o `BOT_PUBLIC_URL` / `API_PUBLICA_URL`) con el origen público del bot para consumidores ajenos a HTTP. Sin esa variable las rutas HTTP convierten las fotos permitidas a URLs absolutas usando el origen de la petición, lo que permite que el panel viva en otro dominio.
