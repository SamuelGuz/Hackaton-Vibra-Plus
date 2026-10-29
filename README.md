# 🐾 Huellitas Vibra Plus — Proyecto de Rescate Real

> **Sistema de Asistencia Operativa y Supervivencia para Refugios Populares**  
> Diseñado especialmente para la realidad de **Doña Gloria** (recicladora urbana, estrato 1), sus **90 animales rescatados** y **Don Carlos (amigo carnicero)**.

[![Rama](https://img.shields.io/badge/Rama_Activa-silvia--rescate--real-10b981?style=flat-square)](https://github.com/SamuelGuz/Hackaton-Vibra-Plus/tree/silvia-rescate-real)
[![Enfoque](https://img.shields.io/badge/Enfoque-WhatsApp--First_|_Low--Data-blue?style=flat-square)](#)
[![Hackaton](https://img.shields.io/badge/Hackatón-2026-orange?style=flat-square)](#)

---

## 🧭 Mapa de Documentación y Organización del Proyecto

Toda la información del proyecto está centralizada y estructurada para que cualquier miembro del equipo o jurado pueda navegarla fácilmente:

| Documento / Carpeta | ¿Qué contiene? | ¿Para quién es? |
| :--- | :--- | :--- |
| 🌟 [**`docs/resumen-solucion-silvia.html`**](docs/resumen-solucion-silvia.html) | **Página web ejecutiva interactiva** con el resumen del plan, problemas, soluciones y pitch. | Jurados, equipo y presentación |
| 📑 [**`docs/plan-rescate-silvia.md`**](docs/plan-rescate-silvia.md) | Documento maestro con el diagnóstico crudo, la crítica técnica y las 5 soluciones realistas. | Referencia estratégica |
| 📋 [**`plan para esta noche.md`**](plan%20para%20esta%20noche.md) | Asignación de roles de hackatón (Samuel = Backend, Monoga = Frontend). | Coordinación técnica |
| 🔍 [**`docs/auditoria-daniel/`**](docs/auditoria-daniel/) | Auditoría técnica previa de código, base de datos, RAG y bots. | Análisis de brechas |
| 📊 [**`docs/research/`**](docs/research/) | Entrevista real con el refugio, costos de WhatsApp y casos de estudio. | Evidencia del problema |
| ⚙️ [**`docs/operacion/`**](docs/operacion/) | Instrucciones de medicinas, tablas y logística de campo. | Operación diaria |

---

## 💡 El Problema Real de la Calle

* **La Usuaria:** Doña Gloria, mujer recicladora de estrato 1, sostiene a 90 perros y gatos en su casa con sus propias manos y por puro amor.
* **La Comida:** No hay presupuesto para concentrado comercial. La comida la provee Don Carlos, un carnicero amigo del barrio que le fía o dona huesos, recortes y menudencias.
* **El Celular:** Android de gama baja (3-4 años de uso), pantalla partida, sin Wi-Fi fijo y con "paqueticos" de datos prepago ($3.000 COP).
* **El Trabajo:** Manos mojadas con baldes, manguera, heces y barro. **No puede sentarse a llenar formularios ni navegar páginas pesadas.**

---

## 🚀 Las 5 Soluciones Realistas (El Plan Silvia)

```text
[Interesados / Curiosos] ───> [Secretario WhatsApp 24/7] ───> Solo Adoptantes Aptos y Donaciones Reales
[Manos Mojadas / Campo]  ───> [Audio WhatsApp 5 seg]    ───> Registro Médico y Carne sin Doble Dosis
[Hambre de 90 Animales]  ───> [Botonera Nequi Carnicero] ───> Kilos de Carne Reales con Don Carlos
[Voluntario en Patio]    ───> [Ficha Semáforo <20 KB]   ───> Consulta Instantánea sin Gastar Datos
```

1. **El "Secretario Escudo" en WhatsApp:**  
   Atiende automáticamente 24/7, filtra a los curiosos con 4 preguntas clave (vivienda, presupuesto, rejas, compromiso) y solo molesta a Gloria cuando hay un adoptante calificado ($\ge 75$ pts) o una donación confirmada.
2. **Campaña "Págale al Carnicero" (Nequi / Daviplata):**  
   Reemplaza pedidos de dinero abstracto por compras de comida reales y medibles:
   * *$10.000 COP:* 2 kilos de carne fresca con Don Carlos para Rocky hoy.
   * *$25.000 COP:* Menudencia para 10 perros por un día.
   * *$60.000 COP:* Bulto de concentrado para mezclar con la carne.
3. **Bitácora Médica por Notas de Voz:**  
   Gloria o los voluntarios mandan audios de 5 segundos (*"Ya le di la pastilla del ojo al Tuerto"*). El bot anota la medicina y la hora para evitar que alguien le repita la dosis por error.
4. **Ficha Digital Semáforo (<20 KB):**  
   Carga instantánea en cualquier celular barato. Muestra foto del animal, advertencias de manejo y un semáforo claro (🟢 Ya comió / 🟡 Medicina pendiente / 🔴 Curación urgente).
5. **Ecosistema Zero-Data:**  
   Toda la interacción de Gloria ocurre dentro de WhatsApp, sin necesidad de gastar saldo en navegadores de internet.

---

## 🏗️ Estructura del Repositorio

* [`bot/`](bot/): Servidor backend en Node.js (Hono), webhooks de WhatsApp, transcripción de audios e inteligencia artificial.
* [`panel/`](panel/): Interfaz web para administración y fichas ligeras.
* [`db/`](db/): Base de datos PostgreSQL y scripts de sincronización.
* [`shared/`](shared/): Reglas de negocio comunes, tipos TypeScript y lógica de adopciones.
* [`docs/`](docs/): Toda la documentación estratégica, técnica y de investigación.
* [`.agents/`](.agents/) y [`.claude/`](.claude/): Sistema de habilidades y agentes de ingeniería **ECC (Everything Claude Code)**.

---

## 🏆 El Discurso Ganador (Pitch de 60 Segundos)

> *"Un refugio popular no se apaga por falta de amor; se apaga cuando el agotamiento y la falta de comida vencen a quien rescata.  
> 
> No construimos un software de oficina para una persona que no tiene computador. Diseñamos un sistema de supervivencia para Doña Gloria: recicladora, estrato 1, con 90 perros en su casa y un amigo carnicero que le fía huesos para mantenerlos vivos.  
> 
> Nuestra plataforma vive dentro de WhatsApp, transforma audios de 5 segundos en control médico para evitar sobredosis, frena a los curiosos para que Gloria descanse, y convierte la generosidad de la gente en kilos de carne pesados en la báscula de Don Carlos.  
> 
> Esto no es tecnología para inflar un currículum; es tecnología indestructible que corre en un teléfono de $150.000 pesos y salva 90 vidas reales."*
