<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import {
    getHistoryList,
    deleteHistory,
    type History
  } from "$lib/utils";

  let prInput = "";
  let historyList: History[] = [];

  onMount(() => {
    historyList = getHistoryList();
  });

  function handlePRKeypress(e: KeyboardEvent) {
    if (e.key === "Enter") {
      redirectToPRPage();
    }
  }

  function redirectToPRPage() {
    const match = prInput.match(/\/pull\/(\d+)/);
    const pr = match ? match[1] : prInput;

    if (pr) {
      goto(`/track/${pr}`);
    }
  }

  function removeHistory(pr: number) {
      deleteHistory(pr);
      historyList = getHistoryList();
  }

  function loadHistory(pr: number) {
      goto(`/track/${pr}`);
  }
</script>

<div class="hero min-h-screen bg-base-200">
  <div class="hero-content text-center">
    <div class="max-w-md">
      <h1 class="text-5xl font-bold mb-8">Nixpkgs Tracker</h1>

      <div class="join w-full">
        <input
            type="text"
            class="input input-bordered join-item w-full"
            placeholder="PR Number (e.g. 12345)"
            bind:value={prInput}
            on:keypress={handlePRKeypress}
        />
        <button class="btn btn-primary join-item" on:click={redirectToPRPage}>Track</button>
      </div>

      <p class="py-6">Check if a PR is merged to Nixpkgs branches.</p>

      {#if historyList.length > 0}
        <div class="divider">History</div>
        <div class="overflow-x-auto h-64">
            <table class="table table-pin-rows">
                <tbody>
                    {#each historyList as item}
                        <tr>
                            <th>
                                <button class="btn btn-ghost btn-xs" on:click={() => loadHistory(item.pr)}>#{item.pr}</button>
                            </th>
                            <td>{item.title}</td>
                            <td>
                                <button class="btn btn-ghost btn-xs text-error" on:click={() => removeHistory(item.pr)}>✕</button>
                            </td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
      {/if}
    </div>
  </div>
</div>
