# Plan de Rescate Real — Huellitas / Vibra Plus
**Autoras:** Silvia & Equipo  
**Rama:** `silvia-rescate-real`  
**Fecha:** 28 de Octubre de 2026 (Noche de Hackatón)  
**Marco de Trabajo:** ECC (Everything Claude Code) + Perspectiva Humana Radical

---

## 1. El Diagnóstico Crudo: La Realidad vs. El Humo Técnico

### La Usuaria Real (Doña Gloria)
* **Oficio:** Recicladora urbana en Colombia (estrato 1).
* **Misión de vida:** Cuida en su propia casa a **90 perros y gatos rescatados** por puro amor.
* **Economía del refugio:** Cero presupuesto fijo. No hay dinero para bultos de concentrado comercial.
* **La línea de vida diaria:** Un amigo carnicero de barrio (Don Carlos) que le regala o le fía huesos, menudencias y recortes de carne para que los animales no mueran de hambre.
* **Dispositivo y conectividad:** Celular Android de gama baja (3-4 años de uso), pantalla partida, batería desgastada, sin Wi-Fi fijo. Se conecta exclusivamente mediante "paqueticos" de datos prepago ($3.000 COP).
* **Rutina física:** 14 horas al día de trabajo pesado con las manos mojadas, baldes, manguera, heces, costales de reciclaje y ladrillos.

---

### Lo que encontramos en el repositorio (La crítica necesaria)
1. **Campañas por Correo Electrónico (SMTP/Nodemailer):** Inviable. La gente que dona a un refugio popular no lee correos; responde a estados de WhatsApp y comprobantes de Nequi.
2. **Página Web Pesada de Oficina (Panel React):** Diseñada para un usuario con computador y fibra óptica. En el celular de la señora con datos prepago, la página se come el saldo en minutos o no abre.
3. **Catálogo de 70 Perros de Mentira:** El sistema tenía precargados 70 nombres ficticios de muestra ("Tobías"), mientras los 90 perros de carne y hueso que comen sobras de carnicería no estaban registrados.
4. **La "Voz Cálida" era Puro Texto:** Se prometió interacción por voz pero no había sintetizador de audio (TTS). Era texto plano simulando voz.
5. **83 Pruebas con Falla Oculta (`expected-fail`):** Pruebas marcadas para no contar como error ante los jurados en vez de resolver la causa raíz.

---

## 2. Las 5 Soluciones Realistas de Silvia

### 1. El "Secretario Escudo" en WhatsApp
* **El problema:** La señora pierde 3 horas al día atendiendo en WhatsApp a personas que piden perros finos regalados o que le exigen recibir camadas sabiendo que no tiene comida.
* **La solución:** Un asistente automatizado en WhatsApp que recibe a los desconocidos con calidez y firmeza:
  - Aplica un filtro de 4 preguntas de oro (vivienda, presupuesto, rejas, compromiso veterinario).
  - Si el interesado no es apto, lo redirige con empatía a donar o apadrinar comida.
  - Si el interesado es apto ($\ge 75$ puntos), agenda una visita tentativa de fin de semana y le envía un resumen limpio a Gloria.
  - A Doña Gloria solo le suena el teléfono cuando hay un adoptante confirmado o una donación real.

### 2. La Campaña "Págale al Carnicero" (Comida Real en Kilos)
* **El problema:** La gente desconfía de "donar a una cuenta bancaria genérica".
* **La solución:** Micro-donaciones directas, tangibles y trazables conectadas a Nequi y Daviplata:
  - 🥩 **Opción 1:** *$10.000 COP = Págale 2 kilos de carne al carnicero de Rocky hoy.*
  - 🍗 **Opción 2:** *$25.000 COP = Cubre la menudencia de 10 perros por un día.*
  - 🥣 **Opción 3:** *$60.000 COP = Dona un bulto de concentrado para mezclar con la carne.*
* **El impacto:** Notificación inmediata al donante: *"Gracias a tus $10.000, Rocky comió hoy carne con Don Carlos el carnicero"*.

### 3. Bitácora Médica por Notas de Voz (Manos Ocupadas)
* **El problema:** No se pueden llenar planillas ni tocar pantallas con las manos llenas de barro o jabón. Olvidar si un animal tomó su medicina puede ser mortal por omisión o sobredosis.
* **La solución:**
  - La señora o un voluntario manda un audio de 5 segundos al chat del bot:  
    👉 *"Hola, soy Gloria, ya le di la pastilla del ojo al Tuerto y nos llegaron 20 kilos de carnaza"*.
  - El sistema extrae la información y marca:
    - `Tuerto`: Medicina administrada hoy a las 9:15 AM.
    - `Inventario`: +20 kg de carne registrados.
  - Si alguien pregunta por la tarde: el sistema avisa de inmediato que la dosis ya fue dada para evitar duplicaciones.

### 4. Ficha Digital Semáforo Ultraligera (<20 KB)
* **El problema:** Abrir fichas técnicas pesadas bloquea los teléfonos viejos sin señal en los patios.
* **La solución:**
  - Placa o enlace directo que abre una ficha en HTML estático que pesa menos que un sticker de WhatsApp.
  - Muestra foto real, nombre y un semáforo de 3 estados:
    - 🟢 *Verde:* Comió hoy.
    - 🟡 *Amarillo:* Medicina de las 2:00 PM pendiente.
    - 🔴 *Rojo:* Curación o atención prioritaria.
  - Advertencia de manejo en letras grandes: *"Asustadizo, no tocar orejas"*.

### 5. Respeto al Bolsillo: Ecosistema 100% WhatsApp
* **El problema:** Salirse de WhatsApp gasta los datos móviles del plan prepago.
* **La solución:** La señora realiza el 100% de su interacción dentro del chat de WhatsApp que las empresas de telefonía en Colombia ofrecen sin cobro de megas en paquetes prepago.

---

## 3. Integración con el Entorno ECC (Everything Claude Code)

Para ejecutar este plan en la hackatón se desplegó el sistema ECC en `.agents/` y `.claude/`:
* **`product-lens`:** Para auditar cada pantalla y endpoint desde la perspectiva de la recicladora.
* **`silent-failure-hunter`:** Para evitar que mensajes de voz o confirmaciones se pierdan en zonas con mala señal de datos.
* **`a11y-architect`:** Para asegurar botones de tamaño accesible (mínimo 48px) para dedos mojados o pantallas fisuradas.
* **`database-reviewer`:** Para garantizar que las tablas SQL de solicitudes y alimentos registren con idempotencia y no dupliquen gastos.

---

## 4. El Guion del Pitch para Ganar el Jurado

> *"Señores del jurado: Un refugio no fracasa por falta de amor; fracasa cuando el agotamiento y la falta de comida ahogan a quien rescata. 
> 
> En este proyecto no vinimos a construir un software de oficina para una persona que no tiene computador. Vinimos a salvar a Doña Gloria, una mujer recicladora que alimenta 90 perros con la ayuda de un amigo carnicero y un celular con la pantalla rota.
> 
> Nuestro sistema corre dentro de WhatsApp, convierte audios de 5 segundos en control de medicinas para no matar a un perro con doble dosis, frena a los curiosos para que Gloria descanse, y conecta la generosidad de la gente directamente con los kilos de carne que Don Carlos le corta a los animales cada mañana.
> 
> Esto no es tecnología para inflar un portafolio. Es tecnología de supervivencia que funciona hoy en un celular de $150.000 pesos."*
