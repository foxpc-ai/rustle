<script lang="ts">
    import { onMount } from "svelte";
    import { fade } from "svelte/transition";
    import { goto } from "$app/navigation";
    import { info, warn, error as logError } from "@tauri-apps/plugin-log";
    import { listen, type UnlistenFn } from "@tauri-apps/api/event";
    import {
        library,
        scanLibrary,
        loadLibrary,
        type LibraryItem,
    } from "$lib/eLibLoader.svelte";
    import BookCard from "$lib/components/library/BookCard.svelte";

    let isInitialLoad = $state(true);
    let searchQuery = $state("");
    let sortKey = $state<"opened_at" | "title" | "author" | "progress">(
        "opened_at",
    );

    const sortLabels: Record<typeof sortKey, string> = {
        opened_at: "Recent",
        title: "Title",
        author: "Author",
        progress: "Progress",
    };

    const filteredBooks = $derived.by(() => {
        const q = searchQuery.trim().toLowerCase();
        let books = q
            ? library.books.filter(
                  (b) =>
                      b.title.toLowerCase().includes(q) ||
                      b.author.toLowerCase().includes(q),
              )
            : [...library.books];

        books.sort((a, b) => {
            if (sortKey === "title") return a.title.localeCompare(b.title);
            if (sortKey === "author") return a.author.localeCompare(b.author);
            if (sortKey === "progress") return b.progress - a.progress;
            return 0;
        });

        return books;
    });

    async function handleScan() {
        info("User triggered library scan via UI");
        try {
            await scanLibrary();
        } catch (e) {
            logError(`Scan failed: ${e}`);
        }
    }

    function handleBookClick(book: LibraryItem) {
        info(`Navigating to reader for book: ${book.title}`);
        library.selectedBook = book;
        goto("/reader").catch((e) => logError(`Navigation failed: ${e}`));
    }

    onMount(() => {
        info(
            "Library component mounted: Syncing state & setting up event listeners",
        );

        let unlistenImported: UnlistenFn;
        let unlistenFinished: UnlistenFn;

        let importedCount = 0;
        let debounceTimer: ReturnType<typeof setTimeout> | null = null;

        const triggerReload = () => {
            if (debounceTimer) {
                clearTimeout(debounceTimer);
                debounceTimer = null;
            }
            importedCount = 0;
            loadLibrary();
        };

        loadLibrary()
            .then(() => {
                info(
                    `loadLibrary complete. Found ${library.books.length} items`,
                );
            })
            .catch((e) => {
                logError(`Critical failure during initial load: ${e}`);
            })
            .finally(() => {
                isInitialLoad = false;
            });

        const setupListeners = async () => {
            unlistenImported = await listen("book-imported", () => {
                importedCount++;

                if (importedCount >= 4) {
                    info("Batch threshold met (4 books). Reloading UI.");
                    triggerReload();
                    return;
                }

                if (debounceTimer) clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    info("100ms silence timeout met. Flusher triggered.");
                    triggerReload();
                }, 100);
            });

            unlistenFinished = await listen("sync-finished", () => {
                info("Event received: sync-finished. Finalizing UI state.");
                triggerReload();
                library.loadingStatus = "idle";
            });
        };

        setupListeners();

        return () => {
            if (unlistenImported) unlistenImported();
            if (unlistenFinished) unlistenFinished();
            if (debounceTimer) clearTimeout(debounceTimer);
        };
    });

    $effect(() => {
        if (library.loadingStatus === "error") {
            warn("Library store reported an error status");
        }
    });
</script>

<main
    class="bg-stone-950 h-screen w-screen overflow-hidden m-0 p-0 flex flex-col select-none"
>
    <div class="flex items-center gap-3 px-8 pt-8 pb-4 flex-shrink-0 z-10">
        <button
            onclick={handleScan}
            disabled={library.loadingStatus === "loading"}
            class="bg-white/5 hover:bg-white/10 text-white/80 hover:text-white px-5 py-2.5 rounded-full backdrop-blur-xl transition-all border border-white/10 text-xs uppercase tracking-widest font-bold disabled:opacity-50 flex-shrink-0"
            aria-busy={library.loadingStatus === "loading"}
        >
            {library.loadingStatus === "loading"
                ? "Scanning..."
                : "Sync Library"}
        </button>

        <div class="relative flex-1 max-w-xs">
            <svg
                class="absolute left-3 top-1/2 -translate-y-1/2 opacity-30"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
                aria-hidden="true"
            >
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
            </svg>
            <input
                type="search"
                placeholder="Search titles, authors…"
                bind:value={searchQuery}
                class="w-full bg-white/5 border border-white/10 rounded-full pl-9 pr-4 py-2.5 text-xs text-white/80 placeholder:text-white/25 outline-none focus:border-white/20 focus:bg-white/8 transition-all"
            />
        </div>

        <div class="flex gap-1 ml-auto flex-shrink-0">
            {#each Object.keys(sortLabels) as Array<typeof sortKey> as key}
                <button
                    onclick={() => (sortKey = key)}
                    class="px-3 py-1.5 rounded-full text-[10px] uppercase tracking-widest font-bold transition-all {sortKey ===
                    key
                        ? 'bg-white/15 text-white'
                        : 'text-white/30 hover:text-white/60'}"
                >
                    {sortLabels[key]}
                </button>
            {/each}
        </div>

        {#if library.loadingStatus === "error"}
            <div
                transition:fade={{ duration: 200 }}
                class="flex items-center gap-3 bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2 rounded-2xl backdrop-blur-xl text-sm flex-shrink-0"
                role="alert"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                >
                    <circle cx="12" cy="12" r="10" /><line
                        x1="12"
                        y1="8"
                        x2="12"
                        y2="12"
                    /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>Failed to sync library</span>
                <button
                    onclick={() => (library.loadingStatus = "idle")}
                    class="ml-1 p-1 hover:text-white transition-colors"
                    aria-label="Dismiss error"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"><path d="M18 6 6 18M6 6l12 12" /></svg
                    >
                </button>
            </div>
        {/if}
    </div>

    {#if isInitialLoad}
        <div class="flex-1 bg-stone-950"></div>
    {:else if library.books.length === 0 && library.loadingStatus !== "loading"}
        <div
            transition:fade={{ duration: 400 }}
            class="flex-1 flex flex-col items-center justify-center text-center px-6"
        >
            <div class="space-y-6 max-w-md">
                <h1 class="text-stone-400 text-2xl font-light tracking-tight">
                    Your library is empty
                </h1>
                <p class="text-stone-500 text-sm leading-relaxed">
                    Connect a folder to start building your collection. Your
                    books will appear here once scanned.
                </p>
                <button
                    onclick={handleScan}
                    class="inline-flex items-center gap-3 bg-white text-black px-8 py-4 rounded-full font-bold text-sm uppercase tracking-widest hover:scale-105 transition-transform active:scale-95 shadow-2xl shadow-white/10"
                >
                    Add a Folder
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    >
                        <path d="M5 12h14m-7-7 7 7-7 7" />
                    </svg>
                </button>
            </div>
        </div>
    {:else if filteredBooks.length === 0}
        <div
            transition:fade={{ duration: 200 }}
            class="flex-1 flex items-center justify-center text-stone-500 text-sm"
        >
            No books match "{searchQuery}"
        </div>
    {:else}
        <div
            id="shelf"
            class="flex-1 overflow-x-auto overflow-y-hidden"
            role="list"
            aria-label="Book collection"
        >
            <div class="shelf-grid h-full px-8 pb-8">
                {#each filteredBooks as book (book.id || book.title)}
                    <div role="listitem">
                        <BookCard
                            {book}
                            onclick={() => handleBookClick(book)}
                        />
                    </div>
                {/each}
            </div>
        </div>
    {/if}
</main>

<style>
    #shelf {
        scrollbar-width: thin;
        scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
    }

    #shelf::-webkit-scrollbar {
        height: 4px;
    }

    #shelf::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 2px;
    }

    .shelf-grid {
        display: grid;
        grid-template-rows: 1fr;
        grid-auto-flow: column;
        grid-auto-columns: max-content;
        gap: 7vmin;
        align-items: center;
    }
</style>
