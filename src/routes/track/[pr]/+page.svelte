<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import {
    defaultBranches,
    getAllBranches,
    getPR,
    isContain,
    type PR,
    saveHistory,
  } from "$lib/utils";

  let prNumber = $page.params.pr;
  let title = "Loading...";
  let titleColor = "";
  let titleHref = "";
  let branches: string[] = defaultBranches;
  // We use 'color' to store the status type (success/error) for logic, but we won't use it for the badge background directly anymore.
  let branchesStatus: Record<string, { status: string; color: string; class: string }> = {};
  let baseBranchStatus: { name: string; status: string; color: string; class: string } | null = null;
  let isDark = true;
  let error = "";

  // Initialize branchesStatus
  branches.forEach((branch) => {
    branchesStatus[branch] = { status: branch, color: "neutral", class: "loading" };
  });

  onMount(async () => {
    isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

    // Fetch dynamic branches
    const dynamicBranches = await getAllBranches();
    branches = dynamicBranches;

    // Initialize branchesStatus for any new branches
    branches.forEach((branch) => {
      if (!branchesStatus[branch]) {
        branchesStatus[branch] = { status: branch, color: "neutral", class: "loading" };
      }
    });

    if (prNumber) {
        handlePR(prNumber);
    }
  });

  async function handlePR(pr: string) {
    titleColor = "";
    titleHref = "";
    error = "";

    const prInt = parseInt(pr, 10);
    if (prInt < 20000) {
      error = "Pull Request before 20000 are not supported";
      title = "Error";
      return;
    }

    const prHeader = await getPR(pr);

    if (prHeader.closed) {
      error = "PR is closed";
      title = prHeader.title || "Closed PR";
    }

    if (prHeader.status === 404) {
      error = "PR not found";
       title = "Not Found";
      return;
    }

    if (prHeader.status === 403) {
      error = "Rate limit exceeded -- Please set token";
      title = "Rate Limit";
      return;
    }

    if (prHeader.status === 401) {
      error = "Unauthorized -- Please set correct token";
      title = "Unauthorized";
      return;
    }

    titleHref = "https://github.com/nixos/nixpkgs/pull/" + pr;
    title = prHeader.title;

    const mergeCommit = prHeader.merge_commit_sha;

    // Save history
    saveHistory({
        pr: prInt,
        title: prHeader.title,
        mergeCommit: mergeCommit
    });

    async function checkBranch(branch: string) {
      const merged = await isContain(branch, mergeCommit);
      if (merged) {
        branchesStatus[branch] = { status: `${branch}`, color: "success", class: "" };
      } else {
        branchesStatus[branch] = { status: `${branch}`, color: "error", class: "" };
      }
      branchesStatus = { ...branchesStatus };
    }

    async function checkBaseBranch(header: PR) {
      const baseBranch = header.base;
      const merged = header.merged;

      if (baseBranch) {
        if (merged) {
             baseBranchStatus = { name: baseBranch, status: `${baseBranch}`, color: "success", class: "" };
        } else {
             baseBranchStatus = { name: baseBranch, status: `${baseBranch}`, color: "error", class: "" };
        }
      }
    }

    if (prHeader.base && prHeader.base.startsWith("release-")) {
        await checkBaseBranch(prHeader);
    } else {
        baseBranchStatus = null;
        await Promise.all(branches.map(async (branch) => {
            await checkBranch(branch);
        }));
    }
  }

</script>

<div class="hero min-h-screen bg-base-200">
  <div class="hero-content text-center">
    <div class="max-w-md">
      <h1 class="text-5xl font-bold">
        {#if titleHref}
            <a href={titleHref} target="_blank" class="link link-hover">{title}</a>
        {:else}
            {title}
        {/if}
      </h1>

      {#if error}
        <div class="alert alert-error mt-5">
            <span>{error}</span>
        </div>
      {/if}

      <div class="py-6 flex flex-col gap-2 items-center">
        {#if baseBranchStatus}
            <div class="badge badge-outline gap-2 p-4 text-lg">
                {#if baseBranchStatus.color === 'success'}
                    <span>✅</span>
                {:else}
                    <span>❌</span>
                {/if}
                <span>{baseBranchStatus.status}</span>
            </div>
        {:else}
            {#each branches as branch}
                 {#if branchesStatus[branch]}
                    <div class="badge badge-outline gap-2 p-4 text-lg">
                         {#if branchesStatus[branch].class === 'loading'}
                            <span class="loading loading-spinner loading-xs"></span>
                         {:else if branchesStatus[branch].color === 'success'}
                            <span>✅</span>
                         {:else}
                            <span>❌</span>
                         {/if}
                         <span>{branchesStatus[branch].status}</span>
                    </div>
                 {/if}
            {/each}
        {/if}
      </div>

      <a href="/" class="btn btn-primary">Back to Home</a>
    </div>
  </div>
</div>
