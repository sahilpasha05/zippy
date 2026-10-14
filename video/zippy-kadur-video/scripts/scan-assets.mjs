// Lists every file in public/assets so the video knows which shots are available.
import {readdirSync, statSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
const root = 'public/assets';
const out = [];
const walk = (d, rel = '') => readdirSync(d).forEach((n) => {
  const p = join(d, n);
  if (statSync(p).isDirectory()) return walk(p, join(rel, n));
  if (/\.(mp4|mov|webm|jpg|jpeg|png|webp)$/i.test(n)) out.push(join(rel, n));
});
walk(root);
writeFileSync('src/manifest.json', JSON.stringify({files: out.sort()}, null, 2));
console.log(`assets found: ${out.length}`, out);
