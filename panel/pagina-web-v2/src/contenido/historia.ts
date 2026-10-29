// Storytelling content for the public rescue website.
// Every factual claim comes from branch `silvia-rescate-real` (see docs/historia.md).
// Any string starting with "PENDIENTE:" must be filled in by a human before publishing.

export type Pendiente = `PENDIENTE: ${string}`;

// Public editorial narrative. No estimated animal counts, testimonials or payment promises.
export const editorial = {
  reference: "Imágenes de referencia. No corresponden a animales del refugio.",
  gallery: {
    label: "Galería de fotografías de referencia", previous: "Ver foto anterior", next: "Ver foto siguiente",
    choose: "Elegir fotografía", show: "Mostrar fotografía", photo: "Foto", of: "de",
  },
  intro: {
    first: "El amor ya está.", second: "Que alcance.",
    lead: "Rescatar es abrir la puerta. Sostener un refugio es lograr que cada día haya comida, cuidado y una oportunidad de encontrar hogar.",
    link: "Conoce a quien abrió esa puerta",
  },
  story: {
    title: "Su casa.\nSu refugio.",
    lead: "Yesenia es recicladora y rescatista. En su propia casa cuida perros y gatos que necesitan una nueva oportunidad.",
    detail: "Esta página es para quienes pueden acompañarla: adoptando, ayudando con la comida o compartiendo su historia.",
    caption: "Una imagen de referencia. Una causa que merece tu atención.",
    link: "Quiero ayudar",
  },
  ally: {
    title: "Un barrio\nque cuida.",
    lead: "Un carnicero del barrio, le regala o le fía huesos, menudencias y recortes de carne. Su ayuda es parte de esta historia.",
    note: "Cuidar también es hacer equipo.",
  },
  donation: {
    title: "Un plato lleno.\nUn día mejor.",
    lead: "Ayuda a sostener la alimentación del refugio. Elige un aporte y consulta los medios disponibles antes de enviar dinero.",
    legend: "Elige el monto de tu aporte", other: "Otro valor", amountLabel: "Tu aporte", customLabel: "Escribe tu aporte en pesos",
    destinationLabel: "Equivalencia en alimento", destination: "PENDIENTE: confirmar costos y equivalencias de los aportes con un carnicero del barrio",
    paymentTitle: "Directo,\nsin enredos.",
    paymentLead: "Cuando los datos estén confirmados, podrás copiar el número y hacer el aporte desde tu aplicación.",
    pending: "Los números y titulares están por confirmar. Esta página todavía no recibe pagos.",
    purpose: "Para comida, para cuidado, para seguir.",
  },
  adoption: {
    title: "Un hogar.\nPara siempre.",
    lead: "Conoce su historia, entiende sus necesidades e imagina la vida que puedes compartir con él.",
    note: "Las fichas reales y el contacto de adopción están por confirmar.",
    cta: "Consultar por WhatsApp",
    steps: [
      { title: "Conoce antes de decidir", detail: "Pregunta por su carácter, sus cuidados y el espacio que necesita. Las imágenes de esta página son de referencia, no un catálogo de animales disponibles." },
      { title: "Piensa en su vida contigo", detail: "Vivienda, presupuesto, cerramientos y compromiso veterinario: son los cuatro temas que propone el proceso de adopción." },
      { title: "Da el paso con compañía", detail: "Consulta las condiciones y acuerda una visita antes de tomar una decisión. El contacto de adopción sigue por confirmar." },
    ],
  },
  trust: {
    title: "La confianza\nse cuida.",
    lead: "Ayudar empieza por saber qué estás viendo y a quién estás apoyando.",
    items: [
      { title: "Fotos, sin confusión.", detail: "Las fotografías y los videos actuales son de referencia. Las fichas reales se publicarán cuando estén disponibles y cuenten con permiso." },
      { title: "Datos, sin inventarlos.", detail: "Los contactos, los titulares de las cuentas y las equivalencias de los aportes se muestran como “Por confirmar” hasta verificarlos." },
      { title: "Tu decisión, con claridad.", detail: "Esta web no procesa cobros ni confirma adopciones. Los canales de contacto se habilitarán cuando estén verificados." },
    ],
  },
  closing: {
    title: "Su hogar\npuedes ser tú.",
    lead: "Adoptar cambia una historia. Ayudar con su comida permite que otras sigan adelante.",
    primary: "Quiero adoptar", secondary: "Ayudar con comida",
  },
} as const;

export interface Cta {
  texto: string;
  /** Destination: anchor id, "whatsapp" or "donar". */
  destino: string;
}

export interface Marca {
  nombre: string;
  /** Proposed tagline (copy proposal, not a sourced fact). */
  lema: string;
  ubicacion: string | Pendiente;
}

export interface Hero {
  antetitulo: string;
  titulo: string;
  subtitulo: string;
  ctaPrincipal: Cta;
  ctaSecundario: Cta;
}

export interface HeroRescateReal extends Hero {
  /** What the branch admits was wrong in the first version. */
  autocritica: string[];
  /** The realistic plan the branch proposes instead. */
  plan: string[];
}

export interface HeroVideos {
  titulo: string;
  linea: string;
  ctaPrincipal: Cta;
  ctaSecundario: Cta;
}

export interface Seccion {
  id: string;
  antetitulo: string;
  titulo: string;
  cuerpo: string;
  vinetas?: string[];
  cta?: Cta;
}

export interface Donacion {
  montoCop: number;
  compra: string;
  impacto: string;
}

export interface PasoAdopcion {
  numero: number;
  titulo: string;
  detalle: string;
}

export interface MedioPago {
  nombre: "Nequi" | "Daviplata";
  numero: string | Pendiente;
  titular: string | Pendiente;
}

export interface AnimalEjemplo {
  nombre: string;
  /** True while nobody has confirmed this is a real animal of the rescue. */
  esDemo: boolean;
  nota: string;
}

export interface Historia {
  marca: Marca;
  heroCreativo: Hero;
  heroRescateReal: HeroRescateReal;
  heroVideos: HeroVideos;
  heroReel: { badge: string; lineOne: string; lineTwo: string; lead: string; cta: string };
  heroWild: { title: string; statement: string; lead: string; cta: string };
  secciones: Seccion[];
  donaciones: Donacion[];
  mediosPago: MedioPago[];
  adopcion: {
    preguntasFiltro: string[];
    pasos: PasoAdopcion[];
    whatsapp: string | Pendiente;
  };
  animalesEjemplo: AnimalEjemplo[];
  pendientes: Pendiente[];
}

const ctaDonar: Cta = { texto: "Págale al carnicero", destino: "donar" };
const ctaAdoptar: Cta = { texto: "Quiero adoptar", destino: "whatsapp" };

export const historia: Historia = {
  marca: {
    nombre: "Huellitas",
    lema: "Un hogar empieza con alguien como tú.",
    ubicacion: "PENDIENTE: barrio y ciudad en Colombia (el plan solo dice Colombia)",
  },

  heroCreativo: {
    antetitulo: "Rescate de perros y gatos en Colombia",
    titulo: "Aquí nadie come de un presupuesto. Comen de la generosidad.",
    subtitulo:
      "Yesenia cuida 90 perros y gatos en su propia casa. Un carnicero del barrio y tú hacen que coman hoy.",
    ctaPrincipal: ctaDonar,
    ctaSecundario: ctaAdoptar,
  },

  heroRescateReal: {
    antetitulo: "Sin humo: la historia real",
    titulo: "Primero hicimos tecnología de oficina. Yesenia no tiene oficina.",
    subtitulo:
      "Es recicladora, cuida 90 animales en su casa y usa un celular con la pantalla rota. Por eso rehicimos todo para que funcione en su mundo, no en el nuestro.",
    autocritica: [
      "Hicimos campañas por correo, pero quien ayuda a un refugio popular responde por WhatsApp y Nequi.",
      "Hicimos un panel pesado que en un celular prepago se come los datos en minutos.",
      "El sistema tenía 70 perros de mentira, mientras los 90 reales no estaban registrados.",
      "Prometimos una voz cálida que en realidad era texto plano.",
    ],
    plan: [
      "Un asistente de WhatsApp que atiende a los curiosos para que ella descanse.",
      "Donaciones que se convierten en kilos de carne, no en una cuenta genérica.",
      "Control de medicinas con audios de 5 segundos, sin tocar la pantalla.",
      "Todo dentro de WhatsApp, para que no gaste el saldo que no tiene.",
    ],
    ctaPrincipal: ctaDonar,
    ctaSecundario: { texto: "Ver cómo funciona", destino: "como-ayuda-tu-aporte" },
  },

  heroVideos: {
    titulo: "Que no falte comida.",
    linea: "Ayuda a Yesenia a alimentar a los perros y gatos que cuida.",
    ctaPrincipal: { texto: "Donar comida", destino: "donar" },
    ctaSecundario: ctaAdoptar,
  },

  heroReel: {
    badge: "Perros, gatos y segundas oportunidades",
    lineOne: "Todos merecen",
    lineTwo: "un lugar en casa.",
    lead: "Yesenia les abrió su casa. Ayúdanos a encontrarles un hogar, llenar sus platos y contar su historia.",
    cta: "Quiero adoptar",
  },

  heroWild: {
    title: "Adopta. Su próximo hogar puedes ser tú.",
    statement: "Su próximo hogar puedes ser tú.",
    lead: "En el refugio de Yesenia hay perros y gatos esperando una casa. Si hoy no puedes adoptar, también puedes ayudar a que coman.",
    cta: "Conoce su historia",
  },

  secciones: [
    {
      id: "el-problema",
      antetitulo: "El problema",
      titulo: "Un refugio no se apaga por falta de amor.",
      cuerpo:
        "Se apaga cuando el agotamiento y la falta de comida vencen a quien rescata. Aquí no hay presupuesto fijo ni plata para bultos de concentrado.",
      vinetas: [
        "14 horas al día de trabajo pesado, con las manos mojadas.",
        "Cerca de 3 horas diarias respondiendo mensajes de curiosos.",
        "Sin Wi-Fi: se conecta con paqueticos de datos de $3.000.",
      ],
      cta: ctaDonar,
    },
    {
      id: "quien-es-ella",
      antetitulo: "Quién es ella",
      titulo: "Yesenia: recicladora y rescatista.",
      cuerpo:
        "Cuida en su propia casa a 90 perros y gatos rescatados, por pura vocación. Lo hace con un celular viejo de pantalla partida y la batería gastada.",
    },
    {
      id: "el-carnicero",
      antetitulo: "El aliado del barrio",
      titulo: "un carnicero del barrio, el carnicero que no los deja morir de hambre.",
      cuerpo:
        "Le regala o le fía huesos, menudencias y recortes de carne. Cuando donas, le pagas a él y los animales comen ese mismo día.",
      cta: ctaDonar,
    },
    {
      id: "como-ayuda-tu-aporte",
      antetitulo: "Lo que compra tu ayuda",
      titulo: "No donas a una cuenta. Donas kilos de comida.",
      cuerpo:
        "Cada monto tiene un destino concreto que puedes entender. Después te contamos qué comieron gracias a ti.",
      vinetas: [
        "$10.000: 2 kilos de carne con el carnicero.",
        "$25.000: menudencia para 10 perros por un día.",
        "$60.000: un bulto de concentrado para mezclar con la carne.",
      ],
      cta: ctaDonar,
    },
    {
      id: "adoptar",
      antetitulo: "Adoptar",
      titulo: "Adopta por WhatsApp, visita en persona.",
      cuerpo:
        "Un asistente te hace 4 preguntas para cuidar al animal y a ti. Si todo encaja, tu visita queda agendada directo en el calendario de Yesenia.",
      vinetas: [
        "Vivienda.",
        "Presupuesto.",
        "Rejas o cerramientos.",
        "Compromiso con el veterinario.",
      ],
      cta: { texto: "Escribir por WhatsApp", destino: "whatsapp" },
    },
    {
      id: "transparencia",
      antetitulo: "Por qué confiar",
      titulo: "Te decimos lo que hicimos mal.",
      cuerpo:
        "La primera versión de este proyecto tenía perros inventados y promesas que no se cumplían. La corregimos para mostrarte solo animales reales y donaciones que puedes rastrear.",
      vinetas: [
        "Cada aporte se convierte en comida concreta.",
        "Recibes un aviso de qué comieron gracias a ti.",
        "Ningún animal de esta página es inventado sin decirlo.",
      ],
    },
    {
      id: "llamado-final",
      antetitulo: "Hoy",
      titulo: "90 animales esperan su comida de hoy.",
      cuerpo: "Con $10.000 ya pagas 2 kilos de carne. Con un mensaje puedes empezar una adopción.",
      cta: ctaDonar,
    },
  ],

  donaciones: [
    {
      montoCop: 10000,
      compra: "2 kilos de carne fresca con un carnicero del barrio, el carnicero.",
      impacto: "Gracias a tus $10.000, hoy comieron carne con un carnicero del barrio.",
    },
    {
      montoCop: 25000,
      compra: "Menudencia para 10 perros por un día.",
      impacto: "Gracias a ti, 10 perros comieron menudencia hoy.",
    },
    {
      montoCop: 60000,
      compra: "Un bulto de concentrado para mezclar con la carne.",
      impacto: "Gracias a ti, hay concentrado para mezclar con la carne.",
    },
  ],

  mediosPago: [
    {
      nombre: "Nequi",
      numero: "PENDIENTE: número de Nequi",
      titular: "PENDIENTE: titular de la cuenta Nequi",
    },
    {
      nombre: "Daviplata",
      numero: "PENDIENTE: número de Daviplata",
      titular: "PENDIENTE: titular de la cuenta Daviplata",
    },
  ],

  adopcion: {
    preguntasFiltro: ["Vivienda", "Presupuesto", "Rejas", "Compromiso veterinario"],
    pasos: [
      {
        numero: 1,
        titulo: "Escribe por WhatsApp",
        detalle: "Te responde un asistente con calidez, a cualquier hora.",
      },
      {
        numero: 2,
        titulo: "Responde 4 preguntas",
        detalle: "Vivienda, presupuesto, rejas y compromiso con el veterinario.",
      },
      {
        numero: 3,
        titulo: "Agenda tu visita",
        detalle: "Si todo encaja, la visita queda en el calendario de Yesenia.",
      },
      {
        numero: 4,
        titulo: "Conoce al animal",
        detalle: "Yesenia recibe tu resumen y te espera el día de la visita.",
      },
    ],
    whatsapp: "PENDIENTE: número de WhatsApp del asistente",
  },

  animalesEjemplo: [
    {
      nombre: "Rocky",
      esDemo: true,
      nota: "DEMO: nombre usado como ejemplo en el plan. PENDIENTE: confirmar si es un animal real.",
    },
    {
      nombre: "El Tuerto",
      esDemo: true,
      nota: "DEMO: nombre usado como ejemplo en el plan. PENDIENTE: confirmar si es un animal real.",
    },
  ],

  pendientes: [
    "PENDIENTE: confirmar que Yesenia y un carnicero del barrio aceptan aparecer con su nombre en una página pública",
    "PENDIENTE: barrio y ciudad en Colombia",
    "PENDIENTE: números y titulares de Nequi y Daviplata",
    "PENDIENTE: número de WhatsApp del asistente",
    "PENDIENTE: fotos y videos reales de los animales, con permiso",
    "PENDIENTE: confirmar que los montos de donación siguen vigentes con el carnicero",
    "PENDIENTE: confirmar que el aviso al donante y el agendamiento en el calendario ya funcionan antes de prometerlos",
    "PENDIENTE: aclarar la cifra de animales (el plan dice 90; los requerimientos originales dicen 45 perros y 25 gatos)",
  ],
};
