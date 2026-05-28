import { tick } from "svelte";
import { library } from "$lib/eLibLoader.svelte";
import { openBook, getChapter, flattenToc, type NavItem } from "$lib/eBookLoader";
import { rewriteResourceUrls, saveProgress, getProgress } from "$lib/epubUtils";
import { readerStatus } from "$lib/readerState.svelte";
import { error } from "@tauri-apps/plugin-log";
import {
    applyHighlightsToDOM,
    annotationStore,
} from "$lib/annotations.svelte";

const ID_REGEX = /<p(?=\s|>)/g;

class ReaderCore {
    toc = $state<NavItem[]>([]);
    flatToc = $state<NavItem[]>([]);
    htmlContent = $state("");
    currentSpineIndex = $state(-1);
    activeTocIndex = $state(0);
    currentHref = $state("");

    private assignIds(content: string): string {
        let idCounter = 0;
        return content.replace(ID_REGEX, () => {
            const newTag = `<p data-rustle-id="p-${idCounter}"`;
            idCounter++;
            return newTag;
        });
    }

    async saveCurrentPosition(): Promise<void> {
        const book = library.selectedBook;
        if (!book || this.currentSpineIndex === -1) return;

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

        const positionString = `${this.currentSpineIndex}:${currentId}`;
        const totalChapters = this.flatToc.length > 1 ? this.flatToc.length - 1 : 1;
        const bookProgress = this.activeTocIndex / totalChapters;

        await saveProgress(book.path, positionString, bookProgress);
    }

    async loadChapter(spineIndex: number, href: string, targetId?: string): Promise<void> {
        const book = library.selectedBook;
        if (!book) return;

        const isNewFile = this.currentSpineIndex !== spineIndex;
        this.currentHref = href;
        this.activeTocIndex = this.flatToc.findIndex((i) => i.href === href);
        readerStatus.showToc = false;

        if (isNewFile || !this.htmlContent) {
            const loaderTimeout = setTimeout(() => (readerStatus.isLoading = true), 100);
            try {
                const raw = await getChapter(book.path, spineIndex);
                const withUrls = rewriteResourceUrls(raw, spineIndex);
                this.htmlContent = this.assignIds(withUrls);
                this.currentSpineIndex = spineIndex;
            } catch (err) {
                error(`[ReaderCore] Failed loading chapter spine index ${spineIndex}: ${err}`);
            } finally {
                clearTimeout(loaderTimeout);
                readerStatus.isLoading = false;
            }
        }

        await tick();

        applyHighlightsToDOM(spineIndex, annotationStore.items);

        const viewport = document.querySelector("#reader-viewport");
        if (targetId) {
            const element = document.querySelector(`[data-rustle-id="${targetId}"]`);
            if (element) {
                element.scrollIntoView({ behavior: "instant" });
                return;
            }
        }

        viewport?.scrollTo({ top: 0, behavior: "instant" });
    }

    async init(): Promise<void> {
        const book = library.selectedBook;
        if (!book) return;

        this.htmlContent = "";
        this.currentSpineIndex = -1;
        this.currentHref = "";
        this.activeTocIndex = 0;
        this.toc = [];
        this.flatToc = [];

        try {
            const nested = await openBook(book.path);
            this.toc = nested;
            this.flatToc = flattenToc(nested);

            await annotationStore.load(book.id);

            const savedPos = await getProgress(book.path);

            if (savedPos?.includes(":")) {
                const [spineIdxStr, paraId] = savedPos.split(":");
                const spineIndex = parseInt(spineIdxStr, 10);
                const chapter = this.flatToc.find(item => item.spine_index === spineIndex);

                if (chapter) {
                    await this.loadChapter(spineIndex, chapter.href, paraId);
                    return;
                }
            }

            if (this.flatToc.length > 0) {
                await this.loadChapter(this.flatToc[0].spine_index, this.flatToc[0].href);
            }
        } catch (err) {
            error(`[ReaderCore] Initializing reader path failed for ${book.path}: ${err}`);
        }
    }

    goNext(): void {
        if (this.activeTocIndex < this.flatToc.length - 1) {
            const next = this.flatToc[this.activeTocIndex + 1];
            this.loadChapter(next.spine_index, next.href);
        }
    }

    goPrev(): void {
        if (this.activeTocIndex > 0) {
            const prev = this.flatToc[this.activeTocIndex - 1];
            this.loadChapter(prev.spine_index, prev.href);
        }
    }
}

export const readerCore = new ReaderCore();

export function scrollViewport(direction: "up" | "down"): void {
    const viewport = document.querySelector("#reader-viewport");
    if (!viewport) return;

    const scrollAmount = 40;
    const distance = direction === "down" ? scrollAmount : -scrollAmount;

    viewport.scrollBy({ top: distance, behavior: "auto" });
}