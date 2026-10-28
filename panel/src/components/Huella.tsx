/** La huella del logo (misma forma que public/favicon.svg). */
export function Huella({ tamano = 40, color = 'var(--ojo)' }: { tamano?: number; color?: string }) {
  return (
    <svg width={tamano} height={tamano} viewBox="110 130 300 310" aria-hidden="true" fill={color}>
      <path d="M256 268c-52 2-104 52-110 104-5 40 22 62 56 58 22-3 36-14 56-14s33 12 56 14c35 3 60-20 54-60-8-52-60-104-112-102z" />
      <path d="M150 238c-22 4-34 30-27 56 7 25 29 39 49 33 20-7 27-32 20-56-7-23-23-37-42-33z" />
      <path d="M214 150c-24 2-38 30-34 62 4 30 24 50 46 46 23-4 33-32 28-62-5-29-19-48-40-46z" />
      <path d="M300 148c-22-1-38 18-42 46-5 31 6 58 29 62 22 3 41-17 45-48 4-31-11-59-32-60z" />
      <path d="M366 234c-19-5-37 9-44 31-8 25 0 50 20 57 21 6 42-9 49-34 7-26-5-49-25-54z" />
    </svg>
  )
}
