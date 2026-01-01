import { browser } from '$app/environment';

export const defaultBranches = [
	'staging-next',
	'master',
	'nixos-unstable-small',
	'nixpkgs-unstable',
	'nixos-unstable'
];

export function setToken(token: string) {
	if (browser) {
		localStorage.setItem('token', token);
	}
}

function getToken() {
	if (browser) {
		return localStorage.getItem('token');
	}
	return null;
}

export async function syncAuthToken() {
	if (!browser) return;
	try {
		const res = await fetch('/api/auth/token');
		if (res.ok) {
			const data = await res.json();
			if (data.token) {
				setToken(data.token);
			}
		}
	} catch (e) {
		console.error('Failed to sync auth token', e);
	}
}

export function hasToken(): boolean {
	return !!getToken();
}

function header(extraHeaders: Record<string, string> = {}) {
	const token = getToken();
	const headers: Record<string, string> = { ...extraHeaders };
	if (token) {
		headers.Authorization = `token ${token}`;
	}
	return headers;
}

export async function getAllBranches(): Promise<string[]> {
	const headers = header();
	try {
		const response = await fetch(
			'https://api.github.com/repos/NixOS/nixpkgs/git/matching-refs/heads/nix',
			{ headers }
		);
		if (!response.ok) {
			console.error('Failed to fetch branches');
			return defaultBranches;
		}
		const data = await response.json();
		const nixosBranches = data
			.map((b: any) => b.ref.replace('refs/heads/', ''))
			.filter((name: string) => /^(nixos|nixpkgs)-\d+\.\d+(-small|-darwin)?$/.test(name))
			.sort((a: string, b: string) => b.localeCompare(a, undefined, { numeric: true }))
			.slice(0, 4); // Get top 4 latest stable branches (2 nixos + 2 nixpkgs approx)

		// Merge and deduplicate
		return Array.from(new Set([...defaultBranches, ...nixosBranches]));
	} catch (e) {
		console.error('Error fetching branches:', e);
		return defaultBranches;
	}
}

export type User = {
	login: string;
	avatar_url: string;
	html_url: string;
};

export type Label = {
	name: string;
	color: string;
	description: string;
};

export type PR = {
	title: string;
	status: number;
	closed: boolean;
	merged: boolean;
	base: string;
	merge_commit_sha: string;
	body: string;
	body_html?: string;
	user: User;
	merged_by: User | null;
	labels: Label[];
	head_sha: string;
};

export async function getPR(pr: string): Promise<PR> {
	const headers = header({
		Accept: 'application/vnd.github.html+json'
	});
	const response = await fetch(`https://api.github.com/repos/nixos/nixpkgs/pulls/${pr}`, {
		headers
	});

	const data = await response.json();

	return {
		title: data.title,
		status: response.status,
		closed: data.state === 'closed' && !data.merged_at,
		merged: data.merged_at !== null,
		base: data.base?.ref,
		merge_commit_sha: data.merge_commit_sha,
		body: data.body,
		body_html: data.body_html,
		user: data.user,
		merged_by: data.merged_by,
		labels: data.labels,
		head_sha: data.head?.sha
	};
}

export async function getReviews(pr: string): Promise<User[]> {
	const headers = header();
	const response = await fetch(`https://api.github.com/repos/nixos/nixpkgs/pulls/${pr}/reviews`, {
		headers
	});
	if (!response.ok) return [];
	const data = await response.json();

	// Filter for approved and deduplicate users
	const approvers = new Map<string, User>();
	data.forEach((review: any) => {
		if (review.state === 'APPROVED') {
			approvers.set(review.user.login, review.user);
		}
	});

	return Array.from(approvers.values());
}

export type CIStatus = {
	id: string;
	name: string;
	state: string; // success, failure, pending, etc.
	url: string;
	description: string;
};

export async function getDetailedCIStatus(sha: string): Promise<CIStatus[]> {
	const headers = header();

	// Fetch Statuses (e.g. OfBorg)
	const statusesPromise = fetch(
		`https://api.github.com/repos/nixos/nixpkgs/commits/${sha}/statuses`,
		{ headers }
	).then((res) => (res.ok ? res.json() : []));

	// Fetch Check Runs (e.g. GitHub Actions)
	const checkRunsPromise = fetch(
		`https://api.github.com/repos/nixos/nixpkgs/commits/${sha}/check-runs`,
		{ headers }
	).then((res) => (res.ok ? res.json() : { check_runs: [] }));

	const [statuses, checkRunsData] = await Promise.all([statusesPromise, checkRunsPromise]);

	const ciStatuses: CIStatus[] = [];

	// Process Statuses
	// Statuses are returned latest first. We want unique contexts.
	const processedContexts = new Set<string>();
	for (const status of statuses) {
		if (!processedContexts.has(status.context)) {
			processedContexts.add(status.context);
			ciStatuses.push({
				id: status.id.toString(),
				name: status.context,
				state: status.state,
				url: status.target_url,
				description: status.description || ''
			});
		}
	}

	// Process Check Runs
	for (const run of checkRunsData.check_runs) {
		let state = 'pending';
		if (run.status === 'completed') {
			state = run.conclusion === 'success' ? 'success' : 'failure';
			if (run.conclusion === 'skipped' || run.conclusion === 'neutral') state = 'neutral';
		} else {
			state = 'pending';
		}

		ciStatuses.push({
			id: run.id.toString(),
			name: run.name,
			state: state,
			url: run.html_url,
			description: run.output?.title || ''
		});
	}

	return ciStatuses;
}

export async function isContain(branch: string, commit: string): Promise<boolean> {
	const headers = header();
	const url = `https://api.github.com/repos/nixos/nixpkgs/compare/${branch}...${commit}`;
	const response = await fetch(url, { headers });
	if (response.status === 404) {
		return false;
	}
	const data = await response.json();
	return data.status === 'identical' || data.status === 'behind';
}

export type History = {
	pr: number;
	title: string;
	mergeCommit: string;
};

export function getHistoryList(): History[] {
	if (!browser) return [];
	const history = localStorage.getItem('history');
	if (history) {
		return JSON.parse(history);
	}
	return [];
}

export function saveHistory(history: History) {
	if (!browser) return;
	const historyList = getHistoryList();
	// Check if it already exists to avoid duplicates
	if (!historyList.some((h) => h.pr === history.pr)) {
		historyList.push(history);
		localStorage.setItem('history', JSON.stringify(historyList));
	}
}

export function getHistoryTitle(pr: number): string {
	const history = getHistoryList();
	const item = history.find((item) => item.pr === pr);
	if (item) {
		return item.title;
	}
	return '';
}

export function deleteHistory(pr: number) {
	if (!browser) return;
	const history = getHistoryList();
	const newHistory = history.filter((item) => item.pr !== pr);
	localStorage.setItem('history', JSON.stringify(newHistory));
}
