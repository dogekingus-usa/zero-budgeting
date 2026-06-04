/**
 * Cloudflare Pages Function - Injects Kit subscribe form into HTML pages
 * Site: ZeroBudgeting.com
 * Form: Weekly Budget Tracker (Kit UID: 40518970b8)
 */

const FORM_CONFIG = {
  heading: 'Get the Free Weekly Budget Tracker',
  desc: 'Track every dollar. Find leaks. Build wealth.',
  btn: 'Send My Free Tracker',
  bg: '#2d6a4f',
  accent: '#f59e0b',
  uid: '40518970b8'
};

function buildFormHTML() {
  const c = FORM_CONFIG;
  return `
<div class="kit-subscribe-wrapper" style="max-width:500px;margin:2rem auto;">
  <form action="https://app.kit.com/forms/${c.uid}/subscribe" method="POST" class="kit-subscribe" style="background:${c.bg};padding:2rem;border-radius:8px;color:white;max-width:500px;margin:2rem auto;">
    <h3 style="margin:0 0 0.5rem;font-size:1.25rem;color:${c.accent};">${c.heading}</h3>
    <p style="margin:0 0 1rem;font-size:0.9rem;opacity:0.9;">${c.desc}</p>
    <input type="email" name="email" placeholder="Your email address" required style="width:100%;padding:0.75rem;border:1px solid ${c.accent};border-radius:4px;margin-bottom:0.75rem;box-sizing:border-box;">
    <input type="text" name="first_name" placeholder="First name" style="width:100%;padding:0.75rem;border:1px solid ${c.accent};border-radius:4px;margin-bottom:0.75rem;box-sizing:border-box;">
    <button type="submit" style="background:${c.accent};color:#fff;padding:0.75rem 2rem;border:none;border-radius:4px;font-weight:bold;cursor:pointer;width:100%;font-size:1rem;">${c.btn}</button>
    <p style="font-size:0.75rem;opacity:0.7;margin:0.5rem 0 0;">No spam. Unsubscribe anytime.</p>
  </form>
</div>`;
}

export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const ext = path.split('.').pop().toLowerCase();
  if (ext && !['html', 'htm'].includes(ext) && !path.endsWith('/')) {
    return next();
  }
  const response = await next();
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) return response;
  const html = await response.text();
  const formHTML = buildFormHTML();
  let modified;
  if (html.includes('</footer>')) {
    modified = html.replace('</footer>', `${formHTML}</footer>`);
  } else {
    modified = html.replace('</body>', `${formHTML}</body>`);
  }
  return new Response(modified, {
    status: response.status,
    headers: response.headers
  });
}
