<script lang="ts">
    import type { NavItem } from "$lib/eBookLoader";
    import { fade } from "svelte/transition";

    export let items: NavItem[];
    export let currentHref: string;
    export let onSelect: (spine_index: number, href: string) => void;
    export let depth = 0;

    let expandedItems = new Set<string>();

    function toggleExpand(href: string, e: MouseEvent) {
        e.stopPropagation();
        if (expandedItems.has(href)) {
            expandedItems.delete(href);
        } else {
            expandedItems.add(href);
        }
        expandedItems = expandedItems;
    }
</script>

<ul
    class="space-y-1 {depth > 0
        ? 'mt-1 ml-4 border-l border-stone-500/10'
        : ''}"
>
    {#each items as item}
        {@const hasChildren = item.children && item.children.length > 0}
        {@const isExpanded = expandedItems.has(item.href)}

        <li>
            <div class="group flex items-center gap-1">
                <button
                    on:click={() => onSelect(item.spine_index, item.href)}
                    class="flex-1 text-left py-1.5 px-3 rounded text-sm transition-all
                    {currentHref === item.href
                        ? 'bg-orange-500/10 text-orange-600 font-bold'
                        : 'opacity-60 hover:opacity-100 hover:bg-stone-500/5'}"
                >
                    {item.title}
                </button>

                {#if hasChildren}
                    <button
                        on:click={(e) => toggleExpand(item.href, e)}
                        class="p-2 opacity-40 hover:opacity-100 transition-transform {isExpanded
                            ? 'rotate-90'
                            : ''}"
                        aria-label="Toggle Sub-chapters"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="3"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            ><path d="m9 18 6-6-6-6" /></svg
                        >
                    </button>
                {/if}
            </div>

            {#if hasChildren && isExpanded}
                <div transition:fade={{ duration: 150 }}>
                    <svelte:self
                        items={item.children}
                        {currentHref}
                        {onSelect}
                        depth={depth + 1}
                    />
                </div>
            {/if}
        </li>
    {/each}
</ul>
