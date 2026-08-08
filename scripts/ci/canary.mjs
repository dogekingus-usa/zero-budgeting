#!/usr/bin/env node
/**
 * CANARY.MJS ΓÇö 7 deploy-blocking assertions (Tailwind v4 pin, BOARD #312)
 * Spec: tailwind-specialist CANARY-PACKAGE-FOR-BOLT-2026-08-08.md v1.0.0
 *       + ux-ui-designer TOKEN-CONTRAST-PAIRS-CI-SPEC (M3) + A11Y-QA-GATE-SPEC (M12 L1 canaries)
 * Contract: run AFTER `astro build`, BEFORE deploy. Any FAIL = exit 1 = deploy blocked.
 * Zero npm dependencies. Node >= 20.
 *
 * Usage: node scripts/ci/canary.mjs [--config config/canary.json] [--report canary-report.json]
 *
 * Assertions:
 *   #1 tokens.css present at tokensPath; NO tailwind.config.* anywhere in repo (v4 pin)
 *   #2 required @theme semantic keys + 4 breakpoints + :focus-visible + reduced-motion hook
 *   #3 built CSS (dist/_astro/*.css) >= minCssBytes AND >= minTokenClasses token-derived classes
 *      (the dogeking-regression detector: missing token source = zero utilities = FAIL)
 *   #4 theme-{site} class on <html> in built HTML
 *   #5 zero raw hex colors in src/components + src/layouts (non-CSS files, allow-list aware)
 *   #6 contrast pairs >= minRatio (exact WCAG 2.1 luminance); forbidden pairs present => FAIL
 *   #7 @media (prefers-reduced-motion: reduce) block present in built CSS
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = process.cwd();
const SELF_DIR = path.dirname(fileURLToPath(import.meta.url));

// ---------------- CLI ----------------
const args = process.argv.slice(2);
function argVal(name, dflt) {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : dflt;
}
const CONFIG_PATH = path.resolve(ROOT, argVal('--config', 'config/canary.json'));
const REPORT_PATH = argVal('--report', null);
const SITE_DEFAULT = {
  site: 'unknown',
  themeClass: null,
  tokensPath: 'src/styles/tokens.css',
  minCssBytes: 10000,
  minTokenClasses: 3,
  extraExpectedClasses: [],
  hexScanDirs: ['src/components', 'src/layouts'],
  allowlistPath: 'config/canary-allowlist.json',
  contrastPath: 'config/contrast-pairs.json',
};

// ---------------- WCAG 2.1 (canonical ΓÇö vendored from tailwind-specialist verify-contrast-pairs.py) ----------------
function lum(hex) {
  const h = String(hex).trim().replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) throw new Error(`bad hex: ${hex}`);
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const R = lin(r), G = lin(g), B = lin(b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}
function contrastRatio(fg, bg) {
  const l1 = lum(fg), l2 = lum(bg);
  const hi = Math.max(l1, l2), lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

// ---------------- helpers ----------------
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', '.astro', '.openclaw']);
function walk(dir, extFilter, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, extFilter, out);
    else if (!extFilter || extFilter.includes(path.extname(e.name).toLowerCase())) out.push(p);
  }
  return out;
}
function readJson(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return null; }
}

// ---------------- forbidden-pair composed-usage detection ----------------
// Presence-flag is WRONG for brand colors that are legit on dark but forbidden on white
// (DK gold #c9a84c: defined in tokens + used on navy). Detect COMPOSED usage instead:
// fg used as text/color + bg used as background in the SAME rule/style/element.
function cssHasComposed(css, fg, bg) {
  const blocks = css.match(/\{[^{}]*\}/g) || [];
  for (const b of blocks) {
    const cm = b.match(/color\s*:\s*#([0-9a-fA-F]{6})/);
    const bm = b.match(/background(?:-color)?\s*:\s*#([0-9a-fA-F]{6})/);
    if (!cm || !bm) continue;
    const cv = '#' + cm[1].toLowerCase(), bv = '#' + bm[1].toLowerCase();
    if ((cv === fg && bv === bg) || (cv === bg && bv === fg)) return true;
  }
  return false;
}
function htmlHasComposed(html, fg, bg) {
  const RE = /<[a-z0-9-]+([^>]*)>/gi;
  let m;
  while ((m = RE.exec(html))) {
    const attrs = m[1];
    const styleHex = [...attrs.matchAll(/(?:color|background(?:-color)?)\s*:\s*#([0-9a-fA-F]{6})/g)].map((x) => '#' + x[1].toLowerCase());
    if (styleHex.includes(fg) && styleHex.includes(bg)) return true;
    const cls = (attrs.match(/class="([^"]*)"/) || [])[1] || '';
    const texts = [...cls.matchAll(/text-\[#([0-9a-fA-F]{6})\]/g)].map((x) => '#' + x[1].toLowerCase());
    const bgs = [...cls.matchAll(/bg-\[#([0-9a-fA-F]{6})\]/g)].map((x) => '#' + x[1].toLowerCase());
    if ((texts.includes(fg) && bgs.includes(bg)) || (texts.includes(bg) && bgs.includes(fg))) return true;
  }
  return false;
}

// ---------------- runner ----------------
const results = [];
function check(num, label, pass, detail) {
  results.push({ num, label, pass: !!pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  canary #${num} ΓÇö ${label}${detail ? `: ${detail}` : ''}`);
}

let failures = 0;
function assert(num, label, pass, detail) {
  check(num, label, pass, detail);
  if (!pass) failures++;
}

function main() {
  const cfg = { ...SITE_DEFAULT, ...(readJson(CONFIG_PATH) || {}) };
  const themeClass = cfg.themeClass || `theme-${cfg.site.replace(/\./g, '').replace(/[^a-z0-9]/gi, '')}`;
  const tokensPath = path.resolve(ROOT, cfg.tokensPath);
  const distDir = path.resolve(ROOT, cfg.distDir || 'dist');

  console.log(`CANARY ΓÇö site=${cfg.site} themeClass=${themeClass} repoRoot=${ROOT}\n`);

  // ---------- #1 tokens.css present + no tailwind.config.* (v4 pin) ----------
  const tokensOk = fs.existsSync(tokensPath);
  const configFiles = walk(ROOT, ['.mjs', '.js', '.cjs', '.ts']).filter((p) =>
    /tailwind\.config\./.test(path.basename(p).toLowerCase())
  );
  assert(1, `tokens.css present (${cfg.tokensPath})`, tokensOk, tokensOk ? `${fs.statSync(tokensPath).size} bytes` : 'MISSING');
  assert(1, 'no tailwind.config.* anywhere (v4 pin)', configFiles.length === 0,
    configFiles.length ? `found: ${configFiles.map((f) => path.relative(ROOT, f)).join(', ')}` : 'clean');

  // ---------- #2 required keys ----------
  if (tokensOk) {
    const css = fs.readFileSync(tokensPath, 'utf8');
    const cssNoComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
    const required = {
      '@import "tailwindcss"': 'tailwind v4 import',
      '@theme': 'v4 @theme block',
      ':focus-visible': 'focus ring hook',
      'prefers-reduced-motion: reduce': 'reduced-motion hook',
      '--color-bg-surface': 'semantic: bg-surface',
      '--color-text-primary': 'semantic: text-primary',
      '--color-text-on-brand': 'semantic: text-on-brand',
      '--color-brand-primary': 'semantic: brand-primary',
      '--color-border-focus': 'semantic: border-focus',
      '--color-state-error': 'semantic: state-error',
      '--breakpoint-md: 768px': 'breakpoint 768',
      '--breakpoint-lg: 1024px': 'breakpoint 1024',
      '--breakpoint-xl: 1280px': 'breakpoint 1280',
      '--breakpoint-2xl: 1440px': 'breakpoint 1440',
    };
    const missing = Object.entries(required).filter(([needle]) => !cssNoComments.includes(needle));
    assert(2, `required token keys (${Object.keys(required).length} checks)`, missing.length === 0,
      missing.length ? `missing: ${missing.map(([n, l]) => `${l} (${n})`).join('; ')}` : 'all present');
  } else {
    assert(2, 'required token keys', false, 'skipped ΓÇö tokens.css missing (see #1)');
  }

  // ---------- #3 built CSS >= minCssBytes + >= minTokenClasses token-derived classes ----------
  const cssFiles = walk(distDir, ['.css']);
  const builtCss = cssFiles.map((f) => fs.readFileSync(f, 'utf8')).join('\n');
  const cssBytes = Buffer.byteLength(builtCss, 'utf8');
  const sizeOk = cssBytes >= cfg.minCssBytes;
  let tokenClasses = [];
  if (tokensOk) {
    const tokCss = fs.readFileSync(tokensPath, 'utf8');
    const names = [...tokCss.matchAll(/--color-([a-z0-9-]+)\s*:/gi)].map((m) => m[1]);
    const uniq = [...new Set(names)].map((n) => n.replace(/_/g, '-'));
    const candidates = new Set(
      uniq.flatMap((n) => [`.text-${n}`, `.bg-${n}`, `.border-${n}`, `.text-${n}`, `.bg-${n}`])
    );
    const extras = new Set(cfg.extraExpectedClasses);
    tokenClasses = [...new Set([`.${themeClass}`, ...candidates, ...extras])].filter((c) =>
      builtCss.includes(c)
    );
  } else {
    tokenClasses = [...new Set([`.${themeClass}`, ...cfg.extraExpectedClasses])].filter((c) =>
      builtCss.includes(c)
    );
  }
  assert(3, `built CSS >= ${cfg.minCssBytes} bytes (dogeking-regression detector)`, sizeOk,
    sizeOk ? `${cssBytes} bytes across ${cssFiles.length} file(s)` : `${cssBytes} bytes ΓÇö utility build empty?`);
  assert(3, `>= ${cfg.minTokenClasses} token-derived classes in built CSS`, tokenClasses.length >= cfg.minTokenClasses,
    tokenClasses.length ? `found: ${tokenClasses.slice(0, 8).join(', ')}${tokenClasses.length > 8 ? ', ΓÇª' : ''}` : 'NONE found');

  // ---------- #4 theme-{site} on <html> ----------
  const htmlFiles = walk(distDir, ['.html']);
  let themeHtmlOk = false, themeDetail = 'no <html> with theme class found';
  for (const f of htmlFiles) {
    const html = fs.readFileSync(f, 'utf8');
    const m = html.match(/<html[^>]*class="([^"]*)"/i);
    if (m && m[1].split(/\s+/).includes(themeClass)) { themeHtmlOk = true; themeDetail = path.relative(ROOT, f); break; }
  }
  assert(4, `theme-{site} class (${themeClass}) on <html> in built HTML`, themeHtmlOk, themeHtmlOk ? themeDetail : `not found in ${htmlFiles.length} html file(s)`);

  // ---------- #5 zero raw hex in components/layouts (non-CSS, allow-list aware) ----------
  const HEX_RE = /#[0-9a-fA-F]{3,8}\b/g;
  const allow = readJson(path.resolve(ROOT, cfg.allowlistPath));
  const allowedFiles = new Set((allow || []).map((e) => String(e.file || '').replace(/\\/g, '/')));
  const scanExts = ['.astro', '.ts', '.tsx', '.js', '.jsx', '.md', '.mdx', '.html', '.vue', '.svelte'];
  let hexHits = [];
  for (const dir of cfg.hexScanDirs) {
    for (const f of walk(path.resolve(ROOT, dir), scanExts)) {
      const rel = path.relative(ROOT, f).replace(/\\/g, '/');
      if (allowedFiles.has(rel) || [...allowedFiles].some((a) => a.endsWith('*') && rel.startsWith(a.slice(0, -1)))) continue;
      const content = fs.readFileSync(f, 'utf8');
      const matches = content.match(HEX_RE);
      if (matches) hexHits.push(`${rel} (${[...new Set(matches)].slice(0, 4).join(', ')})`);
    }
  }
  assert(5, 'zero raw hex colors in component/layout code', hexHits.length === 0,
    hexHits.length ? hexHits.slice(0, 6).join('; ') + (hexHits.length > 6 ? `; +${hexHits.length - 6} more` : '') : 'clean');

  // ---------- #6 contrast pairs (exact WCAG 2.1) + forbidden presence ----------
  const manifest = readJson(path.resolve(ROOT, cfg.contrastPath));
  if (manifest) {
    const pairChecks = [...(manifest.pairs || []).map((p) => ({ ...p, large: !!p.large })), ...(manifest.nonText || []).map((p) => ({ ...p, minRatio: p.minRatio || 3.0 }))];
    let pairFails = [];
    for (const p of pairChecks) {
      let r;
      try { r = contrastRatio(p.fg, p.bg); } catch { pairFails.push(`${p.fg} on ${p.bg}: bad hex`); continue; }
      const min = p.minRatio || (p.large ? 3.0 : 4.5);
      if (r < min - 1e-9) pairFails.push(`${p.fg} on ${p.bg} = ${r.toFixed(2)}:1 < ${min}:1 (${p.usage || ''})`);
    }
    assert(6, `contrast pairs >= minRatio (${pairChecks.length} pairs)`, pairFails.length === 0,
      pairFails.length ? pairFails.join('; ') : 'all pass');

    // forbidden pairs: COMPOSED usage (fg as text + bg as background, same rule/style/element) => FAIL
    // Note: plain presence-flag is rejected ΓÇö brand colors are legitimately defined in tokens.css
    // and used on dark (DK gold), so presence alone false-positives every build.
    const forbidden = manifest.forbidden || [];
    const tokCss = tokensOk ? fs.readFileSync(tokensPath, 'utf8').toLowerCase() : '';
    let forbFails = [];
    for (const p of forbidden) {
      const fg = p.fg.toLowerCase(), bg = p.bg.toLowerCase();
      for (const [content, label] of [[tokCss, 'tokens.css'], ...cssFiles.map((f) => [fs.readFileSync(f, 'utf8').toLowerCase(), path.relative(ROOT, f)])]) {
        if (cssHasComposed(content, fg, bg)) { forbFails.push(`${p.fg} on ${p.bg} composed in ${label} (${p.reason || 'forbidden pair'})`); break; }
      }
      if (!forbFails.some((x) => x.includes(p.fg))) {
        for (const f of htmlFiles) {
          const html = fs.readFileSync(f, 'utf8').toLowerCase();
          if (htmlHasComposed(html, fg, bg)) { forbFails.push(`${p.fg} on ${p.bg} composed in ${path.relative(ROOT, f)} (${p.reason || 'forbidden pair'})`); break; }
        }
      }
    }
    assert(6, `forbidden pairs absent from build (${forbidden.length} pairs)`, forbFails.length === 0,
      forbFails.length ? forbFails.join('; ') : 'clean');
  } else {
    assert(6, 'contrast pairs', false, `manifest missing at ${cfg.contrastPath}`);
  }

  // ---------- #7 reduced-motion block in built CSS (whitespace-insensitive ΓÇö built CSS is minified) ----------
  const rmOk = /prefers-reduced-motion\s*:\s*reduce/.test(builtCss);
  assert(7, '@media (prefers-reduced-motion: reduce) block in built CSS', rmOk, rmOk ? 'present' : 'MISSING');

  // ---------- report + exit ----------
  const report = {
    site: cfg.site, themeClass, timestamp: new Date().toISOString(), exitCode: failures ? 1 : 0,
    results, failures, cssBytes,
  };
  if (REPORT_PATH) fs.writeFileSync(path.resolve(ROOT, REPORT_PATH), JSON.stringify(report, null, 2));
  console.log(`\nCANARY RESULT: ${failures === 0 ? 'ALL 7 ASSERTIONS PASS' : `${failures} FAILURE(S) ΓÇö DEPLOY BLOCKED`} (${cssFiles.length} css, ${htmlFiles.length} html)`);
  process.exit(failures ? 1 : 0);
}

main();
