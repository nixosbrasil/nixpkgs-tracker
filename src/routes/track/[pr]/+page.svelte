<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import {
    defaultBranches,
    getAllBranches,
    getPR,
    getReviews,
    getDetailedCIStatus,
    hasToken,
    setToken,
    isContain,
    type PR,
    type User,
    type CIStatus,
    saveHistory,
  } from "$lib/utils";

  let prNumber: string;
  let prHeader: PR | null = null;
  let approvers: User[] = [];
  let ciStatuses: CIStatus[] = [];
  let loading = true;
  let error = "";
  let branches: string[] = defaultBranches;
  let branchesStatus: Record<string, { status: string; color: string; class: string }> = {};
  let baseBranchStatus: { name: string; status: string; color: string; class: string } | null = null;

  // Token handling
  let tokenInput = "";
  let tokenSet = false;

  $: prNumber = $page.params.pr ?? "";

  onMount(async () => {
    // Ensure the PR value is a valid integer before processing.
    // This is the critical security check to prevent injection attacks.
    const prInt = parseInt(prNumber, 10);
    if (isNaN(prInt) || prInt <= 0) {
        error = "Invalid Pull Request number provided.";
        loading = false;
        return;
    }

    tokenSet = hasToken();
    try {
        const dynamicBranches = await getAllBranches();
        branches = dynamicBranches;
    } catch (e) {
        console.error("Failed to load branches", e);
    }

    // Initialize statuses
    branches.forEach((branch) => {
        branchesStatus[branch] = { status: 'pending', color: 'neutral', class: 'loading' };
    });

    if (prNumber) {
        handlePR(prNumber);
    }
  });

  async function handlePR(pr: string) {
    loading = true;
    error = "";
    prHeader = null;
    branchesStatus = {};
     branches.forEach((branch) => {
        branchesStatus[branch] = { status: 'checking...', color: 'neutral', class: 'loading' };
    });


    const prInt = parseInt(pr, 10);
    if (prInt < 20000) {
      error = "Pull Request before 20000 are not supported";
      loading = false;
      return;
    }

    const header = await getPR(pr);
    prHeader = header;

    if (header.status === 404) {
      error = "PR not found";
      loading = false;
      return;
    }

    if (header.status === 403) {
      error = "Rate limit exceeded. Please set a GitHub token.";
      loading = false;
      return;
    }

     if (header.status === 401) {
      error = "Unauthorized. Please check your token.";
      loading = false;
      setToken("");
      tokenSet = false;
      return;
    }

    // Save history
    if (header.merge_commit_sha) {
        saveHistory({
            pr: prInt,
            title: header.title,
            mergeCommit: header.merge_commit_sha
        });
    }

    // Fetch Reviews and CI Status
    approvers = await getReviews(pr);
    if (header.head_sha) {
        ciStatuses = await getDetailedCIStatus(header.head_sha);
    }

    const mergeCommit = header.merge_commit_sha;

    if (header.base && header.base.startsWith("release-")) {
        await checkBaseBranch(header);
    } else {
        await Promise.all(branches.map(async (branch) => {
            await checkBranch(branch, mergeCommit);
        }));
    }
    loading = false;
  }

  async function checkBranch(branch: string, mergeCommit: string) {
      // If PR is not merged yet (no merge commit), it can't be in any branch
      if (!mergeCommit) {
        branchesStatus[branch] = { status: 'Not Merged', color: 'neutral', class: '' };
        branchesStatus = {...branchesStatus};
        return;
      }

      const merged = await isContain(branch, mergeCommit);
      if (merged) {
        branchesStatus[branch] = { status: 'Merged', color: 'success', class: '' };
      } else {
        branchesStatus[branch] = { status: 'Not Merged', color: 'error', class: '' };
      }
      branchesStatus = {...branchesStatus};
  }

  async function checkBaseBranch(header: PR) {
      const baseBranch = header.base;
      const merged = header.merged;
      if (baseBranch) {
          if (merged) {
               baseBranchStatus = { name: baseBranch, status: 'Merged', color: 'success', class: '' };
          } else {
               baseBranchStatus = { name: baseBranch, status: 'Not Merged', color: 'error', class: '' };
          }
      }
  }

  function saveTokenHandler() {
      setToken(tokenInput);
      tokenSet = true;
      if (prNumber) handlePR(prNumber);
  }

  // Helper to determine contrast text color for badges
  // Simple heuristic: if hex color is bright, use black, else white
  function getContrastColor(hex: string) {
      if (hex.length !== 6) return 'black';
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
      return (yiq >= 128) ? 'black' : 'white';
  }

  function getStatusColor(state: string) {
      if (state === 'success') return 'badge-success';
      if (state === 'failure' || state === 'error') return 'badge-error';
      if (state === 'pending' || state === 'in_progress') return 'badge-warning';
      return 'badge-neutral';
  }
</script>

<div class="container mx-auto p-4 max-w-4xl">
    <div class="breadcrumbs text-sm mb-4">
      <ul>
        <li><a href="/">Home</a></li>
        <li>Tracking PR #{prNumber}</li>
      </ul>
    </div>

    {#if error}
        <div role="alert" class="alert alert-error mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span>{error}</span>
        </div>
        {#if error.includes("token") || error.includes("Unauthorized")}
             <div class="card bg-base-100 shadow-xl mb-4">
                <div class="card-body">
                    <h2 class="card-title">GitHub Token</h2>
                    <input type="text" placeholder="Paste your token here" class="input input-bordered w-full" bind:value={tokenInput} />
                    <div class="card-actions justify-end">
                        <button class="btn btn-primary" on:click={saveTokenHandler}>Save & Retry</button>
                    </div>
                </div>
            </div>
        {/if}
    {/if}

    {#if prHeader && !error}
        <!-- PR Header Card -->
        <div class="card bg-base-100 shadow-xl mb-6">
          <div class="card-body">
            <h2 class="card-title text-2xl flex justify-between items-start">
                <a href="https://github.com/nixos/nixpkgs/pull/{prNumber}" target="_blank" class="link link-hover text-primary break-all">
                    {prHeader.title}
                </a>
                <span class="text-sm text-gray-500 font-normal whitespace-nowrap">
                    #{prNumber}
                </span>
            </h2>

            <!-- Description Toggle (Moved up as requested) -->
             <div class="collapse collapse-arrow bg-base-200 mb-4 rounded-box">
                <input type="checkbox" />
                <div class="collapse-title text-md font-medium">
                    PR Description
                </div>
                <div class="collapse-content">
                    <article class="prose prose-sm max-w-none">
                        {#if prHeader.body_html}
                             {@html prHeader.body_html}
                        {:else}
                             <p class="whitespace-pre-wrap">{prHeader.body || "No description provided."}</p>
                        {/if}
                    </article>
                </div>
            </div>

            <div class="flex flex-wrap gap-2 mb-4 items-center">
                 <span class="badge badge-lg {prHeader.closed && !prHeader.merged ? 'badge-error' : (prHeader.merged ? 'badge-success' : 'badge-neutral')}">
                    {prHeader.merged ? 'Merged' : (prHeader.closed ? 'Closed' : 'Open')}
                </span>
            </div>

            {#if ciStatuses.length > 0}
                 <div class="collapse collapse-arrow bg-base-200 mb-4 rounded-box">
                    <input type="checkbox" />
                    <div class="collapse-title text-md font-medium">
                        CI Status
                    </div>
                    <div class="collapse-content">
                         <div class="flex flex-col gap-2 mt-2">
                            {#each ciStatuses as status}
                                <div class="flex items-center gap-2">
                                     <div class="badge {getStatusColor(status.state)} badge-sm"></div>
                                     <a href={status.url} target="_blank" class="link link-hover flex-1 truncate" title={status.description || status.state}>
                                         {status.name}
                                     </a>
                                     <span class="text-xs text-base-content/60 uppercase">{status.state.replace('_', ' ')}</span>
                                </div>
                            {/each}
                        </div>
                    </div>
                </div>
            {/if}

            <div class="flex flex-wrap gap-2 mb-4">
                {#each prHeader.labels as label}
                    <span
                        class="badge badge-outline"
                        style="background-color: #{label.color}; color: {getContrastColor(label.color)}; border-color: #{label.color};"
                    >
                        {label.name}
                    </span>
                {/each}
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mt-2">
                <div>
                     <p><strong>Base:</strong> <span class="badge badge-ghost">{prHeader.base}</span></p>
                     <p class="mt-1"><strong>Merge Commit:</strong> <span class="font-mono text-xs">{prHeader.merge_commit_sha ? prHeader.merge_commit_sha.substring(0,7) : 'N/A'}</span></p>
                </div>
                <div class="flex flex-col gap-2">
                    <div class="flex items-center gap-2">
                         <strong>Created by:</strong>
                         <a href={prHeader.user.html_url} target="_blank" class="badge badge-lg gap-2 pl-0 hover:bg-base-200 transition-colors">
                             <div class="avatar">
                                <div class="w-6 rounded-full">
                                    <img src={prHeader.user.avatar_url} alt={prHeader.user.login} />
                                </div>
                             </div>
                             {prHeader.user.login}
                         </a>
                    </div>
                     {#if prHeader.merged_by}
                        <div class="flex items-center gap-2">
                            <strong>Merged by:</strong>
                             <a href={prHeader.merged_by.html_url} target="_blank" class="badge badge-lg gap-2 pl-0 hover:bg-base-200 transition-colors">
                                 <div class="avatar">
                                    <div class="w-6 rounded-full">
                                        <img src={prHeader.merged_by.avatar_url} alt={prHeader.merged_by.login} />
                                    </div>
                                 </div>
                                 {prHeader.merged_by.login}
                             </a>
                        </div>
                     {/if}
                     {#if approvers.length > 0}
                         <div class="flex items-center gap-2 flex-wrap">
                            <strong>Approved by:</strong>
                            {#each approvers as approver}
                                <a href={approver.html_url} target="_blank" class="badge badge-lg gap-2 pl-0 hover:bg-base-200 transition-colors">
                                     <div class="avatar">
                                        <div class="w-6 rounded-full">
                                            <img src={approver.avatar_url} alt={approver.login} />
                                        </div>
                                     </div>
                                     {approver.login}
                                </a>
                            {/each}
                         </div>
                     {/if}
                </div>
            </div>

          </div>
        </div>

        <!-- Branch Tracking Cards -->
        <h3 class="text-xl font-bold mb-4">Branch Status</h3>
        <div class="grid gap-4 md:grid-cols-2">
            {#if baseBranchStatus}
                 <div class="card bg-base-100 shadow-xl border-l-4 {baseBranchStatus.color === 'success' ? 'border-success' : 'border-error'}">
                    <div class="card-body">
                        <h3 class="card-title">{baseBranchStatus.name}</h3>
                        <div class="badge {baseBranchStatus.color === 'success' ? 'badge-success' : 'badge-error'} gap-2">
                             {#if baseBranchStatus.status === 'Merged'}
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-4">
                                  <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                </svg>
                             {:else}
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-4">
                                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                                </svg>
                             {/if}
                        </div>
                    </div>
                 </div>
            {:else}
                {#each branches as branch}
                    <div class="card bg-base-100 shadow-xl border-l-4 {branchesStatus[branch]?.color === 'success' ? 'border-success' : (branchesStatus[branch]?.color === 'error' ? 'border-error' : 'border-neutral')}">
                        <div class="card-body flex-row justify-between items-center">
                            <h3 class="card-title text-lg">{branch}</h3>
                             {#if branchesStatus[branch]?.class === 'loading'}
                                <span class="loading loading-spinner loading-md"></span>
                             {:else}
                                <div class="badge {branchesStatus[branch]?.color === 'success' ? 'badge-success' : (branchesStatus[branch]?.color === 'error' ? 'badge-error' : 'badge-neutral')} badge-lg">
                                    {#if branchesStatus[branch]?.status === 'Merged'}
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-4">
                                          <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                        </svg>
                                    {:else if branchesStatus[branch]?.status === 'Not Merged'}
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-4">
                                          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                                        </svg>
                                    {:else}
                                        {branchesStatus[branch]?.status}
                                    {/if}
                                </div>
                             {/if}
                        </div>
                    </div>
                {/each}
            {/if}
        </div>
    {:else if loading && !error}
        <div class="flex justify-center p-10">
            <span class="loading loading-infinity loading-lg text-primary"></span>
        </div>
    {/if}
</div>
