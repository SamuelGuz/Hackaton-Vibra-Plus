// Base de conocimiento del refugio Refugio Yesenia: respuestas de referencia para el motor de preguntas (rag/respuestas.ts).
//
// AVISO IMPORTANTE: todos los datos de esta base (horarios, precios, procesos, cifras y nombres de aliados) son
// DATOS DE DEMOSTRACIÓN FICTICIOS para el hackathon. Deben reemplazarse por los datos reales del refugio
// antes de publicarlos. No incluyen teléfonos, cuentas bancarias ni correos: los pagos y contactos
// solo se comparten por el chat oficial de WhatsApp.

import type { EntradaConocimiento } from './tipos.js'

export const CONOCIMIENTO: EntradaConocimiento[] = [
  // ---------- ADOPCIÓN ----------
  {
    id: 'adopcion-requisitos',
    tema: 'adopcion',
    preguntas: [
      '¿Qué necesito para adoptar?',
      'requisitos adopcion',
      'quiero adoptar, qué papeles tengo que llevar',
      '¿qué me piden para llevarme un perrito a casa?',
    ],
    respuesta:
      'Para adoptar necesitas ser mayor de edad, llenar el formulario de adopción, tener cédula vigente y una dirección donde el animal pueda vivir bien. Después hacemos una visita de conocimiento y una charla corta con el equipo.',
    palabrasClave: ['adopcion', 'requisitos', 'documentos', 'cedula', 'formulario', 'mayor', 'adoptar', 'papeles'],
  },
  {
    id: 'adopcion-costo',
    tema: 'adopcion',
    preguntas: [
      '¿Adoptar tiene costo?',
      'cuanto cuesta adoptar un perrito',
      'la adopcion es gratis?',
      'cuanto vale llevarme un gatico',
    ],
    respuesta:
      'La adopción no tiene costo. Lo que sí te pedimos es un compromiso: esterilizar y vacunar al animal a tiempo, y seguir las recomendaciones del veterinario durante su primer año.',
    palabrasClave: ['adopcion', 'gratis', 'costo', 'esterilizar', 'vacunar', 'compromiso', 'precio', 'valor'],
  },
  {
    id: 'adopcion-proceso',
    tema: 'adopcion',
    preguntas: [
      '¿Cómo hago para adoptar?',
      'como adoptar un perro paso a paso',
      'quiero adoptar un perrito que tengo que hacer',
      'proceso de adopcion',
    ],
    respuesta:
      'Primero escribes por el chat oficial de WhatsApp y te enviamos el formulario. Luego agendamos una visita para conocer al animal, hacemos una entrevista corta y, si todo encaja, firmas el compromiso y te lo llevas.',
    palabrasClave: ['adoptar', 'proceso', 'pasos', 'formulario', 'visita', 'entrevista', 'compromiso', 'whatsapp'],
  },
  {
    id: 'adopcion-tiempo',
    tema: 'adopcion',
    preguntas: [
      '¿Cuánto demora el proceso de adopción?',
      'cuanto se demora la adopcion',
      'en cuanto tiempo me entregan el perrito',
      'cuanto tarda adoptar',
    ],
    respuesta:
      'El proceso suele tardar entre una y dos semanas: la visita, la entrevista y la revisión de tu hogar. Si el caso necesita más tiempo, te avisamos por el chat oficial y te explicamos el motivo.',
    palabrasClave: ['demora', 'tiempo', 'proceso', 'semanas', 'entrevista', 'visita', 'tarda', 'adopcion'],
  },
  {
    id: 'adopcion-arriendo',
    tema: 'adopcion',
    preguntas: [
      '¿Puedo adoptar si arriendo?',
      'vivo en arriendo y quiero adoptar',
      'necesito permiso del arrendador para adoptar',
      'si rento apartamento me dan el perrito?',
    ],
    respuesta:
      'Sí puedes adoptar si vives en arriendo, pero necesitas el permiso escrito de tu arrendador que autorice tener mascotas. Sin ese permiso no podemos entregar el animal, sin importar lo bien que estés preparado.',
    palabrasClave: ['arriendo', 'arrendador', 'permiso', 'apartamento', 'mascotas', 'vivienda', 'alquiler', 'escrito'],
  },
  {
    id: 'adopcion-ninos',
    tema: 'adopcion',
    preguntas: [
      '¿Puedo adoptar si tengo niños?',
      'tengo hijos pequeños, adopto un perro?',
      'adopcion con niños en casa',
      'que perrito es bueno para ninos',
    ],
    respuesta:
      'Sí, tenemos animales que se llevan bien con niños, y te los recomendamos según su personalidad. Pedimos que los niños nunca jueguen solos con el animal y que un adulto supervise los primeros días.',
    palabrasClave: ['ninos', 'hijos', 'familia', 'supervision', 'adopcion', 'personalidad', 'casa', 'juego'],
  },
  {
    id: 'adopcion-cachorros',
    tema: 'adopcion',
    preguntas: [
      '¿Tienen cachorros para adoptar?',
      'quiero adoptar un cachorro, qué debo saber',
      'perritos bebes disponibles',
      'adoptar un gatico chiquito',
    ],
    respuesta:
      'Tenemos cachorros y gatitos pequeños cuando hay disponibilidad. Llegan con su primera vacunación y desparasitación; la esterilización se hace cuando el veterinario lo indique, y así quedas en el compromiso.',
    palabrasClave: ['cachorro', 'cachorros', 'gatitos', 'bebes', 'vacunacion', 'esterilizar', 'disponibilidad', 'pequenos'],
  },
  {
    id: 'adopcion-viejitos',
    tema: 'adopcion',
    preguntas: [
      '¿Puedo adoptar un perrito viejito?',
      'quiero adoptar un abuelito de cuatro patas',
      'adoptar un animal mayor',
      'tienen perros o gatos ya grandes para adoptar?',
    ],
    respuesta:
      'Sí, muchos de nuestros viejitos buscan una familia tranquila. Ellos necesitan camas blandas, comida adecuada para su edad y controles más frecuentes; el equipo te cuenta sus cuidados antes de la entrega.',
    palabrasClave: ['viejito', 'mayor', 'abuelito', 'senior', 'tranquilo', 'cuidados', 'adopcion', 'edad'],
  },
  {
    id: 'adopcion-otras-mascotas',
    tema: 'adopcion',
    preguntas: [
      '¿Puedo adoptar si ya tengo otra mascota?',
      'tengo un gato y quiero adoptar un perro',
      'adopcion si en casa hay otros animales',
      'mi perro se llevará bien con el nuevo?',
    ],
    respuesta:
      'Sí, pero la presentación debe ser lenta: en un espacio neutral y por varios días, sin forzar el contacto. Cuéntanos qué mascotas tienes para recomendarte un animal compatible con la tuya.',
    palabrasClave: ['otras', 'mascotas', 'presentacion', 'perro', 'gato', 'compatible', 'casa', 'convivencia'],
  },
  {
    id: 'adopcion-regalo',
    tema: 'adopcion',
    preguntas: [
      '¿Puedo adoptar de regalo para otra persona?',
      'quiero regalar un perrito a mi mamá',
      'adopcion como regalo sorpresa',
      'puedo comprar un perro de regalo?',
    ],
    respuesta:
      'No aceptamos adopciones de regalo para terceros. La persona que adopta debe ser quien vivirá con el animal y firmará el compromiso. Si quieres sorprender, podemos mostrarte fotos para que lo decidan juntos.',
    palabrasClave: ['regalo', 'regalar', 'tercero', 'sorpresa', 'adopcion', 'persona', 'compromiso', 'firmar'],
  },
  {
    id: 'adopcion-viajes',
    tema: 'adopcion',
    preguntas: [
      '¿Qué pasa si me mudo o viajo?',
      'me voy a mudar de ciudad con mi perrito',
      'puedo llevar el animal de viaje?',
      'si viajo largo tiempo qué hago con el perro?',
    ],
    respuesta:
      'Si te mudas, avísanos antes para revisar el nuevo lugar y hacer seguimiento. Si viajas, el animal debe quedar con alguien responsable que sepa su rutina y sus medicinas; no lo dejes sin cuidado.',
    palabrasClave: ['mudanza', 'viaje', 'mudar', 'ciudad', 'cuidador', 'rutina', 'avisar', 'seguimiento'],
  },
  {
    id: 'adopcion-apartamento',
    tema: 'adopcion',
    preguntas: [
      '¿Puedo adoptar si vivo en apartamento?',
      'vivo en un apto pequeño, sirve un perro?',
      'adopcion apartamento',
      'que animales sirven para apartamento',
    ],
    respuesta:
      'Sí, hay animales que viven bien en apartamento. Te recomendamos según el tamaño del espacio y el nivel de energía; los perros muy activos necesitan paseos diarios largos antes de llegar a casa.',
    palabrasClave: ['apartamento', 'apto', 'espacio', 'energia', 'paseos', 'tamano', 'recomendar', 'adopcion'],
  },

  // ---------- APADRINAMIENTO ----------
  {
    id: 'padrino-que-es',
    tema: 'apadrinamiento',
    preguntas: [
      '¿Qué es ser padrino?',
      'que significa apadrinar un animal',
      'como funciona el apadrinamiento',
      'apadrinar que es',
    ],
    respuesta:
      'Ser padrino es aportar cada mes a los gastos de un animal del refugio, como comida, medicinas y consultas. No te quedas con el animal: lo sigues desde lejos y recibes noticias de su vida.',
    palabrasClave: ['padrino', 'apadrinar', 'apadrinamiento', 'aporte', 'mensual', 'gastos', 'animal', 'noticias'],
  },
  {
    id: 'padrino-precio',
    tema: 'apadrinamiento',
    preguntas: [
      '¿Cuánto cuesta ser padrino?',
      'cuanto es el valor mensual del padrinazgo',
      'desde cuanto puedo apadrinar',
      'cuanto debo aportar al mes',
    ],
    respuesta:
      'El apadrinamiento empieza en $20.000 COP al mes. También hay planes de $40.000 y $60.000 COP, y puedes elegir el que mejor te quede. El aporte es mensual y lo puedes cambiar cuando quieras.',
    palabrasClave: ['precio', 'valor', 'mensual', 'padrino', 'aporte', 'planes', 'pesos', 'cuanto'],
  },
  {
    id: 'padrino-diario',
    tema: 'apadrinamiento',
    preguntas: [
      '¿Qué es el diario del padrino?',
      'qué recibe un padrino cada mes',
      'me llegan noticias de mi ahijado?',
      'tienen fotos del animal que apadrino',
    ],
    respuesta:
      'Cada mes recibes el diario del padrino: un resumen con noticias del animal, fotos y cómo va su recuperación o su día a día. Así sabes en qué se está usando tu aporte.',
    palabrasClave: ['diario', 'padrino', 'noticias', 'fotos', 'mensual', 'resumen', 'animal', 'aporte'],
  },
  {
    id: 'padrino-como',
    tema: 'apadrinamiento',
    preguntas: [
      '¿Cómo me hago padrino?',
      'quiero apadrinar a un perrito, cómo lo hago',
      'inscribirme como padrino',
      'donde me hago padrino',
    ],
    respuesta:
      'Escribe por el chat oficial de WhatsApp, cuéntanos cuánto quieres aportar y a qué animal quieres apadrinar. Te enviamos el paso a paso y la confirmación del aporte mensual.',
    palabrasClave: ['inscribirme', 'apadrinar', 'whatsapp', 'aporte', 'confirmacion', 'animal', 'paso', 'padrino'],
  },
  {
    id: 'padrino-elegir',
    tema: 'apadrinamiento',
    preguntas: [
      '¿Puedo elegir a qué animal apadrinar?',
      'quiero escoger el perro que apadrino',
      'puedo apadrinar a uno en especial?',
      'quiero apadrinar al que más necesita',
    ],
    respuesta:
      'Sí puedes elegir un animal en especial. Si no tienes preferencia, te recomendamos uno de los que más necesitan ayuda hoy, según sus tratamientos y su meta de apadrinamiento.',
    palabrasClave: ['elegir', 'animal', 'especial', 'apadrinar', 'preferencia', 'urgente', 'ayuda', 'meta'],
  },
  {
    id: 'padrino-cancelar',
    tema: 'apadrinamiento',
    preguntas: [
      '¿Puedo dejar de ser padrino?',
      'como cancelo el aporte mensual',
      'quiero pausar mi apadrinamiento',
      'ya no puedo seguir apadrinando',
    ],
    respuesta:
      'Puedes cancelar o pausar tu aporte cuando quieras. Solo avísanos por el chat oficial con al menos cinco días de anticipación para que el equipo lo ajuste a tiempo.',
    palabrasClave: ['cancelar', 'pausar', 'dejar', 'aporte', 'anticipacion', 'padrino', 'mensual', 'chat'],
  },
  {
    id: 'padrino-visita',
    tema: 'apadrinamiento',
    preguntas: [
      '¿Los padrinos pueden visitar al animal?',
      'puedo ir a ver al perro que apadrino',
      'visitar a mi ahijado',
      'conocer al animal que ayudo',
    ],
    respuesta:
      'Sí, los padrinos son bienvenidos en las visitas del sábado a las 10:00 a. m. Avísanos antes por el chat oficial para reservarte un momento tranquilo con el animal.',
    palabrasClave: ['visitar', 'padrinos', 'sabado', 'conocer', 'animal', 'ahijado', 'visita', 'reservar'],
  },
  {
    id: 'padrino-no-adopta',
    tema: 'apadrinamiento',
    preguntas: [
      'No puedo adoptar pero quiero ayudar',
      'no tengo casa para un perro, cómo ayudo',
      'quiero ayudar sin adoptar',
      'que puedo hacer si no puedo adoptar',
    ],
    respuesta:
      'Puedes ayudar siendo padrino desde $20.000 COP al mes o donando comida. Así aportas a la salud del animal sin necesidad de tenerlo en casa.',
    palabrasClave: ['ayudar', 'padrino', 'adoptar', 'donar', 'comida', 'casa', 'aporte', 'mensual'],
  },
  {
    id: 'padrino-meta',
    tema: 'apadrinamiento',
    preguntas: [
      '¿Qué es la meta mensual de un animal?',
      'cuanto necesita cada perrito al mes',
      'que significa la meta de apadrinamiento',
      'cuanto cuesta mantener un animal',
    ],
    respuesta:
      'Cada animal tiene una meta mensual de apadrinamiento que cubre comida, medicinas y consultas. El panel muestra cuánto se ha cubierto y cuántos padrinos tiene, para que sepas cuánto falta.',
    palabrasClave: ['meta', 'mensual', 'cubrir', 'medicinas', 'comida', 'consultas', 'padrinos', 'cuanto'],
  },
  {
    id: 'padrino-comprobante',
    tema: 'apadrinamiento',
    preguntas: [
      '¿Me dan comprobante del aporte?',
      'necesito soporte de lo que pagué de padrino',
      'recibo del padrinazgo',
      'factura de mi aporte mensual',
    ],
    respuesta:
      'Sí, el refugio entrega un comprobante de cada aporte mensual. Pídelo por el chat oficial indicando tu nombre y el monto, y te lo enviamos en el mismo día hábil.',
    palabrasClave: ['comprobante', 'soporte', 'recibo', 'aporte', 'mensual', 'padrino', 'factura', 'donacion'],
  },

  // ---------- DONACIONES ----------
  {
    id: 'donar-como',
    tema: 'donaciones',
    preguntas: [
      '¿Cómo puedo donar?',
      'quiero donar al refugio, cómo lo hago',
      'donar plata al albergue',
      'formas de donar',
    ],
    respuesta:
      'Puedes donar comida, insumos o dinero. Para aportes en dinero, escribe por el chat oficial de WhatsApp: allí te compartimos los datos de pago, que nunca publicamos en otro lugar.',
    palabrasClave: ['donar', 'donacion', 'comida', 'insumos', 'dinero', 'whatsapp', 'formas', 'aporte'],
  },
  {
    id: 'donar-bulto-perro',
    tema: 'donaciones',
    preguntas: [
      '¿Cuánto pesa un bulto de comida para perro?',
      'donar concentrado para perros',
      'bulto de perro cuantos kilos',
      'quiero regalar comida de perro',
    ],
    respuesta:
      'Un bulto de concentrado para perro pesa 25 kilos. Si quieres donar, avisa por el chat oficial para coordinar la entrega y confirmar qué tamaño de croqueta necesitamos.',
    palabrasClave: ['bulto', 'perro', 'concentrado', 'kilos', 'donar', 'comida', 'croqueta', 'entrega'],
  },
  {
    id: 'donar-bulto-gato',
    tema: 'donaciones',
    preguntas: [
      '¿Cuánto pesa un bulto de comida para gato?',
      'donar concentrado para gatos',
      'bulto de gato cuantos kilos',
      'quiero llevar comida para gatitos',
    ],
    respuesta:
      'Un bulto de concentrado para gato pesa 10 kilos. Es ideal si quieres donar para nuestros gatos, que consumen menos pero igual necesitan comida de calidad todos los días.',
    palabrasClave: ['bulto', 'gato', 'concentrado', 'kilos', 'donar', 'comida', 'gatitos', 'calidad'],
  },
  {
    id: 'donar-corporativa',
    tema: 'donaciones',
    preguntas: [
      '¿Las empresas pueden donar?',
      'donación corporativa para el refugio',
      'mi empresa quiere ayudar a los animales',
      'patrocinio de una empresa',
    ],
    respuesta:
      'Sí, las empresas pueden donar comida, insumos o aportes mensuales. Escríbenos por el chat oficial con el nombre de la empresa y te enviamos una propuesta con las necesidades del mes.',
    palabrasClave: ['empresa', 'corporativa', 'patrocinio', 'donar', 'insumos', 'propuesta', 'necesidades', 'mensual'],
  },
  {
    id: 'donar-cumpleanos',
    tema: 'donaciones',
    preguntas: [
      '¿Qué es el cumpleaños solidario?',
      'quiero celebrar mi cumple con los perritos',
      'donar en mi cumpleaños',
      'cumpleaños solidario que es',
    ],
    respuesta:
      'En tu cumpleaños solidario, tus invitados pueden llevar comida o un aporte en lugar de regalos. Te ayudamos a organizar la donación y compartimos una foto de la entrega con todo el grupo.',
    palabrasClave: ['cumpleanos', 'solidario', 'invitados', 'regalos', 'donar', 'celebrar', 'fiesta', 'entrega'],
  },
  {
    id: 'donar-insumos',
    tema: 'donaciones',
    preguntas: [
      '¿Qué insumos necesita el refugio?',
      'que puedo llevar al albergue',
      'donar cobijas y toallas',
      'necesidades del refugio',
    ],
    respuesta:
      'Siempre necesitamos cobijas, toallas viejas limpias, tapetes, bolsas, jabón, cloro y guantes. Las cobijas en buen estado son de las cosas que más usamos cada semana.',
    palabrasClave: ['insumos', 'cobijas', 'toallas', 'tapetes', 'jabon', 'guantes', 'necesidades', 'limpieza'],
  },
  {
    id: 'donar-medicinas',
    tema: 'donaciones',
    preguntas: [
      '¿Puedo donar medicinas?',
      'llevo pastillas para los perritos',
      'donar medicamentos para animales',
      'medicina vencida puedo llevar?',
    ],
    respuesta:
      'No recibimos medicinas vencidas ni abiertas. Si quieres donar medicamentos para animales, primero consulta con el equipo por el chat oficial, para confirmar la referencia y la fecha de vencimiento.',
    palabrasClave: ['medicinas', 'medicamentos', 'donar', 'vencidas', 'veterinario', 'confirmar', 'fecha', 'referencia'],
  },
  {
    id: 'donar-juguetes',
    tema: 'donaciones',
    preguntas: [
      '¿Puedo donar juguetes?',
      'llevo pelotas y juguetes para los perros',
      'qué juguetes aceptan',
      'donar pelotas de caucho',
    ],
    respuesta:
      'Sí, los juguetes de caucho resistentes son muy bien recibidos. Por seguridad, no aceptamos juguetes con piezas pequeñas o rotas, y te pedimos lavarlos antes de llevarlos.',
    palabrasClave: ['juguetes', 'pelotas', 'caucho', 'donar', 'seguridad', 'lavar', 'resistentes', 'piezas'],
  },
  {
    id: 'donar-recibo',
    tema: 'donaciones',
    preguntas: [
      '¿Puedo saber en qué se usó mi donación?',
      'dónde queda lo que doné',
      'rendición de cuentas de donaciones',
      'a dónde van las donaciones',
    ],
    respuesta:
      'Publicamos cada mes un resumen de las donaciones recibidas y en qué se usaron: comida, medicinas y consultas. Si quieres el detalle de tu aporte, pídelo por el chat oficial.',
    palabrasClave: ['donaciones', 'cuentas', 'resumen', 'mensual', 'transparencia', 'usos', 'detalle', 'aporte'],
  },
  {
    id: 'donar-dinero-seguro',
    tema: 'donaciones',
    preguntas: [
      '¿Dónde consigno una donación de dinero?',
      'quiero consignar al refugio',
      'transferir plata para los animales',
      'cuenta del refugio para donar',
    ],
    respuesta:
      'Los datos para transferir o consignar solo se comparten por el chat oficial de WhatsApp. Si alguien te pide pagar por otro canal, no lo hagas y avísanos de inmediato.',
    palabrasClave: ['transferir', 'consignar', 'pagos', 'chat', 'oficial', 'estafa', 'cuenta', 'dinero'],
  },

  // ---------- VISITAS ----------
  {
    id: 'visitas-cuando',
    tema: 'visitas',
    preguntas: [
      '¿Cuándo puedo visitar el refugio?',
      'a qué hora son las visitas',
      'visitas los sábados',
      'quiero ir a conocer los perritos',
    ],
    respuesta:
      'Las visitas son los sábados a las 10:00 a. m. Te pedimos llegar unos minutos antes para registrarte y después recorrer el patio con el equipo.',
    palabrasClave: ['visitas', 'sabado', 'hora', 'registrarse', 'recorrido', 'patio', 'conocer', 'perritos'],
  },
  {
    id: 'visitas-horario',
    tema: 'visitas',
    preguntas: [
      '¿Cuál es el horario del refugio?',
      'a qué hora abren',
      'horario de atención',
      'hasta qué hora atienden',
    ],
    respuesta:
      'Atendemos de lunes a sábado, de 9:00 a. m. a 4:00 p. m. Las visitas con recorrido son los sábados a las 10:00 a. m., y para otras consultas escribe por el chat oficial.',
    palabrasClave: ['horario', 'atencion', 'lunes', 'sabado', 'abren', 'recorrido', 'consultas', 'chat'],
  },
  {
    id: 'visitas-llevar',
    tema: 'visitas',
    preguntas: [
      '¿Qué debo llevar a la visita?',
      'qué llevo cuando voy al refugio',
      'necesito algo para la visita',
      'ir al albergue con qué',
    ],
    respuesta:
      'Lleva tu documento de identidad y ropa cómoda. Si el equipo lo permite, puedes traer un premio para los perros, pero no lleves chocolate, cebolla ni huesos.',
    palabrasClave: ['llevar', 'documento', 'ropa', 'premio', 'chocolate', 'visita', 'identidad', 'comodo'],
  },
  {
    id: 'visitas-ninos',
    tema: 'visitas',
    preguntas: [
      '¿Pueden ir niños a la visita?',
      'puedo llevar a mi hijo al refugio',
      'los menores entran al refugio?',
      'llevar niños a conocer perros',
    ],
    respuesta:
      'Los niños pueden visitar el refugio siempre acompañados por un adulto responsable, que firma el ingreso y los supervisa en todo momento.',
    palabrasClave: ['ninos', 'menores', 'adulto', 'responsable', 'visita', 'supervisar', 'acompanado', 'ingreso'],
  },
  {
    id: 'visitas-costo',
    tema: 'visitas',
    preguntas: [
      '¿La visita tiene costo?',
      'pagar para entrar a ver los animales',
      'cuánto cuesta la visita',
      'es gratis visitar',
    ],
    respuesta:
      'La visita es gratuita. Solo te pedimos respetar las instrucciones del equipo y no dar comida a los animales sin preguntar, para cuidar su salud.',
    palabrasClave: ['visita', 'gratuita', 'costo', 'instrucciones', 'comida', 'respetar', 'gratis', 'salud'],
  },
  {
    id: 'visitas-duracion',
    tema: 'visitas',
    preguntas: [
      '¿Cuánto dura la visita?',
      'cuánto tiempo se puede estar con los perros',
      'duración de la visita al refugio',
      'puedo quedarme toda la tarde?',
    ],
    respuesta:
      'La visita dura alrededor de una hora. Así todos los animales tienen su momento de atención y el equipo puede seguir con los cuidados del día.',
    palabrasClave: ['visita', 'duracion', 'hora', 'tiempo', 'atencion', 'cuidados', 'equipo', 'tarde'],
  },
  {
    id: 'visitas-sin-cita',
    tema: 'visitas',
    preguntas: [
      '¿Necesito cita para visitar?',
      'puedo llegar sin avisar',
      'visita sin cita',
      'tengo que reservar para ir',
    ],
    respuesta:
      'Te recomendamos avisar por el chat oficial para reservar tu cupo, sobre todo los fines de semana. Si llegas sin aviso, te atenderemos si hay cupo disponible.',
    palabrasClave: ['cita', 'reservar', 'cupo', 'aviso', 'visita', 'fines', 'chat', 'disponible'],
  },
  {
    id: 'visitas-mascota',
    tema: 'visitas',
    preguntas: [
      '¿Puedo llevar mi perro a la visita?',
      'llevo mi mascota al refugio',
      'puedo ir con mi perrito a conocer',
      'llevar mi gato a visitar',
    ],
    respuesta:
      'Mejor no lleves tu mascota sin avisar: algunos animales se estresan con perros extraños. Si quieres presentar a tu mascota, consulta primero por el chat oficial para acordar un momento seguro.',
    palabrasClave: ['mascota', 'perro', 'estres', 'presentar', 'avisar', 'seguro', 'visita', 'chat'],
  },
  {
    id: 'visitas-fotos',
    tema: 'visitas',
    preguntas: [
      '¿Puedo tomar fotos en la visita?',
      'grabar videos de los perritos',
      'se pueden tomar fotos?',
      'publicar fotos del refugio',
    ],
    respuesta:
      'Sí puedes tomar fotos y videos, pero sin flash y sin mostrar los datos de las personas que trabajan allí. Si quieres publicar una foto de un animal, pide antes permiso al equipo.',
    palabrasClave: ['fotos', 'videos', 'flash', 'permiso', 'publicar', 'privacidad', 'equipo', 'visita'],
  },
  {
    id: 'visitas-entre-semana',
    tema: 'visitas',
    preguntas: [
      '¿Qué pasa si no puedo ir el sábado?',
      'entre semana puedo visitar?',
      'visitar en un día diferente',
      'puedo ir un martes',
    ],
    respuesta:
      'Entre semana el refugio atiende de lunes a sábado, de 9:00 a. m. a 4:00 p. m., pero el recorrido de visitas es los sábados. Si no puedes ir ese día, escribe por el chat oficial y buscamos otro momento.',
    palabrasClave: ['semana', 'sabado', 'martes', 'recorrido', 'alternativa', 'chat', 'momento', 'visitas'],
  },

  // ---------- SALUD ----------
  {
    id: 'salud-vacunas',
    tema: 'salud',
    preguntas: [
      '¿Qué vacunas necesita mi perro?',
      'calendario de vacunas para perros',
      'cuándo vacunar al cachorro',
      'vacunas para perritos',
    ],
    respuesta:
      'Los perros empiezan con la vacuna múltiple desde las 6 semanas, con refuerzos cada cuatro semanas hasta el mes 4, y luego cada año. La antirrábica se aplica después de los 3 meses. El veterinario confirma el calendario exacto.',
    palabrasClave: ['vacunas', 'perros', 'calendario', 'cachorro', 'refuerzo', 'antirrabica', 'veterinario', 'multiple'],
  },
  {
    id: 'salud-vacunas-gato',
    tema: 'salud',
    preguntas: [
      '¿Qué vacunas necesitan los gatos?',
      'calendario de vacunas para gatos',
      'gatitos cuándo se vacunan',
      'vacuna triple felina',
    ],
    respuesta:
      'Los gatos reciben la vacuna triple felina desde las 8 semanas, con refuerzos cada tres o cuatro semanas, y la antirrábica después de los tres meses. Los detalles exactos los confirma el veterinario del refugio.',
    palabrasClave: ['vacunas', 'gatos', 'triple', 'felina', 'gatitos', 'refuerzo', 'antirrabica', 'calendario'],
  },
  {
    id: 'salud-desparasitacion',
    tema: 'salud',
    preguntas: [
      '¿Cada cuánto desparasitar?',
      'desparasitante para perros cada cuánto',
      'cuándo desparasitar gatitos',
      'desparasitación',
    ],
    respuesta:
      'Desparasitamos a los animales al ingreso y después cada tres meses, o según indique el veterinario. Si adoptas, sigue el calendario que te entregamos para que tu mascota esté protegida.',
    palabrasClave: ['desparasitar', 'desparasitante', 'pastilla', 'calendario', 'veterinario', 'proteger', 'ingreso', 'tres'],
  },
  {
    id: 'salud-microchip',
    tema: 'salud',
    preguntas: [
      '¿Qué es el microchip?',
      'los perros llevan chip de identificación',
      'microchip para mascotas',
      'le ponen chip a los animales?',
    ],
    respuesta:
      'El microchip es un chip del tamaño de un grano de arroz que se pone bajo la piel y guarda el número de identificación del animal. La mayoría de nuestros animales ya lo tiene; si no, se lo colocamos antes de la entrega.',
    palabrasClave: ['microchip', 'identificacion', 'chip', 'piel', 'animales', 'entrega', 'registro', 'mascota'],
  },
  {
    id: 'salud-esterilizacion',
    tema: 'salud',
    preguntas: [
      '¿A qué edad se esterilizan?',
      'cuándo castrar un perro',
      'esterilizar una gata cuándo',
      'esterilización edad mínima',
    ],
    respuesta:
      'La esterilización se recomienda entre los 6 y 8 meses, o según el criterio del veterinario. Es parte del compromiso de adopción, y así evitamos camadas no deseadas y problemas de salud.',
    palabrasClave: ['esterilizacion', 'castrar', 'edad', 'meses', 'veterinario', 'compromiso', 'camadas', 'salud'],
  },
  {
    id: 'salud-clinicas',
    tema: 'salud',
    preguntas: [
      '¿A qué veterinaria llevan los animales?',
      'clínica veterinaria del refugio',
      'dónde atienden a los perritos',
      'veterinarios aliados',
    ],
    respuesta:
      'Trabajamos con la Clínica Veterinaria San Roque y la Clínica Veterinaria 24 Horas. Los controles de rutina se hacen en San Roque, y las consultas urgentes fuera de horario en 24 Horas.',
    palabrasClave: ['veterinaria', 'clinica', 'roque', 'horas', 'controles', 'urgentes', 'aliados', 'rutina'],
  },
  {
    id: 'salud-emergencia',
    tema: 'salud',
    preguntas: [
      '¿El refugio atiende emergencias las 24 horas?',
      'mi perro se intoxicó, a qué hora llamo',
      'emergencia de noche con un animal',
      'urgencia veterinaria fuera de horario',
    ],
    respuesta:
      'El refugio no atiende rescates ni emergencias las 24 horas. Si tu animal tiene una urgencia, llévalo a la Clínica Veterinaria 24 Horas y avísanos después por el chat oficial.',
    palabrasClave: ['emergencia', 'urgencia', 'horas', 'clinica', 'fuera', 'horario', 'llevar', 'avisar'],
  },
  {
    id: 'salud-cuarentena',
    tema: 'salud',
    preguntas: [
      '¿Por qué un animal está en cuarentena?',
      'qué significa que esté en cuarentena',
      'cuánto dura la cuarentena de un perro',
      '¿puedo conocer un animal en cuarentena?',
    ],
    respuesta:
      'La cuarentena es un periodo de observación antes de juntar al animal con otros. Mientras tanto no tiene contacto con otros animales y el equipo revisa su salud, su vacunación y su comportamiento.',
    palabrasClave: ['cuarentena', 'observacion', 'salud', 'vacunacion', 'comportamiento', 'contacto', 'equipo', 'revisar'],
  },
  {
    id: 'salud-tratamiento',
    tema: 'salud',
    preguntas: [
      '¿Qué pasa con un animal que toma medicina?',
      'mi perrito necesita pastillas todos los días',
      'dosis de medicina para el animal',
      'no saltarse la medicina',
    ],
    respuesta:
      'Los animales con tratamiento tienen un horario anotado y el equipo registra cada dosis. Si adoptas uno, recibirás la lista de medicinas y horarios, y no debes saltarte ninguna dosis sin hablar antes con el veterinario.',
    palabrasClave: ['tratamiento', 'medicina', 'dosis', 'horario', 'registro', 'veterinario', 'pastillas', 'saltar'],
  },
  {
    id: 'salud-seguimiento',
    tema: 'salud',
    preguntas: [
      '¿Qué es el control de seguimiento?',
      'mi animal necesita revisión de seguimiento',
      'qué significa seguimiento veterinario',
      'controles de seguimiento para perritos',
    ],
    respuesta:
      'El control de seguimiento es una revisión periódica para ver cómo avanza la recuperación del animal. Puede incluir exámenes y visitas a la clínica, y el equipo te avisa con anticipación cuando toca.',
    palabrasClave: ['seguimiento', 'control', 'revision', 'recuperacion', 'examenes', 'clinica', 'anticipacion', 'periodica'],
  },

  // ---------- COMIDA ----------
  {
    id: 'comida-horarios',
    tema: 'comida',
    preguntas: [
      '¿Cuántas veces al día comen los perros?',
      'horario de comida de los perritos',
      'a qué hora le doy de comer al perro',
      'cuántas comidas al día',
    ],
    respuesta:
      'Los perros adultos comen dos veces al día, a la misma hora, y los cachorros tres o cuatro veces. Mantener horarios fijos ayuda a su digestión y facilita ver si el animal está comiendo bien.',
    palabrasClave: ['comidas', 'perros', 'horario', 'cachorros', 'digestion', 'adultos', 'comer', 'dia'],
  },
  {
    id: 'comida-gatos',
    tema: 'comida',
    preguntas: [
      '¿Cuántas veces comen los gatos?',
      'los gatitos a qué hora comen',
      'horario de comida para gatos',
      'cuánto come un gato al día',
    ],
    respuesta:
      'Los gatos adultos prefieren varias porciones pequeñas al día, y el refugio les sirve en dos o tres momentos. Siempre debe haber agua fresca disponible para ellos en un lugar tranquilo.',
    palabrasClave: ['gatos', 'porciones', 'pequenas', 'horario', 'agua', 'tranquilo', 'comer', 'dia'],
  },
  {
    id: 'comida-cambio',
    tema: 'comida',
    preguntas: [
      '¿Cómo cambio la comida de mi perro?',
      'quiero cambiar de concentrado',
      'cambiar la comida de forma gradual',
      'pasar a otra marca de comida',
    ],
    respuesta:
      'Cambia la comida poco a poco durante siete días: empieza con una cuarta parte de la nueva mezclada con la anterior y aumenta cada día. Así evitas malestar en el estómago.',
    palabrasClave: ['cambio', 'comida', 'gradual', 'mezclar', 'concentrado', 'estomago', 'dias', 'marca'],
  },
  {
    id: 'comida-cachorros',
    tema: 'comida',
    preguntas: [
      '¿Qué come un cachorro?',
      'comida para perritos bebés',
      'concentrado para cachorros',
      'qué le doy de comer a un gatito pequeño',
    ],
    respuesta:
      'Los cachorros necesitan concentrado especial para crecimiento, en porciones pequeñas y varias veces al día. Si tienen un cambio de comida o no comen bien, avisa al equipo para revisarlos.',
    palabrasClave: ['cachorros', 'crecimiento', 'concentrado', 'porciones', 'cachorro', 'gatito', 'equipo', 'comer'],
  },
  {
    id: 'comida-viejitos',
    tema: 'comida',
    preguntas: [
      '¿Qué come un perro viejito?',
      'comida para abuelos de cuatro patas',
      'concentrado para perros mayores',
      'qué come un animal de edad',
    ],
    respuesta:
      'Los animales mayores necesitan comida blanda o un concentrado para su edad, en porciones pequeñas y con buena hidratación. Pídele al veterinario que revise su peso cada mes.',
    palabrasClave: ['viejito', 'mayores', 'blanda', 'concentrado', 'peso', 'hidratacion', 'edad', 'veterinario'],
  },
  {
    id: 'comida-agua',
    tema: 'comida',
    preguntas: [
      '¿Cuánta agua debe tomar mi perro?',
      'el gato no toma agua',
      'agua fresca para mascotas',
      'cuánta agua necesita un animal',
    ],
    respuesta:
      'Un animal debe tener agua fresca y limpia todo el día, en un recipiente estable que no se vuelque. Si ves que toma muy poca o demasiada, avisa al veterinario por el chat oficial.',
    palabrasClave: ['agua', 'fresca', 'limpia', 'recipiente', 'veterinario', 'hidratacion', 'todo', 'dia'],
  },
  {
    id: 'comida-prohibida',
    tema: 'comida',
    preguntas: [
      '¿Qué comida no le puedo dar a mi perro?',
      '¿puedo darle chocolate al perro?',
      'alimentos prohibidos para mascotas',
      'qué no debo darle a un gato',
    ],
    respuesta:
      'No les des chocolate, cebolla, ajo, uvas, pasas ni huesos cocidos. Tampoco comida con mucha sal o grasa. Si tienes dudas, consulta antes con el equipo del refugio.',
    palabrasClave: ['prohibida', 'chocolate', 'cebolla', 'huesos', 'alimentos', 'sal', 'grasa', 'dudas'],
  },
  {
    id: 'comida-porcion',
    tema: 'comida',
    preguntas: [
      '¿Cuánto le debo dar de comer a mi perro?',
      'porción de concentrado para el perro',
      'cuánta comida por día',
      'medidas de comida para perros',
    ],
    respuesta:
      'La porción depende del peso, la edad y la actividad. El equipo te entrega una guía según el animal que adoptas, y la ajustamos con el veterinario si sube o baja de peso.',
    palabrasClave: ['porcion', 'peso', 'edad', 'actividad', 'guia', 'ajustar', 'veterinario', 'concentrado'],
  },
  {
    id: 'comida-consumo',
    tema: 'comida',
    preguntas: [
      '¿Cuánta comida consume el refugio al mes?',
      'cuántos bultos gastan al mes',
      'consumo de concentrado del refugio',
      'cuánto se gasta en comida',
    ],
    respuesta:
      'Entre perros y gatos, el refugio consume varios bultos de concentrado cada semana. Por eso agradecemos las donaciones de comida y avisamos en el chat cuando el inventario está bajo.',
    palabrasClave: ['consumo', 'bultos', 'concentrado', 'donaciones', 'inventario', 'semana', 'comida', 'gasto'],
  },
  {
    id: 'comida-casera',
    tema: 'comida',
    preguntas: [
      '¿Puede un perro comer comida casera?',
      'hacerle comida en casa al perro',
      'receta casera para perros',
      'comida natural para mascotas',
    ],
    respuesta:
      'La comida casera es posible, pero debe estar balanceada y revisada por un veterinario. Sin esa guía puede faltar algún nutriente, así que lo mejor es seguir el concentrado que te indicamos.',
    palabrasClave: ['casera', 'balanceada', 'veterinario', 'nutriente', 'concentrado', 'natural', 'receta', 'comida'],
  },

  // ---------- VOLUNTARIADO ----------
  {
    id: 'vol-como',
    tema: 'voluntariado',
    preguntas: [
      '¿Cómo me hago voluntario?',
      'quiero ser voluntario en el refugio',
      'inscribirme como voluntario',
      'quiero ayudar en el albergue',
    ],
    respuesta:
      'Escribe por el chat oficial de WhatsApp indicando tu nombre, tu edad y tu disponibilidad. Te enviamos el formulario, y después agendamos una jornada de inducción.',
    palabrasClave: ['voluntario', 'inscribirme', 'formulario', 'disponibilidad', 'induccion', 'whatsapp', 'ayudar', 'refugio'],
  },
  {
    id: 'vol-edad',
    tema: 'voluntariado',
    preguntas: [
      '¿Desde qué edad puedo ser voluntario?',
      'los menores de edad pueden ser voluntarios',
      'edad mínima para voluntariado',
      'mi hijo de 15 años puede ayudar?',
    ],
    respuesta:
      'Para ser voluntario debes tener mínimo 18 años. Los menores pueden acompañar visitas con un adulto, pero no hacen labores de cuidado ni manejo de animales.',
    palabrasClave: ['voluntario', 'edad', 'menores', 'dieciocho', 'adulto', 'acompanar', 'cuidado', 'manejo'],
  },
  {
    id: 'vol-horas',
    tema: 'voluntariado',
    preguntas: [
      '¿Cuántas horas debo dar como voluntario?',
      'cuánto tiempo al mes tengo que ayudar',
      'horario de voluntarios',
      'puedo ir solo un sábado al mes',
    ],
    respuesta:
      'Te pedimos mínimo cuatro horas al mes, en turnos de dos o tres horas. Puedes escoger los días que mejor te quedan y cambiarlos avisando con anticipación.',
    palabrasClave: ['horas', 'turnos', 'mes', 'voluntarios', 'horario', 'anticipacion', 'dias', 'escoger'],
  },
  {
    id: 'vol-tareas',
    tema: 'voluntariado',
    preguntas: [
      '¿Qué hacen los voluntarios?',
      'en qué ayudan los voluntarios',
      'tareas del voluntariado',
      'qué puedo hacer en el refugio',
    ],
    respuesta:
      'Los voluntarios ayudan con paseos, baños, limpieza de espacios, juego con los animales, fotos para adopción y apoyo en jornadas de donación. Te asignamos según tu gusto y lo que el equipo necesite.',
    palabrasClave: ['voluntarios', 'paseos', 'banos', 'limpieza', 'fotos', 'adopcion', 'donacion', 'tareas'],
  },
  {
    id: 'vol-induccion',
    tema: 'voluntariado',
    preguntas: [
      '¿Qué es la inducción de voluntarios?',
      'capacitación para voluntarios',
      'qué aprendo antes de empezar',
      'primer día como voluntario',
    ],
    respuesta:
      'La inducción es una jornada corta donde aprendes las normas, la seguridad con cada animal y el manejo de la comida. Nadie empieza a cuidar animales sin haber pasado por ella.',
    palabrasClave: ['induccion', 'capacitacion', 'normas', 'seguridad', 'manejo', 'comida', 'jornada', 'voluntarios'],
  },
  {
    id: 'vol-veterinarios',
    tema: 'voluntariado',
    preguntas: [
      'Soy veterinario, ¿puedo ayudar?',
      'quiero colaborar como médico veterinario',
      'estudiante de veterinaria puede voluntariar',
      'apoyo médico voluntario',
    ],
    respuesta:
      'Sí, son bienvenidos los profesionales y estudiantes de veterinaria. Coordinamos con las clínicas aliadas las jornadas de revisión y te explicamos los protocolos del refugio antes de intervenir.',
    palabrasClave: ['veterinarios', 'estudiantes', 'profesionales', 'jornadas', 'revision', 'protocolos', 'clinicas', 'colaborar'],
  },
  {
    id: 'vol-redes',
    tema: 'voluntariado',
    preguntas: [
      '¿Puedo ayudar desde casa?',
      'voluntariado virtual o en redes',
      'ayudar con las redes sociales del refugio',
      'apoyar sin ir al refugio',
    ],
    respuesta:
      'Sí, puedes ayudar desde casa creando contenido, diseñando piezas para adopción o respondiendo mensajes en el chat oficial. Te damos pautas para no compartir datos privados de los animales ni de las personas.',
    palabrasClave: ['casa', 'virtual', 'redes', 'contenido', 'disenar', 'mensajes', 'privacidad', 'apoyar'],
  },
  {
    id: 'vol-paseos',
    tema: 'voluntariado',
    preguntas: [
      '¿Cómo funcionan los paseos de voluntarios?',
      'sacar a pasear a los perros',
      'paseador voluntario',
      'quiero pasear perritos los sábados',
    ],
    respuesta:
      'Los paseos se hacen con correa, con el animal asignado por el equipo y siguiendo la ruta indicada. Si un perro tiene restricciones, lo verás marcado en su ficha antes de salir.',
    palabrasClave: ['paseos', 'correa', 'asignado', 'ruta', 'restricciones', 'ficha', 'perros', 'voluntario'],
  },
  {
    id: 'vol-cuidados',
    tema: 'voluntariado',
    preguntas: [
      '¿Puedo ayudar con los baños?',
      'bañar a los perros como voluntario',
      'ayudar a limpiar los espacios',
      'tareas de aseo en el refugio',
    ],
    respuesta:
      'Sí, los voluntarios con inducción pueden apoyar baños y aseo de espacios. Los baños medicados solo los hace el equipo, según la indicación del tratamiento de cada animal.',
    palabrasClave: ['banos', 'aseo', 'limpiar', 'medicados', 'induccion', 'equipo', 'tratamiento', 'espacios'],
  },
  {
    id: 'vol-retirarse',
    tema: 'voluntariado',
    preguntas: [
      '¿Qué pasa si ya no puedo seguir voluntariando?',
      'dejar el voluntariado',
      'cómo me retiro del refugio como voluntario',
      'puedo renunciar al voluntariado',
    ],
    respuesta:
      'Puedes retirarte cuando quieras; solo avisa por el chat oficial. Te agradecemos el tiempo dedicado y, si más adelante quieres volver, siempre serás bienvenido.',
    palabrasClave: ['retirarse', 'voluntariado', 'avisar', 'agradecer', 'tiempo', 'volver', 'bienvenido', 'chat'],
  },

  // ---------- REFUGIO ----------
  {
    id: 'ref-que',
    tema: 'refugio',
    preguntas: [
      '¿Qué es Refugio Yesenia?',
      'cuéntame sobre el refugio',
      'a qué se dedica el refugio',
      'historia del refugio',
    ],
    respuesta:
      'Refugio Yesenia cuida perros y gatos rescatados de la calle, los recupera y busca para cada uno una familia responsable. Trabajamos con un equipo de cuidadores, veterinarios aliados y voluntarios.',
    palabrasClave: ['refugio', 'yesenia', 'rescatados', 'calle', 'familia', 'cuidadores', 'veterinarios', 'voluntarios'],
  },
  {
    id: 'ref-cuantos',
    tema: 'refugio',
    preguntas: [
      '¿Cuántos animales hay en el refugio?',
      'cuántos perros y gatos tienen',
      'cuántos animales cuidan',
      'cuántos perritos hay ahora',
    ],
    respuesta:
      'Hoy cuidamos cerca de 70 animales: 45 perros y 25 gatos. Esa cifra cambia casi cada semana con las adopciones y los nuevos rescates.',
    palabrasClave: ['animales', 'perros', 'gatos', 'cuidan', 'cifra', 'rescates', 'adopciones', 'hoy'],
  },
  {
    id: 'ref-equipo',
    tema: 'refugio',
    preguntas: [
      '¿Quiénes trabajan en el refugio?',
      'cuidadores del refugio',
      '¿quién cuida a los animales?',
      'equipo del refugio',
    ],
    respuesta:
      'El equipo está formado por cuidadores que bañan, alimentan y acompañan a los animales todos los días, además de administradoras y voluntarios. Cada cuidador conoce la historia y las necesidades de los suyos.',
    palabrasClave: ['equipo', 'cuidadores', 'administradoras', 'voluntarios', 'alimentan', 'historia', 'necesidades', 'animales'],
  },
  {
    id: 'ref-no-hace',
    tema: 'refugio',
    preguntas: [
      '¿Qué no hace el refugio?',
      '¿hacen crías de perros?',
      '¿venden animales?',
      '¿rescatan las 24 horas?',
    ],
    respuesta:
      'Refugio Yesenia no cría animales, no los vende y no hace rescates de emergencia las 24 horas. Tampoco entregamos animales por regalo o por encargo: todo se hace por el proceso de adopción.',
    palabrasClave: ['cria', 'venta', 'rescates', 'emergencia', 'adopcion', 'regalo', 'encargo', 'proceso'],
  },
  {
    id: 'ref-horario',
    tema: 'refugio',
    preguntas: [
      '¿Qué días atiende el refugio?',
      'horario del refugio entre semana',
      '¿abren los domingos?',
      '¿cuándo puedo llamar al refugio?',
    ],
    respuesta:
      'Atendemos de lunes a sábado, de 9:00 a. m. a 4:00 p. m. Los domingos y festivos no hay atención al público, aunque el equipo responde mensajes en el chat oficial cuando puede.',
    palabrasClave: ['dias', 'atiende', 'horario', 'domingos', 'festivos', 'atencion', 'mensajes', 'chat'],
  },
  {
    id: 'ref-mision',
    tema: 'refugio',
    preguntas: [
      '¿Cuál es la misión del refugio?',
      '¿por qué existe el refugio?',
      'objetivo del refugio',
      'qué quiere lograr el refugio',
    ],
    respuesta:
      'Nuestra misión es darle a cada animal una segunda oportunidad: salud, cuidado y un hogar responsable. Creemos que ninguna mascota debe vivir en la calle por falta de una familia.',
    palabrasClave: ['mision', 'segunda', 'oportunidad', 'salud', 'hogar', 'responsable', 'calle', 'familia'],
  },
  {
    id: 'ref-contacto',
    tema: 'refugio',
    preguntas: [
      '¿Cómo contacto al refugio?',
      '¿cuál es el número del refugio?',
      '¿cómo les escribo?',
      '¿cuál es el canal oficial del refugio?',
    ],
    respuesta:
      'El canal oficial es el chat de WhatsApp del refugio. Desconfía de cuentas que se hagan pasar por nosotros o te pidan pagos por otro medio, y pide siempre confirmación por el chat oficial.',
    palabrasClave: ['contacto', 'oficial', 'whatsapp', 'desconfia', 'cuentas', 'pagos', 'confirmacion', 'chat'],
  },
  {
    id: 'ref-informes',
    tema: 'refugio',
    preguntas: [
      '¿El refugio publica informes?',
      'rendición de cuentas del refugio',
      '¿cómo sé que el dinero se usa bien?',
      'transparencia del refugio',
    ],
    respuesta:
      'Sí, cada mes compartimos un resumen de animales atendidos, adopciones, donaciones recibidas y en qué se usaron. Los padrinos lo reciben en el diario del padrino.',
    palabrasClave: ['informes', 'rendicion', 'transparencia', 'resumen', 'adopciones', 'donaciones', 'padrinos', 'mensual'],
  },
  {
    id: 'ref-adopciones',
    tema: 'refugio',
    preguntas: [
      '¿Cuántas adopciones han tenido?',
      '¿cuántos animales han adoptado?',
      'historias de adopción',
      '¿cuántas vidas han cambiado?',
    ],
    respuesta:
      'Hasta hoy llevamos 214 vidas cambiadas gracias a las adopciones. Cada adopción queda registrada y, si lo autorizas, te compartimos la historia de tu animal después de tu visita de seguimiento.',
    palabrasClave: ['adopciones', 'vidas', 'cambiadas', 'historias', 'registro', 'seguimiento', 'autorizar', 'animal'],
  },
  {
    id: 'ref-donde-queda',
    tema: 'refugio',
    preguntas: [
      '¿Dónde queda el refugio?',
      '¿cuál es la dirección del refugio?',
      '¿cómo llego al refugio?',
      '¿en qué barrio están?',
    ],
    respuesta:
      'La dirección exacta la compartimos por el chat oficial de WhatsApp cuando confirmas tu visita. Así evitamos publicar datos de ubicación de los animales en redes públicas.',
    palabrasClave: ['direccion', 'ubicacion', 'chat', 'confirmas', 'visita', 'privacidad', 'publicar', 'redes'],
  },

  // ---------- DEVOLUCIONES ----------
  {
    id: 'dev-que',
    tema: 'devoluciones',
    preguntas: [
      '¿Puedo devolver un animal que adopté?',
      'quiero devolver el perro',
      'ya no puedo quedarme con mi gato',
      'devolver una mascota adoptada',
    ],
    respuesta:
      'Sí, puedes devolverlo en cualquier momento. Avísanos por el chat oficial y coordinamos la entrega; no te juzgaremos y te acompañamos en el proceso.',
    palabrasClave: ['devolver', 'animal', 'entrega', 'coordinar', 'acompanar', 'proceso', 'chat', 'mascota'],
  },
  {
    id: 'dev-sin-juzgar',
    tema: 'devoluciones',
    preguntas: [
      '¿Me van a juzgar si lo devuelvo?',
      'me da pena devolver al animal',
      'miedo a que me regañen por devolver',
      'devolver sin problemas',
    ],
    respuesta:
      'Nadie será juzgado. Sabemos que las cosas cambian: la prioridad es el bienestar del animal, así que recibimos devoluciones sin reproches y con respeto.',
    palabrasClave: ['juzgar', 'devolucion', 'bienestar', 'respeto', 'reproches', 'prioridad', 'cambian', 'animal'],
  },
  {
    id: 'dev-proceso',
    tema: 'devoluciones',
    preguntas: [
      '¿Cómo hago una devolución?',
      'pasos para devolver un perrito',
      'proceso de devolución',
      'entregar el animal de vuelta',
    ],
    respuesta:
      'Escribe por el chat oficial, cuéntanos el motivo y el estado del animal. Coordinamos un día para recibirlo, revisamos su salud y su comportamiento, y registramos la devolución.',
    palabrasClave: ['devolucion', 'pasos', 'motivo', 'estado', 'recibir', 'registrar', 'salud', 'comportamiento'],
  },
  {
    id: 'dev-cuando',
    tema: 'devoluciones',
    preguntas: [
      '¿Hasta cuándo puedo devolver?',
      'cuánto tiempo tengo para devolver',
      'periodo para devolver un animal',
      'devolver después de un mes',
    ],
    respuesta:
      'No hay un plazo cerrado, pero las primeras semanas son clave para adaptarse. Si pasa el tiempo, igual te recibimos: lo importante es avisar pronto para cuidar al animal.',
    palabrasClave: ['plazo', 'devolver', 'semanas', 'adaptarse', 'avisar', 'pronto', 'recibir', 'tiempo'],
  },
  {
    id: 'dev-gastos',
    tema: 'devoluciones',
    preguntas: [
      '¿Me devuelven la plata si devuelvo al animal?',
      '¿hay reembolso por devolver?',
      'pagos al devolver un animal',
      'devolución de dinero',
    ],
    respuesta:
      'La adopción no tiene costo, así que no hay dinero que devolver. Si hiciste un aporte o compraste insumos para el animal, cuéntanos y lo revisamos caso por caso con el equipo.',
    palabrasClave: ['reembolso', 'dinero', 'costo', 'insumos', 'aporte', 'revisar', 'equipo', 'devolucion'],
  },
  {
    id: 'dev-regalar',
    tema: 'devoluciones',
    preguntas: [
      '¿Puedo darle el animal a un amigo?',
      'regalar el perro que adopté',
      'pasar la mascota a otra familia',
      'ceder un animal adoptado',
    ],
    respuesta:
      'No puedes entregar el animal a otra persona sin pasarlo primero por el refugio. Si ya no lo quieres, devuélvelo para que nosotros lo reubiquemos con una familia que cumpla los requisitos.',
    palabrasClave: ['regalar', 'amigo', 'familia', 'reubicar', 'requisitos', 'refugio', 'pasar', 'entregar'],
  },
  {
    id: 'dev-seguimiento',
    tema: 'devoluciones',
    preguntas: [
      '¿Qué pasa después de devolver?',
      '¿el refugio hace seguimiento tras la devolución?',
      'después de devolverlo me llaman?',
      'cuidados del animal devuelto',
    ],
    respuesta:
      'El animal regresa a sus cuidadores, se revisa su salud y se busca una nueva familia. Mientras tanto, el equipo sigue el caso y te informa sobre su estado si lo deseas.',
    palabrasClave: ['devolucion', 'cuidadores', 'revisar', 'nueva', 'familia', 'seguimiento', 'estado', 'informa'],
  },
  {
    id: 'dev-cambio',
    tema: 'devoluciones',
    preguntas: [
      '¿Puedo cambiar de animal?',
      'quiero cambiar mi perro por otro',
      'adoptar otro si no me gusta',
      'cambiar de mascota adoptada',
    ],
    respuesta:
      'Sí, si el primer animal no encaja con tu casa, podemos buscar uno más compatible. Lo hacemos como una devolución y una nueva adopción, con sus propios pasos y acompañamiento.',
    palabrasClave: ['cambiar', 'animal', 'compatible', 'devolucion', 'nueva', 'adopcion', 'pasos', 'acompanamiento'],
  },
  {
    id: 'dev-maltrato',
    tema: 'devoluciones',
    preguntas: [
      '¿Qué hago si el animal que adopté está mal cuidado?',
      'veo que maltratan a un perro adoptado',
      'denunciar maltrato de un animal adoptado',
      'mi vecino tiene un perro que adoptamos',
    ],
    respuesta:
      'Si sospechas maltrato de un animal adoptado, avísanos por el chat oficial de inmediato. Revisamos el caso y, si es necesario, orientamos a las autoridades competentes.',
    palabrasClave: ['maltrato', 'denuncia', 'adoptado', 'inmediato', 'revisar', 'autoridades', 'caso', 'sospechas'],
  },
  {
    id: 'dev-no-abandonar',
    tema: 'devoluciones',
    preguntas: [
      '¿Puedo dejar al perro en la calle si ya no lo quiero?',
      'abandonar al animal adoptado',
      'botar la mascota',
      'no quiero al perro, lo dejo en la calle',
    ],
    respuesta:
      'Nunca dejes un animal en la calle ni lo abandones. Si ya no puedes cuidarlo, devuélvelo al refugio: lo recibimos sin juicio y así evitamos que sufra.',
    palabrasClave: ['abandonar', 'calle', 'devolver', 'recibimos', 'juicio', 'sufra', 'cuidarlo', 'refugio'],
  },

  // ---------- CUIDADOS ----------
  {
    id: 'cui-primera-semana',
    tema: 'cuidados',
    preguntas: [
      '¿Cómo es la primera semana con mi perro?',
      'primeros días con el animal adoptado',
      'qué hago cuando llega el perrito a casa',
      'adaptación primera semana',
    ],
    respuesta:
      'Los primeros días el animal necesita calma: un rincón propio, agua, comida en su horario y paseos cortos. No lo presentes con toda la familia a la vez, y ten paciencia: la confianza llega en semanas.',
    palabrasClave: ['primera', 'semana', 'calma', 'rincon', 'paciencia', 'confianza', 'adaptacion', 'familia'],
  },
  {
    id: 'cui-rutina',
    tema: 'cuidados',
    preguntas: [
      '¿Qué rutina debe tener mi mascota?',
      'horario diario para el perro',
      'cómo organizar el día de mi gato',
      'rutina de cuidados diaria',
    ],
    respuesta:
      'Una rutina diaria incluye comida a la misma hora, paseo o juego, agua fresca y un rato de descanso. Los animales se sienten más seguros cuando saben qué esperar cada día.',
    palabrasClave: ['rutina', 'diaria', 'comida', 'paseo', 'juego', 'descanso', 'seguros', 'horario'],
  },
  {
    id: 'cui-amarrado',
    tema: 'cuidados',
    preguntas: [
      '¿Puedo tener el perro amarrado?',
      'dejar al perro atado en el patio',
      '¿puedo amarrar al perro afuera?',
      'cadena para perro',
    ],
    respuesta:
      'No, el animal no debe quedar amarrado ni con cuerda corta. Tampoco puede ser perro guardián. Necesita un espacio seguro, con compañía y con acceso a su cama y su agua.',
    palabrasClave: ['amarrado', 'cadena', 'guardian', 'espacio', 'seguro', 'compania', 'cama', 'agua'],
  },
  {
    id: 'cui-azotea',
    tema: 'cuidados',
    preguntas: [
      '¿Puedo dejar al perro en la azotea?',
      'el gato puede estar en el balcón',
      'dejar mascota en terraza o techo',
      'ventana sin malla para gato',
    ],
    respuesta:
      'No dejes a tu animal en azoteas, terrazas sin malla ni balcones sin protección. Las caídas son una de las causas más frecuentes de accidentes; pon mallas de seguridad en ventanas y balcones.',
    palabrasClave: ['azotea', 'terraza', 'balcon', 'malla', 'caidas', 'seguridad', 'ventanas', 'accidentes'],
  },
  {
    id: 'cui-paseo',
    tema: 'cuidados',
    preguntas: [
      '¿Cuánto debo pasear a mi perro?',
      '¿cuántos paseos al día necesita?',
      'sacar al perro a caminar',
      'ejercicio para perros',
    ],
    respuesta:
      'La mayoría de perros necesitan al menos dos paseos diarios de 20 a 40 minutos, según la edad y el tamaño. Los cachorros y los viejitos tienen ritmos distintos, y el equipo te orienta según cada uno.',
    palabrasClave: ['paseo', 'paseos', 'ejercicio', 'minutos', 'edad', 'tamano', 'cachorros', 'caminar'],
  },
  {
    id: 'cui-banio',
    tema: 'cuidados',
    preguntas: [
      '¿Cada cuánto baño a mi perro?',
      '¿cuántas veces bañar al perro?',
      'baño para mascotas',
      'cuidado del pelo del gato',
    ],
    respuesta:
      'Un baño cada cuatro a seis semanas suele bastar, salvo que el veterinario indique un champú medicado. Cepilla el pelo con frecuencia para evitar nudos y revisar la piel.',
    palabrasClave: ['bano', 'semanas', 'champu', 'cepillar', 'nudos', 'piel', 'frecuencia', 'pelo'],
  },
  {
    id: 'cui-caja-arena',
    tema: 'cuidados',
    preguntas: [
      '¿Cómo cuido la caja de arena del gato?',
      '¿cada cuánto limpiar el arenero?',
      'el gato no usa la arena',
      'higiene del gato',
    ],
    respuesta:
      'Recoge la arena a diario y cambia toda la arena cada semana. Un arenero limpio evita que tu gato busque otros lugares, y conviene tener uno más que el número de gatos que vivan en casa.',
    palabrasClave: ['arenero', 'arena', 'limpiar', 'higiene', 'diario', 'semana', 'gatos', 'lugares'],
  },
  {
    id: 'cui-seguimiento-llamadas',
    tema: 'cuidados',
    preguntas: [
      '¿Cada cuánto me llaman después de adoptar?',
      'seguimiento después de la adopción',
      'llamadas del refugio tras la entrega',
      '¿cuándo hacen seguimiento al adoptante?',
    ],
    respuesta:
      'Te hacemos seguimiento por teléfono a los días 2, 5, 15, 30 y 90 después de la adopción. Son llamadas cortas para saber cómo está el animal y resolver tus dudas.',
    palabrasClave: ['seguimiento', 'llamadas', 'telefono', 'adopcion', 'dudas', 'animal', 'dias', 'adoptante'],
  },
  {
    id: 'cui-ejercicio-gato',
    tema: 'cuidados',
    preguntas: [
      '¿Qué ejercicio necesita un gato?',
      'juegos para gatos en casa',
      'cómo hacer ejercicio con mi gatito',
      'jugar con mi gato',
    ],
    respuesta:
      'Los gatos necesitan jugar varias veces al día, sobre todo en la tarde. Usa juguetes con plumas o cuerdas, y crea alturas con estantes para que puedan trepar y explorar con seguridad.',
    palabrasClave: ['ejercicio', 'gatos', 'juegos', 'juguetes', 'plumas', 'alturas', 'trepar', 'explorar'],
  },
  {
    id: 'cui-calor',
    tema: 'cuidados',
    preguntas: [
      '¿Cómo cuido a mi perro con calor?',
      'el perro se acalora en la tarde',
      '¿qué hago con la mascota en días de calor?',
      'agua y sombra para perros',
    ],
    respuesta:
      'Dale agua fresca todo el día, sombra y paseos temprano o al atardecer. Nunca lo dejes en un carro cerrado. Si respira muy rápido o se ve decaído, llévalo al veterinario de inmediato.',
    palabrasClave: ['calor', 'agua', 'sombra', 'paseos', 'carro', 'respira', 'veterinario', 'inmediato'],
  },
  {
    id: 'cui-dientes',
    tema: 'cuidados',
    preguntas: [
      '¿Cómo cuido los dientes de mi perro?',
      'sarro en los dientes del animal',
      'limpieza dental para mascotas',
      'mal aliento del perro',
    ],
    respuesta:
      'Cepilla los dientes con pasta veterinaria al menos unas veces por semana y ofrece juguetes para morder. Si ves sarro, encías rojas o mal olor, consulta al veterinario.',
    palabrasClave: ['dientes', 'cepillar', 'sarro', 'dental', 'veterinaria', 'encias', 'aliento', 'juguetes'],
  },

  // ---------- OTROS ----------
  {
    id: 'otros-perdido',
    tema: 'otros',
    preguntas: [
      'Se me perdió mi perro, ¿qué hago?',
      'perdí mi gato',
      'mascota perdida',
      'buscar a mi mascota extraviada',
    ],
    respuesta:
      'Avísanos por el chat oficial con una foto, el lugar y la hora en que lo viste por última vez. Revisamos nuestros registros de rescates y te ayudamos a difundir la búsqueda, sin publicar datos personales.',
    palabrasClave: ['perdido', 'mascota', 'extraviada', 'foto', 'lugar', 'registros', 'busqueda', 'difundir'],
  },
  {
    id: 'otros-abandonado',
    tema: 'otros',
    preguntas: [
      'Encontré un animal abandonado, ¿qué hago?',
      'reportar un perro abandonado',
      'vi un gato en la calle sin dueño',
      'quiero reportar maltrato o abandono',
    ],
    respuesta:
      'Escribe por el chat oficial con fotos, la ubicación aproximada y la hora. Si el animal está herido, no lo muevas sin ayuda y avisa a la Clínica Veterinaria 24 Horas; el refugio evalúa si puede recibirlo según su cupo.',
    palabrasClave: ['abandonado', 'reportar', 'calle', 'rescate', 'foto', 'ubicacion', 'cupo', 'denuncia'],
  },
]
