import { redirect, type RequestEvent } from '@sveltejs/kit';
import { SignJWT } from 'jose';
import { GITHUB_CLIENT_ID, GITHUB_CALLBACK_URL, SESSION_SECRET } from '$env/static/private';

export async function GET({ url, cookies }: RequestEvent) {
	if (!GITHUB_CLIENT_ID || !GITHUB_CALLBACK_URL || !SESSION_SECRET) {
		return new Response('Missing environment variables', { status: 500 });
	}

	const mode = url.searchParams.get('mode') || 'read';
	const state = crypto.randomUUID();
	const scopes = 'read:user read:org';

	const authUrl = new URL('https://github.com/login/oauth/authorize');
	authUrl.searchParams.set('client_id', GITHUB_CLIENT_ID);
	authUrl.searchParams.set('redirect_uri', GITHUB_CALLBACK_URL);
	authUrl.searchParams.set('scope', scopes);
	authUrl.searchParams.set('state', state);

	const secret = new TextEncoder().encode(SESSION_SECRET);
	const stateToken = await new SignJWT({ state, mode })
		.setProtectedHeader({ alg: 'HS256' })
		.setIssuedAt()
		.setExpirationTime('5m')
		.sign(secret);

	cookies.set('oauth_state', stateToken, {
		path: '/',
		httpOnly: true,
		secure: url.protocol === 'https:',
		maxAge: 300,
		sameSite: 'lax'
	});

	throw redirect(302, authUrl.toString());
}
