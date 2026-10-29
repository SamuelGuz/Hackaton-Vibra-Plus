# Header, footer y logo de Yesenia

Petición del 29 de octubre de 2026: aplicar a toda la web las dos referencias React
adjuntas por el usuario, con su logo sin fondo. Se conserva Next.js, CSS Modules,
los tokens y `motion/react` ya instalado. No se añadieron Tailwind, shadcn ni librerías.

## Implementación

- `src/app/layout.tsx` monta una sola cabecera y un solo footer globales.
- `src/components/marca/HeaderSitio.tsx`: cápsula flotante con rutas locales,
  colapso después de 150px y reapertura al subir 80px desde el máximo alcanzado.
  El botón permite expandirla manualmente. El menú móvil cierra con Escape o clic fuera.
- `src/components/marca/FooterSitio.tsx`: tarjeta blanca dentro de superficie gris,
  directorios del refugio y gran YESENIA en relieve mediante el filtro SVG de la referencia.
  Los accesos rápidos son acciones locales reales; no se inventan redes sociales.
- `Identidad.module.css` y tokens `--marca-*`: estilos compartidos con verde del refugio.
- `public/marca/yesenia-refugio.png`: copia exacta del archivo suministrado, ya transparente
  (RGBA, 500 × 200). No se eliminó ni regeneró ninguna parte del logo.
- Se retira la navegación anterior del hero; su video y animación de apertura se conservan.
- Los modales existentes conservan sus estilos y quedan por encima del header global:
  el shell interno deja de crear un contexto de apilamiento aislado.

## Validación

- Build de producción y TypeScript: pasan.
- ESLint de todos los archivos TypeScript cambiados/nuevos: pasa sin errores ni avisos.
- `npm run check`: sigue bloqueado por 12 errores de lint anteriores en otros archivos.
  Eran 13 antes de este trabajo; el enlace antiguo del hero que causaba uno fue retirado.
- Navegador en `/`, `/historia`, `/adoptar`, `/aportar`, `/como-ayudar`, `/huellitas-v5`:
  identidad compartida y sin desbordamientos a 360, 768 y 1440px.
- Menú móvil: apertura, cierre con Escape y retorno del foco al botón.
- Scroll: cápsula colapsa al bajar y reaparece tras subir desde un punto profundo.
- Modal de adopción: overlay por encima del header, cierre con Escape.
- Sin errores de consola en la revisión. Previsualización de producción en el puerto 5394.
- Capturas: `docs/design-references/identidad-compartida-desktop.jpg`
  y `docs/design-references/identidad-menu-360.jpg`.

Los números de contacto y las políticas pendientes siguen identificados como por confirmar.
