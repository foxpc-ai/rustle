import { tick } from "svelte";
import { library } from "$lib/eLibLoader.svelte";
import { openBook, getChapter, flattenToc, type NavItem } from "$lib/eBookLoader";
import { rewriteResourceUrls, saveProgress, getProgress } from "$lib/epubUtils";
import { readerStatus } from "$lib/readerState.svelte";

let toc = $state<NavItem[]>([]);
let flatToc = $state<NavItem[]>([]);
let htmlContent = $state("");
let currentIndex = $state(-1);
let activeTocIndex = $state(0);
let currentHref = $state("");

const idRegex = /<p(?=\s|>)/g;

export const readerCore = {
    get toc() { return toc; },
    get htmlContent() { return htmlContent; },
    get activeTocIndex() { return activeTocIndex; },
    get currentHref() { return currentHref; },
    get flatToc() { return flatToc; },

    async saveCurrentPosition() {
        const book = library.selectedBook;
        if (!book || currentIndex === -1) return;

        const viewport = document.querySelector("#reader-viewport");
        const article = viewport?.querySelector("article");

        if (!viewport || !article) return;

        const scrollTarget = viewport.scrollTop + 20;

        const paras = article.querySelectorAll("[data-rustle-id]");

        let currentId = "p-0";

        for (const p of paras) {
            const htmlP = p as HTMLElement;
            if (htmlP.offsetTop >= scrollTarget) {
                currentId = htmlP.getAttribute("data-rustle-id") || "p-0";
                break;
            }
            currentId = htmlP.getAttribute("data-rustle-id") || "p-0";
        }

        const positionString = `${currentIndex}:${currentId}`;

        const totalChapters = flatToc.length > 1 ? flatToc.length - 1 : 1;
        let bookProgress = currentIndex / totalChapters;

        await saveProgress(book.path, positionString, bookProgress);
    },

    async loadChapter(spineIndex: number, href: string, targetId?: string) {
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
                const withUrls = rewriteResourceUrls(raw, spineIndex);
                htmlContent = assignIds(withUrls);
                currentIndex = spineIndex;
            } finally {
                clearTimeout(loaderTimeout);
                readerStatus.isLoading = false;
            }
        }

        await tick();

        const viewport = document.querySelector("#reader-viewport");
        if (targetId) {
            const element = document.querySelector(`[data-rustle-id="${targetId}"]`);
            if (element) {
                element.scrollIntoView({ behavior: "instant" });
                return;
            }
        }

        viewport?.scrollTo({ top: 0, behavior: "instant" });
    },

    async init() {
        const book = library.selectedBook;
        if (!book) return;

        htmlContent = "";
        currentIndex = -1;
        currentHref = "";
        activeTocIndex = 0;
        toc = [];
        flatToc = [];

        const nested = await openBook(book.path);
        toc = nested;
        flatToc = flattenToc(nested);

        const savedPos = await getProgress(book.path);

        if (savedPos && savedPos.includes(":")) {
            const [spineIdxStr, paraId] = savedPos.split(":");
            const spineIndex = parseInt(spineIdxStr);

            const chapter = flatToc.find(item => item.spine_index === spineIndex);

            if (chapter) {
                await this.loadChapter(spineIndex, chapter.href, paraId);
                return;
            }
        }

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

function assignIds(content: string): string {
    let idCounter = 0;

    return content.replace(idRegex, (match) => {
        const newTag = `<p data-rustle-id="p-${idCounter}"`;
        idCounter++;
        return newTag;
    });
}

export function scrollViewport(direction: "up" | "down") {
    const viewport = document.querySelector("#reader-viewport");
    if (!viewport) return;

    const scrollAmount = 40;
    const distance = direction === "down" ? scrollAmount : -scrollAmount;

    viewport.scrollBy({ top: distance, behavior: "auto" });
}