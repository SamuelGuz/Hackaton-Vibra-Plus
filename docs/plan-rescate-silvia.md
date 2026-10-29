# Plan Estratégico Integral — Refugio Yesenia (Bucaramanga)
**Equipo:** Silvia, Daniel & Samuel (Ingeniería Biomédica + Ingeniería de Sistemas · 4to Semestre)  
**Rama:** `silvia-rescate-real`  
**Fuentes Verificadas:** [Investigación Documental Bucaramanga](research/investigacion-documental-yesenia.md) + [Entrevista de Campo](research/entrevista-respuestas.md)

---

## 1. Diagnóstico Real del Refugio Yesenia (Cero Inventos)

### 1.1. Antecedentes Documentales en Bucaramanga
El **Refugio Yesenia** (Bucaramanga, Santander) cuenta con tres antecedentes documentales verificados:
1. ***Vanguardia* (16 de julio de 2024):** Artículo *“Fundación Dar con Amor: nueve años de amor y dedicación hacia los animales en Bucaramanga”*, que documenta el apoyo a la remodelación y las necesidades de infraestructura del Refugio Yesenia.
2. **Informe de gestión 2023 (*Fundación Dar con Amor*):** Registra actividades de voluntariado en el Refugio Yesenia (paseos de perros, baños y limpieza).
3. **Repositorio Institucional de la *Universidad de Santander (UDES)*:** Trabajo académico sobre la campaña **“Dona un Ladrillo”**, orientada a la adecuación física del Refugio Yesenia.

### 1.2. Los 4 Dolores Críticos de Yesenia en el Día a Día
1. **Manos llenas de barro, agua y limpieza (10:30 AM):** Yesenia está limpiando popó, bañando perros y repartiendo agua y comida en baldes. No puede sentarse frente a un computador, no puede teclear formularios largos con las manos mojadas, y **no tiene impresora ni plastificadora para fabricar collares QR que además los perros muerden y rompen en el barro**.
2. **Sobrecarga cognitiva ("Su cerebro no alcanza para recordarlo todo"):** No puede recordar de memoria a quién ya alimentó, a quién ya le dio su medicamento, **cómo va la sanación de la herida de un perrito rescatado**, a quién le toca refuerzo de vacuna o cuándo alguien agendó visita de adopción.
3. **Riesgo de doble dosis médica con voluntarios rotativos:** Cuando llegan voluntarios de apoyo (como los de *Dar con Amor* o la *UDES*), existe el peligro real de que dos personas le den el mismo medicamento (ej. anticonvulsivo a las 2:00 PM) provocando una sobredosis, o que nadie se lo dé pensando que otro ya lo hizo.
4. **Necesidades urgentes de recursos y confianza para donar:** El refugio necesita constantemente **bultos de comida (concentrado), vacunas, medicamentos, dinero para abonar a las deudas en clínicas veterinarias y ladrillos/materiales**. Para que la gente done con confianza, necesita ver una meta clara y comprobar en tiempo real que su dinero sí llegó y se transformó en ayuda real.

---

## 2. Nuestra Solución en 3 Pilares ("El Segundo Cerebro de Yesenia" + Red de Tiendas)

### Pilar 1: Red de Pósters QR en Tiendas Aliadas $\rightarrow$ Página Web de Storytelling y Confianza en Vivo
* **El Póster en Tiendas (*"Ayuden a Yesenia"*):** Hablamos con tiendas y comercios aliados para colocar un póster con código QR.
* **La Página Web Persuasiva:** Al escanear el QR, se abre la web enfocada en contar la historia real de Yesenia (respaldada por *Vanguardia*, *Dar con Amor* y *UDES*) y persuadir a las personas de apoyarla **siguiéndola, adoptando o donando para bultos de comida, vacunas, medicamentos o dinero**.
* **Muro Anónimo de Confianza y Barra de Meta (`GET /api/publico/meta-del-dia`):**
  - Cuando las personas donan, aparece de inmediato un **registro anónimo** de quienes donaron para que vean que su aporte realmente subió.
  - Muestra en vivo el contador: *"Miren, en total hemos recaudado X cantidad de la meta de Y"*.
* **Mensaje Automático al Lograr la Meta:** Cuando se alcanza la meta (y Yesenia confirma por voz en su Segundo Cerebro que llegaron los bultos o se aplicaron las vacunas), el sistema les envía un mensajito por WhatsApp celebrando el logro e integrándolos a la comunidad.

---

### Pilar 2: El "Segundo Cerebro" de Yesenia (Autogestión Manos-Libres por Voz y Foto en WhatsApp)
La idea central es que **ella sienta que tiene a otra persona al lado** encargándose de todo lo que su cerebro agotado no puede recordar:

1. **Identificación Fenotípica Visual + Mapa por Patios (Cero Collares QR, Cero Impresoras):**
   * Cuando llega un perro nuevo al refugio, Yesenia **no imprime nada ni le fabrica collares**.
   * Solo le toma **1 foto en WhatsApp** y manda un audio de 5 segundos: *"Llegó este criollito negro con pecho blanco al Patio 2, tiene herida en la pata trasera, llamémoslo Rocky"*.
   * La IA extrae automáticamente sus **rasgos visuales (Vector Fenotípico)** y el **Patio** donde duerme.
   * Cuando un voluntario nuevo quiere saber quién es un perro y qué cuidados tiene, filtra con 1 toque por **Patio + Color** en el panel o le envía **1 foto del perro por WhatsApp al bot**, y en 2 segundos recibe sus alertas rojas (*"¡Ojo! No juntar con machos"*) y su medicina del día.
2. **Despertador Matutino (7:00 AM) y Cierre de Paz Mental (7:00 PM):**
   * **7:00 AM:** El bot le envía sola la imagen de resumen del día (medicinas programadas, vacunas que vencen esta semana, días restantes de bultos de comida y citas de adopción agendadas).
   * **Durante el día:** Yesenia registra comida, medicinas, curaciones y recibos de veterinaria solo con notas de voz de 5 segundos o fotos en WhatsApp.
   * **7:00 PM:** Revisa su resumen nocturno, toca el botón verde **`"Todo bien"`** y descansa tranquila sabiendo que ningún animal quedó sin comer ni sin su medicina.
3. **Filtro Inteligente de Adopciones y Agendamiento:**
   * El bot conversa 24/7 con los interesados en adoptar, evalúa las 4 condiciones clave (vivienda, presupuesto, cerramientos y compromiso veterinario), le avisa a Yesenia quién agendó o quién no agendó, y programa los recordatorios de seguimiento post-adopción.

---

### Pilar 3: El Sello de Ingeniería Biomédica + Machine Learning (4to Semestre)
Aplicamos ingeniería clínica y modelos predictivos directamente sobre los datos que Yesenia envía por WhatsApp, sin requerir hardware costoso que se dañe en el barro:

1. **🛑 `PK-SafeLock` (Farmacovigilancia por Peso `mg/kg` y Bloqueo Anti-Sobredosis):**
   * Calcula la dosis segura según el peso del animal y modela la ventana de eliminación farmacocinética ($C(t) = C_0 \cdot e^{-k_e t}$).
   * Si un voluntario reporta una dosis por audio, queda registrada con la hora exacta y el nombre de quien la dio. Si otro voluntario intenta darle la misma pastilla antes de cumplirse la ventana terapéutica (ej. 12h en Fenobarbital), el sistema **lo frena en seco alertando riesgo de neurotoxicidad/sobredosis**.
2. **🔬 `Tissue-Track CV` (Biometría de Cicatrización de Heridas por Foto):**
   * Resuelve el dolor de Yesenia de *"no saber cómo va la sanación del perrito"*.
   * Cada vez que manda una foto de la herida por WhatsApp, el sistema evalúa las **4 fases histológicas de cicatrización** (*Necrosis $\rightarrow$ Esfacelo/Exudado $\rightarrow$ Granulación Roja $\rightarrow$ Epitelización Rosa*) y muestra el **Índice de Evolución Tisular ($0-100\%$)** en la ficha del animal, alertando si aparece riesgo de infección.
3. **🛡️ `BioShield SEIR & Metabolismo NRC` (Vacunas, Cuarentena y Predicción de Bultos):**
   * Controla los **14 días obligatorios de cuarentena epidemiológica** (incubación de Parvovirus/Moquillo) antes de permitir pasar un perro recién rescatado a los patios generales, lleva el semáforo de refuerzos de vacunación y calcula mediante gasto metabólico ($RER = 70 \cdot Peso_{kg}^{0.75}$) cuántos días exactos de **bultos de comida** quedan en bodega.
