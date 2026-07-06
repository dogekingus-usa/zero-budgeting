/**
 * Stripe Webhook Handler — Cloudflare Pages Function
 * Site: LifeSystemOS.com (primary — other sites replicate from this)
 *
 * Endpoint: POST https://lifesystemos.com/api/stripe-webhook
 *
 * Events handled:
 *   - checkout.session.completed → GA4 tracking + fulfillment trigger
 *   - charge.refunded → support notification
 *   - payment_intent.payment_failed → retry/failure handling
 *
 * Dependencies: Zero — uses Web Crypto API (built into Cloudflare Workers)
 */

// ── Configuration (set via Cloudflare Pages environment variables) ─────────
// STRIPE_WEBHOOK_SECRET: whsec_... signing secret from Stripe Dashboard
// STRIPE_PUBLISHABLE_KEY: pk_live_... for frontend reference
// SITE_URL: https://lifesystemos.com
// GA4_MEASUREMENT_ID: G-... for event forwarding

const EVENT_HANDLERS = {
  'checkout.session.completed': async (event, env) => {
    const session = event.data.object;
    const email = session.customer_details?.email || 'unknown';
    const amount = session.amount_total || 0;
    const currency = session.currency || 'usd';
    const productId = session.metadata?.product_id || 'unknown';
    const productName = session.metadata?.product_name || 'Digital Product';

    console.log(`✅ Purchase completed: ${email} | ${productName} | ${(amount/100).toFixed(2)} ${currency.toUpperCase()}`);

    // Forward to GA4 for purchase tracking
    await forwardToGA4({
      name: 'purchase',
      params: {
        transaction_id: session.id,
        value: amount / 100,
        currency: currency.toUpperCase(),
        items: [{ item_id: productId, item_name: productName, quantity: 1 }]
      }
    }, env);

    // Trigger digital delivery (placeholder — wire to email service here)
    // await deliverProduct(email, productId, env);

    return { received: true, event: 'checkout.session.completed', email };
  },

  'charge.refunded': async (event) => {
    const charge = event.data.object;
    const amount = charge.amount_refunded || 0;
    const currency = charge.currency || 'usd';

    console.log(`↩️ Refund processed: ${(amount/100).toFixed(2)} ${currency.toUpperCase()} — ${charge.id}`);

    return { received: true, event: 'charge.refunded', charge: charge.id };
  },

  'payment_intent.payment_failed': async (event) => {
    const intent = event.data.object;
    const email = intent.receipt_email || 'unknown';
    const error = intent.last_payment_error?.message || 'Unknown error';

    console.log(`❌ Payment failed: ${email} — ${error}`);

    return { received: true, event: 'payment_intent.payment_failed', error };
  }
};

// ── Main handler ───────────────────────────────────────────────────────────

export async function onRequest(context) {
  const { request, env } = context;

  // CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'content-type,stripe-signature'
      }
    });
  }

  // Only accept POST
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', 'Allow': 'POST' }
    });
  }

  // Verify webhook secret is configured
  const WEBHOOK_SECRET = env.STRIPE_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    console.error('❌ STRIPE_WEBHOOK_SECRET not configured');
    return new Response(JSON.stringify({ error: 'Webhook not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Get raw body and signature header
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return new Response(JSON.stringify({ error: 'Missing stripe-signature header' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Verify signature
  let event;
  try {
    event = await verifyStripeSignature(body, signature, WEBHOOK_SECRET);
  } catch (err) {
    console.error('❌ Signature verification failed:', err.message);
    return new Response(JSON.stringify({ error: 'Signature verification failed' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Route to handler
  const handler = EVENT_HANDLERS[event.type];
  if (!handler) {
    console.log(`ℹ️ Unhandled event type: ${event.type}`);
    return new Response(JSON.stringify({ received: true, event: event.type }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const result = await handler(event, env);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error(`❌ Handler error for ${event.type}:`, err.message);
    return new Response(JSON.stringify({ error: 'Handler error', event: event.type }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// ── Stripe signature verification (zero-dep, uses Web Crypto API) ─────────

async function verifyStripeSignature(payload, sigHeader, secret) {
  // Parse the Stripe signature header: t=<timestamp>,v1=<sig>[,v1=<sig2>]
  const parts = sigHeader.split(',');
  let timestamp = '';
  let expectedSig = '';

  for (const part of parts) {
    const [key, value] = part.trim().split('=');
    if (key === 't') timestamp = value;
    if (key === 'v1') expectedSig = value;
  }

  if (!timestamp || !expectedSig) {
    throw new Error('Invalid signature header format');
  }

  // Check timestamp is recent (within 5 minutes)
  const now = Math.floor(Date.now() / 1000);
  const sigTime = parseInt(timestamp, 10);
  if (isNaN(sigTime) || Math.abs(now - sigTime) > 300) {
    throw new Error('Signature timestamp outside tolerance window');
  }

  // Compute HMAC-SHA256: HMAC(secret, timestamp.payload)
  const signedPayload = `${timestamp}.${payload}`;
  const encoder = new TextEncoder();

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload));

  // Convert to hex
  const computedSig = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  // Timing-safe comparison
  if (computedSig.length !== expectedSig.length) {
    throw new Error('Signature mismatch (length)');
  }

  let diff = 0;
  for (let i = 0; i < computedSig.length; i++) {
    diff |= computedSig.charCodeAt(i) ^ expectedSig.charCodeAt(i);
  }

  if (diff !== 0) {
    throw new Error('Signature mismatch');
  }

  // Parse the event payload
  return JSON.parse(payload);
}

// ── GA4 Measurement Protocol forwarding ────────────────────────────────────

async function forwardToGA4(event, env) {
  const measurementId = env.GA4_MEASUREMENT_ID;
  const apiSecret = env.GA4_API_SECRET;

  if (!measurementId || !apiSecret) {
    console.log('ℹ️ GA4 not configured — skipping event forwarding');
    return;
  }

  try {
    const response = await fetch(
      `https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: 'STRIPE_WEBHOOK',
          events: [event]
        })
      }
    );

    if (!response.ok) {
      console.error(`❌ GA4 forward failed: ${response.status}`);
    } else {
      console.log(`✅ GA4 purchase event forwarded`);
    }
  } catch (err) {
    console.error('❌ GA4 forward error:', err.message);
  }
}
