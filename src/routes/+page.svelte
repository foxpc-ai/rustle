<script lang="ts">
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    import {
        libraryBooks,
        loadingStatus,
        scanLibrary,
        loadLibrary,
        selectedBook,
    } from "$lib/eLibLoader";
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

    function handleBookClick(book: any) {
        selectedBook.set(book);
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
    <div class="fixed top-10 left-10 z-50 flex items-center gap-4">
        <button
            onclick={scanLibrary}
            class="bg-white/5 hover:bg-white/10 text-white/80 hover:text-white px-6 py-3 rounded-full backdrop-blur-xl transition-all border border-white/10 text-xs uppercase tracking-widest font-bold"
        >
            {$loadingStatus === "loading" ? "Scanning..." : "Sync Library"}
        </button>
    </div>

    <div
        id="image-track"
        bind:this={trackElement}
        class="flex gap-[4vmin] absolute left-[50%] top-[50%]"
    >
        {#each $libraryBooks as book}
            <BookCard {book} onclick={() => handleBookClick(book)} />
        {/each}
    </div>

    <div
        class="absolute bottom-10 left-1/2 -translate-x-1/2 text-white/20 text-[10px] uppercase tracking-[0.5em]"
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
