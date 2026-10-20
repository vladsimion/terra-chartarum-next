import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { legacyManifest } from '../src/essays/port-fidelity.js';

/*
 * Run once (spec 009, contracts/review-tooling.md): `tsx scripts/essay-legacy-manifest.ts <legacy clone>`.
 * Writes the line span and SHA-256 of each paragraph of the legacy essay, so the port can be checked
 * against the author's text without committing it.
 */
const [clone] = process.argv.slice(2).filter((a) => a !== '--');
if (!clone) {
  console.error('essay-legacy-manifest: give the path of the legacy clone');
  process.exit(2);
}
const source = path.join(clone, 'src/content/essays/dacia.mdx');
const manifest = legacyManifest(readFileSync(source, 'utf8'));
writeFileSync('docs/review/anchor-essay-legacy-paragraphs.json', `${JSON.stringify(manifest, null, 1)}\n`);
console.log(`essay-legacy-manifest: ${manifest.length} paragraphs from ${source}`);
