# Yesenia Refugio — solo la portada

Proyecto independiente para publicar únicamente la página de inicio que estaba en
`http://127.0.0.1:5394/`. Incluye su hero con video, secciones, cabecera, footer,
logo transparente, imágenes, fuentes y datos de ejemplo locales.

No contiene el backend del Hackaton, el panel, las páginas internas ni el laboratorio.
Esta rama empieza con un historial independiente que contiene únicamente esta entrega.
Los enlaces se dirigen a secciones de la misma portada; las rutas `/aportar`, `/adoptar`,
`/historia`, `/como-ayudar` y `/huellitas-v5` no existen en este proyecto.

## Instalación

Requisito: Node.js 24 o superior y npm.

```sh
npm ci
npm run check
```

## Desarrollo

```sh
npm run dev
```

Abre `http://127.0.0.1:5394/`.

## Despliegue

El proyecto está en la raíz del repositorio; no hay que elegir una subcarpeta.

- Framework: Next.js.
- Instalar: `npm ci`.
- Compilar: `npm run build`.
- Iniciar en un servidor Node: `npm start`.
- Puerto: variable de entorno `PORT` del alojamiento, o 3000 por defecto.
- En Vercel, seleccionar esta rama y mantener la configuración automática de Next.js.
- No requiere variables de entorno, claves, base de datos ni el resto del Hackaton.

No publicar el servidor de desarrollo. Para producción utilizar el build y el comando
de inicio, o el adaptador Next.js del proveedor.

## Contenido y pagos

`public/data/progreso.json` mantiene los datos marcados como ejemplo. No son un registro
de donaciones reales. El selector de aportes muestra la información de Nequi dentro de
esta misma página. Número, titular y contactos siguen por confirmar; no se inventaron
datos ni se conectó una pasarela de pago.

## Recursos y atribución

Se conservan los recursos locales de la portada original. El logo fue suministrado
por el usuario. La fuente Inter incluye su licencia en `public/media/fonts/Inter-OFL.txt`.
`LICENSE` conserva la licencia del código de la plantilla de origen; no otorga por sí
misma permisos nuevos sobre fotografías, videos o marcas.

## Validación de entrega

- `npm run check`: lint, TypeScript y build de producción.
- La única ruta de contenido del build es `/`; Next.js incluye su respuesta 404 estándar.
- Verificar que los enlaces internos apuntan a identificadores existentes y que las
  páginas retiradas devuelven 404.
