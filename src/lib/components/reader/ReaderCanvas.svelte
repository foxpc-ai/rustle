<script lang="ts">
    import { fade } from "svelte/transition";
    let { htmlContent, isLoading } = $props<{
        htmlContent: string;
        isLoading: boolean;
    }>();
</script>

<div class="reader-canvas mx-auto relative max-w-[70ch] w-full">
    {#if isLoading}
        <div
            class="fixed inset-0 flex items-center justify-center bg-inherit/50 backdrop-blur-[2px] z-50"
            transition:fade={{ duration: 100 }}
        >
            <div
                class="w-12 h-12 border-2 border-orange-500/20 border-t-orange-500 rounded-full animate-spin"
            ></div>
        </div>
    {/if}

    {#key htmlContent}
        <article 
            class="reading-content"
            in:fade={{ duration: 80, delay: 5 }}
            out:fade={{ duration: 0 }}
        >
            {@html htmlContent}
        </article>
    {/key}
</div>

<style>
    .reading-content {
        font-size: var(--reader-font-size);
        line-height: 1.8;
    }
</style>