#!/usr/bin/env node
/**
 * url-parity.mjs ΓÇö GATE L2 (URL/slug parity on every main deploy)
 * CI-CD-STANDARD.md ┬º5 L2 / Board 294 M8 (Soren ┬º2.3: RWH 326/326, ZB 383/383,
 * RPT 408/408 verified; LSOS 1 %26-vs-& variant; GH Pages has no true 301s ΓåÆ parity-first)
 *
 * Asserts against BUILT output (dist/):
 *   1. Every internal href in every built HTML file resolves to an existing file
 *      in dist (or is a known-safe target: mailto:, tel:, #fragment, /api edge, /downloads)
 *   2. No path-style hrefs that 404: normalized comparison (trailing-slash tolerant,
 *      .html extension tolerant, index.html tolerance)
 *   3. %26-vs-& drift: an href containing %26 whose decoded form matches a file with &
 *      is flagged (LSOS class) ΓÇö normalized-match wins, raw-mismatch fails
 *   4. Relative hrefs are resolved against the page's own location
 *
 * Usage: node scripts/ci/url-parity.mjs [distDir=dist] [siteRoot=/]
 * Exit: 0 = pass, 1 = fail (deploy-blocking). Pure Node, zero deps, node >= 18.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const distDir = path.resolve(ROOT, process.argv[2] || 'dist');
const siteRoot = process.argv[3] || '/';

const SAFE_SCHEMES = ['mailto:', 'tel:', 'javascript:', 'data:', 'https:', 'http:', '//'];
const SAFE_SUFFIXES = ['/api', '/downloads']; // edge routes / magnet dirs (RWH)

function walkHtml(dir) {
  const out = [];
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch { return out; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walkHtml(p));
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

function fileExistsNormalized(dir, target) {
  // target: absolute-from-dist path with leading '/'
  const candidates = [
    target,                                       // /foo
    target + '.html',                             // /foo.html
    target + '/index.html',                       // /foo/index.html
    target.replace(/\/$/, '') + '/index.html',    // /foo/ ΓåÆ /foo/index.html
    target.replace(/\.html$/, '') + '/index.html',
  ];
  for (const c of candidates) {
    const fp = path.join(dir, c.replace(/^\//, ''));
    try { if (fs.statSync(fp).isFile()) return true; } catch { /* next */ }
  }
  return false;
}

const failures = [];
const pages = walkHtml(distDir);
if (pages.length === 0) {
  console.error(`URL-PARITY GATE FAIL: dist '${distDir}' missing or has no HTML`);
  process.exit(1);
}

for (const page of pages) {
  const rel = path.relative(ROOT, page).replace(/\\/g, '/');
  const content = fs.readFileSync(page, 'utf8');
  const hrefs = [...content.matchAll(/\bhref\s*=\s*["']([^"']+)["']/g)].map((m) => m[1]);
  const seen = new Set();
  for (const raw of hrefs) {
    const pathPart = raw.split('#')[0].split('?')[0]; // fragment + query never need a file
    if (seen.has(pathPart)) continue;
    seen.add(pathPart);
    if (pathPart === '') continue; // pure #fragment link
    if (pathPart.includes('${')) continue; // JS template expr ΓÇö runtime-determined, not statically checkable
    if (SAFE_SCHEMES.some((s) => pathPart.startsWith(s))) continue;
    if (SAFE_SUFFIXES.some((s) => pathPart === s || pathPart.startsWith(s + '/'))) continue;

    let target = pathPart;
    if (!target.startsWith('/')) {
      // relative ΓåÆ resolve against page dir
      const pageDir = path.posix.dirname('/' + rel.replace(/^[^/]*\//, ''));
      target = path.posix.normalize(path.posix.join(pageDir, target));
      if (!target.startsWith('/')) target = '/' + target;
    }

    const decoded = decodeURIComponent(target);
    // %26-vs-& drift (LSOS class): decoded form exists but raw form does not
    if (decoded !== target) {
      if (fileExistsNormalized(distDir, decoded) && !fileExistsNormalized(distDir, target)) {
        failures.push(`${rel}: ENCODED-DRIFT href="${raw}" (decodes to ${decoded} which exists ΓÇö use ${decoded})`);
        continue;
      }
    }
    if (!fileExistsNormalized(distDir, target)) {
      failures.push(`${rel}: DEAD href="${raw}" ΓåÆ ${target} not in dist`);
    }
  }
}

if (failures.length) {
  console.error(`URL-PARITY GATE FAIL (${failures.length}):`);
  failures.slice(0, 60).forEach((x) => console.error('  FAIL ' + x));
  if (failures.length > 60) console.error(`  ... and ${failures.length - 60} more`);
  console.error(`URL-PARITY GATE RESULT: ${failures.length} FAILURE(S) ΓÇö DEPLOY BLOCKED`);
  process.exit(1);
}
console.log(`URL-PARITY GATE PASS (${pages.length} pages, all internal hrefs resolve)`);
