# Huellitas — Levantamiento de requerimientos (reto Vibra+)
Fuente: entrevista automatizada al Gem "Vibra_IA" (26 preguntas, 27-oct-2026). La conversación completa quedó en tu historial de Gemini.

## 1. Contexto
- **Huellitas**: albergue de perros y gatos en zona semi-rural a las afueras de una ciudad de **Colombia** (montos en COP), en un **predio prestado**.
- **45 perros + 25 gatos**, al límite de capacidad. Ingresan 8–12 animales/mes; adopciones 1–8/mes (muy variable). Devoluciones 5–10 %.
- Equipo: **3 fundadores** a tiempo completo (sin salario), 1 cuidador, 10–15 voluntarios activos (25–30 en el grupo), 3–5 hogares temporales.
- No hay convenio con la municipalidad, no es fundación formal (no emite certificados de donación), sin microchips.
- Herramientas actuales: libreta de papel (fichas médicas), Excel en laptop vieja del admin, Google Forms (adopción), Gmail institucional + Drive, WhatsApp (todo), Instagram (~12k) y Facebook (~8k). Un blog de WordPress quedó abandonado.
- **Internet malo** en el predio (datos móviles, se cae con lluvia). No hay computador ni oficina en el albergue. Todos usan celulares personales de gama media o baja.

## 2. Roles / stakeholders
| Rol | Qué hace | Dispositivo | Qué necesita | Qué NO debe ver |
|---|---|---|---|---|
| Administrador | Finanzas, deudas veterinarias, donaciones, alianzas | Celular + laptop vieja en casa | Caja vs. deuda de un vistazo; registrar ingreso o gasto en <15 s con foto del recibo; alertas de stock | — (acceso total) |
| Cuidador | Limpieza, alimentación, depósito | Celular gama media/baja, manos sucias o mojadas | Botón de 2 s "-1 bulto"; "dosis dada" de un toque; offline | Finanzas, adoptantes |
| Resp. Bienestar Animal | Tratamientos, vacunas, cuarentenas, traslados | Celular | Ficha médica rápida, alertas de dosis, cambiar estado del animal | Finanzas, adoptantes |
| Coord. Adopciones y Voluntariado | Filtrar solicitudes, entrevistas, seguimiento, turnos, hogares temporales | Celular con el WhatsApp institucional | Solicitudes clasificadas 🟢🟡🔴; turnos con cupos y recordatorio; guía para voluntarios; recordatorios post-adopción | Finanzas |
| Resp. Comunicación y Donaciones (fundadora) | Redes, campañas, mensajes | Celular, en huecos de tiempo (2–3 h/día fragmentadas) | Saber con anticipación las necesidades (días de comida, deudas) y qué animales están adoptables con fotos | — |

## 3. Dolores principales (con datos)
1. **Alimento**: control "a ojo"; se enteran el mismo día que se acaba y publican S.O.S. desesperados. Cambiar de marca por donaciones enferma a los perros.
   - Consumo: perro 350–400 g/día (16–18 kg/día en total); gato 60–70 g/día (1,5–1,8 kg/día). Por semana: 7–8 bultos de perro (22–25 kg) y 2–3 de gato (8–10 kg). En total ≈250 kg por semana.
   - Precios: bulto de perro $90–120 mil (Ringo, Nutrescan); bulto de gato $60–80 mil (Don Kat, Mirringo).
   - Necesitan la alerta con **3–4 días de anticipación**, porque el pedido tarda 24–48 h en llegar al predio.
   - El cuidador registraría a las 6:30–7:00 a. m., al abrir el bulto.
2. **Finanzas**: ingresos de $1,8–4,5 M/mes y gastos de $3,5–4 M/mes, así que casi siempre hay déficit.
   - Gastos: alimento $1,5–1,8 M; veterinaria $1,5–2,5 M (en emergencias sube a $4–5 M); limpieza, servicios y transporte $0,5–0,8 M.
   - Ingresos: donaciones puntuales cuando publican casos, 8–12 padrinos que aportan $30–50 mil al mes, y rifas o pulgueros. Medios: Bancolombia, Nequi, Daviplata y efectivo.
   - **Deuda actual de $3,8–4,2 M con 2 clínicas** (una general y otra 24 h con quirófano). El límite implícito por clínica es de unos $2,5–3 M; si lo pasan, les niegan la atención.
   - Las facturas llegan como foto por WhatsApp, en papel en el bolsillo o en un PDF de estado de cuenta.
   - La transparencia actual consiste en publicar fotos de los recibos en las historias de Instagram.
3. **Salud**: libreta de pasta dura en el depósito que se moja y se traspapela. Se pasan dosis y vacunas, y a veces hay que reiniciar el esquema. Solo pesan a un animal cuando el veterinario lo pide. La cuarentena tiene pocos caniles.
4. **Estados del animal**: Cuarentena → Tratamiento → Adoptable (vacunado, desparasitado y esterilizado) → Hogar temporal / Adoptado / Fallecido (+ Devuelto). No se sabe de un vistazo en qué estado está cada uno.
5. **Adopciones**: el flujo es Instagram/WhatsApp → Google Form (≈15 preguntas) → llamada → visita o video → acta o contrato → donación voluntaria sugerida. Toma 3–7 días.
   - Se traba en la respuesta inicial: pueden llegar 20–30 formularios en un día y se revisan en orden de llegada, así que los buenos candidatos se pierden.
   - Filtros clave: acuerdo de toda la familia; tipo de vivienda y cerramientos o mallas; presupuesto y plan de emergencia; qué pasó con sus mascotas anteriores.
   - **Descarte inmediato**: que sea un regalo o para un tercero; que lo quieran como perro de guardia, amarrado o en azotea; que no acepten esterilizar ni vacunar; que no acepten el seguimiento.
   - El seguimiento post-adopción (a la semana, al mes y a los 3 meses) casi siempre se olvida.
6. **Voluntarios**: convocan con un "¿quién viene el sábado?" en un grupo de 30 personas; confirman 8 y llegan 2. Tienen que volver a capacitar a la gente en cada jornada.
   - Piden turnos con cupo (máx. ~6), recordatorio el viernes con reconfirmación de un clic, botón de cancelar con 12–24 h de anticipación y lista de espera.
   - Guía de 2 minutos para el voluntario: mapa de convivencia y carácter de los perros, rutinas de limpieza por bloque, dónde está cada cosa y zonas restringidas.
7. **Hogares temporales**: los asignan al primero que levanta la mano en WhatsApp. Se agotan emocionalmente y los reportes son informales.
8. **Privacidad**: guardan cédulas, direcciones y fotos de las casas de adoptantes, y direcciones de hogares temporales, en un grupo de WhatsApp de 30+ personas. No tienen política de datos.
9. **Eventos**: 2–3 jornadas de adopción al año, con mucho desgaste y poco retorno.

## 4. Casos reales (útiles para el pitch)
- **Mateo**: perro criollo atropellado. Cirugía y hospitalización por $2,8 M a crédito; con campaña juntaron $900 mil. Por esa deuda la clínica no recibió después a una perrita con parvovirus, y tuvieron que negarle la entrada.
- **Bruno**: perro que llevaba 8 meses en el albergue. La adopción se apuró porque el WhatsApp se demoró. El voluntario no vio en la libreta mojada que Bruno estaba terminando un tratamiento de piel y no podía estar en pisos lisos. Lo devolvieron a los 5 días, estresado.

## 5. Requerimientos (priorizados por el cliente)
### Funcionales
| ID | Requerimiento | Prioridad |
|---|---|---|
| RF-01 | Inventario de alimento e insumos con alerta de "días restantes" (≥3–4 días). Registro de un toque: "-1 bulto perro / gato" y "+N bultos" (compra o donación), sin marca, lote ni kg | Imprescindible |
| RF-02 | Panel de caja disponible vs. deuda por clínica, con alerta cerca del límite implícito (~$2,5–3 M). Registro de ingreso o gasto en <15 s (tipo, monto, categoría y foto opcional) | Imprescindible |
| RF-03 | Ficha médica y tratamientos: "Dosis dada" de un toque en una lista visual con fotos y nombres grandes (el QR es solo plan secundario). Registra hora y quién. Alertas de dosis, vacunas y desparasitación | Imprescindible |
| RF-04 | Estado operativo de cada animal y conteo por estado (cuarentena, tratamiento, adoptable…) | Imprescindible |
| RF-05 | Solicitudes de adopción clasificadas automáticamente en 🟢 apto / 🟡 revisar / 🔴 descarte, según las reglas de descarte | Deseable |
| RF-06 | Turnos de voluntarios: cupos, recordatorio, reconfirmación, cancelación y lista de espera. Guía rápida de rutinas y convivencia | Deseable |
| RF-07 | Roles y permisos (admin: finanzas; coordinadora: adoptantes y hogares temporales; operativo: fichas médicas e inventario) | Deseable |
| RF-08 | Recordatorios de seguimiento post-adopción (a la semana, al mes y a los 3 meses) | Deseable |
| RF-09 | Información de salud y cuidados visible al momento de entregar un animal (para que no se repita el caso Bruno) | Deseable (se deduce del caso Bruno) |
| RF-10 | Ayuda para crear contenido de campañas en redes, con las necesidades del momento | Opcional |
| RF-11 | Web pública y apadrinamiento recurrente | Opcional |

### No funcionales
| ID | Requerimiento |
|---|---|
| RNF-01 | **Costo de $0**: sin SaaS, servidores ni dominios pagos; solo planes gratuitos |
| RNF-02 | **Offline-first**: sincroniza cuando hay señal y usa pocos datos (nada de videos pesados) |
| RNF-03 | **Aprendizaje en ≤15–20 min**; uso diario de **<5 min por persona**; cada registro en ≤10–15 s (el cuidador, en ≤5 s y con guantes) |
| RNF-04 | 100 % móvil en celulares de gama media o baja; nada exige un PC |
| RNF-05 | El equipo puede mantenerlo sin programador. **Prefieren herramientas conocidas: Google Sheets, Forms, AppSheet, WhatsApp o Telegram**, en vez de una app hecha desde cero |
| RNF-06 | Privacidad: los datos sensibles no quedan en chats grupales |
| RNF-07 | No exigir nada a las clínicas ni a los aliados (no deben instalar nada ni cambiar sus procesos) |
| RNF-08 | Alertas por **WhatsApp** (preferido) o notificación push. **Nunca por correo** |
| RNF-09 | No crear falsas expectativas: nada de promesas automáticas a donantes o voluntarios que el equipo no pueda cumplir. Debe ser amable con el equipo, que ya está muy desgastado |

## 6. Criterios de éxito a 3 meses (dichos por el cliente)
1. Cero desabastecimientos de comida sin aviso: siempre con ≥3 días de margen y ningún S.O.S. de última hora.
2. Deuda veterinaria reducida en un 30 %, con caja vs. deuda actualizada en menos de 24 h.
3. 0 % de dosis o vacunas omitidas por falta de registro.
4. Los 3 fundadores y el cuidador usan la herramienta a diario, en menos de 5 min por día.

## 7. Qué esperan recibir y cómo evalúan
- Entregables: (1) un prototipo que se pueda "tocar" en el celular, (2) un mapa de la solución y del proceso (quién la usa, cuándo y cómo se mantiene a $0), (3) un pitch corto que explique por qué priorizaron ese problema.
- Criterios: factibilidad y sostenibilidad a $0 · usabilidad (registros de 10–15 s con manos sucias y mala señal) · impacto en los dolores críticos · empatía con el equipo.
- **Valoran más una solución pequeña, enfocada y realista que una plataforma gigante.**

## 8. Validación de la idea propuesta (PWA offline + Google Sheets)
- ✅ Les gustan la PWA offline, Google Sheets como base ($0, la pueden ajustar ellos), el contador de días de comida ("nos quita un 80 % de la ansiedad") y el panel de caja vs. deuda.
- ⚠️ El QR en los caniles les preocupa: se moja, se ensucia, los perros cambian de canil y cuesta usarlo con las manos ocupadas. Prefieren una **lista con foto y nombre grande, con un toque**. Si se usa QR, tiene que ser en placa acrílica o en el collar, y solo como opción secundaria.
- ➕ Piden adjuntar la foto de la factura veterinaria a cada deuda.
- ❓ Pregunta pendiente del cliente: **¿cómo les llegan las alertas si no tienen la app abierta?** Hay que responderla en el pitch (por ejemplo, Apps Script que envía un mensaje a un grupo de WhatsApp o Telegram, o notificaciones push de la PWA).

## 9. Propuesta de MVP sugerida para la hackatón
Núcleo: **AppSheet o PWA sobre Google Sheets** + **Google Apps Script** para alertas diarias (bot de Telegram gratis, o enlace o mensaje de WhatsApp al grupo).
1. Pantalla del cuidador: botones grandes "-1 bulto perro / gato" y una lista de animales en tratamiento con "Dosis dada ✓".
2. Pantalla del admin: días de comida restantes · caja vs. deuda por clínica (semáforo según el límite) · formulario de 3 campos para ingreso o gasto con foto.
3. Alerta automática a las 6 a. m. con lo pendiente del día ("Quedan 3 días de comida de perro", "Mateo: antibiótico 8:00").
4. Extra si da el tiempo: Google Form de adopción con fórmula que clasifica 🟢🟡🔴.

---

# PARTE 2 — Ideas innovadoras validadas con el cliente (3.ª ronda, 18 preguntas)

## 10. Hallazgos nuevos (no estaban en la ronda 1)
- **El cuidador YA manda audios de 5–10 s** todo el día ("abrí un bulto de Ringo", "ya le di la pastilla a Mateo"). El admin **ya toma capturas** de Nequi y fotos de facturas. La solución no tiene que cambiar el hábito, solo sacarle provecho: según el admin, eso le quita **el 90 % del trabajo de la noche**.
- **Donantes**: donan por emoción ante emergencias con nombre y rostro. **Los gastos invisibles** (servicios, aseo) **casi no se financian**. Los padrinos se van porque **no reciben noticias** del animal que apadrinan, y los seguidores se cansan de tanto contenido triste y silencian la página.
- **Las donaciones en especie llegan desbalanceadas**: 10 bultos de perro y 0 de gato; nada de comida húmeda para perros viejos; ropa sin espacio para guardarla. Además, el cambio de marca les causa diarrea.
- **Señales previas de una devolución**: el adoptante tiene prisa por la entrega inmediata, no pregunta por el carácter ni la rutina del animal, y responde con evasivas cuando le preguntan por el plan de contingencia. En la entrega le dan un papel con tachones e indicaciones verbales, y **olvida el 80 %**.
- **Reportes de rescate: 15–25 por semana.** Deciden "en caliente" y por emoción, y semanas después se descuadran.
- **El equipo**: carga una culpa silenciosa cuando tiene que decir "no" y **no celebra las adopciones** ("la alegría dura 5 minutos"). Lo que los motiva es **ver la transformación** del animal.
- **Mucha gente quiere ayudar a distancia** (diseño, transporte, alianzas, hogar temporal), pero solo le dicen "comparte nuestras publicaciones" y esa gente se enfría.
- **Riesgos de un bot con IA**:
  - Que entienda "30 ml" en vez de "3 ml", "Manchas" en vez de "Max", o $1.500.000 en vez de $150.000.
  - **Que bloqueen el número del albergue**, que es su activo más valioso.
  - Que aparezcan costos ocultos de IA.
  - Privacidad de cédulas y comprobantes.
  - "Si falla dos veces, volvemos a la libreta."
- **Condición para confiar**: **"la IA sugiere, el humano confirma con 1 toque"** (botones ✅ Confirmar / ✏️ Corregir), corregir en 2 s y empezar por lo de bajo riesgo (bultos, adopciones) antes de las finanzas y los medicamentos.
- **Pregunta abierta del cliente**: "¿Qué pasa si la alerta llega y nadie la atiende?"

## 11. Calificación de ideas por el cliente
| # | Idea | Impacto | Facilidad | Global | Preocupación clave |
|---|---|---|---|---|---|
| A | Bot de WhatsApp: registrar con **voz o foto** (IA entiende audio, factura o captura de Nequi); offline porque WhatsApp encola los mensajes | **5** | 4 | ~4.5 | Ruido y errores → confirmar antes de guardar |
| B | **Alertas** por WhatsApp (dosis, comida, deuda) | **5** | **5** | 5 | Saturación; ¿y si nadie la atiende? |
| C | Resumen diario a las 6 a. m. | 4 | 5 | 4.5 | Datos del día anterior incompletos; horarios distintos |
| D | Necesidades en vivo + campaña autogenerada + **"apartar" bultos** | 4.5 | 4 | 4.3 | Compromisos falsos → plazo o confirmación |
| E | **Agradecimiento con foto** e impacto al donante | **5** | 3.5 | 4.3 | Conseguir las fotos sin cargar al equipo |
| F | Termómetro público de la deuda veterinaria | 4 | 4.5 | 4.3 | Si no se mueve, desmotiva |
| G | **Adopciones clasificadas 🟢🟡🔴 por IA** | **5** | 4.8 | **4.9** | Falsos rojos → bandeja de descartados revisable; tono cálido |
| H | Test de compatibilidad adoptante–animal | 4 | 4.2 | 4.1 | Ficha de energía desactualizada |
| I | **Pasaporte digital + seguimiento post-adopción con detección de riesgo** | **5** | 4.5 | **4.8** | 🔴 o 🟡 → llamada humana obligatoria; no invadir |
| J | Ficha y post de adopción generados por IA desde foto y audio | 4.5 | 4.8 | 4.7 | Que la IA no invente datos |
| K | Turnos de voluntarios por bot + onboarding de 2 min | 4.8 | 4.7 | 4.8 | Reconfirmar con 1 botón |
| L | Insignias y "padrino del mes" | 3.5 | 4 | 3.8 | No ataca la crisis |
| M | Asistente "¿podemos asumir este rescate?" | 4.2 | 3.8 | 4.0 | Datos al día; la urgencia vital pesa más que el algoritmo |
| N | Voluntariado a distancia con microtareas | 4.7 | 4.5 | 4.6 | Incumplimiento de plazos |
| O | **Diario de transformación**: antes y después automático para redes y padrinos | 4.9 | 4.5 | **4.7** | Fidelidad; que la foto vaya al padrino correcto |
| P | "Adopta un gasto invisible" | 4.8 | 4.2 | 4.5 | Agrupar en compras por volumen |
| Q | **Celebración automática** de adopción + contador de vidas | 4.5 | **5** | **4.8** | Que el contador sea real |

**Veredicto del cliente**
- **Mayor "WOW"**: A + E/J (el bot que entiende audios y fotos y además agradece y genera contenido).
- **Lo que más les cambia la vida**: A + B + G.
- **Columna vertebral sugerida por el cliente**:
  - **Base operativa** (A + B): registrar por voz o foto y recibir alertas.
  - **Motor de sostenibilidad** (D + O): campañas exactas y diario de transformación para los padrinos.
  - **Filtro de adopciones** (G + I): clasificación y pasaporte con seguimiento.
  - **Cuidado emocional del equipo** (Q).

Frase del cliente para el pitch:
> "Pasamos de apagar incendios a ciegas a cuidar a nuestros 70 animales con la tranquilidad de tener el control, respuestas transparentes y tiempo para regalarles amor."

## 12. Concepto propuesto: "Un solo audio, tres impactos"
**Idea central (lo que la hace original):** el cuidador manda **UN audio** desde el barro, por ejemplo: *"Le di la amoxicilina a Mateo, ya camina solo, y abrí un bulto de perro"*. La IA lo convierte en **3 cosas a la vez**:
1. **Operación**: dosis registrada, inventario descontado y "quedan 3 días de comida".
2. **Sostenibilidad**: si la comida está crítica, se genera la campaña exacta y los donantes "apartan" bultos.
3. **Corazón**: "Mateo ya camina" alimenta el **diario de transformación**, que le llega al padrino de Mateo y se convierte en un post esperanzador.

→ **El dato que hoy se pierde en un chat se vuelve control, plata y amor.** Ningún panel administrativo hace eso.

### Diferenciadores para defender ante el jurado
- **Voice-first y sin interfaz nueva**: usan WhatsApp, que ya tienen abierto. Aprendizaje de casi 0 minutos.
- **Offline gratis**: WhatsApp guarda el audio y lo envía cuando vuelve la señal.
- **"La IA sugiere, el humano confirma"**: botón ✅ Confirmar / ✏️ Corregir. Los montos y las dosis siempre se confirman.
- **Alertas con escalamiento** (responde a "¿y si nadie la atiende?"): si nadie toca "✅ Atendido" en 2 h, la alerta pasa al siguiente rol. Las alertas son solo para lo crítico; lo demás va al resumen diario.
- **Prevención de devoluciones** (el caso Bruno): el pasaporte se genera solo desde la ficha, con advertencias en rojo, y hay check-in con 🟢🟡🔴 al día 2, 5 y 15.
- **Donaciones con trazabilidad**: cada aporte se vincula a una necesidad concreta y llega el agradecimiento con foto.
- **Cuida al equipo**: celebración automática, contador de vidas y cierre del día con logros, no solo pendientes.

### Ideas extra propias (no consultadas aún; se pueden validar)
- **Detector de riesgo en el seguimiento**: la IA lee las respuestas libres del adoptante ("llora de noche", "rompió el sofá") y le manda un consejo + alerta humana.
- **Bolsa de microtareas para voluntarios a distancia**: el bot publica "Transporte Mateo → clínica, martes 9 a. m." y el primero que toca "Lo tomo" queda asignado, con recordatorio.
- **"Semáforo de rescate"** (no decide, informa): ante un reporte, responde con cupo, caja, deuda frente al límite y hogares temporales disponibles. Así la decisión sigue siendo humana, pero informada.
- **Triaje de reportes de la comunidad**: el ciudadano manda una foto y la ubicación al bot; la IA estima la urgencia y agrupa los casos.

## 13. Notas técnicas para el equipo (verificar antes de comprometerse)
- **No usar el número principal del albergue** para el bot (riesgo de bloqueo): usar un **número dedicado**.
- WhatsApp Business Cloud API: revisen la tarifa vigente. Los mensajes que inicia la empresa (plantillas) pueden tener costo; responder dentro de la ventana de 24 h suele ser gratis. **Plan B $0: bot de Telegram** (100 % gratis) o grupo de WhatsApp con mensajes generados.
- IA para audio, imagen y texto: usar el plan gratuito de un modelo multimodal (por ejemplo, la API de Gemini) y verificar los límites y la política de datos, por la privacidad de cédulas y comprobantes.
- Datos en **Google Sheets** (lo puede editar el admin) + **Apps Script** para las alertas programadas (6 a. m., días de comida, escalamiento).
- Para la demo: un flujo en vivo con un audio con ruido de perros → confirmación con botón → la hoja se actualiza → llega la alerta → se genera la campaña y el agradecimiento al padrino.
