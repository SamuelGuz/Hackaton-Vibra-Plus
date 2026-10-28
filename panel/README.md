# Panel Huellitas

PWA en React para el albergue Huellitas. Plan completo: [../docs/PLAN_PANEL.md](../docs/PLAN_PANEL.md).

## Arrancar

```bash
npm install
npm run dev       # abre en http://localhost:5173 y en la red local (para probar en el celular)
npm run build     # revisa tipos y genera dist/
npm run preview   # sirve dist/ (aquí sí funciona el modo sin señal)
```

Para probar en el celular: misma red wifi, abrir la dirección "Network" que imprime `npm run dev`.

## Dónde está cada cosa

| Carpeta | Qué hay |
|---|---|
| `src/design/` | `tokens.css` (colores, tamaños, letras) y `base.css` (textura de papel, fuentes) |
| `src/components/` | Piezas reutilizables (Inicial, Huella, BotonSol…) |
| `src/features/` | Una carpeta por pantalla: `entrar/`, `kit/`… |
| `src/data/` | `tipos.ts` (modelo = pestañas de Sheets), `demo.ts` (datos demo), `DatosProvider.tsx` |
| `src/lib/` | `calculos.ts` (días de comida, caja, dosis), `formato.ts` (pesos, horas), `mano.ts` (formas a mano) |

## Rutas

- `/`: ¿Quién eres?
- `/hoy`: pantalla temporal; aquí va la Fase 2
- `/kit`: revisión del sistema visual (solo para el equipo)

## Reglas

- Colores solo por token (`var(--bien)`), nunca un hex suelto en una pantalla.
- Nada que se toque mide menos de 64 px.
- Las pantallas leen los datos solo con `useDatos()`. Así B puede cambiar la demo por Sheets sin tocarlas.
- Íconos: dibujarlos o ajustarlos a mano, sin librería de íconos por defecto.
