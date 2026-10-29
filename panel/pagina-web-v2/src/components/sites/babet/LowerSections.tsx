'use client'

import Link from 'next/link';

import { useEffect, useState, type FormEvent } from 'react';
import { asset, foto, SectionHeading, Button, Arrow } from './shared';
import type { SlugImagen } from '../../../contenido/imagenes';
import shared from './Shared.module.css';
import PieSitio from '../../paginas/PieSitio';
import styles from './LowerSections.module.css';

const faqs = [
  ['¿Cómo funciona la adopción?', 'Primero se hacen cuatro preguntas sobre vivienda, presupuesto, rejas o cerramientos y compromiso con el veterinario. Si todo encaja, se propone una visita y Yesenia recibe un resumen claro de tu solicitud. El contacto de adopción está por confirmar.'],
  ['¿Qué pasa si hoy no puedo adoptar?', 'Puedes ayudar con la comida o con la infraestructura del refugio mediante un aporte, o compartir la historia de Yesenia con quien pueda adoptar, donar o acompañar.'],
  ['¿Qué compra mi aporte?', 'Comida (carne, huesos, menudencias, concentrado) y mejoras del refugio. Las metas y cada compra confirmada se ven en la barra de progreso. Los montos de referencia están por confirmar.'],
  ['¿Puedo pagar desde esta página?', 'Todavía no. Los números de Nequi y Daviplata y sus titulares están por confirmar, y esta página no procesa cobros.'],
  ['¿Por qué debo confiar?', 'Solo mostramos lo que está confirmado; lo demás dice “Por confirmar”. Cada compra se publicará aquí cuando Yesenia la confirme por WhatsApp. Las fotos son de referencia, no de animales del refugio.'],
];
const packages: { title: string; price: string; slug: SlugImagen; text: string }[] = [
  { title: 'Carne para su comida', price: '$10.000', slug: 'cachorro-atigrado', text: 'Aporte de referencia para carne fresca. Monto y canal de pago: por confirmar.' },
  { title: 'Menudencia para varios', price: '$25.000', slug: 'perro-cafe-sonriente', text: 'Aporte de referencia para menudencias que alcanzan a varios animales. Monto y canal de pago: por confirmar.' },
  { title: 'Concentrado para mezclar', price: '$60.000', slug: 'dos-perros-juntos', text: 'Aporte de referencia para un bulto de concentrado. Monto y canal de pago: por confirmar.' },
];
const articleSlugs: SlugImagen[] = ['gatos-abrazados-foto', 'cachorro-atigrado-ladrillo', 'perro-abuelo-pata-vendada'];
const articles = [
  'La comida no puede esperar a la próxima emergencia',
  'Adoptar es un compromiso que continúa en casa',
  'También necesita apoyo quien cuida todos los días',
];
const footerGroups = [
  { title: 'Conoce', links: [['Inicio', 'index.html'], ['Nuestra historia', 'about.html'], ['Cómo ayudar', 'service.html'], ['Quiénes ayudan', 'blog.html'], ['Quiero ayudar', 'contact.html']] },
  { title: 'Infórmate', links: [['Para acompañar mejor', 'about.html'], ['Cuidado diario', 'about.html'], ['Historias', 'blog.html'], ['Transparencia', 'about.html'], ['Términos y condiciones', 'contact.html']] },
  { title: 'Cómo ayudar', links: [['Comida cada día', 'service.html'], ['Carne y huesos', 'service.html'], ['Menudencias', 'service.html'], ['Concentrado', 'service.html'], ['Adopción responsable', 'service.html']] },
  { title: 'Acompaña', links: [['Centro de ayuda', 'contact.html'], ['Preguntas frecuentes', 'faq.html'], ['Contacto', 'contact.html'], ['Apadrinar comida', 'about.html'], ['Escribir por WhatsApp', 'about.html']] },
];

function PackageCard({ index }: { index: number }) {
  const pack = packages[index];
  return <article className={`${styles.package} ${index ? styles.smallPackage : ''}`}>
    <div className={styles.packageThumb}><img loading="lazy" {...foto(pack.slug, '(min-width: 992px) 30vw, 90vw')} alt={pack.title} /></div>
    <div className={styles.packageContent}>
      <h3>{pack.title}</h3><p className={styles.price}>Desde {pack.price}</p><p>{pack.text}</p>
    </div>
    <a className={styles.packageButton} href="#ayudar">Quiero aportar</a>
  </article>;
}

export default function LowerSections() {
  const [openQuestion, setOpenQuestion] = useState<number | null>(0);
  const [service, setService] = useState('Donar');
  const [appointmentStatus, setAppointmentStatus] = useState('');
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const update = () => setShowTop(window.scrollY > 500);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);

  function submitAppointment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAppointmentStatus('Gracias por tu intención de ayudar. El canal de contacto está por confirmar; esta solicitud no se ha enviado.');
  }

  return <>
    <section className={`${shared.section} ${styles.pricing}`} id="pricing-sec">
      <img className={styles.priceShapeOne} src={asset('assets/img/shape/shape1-7.png')} alt="" />
      <img className={styles.priceShapeTwo} src={asset('assets/img/shape/shape1-6.png')} alt="" />
      <img className={styles.priceShapeThree} src={asset('assets/img/shape/shape1-24.png')} alt="" />
      <div className={shared.container}>
        <SectionHeading eyebrow="Aportes para comida" title="Ayuda a llenar sus platos" description="No donas a una cuenta genérica: tu aporte se convierte en comida concreta para 90 perros y gatos." center />
        <div className={styles.packages}><PackageCard index={0} /><div className={styles.packageStack}><PackageCard index={1} /><PackageCard index={2} /></div></div>
        <div className={styles.explore}><Button href="#ayudar" outline>Ver la barra de progreso</Button></div>
      </div>
    </section>

    <section className={`${shared.section} ${styles.faq}`} id="faq-sec">
      <div className={`${shared.container} ${styles.faqGrid}`}>
        <div><SectionHeading eyebrow="Antes de ayudar" title="Resolvamos tus preguntas" />
          <div className={styles.questions}>{faqs.map(([question], i) => <div className={styles.question} key={question}>
            <h3><button type="button" aria-expanded={openQuestion === i} aria-controls={`babet-answer-${i}`} onClick={() => setOpenQuestion(openQuestion === i ? null : i)}><span>{i + 1}.</span>{question}<span className={styles.plus} aria-hidden="true">{openQuestion === i ? '−' : '+'}</span></button></h3>
            {openQuestion === i && <div id={`babet-answer-${i}`} className={styles.answer}><p>{faqs[i][1]}</p></div>}
          </div>)}</div>
        </div>
        <div className={styles.faqPicture}><img loading="lazy" {...foto('perro-cafe-lengua-ladrillo', '(min-width: 992px) 40vw, 90vw')} /></div>
      </div>
    </section>

    <section className={`${shared.section} ${styles.appointment}`} id="appointment-sec">
      <div className={shared.container}>
        <div className={styles.appointmentHeading}><SectionHeading eyebrow="Da el primer paso" title="Quiero ayudar" description="Elige cómo te gustaría acompañar. Este formulario es una vista previa y todavía no envía solicitudes." /></div>
        <div className={styles.appointmentGrid}>
          <div className={styles.appointmentPicture}><img loading="lazy" {...foto('tres-perros-sentados', '(min-width: 992px) 40vw, 90vw')} data-recorte="" /></div>
          <form className={styles.appointmentForm} onSubmit={submitAppointment}>
            <div className={styles.serviceChoices}>{['Donar', 'Adoptar', 'Acompañar'].map((name, i) => <button key={name} type="button" aria-pressed={service === name} onClick={() => setService(name)}><img src={asset(`assets/img/icon/appointment-icon-1-${i + 1}.svg`)} alt="" /><span>{name}</span></button>)}</div>
            <input name="visitType" value={service} type="hidden" />
            <div className={styles.formFields}>
              <input aria-label="Tu nombre" name="name" placeholder="Escribe tu nombre*" required autoComplete="name" />
              <input aria-label="Tu número de teléfono" name="phone" type="tel" placeholder="Escribe tu teléfono*" required autoComplete="tel" />
              <input aria-label="Barrio y ciudad" name="pet" placeholder="Tu barrio y ciudad*" required />
              <select aria-label="Elige cómo ayudar" name="service" defaultValue="" required><option value="" disabled>Elige cómo ayudar*</option>{['Aporte para comida', 'Apadrinar comida', 'Adopción responsable', 'Compartir su historia'].map(option => <option key={option}>{option}</option>)}</select>
              <input className={styles.fullField} aria-label="Fecha en que podrías visitar" type="date" name="date" required />
            </div>
            <button className={styles.submit} type="submit">Preparar mi ayuda <Arrow /></button>
            {appointmentStatus && <p className={styles.formStatus} role="status">{appointmentStatus}</p>}
          </form>
        </div>
      </div>
    </section>

    <section className={`${shared.section} ${styles.blog}`} id="blog-sec"><div className={shared.container}>
      <SectionHeading eyebrow="Para acompañar mejor" title="Ayudar empieza por comprender" center />
      <div className={styles.blogGrid}>{articles.map((title, i) => <article className={styles.article} key={title}>
        <a className={styles.articleImage} href="#historia"><img loading="lazy" {...foto(articleSlugs[i], '(min-width: 992px) 30vw, 90vw')} alt={title} /></a>
        <div className={styles.metadata}><a href="#historia"><span aria-hidden="true">♙</span> Huellitas</a><a href="#historia"><span aria-hidden="true">▣</span>Historia de Yesenia</a></div>
        <h3><a href="#historia">{title}</a></h3>
        <div className={styles.readMore}><a href="#historia">Conocer más <Arrow /></a></div>
      </article>)}</div>
    </div></section>

    <PieSitio />
    {showTop && <button className={styles.backTop} type="button" aria-label="Volver arriba" onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })}>↑</button>}
  </>;
}
