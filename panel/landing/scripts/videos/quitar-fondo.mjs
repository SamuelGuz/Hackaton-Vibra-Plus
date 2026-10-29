#!/usr/bin/env node
// Removes the plain studio background from the three hero dog videos with a very soft,
// feathered edge. No machine learning: a polynomial model of the backdrop + colour-distance key.
//
//   node scripts/videos/quitar-fondo.mjs [--fondo=#RRGGBB] [--solo=perro-1] [--trabajo=<dir>] [--debug=<dir>]
//
// Outputs (public/media/video/):
//   perro-N.webm         VP9 + alpha (Chrome, Edge, Firefox)
//   perro-N.mp4          H.264 composited over --fondo (Safari fallback)
//   perro-N-poster.webp  first frame, with alpha
//
// See docs/videos.md for the method and parameters.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import ffmpegPath from 'ffmpeg-static';
import sharp from 'sharp';
import { gaussBlur, erode, smoothstep, crossfade } from './mate.mjs';
import { fitBackground, evalPlate, keyScore, shadowScore, solidMask } from './llave.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT_DIR = path.join(ROOT, 'public/media/video');
const TOKENS = path.join(ROOT, 'src/estilos/tokens.css');
const DEFAULT_FONDO = '#F3EEE7';

/** Per-video settings. */
const VIDEOS = [
  { id: 'perro-1', src: 'fuentes/VIDEOS-v2/VIDEO 4.mp4' }, // black-and-tan, standing
  { id: 'perro-2', src: 'fuentes/VIDEOS-v2/VIDEO 5.mp4', seconds: 5 }, // <=10s including reverse
  { id: 'perro-3', src: 'fuentes/VIDEOS-v2/VIDEO 3.mp4', seconds: 5 }, // <=10s including reverse
];

/** Pixel values are at OUTPUT resolution (the crop is never rescaled; sources are 1280x720). */
const COMMON = {
  fps: 24,
  maxHeight: 720,
  padding: 0.06, // margin around the dog's union bounding box, fraction of each side
  // Foreground score thresholds (see llave.mjs keyScore): relative luminance drop, relative
  // brightening, and colour-cast distance from the backdrop (0..255 units).
  key: { dark: [0.2, 0.34], bright: [0.05, 0.1], chroma: [9, 18] },
  erodePx: 2, // shrink the binary matte so no backdrop pixel survives
  featherSigma: 2.5, // preserve ears and paws while retaining a soft edge
  colorSigma: 7, // how far confident fur colour is pushed outwards into the fringe
  temporal: [1, 6, 1], // prioritize the current silhouette to avoid trailing tails
  shadow: { start: 0.05, full: 0.22, maxAlpha: 0.22, sigma: 7, color: [58, 50, 44] },
  loopFrames: 12, // cross-fade length (0.5 s) when the video does not already loop
  loopTolerance: 3, // last->first jump allowed, in multiples of the median frame-to-frame change
  pingpongAbove: 10, // a bigger jump (pose change) would ghost in a cross-fade: play forward then backward
  vp9Crf: 34,
  x264Crf: 22,
};

// ---------------------------------------------------------------- args
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, '').split('=');
    return [k, v.length ? v.join('=') : true];
  }),
);

function normaliseHex(v, name) {
  const s = v.startsWith('#') ? v : `#${v}`;
  if (!/^#[0-9a-f]{6}$/i.test(s)) {
    console.error(`${name} must be #RRGGBB, got "${v}"`);
    process.exit(2);
  }
  return s.toUpperCase();
}

function resolveFondo() {
  if (typeof args.fondo === 'string') return normaliseHex(args.fondo, '--fondo');
  if (fs.existsSync(TOKENS)) {
    const m = fs.readFileSync(TOKENS, 'utf8').match(/--fondo-hero\s*:\s*([^;]+);/);
    if (m) {
      const hex = m[1].trim();
      if (/^#[0-9a-f]{6}$/i.test(hex)) {
        console.log(`fondo: ${hex} (from src/estilos/tokens.css --fondo-hero)`);
        return hex.toUpperCase();
      }
      console.warn(`warning: --fondo-hero is "${hex}", not a #RRGGBB value; using ${DEFAULT_FONDO}`);
    }
  }
  return DEFAULT_FONDO;
}

function ffmpeg(argv) {
  const r = spawnSync(ffmpegPath, ['-hide_banner', '-loglevel', 'error', '-y', ...argv], { stdio: 'inherit' });
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${argv.join(' ')}`);
}

/** Streams decoded RGB frames (w x h, rgb24) of a video through an ffmpeg video filter. */
async function* rawFrames(input, vf, w, h) {
  const size = w * h * 3;
  const seconds = VIDEOS.find((video) => path.join(ROOT, video.src) === input)?.seconds;
  const limit = seconds ? ['-t', String(seconds)] : [];
  const p = spawn(ffmpegPath, ['-hide_banner', '-loglevel', 'error', '-i', input, ...limit, '-an', '-vf', `fps=${COMMON.fps},${vf}`, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], {
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  const closed = new Promise((res) => p.on('close', res));
  let chunks = [];
  let have = 0;
  for await (const c of p.stdout) {
    chunks.push(c);
    have += c.length;
    while (have >= size) {
      const all = Buffer.concat(chunks);
      yield new Uint8Array(all.subarray(0, size)); // copy: the pool buffer is reused
      const rest = all.subarray(size);
      chunks = [rest];
      have = rest.length;
    }
  }
  if ((await closed) !== 0) throw new Error(`ffmpeg decode failed for ${input}`);
}

/** Mean absolute difference of two straight-alpha RGBA frames, compared premultiplied. */
function frameDiff(a, b) {
  let acc = 0;
  for (let i = 0; i < a.length; i += 4) {
    const aa = a[i + 3] / 255, ab = b[i + 3] / 255;
    acc += Math.abs(aa - ab) * 255;
    for (let c = 0; c < 3; c++) acc += Math.abs(a[i + c] * aa - b[i + c] * ab);
  }
  return acc / (a.length / 4);
}

const even = (n) => Math.max(2, Math.round(n / 2) * 2);

// ---------------------------------------------------------------- stages

/**
 * Stage 1, on 640x360 copies of all frames: fit the backdrop, key every frame and take the union
 * bounding box of the dog. Returns the fit and the crop box in source pixels.
 */
async function analyse(src, probe) {
  const W = 640, H = 360, K = 2; // K = source pixels per analysis pixel
  const frames = [];
  for await (const f of rawFrames(src, `scale=${W}:${H}:flags=area`, W, H)) frames.push(f);
  const fit = fitBackground(frames, W, H);
  const plate = evalPlate(fit, W, H, 0, 0, W, H);
  let x0 = W, y0 = H, x1 = 0, y1 = 0;
  for (const f of frames) {
    const m = solidMask(keyScore(f, plate, W * H, COMMON.key), W, H);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (!m[y * W + x]) continue;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  const sw = W * K, sh = H * K;
  const bw = (x1 - x0 + 1) * K, bh = (y1 - y0 + 1) * K;
  // Margin: ~6% of each side, never less than what the feather needs to fade out completely.
  const minPad = Math.ceil(2.5 * COMMON.featherSigma + COMMON.erodePx);
  const padX = Math.max(Math.round(bw * COMMON.padding), minPad);
  const padY = Math.max(Math.round(bh * COMMON.padding), minPad);
  const left = Math.max(0, Math.floor((x0 * K - padX) / 2) * 2);
  const top = Math.max(0, Math.floor((y0 * K - padY) / 2) * 2);
  const right = Math.min(sw, Math.ceil(((x1 + 1) * K + padX) / 2) * 2);
  const bottom = Math.min(sh, Math.ceil(((y1 + 1) * K + padY) / 2) * 2);
  void probe;
  return { fit, sw, sh, box: { x: left, y: top, w: even(right - left), h: even(bottom - top) }, frames: frames.length };
}

/** Stage 2: binary subject mask + raw shadow strength for every frame, at crop resolution. */
async function keyAll(src, an) {
  const { box } = an;
  const { w, h } = box;
  const n = w * h;
  const plate = evalPlate(an.fit, an.sw, an.sh, box.x, box.y, w, h);
  const masks = [];
  const shadows = [];
  for await (const rgb of rawFrames(src, `crop=${w}:${h}:${box.x}:${box.y}`, w, h)) {
    // A touch of blur on the score removes compression noise before the threshold.
    const score = gaussBlur(keyScore(rgb, plate, n, COMMON.key), w, h, 1);
    const mask = solidMask(score, w, h);
    const m8 = new Uint8Array(n);
    for (let i = 0; i < n; i++) m8[i] = mask[i] * 255;
    masks.push(m8);
    const sh = shadowScore(rgb, plate, n, COMMON.shadow);
    const s8 = new Uint8Array(n);
    for (let i = 0; i < n; i++) s8[i] = Math.round(sh[i] * 255);
    shadows.push(s8);
  }
  return { masks, shadows, plate };
}

/** Weighted average over neighbouring frames (clamped at the ends) of uint8 planes. */
function temporal(planes, f, weights, n) {
  const half = (weights.length - 1) / 2;
  const out = new Float32Array(n);
  let wsum = 0;
  weights.forEach((wt, j) => {
    const p = planes[Math.min(planes.length - 1, Math.max(0, f + j - half))];
    wsum += wt;
    for (let i = 0; i < n; i++) out[i] += p[i] * wt;
  });
  for (let i = 0; i < n; i++) out[i] /= wsum * 255;
  return out;
}

/**
 * Builds the straight-alpha RGBA frame: soft alpha from the smoothed matte, fur colours pushed
 * outwards into the fringe (no grey halo), plus an optional faint ground shadow.
 */
function composeFrame(rgb, core, shadowRaw, w, h, gate, p) {
  const n = w * h;
  // Soft alpha: erode, then Gaussian blur.
  const alpha = gaussBlur(erode(core, w, h, p.erodePx), w, h, p.featherSigma);

  // Colour decontamination: confident interior colour (eroded further than the alpha) is blurred
  // outwards, normalised by its weight; the original pixel is used only deep inside the dog.
  const conf = erode(core, w, h, p.erodePx + 2);
  const cb = gaussBlur(conf, w, h, p.colorSigma);
  const ext = [0, 1, 2].map((c) => {
    const ch = new Float32Array(n);
    for (let i = 0; i < n; i++) ch[i] = rgb[i * 3 + c] * conf[i];
    return gaussBlur(ch, w, h, p.colorSigma);
  });

  // Faint soft shadow: only near the dog and below its middle; capped at maxAlpha.
  const sh = gaussBlur(shadowRaw, w, h, p.shadow.sigma);
  const near = gaussBlur(core, w, h, 18);
  const out = new Uint8Array(n * 4);
  const [sr, sg, sb] = p.shadow.color;
  for (let i = 0; i < n; i++) {
    const y = (i / w) | 0;
    const a = Math.min(1, Math.max(0, alpha[i]));
    const aS = p.shadow.maxAlpha * sh[i] * smoothstep(0.02, 0.2, near[i]) * gate[y] * (1 - a);
    const t = smoothstep(0.55, 0.95, conf[i]);
    const wb = cb[i];
    const aT = a + aS;
    for (let c = 0; c < 3; c++) {
      const orig = rgb[i * 3 + c];
      const pushed = wb > 1e-3 ? ext[c][i] / wb : orig;
      const fur = pushed + (orig - pushed) * t;
      const sc = c === 0 ? sr : c === 1 ? sg : sb;
      out[i * 4 + c] = Math.round(aT > 1e-4 ? (fur * a + sc * aS) / aT : fur);
    }
    out[i * 4 + 3] = Math.round(Math.min(1, aT) * 255);
  }
  return out;
}

async function processVideo(video, work, fondo) {
  console.log(`\n== ${video.id}`);
  const t0 = Date.now();
  const src = path.join(ROOT, video.src);
  const dir = path.join(work, video.id);
  const rgbaDir = path.join(dir, 'rgba');
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(rgbaDir, { recursive: true });

  const an = await analyse(src);
  const { box } = an;
  const w = box.w, h = box.h;
  if (h > COMMON.maxHeight) throw new Error(`crop ${w}x${h} is taller than ${COMMON.maxHeight}`);
  console.log(`${an.frames} frames, backdrop fit degree ${an.fit.deg}, crop ${w}x${h} at ${box.x},${box.y}`);

  const { masks, shadows } = await keyAll(src, an);
  const n = w * h;

  // Shadow gate: only in the lower half of the dog's box (the floor), fading in/out softly.
  const gate = new Float32Array(h);
  for (let y = 0; y < h; y++) gate[y] = smoothstep(0.45 * h, 0.7 * h, y) * smoothstep(0, 0.04 * h, h - 1 - y);

  const total = masks.length;
  const file = (i) => path.join(rgbaDir, `${String(i + 1).padStart(4, '0')}.png`);
  const writeFrame = (i, px) =>
    sharp(Buffer.from(px.buffer, px.byteOffset, px.length), { raw: { width: w, height: h, channels: 4 } })
      .png({ compressionLevel: 1 })
      .toFile(file(i));
  const readFrame = async (i) => new Uint8Array(await sharp(file(i)).raw().toBuffer());

  // Write every frame; keep the first one and the previous one to measure how much the picture
  // changes from frame to frame and from the last frame back to the first.
  let first = null, prev = null;
  const steps = [];
  let f = 0;
  for await (const rgb of rawFrames(src, `crop=${w}:${h}:${box.x}:${box.y}`, w, h)) {
    const core = temporal(masks, f, COMMON.temporal, n);
    // Neighbouring frames may stabilize the interior, but must never introduce studio
    // pixels where a fast-moving tail/ear has already left the current frame.
    for (let i = 0; i < n; i++) core[i] *= masks[f][i] / 255;
    const shadow = temporal(shadows, f, COMMON.temporal, n);
    const px = composeFrame(rgb, core, shadow, w, h, gate, COMMON);
    await writeFrame(f, px);
    if (prev) steps.push(frameDiff(prev, px));
    else first = px;
    prev = px;
    f++;
  }
  const wrap = frameDiff(prev, first);
  const typical = [...steps].sort((p, q) => p - q)[Math.floor(steps.length / 2)];
  const ratio = wrap / Math.max(typical, 1e-6);
  // Loop: if the last frame is about as close to the first as any two neighbouring frames are,
  // the loop is already seamless. A moderate difference cross-fades the last 0.5 s into the start;
  // a pose change too big for that (it would ghost) plays the clip forward and then backward.
  let keep = total;
  let loopNote = 'seamless (last frame matches first)';
  if (video.seconds || ratio > COMMON.pingpongAbove) {
    let count = total;
    for (let i = total - 2; i >= 1; i--) fs.copyFileSync(file(i), file(count++));
    keep = count;
    loopNote = `ping-pong (last frame is ${ratio.toFixed(0)}x a normal step away from the first; plays forward, then backward)`;
  } else if (ratio > COMMON.loopTolerance) {
    const K = Math.min(COMMON.loopFrames, Math.floor(total / 4));
    keep = total - K;
    for (let i = 0; i < K; i++) {
      const tail = await readFrame(keep + i);
      const head = await readFrame(i);
      await writeFrame(i, crossfade(tail, head, (i + 1) / (K + 1)));
    }
    for (let i = keep; i < total; i++) fs.rmSync(file(i));
    loopNote = `cross-fade of the last ${K} frames (jump ${ratio.toFixed(1)}x a normal step)`;
  }
  console.log(`${keep} frames (${(keep / COMMON.fps).toFixed(2)} s), loop: ${loopNote}; ${((Date.now() - t0) / 1000).toFixed(0)} s`);

  if (typeof args.debug === 'string') {
    fs.mkdirSync(args.debug, { recursive: true });
    for (const i of [0, Math.floor(keep / 2), keep - 1]) {
      fs.copyFileSync(file(i), path.join(args.debug, `${video.id}-rgba-${String(i).padStart(3, '0')}.png`));
    }
  }

  const seq = path.join(rgbaDir, '%04d.png');
  const color709 = ['-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709'];
  const TO_709 = 'scale=out_color_matrix=bt709:out_range=tv:flags=accurate_rnd+full_chroma_int';
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const webm = path.join(OUT_DIR, `${video.id}.webm`);
  ffmpeg([
    '-framerate', String(COMMON.fps), '-i', seq,
    '-vf', `${TO_709},format=yuva420p`,
    '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-auto-alt-ref', '0',
    '-b:v', '0', '-crf', String(COMMON.vp9Crf), '-deadline', 'good', '-cpu-used', '2', '-row-mt', '1',
    ...color709, '-an', webm,
  ]);

  // The fondo is a PNG, not ffmpeg's lavfi colour source (generated in BT.601 YUV, it drifts a few
  // RGB levels). Composite in RGB, then one explicit RGB -> BT.709 conversion, so the decoded
  // colour matches the CSS hex and the video edge disappears into the page.
  const fondoPng = path.join(dir, 'fondo.png');
  await sharp({ create: { width: w, height: h, channels: 3, background: fondo } }).png().toFile(fondoPng);
  const mp4 = path.join(OUT_DIR, `${video.id}.mp4`);
  ffmpeg([
    '-loop', '1', '-framerate', String(COMMON.fps), '-i', fondoPng,
    '-framerate', String(COMMON.fps), '-i', seq,
    '-filter_complex',
    `[0:v]format=rgb24[b];[1:v]format=rgba[f];[b][f]overlay=shortest=1:format=rgb,${TO_709},format=yuv420p`,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', String(COMMON.x264Crf), '-profile:v', 'high',
    ...color709, '-movflags', '+faststart', '-an', mp4,
  ]);

  const poster = path.join(OUT_DIR, `${video.id}-poster.webp`);
  await sharp(file(0)).webp({ quality: 82, alphaQuality: 90, effort: 6 }).toFile(poster);

  for (const p of [webm, mp4, poster]) {
    console.log(`  ${path.relative(ROOT, p)}  ${(fs.statSync(p).size / 1024).toFixed(0)} KB`);
  }
  return { id: video.id, width: w, height: h };
}

// ---------------------------------------------------------------- main
const fondo = resolveFondo();
const keepWork = typeof args.trabajo === 'string';
const work = keepWork ? path.resolve(args.trabajo) : fs.mkdtempSync(path.join(os.tmpdir(), 'quitar-fondo-'));
fs.mkdirSync(work, { recursive: true });
console.log(`work dir: ${work}\nfondo (mp4 fallback): ${fondo}`);

try {
  const selected = VIDEOS.filter((v) => !args.solo || v.id === args.solo);
  const results = [];
  for (const v of selected) results.push(await processVideo(v, work, fondo));
  console.log('\nsizes (width x height):');
  for (const r of results) console.log(`  ${r.id}: ${r.width} x ${r.height}  (${(r.width / r.height).toFixed(4)})`);
} finally {
  if (!keepWork) fs.rmSync(work, { recursive: true, force: true });
}
