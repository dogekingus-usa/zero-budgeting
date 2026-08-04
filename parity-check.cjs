const fs = require('fs');
const path = require('path');
const https = require('https');
const dist = 'dist';

// dist slug set: handle both dist/<slug>/index.html (dir format) and dist/<slug>.html
const distSlugs = new Set();
function walk(dir, prefix = '') {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === '_astro' || e.name === 'assets' || e.name === 'og-images' || e.name === 'scripts' || e.name === 'thank-you') continue;
      walk(p, prefix + e.name + '/');
    } else if (e.name === 'index.html') {
      distSlugs.add(prefix.replace(/\/$/, ''));
    } else if (e.name.endsWith('.html')) {
      distSlugs.add((prefix + e.name).replace(/\.html$/, ''));
    }
  }
}
walk(dist);
console.log('dist pages:', distSlugs.size);

https.get('https://zerobudgeting.com/sitemap.xml', res => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    const live = [...data.matchAll(/<loc>https:\/\/zerobudgeting\.com(\/[^<]*)<\/loc>/g)].map(m => m[1].replace(/\/$/, '').replace(/^\//, ''));
    console.log('live sitemap:', live.length);
    const missing = [];
    for (const u of live) {
      if (u && !distSlugs.has(u)) missing.push(u);
    }
    console.log('MISSING:', missing.length);
    missing.slice(0, 20).forEach(m => console.log('  ', m));
    // extra pages we have that live doesn't list
    const extra = [...distSlugs].filter(s => !live.includes(s) && !s.startsWith('404'));
    console.log('EXTRA (in dist, not sitemap):', extra.length);
    extra.slice(0, 10).forEach(m => console.log('  ', m));
  });
}).on('error', e => { console.error('fetch fail', e.message); process.exit(1); });
