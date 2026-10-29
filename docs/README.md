# 📚 Documentación de Huellitas Vibra Plus

Empieza aquí. Cada documento responde una necesidad clara del proyecto.

---

## 🌟 Documentos Estratégicos del Plan Silvia (Vigentes)

| Documento | ¿Qué responde? | Formato |
| :--- | :--- | :--- |
| [**`resumen-solucion-silvia.html`**](resumen-solucion-silvia.html) | **Página web ejecutiva interactiva**: Resumen completo en viñetas, problemas, soluciones y el pitch. | HTML Interactivo |
| [**`plan-rescate-silvia.md`**](plan-rescate-silvia.md) | Documento maestro con el diagnóstico crudo, la crítica técnica y las 5 soluciones del Plan Carnicero. | Markdown |

---

## 📋 Documentos de Coordinación y Requerimientos

| Documento | Qué responde | Estado |
| :--- | :--- | :--- |
| [Huellitas_Requerimientos_VibraPlus.md](Huellitas_Requerimientos_VibraPlus.md) | ¿Qué pidió la fundación originalmente? | Referencia fija |
| [PLAN_INTEGRADO.md](PLAN_INTEGRADO.md) | ¿Cómo encajan las piezas? Contrato `/api/*`, roles y cronograma | Vigente técnico |
| [PLAN_PANEL.md](PLAN_PANEL.md) | ¿Cómo se ve y se usa el panel? Pantallas y componentes | Vigente para panel |
| [placa-viva/diseno.md](placa-viva/diseno.md) | ¿Qué hacen la placa, la ficha de hoy y el bot de WhatsApp? | Vigente funcional |
| [research/](research/) | Entrevista real con el refugio, costos y precios de WhatsApp | Evidencia del problema |
| [auditoria-daniel/](auditoria-daniel/) | Informes 00-07 con la auditoría técnica de RAG, bot y campañas | Auditoría previa |

---

## 💻 Dónde está el Código

| Carpeta | Qué es | Tecnología |
| :--- | :--- | :--- |
| [`bot/`](../bot/) | Servidor API, WhatsApp, IA y lógica de adopciones | Node.js / Hono / TypeScript |
| [`panel/`](../panel/) | Panel administrativo y fichas ligeras | React / Vite |
| [`db/`](../db/) | Migraciones PostgreSQL y esquemas | SQL / Postgres |
| [`shared/`](../shared/) | Lógica compartida de negocio y tipos | TypeScript |
