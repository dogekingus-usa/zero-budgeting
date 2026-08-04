const fs = require('fs');
const path = require('path');
const dist = 'dist';

const results = {};
function check(name, cond, extra = '') {
  results[name] = cond ? 'PASS' : 'FAIL';
  console.log(`  [${cond ? 'PASS' : 'FAIL'}] ${name}${extra ? ' — ' + extra : ''}`);
}

console.log('=== HOMEPAGE ===');
const home = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
check('title', /<title>[^<]*ZeroBudgeting/i.test(home), (home.match(/<title>([^<]*)<\/title>/) || [])[1]);
check('no [object Object]', !home.includes('[object Object]'));
check('no FFFD', !home.includes('\uFFFD'));
check('crown css', home.includes('/crown-design-system.css'));
check('theme-zerobudgeting', home.includes('class="theme-zerobudgeting"'));
check('canonical', /rel="canonical" href="https:\/\/zerobudgeting\.com"?/.test(home), (home.match(/rel="canonical" href="([^"]+)"/) || [])[1]);

console.log('=== ARTICLE PAGE ===');
const art = fs.readFileSync(path.join(dist, '10-free-financial-tools-that-replace-paid-subscriptions.html'), 'utf8');
check('article title', /<title>[^<]*10 Free Financial Tools/i.test(art), (art.match(/<title>([^<]*)<\/title>/) || [])[1]);
check('h1 present', art.includes('<h1>10 Free Financial Tools That Replace Paid Subscriptions</h1>'));
check('FULL content (not stub)', art.includes('paid subscription') && art.includes('<p>') && (art.match(/<p>/g) || []).length > 3, `${(art.match(/<p>/g) || []).length} paragraphs`);
check('no [object Object]', !art.includes('[object Object]'));
check('no FFFD', !art.includes('\uFFFD'));
check('canonical flat', art.includes('rel="canonical" href="https://zerobudgeting.com/10-free-financial-tools-that-replace-paid-subscriptions"'));
check('crown css', art.includes('/crown-design-system.css'));
check('ld+json Article', art.includes('"@type":"Article"'));
check('CTA link', art.includes('/all-articles'));

console.log('=== SPECIAL PAGES ===');
for (const p of ['about', 'all-articles', 'contact', 'privacy', 'disclaimer', 'checklist', 'store', 'thank-you', '404', 'checkout', 'products']) {
  // directory format: dist/<p>/index.html ; root pages: dist/<p>.html
  let f = path.join(dist, p + '.html');
  if (!fs.existsSync(f)) f = path.join(dist, p, 'index.html');
  if (!fs.existsSync(f)) { check(p, false, 'MISSING'); continue; }
  const c = fs.readFileSync(f, 'utf8');
  check(p, !c.includes('[object Object]') && !c.includes('\uFFFD') && c.includes('</html>'), `${c.length} bytes`);
}

console.log('=== ASSETS ===');
check('crown css in dist', fs.existsSync(path.join(dist, 'crown-design-system.css')));
check('CNAME in dist', fs.existsSync(path.join(dist, 'CNAME')), fs.existsSync(path.join(dist, 'CNAME')) ? fs.readFileSync(path.join(dist, 'CNAME'), 'utf8').trim() : '');

console.log('=== META ===');
const meta = JSON.parse(fs.readFileSync('src/bodies/meta.json', 'utf8'));
console.log(`  entries: ${Object.keys(meta).length}`);
const sample = Object.keys(meta).slice(0, 3);
for (const k of sample) console.log(`  ${k}: "${(meta[k].title || '').slice(0, 60)}"`);

let fails = Object.values(results).filter(v => v === 'FAIL').length;
console.log(`\n=== QA RESULT: ${Object.keys(results).length - fails}/${Object.keys(results).length} PASS ===`);
process.exit(fails ? 1 : 0);
