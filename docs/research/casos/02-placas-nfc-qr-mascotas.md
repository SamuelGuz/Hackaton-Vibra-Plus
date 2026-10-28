# Caso 02: placas NFC/QR para mascotas y tarjetas de canil con QR

Tema: NN=02, placas-nfc-qr-mascotas. Relacionado con `../../superpowers/specs/2026-10-27-huellitas-placa-viva-design.md` (secciones 5.1, 5.2 y 11).

Nota de método: se hicieron 9 búsquedas web. Se abrieron 5 páginas (ver sección 4). Varias cifras vienen solo de fragmentos de búsqueda o de páginas de proveedores y están marcadas "NO VERIFICADO". No se encontró ningún caso independiente de albergue colombiano o latinoamericano que use placa NFC/QR con voluntarios.

## 1. Tabla de casos

| Quién (país) | Problema | Qué integraron | Cómo se sintieron | Resultado medible | URL |
|---|---|---|---|---|---|
| York County SPCA (Pensilvania, EE. UU.) | Las fichas de canil tradicionales daban poca información útil; el personal y los voluntarios escribían notas sin filtro. | Tarjetas de canil "Shelter Scan" con código QR que lleva a la ficha del animal en su web. Diseño con Adōpets y financiación de Pedigree Foundation. Gratis para refugios y rescates, según el propio YCSPCA. | Según el artículo de Best Friends, la coordinadora dice: "we see them scanning them all the time" (8 palabras). La gente escanea los QR. | NO VERIFICADO: el toolkit dice que busca reducir la estancia y subir adopciones, pero son afirmaciones del programa. No hay cifras antes/después. | https://ycspca.org/blog/introducing-the-shelter-scan-interactive-kennel-card/ ; https://bestfriends.org/node/615895 |
| Helping Hands Humane Society (Topeka, Kansas, EE. UU.) | Los visitantes veían en el canil algo distinto a lo que pasaba en los patios de juego. | Videos de voluntarios subidos a YouTube, con código QR impreso, plastificado y colocado en el canil o en la funda de la tarjeta. Idea propuesta por los propios voluntarios. | Sin cita textual verificada; la fuente describe que el personal lo tomó de los voluntarios. | No hay medición. | https://www.humananimalsupportservices.org/blog/10-ways-shelters-and-rescues-can-use-qr-codes-today/ |
| Best Friends Animal Society (red de refugios, EE. UU.) | Tarjetas de canil poco efectivas. Los voluntarios quieren hacer el rediseño. | Artículo de guía para rediseñar tarjetas y usar QR. Describe el caso de YCSPCA. | El autor escribe que rediseñar las tarjetas es "a task eagerly welcomed by volunteers" (10 palabras). | No hay medición propia. | https://bestfriends.org/node/615895 |
| Shelterbuddy (proveedor de software, EE. UU.) | Saber qué medicamentos vencen en cada animal sin buscar en papel. | Aplicación con QR en la tarjeta de canil: el voluntario escanea, ve los medicamentos pendientes y marca "dado". | No hay cita verificada. Descripción de producto. | NO VERIFICADO: el flujo viene de una página de producto y de un resumen de búsqueda; la página descargada no contenía texto legible. | https://shelterbuddy.com/cutting-edge-features.html |
| Shelter Partner (app iOS, EE. UU.) | Hojas de firma en papel para sacar animales. | Registro digital en vivo para voluntarios. Muestra qué animales necesitan paseo. | No hay cita. Texto de la ficha de la App Store. | NO VERIFICADO (texto de la App Store, no hay datos de uso). | https://apps.apple.com/app/id6449749673 |
| PetHub con Maui Humane Society (Hawái, EE. UU.) | Recuperar mascotas perdidas antes de que entren al refugio. | Placas PetHub con NFC, QR o número de tag. Programa de placas del refugio. | La directora de relaciones con clientes dijo que su principal esperanza era la reunificación inmediata (resumen de búsqueda; la página no pudo descargarse por protección anti-bots). | NO VERIFICADO. PetHub afirma que 96 % de sus mascotas recuperadas vuelven a casa en menos de 24 horas. Es afirmación de la empresa y no hay verificación independiente. | https://www.mauihumanesociety.org/khon2-maui-humane-society-uses-pethub-to-ensure-your-pet-comes-home/ (resumen) ; https://www.wilcotx.gov/1529/PetHub-Tags |
| Municipio de La Florida (Chile) | Mascotas perdidas y falta de datos de contacto. | Collares inteligentes con QR y NFC, entregados gratis (5.000 unidades, agosto 2025). Al escanear, el sistema envía mensaje por WhatsApp al dueño con ubicación y ficha (incluye vacunas y alergias). | No hay cita. | NO VERIFICADO: solo resumen de noticia de prensa. No hay cifras de reunificación. | https://www.elmostrador.cl/datos-utiles/2025/08/13/la-florida-reparte-gratis-5-mil-collares-con-geolocalizacion-para-mascotas-como-conseguirlos/ |
| Fundación Rescatadogs (Colombia) | Gastos veterinarios de rescates. | Placas inteligentes con QR, vendidas para financiar rescates, en alianza con Qrarte Pets. | No hay cita verificada. | NO VERIFICADO: sin cifras de ventas ni de reunificación. Es el único caso colombiano encontrado y es de recaudación, no de operación de albergue. | https://www.diariodelsur.com.co/?p=638381 ; https://www.noticiasrcn.com/tendencias/rescatadogs-busca-pagar-sus-cuentas-medicas-vendiendo-placas-para-mascotas-1059664 |
| Pawscout QR (proveedor, EE. UU. y Canadá, venta al público) | Que cualquiera pueda contactar al dueño al escanear. | Placa de collar con QR. Notifica al dueño cuando alguien escanea. | No hay cita. Reseñas de Tractor Supply: 83 de 87 recomiendan (95 %). Muestra pequeña y una reseña dice que fue difícil de configurar. | NO VERIFICADO: no hay tasa de escaneo ni de reunificación. | https://www.tractorsupply.com/tsc/product/pawscoutqr-the-smart-pet-tag-2087710 |

Sobre iPhone y NFC (dato verificado):
- GoToTags (fabricante de tags) dice que la lectura NFC en segundo plano del iPhone solo está soportada en iPhone XS y posteriores. Fuente: https://gototags.com/help/ios/nfc/reading/background (archivo raw descargado).
- Según un resumen de búsqueda, la lectura en segundo plano también requiere que el teléfono haya sido desbloqueado una vez desde que se encendió, y que el registro sea de tipo URL, TEL o SMS. **NO VERIFICADO**: solo viene de resumen de búsqueda; no apareció en la página descargada.
- Un hilo de desarrolladores de Apple dice que en iOS 14 un iPhone X o anterior no leía tags en segundo plano y que el lector del Centro de control sí servía. **NO VERIFICADO**: foro de desarrolladores, no documentación oficial.

## 2. Patrones

**Qué funcionó (con evidencia débil):**
- El QR en la tarjeta de canil es el patrón con más uso real documentado. YCSPCA y Helping Hands usan QR en canil; el personal y el público lo escanean. Es el caso más cercano a Huellitas: QR en el canil para la ficha, impreso y plastificado.
- Los voluntarios hacen las tarjetas y los carteles (Best Friends y Helping Hands). Eso encaja con un albergue que rota voluntarios.
- Un enlace propio que no depende de la empresa (YCSPCA, con Adōpets o Facebook como destino de respaldo) evita atar el sistema a una marca.

**Qué no se pudo verificar o fracasó:**
- Durabilidad con agua: **NO ENCONTRADO**. No hay pruebas publicadas de NTAG213 expuesto a lluvia en placas de collar. Una fuente de 2013 mencionada en resumen de búsqueda dice que la señal entre tag y teléfono se perdía aunque el teléfono estuviera cerca; es antigua.
- Que la gente sepa escanear: **NO ENCONTRADO** con datos. Hay afirmaciones de proveedores de que casi todos los celulares nuevos tienen lector QR integrado. YCSPCA dice que la gente escanea en el canil. Ningún caso mide si un voluntario o un ciudadano común lo intenta.
- NFC frente a QR: un artículo de RFID Journal de 2021 (solo resumen) dice que NFC aporta valor cuando no se puede escanear QR, y que su disponibilidad en iOS era limitada. Se intentó abrirlo y no se pudo.
- Reunificación: solo cifras de empresas (PetHub 96 % en 24 horas, Pawscout sin dato). Ninguna es independiente. El caso de Chile tiene la mejor idea (WhatsApp al escanear) pero no tiene cifras.
- Información para voluntarios: la mayoría de las herramientas de registro de medicamentos y comidas en canil son productos de proveedores (ShelterBuddy, Shelter Partner, Woods Humane Society). Sus textos hablan de voluntarios que marcan medicamentos o dejan comentarios, pero no hay reseñas independientes ni estudios de uso.
- Por qué abandonaron herramientas: **NO ENCONTRADO**. No se hallaron casos de abandono documentados.

## 3. Qué significa para Huellitas

1. **Mantener el QR como respaldo obligatorio, no opcional.** El spec pone NFC como primario. La fuente de GoToTags dice que el iPhone X o anterior no lee NFC en segundo plano. Un iPhone 8 o X, o un celular que no esté desbloqueado, necesita el QR impreso. Conviene imprimirlo con un tamaño legible y probarlo en un celular de 2018 o anterior.
2. **Poner el QR también en la tarjeta de canil.** El caso de YCSPCA muestra que el QR en el canil se usa todo el tiempo. Para Huellitas, la tarjeta de canil con QR lleva a la ficha de hoy y lo puede leer un voluntario sin tocar la placa. Es una prueba barata y reversible.
3. **Dejar que los voluntarios hagan y reimpriman las tarjetas.** Best Friends y Helping Hands muestran que los voluntarios hacen las tarjetas, las imprimen y las plastifican. Eso encaja con el "sin capacitación" del spec.
4. **No usar 96 % de reunificación en el pitch.** Es una cifra de PetHub sin verificar. Si el jurado pregunta, Huellitas debe decir que es afirmación de la empresa. Usar mejor el caso de La Florida como idea (aviso por WhatsApp al escanear) con la advertencia de que no tiene cifras.
5. **Probar durabilidad antes de comprometerse.** No hay evidencia pública sobre agua o rejas metálicas. El spec ya lo lista como pendiente (sección 11). Antes de la demo conviene dejar una placa en el patio con lluvia durante una semana y registrar si se lee.
6. **Diseñar la página de la placa para el escáner sin app y para el que no sabe escanear.** La evidencia sobre cuánta gente sabe escanear es débil. Por eso la ficha debe tener una línea que diga qué hacer ("Toque la placa o escanee el código") y el botón "Llamar al albergue" visible sin scroll.

## 4. Lista de páginas descargadas en raw/

Carpeta: `C:\Users\astrx\Desktop\Hacaton\docs\research\casos\raw\placas-nfc-qr-mascotas\`

- `bestfriends-kennel-cards.html` (artículo de Best Friends; texto verificado)
- `gototags-ios-lectura-background.html` (fabricante de tags; requisito de iPhone XS verificado)
- `hass-10-usos-qr.html` (Human Animal Support Services; usos de QR en refugios, verificado)
- `shelterbuddy-funciones.html` (página de producto; sin texto legible extraído)
- `ycspca-shelter-scan.html` (blog de YCSPCA; sin texto legible extraído, las afirmaciones se tomaron del resumen de búsqueda y de Best Friends)

Descargas fallidas, eliminadas: RFID Journal (dos URL devolvieron error de 103 bytes) y Maui Humane Society (página de protección anti-bots de Cloudflare).
