# Documentos de Huellitas

Empieza aquí. Cada documento responde una pregunta distinta.

| Documento | Qué responde | Estado |
|---|---|---|
| [Huellitas_Requerimientos_VibraPlus.md](Huellitas_Requerimientos_VibraPlus.md) | ¿Qué pidió el cliente? | Referencia fija |
| [PLAN_INTEGRADO.md](PLAN_INTEGRADO.md) | ¿Cómo encajan las piezas? Contrato `/api/*`, quién hace qué y cronograma | **Vigente. Manda sobre los demás** |
| [PLAN_PANEL.md](PLAN_PANEL.md) | ¿Cómo se ve y se usa el panel? Diseño "La libreta que no se moja", pantallas por rol, componentes y lista anti-IA | Vigente para el diseño del panel |
| [placa-viva/diseno.md](placa-viva/diseno.md) | ¿Qué hacen la placa, la ficha de hoy, el bot de WhatsApp y la IA? | Vigente en lo funcional; la parte técnica cambió (ver abajo) |
| [placa-viva/plan.md](placa-viva/plan.md) | Tareas del backend, paso a paso | Lista de tareas; la arquitectura que describe ya no es la que se construye |
| [research/](research/) | Entrevista, costos, precios de WhatsApp y casos reales | Material para decisiones y para el pitch |

## Si dos documentos dicen cosas distintas

1. **PLAN_INTEGRADO** manda sobre PLAN_PANEL y sobre placa viva.
2. **En lo técnico manda el código.** El servidor se está construyendo en `bot/` (Node con Hono) y `db/` (Postgres en un VPS, con copia a Google Sheets). Los planes todavía hablan de Cloudflare Worker con KV.

## Dónde está el código

| Carpeta | Qué es | Cómo arrancar |
|---|---|---|
| `panel/` | Panel principal en React (PWA) | [panel/README.md](../panel/README.md) |
| `bot/` | Servidor: WhatsApp, IA y rutas `/api/*` (en construcción) | `bot/package.json` |
| `db/` | Base de datos Postgres y copia a Google Sheets (en construcción) | `db/README.md` |
