import { NextRequest, NextResponse } from 'next/server';

/**
 * Reverse proxy for /api/v1/* → the NestJS API.
 *
 * Replaces what was previously a Next.js `rewrites()` config in
 * next.config.mjs. Rewrites work fine locally but break on Vercel
 * when the target is external (Vercel's edge resolver refuses to
 * proxy to hostnames it considers private, which includes some
 * IPv6/CDN edge cases). A route handler runs as a serverless
 * function with full Node.js fetch, no such restriction.
 *
 * The handler is intentionally dumb — it forwards method, headers,
 * body, and cookies; preserves response status and headers; and
 * passes through Set-Cookie unchanged so session cookies land on
 * the web origin (the whole point of the proxy in the first place).
 */

const API_INTERNAL_URL =
  process.env.API_INTERNAL_URL ?? 'http://localhost:3000';

// Headers we don't forward upstream. `host` would mismatch the real
// API's host and trip security checks; `connection` is a hop-by-hop
// header that doesn't apply across the proxy boundary.
const HOP_BY_HOP_REQUEST_HEADERS = new Set([
  'host',
  'connection',
  'keep-alive',
  'content-length',
  'transfer-encoding',
  'upgrade',
]);

// Headers we don't pass back to the browser. content-encoding is
// stripped because the body is already decoded by the fetch.
const HOP_BY_HOP_RESPONSE_HEADERS = new Set([
  'connection',
  'keep-alive',
  'content-encoding',
  'content-length',
  'transfer-encoding',
  'upgrade',
]);

async function proxy(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }): Promise<NextResponse> {
  const { path } = await ctx.params;
  const pathString = path.join('/');
  const search = req.nextUrl.search; // preserves ?foo=bar
  const upstreamUrl = `${API_INTERNAL_URL}/api/v1/${pathString}${search}`;

  // Forward the incoming headers minus the hop-by-hop ones.
  const upstreamHeaders = new Headers();
  for (const [key, value] of req.headers.entries()) {
    if (!HOP_BY_HOP_REQUEST_HEADERS.has(key.toLowerCase())) {
      upstreamHeaders.set(key, value);
    }
  }

  // Set X-Forwarded-* so the API still sees the original client info
  // (used by our trust-proxy logic for cookie partitioning, etc).
  const origin = req.headers.get('origin') ?? req.nextUrl.origin;
  const host = new URL(origin).host;
  upstreamHeaders.set('x-forwarded-host', host);
  upstreamHeaders.set('x-forwarded-proto', 'https');

  // Body: pass through for non-GET/HEAD, omit otherwise.
  // duplex: 'half' is required when sending a streamed body in Node 18+.
  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
  const init: RequestInit & { duplex?: 'half' } = {
    method: req.method,
    headers: upstreamHeaders,
    // Important: don't follow redirects. The API issues 302s after
    // OAuth callback that need to reach the browser, not be followed
    // by the proxy.
    redirect: 'manual',
  };
  if (hasBody) {
    init.body = req.body;
    init.duplex = 'half';
  }

  const upstream = await fetch(upstreamUrl, init);

  // Build the response. Pass through status + headers, strip the
  // hop-by-hop set. Set-Cookie may appear multiple times so use
  // getSetCookie() (Node 20+) to retrieve all of them as an array.
  const responseHeaders = new Headers();
  for (const [key, value] of upstream.headers.entries()) {
    if (!HOP_BY_HOP_RESPONSE_HEADERS.has(key.toLowerCase()) && key.toLowerCase() !== 'set-cookie') {
      responseHeaders.set(key, value);
    }
  }
  // Pull set-cookie values explicitly to preserve multiple headers.
  const setCookies = upstream.headers.getSetCookie();
  for (const c of setCookies) {
    responseHeaders.append('set-cookie', c);
  }

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }): Promise<NextResponse> {
  return proxy(req, ctx);
}
export async function POST(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }): Promise<NextResponse> {
  return proxy(req, ctx);
}
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }): Promise<NextResponse> {
  return proxy(req, ctx);
}
export async function PUT(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }): Promise<NextResponse> {
  return proxy(req, ctx);
}
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }): Promise<NextResponse> {
  return proxy(req, ctx);
}
export async function OPTIONS(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }): Promise<NextResponse> {
  return proxy(req, ctx);
}

// Force Node.js runtime — Edge runtime doesn't support `redirect: 'manual'`
// and has different fetch semantics for streamed bodies.
export const runtime = 'nodejs';
// Ensure this is always executed dynamically, never statically optimized.
export const dynamic = 'force-dynamic';
