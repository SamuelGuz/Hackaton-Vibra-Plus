# Imágenes del sitio

> Generado por `scripts/optimizar-imagenes.mjs`. No editar a mano: cambiar la tabla `IMAGENES` del script y volver a ejecutarlo.

Resumen: **35** imágenes — 9 sin fondo (recortes), 19 con fondo, 7 hojas de personaje (no usar tal cual; de cada una se extrajo la cara de frente como imagen propia).

Cada imagen se publica como `/media/img/<slug>-480.webp`, `-960.webp` y `-1600.webp`. Los tres nombres existen siempre; si el original es más pequeño no se amplía (el archivo queda al tamaño original y el `srcset` solo lista anchos reales).

En React:

```tsx
import { img } from '../contenido/imagenes';

<img {...img('perro-cafe-sonriente', '(max-width: 768px) 90vw, 40vw')} loading="lazy" />
```

| slug | conFondo | tipo | tamaño | original | uso sugerido |
| --- | --- | --- | --- | --- | --- |
| `beagle-asomado` | no | recorte | 960×467 | 1.png | Solapado entre secciones: apoyar el borde inferior sobre el corte de una sección o encima de una tarjeta |
| `beagle-asomado-pata` | no | recorte | 956×435 | 2.png | Variante del beagle asomado: borde de formulario de donación o pie de página |
| `tres-perros-sentados` | no | recorte | 938×617 | 3.png | Decoración lateral de sección (adopción, requisitos); funciona sobre fondos claros u oscuros |
| `gatos-abrazados-foto` | sí | escena | 1132×1389 | 301CBBDA-25E3-4A7A-A419-FA77A2996EEF.png | Tiene fondo y un borde blanco inclinado a la izquierda; existe la versión recortada gatos-abrazados. Usar en tarjeta de gatos si se prefiere la foto |
| `seis-perros-fila` | no | recorte | 901×355 | 4.png | Franja inferior del hero o separador de secciones a todo el ancho |
| `dos-perros-juntos` | no | recorte | 1193×1268 | 47FF83B5-8D14-47C1-9894-FF04B5DA1F35.png | Hero secundario o sección "Quiénes somos"; el borde inferior está cortado, anclar abajo |
| `cachorro-atigrado-ladrillo` | sí | escena | 1024×1536 | 48E99E06-B03D-4486-B736-6C0567622CB0.png | Tarjeta vertical de adopción; existe la versión recortada cachorro-atigrado |
| `perro-cafe-sonriente` | no | recorte | 917×911 | 5.png | Hero principal: expresión alegre y contorno completo, se puede flotar sobre cualquier color |
| `perro-abuelo-pata-vendada` | no | recorte | 1000×1000 | 6.png | Sección de historias de rescate o donaciones para tratamientos; el pelaje toca los bordes, anclar a una esquina |
| `perro-cafe-lengua-ladrillo` | sí | escena | 1194×1317 | 8A6F3FE0-D7F5-423B-B01E-6EC433EF0FD1.png | Tarjeta de adopción o testimonio; mismo perro que perro-cafe-lengua-cuadros |
| `perros-calle-grupo-ladrillo` | sí | escena | 1268×1241 | 924AF46E-E62E-4D96-B682-68D25CB44F21.png | Sección "El refugio hoy" o fondo de bloque de donación con overlay oscuro |
| `perro-cafe-lengua-cuadros` | sí | estudio | 1203×1307 | A9E56DAD-841D-4A2E-BE58-DF984D1A28E7.png | ATENCIÓN: el fondo es un patrón de cuadros falso pintado (no es transparencia real) con marca de agua; quitar el fondo antes de usar |
| `chihuahua-primer-plano` | sí | escena | 1165×1350 | B52490AF-B0FE-4B36-9911-B01254F38F41.png | Tarjeta de adopción de perros pequeños |
| `cinco-perros-mirando-arriba` | sí | estudio | 2752×1536 | Brown_dogs_looking_up_9eb197f5_2K.jpg | Banner horizontal de llamada a la acción ("Ellos te esperan"); fondo blanco fácil de recortar |
| `hoja-chihuahua` | sí | hoja-personaje | 2752×1536 | Chihuahua_character_turnaround_s…_07003b4e_2K.jpg | No usar tal cual (varias vistas en una imagen). Usar chihuahua-cara |
| `chihuahua-cara` | sí | estudio | 676×666 | Chihuahua_character_turnaround_s…_07003b4e_2K.jpg (recorte) | Avatar o tarjeta pequeña de adopción (extraída de hoja-chihuahua) |
| `gatos-abrazados` | no | recorte | 1197×1314 | DA31A476-1850-415D-AA2B-6396C71B1BAD.png | Sección de gatos o hero alternativo; transmite calma y cuidado |
| `hoja-perro-blanco-negro` | sí | hoja-personaje | 2752×1536 | Dog_character_design_turnaround_…_c46c8138_2K.jpg | No usar tal cual (varias vistas en una imagen). Usar perro-blanco-negro-cara |
| `perro-blanco-negro-cara` | sí | estudio | 700×584 | Dog_character_design_turnaround_…_c46c8138_2K.jpg (recorte) | Tarjeta de adopción (extraída de hoja-perro-blanco-negro) |
| `hoja-perro-crema` | sí | hoja-personaje | 2752×1536 | Dog_character_turnaround_sheet_ffdb7c0b_2K.jpg | No usar tal cual (varias vistas en una imagen). Usar perro-crema-cara |
| `perro-crema-cara` | sí | estudio | 740×564 | Dog_character_turnaround_sheet_ffdb7c0b_2K.jpg (recorte) | Tarjeta de adopción (extraída de hoja-perro-crema) |
| `hoja-perro-negro-fuego` | sí | hoja-personaje | 2752×1536 | Dog_character_turnaround_sheet_l…_c3cde602_2K.jpg | No usar tal cual (varias vistas en una imagen). Usar perro-negro-fuego-cara |
| `perro-negro-fuego-cara` | sí | estudio | 668×572 | Dog_character_turnaround_sheet_l…_c3cde602_2K.jpg (recorte) | Tarjeta de adopción (extraída de hoja-perro-negro-fuego) |
| `perros-calle-grupo-cuadros` | sí | escena | 1317×1194 | E04B29E9-9A06-4DF1-BF3B-CEC2557EDF1B.png | ATENCIÓN: la parte superior tiene un patrón de cuadros falso pintado (no es transparencia real) con marca de agua; quitar el fondo antes de usar |
| `cachorro-atigrado` | no | recorte | 1155×1227 | F427C150-77B6-4C2A-83C8-DD74BCAB5CDE.png | Hero o bloque de adopción: mirada directa muy emotiva; anclar al borde inferior |
| `cuatro-perros-collares` | sí | estudio | 2752×1536 | Four_dogs_posing_in_studio_86943680_2K.jpg | Sección de adopción o "Conoce a la manada"; formato panorámico |
| `manada-perros-rescatados` | sí | estudio | 1888×2258 | Gemini_Generated_Image_dtrkpddtrkpddtrk.jpg | Historia de "antes del rescate"; imagen generada con IA, revisar si se usa |
| `dos-perros-adopcion` | sí | estudio | 2752×1536 | Rescued_dogs_posing_for_adoption_a52d8bc5_2K.jpg | Llamada a la acción de adopción; mucho aire alrededor para texto |
| `hoja-gato-atigrado` | sí | hoja-personaje | 2752×1536 | Tabby_cat_character_turnaround_s…_87e62f67_2K.jpg | No usar tal cual (varias vistas en una imagen). Usar gato-atigrado-cara |
| `gato-atigrado-cara` | sí | estudio | 572×602 | Tabby_cat_character_turnaround_s…_87e62f67_2K.jpg (recorte) | Tarjeta de adopción de gatos (extraída de hoja-gato-atigrado) |
| `hoja-gatito-atigrado` | sí | hoja-personaje | 2752×1536 | Tabby_kitten_character_turnaroun…_94a90708_2K.jpg | No usar tal cual (varias vistas en una imagen). Usar gatito-atigrado-cara |
| `gatito-atigrado-cara` | sí | estudio | 592×560 | Tabby_kitten_character_turnaroun…_94a90708_2K.jpg (recorte) | Tarjeta de adopción de gatitos (extraída de hoja-gatito-atigrado) |
| `hoja-terrier-gris` | sí | hoja-personaje | 2752×1536 | Terrier_character_turnaround_sheet_ed195a64_2K.jpg | No usar tal cual (varias vistas en una imagen). Usar terrier-gris-cara |
| `terrier-gris-cara` | sí | estudio | 640×564 | Terrier_character_turnaround_sheet_ed195a64_2K.jpg (recorte) | Tarjeta de adopción (extraída de hoja-terrier-gris) |
| `chihuahua-y-perro-grande` | sí | estudio | 2752×1536 | Two_rescue_dogs_sitting_f287165b_2K.jpg | Sección "Todos los tamaños" o llamada a la acción de adopción |

## Cómo reemplazar una imagen después de quitarle el fondo

1. Exportar la imagen sin fondo como **PNG con transparencia**.
2. Guardarla en `fuentes/` con **el mismo nombre** que el original (la extensión puede cambiar, por ejemplo `Four_dogs_posing_in_studio_86943680_2K.jpg` → `Four_dogs_posing_in_studio_86943680_2K.png`) y borrar o mover el archivo viejo.
3. Ejecutar desde la raíz del proyecto:

   ```
   node scripts/optimizar-imagenes.mjs
   ```

4. Listo: las rutas `/media/img/<slug>-*.webp` no cambian. El script detecta la transparencia real, marca `conFondo: false`, cambia el tipo a `recorte` y recorta los márgenes vacíos. Las caras extraídas de hojas de personaje usan las mismas coordenadas, así que una hoja sin fondo también produce caras sin fondo.

Notas:

- `perro-cafe-lengua-cuadros` y `perros-calle-grupo-cuadros` tienen un **patrón de cuadros pintado** que imita transparencia (no es transparencia real) y marca de agua: hay que quitarles el fondo.
- `gatos-abrazados-foto` tiene un borde blanco inclinado a la izquierda; ya existe la versión recortada `gatos-abrazados`.
- Para agregar una imagen nueva: copiarla a `fuentes/`, añadir una fila a `IMAGENES` en el script con su `slug`, `alt`, `tipo` y `sugerencia`, y ejecutar el script.
