# Validación de entrega móvil — 29 de octubre de 2026

Rama: `pagina-web-final`. Respaldo previo a cambios: `31d2cb1` (publicado primero).

## Cambios

- Cuatro columnas: los cuatro momentos del día y las opciones de monto en `/aportar`.
- Tres columnas: necesidades, fichas breves del inicio y explicaciones del aporte.
- Dos columnas: puertas de ayuda, fichas de adopción, información de historia y actividad.
- Escala más compacta en móvil mediante tokens, sin cambiar zoom ni impedir ampliación.
- Plato SVG ilustrativo que cambia con el monto. Sin equivalencias alimentarias inventadas.
- Pago ofrecido por Nequi y titular; sus datos siguen pendientes y no se pueden copiar.
- Hero, video, paleta, datos de ejemplo y ruta preservada `/huellitas-v5` conservados.

## Verificado

- `npm run typecheck`: pasa.
- `npm run build`: pasa; las seis rutas públicas responden HTTP 200 en el puerto 5394.
- ESLint sobre los cuatro archivos TypeScript modificados/nuevos: cero errores,
  cinco advertencias de imágenes locales ya existentes.
- `npm run check`: bloqueado por 13 errores de lint anteriores en otros archivos.
  El estado recibido tenía 15 errores; se resolvieron los dos de `DonarRapido.tsx`.
  No se desactivaron reglas para ocultarlos.
- Navegador: inicio, aportar, adoptar e historia a 360, 390, 768, 1024 y 1440 px;
  sin desbordamiento horizontal. Sin errores de consola en la revisión.
- Selector: montos fijos, otro valor vacío deshabilitado, monto libre de $15.000,
  paso de pago solo con Nequi/titular y estado de agradecimiento.
- SSR: `/aportar?monto=50000` muestra $50.000 seleccionado, sin error de hidratación.
- En 360 × 800 el botón principal termina aproximadamente a 606 px del borde superior.
- Evidencia: `docs/design-references/mobile-nequi-360.jpg`.

## Pendientes anteriores

Número Nequi, titular y WhatsApp confirmados por Yesenia. El sitio no cobra, verifica
transferencias ni registra donaciones reales. La actividad se conserva como ejemplo.
