<script lang="ts">
    import { scale } from "svelte/transition";
    import { readerPrefs, readerStatus } from "$lib/readerState.svelte";

    const themes = [
        { name: "stone", bg: "bg-stone-50", border: "border-stone-300" },
        { name: "sepia", bg: "bg-[#f4ecd8]", border: "border-[#e3d5b8]" },
        { name: "dark", bg: "bg-stone-900", border: "border-stone-700" },
    ];
</script>

{#if readerStatus.showSettings}
    <div
        class="fixed inset-0 z-40 bg-transparent"
        onclick={() => (readerStatus.showSettings = false)}
    ></div>

    <div
        class="fixed top-20 left-6 z-50 bg-white dark:bg-stone-800 shadow-2xl rounded-2xl p-6 border border-stone-200 dark:border-stone-700 w-72"
        transition:scale={{ duration: 150, start: 0.95, opacity: 0 }}
    >
        <div class="space-y-8">
            <!-- Theme Selection -->
            <div>
                <p
                    class="text-[10px] uppercase tracking-[0.2em] mb-4 text-stone-400 font-bold"
                >
                    Background
                </p>
                <div class="grid grid-cols-3 gap-3">
                    {#each themes as theme}
                        <button
                            onclick={() => (readerPrefs.theme = theme.name)}
                            class="group relative flex flex-col items-center justify-center h-12 rounded-xl border-2 transition-all {theme.bg} {theme.border} {readerPrefs.theme ===
                            theme.name
                                ? 'ring-2 ring-orange-500 ring-offset-2 border-transparent'
                                : 'opacity-60 hover:opacity-100'}"
                        >
                            {#if readerPrefs.theme === theme.name}
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="3"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    class="text-orange-600"
                                    ><path d="M20 6 9 17l-5-5" /></svg
                                >
                            {/if}
                        </button>
                    {/each}
                </div>
            </div>

            <!-- Font Size -->
            <div>
                <div class="flex justify-between items-center mb-4">
                    <p
                        class="text-[10px] uppercase tracking-[0.2em] text-stone-400 font-bold"
                    >
                        Text Size
                    </p>
                    <span
                        class="text-[10px] font-mono font-bold text-orange-600"
                        >{readerPrefs.fontSize}PX</span
                    >
                </div>
                <div class="flex items-center gap-4">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        class="opacity-40"
                        ><path d="m3 15 4-8 4 8" /><path d="M4 13h6" /></svg
                    >

                    <input
                        type="range"
                        min="14"
                        max="32"
                        bind:value={readerPrefs.fontSize}
                        class="w-full accent-orange-600 cursor-pointer h-1.5 bg-stone-200 dark:bg-stone-700 rounded-lg appearance-none"
                    />

                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        class="opacity-40"
                        ><path d="m3 15 4-8 4 8" /><path d="M4 13h6" /></svg
                    >
                </div>
            </div>

            <!-- Brightness -->
            <div>
                <div class="flex justify-between items-center mb-4">
                    <p
                        class="text-[10px] uppercase tracking-[0.2em] text-stone-400 font-bold"
                    >
                        Brightness
                    </p>
                    <span
                        class="text-[10px] font-mono font-bold text-orange-600"
                        >{Math.round(readerPrefs.brightness * 100)}%</span
                    >
                </div>
                <div class="flex items-center gap-4">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        class="opacity-40"
                        ><path d="M12 2v2" /><path
                            d="m4.93 4.93 1.41 1.41"
                        /><path d="M20 12h2" /><path
                            d="m19.07 4.93-1.41 1.41"
                        /><path d="M15.828 15.828a5 5 0 1 1-7.656-7.656" /></svg
                    >

                    <input
                        type="range"
                        min="0.1"
                        max="1.0"
                        step="0.05"
                        bind:value={readerPrefs.brightness}
                        class="w-full accent-orange-600 cursor-pointer h-1.5 bg-stone-200 dark:bg-stone-700 rounded-lg appearance-none"
                    />

                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        class="opacity-40"
                        ><circle cx="12" cy="12" r="4" /><path
                            d="M12 2v2"
                        /><path d="M12 20v2" /><path
                            d="m4.93 4.93 1.41 1.41"
                        /><path d="m17.66 17.66 1.41 1.41" /><path
                            d="M2 12h2"
                        /><path d="M20 12h2" /><path
                            d="m6.34 17.66-1.41 1.41"
                        /><path d="m19.07 4.93-1.41 1.41" /></svg
                    >
                </div>
            </div>
        </div>
    </div>
{/if}

<style>
    input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 18px;
        height: 18px;
        background: white;
        border: 2px solid #ea580c;
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
    }

    input[type="range"]::-moz-range-thumb {
        width: 18px;
        height: 18px;
        background: white;
        border: 2px solid #ea580c;
        border-radius: 50%;
        cursor: pointer;
    }
</style>
