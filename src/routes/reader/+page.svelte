<script lang="ts">
    import { onMount, tick } from "svelte";
    import { fly } from "svelte/transition";
    import { goto } from "$app/navigation";
    import { invoke } from "@tauri-apps/api/core";

    import { selectedBook } from "$lib/eLibLoader";
    import {
        openBook,
        getChapter,
        flattenToc,
        type NavItem,
    } from "$lib/eBookLoader";
    import { readerPrefs, readerStatus } from "$lib/readerState.svelte";
    import { rewriteResourceUrls } from "$lib/epubUtils";

    import NavTree from "$lib/components/NavTree.svelte";
    import SettingsModal from "$lib/components/reader/SettingsModal.svelte";
    import ReaderCanvas from "$lib/components/reader/ReaderCanvas.svelte";

    let toc = $state<NavItem[]>([]);
    let flatToc = $state<NavItem[]>([]);
    let htmlContent = $state("");
    let currentIndex = $state(-1);
    let activeTocIndex = $state(0);
    let currentHref = $state("");

    function handleKeydown(e: KeyboardEvent) {
        if (readerStatus.showSettings || readerStatus.showToc) return;
        if (e.key === "ArrowRight") goNext();
        if (e.key === "ArrowLeft") goPrev();
    }

    onMount(() => {
        if (!$selectedBook) {
            goto("/");
            return;
        }
        window.addEventListener("keydown", handleKeydown);

        (async () => {
            try {
                const saved = (await invoke("load_settings")) as Record<
                    string,
                    string
                >;
                if (saved.fontSize)
                    readerPrefs.fontSize = parseInt(saved.fontSize);
                if (saved.theme) readerPrefs.theme = saved.theme;
                if (saved.brightness)
                    readerPrefs.brightness = parseFloat(saved.brightness);
            } catch (e) {
                console.error("Settings load failed", e);
            }

            const nested = await openBook($selectedBook.path);
            toc = nested;
            flatToc = flattenToc(nested);
            if (flatToc.length > 0) {
                await loadChapter(flatToc[0].spine_index, flatToc[0].href);
            }
        })();

        return () => {
            window.removeEventListener("keydown", handleKeydown);
        };
    });

    let saveTimer: number;
    $effect(() => {
        const settingsMap = {
            fontSize: readerPrefs.fontSize.toString(),
            theme: readerPrefs.theme,
            brightness: readerPrefs.brightness.toString(),
        };

        const timer = setTimeout(() => {
            invoke("save_settings", { settings: settingsMap });
            console.log("Settings synced to SQLite");
        }, 2000);

        return () => clearTimeout(timer);
    });

    async function loadChapter(spineIndex: number, href: string) {
        if (!$selectedBook) return;
        const isNewFile = currentIndex !== spineIndex;
        currentHref = href;
        activeTocIndex = flatToc.findIndex((i) => i.href === href);
        readerStatus.showToc = false;

        if (isNewFile || !htmlContent) {
            const loaderTimeout = setTimeout(
                () => (readerStatus.isLoading = true),
                100,
            );

            try {
                const raw = await getChapter($selectedBook.path, spineIndex);
                htmlContent = rewriteResourceUrls(raw, spineIndex);
                currentIndex = spineIndex;
            } finally {
                clearTimeout(loaderTimeout);
                readerStatus.isLoading = false;
            }
        }

        await tick();
        document
            .querySelector("#reader-viewport")
            ?.scrollTo({ top: 0, behavior: "instant" });
    }

    const goNext = () =>
        activeTocIndex < flatToc.length - 1 &&
        loadChapter(
            flatToc[activeTocIndex + 1].spine_index,
            flatToc[activeTocIndex + 1].href,
        );
    const goPrev = () =>
        activeTocIndex > 0 &&
        loadChapter(
            flatToc[activeTocIndex - 1].spine_index,
            flatToc[activeTocIndex - 1].href,
        );
</script>

<div
    class="reader-root h-screen flex flex-col overflow-hidden transition-colors duration-500"
    data-theme={readerPrefs.theme}
    style="--reader-font-size: {readerPrefs.fontSize}px"
>
    <div class="group fixed top-0 w-full z-40 h-20">
        <header
            class="flex justify-between items-center px-6 py-4 bg-inherit border-b border-stone-500/10 transition-all duration-300 translate-y-[-100%] group-hover:translate-y-0 opacity-0 group-hover:opacity-100 backdrop-blur-md"
        >
            <div class="flex gap-4">
                <button
                    onclick={() =>
                        (readerStatus.showToc = !readerStatus.showToc)}
                    class="icon-btn"
                >
                    <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        ><line x1="4" x2="20" y1="6" y2="6" /><line
                            x1="4"
                            x2="20"
                            y1="12"
                            y2="12"
                        /><line x1="4" x2="20" y1="18" y2="18" /></svg
                    >
                </button>
                <button
                    onclick={() =>
                        (readerStatus.showSettings =
                            !readerStatus.showSettings)}
                    class="icon-btn"
                >
                    <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        ><path
                            d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"
                        /><circle cx="12" cy="12" r="3" /></svg
                    >
                </button>
            </div>
            <span
                class="text-[10px] uppercase tracking-widest opacity-30 truncate"
                >{$selectedBook?.title}</span
            >
            <button
                onclick={() => goto("/")}
                class="icon-btn text-red-500/60 hover:text-red-500"
            >
                <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    ><path
                        d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"
                    /><polyline points="16 17 21 12 16 7" /><line
                        x1="21"
                        x2="9"
                        y1="12"
                        y2="12"
                    /></svg
                >
            </button>
        </header>
    </div>

    <SettingsModal />

    {#if readerStatus.showToc}
        <div class="fixed inset-0 z-50 flex">
            <div
                class="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onclick={() => (readerStatus.showToc = false)}
            ></div>
            <nav
                class="relative w-80 bg-inherit h-full shadow-2xl p-8 overflow-y-auto border-r border-stone-500/10"
                transition:fly={{ x: -320, duration: 250 }}
            >
                <NavTree items={toc} {currentHref} onSelect={loadChapter} />
            </nav>
        </div>
    {/if}

    <main
        id="reader-viewport"
        class="flex-1 overflow-y-auto pt-24 pb-12 px-6 sm:px-12"
    >
        <ReaderCanvas {htmlContent} isLoading={readerStatus.isLoading} />
        <footer
            class="max-w-[70ch] mx-auto mt-24 pb-20 flex justify-between border-t border-stone-500/10 pt-8"
        >
            <button
                onclick={goPrev}
                disabled={activeTocIndex === 0}
                class="nav-btn">Previous</button
            >
            <button
                onclick={goNext}
                disabled={activeTocIndex === flatToc.length - 1}
                class="nav-btn">Next</button
            >
        </footer>
    </main>

    <div
        class="fixed inset-0 pointer-events-none z-[9999] bg-black transition-opacity duration-150"
        style="opacity: {1 - readerPrefs.brightness}"
    ></div>
</div>

<style>
    @reference "../../app.css";

    .reader-root {
        --bg: #fafaf9;
        --text: #1c1917;
        --thumb: rgba(28, 25, 23, 0.15);
        background: var(--bg);
        color: var(--text);
    }

    .reader-root[data-theme="dark"] {
        --bg: #1c1917;
        --text: #d6d3d1;
        --thumb: rgba(214, 211, 209, 0.2);
    }

    .reader-root[data-theme="sepia"] {
        --bg: #f4ecd8;
        --text: #5b4636;
        --thumb: rgba(91, 70, 54, 0.2);
    }

    .reader-root :global(*) {
        scrollbar-width: thin;
        scrollbar-color: var(--thumb) transparent;
    }

    .reader-root ::-webkit-scrollbar {
        width: 6px;
    }

    .reader-root ::-webkit-scrollbar-track {
        background: transparent;
    }

    .reader-root ::-webkit-scrollbar-thumb {
        background-color: var(--thumb);
        border-radius: 20px;
    }

    nav {
        scrollbar-width: thin;
        scrollbar-color: var(--thumb) transparent;
    }

    .icon-btn {
        @apply p-2 rounded-xl hover:bg-stone-500/10 transition-all flex items-center justify-center aspect-square;
    }

    .nav-btn {
        @apply text-[10px] uppercase font-bold tracking-[0.2em] disabled:opacity-10 hover:text-orange-500 transition-colors;
    }
</style>
