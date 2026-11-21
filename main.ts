// Vice Coast Cover Studio — entry program (Node 22, standard library only).
// Hands the app in: copies this repository's app/ and screenshots/ into the
// output directory and writes /output/dossier.json with the kit's vendored
// make.fun library, exactly as the sealed scorer rebuilds it.
//   MAKEFUN_OUTPUT_DIR=out node main.ts   (outside the grader, /output inside it)
// The program runs twice and both runs must write identical bytes.

import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const appDir = join(repoRoot, 'app');
const shotsDir = join(repoRoot, 'screenshots');

function countFiles(dir) {
  let total = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    total += entry.isDirectory() ? countFiles(full) + 1 : 1;
  }
  return total;
}

if (!existsSync(appDir) || !statSync(appDir).isDirectory()) {
  throw new Error('main.ts: no app/ directory beside this file');
}
if (!existsSync(join(appDir, 'index.html'))) {
  throw new Error('main.ts: app/index.html is missing');
}

mkdirSync(outDir, { recursive: true });
cpSync(appDir, join(outDir, 'app'), { recursive: true });

mkdirSync(join(outDir, 'screenshots'), { recursive: true });
let shotCount = 0;
if (existsSync(shotsDir)) {
  cpSync(shotsDir, join(outDir, 'screenshots'), { recursive: true });
  shotCount = readdirSync(shotsDir).filter((name) => !name.startsWith('.')).length;
}

// The scorer's own caps (competition gate): only text_max_bytes shapes the
// dossier bytes; the rest make this program fail exactly where the scorer
// would refuse the entry, instead of handing in something invalid.
const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);

// Self-check: what landed on disk must be byte for byte what buildDossier
// returned, and it must parse as the dossier schema the scorer expects.
const onDisk = readFileSync(join(outDir, 'dossier.json'));
if (!onDisk.equals(dossier)) {
  throw new Error('main.ts: dossier.json on disk differs from the built dossier');
}
const parsed = JSON.parse(onDisk.toString('utf8'));
if (parsed.schema !== 'makefun/dossier/v1') {
  throw new Error(`main.ts: unexpected dossier schema ${String(parsed.schema)}`);
}
const dossierSha = createHash('sha256').update(dossier).digest('hex');

console.log(
  `vice-coast: handed in ${countFiles(join(outDir, 'app'))} app entries, ` +
  `${shotCount} screenshots, dossier.json ${dossier.length} bytes ` +
  `(sha256 ${dossierSha.slice(0, 16)}…) -> ${outDir}`,
);
