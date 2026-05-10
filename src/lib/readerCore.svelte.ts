import { tick } from "svelte";
import { get } from "svelte/store";
import { library } from "$lib/eLibLoader.svelte";
import { openBook, getChapter, flattenToc, type NavItem } from "$lib/eBookLoader";
import { rewriteResourceUrls } from "$lib/epubUtils";
import { readerStatus } from "$lib/readerState.svelte";

let toc = $state<NavItem[]>([]);
let flatToc = $state<NavItem[]>([]);
let htmlContent = $state("");
let currentIndex = $state(-1);
let activeTocIndex = $state(0);
let currentHref = $state("");

export const readerCore = {
    get toc() { return toc; },
    get htmlContent() { return htmlContent; },
    get activeTocIndex() { return activeTocIndex; },
    get currentHref() { return currentHref; },
    get flatToc() { return flatToc; },

    async loadChapter(spineIndex: number, href: string) {
        const book = library.selectedBook;
        if (!book) return;

        const isNewFile = currentIndex !== spineIndex;
        currentHref = href;
        activeTocIndex = flatToc.findIndex((i) => i.href === href);
        readerStatus.showToc = false;

        if (isNewFile || !htmlContent) {
            const loaderTimeout = setTimeout(() => (readerStatus.isLoading = true), 100);

            try {
                const raw = await getChapter(book.path, spineIndex);
                htmlContent = rewriteResourceUrls(raw, spineIndex);
                currentIndex = spineIndex;
            } finally {
                clearTimeout(loaderTimeout);
                readerStatus.isLoading = false;
            }
        }

        await tick();
        document.querySelector("#reader-viewport")?.scrollTo({ top: 0, behavior: "instant" });
    },

    async init() {
        const book = library.selectedBook;
        if (!book) return;

        const nested = await openBook(book.path);
        toc = nested;
        flatToc = flattenToc(nested);

        if (flatToc.length > 0) {
            await this.loadChapter(flatToc[0].spine_index, flatToc[0].href);
        }
    },

    goNext() {
        if (activeTocIndex < flatToc.length - 1) {
            const next = flatToc[activeTocIndex + 1];
            this.loadChapter(next.spine_index, next.href);
        }
    },

    goPrev() {
        if (activeTocIndex > 0) {
            const prev = flatToc[activeTocIndex - 1];
            this.loadChapter(prev.spine_index, prev.href);
        }
    }
};