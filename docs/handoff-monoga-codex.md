# Monoga → Codex: módulo de adopción
Estado al 2026-10-28. Prototipo de hackathon, no despliegue productivo.
Código demo de adopciones guardado en el commit `09d5ff8`; esta entrega añade el handoff y ambos ZIP. La confirmación del push se informa fuera de este archivo para no afirmar una publicación antes de ejecutarla.
Objetivo inmediato: integrar el diseño del segundo ZIP dentro del módulo y verlo funcional en localhost.

## Continuar en otro computador

Los dos ZIP viajan con el repositorio:
- `docs/design/adopciones/v1.zip`: primera propuesta.
- **`docs/design/adopciones/v2.zip`: diseño seleccionado para integrar.**
- Inventario y SHA-256: `docs/design/adopciones/README.md`.

Clona la rama **MONOGA**, no master, para obtener esta entrega:
```bash
git clone --branch MONOGA https://github.com/SamuelGuz/Hackaton-Vibra-Plus.git
cd Hackaton-Vibra-Plus
```
Si ya tienes una copia, primero comprueba sus cambios locales; no hagas pull sobre trabajo ajeno sin revisarlo.

El servidor, las dependencias instaladas y los temporales NO se transfieren por Git. En el nuevo equipo instala Node compatible con Vite y ejecuta:
```bash
cd panel
npm ci --no-audit --no-fund
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```
Abre `http://127.0.0.1:5173/?demo=1` y entra como Marcela. Esta instalación usa el lockfile existente, no añade librerías.

Prompt corto para Codex: **«Lee docs/handoff-monoga-codex.md y odd/tasks/backend-y-adopcion.md. Continúa S46 usando docs/design/adopciones/v2.zip, conserva lo ya verificado y aplica ODD. No reemplaces el panel de Samuel ni hagas merge/push sin mi autorización.»**

## Empieza aquí

1. Trabaja en la raíz de tu clon. La ruta del equipo original era `C:/Users/Monoga/Desktop/Hackaton/Hackaton-Vibra-Plus`, no es un requisito en el nuevo computador.
2. Lee los `AGENTS.md` aplicables si existen, este handoff y `odd/tasks/backend-y-adopcion.md` (Specs y Tasks antes del Log). El archivo global del equipo anterior no se publica ni debe suponerse disponible.
3. Comprueba rama/estado sin sobrescribir los cambios locales esperados que se describen abajo.
4. Abre el prototipo existente: **http://127.0.0.1:5173/?demo=1**. Entra como **Marcela → Solicitudes**.
5. Continúa **S46: integración visual del ZIP v2**. Ya se compararon ambos archivos; no repitas la búsqueda de repositorios ni vuelvas a programar la base del módulo.

## Qué pidió el usuario

- Quiere un prototipo sencillo, atractivo y funcional, no una plataforma enorme ni trabajo dedicado a infraestructura.
- Rúbrica aportada: innovación 40 %, impacto 30 %, presentación 30 %.
- Trabajar por módulos y completar adopciones: solicitudes, detalle, pasaporte y seguimiento.
- Petición visual exacta:

> Mira montame esta hermusa dentro del protecto como el modulo de adopcion C:\Users\Monoga\Downloads\pet-adoption-app-development.zip escoge o este "C:\Users\Monoga\Downloads\pet-adoption-app-development (2).zip" para montarlo en el proyecto, y montamelo en localhsot para revisarlos

**Decisión ya tomada:** usar el segundo ZIP como referencia visual y adaptarlo al React/Vite existente. No reemplazar el panel de Samuel por una segunda aplicación Next.js.

## Contexto del cliente, no inventar requisitos

Fuentes principales, en este orden práctico:
- `docs/research/entrevista-respuestas.md`.
- `docs/Huellitas_Requerimientos_VibraPlus.md`.
- `docs/PLAN_INTEGRADO.md`, especialmente §5.
- `docs/PLAN_PANEL.md` y `docs/placa-viva/diseno.md` para contexto y límites.
- El código manda sobre detalles técnicos desactualizados de los planes.

**FACT documental:** Huellitas cuida 45 perros y 25 gatos. El equipo dispone de poco tiempo, celulares modestos y mala conectividad. Se pierden solicitudes por respuesta tardía. La entrega de información de cuidados es deficiente (caso Bruno: **NO pisos lisos**), y suelen olvidar seguimientos.

**Necesidad de UX:** pocas decisiones, palabras claras, acciones grandes y resultado inmediato. El usuario describe a la coordinadora como mayor y poco afín a la tecnología; su edad no se verificó independientemente.

**Límites vigentes:**
- Ninguna decisión automática de adopción, tratamientos, medicación o salud.
- Clasificación de solicitudes orientativa y reversible, con decisión humana.
- No enviar cédulas, teléfonos, direcciones o correos reales a servicios gratuitos de IA.
- Presupuesto operativo casi cero, sin hardware obligatorio ni promesas de free tier no verificadas.
- No añadir chatbot ni dependencias de repositorios propuestos: ninguno fue aprobado para integrar.

## Corte Git anterior a esta publicación

| Referencia | Commit observado |
|---|---|
| Rama local `MONOGA` y `origin/MONOGA` | `f9a5a34` |
| `origin/master` | `07d5b4d`, merge de PR #2 MONOGA |
| `origin/samuel/conectar` | `01a5a74` |
| `origin/samuel/kit` | `2e95476` |

- Repositorio: https://github.com/SamuelGuz/Hackaton-Vibra-Plus
- PR #2: https://github.com/SamuelGuz/Hackaton-Vibra-Plus/pull/2, ya incorporado a master según el último fetch.
- El PR #2 incorporó la base anterior. Los cambios de adopción y el handoff de esta entrega se guardan después en MONOGA, no quedan incorporados automáticamente a master. Consulta `git log` para ver los commits nuevos de transferencia.
- `master` contiene la base MONOGA, pero no los commits de Samuel `3de1c73` (arreglo de carga) y `01a5a74` (su backend). No fusionarlos a ciegas: hay implementaciones de backend diferentes.
- El fetch configurado por defecto solo sigue MONOGA; Samuel/master se actualizaron mediante refspecs explícitos. No cambies la configuración global.

### Estado local de preparación (histórico, no reproducir)

Antes de preparar los commits de transferencia estaban staged:
- `panel/src/app/App.tsx`
- `panel/src/app/pestanas.ts`
- `panel/src/features/adopciones/Adopciones.tsx`
- `panel/src/features/adopciones/Adopciones.module.css`
- `panel/src/features/adopciones/Adopciones.test.tsx`
- `panel/src/features/adopciones/persistencia.ts`
- `panel/src/features/adopciones/README.md`
- Una versión de `odd/tasks/backend-y-adopcion.md`.

El task document tenía además actualizaciones unstaged posteriores. Este inventario documenta la preparación original; un clon nuevo puede estar limpio y no debe recrear ese estado. Existe `.codegraph/` sin seguimiento, preexistente y ajeno a la entrega. **No borrar, resetear, sustituir el índice ni descartar nada.** Si aparecen cambios distintos a estos, identificar su propietario antes de editarlos.

El primer intento de commit falló por falta de identidad. Después el usuario proporcionó su nombre/correo y autorizó publicar esta entrega; la identidad se configuró solo en el repositorio original. Eso no configura Git en el computador nuevo: no inventar identidad ni copiar la de Samuel. Para futuros cambios no hacer push, merge, rebase, reset ni cherry-pick sin autorización explícita.

## Qué ya funciona de adopciones

T17 fue implementada y verificada antes de la petición del nuevo diseño:
- Solicitudes ficticias en tres grupos (8/9/8), con razón y orden por calidad.
- Detalle con respuestas clave, llamada, nota, agenda y cambios manuales reversibles.
- Acceso de navegación limitado a admin/adopciones.
- Persistencia **de demo** en el navegador, separada de los datos del servidor.
- Advertencia visible si el guardado local falla.
- Pasaporte de Bruno con advertencias y tratamientos registrados.
- Compartir por WhatsApp prepara texto; no envía automáticamente.
- En modo servidor, informa que adopciones todavía no está conectada, sin simular éxito con fixtures.

Cuatro regresiones ya corregidas: orden por calidad, aviso de fallo de guardado dentro del detalle, tratamientos incluidos en el texto compartido y reutilización del kit original. El diseño ZIP aprobado puede cambiar el aspecto, **no perder estos comportamientos**.

### Evidencia observada

- Autor: suite completa del panel **85/85** y build PASS.
- Verificador independiente y parent: suite enfocada **9/9**.
- Edge real/headless con perfil temporal: cuatro defectos corregidos, navegación Marcela → solicitudes → detalle → pasaporte comprobada.
- Primer smoke sin overflow horizontal a 360/375/390/412/430 px. Toda adaptación nueva requiere volver a comprobar los viewports afectados.
- Evidencia local: `C:/Users/Monoga/AppData/Local/Temp/adoption-verifier-V30evR/`.
- La revisión nativa quedó **no disponible** por assets administrados desactualizados. No hubo aprobación nativa ni lineage iniciada. Se usó verificación independiente; no confundir esto con aprobación de entrega.

## ZIP elegido y adaptación pendiente

**Fuentes portables incluidas:** `docs/design/adopciones/v1.zip` y **`docs/design/adopciones/v2.zip`**. Sus bytes coinciden con los originales; no se ejecutaron scripts. La configuración Drizzle incluye un ejemplo de PostgreSQL con usuario/contraseña genéricos en localhost, no una conexión productiva. No usarla como credencial real.

Archivos originales en el computador anterior (referencia histórica, no requeridos):
- `C:/Users/Monoga/Downloads/pet-adoption-app-development.zip`
- **`C:/Users/Monoga/Downloads/pet-adoption-app-development (2).zip`**

Copias para lectura, ya extraídas de forma segura:
- `C:/Users/Monoga/AppData/Local/Temp/huellitas-adoption-designs-i60_64um/v1`
- **`C:/Users/Monoga/AppData/Local/Temp/huellitas-adoption-designs-i60_64um/v2`**

En el computador nuevo, extraer `docs/design/adopciones/v2.zip` a un temporal fuera del repositorio, validando rutas relativas, sin traversal ni symlinks. Las rutas temporales anteriores no se transfieren. No ejecutar scripts del ZIP sin revisarlos.

**v2:** 45 archivos, aproximadamente 196 KB, estética coral/menta y módulos de solicitudes/pasaporte/seguimiento. Referencias útiles: `src/app/page.tsx`, `src/app/globals.css`, `src/app/solicitudes/`, `src/app/pasaporte/`, `src/app/seguimiento/` y `src/components/`.

El ZIP usa Next.js, Tailwind 4, Lucide, fuentes Google y Drizzle/Postgres con `DATABASE_URL`. **No es una copia directa compatible con Vite.** Adaptar JSX/rutas y CSS acotado a la feature; mantener los proveedores/sesión y datos sintéticos actuales. No instalar otra plataforma ni migrar la base para mostrar el diseño.

No contiene imágenes aunque referencia `/images/hero-pets.png`. Usar recursos locales disponibles o un estado sin foto cuidado; no dejar imágenes rotas. No inventar vacunas, microchips ni hechos clínicos porque el diseño los mencione.

### Superficies para la siguiente entrega

- `panel/src/features/adopciones/**`
- `panel/src/app/App.tsx`, solo cableado necesario del módulo.
- `panel/src/app/pestanas.ts`, solo entrada/navegación de adopciones.
- `panel/public/adopciones/**`, únicamente si se necesitan recursos locales del módulo.
- Task doc y este handoff para actualizar evidencia.

No tocar pantallas principales de Samuel, contratos compartidos, `bot/` ni `db/` durante el port visual. La integración de API será una unidad posterior y delimitada.

## Secuencia de continuación

1. **T17/S46: port visual del ZIP v2.** Conservar estética y hacerlo navegable dentro de adopciones sin romper lo verificado. Esta implementación **todavía no empezó**; no hay writer visual ejecutándose.
2. **T22: seguimientos.** Aún no implementados. Cadencia aprobada: días 2/5/15/30/90; amarillo/rojo exige llamada humana. Interfaz sencilla con resultado, nota y próximo contacto. Primero demo honesta; no fingir sincronización.
3. **T18 + parte servidor de T22:** API/almacenamiento y adaptación de datos. No están implementados. El backend MONOGA tiene bibliotecas y repositorios, pero falta servidor integrado; no afirmar que funciona por tener scripts que apuntan a un archivo inexistente.
4. Comprobar el recorrido completo en navegador y entregar URL y límites reales. No llamar “completo” al módulo si seguimientos o API siguen pendientes.

## Localhost y comandos

Última comprobación al preparar este handoff: **HTTP 200** en `http://127.0.0.1:5173/?demo=1`.
Node v24.19.0 y npm 11.17.0 disponibles. Se instalaron 451 paquetes del lockfile en `panel/node_modules`; sin cambiar manifest ni lockfile.

Servidor iniciado en sesión anterior: PID reportado 439, log `/tmp/hackaton-vibra-panel-vite.log`. PID y proceso pueden variar o terminar: comprobar antes de arrancar otro.

Si no está activo:
```bash
cd panel
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Pruebas, desde `panel/`:
```bash
npm test -- src/features/adopciones/Adopciones.test.tsx
npm test
npm run build
```

Mantener pruebas funcionales proporcionales y test-first cuando exista resultado determinista; no invertir la hackathon en infraestructura ajena al recorrido. No inventar RED/GREEN ni pruebas de navegador. El MCP Playwright de Pi falló por timeout; un verificador sí usó Edge/CDP instalado sin instalar navegador ni desactivar sandbox.

## Coordinación con Samuel

Se preparó para el usuario, **no se envió externamente**, un handoff proponiendo:
1. Separar su corrección de carga del backend pendiente de integración.
2. Mejorar apertura con mala señal y claridad de antigüedad/estado de datos, aprovechando cola y copia ya existentes.
3. Corregir el resumen de Hoy para no decir “nadie se quedó sin comer” a partir de bultos abiertos ni llamar puntuales a todas las dosis registradas.

Áreas propuestas para Samuel: `panel/src/data/DatosProvider.tsx`, pruebas relacionadas, `panel/src/components/EstadoConexion.tsx`, `panel/src/features/hoy/**`. Su aceptación/ejecución **no está confirmada**. Nuestra área: adopciones y sus hooks mínimos de rutas/tabs.

## ODD en Codex

El equipo original tenía instrucciones ODD en `C:/Users/Monoga/AGENTS.md`; no se supone que existan en el computador nuevo. Este handoff conserva el mínimo necesario para continuar:

1. Confirma autorización, alcance y estado Git; preserva trabajo existente.
2. Usa entrevista y especificación existente, explora solo lo necesario.
3. Actualiza el mismo task document antes de la siguiente unidad, sin crear otro plan paralelo.
4. Implementa por vertical slices con una sola escritura activa; usa subagentes si el runtime los ofrece y la tarea lo requiere, sin inventar capacidades.
5. Cuando haya pruebas deterministas aplicables, observa RED→GREEN; ejecuta pruebas/build y recorrido de navegador proporcional, sin inventar evidencia.
6. Registra resultados, pendientes y límites; los comandos de entrega requieren autorización humana.

No asumir que memoria Engram, agentes, capturas de review o permisos de Pi existen en Codex. Usar las capacidades reales disponibles y declarar ausencias. La copia local del task document es suficiente para continuar si Engram no está disponible. No regenerar toda la documentación ni volver al descubrimiento del proyecto.
