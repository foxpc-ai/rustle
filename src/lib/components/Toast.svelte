<script lang="ts">
    import { fly, fade } from 'svelte/transition';
    import { toast } from '$lib/toast.svelte';

    const typeStyles = {
        error: 'bg-red-500/10 border-red-500/30 text-red-400',
        success: 'bg-green-500/10 border-green-500/30 text-green-400',
        info: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
    };
</script>

{#if toast.items.length > 0}
    <div class="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
        {#each toast.items as item (item.id)}
            <div
                class="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-xl shadow-lg text-sm max-w-sm {typeStyles[item.type]}"
                in:fly={{ x: 50, duration: 200 }}
                out:fade={{ duration: 150 }}
                role="alert"
            >
                <span class="flex-1">{item.message}</span>
                <button
                    onclick={() => toast.dismiss(item.id)}
                    class="opacity-50 hover:opacity-100 transition-opacity text-xs"
                    aria-label="Dismiss"
                >✕</button>
            </div>
        {/each}
    </div>
{/if}
