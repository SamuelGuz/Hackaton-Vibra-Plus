// Perfiles curados de los 70 animales de scripts/semilla.ts (45 perros y 25 gatos).
// Enriquecen lo que la base no guarda: edad, tamaño, personalidad, historia, compatibilidad y necesidades médicas.
//
// AVISO IMPORTANTE: todas las historias son TEXTO DE DEMOSTRACIÓN para el hackathon.
// Antes de publicarlas, la dueña del albergue debe reemplazarlas o confirmarlas con historias reales de rescate.
// Los datos médicos (medicinas, dosis, horarios) vienen de la semilla y no deben ampliarse sin confirmación veterinaria.
//
// Las claves son claveDe(nombre): minúsculas, sin tildes ni espacios (p. ej. 'Tobías' -> 'tobias').

import type { PerfilCurado } from './tipos'

/** Clave de búsqueda de un nombre: minúsculas, sin tildes y sin espacios sobrantes. */
export function claveDe(nombre: string): string {
  return nombre
    .trim()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

export const PERFILES_CURADOS: Record<string, PerfilCurado> = {
  // ---------- PERROS ----------
  mateo: {
    edadAnios: 3,
    tamano: 'mediano',
    personalidad: ['Cariñoso', 'Paciente', 'Consentido del albergue'],
    historia:
      'Lo atropellaron en la vía y pasó por una cirugía larga, pero hoy camina por el patio con la cola siempre arriba. Es el consentido del albergue: todos quieren darle una caricia antes de que se acueste. Todavía no puede subir escaleras ni saltar, así que lo cuidamos con calma mientras se recupera.',
    compatibilidad: { ninos: null, gatos: null, perros: null, apartamento: null },
    necesidadesMedicas: [
      'Amoxicilina 3 ml cada 12 h',
      'Meloxicam para el dolor',
      'Todavía no puede subir escaleras ni saltar',
    ],
    mensualCOP: 60000,
  },
  bruno: {
    edadAnios: 6,
    tamano: 'mediano',
    personalidad: ['Noble', 'Se estresa con los cambios bruscos'],
    historia:
      'Lleva ocho meses con nosotros y en ese tiempo aprendió a confiar en las manos que lo bañan cada día. Es noble y tranquilo, aunque se pone nervioso cuando cambian las cosas de golpe. Su piel está mejorando, y el olor del champú medicado ya hace parte de su rutina en la tarde.',
    compatibilidad: { ninos: true, gatos: null, perros: null, apartamento: true },
    necesidadesMedicas: [
      'Baño con champú medicado cada día',
      'Evitar pisos lisos (cerámica, baldosa): se resbala y se lastima la piel',
    ],
    mensualCOP: 50000,
  },
  canela: {
    edadAnios: 2,
    tamano: 'mediano',
    personalidad: ['Tímida al principio', 'Se acerca cuando se siente segura'],
    historia:
      'La dejaron amarrada en la portera de una finca, con una cuerda corta y el lomo lleno de barro. Al principio se encoge cuando alguien se acerca, pero cuando confía mueve la cola despacito. Cada mañana recibe su desparasitante y ya reconoce el sonido de la pastilla en el plato.',
    compatibilidad: { ninos: null, gatos: null, perros: null, apartamento: true },
    necesidadesMedicas: ['Desparasitante una pastilla al día'],
  },
  pecas: {
    edadAnios: 1,
    tamano: 'pequeno',
    personalidad: ['Mucha energía', 'Le encanta caminar y correr'],
    historia:
      'Apareció en una estación de gasolina, todavía chiquito, con una manchita de pecas en la nariz que le dio el nombre. Tiene más energía que cualquier otro en el albergue: corre, trae la pelota y no se cansa de caminar. Recibe sus vitaminas en la mañana mientras mueve la cola esperando el paseo.',
    compatibilidad: { ninos: true, gatos: null, perros: null, apartamento: false },
    necesidadesMedicas: ['Vitaminas 5 ml al día'],
  },
  toby: {
    edadAnios: 5,
    tamano: 'mediano',
    personalidad: ['Cariñoso con la gente', 'Cuida mucho su plato'],
    historia:
      'Lo rescataron en el andén de una plaza, flaco y asustado, con la mirada puesta en cualquiera que pasara. Hoy vive en un hogar temporal donde duerme en una cobija junto a la puerta y saluda a todos moviendo el cuerpo entero. Es cariñoso con la gente, pero cuida mucho su plato cuando hay comida cerca.',
    compatibilidad: { ninos: true, gatos: null, perros: null, apartamento: true },
    necesidadesMedicas: [],
  },
  lola: {
    edadAnios: 11,
    tamano: 'mediano',
    personalidad: ['Viejito y calmado', 'Le gusta dormir al sol'],
    historia:
      'Creció en una esquina del barrio, donde los tenderos le dejaban agua fresca y un pedazo de pan cada tarde. Ya tiene canas en el hocico y prefiere las siestas al sol de la ventana del hogar temporal. Es viejita y tranquila, y cuando alguien se sienta a su lado suspira como si acabara de llegar a casa.',
    compatibilidad: { ninos: null, gatos: null, perros: true, apartamento: true },
    necesidadesMedicas: [],
  },
  max: {
    edadAnios: 3,
    tamano: 'mediano',
    personalidad: ['Juguetón', 'Se lleva bien con otros perros'],
    historia:
      'Llegó con un collar viejo que todavía no se quita y la cola siempre en movimiento. Se lleva bien con otros perros y se pone feliz cuando alguien le lanza una pelota de caucho. Lo encontraron en una cuadra con mucho tráfico, y desde entonces aprendió a esperar la luz verde antes de cruzar.',
    compatibilidad: { ninos: true, gatos: null, perros: true, apartamento: null },
    necesidadesMedicas: [],
  },
  manchas: {
    edadAnios: 7,
    tamano: 'grande',
    personalidad: ['Tranquilo', 'Le gusta que lo acaricien despacio'],
    historia:
      'Tiene manchas negras y blancas en el lomo que parecen un mapa de otro país. Es tranquilo y le gusta que lo acaricien despacio mientras el sol se mete por la ventana. Vivió años en el patio de una casa que tuvo que cerrarse, y todavía mira la puerta cada vez que escucha pasos.',
    compatibilidad: { ninos: true, gatos: null, perros: null, apartamento: false },
    necesidadesMedicas: [],
  },
  negra: {
    edadAnios: 4,
    tamano: 'mediano',
    personalidad: ['Tímida al principio', 'Confía poco a poco'],
    historia:
      'La encontraron sola junto a un basurero, con el pelo lleno de polvo y muy callada. Todavía está en cuarentena, así que la vemos desde lejos y le hablamos bajito cada día. Cuando por fin confía, apoya la cabeza en la mano y no la quita por un buen rato.',
    compatibilidad: { ninos: null, gatos: null, perros: null, apartamento: true },
    necesidadesMedicas: ['En cuarentena: no juntar con otros perros todavía'],
  },
  rocky: {
    edadAnios: 3,
    tamano: 'grande',
    personalidad: ['Mucha energía', 'Necesita caminar todos los días'],
    historia:
      'Llegó con las patas vendadas y una mirada decidida que no se rinde. Es un perro con mucha energía que necesita caminar todos los días y saltar a la pelota en el patio. Mientras avanza su seguimiento veterinario, cada mañana pide salir a la calle con el trote de siempre.',
    compatibilidad: { ninos: true, gatos: null, perros: null, apartamento: false },
    necesidadesMedicas: ['Control veterinario de seguimiento'],
  },
  chispa: {
    edadAnios: 2,
    tamano: 'mediano',
    personalidad: ['Cariñosa con la gente', 'Se derrite con las caricias'],
    historia:
      'Dicen que era la alegría de un parqueadero, donde los celadores le guardaban galletas en el bolsillo. Es cariñosa con la gente y se derrite cuando le rascan detrás de las orejas. Está en cuarentena por ahora, así que su paciencia se nota en cada mirada hacia el pasillo.',
    compatibilidad: { ninos: true, gatos: null, perros: null, apartamento: true },
    necesidadesMedicas: ['En cuarentena: se revisa antes de juntarla con otros animales'],
  },
  paco: {
    edadAnios: 10,
    tamano: 'pequeno',
    personalidad: ['Viejito y calmado', 'Duerme casi todo el día'],
    historia:
      'Lo dejaron en la portería de una bodega hace años, cuando sus dueños ya no podían cuidarlo. Hoy camina despacio, con un pelaje gris que brilla al sol de la mañana. Es viejito y calmado: duerme casi todo el día y solo se levanta para comer en la misma esquina de siempre.',
    compatibilidad: { ninos: null, gatos: null, perros: true, apartamento: true },
    necesidadesMedicas: [],
  },
  kira: {
    edadAnios: 4,
    tamano: 'grande',
    personalidad: ['Juguetona', 'Se lleva bien con otros perros'],
    historia:
      'La rescataron a la orilla de una carretera, con el hocico marcado por el hambre que había pasado. Es juguetona, se lleva bien con otros perros y busca cualquier pelota que rueda por el piso. Está en seguimiento veterinario y, aun así, cada tarde se acerca a la reja a ver quién llega.',
    compatibilidad: { ninos: true, gatos: null, perros: true, apartamento: null },
    necesidadesMedicas: ['Control veterinario de seguimiento'],
  },
  coco: {
    edadAnios: 6,
    tamano: 'pequeno',
    personalidad: ['Tranquilo', 'Disfruta las caricias largas'],
    historia:
      'Vivió en una plaza pequeña, donde las señoras del mercado le dejaban arepa en un papel. Es tranquilo y disfruta de las caricias largas en el lomo. Cuando llueve se acomoda en su cobija y mira el agua caer sin apuro.',
    compatibilidad: { ninos: true, gatos: null, perros: null, apartamento: true },
    necesidadesMedicas: [],
  },
  tobias: {
    edadAnios: 5,
    tamano: 'mediano',
    personalidad: ['Muy apegado a la gente', 'Busca el calor de una mano'],
    historia:
      'Tiene convulsiones controladas con medicina y su anticonvulsivo es parte de cada día. Es muy apegado a la gente y busca el calor de una mano cuando se siente cansado. Con su horario de medicina bien anotado en la pared, el equipo sabe exactamente cuándo le toca.',
    compatibilidad: { ninos: null, gatos: null, perros: null, apartamento: true },
    necesidadesMedicas: [
      'Fenobarbital (anticonvulsivo) una pastilla al día',
      'Anticonvulsivo todos los días a las 2:00 p. m.; no saltarse la dosis',
    ],
    mensualCOP: 60000,
  },
  mona: {
    edadAnios: 3,
    tamano: 'mediano',
    personalidad: ['Mucha energía', 'Le encanta olfatear el patio'],
    historia:
      'Llegó como cachorra de una finca lejana, con las orejas más grandes que su cuerpo. Tiene mucha energía y necesita caminar todos los días antes de que caiga la tarde. Le encanta olfatear cada esquina del patio y regresar con la lengua afuera.',
    compatibilidad: { ninos: true, gatos: null, perros: null, apartamento: false },
    necesidadesMedicas: [],
  },
  lucas: {
    edadAnios: 7,
    tamano: 'grande',
    personalidad: ['Cariñoso con la gente', 'Celoso con la comida'],
    historia:
      'Un señor de la tienda de la esquina lo cuidó por años, hasta que ya no pudo seguir. Es cariñoso con la gente y celoso con su comida, así que conviene darle el plato en un rincón tranquilo. Cuando le hablan con voz suave mueve la cola despacio y se deja abrazar.',
    compatibilidad: { ninos: true, gatos: null, perros: null, apartamento: true },
    necesidadesMedicas: [],
  },
  princesa: {
    edadAnios: 12,
    tamano: 'mediano',
    personalidad: ['Viejita y calmada', 'Disfruta la sombra del patio'],
    historia:
      'La encontraron temblando en un andén, con el pelo blanco en la barbilla y muy poca fuerza. Hoy es una perrita viejita y tranquila que disfruta la sombra del patio al mediodía. Se deja acariciar la frente y responde con un suspiro largo que llena la sala.',
    compatibilidad: { ninos: null, gatos: null, perros: true, apartamento: true },
    necesidadesMedicas: [],
  },
  sultan: {
    edadAnios: 4,
    tamano: 'grande',
    personalidad: ['Juguetón', 'Organiza carreras cortas en el patio'],
    historia:
      'Tiene un porte grande y una melena oscura que le da nombre. Se lleva bien con otros perros y en el patio organiza carreras cortas con cualquiera que quiera jugar. Llegó después de rondar un mercado, donde los vendedores le guardaban sobras de pescado.',
    compatibilidad: { ninos: true, gatos: null, perros: true, apartamento: false },
    necesidadesMedicas: [],
  },
  bombon: {
    edadAnios: 2,
    tamano: 'pequeno',
    personalidad: ['Tranquilo', 'Se queda dormido en el regazo'],
    historia:
      'Es pequeño, redondito y con una colita que nunca deja de moverse. Es tranquilo y le gusta que lo acaricien despacio mientras se queda dormido en el regazo de quien lo sostiene. Lo rescataron de una caja de cartón en la puerta de una panadería.',
    compatibilidad: { ninos: true, gatos: null, perros: null, apartamento: true },
    necesidadesMedicas: [],
  },
  cafe: {
    edadAnios: 5,
    tamano: 'mediano',
    personalidad: ['Tímido al principio', 'Necesita que se le dé confianza'],
    historia:
      'Tiene el pelo del color del tinto de la mañana y unos ojos muy atentos. Es tímido al principio, así que hay que dejar que se acerque a su ritmo. Lo dejaron en un parque, y todavía se queda quieto un segundo antes de aceptar la mano que le ofrecen.',
    compatibilidad: { ninos: null, gatos: null, perros: null, apartamento: true },
    necesidadesMedicas: [],
  },
  nala: {
    edadAnios: 3,
    tamano: 'mediano',
    personalidad: ['Mucha energía', 'Necesita juguetes de mordida'],
    historia:
      'Creció en un patio con muchos árboles, donde corría detrás de las mariposas todo el día. Necesita caminar a diario y mantener la mente ocupada con juguetes de mordida. Llegó al albergue con la correa todavía puesta, y ahora la trae con la boca cada mañana.',
    compatibilidad: { ninos: true, gatos: null, perros: null, apartamento: false },
    necesidadesMedicas: [],
  },
  zeus: {
    edadAnios: 6,
    tamano: 'grande',
    personalidad: ['Cariñoso con la gente', 'Celoso con la comida'],
    historia:
      'Es un perro grande, de pecho ancho y una sonrisa que le sale sola. Es cariñoso con la gente y no se cansa de recibir abrazos, aunque cuida su plato cuando hay comida cerca. Lo recogieron de una obra en construcción, donde los trabajadores le compartían el almuerzo.',
    compatibilidad: { ninos: true, gatos: null, perros: null, apartamento: null },
    necesidadesMedicas: [],
  },
  mota: {
    edadAnios: 13,
    tamano: 'pequeno',
    personalidad: ['Viejita y calmada', 'Pasa el día en su cama junto a la ventana'],
    historia:
      'Llegó a los trece años, después de vivir con una familia que ya no pudo seguir con ella. Tiene el hocico blanco y las patas un poco rígidas, pero el ánimo sigue intacto. Pasa la mayor parte del día en su cama junto a la ventana, viendo pasar a la gente de la calle.',
    compatibilidad: { ninos: null, gatos: null, perros: true, apartamento: true },
    necesidadesMedicas: [],
  },
  pelusa: {
    edadAnios: 2,
    tamano: 'pequeno',
    personalidad: ['Juguetón', 'Siempre trae un juguete en la boca'],
    historia:
      'Tiene un pelo esponjoso que parece una nube y siempre trae un juguete en la boca. Se lleva bien con otros perros y se emociona cuando alguien abre la puerta del patio. La encontraron debajo de una mesa de un restaurante de carretera, pequeña y con frío.',
    compatibilidad: { ninos: true, gatos: null, perros: true, apartamento: null },
    necesidadesMedicas: [],
  },
  rufo: {
    edadAnios: 5,
    tamano: 'mediano',
    personalidad: ['Tranquilo', 'Paciente con los niños'],
    historia:
      'Su pelo rojizo se nota a distancia, y su mirada es tranquila y paciente. Le gusta que lo acaricien despacio en el pecho mientras escucha la radio del patio. Lo encontraron cerca de un colegio, muy flaco pero con ganas de comer.',
    compatibilidad: { ninos: true, gatos: null, perros: null, apartamento: true },
    necesidadesMedicas: [],
  },
  tina: {
    edadAnios: 4,
    tamano: 'mediano',
    personalidad: ['Tímida al principio', 'Se esconde cuando hay mucha gente'],
    historia:
      'Es una perrita de pelaje claro y orejas caídas que se esconde detrás de las piernas cuando hay mucha gente. Es tímida al principio, y su confianza se gana con paciencia y premios pequeños. Vivió en un garaje donde la dejaban dormir sobre un tapete viejo.',
    compatibilidad: { ninos: null, gatos: null, perros: null, apartamento: true },
    necesidadesMedicas: [],
  },
  simon: {
    edadAnios: 3,
    tamano: 'grande',
    personalidad: ['Mucha energía', 'Le gusta correr con otros perros'],
    historia:
      'Tiene una carrera larga y una energía que contagia a todo el patio. Necesita caminar todos los días y pasar un rato corriendo con otros perros. Llegó al albergue después de escaparse de una obra, y lo recogieron a mitad de una cuadra.',
    compatibilidad: { ninos: true, gatos: null, perros: null, apartamento: false },
    necesidadesMedicas: [],
  },
  galleta: {
    edadAnios: 2,
    tamano: 'pequeno',
    personalidad: ['Cariñoso con la gente', 'Celoso con la comida'],
    historia:
      'Su color dorado le ganó el nombre, y su barriga siempre busca una caricia. Es cariñoso con la gente y celoso con la comida, así que conviene darle la porción en un lugar sin apuros. Lo encontraron cerca de una panadería, donde olía a pan recién hecho cada mañana.',
    compatibilidad: { ninos: true, gatos: null, perros: null, apartamento: true },
    necesidadesMedicas: [],
  },
  lupe: {
    edadAnios: 9,
    tamano: 'mediano',
    personalidad: ['Viejita y calmada', 'Se acomoda al primer llamado'],
    historia:
      'Vivió muchos años en el patio de una casa del barrio, donde la familia le hacía sombra con un toldo. Ahora está en el albergue, con las canas en el hocico y un andar lento. Es viejita y tranquila, y se acomoda en la cama al primer llamado para dormir hasta tarde.',
    compatibilidad: { ninos: null, gatos: null, perros: true, apartamento: true },
    necesidadesMedicas: [],
  },
  oso: {
    edadAnios: 4,
    tamano: 'grande',
    personalidad: ['Juguetón', 'Empuja la pelota con la nariz'],
    historia:
      'Tiene un pelaje espeso, cara de peluche y una forma muy graciosa de empujar la pelota con la nariz. Es juguetón y se lleva bien con otros perros del patio. Lo rescataron de un parque, donde los niños le llevaban agua en botellas plásticas.',
    compatibilidad: { ninos: true, gatos: null, perros: true, apartamento: false },
    necesidadesMedicas: [],
  },
  dulce: {
    edadAnios: 3,
    tamano: 'mediano',
    personalidad: ['Tranquila', 'Disfruta el sol de la tarde'],
    historia:
      'Es una perrita de color miel con un olor a campo que la delata. Es tranquila y disfruta de las caricias largas mientras el sol de la tarde calienta el piso. La dejaron en la puerta de un colegio, con un collar roto y una mirada muy tierna.',
    compatibilidad: { ninos: true, gatos: null, perros: null, apartamento: true },
    necesidadesMedicas: [],
  },
  pancho: {
    edadAnios: 6,
    tamano: 'mediano',
    personalidad: ['Tímido al principio', 'Observa desde lejos antes de acercarse'],
    historia:
      'Tiene la oreja izquierda levantada y la derecha caída, como si siempre estuviera escuchando algo. Es tímido al principio y prefiere observar desde lejos antes de acercarse. Llegó después de vivir en una plaza de mercado, donde los vendedores lo conocían por su paciencia.',
    compatibilidad: { ninos: null, gatos: null, perros: null, apartamento: true },
    necesidadesMedicas: [],
  },
  tango: {
    edadAnios: 2,
    tamano: 'grande',
    personalidad: ['Mucha energía', 'Le gustan los juegos de búsqueda'],
    historia:
      'Es un perro de patas largas y un ritmo que nunca se le acaba. Necesita caminar todos los días y gastar energía con juegos de búsqueda. Lo encontraron en una finca donde no tenía espacio para correr, y ahora recorre el patio hasta el fondo.',
    compatibilidad: { ninos: true, gatos: null, perros: null, apartamento: false },
    necesidadesMedicas: [],
  },
  frida: {
    edadAnios: 5,
    tamano: 'mediano',
    personalidad: ['Cariñosa con la gente', 'Busca siempre el contacto de una mano'],
    historia:
      'Tiene un pelo rizado color canela y una cola que barre todo a su paso. Es cariñosa con la gente y busca siempre el contacto de una mano. La rescataron de una calle comercial, donde la señora de la papelería le daba agua fresca cada tarde.',
    compatibilidad: { ninos: true, gatos: null, perros: null, apartamento: true },
    necesidadesMedicas: [],
  },
  benito: {
    edadAnios: 12,
    tamano: 'grande',
    personalidad: ['Viejito y calmado', 'Pasa las tardes echado en el pasto'],
    historia:
      'Es un perro grande y de edad avanzada, con un andar lento pero digno. Pasa las tardes echado en el pasto del patio con los ojos entrecerrados. Llegó después de años en una casa de campo que ya no podía sostenerlo, y aquí encontró una cama blanda.',
    compatibilidad: { ninos: null, gatos: null, perros: true, apartamento: false },
    necesidadesMedicas: [],
  },
  sombra: {
    edadAnios: 3,
    tamano: 'mediano',
    personalidad: ['Juguetón', 'Persigue las hojas que levanta el viento'],
    historia:
      'Siempre aparece pegado a los pies de quien camina por el patio, de ahí su nombre. Es juguetón con otros perros y le encanta perseguir las hojas que levanta el viento. Lo recogieron de una estación de bus, donde dormía bajo una banca.',
    compatibilidad: { ninos: true, gatos: null, perros: true, apartamento: null },
    necesidadesMedicas: [],
  },
  kiara: {
    edadAnios: 7,
    tamano: 'mediano',
    personalidad: ['Tranquila', 'Se apoya en las piernas de quien la visita'],
    historia:
      'Es una perra de mirada suave y movimientos pausados. Le gusta que la acaricien despacio mientras se apoya en las piernas de quien la visita. La encontraron en un terreno baldío, donde pasó meses buscando sombra bajo una mata grande.',
    compatibilidad: { ninos: null, gatos: null, perros: null, apartamento: true },
    necesidadesMedicas: [],
  },
  panela: {
    edadAnios: 4,
    tamano: 'pequeno',
    personalidad: ['Tímida al principio', 'Se acerca cuando percibe calma'],
    historia:
      'Tiene el pelo color caramelo y un hocico que siempre huele a campo. Es tímida al principio y se acerca apenas percibe calma en la habitación. La dejaron en una vereda, cerca de un potrero donde pastaban las vacas.',
    compatibilidad: { ninos: null, gatos: null, perros: null, apartamento: true },
    necesidadesMedicas: [],
  },
  arepa: {
    edadAnios: 2,
    tamano: 'mediano',
    personalidad: ['Mucha energía', 'Comparte juegos de mordida'],
    historia:
      'Es redondita, de color dorado y con una energía que no le cabe en el cuerpo. Necesita caminar todos los días y compartir juegos de mordida con otros perros. La encontraron en la puerta de una tienda de empanadas, donde los clientes le dejaban migas.',
    compatibilidad: { ninos: true, gatos: null, perros: null, apartamento: false },
    necesidadesMedicas: [],
  },
  chocolate: {
    edadAnios: 6,
    tamano: 'mediano',
    personalidad: ['Cariñoso con la gente', 'Pide caricias metiéndose entre las piernas'],
    historia:
      'Es de color oscuro y tiene una mirada que se vuelve blanda cuando alguien le habla. Es cariñoso con la gente y se mete entre las piernas para pedir caricias. Lo recogieron en una plaza pública, donde una vendedora de jugos le ponía agua en un tarro.',
    compatibilidad: { ninos: true, gatos: null, perros: null, apartamento: true },
    necesidadesMedicas: [],
  },
  bruna: {
    edadAnios: 11,
    tamano: 'mediano',
    personalidad: ['Viejita y calmada', 'Disfruta las caricias lentas'],
    historia:
      'Es una perra de pelaje pardo y hocico canoso que ya conoce la rutina del albergue. Es viejita y tranquila, y disfruta de las caricias lentas cuando el día está fresco. Vivió muchos años en una vereda, donde la familia la dejaba dormir junto a la estufa de leña.',
    compatibilidad: { ninos: null, gatos: null, perros: true, apartamento: true },
    necesidadesMedicas: [],
  },
  gordo: {
    edadAnios: 3,
    tamano: 'mediano',
    personalidad: ['Juguetón', 'De carácter alegre'],
    historia:
      'Es un perro robusto y de carácter alegre, con una barriga que le hace gracia a todo el mundo. Es juguetón y se lleva bien con otros perros cuando juegan en el patio. Lo encontraron en la entrada de un supermercado, rondando las puertas corredizas.',
    compatibilidad: { ninos: true, gatos: null, perros: true, apartamento: null },
    necesidadesMedicas: [],
  },
  linda: {
    edadAnios: 4,
    tamano: 'mediano',
    personalidad: ['Tranquila', 'Descansa cerca de la gente sin pedir mucho'],
    historia:
      'Tiene un pelaje negro brillante y una carita muy dulce. Es tranquila y le gusta descansar cerca de la gente sin pedir mucho. La dejaron en la portería de un edificio, con una cobija vieja como única compañía.',
    compatibilidad: { ninos: true, gatos: null, perros: null, apartamento: true },
    necesidadesMedicas: [],
  },
  firulais: {
    edadAnios: 8,
    tamano: 'mediano',
    personalidad: ['Tímido al principio', 'Se acerca cuando quiere'],
    historia:
      'Es un perro de color café con manchas y pasos cuidadosos. Es tímido al principio, así que conviene dejar que se acerque cuando quiera. Vivió años en la calle de un barrio, donde todos lo llamaban por su nombre y le dejaban agua en un plato.',
    compatibilidad: { ninos: null, gatos: null, perros: null, apartamento: true },
    necesidadesMedicas: [],
  },

  // ---------- GATOS ----------
  luna: {
    edadAnios: 3,
    tamano: 'pequeno',
    personalidad: ['Independiente', 'Se deja cargar poco'],
    historia:
      'La encontraron en un carro de tinto, escondida entre los termos. Es independiente y se deja cargar poco, pero se sienta cerca cuando quiere compañía. Ahora recibe sus gotas para los ojos cada seis horas y ya no se esconde cuando escucha el frasquito.',
    compatibilidad: { ninos: null, gatos: null, perros: null, apartamento: true },
    necesidadesMedicas: ['Gotas para los ojos 2 gotas cada 6 horas'],
  },
  tigre: {
    edadAnios: 5,
    tamano: 'mediano',
    personalidad: ['Ronronea con cualquiera', 'Se acerca a quien llega por primera vez'],
    historia:
      'Tiene rayas marrones y un ronroneo que se escucha desde la puerta. Ronronea con cualquiera que se sienta cerca, incluso con quien llega por primera vez. Está tomando antibiótico cada doce horas, y en las mañanas busca el sol de la ventana para descansar.',
    compatibilidad: { ninos: true, gatos: null, perros: null, apartamento: true },
    necesidadesMedicas: ['Antibiótico 1 ml cada 12 h'],
    mensualCOP: 60000,
  },
  misu: {
    edadAnios: 4,
    tamano: 'pequeno',
    personalidad: ['Asustadiza con los perros', 'Prefiere un hogar tranquilo'],
    historia:
      'Es una gatita de pelo corto y ojos verdes que se esconde detrás de la nevera cuando hay ruido. Es asustadiza con los perros y prefiere un hogar tranquilo, sin perros. Está en control veterinario de seguimiento y se acomoda en su caja cuando todo se calma.',
    compatibilidad: { ninos: null, gatos: null, perros: false, apartamento: true },
    necesidadesMedicas: ['Control veterinario de seguimiento'],
  },
  nube: {
    edadAnios: 1,
    tamano: 'pequeno',
    personalidad: ['Curiosa', 'Se sube a todo'],
    historia:
      'Llegó tan chiquita que cabía en una mano, y pasa el día mirando todo lo que se mueve. Es curiosa y se sube a todo lo que encuentra, desde las cortinas hasta el estante más alto. Por ahora está en cuarentena, así que su curiosidad se queda en la ventana de su cuarto.',
    compatibilidad: { ninos: null, gatos: null, perros: null, apartamento: null },
    necesidadesMedicas: ['En cuarentena: se revisa antes de juntarla con otros animales'],
  },
  tomate: {
    edadAnios: 6,
    tamano: 'pequeno',
    personalidad: ['Independiente', 'Prefiere dormir en un rincón tranquilo'],
    historia:
      'Es rojizo y de carácter firme, con un maullido corto que sabe usar cuando quiere comida. Es independiente y prefiere dormir en un rincón donde nadie lo moleste. Lo recogieron de una casa vieja del barrio, donde el olor a café se metía por todas las rendijas.',
    compatibilidad: { ninos: null, gatos: null, perros: null, apartamento: true },
    necesidadesMedicas: [],
  },
  salem: {
    edadAnios: 7,
    tamano: 'mediano',
    personalidad: ['Ronronea con cualquiera', 'Observa el patio desde lo alto'],
    historia:
      'Es negro y tiene una mirada de sabio que intriga a todos en el albergue. Ronronea con cualquiera que se sienta cerca, y se queda quieto mientras le hablan. Está en seguimiento veterinario y pasa sus horas en la repisa más alta, observando el patio.',
    compatibilidad: { ninos: true, gatos: null, perros: null, apartamento: true },
    necesidadesMedicas: ['Control veterinario de seguimiento'],
  },
  mango: {
    edadAnios: 2,
    tamano: 'pequeno',
    personalidad: ['Asustadiza con los perros', 'Se acostumbra despacio a las voces'],
    historia:
      'Tiene el pelo naranja con manchas claras, y la cola se le encrespa con cualquier ruido fuerte. Es asustadiza con los perros y prefiere un hogar sin perros. Está en cuarentena por ahora, y se acostumbra poco a poco a la voz de quien le lleva la comida.',
    compatibilidad: { ninos: null, gatos: null, perros: false, apartamento: true },
    necesidadesMedicas: ['En cuarentena: se revisa antes de juntarla con otros animales'],
  },
  agata: {
    edadAnios: 4,
    tamano: 'pequeno',
    personalidad: ['Curiosa', 'Revisa cada cajón que encuentra abierto'],
    historia:
      'Su pelo es de un gris casi plateado y siempre tiene la cabeza ladeada para mirar algo. Es curiosa y revisa cada cajón que encuentra abierto. La encontraron en la bodega de una tienda de barrio, entre cajas de jabón y bolsas de arroz.',
    compatibilidad: { ninos: null, gatos: true, perros: null, apartamento: true },
    necesidadesMedicas: [],
  },
  bigotes: {
    edadAnios: 9,
    tamano: 'pequeno',
    personalidad: ['Independiente', 'No le gusta que lo carguen mucho'],
    historia:
      'Tiene unos bigotes blancos y largos que le dan un aire serio. Es independiente y no le gusta que lo carguen mucho tiempo. Vivió años en el patio de una casa que tuvo que vender, y aquí aprendió a dormir en una cama propia.',
    compatibilidad: { ninos: null, gatos: null, perros: null, apartamento: true },
    necesidadesMedicas: [],
  },
  pantera: {
    edadAnios: 3,
    tamano: 'mediano',
    personalidad: ['Ronronea con cualquiera', 'Acepta caricias en la cabeza'],
    historia:
      'Es una gata elegante, de pelo negro brillante y patas largas. Ronronea con cualquiera que se sienta cerca y acepta caricias en la cabeza. La recogieron de un garaje, donde se escondía entre las bicicletas.',
    compatibilidad: { ninos: true, gatos: true, perros: null, apartamento: true },
    necesidadesMedicas: [],
  },
  kiwi: {
    edadAnios: 1,
    tamano: 'pequeno',
    personalidad: ['Asustadiza con los perros', 'Explora a su ritmo'],
    historia:
      'Es chiquita, de pelo gris y ojos muy abiertos. Es asustadiza con los perros y se aleja cuando escucha ladridos cerca. Necesita un hogar tranquilo, sin perros, donde pueda explorar a su ritmo.',
    compatibilidad: { ninos: null, gatos: null, perros: false, apartamento: true },
    necesidadesMedicas: [],
  },
  morris: {
    edadAnios: 5,
    tamano: 'mediano',
    personalidad: ['Curioso', 'Se sube a las ventanas para ver pájaros'],
    historia:
      'Es un gato atigrado con una cola larga que levanta como antena. Es curioso y se sube a las ventanas para ver a los pájaros del patio. Lo rescataron de un cuarto de herramientas en una obra, donde había más ratones que comida.',
    compatibilidad: { ninos: null, gatos: true, perros: null, apartamento: null },
    necesidadesMedicas: [],
  },
  pimienta: {
    edadAnios: 8,
    tamano: 'pequeno',
    personalidad: ['Independiente', 'Se queda cerca de la ventana'],
    historia:
      'Tiene el pelo oscuro con puntos claros, de ahí su nombre. Es independiente y se queda cerca de la ventana sin pedir mucha atención. Vivió en la cocina de una casa de campo, donde le dejaban restos de comida en un plato azul.',
    compatibilidad: { ninos: null, gatos: null, perros: null, apartamento: true },
    necesidadesMedicas: [],
  },
  menta: {
    edadAnios: 4,
    tamano: 'mediano',
    personalidad: ['Ronronea con cualquiera', 'Le gusta que le hablen bajito'],
    historia:
      'Es de pelo crema y ronronea apenas alguien se sienta cerca. Le gusta que le hablen bajito mientras se acomoda sobre una manta. La encontraron en el jardín de un conjunto residencial, maullando junto a una reja.',
    compatibilidad: { ninos: null, gatos: null, perros: null, apartamento: true },
    necesidadesMedicas: [],
  },
  olivia: {
    edadAnios: 3,
    tamano: 'pequeno',
    personalidad: ['Asustadiza con los perros', 'Ronroneo suave y tímido'],
    historia:
      'Es una gatita de pelo atigrado, con mirada tímida y un ronroneo muy suave. Es asustadiza con los perros, así que su hogar ideal no tiene perros. Vivió en una panadería, donde se escondía entre los sacos de harina.',
    compatibilidad: { ninos: null, gatos: null, perros: false, apartamento: true },
    necesidadesMedicas: [],
  },
  felipe: {
    edadAnios: 6,
    tamano: 'mediano',
    personalidad: ['Curioso', 'Se sube a la mesa del comedor'],
    historia:
      'Es grande, tiene las patas blancas y una cola muy peluda. Es curioso y se sube a todo lo que encuentra, incluso a la mesa del comedor. Lo recogieron de una finca, donde trepaba por los árboles de mango.',
    compatibilidad: { ninos: true, gatos: null, perros: null, apartamento: null },
    necesidadesMedicas: [],
  },
  copito: {
    edadAnios: 2,
    tamano: 'pequeno',
    personalidad: ['Independiente', 'Observa desde un rincón antes de jugar'],
    historia:
      'Es blanco y suave, con una cola que termina en punta. Es independiente y prefiere observar desde un rincón antes de animarse a jugar. Ahora vive en un hogar temporal, donde tiene su propia caja y una ventana con sol.',
    compatibilidad: { ninos: null, gatos: null, perros: null, apartamento: true },
    necesidadesMedicas: [],
  },
  sushi: {
    edadAnios: 5,
    tamano: 'pequeno',
    personalidad: ['Ronronea con cualquiera', 'Se acomoda en el regazo'],
    historia:
      'Tiene pelo gris con rayas claras y un ronroneo que se escucha desde el otro lado del cuarto. Ronronea con cualquiera que se sienta cerca y se acomoda en el regazo sin pedir permiso. La encontraron en una caja de pescado vacía, cerca de un mercado.',
    compatibilidad: { ninos: true, gatos: null, perros: null, apartamento: true },
    necesidadesMedicas: [],
  },
  oreo: {
    edadAnios: 3,
    tamano: 'pequeno',
    personalidad: ['Asustadiza con los perros', 'Busca rincones tranquilos'],
    historia:
      'Es blanco y negro, como su nombre lo dice, y tiene la mirada atenta a cada ruido. Es asustadizo con los perros y busca rincones tranquilos para dormir. Hoy vive en un hogar temporal, donde aprende a confiar poco a poco en la voz de sus cuidadores.',
    compatibilidad: { ninos: null, gatos: null, perros: false, apartamento: true },
    necesidadesMedicas: [],
  },
  mia: {
    edadAnios: 4,
    tamano: 'pequeno',
    personalidad: ['Curiosa', 'Muy traviesa'],
    historia:
      'Es pequeña, de pelo beige y muy traviesa. Es curiosa y se sube a los estantes para ver qué hay arriba de todo. Llegó de una casa de campo, donde se pasaba el día vigilando el corral.',
    compatibilidad: { ninos: true, gatos: null, perros: null, apartamento: null },
    necesidadesMedicas: [],
  },
  lucero: {
    edadAnios: 10,
    tamano: 'pequeno',
    personalidad: ['Independiente', 'Se acerca en sus propios tiempos'],
    historia:
      'Tiene pelo claro y ojos que brillan cuando hay luz. Es independiente y prefiere sus propios tiempos para acercarse. Vivió años en el zaguán de una casa, donde la familia la dejaba salir al patio cada mañana.',
    compatibilidad: { ninos: null, gatos: null, perros: null, apartamento: true },
    necesidadesMedicas: [],
  },
  gris: {
    edadAnios: 7,
    tamano: 'mediano',
    personalidad: ['Ronronea con cualquiera', 'Ronroneo profundo'],
    historia:
      'Es gris de pies a cabeza, con un ronroneo profundo que parece una cuerda de guitarra. Ronronea con cualquiera que se sienta cerca, incluso con las visitas nuevas. Lo encontraron en la terraza de un edificio, sentado frente a la puerta.',
    compatibilidad: { ninos: true, gatos: null, perros: null, apartamento: true },
    necesidadesMedicas: [],
  },
  zapatico: {
    edadAnios: 2,
    tamano: 'pequeno',
    personalidad: ['Asustadizo con los perros', 'Se esconde detrás del sofá'],
    historia:
      'Tiene cuatro patas blancas que parecen medias, de ahí su nombre. Es asustadizo con los perros y se esconde detrás del sofá cuando alguno ladra. Lo recogieron de una cuadra donde la gente le dejaba leche en un platico.',
    compatibilidad: { ninos: null, gatos: null, perros: false, apartamento: true },
    necesidadesMedicas: [],
  },
  jengibre: {
    edadAnios: 3,
    tamano: 'mediano',
    personalidad: ['Curioso', 'Mucha energía'],
    historia:
      'Tiene color naranja intenso y una energía que no para. Es curioso y se trepa por cualquier cortina que vea. Lo encontraron en un taller de carros, donde se acostaba sobre las llantas tibias.',
    compatibilidad: { ninos: true, gatos: true, perros: null, apartamento: null },
    necesidadesMedicas: [],
  },
  tito: {
    edadAnios: 12,
    tamano: 'mediano',
    personalidad: ['Independiente', 'Calma que impresiona'],
    historia:
      'Es un gato adulto de pelo gris, con una calma que impresiona. Es independiente y prefiere dormir en su propia cama antes que en el regazo de nadie. Vivió en un colegio, donde los estudiantes lo visitaban a la hora del recreo.',
    compatibilidad: { ninos: true, gatos: null, perros: null, apartamento: true },
    necesidadesMedicas: [],
  },
}
