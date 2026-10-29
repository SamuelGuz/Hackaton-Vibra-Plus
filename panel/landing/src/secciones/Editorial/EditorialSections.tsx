import { useState, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import Boton from '../../componentes/Boton'
import { editorial as copy, historia, type MedioPago } from '../../contenido/historia'
import { img } from '../../contenido/imagenes'
import { enlaceWhatsapp, esPendiente, formatoCop, mostrar } from '../comun/contenido'
import styles from './EditorialSections.module.css'

function Reveal({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion()
  return <motion.div className={className} initial={reduce ? false : { opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}>{children}</motion.div>
}

function Arrow() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15M13 5l7 7-7 7" /></svg>
}

function Payment({ medium, notify }: { medium: MedioPago; notify: (message: string) => void }) {
  const pending = esPendiente(medium.numero)
  async function copyNumber() {
    if (pending) return
    try { await navigator.clipboard.writeText(medium.numero.replace(/\s/g, '')); notify(`Número de ${medium.nombre} copiado.`) }
    catch { notify(`No se pudo copiar. Puedes seleccionar el número de ${medium.nombre} manualmente.`) }
  }
  return <div className={styles.paymentMethod}>
    <div><h4>{medium.nombre}</h4><p className={styles.account}>{mostrar(medium.numero)}</p><p className={styles.holder}>Titular: {mostrar(medium.titular)}</p></div>
    <button type="button" disabled={pending} onClick={() => void copyNumber()} aria-label={`Copiar número de ${medium.nombre}${pending ? ', por confirmar' : ''}`}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2.5" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></svg>
    </button>
  </div>
}

function Donation() {
  const [selected, setSelected] = useState<number | 'other'>(25000)
  const [custom, setCustom] = useState('')
  const [notice, setNotice] = useState('')
  const amount = selected === 'other' ? Number(custom) || 0 : selected
  return <section id="ayudar" className={styles.donation} aria-labelledby="donation-title">
    <span id="donar" className={styles.anchor} /><span id="como-ayuda-tu-aporte" className={styles.anchor} />
    <div className={`contenedor ${styles.donationGrid}`}>
      <div className={styles.donationCopy}>
        <h2 id="donation-title" className={styles.heading}>{copy.donation.title}</h2>
        <p className={styles.lead}>{copy.donation.lead}</p>
        <fieldset className={styles.amountChoices}>
          <legend>{copy.donation.legend}</legend>
          <div className={styles.amounts}>
            {historia.donaciones.map(donation => <label key={donation.montoCop} className={styles.amountOption}>
              <input type="radio" name="editorial-amount" value={donation.montoCop} checked={selected === donation.montoCop} onChange={() => setSelected(donation.montoCop)} />
              <span>{formatoCop(donation.montoCop)}</span>
            </label>)}
            <label className={styles.amountOption}><input type="radio" name="editorial-amount" value="other" checked={selected === 'other'} onChange={() => setSelected('other')} /><span>{copy.donation.other}</span></label>
          </div>
        </fieldset>
        {selected === 'other' && <label className={styles.customAmount}>{copy.donation.customLabel}<input type="text" inputMode="numeric" pattern="[0-9]*" value={custom} onChange={event => setCustom(event.target.value.replace(/\D/g, '').slice(0, 9))} placeholder="Ej. 15000" /></label>}
        <div className={styles.selectedAmount} aria-live="polite"><span>{copy.donation.amountLabel}</span><strong className="cifras">{amount ? formatoCop(amount) : 'A tu medida'}</strong></div>
        <p className={styles.equivalence}>{copy.donation.destinationLabel}: <strong>{mostrar(copy.donation.destination)}</strong></p>
      </div>
      <Reveal className={styles.paymentPanel}>
        <div className={styles.bowl} aria-hidden="true"><svg viewBox="0 0 200 105"><path d="M28 46h144l-17 45H45L28 46Z M20 46h160 M75 30c-18-18 18-18 0-36M103 30c-18-18 18-18 0-36M131 30c-18-18 18-18 0-36" /></svg></div>
        <h3>{copy.donation.paymentTitle}</h3>
        <p>{copy.donation.paymentLead}</p>
        <div className={styles.paymentMethods}>{historia.mediosPago.map(medium => <Payment key={medium.nombre} medium={medium} notify={setNotice} />)}</div>
        <p className={styles.paymentPending}>{copy.donation.pending}</p>
        <p role="status" aria-live="polite" className={styles.notice}>{notice}</p>
      </Reveal>
      <p className={styles.donationSignature}>{copy.donation.purpose}</p>
    </div>
  </section>
}

export default function EditorialSections() {
  const whatsapp = enlaceWhatsapp()
  return <div className={styles.editorial}>
    <section id="historia" className={styles.intro} aria-labelledby="intro-title">
      <span id="el-problema" className={styles.anchor} />
      <div className="contenedor">
        <h2 id="intro-title" className={styles.statement}><span>{copy.intro.first}</span>{' '}<span className={styles.statementLast}><img {...img('gatos-abrazados-foto', '(min-width: 900px) 240px, 100px')} alt="" aria-hidden="true" loading="eager" decoding="async" />{copy.intro.second}</span></h2>
        <div className={styles.introFoot}><p className={styles.lead}>{copy.intro.lead}</p><a href="#quien-es-ella" className={styles.textLink}>{copy.intro.link}<Arrow /></a></div>
      </div>
    </section>

    <section id="quien-es-ella" className={styles.story} aria-labelledby="story-title" data-campo="oscuro">
      <div className={`contenedor ${styles.storyGrid}`}>
        <Reveal className={styles.storyPortrait}><figure><img {...img('perro-cafe-lengua-ladrillo', '(min-width: 900px) 50vw, 92vw')} loading="lazy" decoding="async" /><figcaption>{copy.story.caption}</figcaption></figure><span className={styles.photoLoop} aria-hidden="true" /></Reveal>
        <div className={styles.storyText}>
          <h2 id="story-title" className={styles.heading}>{copy.story.title}</h2>
          <p className={styles.storyLead}>{copy.story.lead}</p><p className={styles.storyDetail}>{copy.story.detail}</p>
          <Boton href="#ayudar" variante="secundario">{copy.story.link}</Boton>
        </div>
      </div>
    </section>

    <section id="el-carnicero" className={styles.ally} aria-labelledby="ally-title">
      <div className={`contenedor ${styles.allyGrid}`}>
        <h2 id="ally-title" className={styles.heading}>{copy.ally.title}</h2>
        <p className={styles.allyLead}>{copy.ally.lead}</p>
        <div className={styles.allyNote}><svg viewBox="0 0 130 100" aria-hidden="true"><path d="M10 20c25 62 73 52 100 10m-25 1 26-4-3 27" /></svg><span>{copy.ally.note}</span></div>
      </div>
    </section>

    <Donation />

    <section id="adoptar" className={styles.adoption} aria-labelledby="adoption-title">
      <div className="contenedor">
        <div className={styles.adoptionHeader}><h2 id="adoption-title" className={styles.heading}>{copy.adoption.title}</h2><p className={styles.lead}>{copy.adoption.lead}</p></div>
        <div className={styles.portraits} aria-label="Galería de imágenes de referencia">
          <Reveal className={styles.portraitTall}><img {...img('cachorro-atigrado-ladrillo', '(min-width: 900px) 30vw, 44vw')} loading="lazy" decoding="async" /></Reveal>
          <Reveal className={styles.portraitWide}><img {...img('gatos-abrazados-foto', '(min-width: 900px) 36vw, 48vw')} loading="lazy" decoding="async" /></Reveal>
          <Reveal className={styles.portraitRound}><img {...img('chihuahua-primer-plano', '(min-width: 900px) 24vw, 36vw')} loading="lazy" decoding="async" /></Reveal>
        </div>
        <p className={styles.caption}>{copy.reference}</p>
        <div className={styles.adoptionDetails}>
          <div className={styles.adoptionAction}>
            <p>{copy.adoption.note}</p>
            {whatsapp ? <Boton href={whatsapp} externo>{copy.adoption.cta}</Boton> : <><button disabled className={styles.disabledAction}>{copy.adoption.cta}<Arrow /></button><span className={styles.pendingLabel}>WhatsApp: {mostrar(historia.adopcion.whatsapp)}</span></>}
            <a className={styles.textLink} href="#ayudar">También puedes ayudar con comida<Arrow /></a>
          </div>
          <div className={styles.accordion}>{copy.adoption.steps.map((step, index) => <details key={step.title} open={index === 0}><summary>{step.title}<span aria-hidden="true" /></summary><p>{step.detail}</p></details>)}</div>
        </div>
      </div>
    </section>

    <section id="transparencia" className={styles.trust} aria-labelledby="trust-title">
      <div className={`contenedor ${styles.trustGrid}`}>
        <div className={styles.trustHeader}><h2 id="trust-title" className={styles.heading}>{copy.trust.title}</h2><p className={styles.lead}>{copy.trust.lead}</p><img {...img('beagle-asomado', '(min-width: 900px) 320px, 200px')} alt="" aria-hidden="true" className={styles.trustDog} loading="lazy" decoding="async" /></div>
        <div className={styles.commitments}>{copy.trust.items.map(item => <article key={item.title}><h3>{item.title}</h3><p>{item.detail}</p></article>)}</div>
      </div>
    </section>

    <section id="llamado-final" className={styles.closing} aria-labelledby="closing-title">
      <div className={`contenedor ${styles.closingGrid}`}><div className={styles.closingText}><h2 id="closing-title">{copy.closing.title}</h2><p className={styles.lead}>{copy.closing.lead}</p><div className={styles.closingActions}><Boton href="#adoptar">{copy.closing.primary}</Boton><a href="#ayudar" className={styles.textLink}>{copy.closing.secondary}<Arrow /></a></div></div><Reveal className={styles.closingPhoto}><img {...img('perro-cafe-lengua-ladrillo', '(min-width: 900px) 32vw, 80vw')} loading="lazy" decoding="async" /></Reveal></div>
    </section>
  </div>
}
