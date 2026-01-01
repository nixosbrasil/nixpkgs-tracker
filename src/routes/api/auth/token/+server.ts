import { json, type RequestEvent } from '@sveltejs/kit';
import { jwtVerify } from 'jose';
import { SESSION_SECRET } from '$env/static/private';

export async function GET({ cookies }: RequestEvent) {
	const sessionCookie = cookies.get('session');

	if (!sessionCookie) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	try {
		const secret = new TextEncoder().encode(SESSION_SECRET);
		const { payload } = await jwtVerify(sessionCookie, secret);

		return json({
			token: payload.github_token,
			mode: payload.mode || 'read'
		});
	} catch {
		return json({ error: 'Invalid session' }, { status: 401 });
	}
}
