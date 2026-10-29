// Decode actual delivery files, including VP9 alpha, for repeatable visual review.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import ffmpeg from 'ffmpeg-static';
import sharp from 'sharp';

const out = path.resolve('artifacts/video-review');
fs.mkdirSync(out, { recursive: true });
const report = [];
for (let dog = 1; dog <= 3; dog++) {
  const tiles = [];
  for (const ext of ['webm', 'mp4']) {
    const file = `public/media/video/perro-${dog}.${ext}`;
    const probe = spawnSync(ffmpeg, ['-hide_banner', '-i', file], { encoding: 'utf8' }).stderr;
    const dimensions = probe.match(/Video:.*?, (\d+)x(\d+)/);
    if (!dimensions) throw new Error(`Cannot read dimensions: ${file}`);
    const [, width, height] = dimensions.map(Number);
    const decoder = ext === 'webm' ? ['-c:v', 'libvpx-vp9'] : [];
    const decoded = spawnSync(ffmpeg, ['-v', 'error', ...decoder, '-i', file,
      '-vf', 'fps=1', '-pix_fmt', 'rgba', '-f', 'rawvideo', 'pipe:1'],
    { maxBuffer: 160 * 1024 * 1024 });
    if (decoded.status !== 0) throw new Error(decoded.stderr.toString());
    const bytes = width * height * 4;
    const frames = Math.floor(decoded.stdout.length / bytes);
    const duration = probe.match(/Duration: (\d+):(\d+):([\d.]+)/);
    const seconds = Number(duration[1]) * 3600 + Number(duration[2]) * 60 + Number(duration[3]);
    report.push({ file, width, height, seconds, bytes: fs.statSync(file).size, sampledFrames: frames });
    for (const index of [0, Math.floor(frames / 3), Math.floor(frames * 2 / 3), frames - 1]) {
      const rgba = decoded.stdout.subarray(index * bytes, (index + 1) * bytes);
      const input = await sharp(rgba, { raw: { width, height, channels: 4 } }).png().toBuffer();
      for (const background of ['#F3EEE7', '#17221B']) {
        const tile = await sharp(input).flatten({ background }).resize(350, 350, { fit: 'contain', background }).png().toBuffer();
        tiles.push({ input: tile, left: (tiles.length % 4) * 350, top: Math.floor(tiles.length / 4) * 350 });
      }
    }
  }
  await sharp({ create: { width: 1400, height: 1400, channels: 3, background: '#F3EEE7' } })
    .composite(tiles).jpeg({ quality: 92 }).toFile(path.join(out, `perro-${dog}.jpg`));
}
fs.writeFileSync(path.join(out, 'measurements.json'), JSON.stringify(report, null, 2));
fs.writeFileSync(path.join(out, 'index.html'), `<!doctype html><html lang="en"><meta charset="utf-8"><title>Delivery video review</title>
<link rel="stylesheet" href="/src/estilos/tokens.css"><style>body{margin:0;background:var(--color-fondo);color:var(--color-tinta);font-family:system-ui}main{display:grid;grid-template-columns:repeat(3,1fr)}figure{margin:0;padding:var(--esp-3)}figure:nth-child(3n+2){background:var(--color-tinta);color:var(--color-crema)}video{display:block;width:100%;height:220px;object-fit:contain}figcaption{padding:var(--esp-2)}</style><h1>WebM light / WebM dark / MP4 bone fallback</h1><main>${[1,2,3].map(n=>['webm','webm','mp4'].map((ext,i)=>`<figure><video src="/media/video/perro-${n}.${ext}" muted autoplay playsinline loop controls></video><figcaption>perro-${n} ${ext} ${i===1?'dark':'bone'}</figcaption></figure>`).join('')).join('')}</main></html>`);
console.log(JSON.stringify(report, null, 2));
