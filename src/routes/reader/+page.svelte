<script lang="ts">
    import "$lib/styles/reader-theme.css";
    import { invoke } from "@tauri-apps/api/core";
    import { onMount } from "svelte";
    import { fly } from "svelte/transition";
    import { goto } from "$app/navigation";
    import { library } from "$lib/eLibLoader.svelte";
    import {
        readerPrefs,
        readerStatus,
        initSettings,
    } from "$lib/readerState.svelte";
    import { readerCore, scrollViewport } from "$lib/readerCore.svelte";
    import NavTree from "$lib/components/NavTree.svelte";
    import SettingsModal from "$lib/components/reader/SettingsModal.svelte";
    import ReaderCanvas from "$lib/components/reader/ReaderCanvas.svelte";
    import { error } from "@tauri-apps/plugin-log";

    function handleKeydown(e: KeyboardEvent) {
        if (readerStatus.showSettings || readerStatus.showToc) return;
        if (e.key === "ArrowRight") readerCore.goNext();
        if (e.key === "ArrowLeft") readerCore.goPrev();

        if (e.key === "ArrowDown") {
            e.preventDefault();
            scrollViewport("down");
        }
        if (e.key === "ArrowUp") {
            e.preventDefault();
            scrollViewport("up");
        }
    }

    onMount(() => {
        const book = library.selectedBook;

        if (!book) {
            goto("/");
            return;
        }

        (async () => {
            try {
                await initSettings();
                await readerCore.init();
            } catch (e) {
                error(`Initialization error: ${e}`);
            }
        })();

        window.addEventListener("keydown", handleKeydown);

        return () => {
            window.removeEventListener("keydown", handleKeydown);
        };
    });
</script>

<div
    class="reader-root h-screen flex flex-col overflow-hidden transition-colors duration-500"
    data-theme={readerPrefs.theme}
    style="--reader-font-size: {readerPrefs.fontSize}px"
    role="none"
>
    <div class="group fixed top-0 w-full z-40 h-20" role="none">
        <header
            class="flex justify-between items-center px-6 py-4 bg-inherit border-b border-stone-500/10 transition-all duration-300 translate-y-[-100%] group-hover:translate-y-0 opacity-0 group-hover:opacity-100 backdrop-blur-md"
        >
            <div class="flex gap-4">
                <button
                    onclick={() =>
                        (readerStatus.showToc = !readerStatus.showToc)}
                    class="icon-btn"
                    aria-label="Toggle Table of Contents"
                    aria-expanded={readerStatus.showToc}
                >
                    <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        aria-hidden="true"
                    >
                        <line x1="4" x2="20" y1="6" y2="6" />
                        <line x1="4" x2="20" y1="12" y2="12" />
                        <line x1="4" x2="20" y1="18" y2="18" />
                    </svg>
                </button>
                <button
                    onclick={() =>
                        (readerStatus.showSettings =
                            !readerStatus.showSettings)}
                    class="icon-btn"
                    aria-label="Open Reader Settings"
                    aria-expanded={readerStatus.showSettings}
                >
                    <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        aria-hidden="true"
                    >
                        <path
                            d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"
                        />
                        <circle cx="12" cy="12" r="3" />
                    </svg>
                </button>
            </div>

            <span
                class="text-[10px] uppercase tracking-widest opacity-30 truncate px-4"
            >
                {library.selectedBook?.title ?? "Loading..."}
            </span>

            <button
                onclick={async () => {
                    await readerCore.saveCurrentPosition();
                    try {
                        await invoke("close_book");
                    } catch (e) {
                        error(`Failed to close book session: ${e}`);
                    }
                    goto("/");
                }}
                class="icon-btn text-red-500/60 hover:text-red-500"
                aria-label="Exit Reader"
            >
                <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    aria-hidden="true"
                >
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" x2="9" y1="12" y2="12" />
                </svg>
            </button>
        </header>
    </div>

    <SettingsModal />

    {#if readerStatus.showToc}
        <div
            class="fixed inset-0 z-50 flex"
            role="dialog"
            aria-modal="true"
            aria-label="Table of Contents"
        >
            <div
                class="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onclick={() => (readerStatus.showToc = false)}
                role="presentation"
            ></div>
            <nav
                class="relative w-80 bg-inherit h-full shadow-2xl p-8 overflow-y-auto border-r border-stone-500/10"
                transition:fly={{ x: -320, duration: 250 }}
            >
                <NavTree
                    items={readerCore.toc}
                    currentHref={readerCore.currentHref}
                    onSelect={readerCore.loadChapter}
                />
            </nav>
        </div>
    {/if}

    <main
        id="reader-viewport"
        class="flex-1 overflow-y-auto pt-24 pb-12 px-6 sm:px-12"
    >
        <ReaderCanvas
            htmlContent={readerCore.htmlContent}
            isLoading={readerStatus.isLoading}
        />

        <footer
            class="max-w-[70ch] mx-auto mt-24 pb-20 flex justify-between border-t border-stone-500/10 pt-8"
        >
            <button
                onclick={() => readerCore.goPrev()}
                disabled={readerCore.activeTocIndex === 0}
                class="nav-btn"
                aria-label="Go to Previous Chapter"
            >
                Previous
            </button>
            <button
                onclick={() => readerCore.goNext()}
                disabled={readerCore.activeTocIndex ===
                    readerCore.flatToc.length - 1}
                class="nav-btn"
                aria-label="Go to Next Chapter"
            >
                Next
            </button>
        </footer>
    </main>

    <div
        class="fixed inset-0 pointer-events-none z-[9999] bg-black transition-opacity duration-150"
        style="opacity: {1 - readerPrefs.brightness}"
        aria-hidden="true"
    ></div>
</div>

<style>
    @reference "../../app.css";

    .icon-btn {
        @apply p-2 rounded-xl hover:bg-stone-500/10 transition-all flex items-center justify-center aspect-square;
    }

    .nav-btn {
        @apply text-[10px] uppercase font-bold tracking-[0.2em] disabled:opacity-10 hover:text-orange-500 transition-colors;
    }
</style>
