import { SUPABASE_KEY, SUPABASE_URL, STORE_URL } from '../admin-src/src/config.js';

const staffEmails = new Set(['josecort1783@gmail.com', 'juanabulnes3@gmail.com']);
const headers = { 'Cache-Control': 'no-store' };

function result(status, code) {
  return Response.json(code ? { code } : { accepted: true }, { status, headers });
}

export async function requestStaffRecovery(request, fetcher = fetch) {
  if (request.method !== 'POST') {
    return new Response(null, { status: 405, headers: { ...headers, Allow: 'POST' } });
  }

  const origin = request.headers.get('Origin');
  if (origin && origin !== new URL(request.url).origin) return result(403, 'invalid_origin');
  if (!request.headers.get('Content-Type')?.startsWith('application/json')) return result(415, 'invalid_request');

  let payload;
  try {
    const body = await request.text();
    if (body.length > 512) return result(413, 'invalid_request');
    payload = JSON.parse(body);
  } catch {
    return result(400, 'invalid_request');
  }

  const email = typeof payload?.email === 'string' ? payload.email.trim().toLowerCase() : '';
  if (!staffEmails.has(email)) return result(403, 'staff_only');

  const recover = new URL('/auth/v1/recover', SUPABASE_URL);
  recover.searchParams.set('redirect_to', STORE_URL + '/admin');
  try {
    const response = await fetcher(recover, {
      method: 'POST',
      headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
      signal: AbortSignal.timeout(8500),
    });
    if (response.ok) return result(200);
    if (response.status === 429) return result(429, 'recovery_rate_limit');
    if (response.status === 504) return result(504, 'recovery_timeout');
    return result(502, 'recovery_unavailable');
  } catch (error) {
    return error?.name === 'TimeoutError'
      ? result(504, 'recovery_timeout')
      : result(502, 'recovery_unavailable');
  }
}

export default { fetch: request => requestStaffRecovery(request) };
