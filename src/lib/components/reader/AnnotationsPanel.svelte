<script lang="ts">
    import { fly } from "svelte/transition";
    import { readerStatus } from "$lib/readerState.svelte";
    import { annotationStore, type Annotation } from "$lib/annotations.svelte";
    import { readerCore } from "$lib/readerCore.svelte";

    const TYPE_CONFIG = {
        bookmark: { label: "Bookmark", color: "text-blue-400" },
        highlight: { label: "Highlight", color: "text-amber-400" },
        note: { label: "Note", color: "text-stone-300" },
    } as const;

    let chapterTitles = $derived(
        annotationStore.items.reduce(
            (acc, annotation) => {
                const [chStr] = annotation.location_start.split(":");
                const chapterIndex = parseInt(chStr, 10);

                const matchedTitle = readerCore.flatToc.find(
                    (t) => t.spine_index === chapterIndex,
                )?.title;
                acc[annotation.id] =
                    matchedTitle ?? `Chapter ${chapterIndex + 1}`;

                return acc;
            },
            {} as Record<number, string>,
        ),
    );

    function handleNavigation(annotation: Annotation) {
        if (!annotation.location_start) return;

        const [chStr, rustleId] = annotation.location_start.split(":");
        const chapterIndex = parseInt(chStr, 10);

        const chapter = readerCore.flatToc.find(
            (t) => t.spine_index === chapterIndex,
        );
        if (!chapter) return;

        readerCore.loadChapter(chapterIndex, chapter.href, rustleId);
        readerStatus.showAnnotations = false;
    }
</script>

{#if readerStatus.showAnnotations}
    <div
        class="fixed inset-0 z-50 flex"
        role="dialog"
        aria-modal="true"
        aria-label="Annotations Sidebar"
    >
        <div
            class="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onclick={() => (readerStatus.showAnnotations = false)}
            role="presentation"
        ></div>

        <nav
            class="relative w-80 bg-inherit h-full shadow-2xl p-8 overflow-y-auto border-r border-stone-500/10 flex flex-col gap-1"
            transition:fly={{ x: -320, duration: 250 }}
        >
            <p
                class="text-[10px] uppercase tracking-[0.2em] font-bold text-stone-400 mb-4"
            >
                Annotations
            </p>

            {#if annotationStore.items.length === 0}
                <p class="text-stone-500 text-sm leading-relaxed">
                    No annotations yet. Select text to highlight, bookmark, or
                    add a note.
                </p>
            {:else}
                {#each annotationStore.items as annotation (annotation.id)}
                    {@const config = TYPE_CONFIG[
                        annotation.annotation_type
                    ] ?? {
                        label: "Annotation",
                        color: "text-stone-400",
                    }}

                    <div
                        class="group flex flex-col gap-1 border-b border-stone-500/10 py-4"
                    >
                        <div class="flex items-center justify-between">
                            <span
                                class="text-[9px] font-bold uppercase tracking-widest {config.color}"
                            >
                                {config.label}
                            </span>

                            <button
                                onclick={() =>
                                    annotationStore.delete(annotation.id)}
                                class="opacity-0 group-hover:opacity-100 text-stone-500 hover:text-red-400 transition-all text-xs leading-none"
                                aria-label="Delete annotation"
                            >
                                ✕
                            </button>
                        </div>

                        <p class="text-[10px] text-stone-500">
                            {chapterTitles[annotation.id]}
                        </p>

                        <button
                            onclick={() => handleNavigation(annotation)}
                            class="text-left text-sm text-stone-200 hover:text-orange-400 transition-colors line-clamp-3 leading-relaxed"
                        >
                            {annotation.content ?? ""}
                        </button>
                    </div>
                {/each}
            {/if}
        </nav>
    </div>
{/if}
