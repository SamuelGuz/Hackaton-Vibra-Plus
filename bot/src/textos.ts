// Todo lo que dice el bot, en un solo lugar, para ajustar el tono sin tocar la lógica.
// Frases cortas, en colombiano, con las mismas palabras que usa el equipo.

import { horaBonita, pesos } from './formato.js'

export const AUDIO = 'O mándame un audio 🎤 contándome, como si le hablaras a un compañero.'

export const textos = {
  bienvenida: (nombre: string) =>
    `Hola, ${nombre} 👋 Soy el ayudante del Refugio Yesenia.\n\n` +
    'Aquí me cuentas lo que haces con los animalitos y yo lo paso al panel. ' +
    'Casi todo es tocar botones. Si te pierdes, escribe *menú*.',

  menu: (saludo: string, nombre: string) => `${saludo}, ${nombre}. ¿Qué hiciste?\n\nToca *Ver opciones* 👇\n\n${AUDIO}`,
  menuBoton: 'Ver opciones',

  ayuda:
    'Así funciono:\n\n' +
    '1. Toca *Ver opciones* y elige lo que hiciste.\n' +
    '2. O mándame un audio contándome todo de una vez.\n' +
    '3. Te digo lo que entendí y tocas *Sí, está bien*. Si el audio está clarito, lo anoto de una y te aviso.\n\n' +
    'Escribe *menú* cuando quieras volver al inicio.',

  desconocido:
    'Hola 👋 Todavía no te tengo en la lista del equipo del Refugio Yesenia.\n\n' +
    'Ya le avisé a la administradora: cuando te agregue en el panel, te escribo por aquí.',

  agregadoAlEquipo: (nombre: string) =>
    `¡Hola, ${nombre}! 👋 Ya estás en el equipo del Refugio Yesenia.\n\nEscríbeme *hola* para empezar.`,

  noEntendi: 'No te entendí bien 🙈 ¿Qué hiciste? Elige en la lista o cuéntamelo otra vez.',
  noSupeQueAnotar: 'No supe qué anotar con eso 🤔 Elige en la lista o cuéntame qué hiciste, con nombres y cantidades.',
  noPudeEscuchar: 'No pude escuchar bien tu audio 😓 ¿Me lo mandas otra vez o me lo escribes?',
  tocaOEscribe: 'No la encontré en la lista 🙈 Toca una opción o escríbela tal como sale.',
  soloAudiosFotosTexto: 'Por ahora entiendo audios, fotos y mensajes escritos 🙂',
  algoFallo: 'Uy, algo me falló de mi lado 😓 No se guardó nada. Intentemos otra vez.',
  seMePerdio: 'Se me perdió el hilo 😅 Empecemos de nuevo.',
  informeCual: '¿Qué informe quieres ver? Te lo mando como imagen 📊',
  informeBoton: 'Ver informes',
  informePreparando: 'Ya te lo preparo 📊 Dame un momentico.',
  informeFallo: 'Uy, no pude armar la imagen del informe 😓 Mira lo de hoy o abre el panel mientras lo arreglo.',
  informeOtro: 'Ahí está 👆 Si quieres otro, escribe "informe" cuando quieras.',
  informeSinPlata: 'El informe de la plata solo lo ve la administración 🔒',
  futura: 'Entendí que todavía no se lo has dado. Cuando se lo des, me cuentas y lo anoto 👍',
  noPuedePlata: 'Lo de la plata lo registra la administradora 🙏 Cuéntale a ella.',
  panelSinPlata: 'Los voluntarios no registran plata: lo hace alguien del equipo o la administradora',

  // Confirmar
  entendi: 'Entendí esto:',
  escuche: (t: string) => `🎧 Escuché: «${t.length > 220 ? `${t.slice(0, 219)}…` : t}»`,
  estaBien: '¿Está bien?',
  listo: '¡Listo, quedó guardado! ✅',
  anotado: (hora: string) => `✅ Anotado (${hora}):`,
  siHuboError: 'Si hubo un error, responde *corregir*.',
  borrado: 'Listo, lo borré. No quedó nada guardado 👍',
  yaGuardado: 'Eso ya estaba guardado ✅',
  yaBorrado: 'Eso ya lo habías borrado 👍',
  noEsTuyo: 'Eso lo registró otra persona. Que lo confirme ella o alguien desde el panel 🙏',
  corregir: 'Listo, borré lo que había entendido. Vamos paso a paso 👇',
  corregirVarios: 'Si había algo más, me lo cuentas cuando terminemos.',
  algoMas: '¿Algo más?',
  despedida: (nombre: string) => `Gracias, ${nombre} 🐾 Aquí estoy cuando me necesites.`,

  // Medicinas
  medicinaElegir: '¿A quién le diste la medicina? Toca *Ver dosis* 👇',
  medicinaBoton: 'Ver dosis',
  medicinaNinguna: 'Hoy no queda ninguna medicina pendiente 🎉\n\nSi le diste otra cosa, mándame un audio contándome.',
  medicinaOtra: 'Cuéntame en un audio 🎤 qué medicina le diste y a quién.',
  dosisDuplicada: (quien: string, hora: string) =>
    `⚠️ Ojo: esta dosis ya la reportó *${quien}* a las ${hora}.\n\n¿Es una dosis distinta?`,
  dosisOmitida: (animal: string, horaDosis: string, quien: string, hora: string) =>
    `⚠️ La dosis de las ${horaBonita(horaDosis)} de *${animal}* ya la reportó ${quien} a las ${hora}. No la repetí.`,
  dosisNoRepito: 'Perfecto, no la repito 👍',
  esOtraDosis: '¿Le diste otra dosis aparte de esa?',

  // Comida
  comidaEspecie: (llegada: boolean) => (llegada ? '¿Llegó comida de perro o de gato?' : '¿Abriste un bulto de perro o de gato?'),
  comidaCantidad: (especie: string) => `¿Cuántos bultos de ${especie} llegaron?`,
  comidaEscribeNumero: 'Escríbeme el número de bultos. Por ejemplo: *5*',
  comidaNoEntendi: 'No te entendí el número 🙈 Escríbelo así: *3*',
  comidaCuantosKilos: (especie: string) =>
    `¿Cuántos kilos llegaron para los ${especie === 'gato' ? 'gatos' : 'perros'}? 🥩 Escríbelo así: *15* o *15 kilos de carne*`,
  comidaKilosNoEntendi: 'No te entendí los kilos 🙈 Escríbelos así: *15*',
  quedanDias: (especie: string, dias: string, urgente: boolean) =>
    `Quedan *${dias}* de comida de ${especie}.${urgente ? ' Toca pedir hoy ⚠️' : ''}`,

  // Plata
  plataMonto: (tipo: 'ingreso' | 'gasto') =>
    `${tipo === 'ingreso' ? '¿Cuánta plata entró?' : '¿Cuánta plata salió?'}\n\n` +
    'Escríbela así: *50 mil* o *50000*. También me la puedes decir en un audio 🎤',
  plataNoEntendi: 'No te entendí el valor 🙈 Escríbelo así: *50 mil*. O escribe *menú* para volver.',
  plataCategoria: (tipo: 'ingreso' | 'gasto', monto: number) =>
    tipo === 'ingreso' ? `Entró *${pesos(monto)}*. ¿De dónde vino?` : `Salió *${pesos(monto)}*. ¿En qué se gastó?`,
  plataCategoriaBoton: 'Elegir',
  plataClinica: '¿De cuál clínica?',
  plataFoto: '¿Tienes foto del recibo o del comprobante? 📷',
  plataMandaFoto: 'Listo, mándame la foto 📷',
  enCaja: (monto: number) => `En caja quedan *${pesos(monto)}*.`,

  // Facturas
  facturaFoto: 'Mándame la foto de la factura 📷\n\nQue se vea completa y con buena luz.',
  facturaCuanto: '¿De cuánto es la factura? Escríbelo así: *320 mil*',
  facturaMonto: 'No alcancé a leer el valor 🙈 ¿De cuánto es la factura? Escríbelo así: *320 mil*',
  facturaClinica: '¿De cuál clínica es la factura?',
  deudaClinica: (clinica: string, deuda: number, porcentaje: number) =>
    `Ahora le debemos *${pesos(deuda)}* a ${clinica} (${porcentaje} % del límite).${porcentaje > 85 ? ' ⚠️ Ya casi llegamos al tope.' : ''}`,

  // Animales
  animalElegir: '¿De cuál animal me quieres contar? Toca *Ver animales* o escríbeme su nombre.',
  animalBoton: 'Ver animales',
  animalNombre: 'Escríbeme su nombre 🐶🐱',
  animalNoEncontre: (nombre: string) => `No encontré a «${nombre}» 🤔 Revisa el nombre o escríbelo de otra forma.`,
  animalVarios: 'Encontré varios. ¿Cuál es?',
  animalNota: (nombre: string) => `¿Qué le notaste a *${nombre}*? Escríbelo o mándame un audio 🎤`,

  // Seguimientos de adopción (días 2, 5, 15, 30 y 90)
  seguimientosTitulo: '📞 Hoy toca llamar a los adoptantes de:',
  seguimientosToca: 'Cuando llames, toca cómo te fue 👇',
  seguimientosVerHoy: 'Escribe *seguimientos* para anotar cómo salió cada llamada.',
  seguimientosNinguno: 'Hoy no toca llamar a ningún adoptante 🎉',
  seguimientosMas: (n: number) => `Hay ${n} más: cuando anotes estas, escribe *seguimientos* otra vez.`,
  seguimientoComoSalio: (animal: string, dia: number, adoptante: string) =>
    `📞 *${animal}* (Día ${dia}) con ${adoptante}: ¿cómo te fue?`,
  seguimientoAnotado: (animal: string, dia: number, resultado: 'verde' | 'amarillo' | 'rojo') =>
    resultado === 'verde'
      ? `🟢 Anotado: a *${animal}* le va bien en su casa (Día ${dia}).`
      : resultado === 'amarillo'
        ? `🟡 Anotado: lo de *${animal}* (Día ${dia}) queda para revisar. Alguien del equipo tiene que volver a llamar.`
        : `🔴 Anotado: *${animal}* (Día ${dia}) tiene problemas. Avísale hoy a la coordinación de adopciones: puede tocar rescatarlo.`,

  // Panel
  panel: (url: string) =>
    `Este es tu enlace personal al panel 👇\n\n${url}\n\nNo se lo pases a nadie: con él se entra como si fueras tú.`,
}

export const botones = {
  menu: { id: 'menu', titulo: 'Registrar otra cosa' },
  fin: { id: 'fin', titulo: 'Eso es todo' },
  volver: { id: 'menu', titulo: 'Volver al menú' },
  si: (id: string) => ({ id: `si:${id}`, titulo: 'Sí, está bien' }),
  corregir: (id: string) => ({ id: `corregir:${id}`, titulo: 'Corregir' }),
  borrar: (id: string) => ({ id: `borrar:${id}`, titulo: 'Borrar' }),
}

export const OPCIONES_MENU = [
  { id: 'm:med', titulo: 'Le di una medicina', descripcion: 'Pastillas, gotas, baños…' },
  { id: 'm:bulto', titulo: 'Abrí un bulto', descripcion: 'Se abrió comida de perro o de gato' },
  { id: 'm:llego', titulo: 'Llegó comida', descripcion: 'Bultos o kilos de carne a la bodega' },
  { id: 'm:entro', titulo: 'Entró plata', descripcion: 'Donación, padrino, rifa…', plata: true },
  { id: 'm:salio', titulo: 'Salió plata', descripcion: 'Una compra o un pago', plata: true },
  { id: 'm:factura', titulo: 'Factura de clínica', descripcion: 'Foto de una factura a crédito' },
  { id: 'm:animal', titulo: 'Contar algo de un animal', descripcion: 'Cómo está, qué le notaste' },
  { id: 'm:hoy', titulo: 'Ver lo de hoy', descripcion: 'Medicinas, comida y pendientes' },
  { id: 'm:informe', titulo: 'Ver un informe', descripcion: 'Gráficas de plata, comida, animales…' },
  { id: 'm:panel', titulo: 'Abrir el panel', descripcion: 'Ver todo en el celular' },
]

export const CATEGORIAS = {
  ingreso: [
    { id: 'cat:donacion', titulo: 'Donación' },
    { id: 'cat:padrino', titulo: 'Padrino' },
    { id: 'cat:rifa', titulo: 'Rifa o evento' },
    { id: 'cat:otro', titulo: 'Otra cosa' },
  ],
  gasto: [
    { id: 'cat:comida', titulo: 'Comida' },
    { id: 'cat:veterinaria', titulo: 'Veterinaria' },
    { id: 'cat:abono', titulo: 'Abono a una clínica', descripcion: 'Para bajar la deuda' },
    { id: 'cat:limpieza', titulo: 'Limpieza' },
    { id: 'cat:servicios', titulo: 'Servicios', descripcion: 'Agua, luz, internet' },
    { id: 'cat:transporte', titulo: 'Transporte' },
    { id: 'cat:otro', titulo: 'Otra cosa' },
  ],
}

export const NOMBRE_CATEGORIA: Record<string, string> = {
  donacion: 'Donación',
  padrino: 'Padrino',
  rifa: 'Rifa o evento',
  comida: 'Comida',
  veterinaria: 'Veterinaria',
  limpieza: 'Limpieza',
  servicios: 'Servicios',
  transporte: 'Transporte',
  otro: 'Otra cosa',
}
