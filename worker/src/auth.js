const SESSION_TTL = 60 * 60 * 24 * 7; // 7 days

export function parseCookies(header = '') {
  return Object.fromEntries(
    header.split(';').map(c => {
      const [k, ...v] = c.trim().split('=');
      return [decodeURIComponent(k.trim()), decodeURIComponent(v.join('=').trim())];
    }).filter(([k]) => k)
  );
}

export async function getSession(request, env) {
  if (!env.MERCURY_KV) return null;
  const { mercury_session } = parseCookies(request.headers.get('Cookie') || '');
  if (!mercury_session) return null;
  return env.MERCURY_KV.get(`session:${mercury_session}`, 'json');
}

export function redirectToLogin(origin) {
  return Response.redirect(`${origin}/auth/github`, 302);
}

export async function handleAuth(request, env) {
  const url = new URL(request.url);

  // ── Start OAuth ───────────────────────────────────────
  if (url.pathname === '/auth/github') {
    if (!env.GITHUB_CLIENT_ID) {
      return new Response('GITHUB_CLIENT_ID secret not set', { status: 500 });
    }
    const state = crypto.randomUUID();
    await env.MERCURY_KV.put(`oauth:${state}`, '1', { expirationTtl: 600 });

    const authUrl = new URL('https://github.com/login/oauth/authorize');
    authUrl.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', `${url.origin}/auth/github/callback`);
    authUrl.searchParams.set('scope', 'read:user');
    authUrl.searchParams.set('state', state);
    return Response.redirect(authUrl.toString(), 302);
  }

  // ── OAuth callback ────────────────────────────────────
  if (url.pathname === '/auth/github/callback') {
    const code  = url.searchParams.get('code');
    const state = url.searchParams.get('state');

    const validState = state && await env.MERCURY_KV.get(`oauth:${state}`);
    if (!validState) return new Response('Invalid or expired state', { status: 400 });
    await env.MERCURY_KV.delete(`oauth:${state}`);

    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id:     env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: `${url.origin}/auth/github/callback`,
      }),
    });
    const { access_token, error } = await tokenRes.json();
    if (!access_token) return new Response(`OAuth failed: ${error}`, { status: 401 });

    const userRes = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${access_token}`, 'User-Agent': 'mercury-worker/1.0' },
    });
    const u = await userRes.json();

    const sessionId = crypto.randomUUID();
    await env.MERCURY_KV.put(
      `session:${sessionId}`,
      JSON.stringify({ login: u.login, name: u.name || u.login, avatar: u.avatar_url }),
      { expirationTtl: SESSION_TTL }
    );

    return new Response(null, {
      status: 302,
      headers: {
        Location: '/dashboard',
        'Set-Cookie': `mercury_session=${sessionId}; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_TTL}; Path=/`,
      },
    });
  }

  // ── Logout ────────────────────────────────────────────
  if (url.pathname === '/auth/logout') {
    const { mercury_session } = parseCookies(request.headers.get('Cookie') || '');
    if (mercury_session) await env.MERCURY_KV.delete(`session:${mercury_session}`);
    return new Response(null, {
      status: 302,
      headers: {
        Location: '/dashboard',
        'Set-Cookie': 'mercury_session=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/',
      },
    });
  }

  return null; // not an auth route
}
