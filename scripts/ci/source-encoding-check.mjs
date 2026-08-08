#!/usr/bin/env node
/**
 * source-encoding-check.mjs ΓÇö GATE L2 (source-side encoding integrity)
 * CI-CD-STANDARD.md ┬º5 L2 / Board 294 M6 (Astra ┬º2.8: 211 mojibake files)
 *
 * Asserts (source-side only ΓÇö never scan dist):
 *   1. No U+FFFD replacement char anywhere in src/ (Astra: '10 Solana Meme Coins Under ∩┐╜ΓÇö∩┐╜? ...')
 *   2. No common mojibake sequences (WINDOWS-1252/UTF-8 double-decode artifacts):
 *      ├óΓé¼", ├óΓé¼Γäó, ├óΓé¼╦£, ├óΓé¼┼ô, ├óΓé¼, ├â┬⌐, ├â┬¿, ├â┬▒, ├â┬╝, ├é (in prose contexts)
 *   3. SVG files parse (well-formed XML via regex stack check) and non-empty
 *   4. Size floors: .astro/.md/.html files >= 64 bytes; no 0-byte source files
 *      (except legitimately-empty files, e.g. .gitkeep-style)
 *
 * Usage: node scripts/ci/source-encoding-check.mjs [srcDir=src]
 * Exit: 0 = pass, 1 = fail (deploy-blocking). Pure Node, zero deps, node >= 18.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const srcDir = path.resolve(ROOT, process.argv[2] || 'src');
const EXT_INTEREST = new Set(['.astro', '.md', '.mdx', '.html', '.js', '.mjs', '.jsx', '.ts', '.tsx', '.css', '.svg', '.json', '.txt']);

const MOJIBAKE = [
  '├óΓé¼"', '├óΓé¼"', '├óΓé¼Γäó', '├óΓé¼╦£', '├óΓé¼┼ô', '├óΓé¼', '├óΓé¼┬ª',
  '├â┬⌐', '├â┬¿', '├â┬▒', '├â┬╝', '├â┬╢', '├â┬í', '├â┬¡', '├â┬│', '├â┬║', '├â┬º',
  '├é┬ú', '├é┬░', '├é┬╗', '├é┬½',
];
const BANNED_DECODING = /[\uFFFD]/; // U+FFFD replacement char

function walk(dir) {
  const out = [];
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch { return out; } // dir missing ΓåÆ caller decides
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === '.astro' || e.name === 'dist') continue;
      out.push(...walk(p));
    } else if (e.isFile() && EXT_INTEREST.has(path.extname(e.name).toLowerCase())) {
      out.push(p);
    }
  }
  return out;
}

const failures = [];
const files = walk(srcDir);
if (files.length === 0) {
  failures.push(`src dir '${srcDir}' missing or empty ΓÇö nothing to check`);
} else {
  for (const f of files) {
    const rel = path.relative(ROOT, f);
    const stat = fs.statSync(f);
    if (stat.size === 0) { failures.push(`EMPTY ${rel}`); continue; }
    if (stat.size < 64 && !f.endsWith('.gitkeep')) {
      failures.push(`TINY ${rel} (${stat.size}B < 64B floor)`);
    }
    if (f.endsWith('.svg')) {
      const raw = fs.readFileSync(f, 'utf8');
      if (!raw.includes('<svg')) { failures.push(`SVG-NO-ROOT ${rel}`); continue; }
      // naive well-formedness: balanced <tag> vs </tag> for core svg elements
      const opens = (raw.match(/<(?!\/)(svg|g|path|rect|circle|line|polyline|polygon|text|defs|linearGradient|radialGradient|stop|clipPath|mask|pattern|image|use|title|desc)[\s>]/g) || []).length;
      const closes = (raw.match(/<\/(svg|g|path|rect|circle|line|polyline|polygon|text|defs|linearGradient|radialGradient|stop|clipPath|mask|pattern|image|use|title|desc)>/g) || []).length;
      if (opens !== closes) failures.push(`SVG-UNBALANCED ${rel} (open ${opens} vs close ${closes})`);
      continue;
    }
    const content = fs.readFileSync(f, 'utf8');
    if (BANNED_DECODING.test(content)) failures.push(`MOJIBAKE-U+FFFD ${rel}`);
    for (const m of MOJIBAKE) {
      if (content.includes(m)) { failures.push(`MOJIBAKE-SEQ ${rel}: '${m}'`); break; }
    }
  }
}

if (failures.length) {
  console.error(`ENCODING GATE FAIL (${failures.length}):`);
  failures.slice(0, 60).forEach((x) => console.error('  FAIL ' + x));
  if (failures.length > 60) console.error(`  ... and ${failures.length - 60} more`);
  console.error(`ENCODING GATE RESULT: ${failures.length} FAILURE(S) ΓÇö DEPLOY BLOCKED`);
  process.exit(1);
}
console.log(`ENCODING GATE PASS (${files.length} source files scanned)`);
