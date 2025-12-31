<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import {
    branches,
    getPR,
    hasToken,
    isContain,
    setToken,
    type PR,
    getHistoryList,
    saveHistory,
    deleteHistory,
    type History
  } from "$lib/utils";

  let prInput = "";
  let tokenInput = "";
  let title = "Nixpkgs-Tracker";
  let titleColor = "";
  let titleHref = "";
  let checkButtonDisabled = false;
  let saveTokenButtonText = "Set Token";
  let tokenMessage = "";
  let branchesStatus: Record<string, { status: string; color: string; class: string }> = {};
  let baseBranchStatus: { name: string; status: string; color: string; class: string } | null = null;
  let isDark = true;
  let historyList: History[] = [];

  // Initialize branchesStatus
  branches.forEach((branch) => {
    branchesStatus[branch] = { status: branch, color: "", class: "" };
  });

  onMount(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const pr = urlParams.get("pr");

    isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    updateColorScheme(isDark);

    if (hasToken()) {
        tokenMessage = "Token is set";
        saveTokenButtonText = "Change Token";
    }

    historyList = getHistoryList();

    if (pr) {
      prInput = pr;
      handlePR(pr);
    }
  });

  function updateColorScheme(dark: boolean) {
    isDark = dark;
    if (typeof document !== 'undefined') {
        document.body.style.backgroundColor = isDark ? "#333" : "#fff";
        document.body.style.color = isDark ? "#fff" : "#333";
    }
  }

  function toggleColorScheme() {
    updateColorScheme(!isDark);
  }

  function handleTitleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      toggleColorScheme();
    }
  }

  function handleTokenKeypress(e: KeyboardEvent) {
    if (e.key === "Enter") {
      saveToken();
    }
  }

  function saveToken() {
    setToken(tokenInput);
    tokenMessage = "Token is set";
    saveTokenButtonText = "Change Token";
    tokenInput = "";
  }

  function handlePRKeypress(e: KeyboardEvent) {
    if (e.key === "Enter") {
      redirectToPRPage();
    }
  }

  function redirectToPRPage() {
    const match = prInput.match(/\/pull\/(\d+)/);
    const pr = match ? match[1] : prInput;

    if (pr) {
      goto(`?pr=${pr}`);
      handlePR(pr);
    }
  }

  function enableButton(set: boolean) {
    checkButtonDisabled = !set;
  }

  function setPRtitle(newTitle: string) {
    title = newTitle;
    document.title = newTitle;
  }

  async function handlePR(pr: string) {
    enableButton(false);
    titleColor = "";
    titleHref = "";

    const prNumber = parseInt(pr, 10);
    if (prNumber < 20000) {
      setPRtitle("Pull Request before 20000 are not supported");
      titleColor = "red";
      enableButton(true);
      return;
    }

    const prHeader = await getPR(pr);

    if (prHeader.closed) {
      setPRtitle("PR is closed");
      titleColor = "red";
      enableButton(true);
      return;
    }

    if (prHeader.status === 404) {
      setPRtitle("PR not found");
      titleHref = "#";
      titleColor = "red";
      enableButton(true);
      return;
    }

    if (prHeader.status === 403) {
      setPRtitle("Rate limit exceeded -- Please set token");
      titleColor = "red";
      enableButton(true);
      return;
    }

    if (prHeader.status === 401) {
      setPRtitle("Unauthorized -- Please set correct token");
      titleColor = "red";

      setToken("");
      saveTokenButtonText = "Set Token";
      tokenMessage = "";

      enableButton(true);
      return;
    }

    titleHref = "https://github.com/nixos/nixpkgs/pull/" + pr;
    setPRtitle(prHeader.title);

    const mergeCommit = prHeader.merge_commit_sha;

    // Save history
    saveHistory({
        pr: prNumber,
        title: prHeader.title,
        mergeCommit: mergeCommit
    });
    historyList = getHistoryList();

    async function checkBranch(branch: string) {
      const merged = await isContain(branch, mergeCommit);
      if (merged) {
        branchesStatus[branch] = { status: `${branch} ✅`, color: "green", class: "" };
      } else {
        branchesStatus[branch] = { status: `${branch} ❌`, color: "gray", class: "unmerged" };
      }
    }

    async function checkBaseBranch(header: PR) {
      const baseBranch = header.base;
      const merged = header.merged;

      if (baseBranch) {
        if (merged) {
             baseBranchStatus = { name: baseBranch, status: `${baseBranch} ✅`, color: "green", class: "" };
        } else {
             baseBranchStatus = { name: baseBranch, status: `${baseBranch} ❌`, color: "gray", class: "unmerged" };
        }
      }
    }

    if (prHeader.base && prHeader.base.startsWith("release-")) {
        branchesStatus = {};
        await checkBaseBranch(prHeader);
    } else {
        baseBranchStatus = null;
        await Promise.all(branches.map(async (branch) => {
            await checkBranch(branch);
        }));
        branchesStatus = { ...branchesStatus };
    }

    enableButton(true);
  }

  function removeHistory(pr: number) {
      deleteHistory(pr);
      historyList = getHistoryList();
  }

  function loadHistory(pr: number) {
      prInput = pr.toString();
      redirectToPRPage();
  }
</script>

<div id="app">
  <div>
    <h1 id="title"
        style="color: {titleColor}; cursor: pointer;"
        on:click={toggleColorScheme}
        on:keydown={handleTitleKeydown}
        role="button"
        tabindex="0"
    >{title}</h1>
    <p>Check if a PR is merged to the following branches. <a href="https://github.com/ocfox/nixpkgs-tracker" target="_blank">Source</a></p>
    <p>If you just check it a couple times an hour, it will work fine without the token.</p>
    <div class="token">
      <input type="text" name="token" id="token" class="input" placeholder="Set Token for gh limit" bind:value={tokenInput} on:keypress={handleTokenKeypress}>
      <button id="save-token" type="button" on:click={saveToken}>{saveTokenButtonText}</button>
      {#if tokenMessage}
        <span style="margin-left: 5px;">{tokenMessage}</span>
      {/if}
    </div>

    <div class="card">
      <input type="text" id="pr" name="text" class="input" placeholder="Pull Request Number" bind:value={prInput} on:keypress={handlePRKeypress} disabled={checkButtonDisabled}>
      <button id="check" type="button" on:click={redirectToPRPage} disabled={checkButtonDisabled}>Check</button>
    </div>
    {#if titleHref}
        <a id="pr-link" href={titleHref} target="_blank">{title}</a>
    {/if}
    <div id="branch" class="card">
        {#if baseBranchStatus}
            <h2 id="base-branch" style="color: {baseBranchStatus.color}" class={baseBranchStatus.class}>{baseBranchStatus.status}</h2>
        {:else}
            {#each branches as branch}
                <h2 id={branch} style="color: {branchesStatus[branch]?.color}" class={branchesStatus[branch]?.class}>{branchesStatus[branch]?.status}</h2>
            {/each}
        {/if}
    </div>
  </div>

  {#if historyList.length > 0}
  <div class="history">
      <h3>History</h3>
      <ul>
          {#each historyList as item}
            <li>
                <button class="link-button" on:click={() => loadHistory(item.pr)}>#{item.pr}</button>: {item.title}
                <button style="padding: 2px 6px; font-size: 0.8em; margin-left: 5px;" on:click={() => removeHistory(item.pr)}>x</button>
            </li>
          {/each}
      </ul>
  </div>
  {/if}
</div>

<style>
    .history {
        position: absolute;
        top: 0;
        left: 0;
        margin-top: 5em; /* Adjusted to not overlap with top */
        padding: 0.5em;
        text-align: left;
    }
    .history ul {
        list-style-type: none;
        padding: 0;
    }
    .history li {
        margin-bottom: 0.25em;
    }
    .link-button {
        background: none;
        border: none;
        padding: 0;
        color: #646cff;
        cursor: pointer;
        text-decoration: underline;
        font-family: inherit;
        font-size: inherit;
    }
    .link-button:hover {
        color: #535bf2;
    }

    @media (max-width: 600px) {
      .history {
        display: none;
      }
    }
</style>
