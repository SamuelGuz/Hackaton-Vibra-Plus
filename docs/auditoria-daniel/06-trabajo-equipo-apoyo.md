# Plan de trabajo para equipo de apoyo

## Para qué sirve este plan

Repartir trabajo útil entre tres personas que no van a programar. El objetivo es ayudar a Daniel y Samuel a cerrar validación, datos, imágenes, pruebas y presentación sin rehacer el panel ni confundir una demo con el refugio real.

**Punto de partida:** se asume que el panel principal de Samuel ya está integrado. Daniel aún tiene pendientes de adopciones/portal público según la auditoría: no se debe presentar una pantalla o conexión como lista hasta verla en el build que se vaya a mostrar. Este documento propone tareas y cantidades para repartir; no fija calendario, equipo del jurado ni resultados que aún no se midieron.

**Límites de las tres personas:** no escribir código, no editar datos de producción, no pedir ni manejar claves, cuentas o credenciales, y no contactar usuarios o servicios por cuenta propia. Trabajar en copias locales, fichas de revisión, capturas y archivos de Canva. Separar siempre `REAL CONFIRMADO`, `DEMO` y `DESCONOCIDO`.

## Qué puede comenzar hoy

- **A — Datos y validación:** crear la hoja de inventario con pestañas separadas para datos de demo y datos reales; marcar los hechos cuya fuente no se pueda comprobar como `desconocido`; preparar preguntas puntuales para Daniel y Samuel.
- **B — Imágenes y presentación:** reunir capturas del panel que Samuel ya integró, proponer el orden de 6–8 diapositivas en Canva y establecer etiquetas/créditos de imágenes. Puede preparar la plantilla sin inventar una landing de adopción que aún no existe.
- **C — Pruebas manuales y pitch:** preparar la matriz de pruebas, ejecutar recorridos únicamente en demo/local sin guardar cambios en producción y armar un guion adaptable de 3–5 minutos. La duración es una propuesta que se ajusta cuando se conozca la presentación real.

Las tres tareas pueden avanzar en paralelo. Después se juntan los hallazgos: A entrega qué afirmaciones sí se pueden usar; B entrega capturas y recursos con crédito; C convierte fallas observadas y brechas conocidas en el guion y la lista visible de pendientes.

## Reparto listo para asignar

### Persona A — Catálogo y verificación de datos

**Prioridad alta**

- [ ] Crear una hoja Excel/Google Sheets con una pestaña `DEMO` y otra `REALES_CONFIRMADOS`. No copiar automáticamente una fila de demo a la lista real.
- [ ] Preparar primero una muestra pequeña de **10–15 fichas prioritarias** para revisar; es una cantidad propuesta, no una meta del producto. Ampliar solo si la fundación puede confirmar datos y hay tiempo.
- [ ] Usar una columna por dato y dejar en blanco o `desconocido` lo que nadie haya confirmado. No deducir edad, historia, conducta, compatibilidad o salud por la foto o por el texto demo.
- [ ] Aclarar que el catálogo actual suma **45 perros y 25 gatos**, no 70 perros. El RAG advierte que las historias/datos son demostrativos; no usarlos como testimonios reales.
- [ ] Separar `meta de apadrinamiento mensual` de `costo mensual real`. Si no hay fuente contable confirmada, registrar el costo como desconocido; no copiar la meta como si fuera gasto.
- [ ] No añadir cédulas, direcciones, teléfonos ni información de solicitantes. Para validar adopciones, usar exclusivamente solicitudes ficticias.

**Plantilla de columnas**

| Columna | Qué registrar |
|---|---|
| `id` | ID del sistema o ID demo, sin inventar IDs reales |
| `nombre` / `especie` / `estado` | Dato y fecha en que se consultó |
| `historia_rescate` | Texto literal confirmado o `desconocido`; no completar huecos |
| `edad` / `tamaño` / `energía` | Valor, unidad cuando aplique, fuente y confirmación |
| `niños` / `gatos` / `apartamento` | `sí`, `no` o `no probado`; añadir la fuente |
| `advertencias_médicas` | Texto fiel a indicación verificada; responsable que confirma y fecha |
| `costo_mensual_real_COP` | Solo con registro contable o indicación responsable; si no, `desconocido` |
| `meta_apadrinamiento_COP` | Meta separada del costo; fuente y fecha |
| `foto` / `crédito` | Nombre del archivo y autorización/licencia/fuente |
| `tipo_dato` | `real confirmado`, `demo` o `desconocido` |
| `confirmado_por` / `fecha_confirmación` | Persona/rol que validó y fecha; si no existe, `pendiente` |
| `nota_de_revisión` | Duda concreta para resolver; nunca una suposición |

**Criterio de aceptación**

- [ ] La hoja mantiene separados demo/real, contiene fuentes y estado de confirmación por dato, deja claros los desconocidos y no expone información personal.
- [ ] Ninguna historia demo pasa a la pestaña real sin confirmación explícita. Ninguna incompatibilidad o advertencia médica se suaviza para que una ficha “se vea mejor”.
- [ ] Las fichas que Daniel use llevan identificador y nota de procedencia para que pueda decidir qué se presenta, qué se oculta y qué se marca como ilustrativo.

**Handoff a Daniel y Samuel**

- A Daniel: lista de fichas utilizables con confirmación y una lista aparte de desconocidos/demo; no copiar las fichas no confirmadas al portal como hechos.
- A Samuel: correcciones concretas de nombres/estado/atributos de demo y su fuente; no pedirle una carga a producción.
- A ambos: resumen de una página con conteo de filas confirmadas, demo y desconocidas. Si el conteo confirmado es cero o pequeño, decirlo con claridad en la presentación.

### Persona B — Imágenes, edición y Canva

**Prioridad alta**

- [ ] Capturar las pantallas actuales del panel integrado de Samuel y conservar una versión original de cada captura. Elegir 4–6 capturas que muestren trabajo existente, por ejemplo Hoy/comida, ficha del animal, caja/deuda y confirmación si están en el build disponible.
- [ ] Preparar un deck de **6–8 diapositivas máximo** en Canva, usando los tokens, tipografías y estilo visual ya presentes en el panel. No rediseñar componentes ni volver a dibujar el panel.
- [ ] Para fotos de animales, priorizar fotos reales autorizadas por Huellitas. Si no hay, usar fotos de referencia con licencia comprobada solo en demo, sin asociarlas a un animal real por nombre y con etiqueta visible `imagen ilustrativa`.
- [ ] Seguir la guía existente: evitar imágenes generadas con IA y guardar crédito/licencia junto a cada foto que se proponga; el plan estima unas 15 fotos reales de recurso para demo, pero no es requisito para el deck.
- [ ] Editar solo encuadre, tamaño, orientación y legibilidad/contraste. No cambiar marcas, pelaje, tamaño, expresión, lesiones, condición médica ni añadir elementos que hagan pasar una imagen por evidencia clínica. Conservar el original y anotar edición/licencia.
- [ ] Si no se consigue foto autorizada, usar la silueta o tarjeta sin foto que ya plantea el diseño, no una falsa foto de Mateo, Bruno u otro animal.

**Borrador de orden de diapositivas**

1. **Dolor concreto:** problemas descritos en la entrevista y caso Bruno/Mateo, con atribución a la entrevista; no presentarlos como mediciones actuales del sistema.
2. **Qué se prioriza:** un flujo operativo pequeño que ayuda a registrar y consultar, y el porqué según los requerimientos.
3. **Demo del panel actual:** captura o recorrido breve de la pantalla realmente disponible; distinguir lo conectado de lo que usa datos demo.
4. **Adopciones y datos:** mostrar únicamente lo existente o etiquetar el resto `pendiente/demo`; explicar la importancia de advertencias verificadas y decisión humana.
5. **Arquitectura real:** panel, bot/API y almacenamiento según estén en el checkout; marcar los módulos existentes pero aún no conectados con línea discontinua o nota `por integrar`.
6. **Impacto:** metas del cliente a 3 meses frente a resultado medido hoy. Si no hay mediciones, decir `aún no medido`, no convertir una meta en resultado.
7. **Costo y continuidad:** cada servicio/hosting/modelo con precio, límite, fuente y fecha de verificación. Hasta verificarlo, marcar `pendiente de confirmar`; no prometer `$0` como costo comprobado.
8. **Siguiente paso y transparencia:** quién debe validar datos, qué le falta a Daniel/Samuel y cómo se cubriría una falla de internet con capturas/video de respaldo.

**Criterio de aceptación**

- [ ] Cada imagen tiene origen/crédito o etiqueta inequívoca de ilustrativa; ninguna imagen de banco se confunde con un perro del refugio.
- [ ] Todas las cifras de costo tienen fuente y fecha; cada cifra de impacto dice si es entrevista, meta o medición observada.
- [ ] El deck usa la estética existente y diferencia visualmente `hecho`, `demo` y `pendiente`.
- [ ] Hay exportación PDF/PNG de respaldo y una copia de trabajo Canva accesible al equipo, sin depender de abrir una cuenta en el evento.

**Handoff a Daniel y Samuel**

- A Samuel: paquete de capturas del panel en el estado actual y observaciones de legibilidad, sin propuestas de rediseño global.
- A Daniel: plantilla del deck y espacio para capturas de adopciones solo cuando entregue una versión observable; mientras tanto, reservar el espacio como `pendiente`, no inventar pantallas.
- A ambos: entregar originales, archivos editados y hoja de créditos junto con el Canva/exportación.

### Persona C — Pruebas manuales, evidencias y pitch

**Prioridad alta**

- [ ] Ejecutar pruebas en la versión local/demo elegida, no sobre cuentas, datos ni servicios productivos. Anotar el nombre/fecha de la build para que el resultado se pueda repetir.
- [ ] Probar tareas en teléfono si hay dispositivo disponible; si no, registrar que se hizo en navegador y no afirmar que fue validado en un móvil real.
- [ ] Recorrer las tareas de la tabla de abajo. Agregar filas cuando una función no exista o no sea accesible, en vez de saltársela.
- [ ] Preparar un guion de pitch propuesto de **3–5 minutos**, adaptable a la duración que indique la organización. Incluir un minuto de plan B: mostrar video/capturas si falla red, Gemini, WhatsApp o el demo.
- [ ] Marcar explícitamente el límite de las pruebas: los tests automatizados reportados son del bot; no equivalen a una validación de usuario real, al panel ni a una integración externa. No presentar `expected-fail` como requisito aprobado.

**Matriz de pruebas manuales**

Crear una hoja con estas columnas: `caso`, `pantalla/build`, `paso`, `dato de prueba`, `esperado`, `observado`, `evidencia (captura/video)`, `severidad`, `dueño`, `estado/fecha`.

| Caso | Paso | Dato de prueba | Esperado | Observado | Evidencia | Severidad | Dueño |
|---|---|---|---|---|---|---|---|
| T01 — Hoy y prioridad | Abrir Hoy y mirarla 3 segundos; cerrar y explicar qué urge | Solo datos demo | Lo urgente se entiende sin explicación; anotar tiempo/duda | Completar en prueba | Captura y nota | Por asignar según hallazgo | C |
| T02 — Registrar comida | Usar una vez el botón de salida/entrada de bulto | Conteo ficticio inicial | Conteo/confirmación cambia una vez y muestra resultado claro | Completar en prueba; no inferir si no guarda | Video corto | Por asignar según hallazgo | C |
| T03 — Dosis del día | Abrir ficha y marcar una dosis ficticia | Animal y tratamiento demo | Nombre/medicina/hora visibles y acción inequívoca; no duplicar al tocar una vez | Completar en prueba | Captura antes/después | Alta si hay nombre/dosis equivocado | C |
| T04 — Advertencia de entrega | Buscar la advertencia demo de Bruno en ficha/pasaporte si existe | Solo ficha de demo | Advertencia visible y distinguida; no se afirma que sea un dato real | Completar o `no disponible` | Captura | Alta si se oculta/contradice aviso | C |
| T05 — Mala señal/sin conexión | Activar modo avión solo en demo y registrar dato no sensible | Conteo demo; ninguna cuenta real | Solo aprobar si la app indica que queda guardado y sincronizado al volver; si falla o no existe cola, anotarlo como pendiente | Completar en prueba | Video y estado de conexión | Alta si afirma guardado y se pierde | C |
| T06 — Caja | Abrir y revisar el flujo de movimiento sin enviarlo a ningún servicio real | Monto ficticio | Etiqueta de ingreso/gasto y monto legibles; cancelar no altera datos reales | Completar en prueba | Captura | Alta si monto o tipo se altera | C |
| T07 — Solicitudes | Abrir módulo de adopciones en la build disponible | Solicitudes ficticias | Tres grupos explican la sugerencia y permiten revisión humana; si solo hay demo de datos, indicarlo | Completar o `no disponible` | Captura | Media/alta según bloqueo | C |
| T08 — Portal público/RAG | Abrir la dirección pública prevista en el build disponible | Consulta genérica, sin datos personales | Si no está montado/conectado, registrar `no disponible en este build`; no hacer pasar el endpoint de código por una landing funcional | Completar o `no disponible` | Captura de pantalla/URL local sin secreto | Alta para afirmación pública | C |

**Escala de severidad propuesta**

- `Bloqueante`: impediría una demo segura/entendible o falsea un dato sensible.
- `Alta`: rompe una tarea P0, una advertencia médica, el monto o la claridad de estado.
- `Media`: genera duda pero hay forma clara de continuar.
- `Baja`: detalle visual/textual que no cambia la tarea.

**Guion base (propuesta, ajustar al tiempo real)**

1. **Problema (30–45 s):** citar los casos del documento de requerimientos con su origen de entrevista: Bruno volvió a los cinco días por una advertencia que no se vio y el caso de Mateo generó deuda; son ejemplos documentados en la entrevista, no métricas del software.
2. **Solución y recorrido (90–150 s):** mostrar solo el recorrido que funciona en la build local. Si hay pantallas demo, decirlo al empezar. No depender de una llamada a servicio externo para demostrar la idea.
3. **Qué es real y qué falta (30–60 s):** separar panel integrado, datos de demo, integración externa pendiente y trabajo de Daniel aún no disponible.
4. **Impacto esperado (30–45 s):** contrastar metas de cliente con medición actual; usar `sin medición todavía` donde aplique.
5. **Sostenibilidad y cierre (20–30 s):** explicar qué costos sí fueron verificados, cuáles faltan y pedir una próxima validación concreta de datos/uso.

**Plan B de demo**

- [ ] Grabar un video corto del recorrido local en una sesión sin información personal.
- [ ] Exportar capturas con fecha/estado `demo` y guardarlas con el deck.
- [ ] Tener una versión de la presentación sin video pesado y sin enlaces que requieran login.
- [ ] Si cae la red, mostrar captura/video y decir qué parte no se pudo comprobar en vivo. No simular un éxito externo.

**Criterio de aceptación**

- [ ] La matriz tiene resultado observado y evidencia en cada caso intentado; cada no ejecutado dice por qué.
- [ ] Ningún dato, usuario o acción de prueba se guarda en producción.
- [ ] El pitch separa test local, integración existente, demo, pendiente, metas y resultados medidos.
- [ ] Está lista una ruta de respaldo sin internet y la presentación no depende de datos personales ni de servicios externos.

**Handoff a Daniel y Samuel**

- A Daniel: lista de problemas de adopciones, evidencia, prioridad y pregunta concreta; no asumir que las solicitudes demo son casos reales.
- A Samuel: lista separada de problemas de panel principal, evidencia y build usada. Agrupar por tarea P0, sin proponer rediseño general.
- A ambos: entregar guion, matriz y paquete de respaldo; decidir juntos qué corregir antes de presentar y qué declarar pendiente.

## Trabajo opcional si queda capacidad

- Ampliar fichas reales más allá de las 10–15 prioritarias después de confirmación directa.
- Preparar 1–3 fotos autorizadas de animales reales si la fundación las comparte y se confirma identidad/uso.
- Revisar contraste, tamaño de letra y claridad con una persona no técnica, sin recoger datos personales.
- Completar capturas de una vista pública únicamente cuando Daniel la entregue visible; no crear una versión visual ficticia para cubrir la ausencia.

No priorizar animaciones, campaña adicional, ilustraciones elaboradas ni más pantallas. La entrevista valora una solución pequeña y realista; el equipo de apoyo debe aumentar evidencia y claridad, no agrandar el producto.

## Referencias que fijan el alcance

- [Requerimientos Vibra+](C:/Users/USUARIO/Documents/Hackaton/huellitas-monoga-master/docs/Huellitas_Requerimientos_VibraPlus.md:47): casos reportados, metas de éxito a 3 meses y entregables esperados en las líneas 80–89.
- [Plan integrado](C:/Users/USUARIO/Documents/Hackaton/huellitas-monoga-master/docs/PLAN_INTEGRADO.md:93): responsabilidades de Samuel/Daniel; P0 de adopción y regla de que la sugerencia no reemplaza decisión humana en las líneas 108–130.
- [Plan del panel](C:/Users/USUARIO/Documents/Hackaton/huellitas-monoga-master/docs/PLAN_PANEL.md:49): guía de imágenes demostrativas, créditos y etiqueta ilustrativa; P0 y pruebas manuales en las líneas 100–110 y 205–212.
- [Resumen de auditoría](C:/Users/USUARIO/Documents/Hackaton/huellitas-monoga-master/docs/auditoria-daniel/00-resumen-general.md:18): estado comparado de módulos y pendientes verificados.
- [Auditoría RAG](C:/Users/USUARIO/Documents/Hackaton/huellitas-monoga-master/docs/auditoria-daniel/01-rag.md:5): catálogo demo, `45 perros + 25 gatos`, procedencia de historias y alcance del costo mensual.
- [Auditoría agente y WhatsApp](C:/Users/USUARIO/Documents/Hackaton/huellitas-monoga-master/docs/auditoria-daniel/02-agente-y-whatsapp.md:5): activación, límites, brechas y alcance de pruebas.
- [Auditoría campañas y panel](C:/Users/USUARIO/Documents/Hackaton/huellitas-monoga-master/docs/auditoria-daniel/03-campanas-panel.md:5): portal público y vistas de adopción pendientes, cliente UI de RAG ausente y campañas.
