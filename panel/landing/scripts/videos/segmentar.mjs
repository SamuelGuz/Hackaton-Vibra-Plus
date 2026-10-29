// Child process: runs the ML matting model (@imgly/background-removal-node, ISNet "medium")
// over every PNG frame in <srcDir> and writes a grayscale-in-alpha PNG mask per frame to <maskDir>.
//
// It runs in its own process on purpose: the library bundles sharp 0.32, whose libvips DLL
// conflicts on Windows with the sharp 0.35 used by the rest of the pipeline.
//
// Usage: node scripts/videos/segmentar.mjs <srcDir> <maskDir>
import fs from 'node:fs';
import path from 'node:path';
import { segmentForeground } from '@imgly/background-removal-node';

const [srcDir, maskDir] = process.argv.slice(2);
if (!srcDir || !maskDir) {
  console.error('usage: segmentar.mjs <srcDir> <maskDir>');
  process.exit(2);
}
fs.mkdirSync(maskDir, { recursive: true });

const frames = fs.readdirSync(srcDir).filter((f) => f.endsWith('.png')).sort();
const pending = frames.filter((f) => !fs.existsSync(path.join(maskDir, f)));
const started = Date.now();

for (const [i, name] of pending.entries()) {
  const png = fs.readFileSync(path.join(srcDir, name));
  const blob = await segmentForeground(new Blob([png], { type: 'image/png' }), {
    model: 'medium',
    output: { format: 'image/png', quality: 1 },
  });
  // The mask lives in the alpha channel of this PNG (RGB channels are not meaningful).
  fs.writeFileSync(path.join(maskDir, name), Buffer.from(await blob.arrayBuffer()));
  if ((i + 1) % 20 === 0 || i + 1 === pending.length) {
    const s = ((Date.now() - started) / 1000).toFixed(0);
    console.log(`  mask ${i + 1}/${pending.length} (${s}s)`);
  }
}
