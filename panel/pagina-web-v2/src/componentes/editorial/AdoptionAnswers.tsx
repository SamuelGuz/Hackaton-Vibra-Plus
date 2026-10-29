// Adapted from Rare UI FAQ, copyright (c) 2026 Swami Malode.
// MIT + Commons Clause + Attribution: docs/licenses/rareui.txt.
// Credit: https://rareui.com. CSS Modules, project tokens and non-spring motion replace
// the original styling; the existing site's editorial copy supplies every answer.
import { useId, useState, type KeyboardEvent } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { EDITORIAL_EASE } from './Reveal'
import styles from './AdoptionAnswers.module.css'

type Step = { readonly title: string; readonly detail: string }

export default function AdoptionAnswers({ steps }: { steps: readonly Step[] }) {
  const uid = useId()
  const [openIndex, setOpenIndex] = useState<number | null>(0)
  const reduce = useReducedMotion()

  function navigate(event: KeyboardEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement
    if (!target.matches('[data-adoption-question]')) return
    const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[data-adoption-question]'))
    const current = buttons.indexOf(target as HTMLButtonElement)
    let next: number
    switch (event.key) {
      case 'ArrowDown': next = (current + 1) % buttons.length; break
      case 'ArrowUp': next = (current - 1 + buttons.length) % buttons.length; break
      case 'Home': next = 0; break
      case 'End': next = buttons.length - 1; break
      default: return
    }
    event.preventDefault()
    buttons[next]?.focus()
  }

  return <div className={styles.answers} onKeyDown={navigate}>
    {steps.map((step, index) => {
      const open = index === openIndex
      const questionId = `${uid}-question-${index}`
      const answerId = `${uid}-answer-${index}`
      return <motion.div key={step.title} className={styles.item} layout={reduce ? false : 'position'}
        transition={{ duration: reduce ? 0 : 0.28, ease: EDITORIAL_EASE }}>
        <h3><button type="button" id={questionId} aria-expanded={open} aria-controls={answerId}
          data-adoption-question onClick={() => setOpenIndex(open ? null : index)}>
          <span>{step.title}</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14" /><path className={styles.plus} d="M12 5v14" /></svg>
        </button></h3>
        <div id={answerId} role="region" aria-labelledby={questionId} hidden={!open}>
          <AnimatePresence initial={false}>
            {open && <motion.div key={step.title} className={styles.answer}
              initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduce ? 0 : 0.28, ease: EDITORIAL_EASE }}>
              <p>{step.detail}</p>
            </motion.div>}
          </AnimatePresence>
        </div>
      </motion.div>
    })}
  </div>
}
