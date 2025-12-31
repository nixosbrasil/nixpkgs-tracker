<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import './layout.css';
  import favicon from '$lib/assets/favicon.svg';
  import { hasToken, setToken } from '$lib/utils';

  let { children } = $props();
  let token = $state("");
  let isTokenSet = $state(false);
  let showModal = $state(false);

  onMount(() => {
    isTokenSet = hasToken();
  });

  function openTokenModal() {
    showModal = true;
  }

  function closeTokenModal() {
    showModal = false;
  }

  function saveToken() {
    setToken(token);
    isTokenSet = true;
    closeTokenModal();
    token = "";
  }

  function clearToken() {
    setToken("");
    isTokenSet = false;
  }
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<div class="navbar bg-base-100">
  <div class="flex-1">
    <a href="/" class="btn btn-ghost text-xl">Nixpkgs Tracker</a>
  </div>
  <div class="flex-none gap-2">
    {#if isTokenSet}
        <div class="dropdown dropdown-end">
        <div tabindex="0" role="button" class="btn btn-ghost btn-circle avatar placeholder">
            <div class="bg-neutral text-neutral-content rounded-full w-10">
            <span class="text-xs">User</span>
            </div>
        </div>
        <ul tabindex="0" class="mt-3 z-[1] p-2 shadow menu menu-sm dropdown-content bg-base-100 rounded-box w-52">
            <li><button onclick={clearToken}>Logout (Clear Token)</button></li>
        </ul>
        </div>
    {:else}
        <button class="btn btn-sm btn-outline" onclick={openTokenModal}>Login (Set Token)</button>
    {/if}
  </div>
</div>

{@render children()}

{#if showModal}
<dialog class="modal modal-open">
  <div class="modal-box">
    <h3 class="font-bold text-lg">Set GitHub Token</h3>
    <p class="py-4">Enter your GitHub Personal Access Token to increase rate limits.</p>
    <input type="text" placeholder="Type here" class="input input-bordered w-full" bind:value={token} />
    <div class="modal-action">
      <button class="btn" onclick={closeTokenModal}>Cancel</button>
      <button class="btn btn-primary" onclick={saveToken}>Save</button>
    </div>
  </div>
  <form method="dialog" class="modal-backdrop">
    <button onclick={closeTokenModal}>close</button>
  </form>
</dialog>
{/if}
