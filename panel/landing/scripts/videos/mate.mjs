// Pure image helpers for the background key: blur, morphology, polynomial backdrop fit, foreground score, cleanup.
// All buffers are planar Float32Array (one value per pixel) unless stated otherwise.

/** One horizontal + one vertical running-sum box blur of radius r (edges clamped). */
function boxBlur(src, w, h, r) {
  if (r < 1) return Float32Array.from(src);
  const tmp = new Float32Array(w * h);
  const out = new Float32Array(w * h);
  const norm = 1 / (2 * r + 1);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    let acc = 0;
    for (let k = -r; k <= r; k++) acc += src[row + Math.min(w - 1, Math.max(0, k))];
    for (let x = 0; x < w; x++) {
      tmp[row + x] = acc * norm;
      acc += src[row + Math.min(w - 1, x + r + 1)] - src[row + Math.max(0, x - r)];
    }
  }
  for (let x = 0; x < w; x++) {
    let acc = 0;
    for (let k = -r; k <= r; k++) acc += tmp[Math.min(h - 1, Math.max(0, k)) * w + x];
    for (let y = 0; y < h; y++) {
      out[y * w + x] = acc * norm;
      acc += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x];
    }
  }
  return out;
}

/** Gaussian blur approximated by three box blurs (error < 3%). */
export function gaussBlur(src, w, h, sigma) {
  if (sigma <= 0) return Float32Array.from(src);
  // Box radius whose three passes match the requested variance.
  const r = Math.max(1, Math.round((Math.sqrt(4 * sigma * sigma + 1) - 1) / 2));
  return boxBlur(boxBlur(boxBlur(src, w, h, r), w, h, r), w, h, r);
}

/** Morphological erosion (min filter) with a square of radius r, separable. */
export function erode(src, w, h, r) {
  if (r < 1) return Float32Array.from(src);
  const tmp = new Float32Array(w * h);
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      let m = 1;
      for (let k = Math.max(0, x - r); k <= Math.min(w - 1, x + r); k++) m = Math.min(m, src[row + k]);
      tmp[row + x] = m;
    }
  }
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      let m = 1;
      for (let k = Math.max(0, y - r); k <= Math.min(h - 1, y + r); k++) m = Math.min(m, tmp[k * w + x]);
      out[y * w + x] = m;
    }
  }
  return out;
}

/** Morphological dilation (max filter), via erosion of the complement. */
export function dilate(src, w, h, r) {
  if (r < 1) return Float32Array.from(src);
  const inv = src.map((v) => 1 - v);
  return erode(inv, w, h, r).map((v) => 1 - v);
}

/** Closing (dilate then erode): fills thin holes and slivers inside the subject. */
export const close = (src, w, h, r) => erode(dilate(src, w, h, r), w, h, r);

export const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Premultiplied cross-fade of two straight-alpha RGBA frames: t=0 -> a, t=1 -> b. */
export function crossfade(a, b, t) {
  const out = new Uint8Array(a.length);
  for (let i = 0; i < a.length; i += 4) {
    const aa = (a[i + 3] / 255) * (1 - t);
    const ab = (b[i + 3] / 255) * t;
    const alpha = aa + ab;
    for (let c = 0; c < 3; c++) {
      out[i + c] = alpha > 0 ? Math.round((a[i + c] * aa + b[i + c] * ab) / alpha) : a[i + c];
    }
    out[i + 3] = Math.round(alpha * 255);
  }
  return out;
}
