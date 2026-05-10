<script lang="ts">
    import { onMount } from "svelte";
    import { fade } from "svelte/transition";
    import { goto } from "$app/navigation";
    import {
        library,
        scanLibrary,
        loadLibrary,
        type LibraryItem,
    } from "$lib/eLibLoader.svelte";
    import BookCard from "$lib/components/library/BookCard.svelte";

    let trackElement = $state<HTMLElement | null>(null);
    let mouseDownAt = $state(0);
    let prevPercentage = $state(0);
    let percentage = $state(0);

    const handleDown = (e: MouseEvent) => (mouseDownAt = e.clientX);

    const handleUp = () => {
        mouseDownAt = 0;
        prevPercentage = percentage;
    };

    const handleMove = (e: MouseEvent) => {
        if (mouseDownAt === 0 || !trackElement) return;

        const mouseDelta = mouseDownAt - e.clientX;
        const maxDelta = window.innerWidth / 2;

        const nextUnconstrained =
            prevPercentage + (mouseDelta / maxDelta) * -100;
        percentage = Math.max(Math.min(nextUnconstrained, 0), -100);

        trackElement.animate(
            { transform: `translate(${percentage}%, -50%)` },
            { duration: 1200, fill: "forwards" },
        );

        const images = trackElement.getElementsByClassName("image");
        for (const image of images) {
            image.animate(
                { objectPosition: `${100 + percentage}% center` },
                { duration: 1200, fill: "forwards" },
            );
        }
    };

    function handleBookClick(book: LibraryItem) {
        library.selectedBook = book;
        goto("/reader");
    }

    onMount(() => {
        loadLibrary();
    });
</script>

<svelte:window
    onmousedown={handleDown}
    onmousemove={handleMove}
    onmouseup={handleUp}
/>

<main
    class="bg-stone-950 h-screen w-screen overflow-hidden m-0 p-0 select-none cursor-grab active:cursor-grabbing"
>
    <div
        class="fixed top-10 left-10 z-50 flex flex-col gap-4 items-start"
        role="toolbar"
        aria-label="Library controls"
    >
        <button
            onclick={scanLibrary}
            disabled={library.loadingStatus === "loading"}
            class="bg-white/5 hover:bg-white/10 text-white/80 hover:text-white px-6 py-3 rounded-full backdrop-blur-xl transition-all border border-white/10 text-xs uppercase tracking-widest font-bold disabled:opacity-50"
            aria-busy={library.loadingStatus === "loading"}
        >
            {library.loadingStatus === "loading"
                ? "Scanning..."
                : "Sync Library"}
        </button>

        {#if library.loadingStatus === "error"}
            <div
                transition:fade={{ duration: 200 }}
                class="flex items-center gap-3 bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2 rounded-2xl backdrop-blur-xl text-sm"
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

    <div
        id="image-track"
        bind:this={trackElement}
        class="flex gap-[4vmin] absolute left-[50%] top-[50%]"
        role="list"
        aria-label="Book collection"
    >
        {#each library.books as book (book.id || book.title)}
            <div role="listitem">
                <BookCard {book} onclick={() => handleBookClick(book)} />
            </div>
        {/each}
    </div>

    <div
        class="absolute bottom-10 left-1/2 -translate-x-1/2 text-white/20 text-[10px] uppercase tracking-[0.5em]"
        aria-hidden="true"
    >
        Click and Drag to Explore
    </div>
</main>

<style>
    #image-track {
        display: flex;
        user-select: none;
        transform: translate(0%, -50%);
        will-change: transform;
    }

    :global(.image) {
        object-position: 100% center;
        will-change: object-position;
    }
</style>
