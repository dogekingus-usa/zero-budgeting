/**
 * Cloudflare Pages Function — POST /api/subscribe
 * Proxies to fleet-email-subscribe worker (single source of truth: KV + Resend).
 * CTO build 2026-08-05. Keeps the worker URL out of client-side code.
 */

const WORKER_URL = "https://fleet-email-subscribe.dogeking-us.workers.dev/api/subscribe";

export async function onRequest(context) {
  const { request } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  if (request.method !== "POST") {
    return json({ ok: false, error: "method-not-allowed" }, 405);
  }

  try {
    const upstream = await fetch(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: await request.text(),
    });
    const data = await upstream.text();
    return new Response(data, {
      status: upstream.status,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (e) {
    return json({ ok: false, error: "upstream-error" }, 502);
  }
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}
