'use client'

import { useCallback, type ReactNode } from 'react'

/**
 * Corazoncitos sutiles. No hay bucle: cada disparo crea entre 3 y 6 corazones que viven
 * 1.6 a 2.2 s y se eliminan del DOM al terminar. Opacidad maxima .7, pointer-events none.
 * Con prefers-reduced-motion se muestra un solo corazon con fade de 400 ms, sin desplazamiento.
 * Entre disparos hay una pausa minima para que nunca se sienta insistente.
 *
 * Uso sin proveedor:  const { lanzar, lanzarDesde } = useCorazones();  lanzar(x, y, 5)
 * `x` e `y` son coordenadas de pantalla (clientX / clientY). `lanzarDesde(elemento)` usa su centro.
 */

const PAUSA_MINIMA_MS = 2500
const CURVA = 'cubic-bezier(0.22, 1, 0.36, 1)'
const COLORES = ['#1f5a3a', '#1f5a3a', '#b9ad94']
const FORMA =
  'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z'

let ultimoDisparo = -Infinity

function contenedor(): HTMLElement {
  const id = 'huellitas-corazones'
  let el = document.getElementById(id)
  if (!el) {
    el = document.createElement('div')
    el.id = id
    el.setAttribute('aria-hidden', 'true')
    el.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:300;overflow:hidden'
    document.body.appendChild(el)
  }
  return el
}

function corazon(color: string, tam: number): HTMLElement {
  const el = document.createElement('span')
  el.style.cssText = `position:absolute;left:0;top:0;width:${tam}px;height:${tam}px;opacity:0;will-change:transform,opacity`
  el.innerHTML = `<svg viewBox="0 0 24 24" width="${tam}" height="${tam}" fill="${color}" style="display:block"><path d="${FORMA}"/></svg>`
  return el
}

export function lanzarCorazones(x: number, y: number, cantidad = 5): void {
  if (typeof document === 'undefined') return
  const ahora = performance.now()
  if (ahora - ultimoDisparo < PAUSA_MINIMA_MS) return
  ultimoDisparo = ahora
  const caja = contenedor()
  const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (reducido) {
    const c = corazon(COLORES[0], 18)
    c.style.transform = `translate(${x - 9}px, ${y - 9}px)`
    caja.appendChild(c)
    const a = c.animate([{ opacity: 0 }, { opacity: 0.6, offset: 0.4 }, { opacity: 0 }], { duration: 400, easing: 'linear' })
    a.onfinish = () => c.remove()
    return
  }

  const n = Math.max(3, Math.min(6, Math.round(cantidad)))
  for (let i = 0; i < n; i++) {
    const tam = 10 + Math.round(Math.random() * 8)
    const c = corazon(COLORES[i % COLORES.length], tam)
    caja.appendChild(c)
    const dx = (Math.random() - 0.5) * 64
    const dy = 60 + Math.random() * 60
    const ini = `translate(${x - tam / 2}px, ${y - tam / 2}px) scale(.6)`
    const fin = `translate(${x - tam / 2 + dx}px, ${y - tam / 2 - dy}px) scale(1)`
    const a = c.animate(
      [
        { transform: ini, opacity: 0 },
        { transform: `translate(${x - tam / 2 + dx * 0.3}px, ${y - tam / 2 - dy * 0.3}px) scale(.9)`, opacity: 0.7, offset: 0.25 },
        { transform: fin, opacity: 0 },
      ],
      { duration: 1600 + Math.random() * 600, delay: i * 90, easing: CURVA, fill: 'backwards' },
    )
    a.onfinish = () => c.remove()
  }
}

export function lanzarDesde(el: Element | null, cantidad = 5): void {
  if (!el) return
  const r = el.getBoundingClientRect()
  lanzarCorazones(r.left + r.width / 2, r.top + r.height / 2, cantidad)
}

export function useCorazones() {
  const lanzar = useCallback((x: number, y: number, n?: number) => lanzarCorazones(x, y, n), [])
  const lanzarEn = useCallback((el: Element | null, n?: number) => lanzarDesde(el, n), [])
  return { lanzar, lanzarDesde: lanzarEn }
}

/** Compatibilidad: no hace falta envolver nada, el efecto es autonomo. */
export function CorazonesProvider({ children }: { children: ReactNode }) {
  return <>{children}</>
}
