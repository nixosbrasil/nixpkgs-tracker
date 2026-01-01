<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import {
    hasToken,
    setToken,
    getHistoryList,
    deleteHistory,
    type History
  } from "$lib/utils";

  let prInput = "";
  let tokenInput = "";
  let tokenSet = false;
  let historyList: History[] = [];

  onMount(() => {
    tokenSet = hasToken();
    historyList = getHistoryList();

    // Check for query param 'pr' to support legacy redirects or direct access
    const urlParams = new URLSearchParams(window.location.search);
    const pr = urlParams.get("pr");
    if (pr) {
        goto(`/track/${pr}`);
    }
  });

  function handlePRKeypress(e: KeyboardEvent) {
    if (e.key === "Enter") {
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

  function saveTokenHandler() {
    setToken(tokenInput);
    tokenSet = true;
    tokenInput = "";
  }

  function removeTokenHandler() {
      setToken("");
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

      <div class="join w-full mb-8">
        <input
            class="input input-bordered join-item w-full"
            placeholder="Enter PR Number (e.g., 12345)"
            bind:value={prInput}
            on:keypress={handlePRKeypress}
        />
        <button class="btn btn-primary join-item" on:click={submitPR}>Track</button>
      </div>

       {#if historyList.length > 0}
        <div class="card bg-base-100 shadow-xl compact mb-8 text-left">
            <div class="card-body">
                <h3 class="card-title text-sm opacity-70">Recent History</h3>
                <ul class="menu bg-base-100 w-full p-0 [&_li>*]:rounded-none">
                    {#each historyList as item}
                        <li class="flex flex-row justify-between items-center hover:bg-base-200 p-2 rounded-md">
                            <a href="/track/{item.pr}" class="flex-grow truncate">
                                <span class="font-bold">#{item.pr}</span>
                                <span class="opacity-70 ml-2 text-xs truncate max-w-[200px]">{item.title}</span>
                            </a>
                            <button class="btn btn-ghost btn-xs" on:click|preventDefault|stopPropagation={() => removeHistory(item.pr)}>✕</button>
                        </li>
                    {/each}
                </ul>
            </div>
        </div>
      {/if}

      <div class="collapse collapse-arrow border border-base-300 bg-base-100 rounded-box">
        <input type="checkbox" />
        <div class="collapse-title text-xl font-medium">
          Settings / Token
        </div>
        <div class="collapse-content">
            <p class="text-sm mb-4">Set a GitHub token to avoid rate limits.</p>
            {#if tokenSet}
                <div class="alert alert-success mb-2">
                    <span>Token is set!</span>
                    <button class="btn btn-sm btn-ghost" on:click={removeTokenHandler}>Clear</button>
                </div>
            {:else}
                <div class="join w-full">
                    <input type="password" class="input input-bordered join-item w-full" placeholder="GitHub Token" bind:value={tokenInput} />
                    <button class="btn btn-secondary join-item" on:click={saveTokenHandler}>Save</button>
                </div>
            {/if}
        </div>
      </div>

      <div class="mt-8 text-sm opacity-50">
        <a href="https://github.com/lucasew/nixpkgs-tracker" target="_blank" class="link link-hover">Source Code</a>
      </div>

    </div>
  </div>
</div>
