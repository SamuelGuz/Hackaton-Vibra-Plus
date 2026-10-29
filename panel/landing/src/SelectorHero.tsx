import { useEffect, useState } from 'react'

// The comparison controls never obscure the story chapters.
export type VersionHero = '1' | '2' | '3' | '4' | '5'

const opciones: { valor: VersionHero; nombre: string }[] = [
  { valor: '1', nombre: 'Creativo' },
  { valor: '2', nombre: 'Rescate real' },
  { valor: '3', nombre: 'Videos' },
  { valor: '4', nombre: 'Reel' },
  { valor: '5', nombre: 'Wild' },
]

const estiloBarra: React.CSSProperties = {
  position: 'fixed',
  insetBlockEnd: 'var(--esp-3)',
  insetInlineStart: '50%',
  transform: 'translateX(-50%)',
  zIndex: 9999,
  display: 'flex',
  gap: 'var(--esp-1)',
  padding: 'var(--esp-1)',
  borderRadius: 'var(--radio-pill)',
  background: 'var(--color-verde)',
  maxWidth: 'calc(100vw - 2 * var(--esp-3))',
}

export default function SelectorHero({
  version,
  onCambiar,
}: {
  version: VersionHero
  onCambiar: (v: VersionHero) => void
}) {
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    const update = () => setVisible(window.scrollY < window.innerHeight * 0.7)
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => { window.removeEventListener('scroll', update); window.removeEventListener('resize', update) }
  }, [])
  if (!visible) return null
  return (
    <nav aria-label="Versión del hero" style={estiloBarra}>
      {opciones.map((o) => {
        const activa = o.valor === version
        return (
          <button
            key={o.valor}
            type="button"
            aria-pressed={activa}
            aria-label={`Hero ${o.valor}: ${o.nombre}`}
            title={`Hero ${o.valor}: ${o.nombre}`}
            onClick={() => {
              onCambiar(o.valor)
              window.scrollTo({ top: 0 })
            }}
            style={{
              border: 0,
              borderRadius: 'var(--radio-pill)',
              padding: 'var(--esp-2) var(--esp-3)',
              minHeight: '3rem',
              minWidth: '3rem',
              font: '500 var(--texto-xs)/1 var(--fuente-texto)',
              cursor: 'pointer',
              color: activa ? 'var(--color-verde)' : 'var(--color-crema)',
              background: activa ? 'var(--color-crema)' : 'transparent',
            }}
          >
            {o.valor}<span className="selectorHeroLabel">. {o.nombre}</span>
          </button>
        )
      })}
    </nav>
  )
}
