<script lang="ts">
    import { scale } from "svelte/transition";
    import { library } from "$lib/eLibLoader.svelte";
    import {
        getCharOffset,
        findRustleAncestor,
        applyHighlightsToDOM,
        annotationStore,
    } from "$lib/annotations.svelte";
    import { error } from "@tauri-apps/plugin-log";

    let { chapterIndex }: { chapterIndex: number } = $props();

    let visible = $state(false);
    let showNoteInput = $state(false);
    let noteText = $state("");
    let position = $state({ x: 0, y: 0 });
    let pendingSelection = $state<{
        start: string;
        end: string;
        content: string;
    } | null>(null);

    function getSelectionInfo(): {
        start: string;
        end: string;
        content: string;
    } | null {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null;

        const range = sel.getRangeAt(0);
        const content = sel.toString().trim();
        if (!content) return null;

        const startAncestor = findRustleAncestor(range.startContainer);
        const endAncestor = findRustleAncestor(range.endContainer);
        if (!startAncestor || !endAncestor) return null;

        const startRustleId = startAncestor.getAttribute("data-rustle-id");
        const endRustleId = endAncestor.getAttribute("data-rustle-id");

        const startOffset = getCharOffset(
            startAncestor,
            range.startContainer,
            range.startOffset,
        );
        const endOffset = getCharOffset(
            endAncestor,
            range.endContainer,
            range.endOffset,
        );

        return {
            start: `${chapterIndex}:${startRustleId}:${startOffset}`,
            end: `${chapterIndex}:${endRustleId}:${endOffset}`,
            content,
        };
    }

    function handleMouseUp(e: MouseEvent) {
        if ((e.target as Element)?.closest(".selection-popup")) return;

        setTimeout(() => {
            const sel = window.getSelection();
            if (!sel || sel.isCollapsed) {
                visible = false;
                showNoteInput = false;
                return;
            }

            const info = getSelectionInfo();
            if (!info) {
                visible = false;
                return;
            }

            pendingSelection = info;

            const rect = sel.getRangeAt(0).getBoundingClientRect();
            position = {
                x: Math.min(
                    Math.max(rect.left + rect.width / 2, 100),
                    window.innerWidth - 100,
                ),
                y: Math.max(rect.top + window.scrollY - 8, 56),
            };
            visible = true;
            showNoteInput = false;
            noteText = "";
        }, 10);
    }

    async function executeCreateAnnotation(
        type: "highlight" | "note" | "bookmark",
    ) {
        if (!pendingSelection) return;
        const book = library.selectedBook;
        if (!book) return;

        let startLoc = pendingSelection.start;
        let endLoc: string | null = pendingSelection.end;
        let finalContent: string | null = pendingSelection.content;

        if (type === "bookmark") {
            const [ch, rustleId] = pendingSelection.start.split(":");
            startLoc = `${ch}:${rustleId}`;
            endLoc = null;
            finalContent = pendingSelection.content.slice(0, 120);
        }

        if (type === "note") {
            if (!showNoteInput) {
                showNoteInput = true;
                return;
            }
            if (noteText.trim()) {
                finalContent = noteText.trim();
            }
        }

        try {
            const id = await annotationStore.save({
                book_id: book.id,
                annotation_type: type,
                content: finalContent,
                location_start: startLoc,
                location_end: type === "highlight" ? endLoc : startLoc,
            });

            if (id !== null) {
                applyHighlightsToDOM(chapterIndex, annotationStore.items);
            }

            window.getSelection()?.removeAllRanges();
            visible = false;
            showNoteInput = false;
            noteText = "";
        } catch (err) {
            error(`[SelectionPopup] Failed saving annotation node: ${err}`);
        }
    }

    function dismiss() {
        visible = false;
        showNoteInput = false;
    }

    $effect(() => {
        document.addEventListener("mouseup", handleMouseUp);
        return () => {
            document.removeEventListener("mouseup", handleMouseUp);
        };
    });
</script>

{#if visible}
    <div
        role="dialog"
        aria-label="Selection Actions"
        tabindex="-1"      
        class="selection-popup fixed z-[200] -translate-x-1/2 -translate-y-full pointer-events-auto"
        style="left: {position.x}px; top: {position.y}px"
        transition:scale={{ duration: 120, start: 0.9, opacity: 0 }}
        onmousedown={(e) => e.stopPropagation()}
    >
        {#if showNoteInput}
            <div
                class="bg-stone-800 border border-stone-700 rounded-xl shadow-2xl p-3 w-56"
            >
                <textarea
                    bind:value={noteText}
                    placeholder="Add a note…"
                    class="w-full bg-stone-900 border border-stone-700 rounded-lg p-2 text-xs text-white/80 placeholder:text-white/30 resize-none outline-none focus:border-orange-500/50 h-20"
                    autofocus
                ></textarea>
                <div class="flex gap-2 mt-2">
                    <button
                        onclick={() => executeCreateAnnotation("note")}
                        class="flex-1 py-1.5 text-[10px] font-bold uppercase tracking-widest bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 rounded-lg transition-colors"
                    >
                        Save
                    </button>
                    <button
                        onclick={dismiss}
                        class="flex-1 py-1.5 text-[10px] font-bold uppercase tracking-widest bg-stone-700/60 text-stone-300 hover:bg-stone-700 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        {:else}
            <div
                class="flex gap-1 bg-stone-800 border border-stone-700 rounded-xl shadow-2xl p-1.5"
            >
                <button
                    onclick={() => executeCreateAnnotation("highlight")}
                    class="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-amber-400 hover:bg-amber-400/10 rounded-lg transition-colors"
                >
                    Highlight
                </button>
                <button
                    onclick={() => executeCreateAnnotation("bookmark")}
                    class="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                >
                    Bookmark
                </button>
                <button
                    onclick={() => executeCreateAnnotation("note")}
                    class="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-stone-300 hover:bg-stone-700/60 rounded-lg transition-colors"
                >
                    Note
                </button>
            </div>
        {/if}
    </div>
{/if}
