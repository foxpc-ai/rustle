import { invoke } from "@tauri-apps/api/core";
import { error } from "@tauri-apps/plugin-log";

export type AnnotationType = "bookmark" | "highlight" | "note";

export interface Annotation {
    id: number;
    book_id: number;
    annotation_type: AnnotationType;
    content: string | null;
    location_start: string;
    location_end: string | null;
    created_at: string;
}

export interface CreateAnnotationPayload {
    book_id: number;
    annotation_type: AnnotationType;
    content: string | null;
    location_start: string;
    location_end: string | null;
}

class AnnotationStore {
    items = $state<Annotation[]>([]);

    forChapter(chapterIndex: number): Annotation[] {
        return this.items.filter((a) => {
            if (!a.location_start) return false;
            const [ch] = a.location_start.split(":");
            return parseInt(ch, 10) === chapterIndex;
        });
    }

    async load(bookId: number): Promise<void> {
        try {
            this.items = await invoke<Annotation[]>("get_annotations", { bookId });
        } catch (e) {
            error(`[AnnotationStore] Failed to load annotations for book ${bookId}: ${e}`);
        }
    }

    async save(payload: CreateAnnotationPayload): Promise<number | null> {
        try {
            const id = await invoke<number>("save_annotation", { payload });

            this.items.push({
                ...payload,
                id,
                created_at: new Date().toISOString(),
            });

            return id;
        } catch (e) {
            error(`[AnnotationStore] Failed to save annotation: ${e}`);
            return null;
        }
    }

    async delete(id: number): Promise<void> {
        try {
            await invoke("delete_annotation", { id });
            this.items = this.items.filter((a) => a.id !== id);
        } catch (e) {
            error(`[AnnotationStore] Failed to delete annotation ${id}: ${e}`);
        }
    }
}

export const annotationStore = new AnnotationStore();

export function getCharOffset(container: Element, targetNode: Node, nodeOffset: number): number {
    let charCount = 0;
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    let current: Text | null;

    while ((current = walker.nextNode() as Text | null)) {
        if (current === targetNode) {
            return charCount + nodeOffset;
        }
        charCount += current.length;
    }
    return 0;
}

export function findRustleAncestor(node: Node | null): Element | null {
    let current: Node | null = node;
    while (current && current !== document.body) {
        if (current instanceof Element && current.hasAttribute("data-rustle-id")) {
            return current;
        }
        current = current.parentNode;
    }
    return null;
}

export function clearAllAnnotationsFromDOM(): void {
    const highlights = document.querySelectorAll("mark.rustle-highlight, mark.rustle-note");
    for (const el of highlights) {
        const parent = el.parentNode;
        if (parent) {
            parent.replaceChild(document.createTextNode(el.textContent || ""), el);
            parent.normalize();
        }
    }
    const bookmarks = document.querySelectorAll(".reader-bookmark-badge");
    for (const el of bookmarks) {
        el.remove();
    }
}

export function applyHighlightsToDOM(chapterIndex: number, annotations: Annotation[]): void {
    clearAllAnnotationsFromDOM();

    const relevant = annotations.filter((a) => {
        if (!a.location_start) return false;
        const [ch] = a.location_start.split(":");
        return parseInt(ch, 10) === chapterIndex;
    });

    const allParagraphs = Array.from(
        document.querySelectorAll("#reader-viewport article [data-rustle-id]")
    ) as HTMLElement[];

    for (const annotation of relevant) {
        const startParts = annotation.location_start.split(":");
        const startRustleId = startParts[1];
        const startChar = parseInt(startParts[2], 10);

        const startEl = document.querySelector(`[data-rustle-id="${startRustleId}"]`) as HTMLElement;
        if (!startEl) continue;

        if (annotation.annotation_type === "bookmark") {
            if (startEl.querySelector(`.reader-bookmark-badge[data-id="${annotation.id}"]`)) continue;
            const bMark = document.createElement("span");
            bMark.className = "reader-bookmark-badge absolute left-2 lg:left-4 select-none cursor-pointer";
            bMark.dataset.id = String(annotation.id);
            startEl.classList.add("relative");
            startEl.prepend(bMark);
            continue;
        }

        if (!annotation.location_end) continue;
        const endParts = annotation.location_end.split(":");
        const endRustleId = endParts[1];
        const endChar = parseInt(endParts[2], 10);

        const endEl = document.querySelector(`[data-rustle-id="${endRustleId}"]`) as HTMLElement;
        if (!endEl) continue;

        if (startRustleId === endRustleId) {
            _highlightTextNodesInElement(startEl, startChar, endChar, annotation);
            continue;
        }

        const startIndex = allParagraphs.indexOf(startEl);
        const endIndex = allParagraphs.indexOf(endEl);
        if (startIndex === -1 || endIndex === -1 || startIndex > endIndex) continue;

        for (let i = startIndex; i <= endIndex; i++) {
            const currentEl = allParagraphs[i];
            if (i === startIndex) {
                _highlightTextNodesInElement(currentEl, startChar, currentEl.textContent?.length || 0, annotation);
            } else if (i === endIndex) {
                _highlightTextNodesInElement(currentEl, 0, endChar, annotation);
            } else {
                _highlightTextNodesInElement(currentEl, 0, currentEl.textContent?.length || 0, annotation);
            }
        }
    }
}

function _highlightTextNodesInElement(parentEl: HTMLElement, start: number, end: number, annotation: Annotation) {
    const walker = document.createTreeWalker(parentEl, NodeFilter.SHOW_TEXT, null);
    let currentPos = 0;
    const nodesToWrap: { node: Text; startIdx: number; endIdx: number }[] = [];

    let node = walker.nextNode() as Text | null;
    while (node) {
        const nodeLength = node.nodeValue?.length || 0;
        const nodeEnd = currentPos + nodeLength;

        if (nodeEnd > start && currentPos < end) {
            const relativeStart = Math.max(0, start - currentPos);
            const relativeEnd = Math.min(nodeLength, end - currentPos);
            nodesToWrap.push({ node, startIdx: relativeStart, endIdx: relativeEnd });
        }
        currentPos = nodeEnd;
        node = walker.nextNode() as Text | null;
    }

    for (let i = nodesToWrap.length - 1; i >= 0; i--) {
        const { node, startIdx, endIdx } = nodesToWrap[i];
        const text = node.nodeValue || "";
        const before = text.substring(0, startIdx);
        const selected = text.substring(startIdx, endIdx);
        const after = text.substring(endIdx);

        const mark = document.createElement("mark");
        mark.className = annotation.annotation_type === "note" ? "rustle-note" : "rustle-highlight";
        mark.dataset.annotationId = String(annotation.id);
        mark.textContent = selected;
        if (annotation.content) mark.title = annotation.content;

        const parent = node.parentNode;
        if (!parent) continue;

        if (after) parent.insertBefore(document.createTextNode(after), node.nextSibling);
        parent.insertBefore(mark, node.nextSibling);
        if (before) {
            node.nodeValue = before;
        } else {
            node.remove();
        }
    }
}