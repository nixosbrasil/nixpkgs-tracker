<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { hasToken, setToken, getHistoryList, deleteHistory, type History } from '$lib/utils';

	let prInput = '';
	let tokenSet = false;
	let historyList: History[] = [];

	onMount(() => {
		tokenSet = hasToken();
		historyList = getHistoryList();

		// Check for query param 'pr' to support legacy redirects or direct access
		const urlParams = new URLSearchParams(window.location.search);
		const pr = urlParams.get('pr');
		if (pr) {
			goto(`/track/${pr}`);
		}
	});

	function handlePRKeypress(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			submitPR();
		}
	}

	function submitPR() {
		const match = prInput.match(/\/pull\/(\d+)/);
		const pr = match ? match[1] : prInput;

		if (pr) {
			goto(`/track/${pr}`);
		}
	}

	async function removeTokenHandler() {
		// Try to logout from server session first
		try {
			await fetch('/api/auth/logout', { method: 'POST' });
		} catch (e) {
			console.error('Failed to logout from session', e);
		}
		setToken('');
		tokenSet = false;
	}

	function removeHistory(pr: number) {
		deleteHistory(pr);
		historyList = getHistoryList();
	}
</script>

<div class="hero min-h-screen bg-base-200">
	<div class="hero-content text-center">
		<div class="max-w-md">
			<h1 class="text-5xl font-bold">Nixpkgs Tracker</h1>
			<p class="py-6">Track the status of your Nixpkgs Pull Request across different branches.</p>

			<div class="join mb-8 w-full">
				<input
					class="input-bordered input join-item w-full"
					placeholder="Enter PR Number (e.g., 12345)"
					bind:value={prInput}
					on:keypress={handlePRKeypress}
				/>
				<button class="btn join-item btn-primary" on:click={submitPR}>Track</button>
			</div>

			{#if historyList.length > 0}
				<div class="compact card mb-8 bg-base-100 text-left shadow-xl">
					<div class="card-body">
						<h3 class="card-title text-sm opacity-70">Recent History</h3>
						<ul class="menu w-full bg-base-100 p-0 [&_li>*]:rounded-none">
							{#each historyList as item}
								<li
									class="flex flex-row items-center justify-between rounded-md p-2 hover:bg-base-200"
								>
									<a href="/track/{item.pr}" class="flex-grow truncate">
										<span class="font-bold">#{item.pr}</span>
										<span class="ml-2 max-w-[200px] truncate text-xs opacity-70">{item.title}</span>
									</a>
									<button
										class="btn btn-ghost btn-xs"
										on:click|preventDefault|stopPropagation={() => removeHistory(item.pr)}>✕</button
									>
								</li>
							{/each}
						</ul>
					</div>
				</div>
			{/if}

			<div class="collapse-arrow collapse rounded-box border border-base-300 bg-base-100">
				<input type="checkbox" />
				<div class="collapse-title text-xl font-medium">Settings / Token</div>
				<div class="collapse-content">
					<p class="mb-4 text-sm">Set a GitHub token to avoid rate limits.</p>
					{#if tokenSet}
						<div class="mb-2 alert flex justify-between alert-success">
							<span>Token is set!</span>
							<button class="btn btn-ghost btn-sm" on:click={removeTokenHandler}
								>Logout / Clear</button
							>
						</div>
					{:else}
						<div class="flex flex-col gap-4">
							<a href="/api/auth/github" class="btn w-full btn-neutral">
								<svg viewBox="0 0 24 24" aria-hidden="true" class="h-6 w-6 fill-current"
									><path
										d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.05-.015-2.055-3.33.72-4.035-1.605-4.035-1.605-.54-1.38-1.335-1.755-1.335-1.755-1.087-.75.075-.735.075-.735 1.2.09 1.83 1.245 1.83 1.245 1.065 1.83 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405 1.02 0 2.04.135 3 .405 2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.285 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"
									></path></svg
								>
								Login with GitHub
							</a>
						</div>
					{/if}
				</div>
			</div>

			<div class="mt-8 text-sm opacity-50">
				<a href="https://github.com/ocfox/nixpkgs-tracker" target="_blank" class="link link-hover"
					>Source Code</a
				>
			</div>
		</div>
	</div>
</div>
