import { redirect, type RequestEvent } from '@sveltejs/kit';
import { SignJWT, jwtVerify } from 'jose';
import { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, SESSION_SECRET } from '$env/static/private';

export async function GET({ url, cookies }: RequestEvent) {
	const code = url.searchParams.get('code');
	const stateFromParam = url.searchParams.get('state');
	const oauthStateCookie = cookies.get('oauth_state');

	if (!code || !stateFromParam || !oauthStateCookie) {
		return new Response('Invalid request: missing parameters.', { status: 400 });
	}

	const secret = new TextEncoder().encode(SESSION_SECRET);
	let stateFromToken: string;
	let mode: string;

	try {
		const { payload } = await jwtVerify(oauthStateCookie, secret);
		if (typeof payload.state !== 'string' || typeof payload.mode !== 'string') {
			throw new Error('Invalid JWT payload');
		}
		stateFromToken = payload.state;
		mode = payload.mode;
	} catch {
		return new Response('Invalid or expired OAuth state token.', { status: 403 });
	}

	if (stateFromParam !== stateFromToken) {
		return new Response('Invalid CSRF token (state mismatch).', { status: 403 });
	}

	const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
		method: 'POST',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			client_id: GITHUB_CLIENT_ID,
			client_secret: GITHUB_CLIENT_SECRET,
			code
		})
	});

	const data = await tokenRes.json();
	const access_token = data.access_token;

	if (!access_token) {
		return new Response(
			`Failed to get token: ${data.error_description || data.error || 'Unknown error'}`,
			{ status: 500 }
		);
	}

	const session = await new SignJWT({
		github_token: access_token,
		mode: mode
	})
		.setProtectedHeader({ alg: 'HS256' })
		.setIssuedAt()
		.setExpirationTime('7d')
		.sign(secret);

	cookies.set('session', session, {
		path: '/',
		httpOnly: true,
		secure: url.protocol === 'https:',
		sameSite: 'strict',
		maxAge: 60 * 60 * 24 * 7 // 7 days
	});

	cookies.delete('oauth_state', { path: '/' });

	throw redirect(302, '/');
}
