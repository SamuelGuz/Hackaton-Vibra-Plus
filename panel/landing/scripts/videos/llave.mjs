// Backdrop model and keying maths for the plain studio backgrounds (no ML).
import { smoothstep } from './mate.mjs';

// ------------------------------------------------------------------ backdrop model

const termCount = (deg) => ((deg + 1) * (deg + 2)) / 2;

/** Polynomial terms u^i v^j with i + j <= deg, written into out. */
function polyTerms(u, v, deg, out) {
  let k = 0;
  for (let i = 0; i <= deg; i++) for (let j = 0; j <= deg - i; j++) out[k++] = u ** i * v ** j;
}

/** Solves A x = b (A: T x T, b: T x C, row-major) by Gaussian elimination; returns T x C. */
function solve(A, b, T, C) {
  const M = Float64Array.from(A);
  const B = Float64Array.from(b);
  for (let col = 0; col < T; col++) {
    let piv = col;
    for (let r = col + 1; r < T; r++) if (Math.abs(M[r * T + col]) > Math.abs(M[piv * T + col])) piv = r;
    if (piv !== col) {
      for (let k = 0; k < T; k++) [M[col * T + k], M[piv * T + k]] = [M[piv * T + k], M[col * T + k]];
      for (let k = 0; k < C; k++) [B[col * C + k], B[piv * C + k]] = [B[piv * C + k], B[col * C + k]];
    }
    const d = M[col * T + col] || 1e-12;
    for (let r = col + 1; r < T; r++) {
      const f = M[r * T + col] / d;
      if (f === 0) continue;
      for (let k = col; k < T; k++) M[r * T + k] -= f * M[col * T + k];
      for (let k = 0; k < C; k++) B[r * C + k] -= f * B[col * C + k];
    }
  }
  const x = new Float64Array(T * C);
  for (let r = T - 1; r >= 0; r--) {
    for (let k = 0; k < C; k++) {
      let acc = B[r * C + k];
      for (let c = r + 1; c < T; c++) acc -= M[r * T + c] * x[c * C + k];
      x[r * C + k] = acc / (M[r * T + r] || 1e-12);
    }
  }
  return x;
}

/**
 * Fits the studio backdrop (vignette + floor gradient) as a smooth 2D polynomial per colour
 * channel, using only pixels that look like backdrop. The subject is rejected by robust
 * iteration: fit, drop pixels far from the fit, refit with a tighter threshold.
 *
 * @param {Uint8Array[]} frames interleaved RGB frames, all W x H
 * @returns {{deg:number, coef:Float64Array}} coef is (terms x 3)
 */
export function fitBackground(frames, W, H, { stride = 4, sample = 12, plan } = {}) {
  const U = [], V = [], R = [], G = [], Bc = [];
  for (let f = 0; f < frames.length; f += sample) {
    const px = frames[f];
    for (let y = 0; y < H; y += stride) {
      for (let x = 0; x < W; x += stride) {
        const i = (y * W + x) * 3;
        U.push(((x + 0.5) / W) * 2 - 1);
        V.push(((y + 0.5) / H) * 2 - 1);
        R.push(px[i]); G.push(px[i + 1]); Bc.push(px[i + 2]);
      }
    }
  }
  const N = U.length;
  let mask = new Uint8Array(N);
  // Start from the left/right/top rims, where the subject never is, and grow outwards.
  for (let i = 0; i < N; i++) mask[i] = Math.abs(U[i]) > 0.8 || V[i] < -0.8 ? 1 : 0;
  const rounds = plan ?? [[2, 30], [2, 20], [3, 14], [4, 10], [4, 8], [4, 7]]; // [degree, next threshold]
  const tmp = new Float64Array(20);
  let fit = null;
  for (const [deg, thr] of rounds) {
    const T = termCount(deg);
    const AtA = new Float64Array(T * T);
    const Atb = new Float64Array(T * 3);
    for (let i = 0; i < N; i++) {
      if (!mask[i]) continue;
      polyTerms(U[i], V[i], deg, tmp);
      for (let a = 0; a < T; a++) {
        for (let b = a; b < T; b++) AtA[a * T + b] += tmp[a] * tmp[b];
        Atb[a * 3] += tmp[a] * R[i];
        Atb[a * 3 + 1] += tmp[a] * G[i];
        Atb[a * 3 + 2] += tmp[a] * Bc[i];
      }
    }
    for (let a = 0; a < T; a++) for (let b = 0; b < a; b++) AtA[a * T + b] = AtA[b * T + a];
    for (let a = 0; a < T; a++) AtA[a * T + a] += 1e-6;
    const coef = solve(AtA, Atb, T, 3);
    fit = { deg, coef };
    const next = new Uint8Array(N);
    for (let i = 0; i < N; i++) {
      polyTerms(U[i], V[i], deg, tmp);
      let r = 0, g = 0, b = 0;
      for (let a = 0; a < T; a++) {
        r += coef[a * 3] * tmp[a];
        g += coef[a * 3 + 1] * tmp[a];
        b += coef[a * 3 + 2] * tmp[a];
      }
      next[i] = Math.max(Math.abs(R[i] - r), Math.abs(G[i] - g), Math.abs(Bc[i] - b)) < thr ? 1 : 0;
    }
    mask = next;
  }
  return fit;
}

/**
 * Evaluates the fitted backdrop for a w x h window whose top-left is (x0, y0) inside a W x H
 * grid. Returns interleaved Float32 RGB.
 */
export function evalPlate({ deg, coef }, W, H, x0, y0, w, h) {
  const T = termCount(deg);
  const out = new Float32Array(w * h * 3);
  const terms = [];
  for (let i = 0; i <= deg; i++) for (let j = 0; j <= deg - i; j++) terms.push([i, j]);
  const powU = Array.from({ length: deg + 1 }, (_, i) =>
    Float64Array.from({ length: w }, (_, x) => (((x0 + x + 0.5) / W) * 2 - 1) ** i));
  for (let y = 0; y < h; y++) {
    const v = ((y0 + y + 0.5) / H) * 2 - 1;
    const powV = Array.from({ length: deg + 1 }, (_, j) => v ** j);
    for (let x = 0; x < w; x++) {
      let r = 0, g = 0, b = 0;
      for (let t = 0; t < T; t++) {
        const m = powU[terms[t][0]][x] * powV[terms[t][1]];
        r += coef[t * 3] * m;
        g += coef[t * 3 + 1] * m;
        b += coef[t * 3 + 2] * m;
      }
      const o = (y * w + x) * 3;
      out[o] = r; out[o + 1] = g; out[o + 2] = b;
    }
  }
  return out;
}

// ------------------------------------------------------------------ keying

/**
 * Foreground score 0..1 per pixel against the backdrop plate. A pixel is subject if it is much
 * darker than the backdrop (a soft floor shadow is darkened only a little and stays neutral),
 * clearly brighter (white fur), or has a different colour cast (tan/brown fur).
 */
export function keyScore(rgb, plate, n, p) {
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const R = rgb[i * 3], G = rgb[i * 3 + 1], B = rgb[i * 3 + 2];
    const r0 = plate[i * 3], g0 = plate[i * 3 + 1], b0 = plate[i * 3 + 2];
    const lum = 0.299 * R + 0.587 * G + 0.114 * B;
    const lum0 = 0.299 * r0 + 0.587 * g0 + 0.114 * b0;
    const ratio = lum / Math.max(lum0, 1);
    const dr = R - lum - (r0 - lum0), dg = G - lum - (g0 - lum0), db = B - lum - (b0 - lum0);
    const chroma = Math.sqrt(dr * dr + dg * dg + db * db);
    out[i] = Math.max(
      smoothstep(p.dark[0], p.dark[1], 1 - ratio),
      smoothstep(p.bright[0], p.bright[1], ratio - 1),
      smoothstep(p.chroma[0], p.chroma[1], chroma),
    );
  }
  return out;
}

/** Soft ground-shadow strength 0..1 per pixel: neutral darkening of the backdrop. */
export function shadowScore(rgb, plate, n, p) {
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const lum = 0.299 * rgb[i * 3] + 0.587 * rgb[i * 3 + 1] + 0.114 * rgb[i * 3 + 2];
    const lum0 = 0.299 * plate[i * 3] + 0.587 * plate[i * 3 + 1] + 0.114 * plate[i * 3 + 2];
    out[i] = smoothstep(p.start, p.full, 1 - lum / Math.max(lum0, 1));
  }
  return out;
}

/** 4-connected labelling of pixels where bin === value. */
function label(bin, value, w, h) {
  const n = w * h;
  const lab = new Int32Array(n);
  const stack = new Int32Array(n);
  const areas = [0];
  const border = [false];
  let count = 0;
  for (let s = 0; s < n; s++) {
    if (bin[s] !== value || lab[s]) continue;
    count++;
    lab[s] = count;
    let sp = 0, area = 0, touches = false;
    stack[sp++] = s;
    while (sp) {
      const i = stack[--sp];
      area++;
      const x = i % w, y = (i - x) / w;
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) touches = true;
      if (x > 0 && bin[i - 1] === value && !lab[i - 1]) { lab[i - 1] = count; stack[sp++] = i - 1; }
      if (x < w - 1 && bin[i + 1] === value && !lab[i + 1]) { lab[i + 1] = count; stack[sp++] = i + 1; }
      if (y > 0 && bin[i - w] === value && !lab[i - w]) { lab[i - w] = count; stack[sp++] = i - w; }
      if (y < h - 1 && bin[i + w] === value && !lab[i + w]) { lab[i + w] = count; stack[sp++] = i + w; }
    }
    areas.push(area);
    border.push(touches);
  }
  return { lab, areas, border };
}

/**
 * Binary subject mask from a score: threshold, keep only components that are not tiny compared
 * with the largest one (drops noise and stray shadow blobs), fill enclosed holes (white chest
 * fur that still differs a little from the backdrop) up to a fraction of the subject area.
 * @returns {Uint8Array} 0/1
 */
export function solidMask(score, w, h, { thr = 0.5, minRel = 0.03, maxHoleRel = 0.03, holeMinScore = 0.1 } = {}) {
  const n = w * h;
  const bin = new Uint8Array(n);
  for (let i = 0; i < n; i++) bin[i] = score[i] > thr ? 1 : 0;
  const fg = label(bin, 1, w, h);
  let maxArea = 1;
  for (const a of fg.areas) if (a > maxArea) maxArea = a;
  const out = new Uint8Array(n);
  for (let i = 0; i < n; i++) out[i] = fg.lab[i] && fg.areas[fg.lab[i]] >= minRel * maxArea ? 1 : 0;
  // A hole is filled only if it is small AND its pixels still differ a little from the backdrop
  // (white chest fur). Backdrop seen through a gap (between leg and body) scores ~0 and stays open.
  const bg = label(out, 0, w, h);
  const sum = new Float64Array(bg.areas.length);
  for (let i = 0; i < n; i++) if (bg.lab[i]) sum[bg.lab[i]] += score[i];
  for (let i = 0; i < n; i++) {
    const l = bg.lab[i];
    if (l && !bg.border[l] && bg.areas[l] <= maxHoleRel * maxArea && sum[l] / bg.areas[l] >= holeMinScore) out[i] = 1;
  }
  return out;
}
