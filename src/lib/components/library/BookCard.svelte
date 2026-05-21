<script lang="ts">
	import type { LibraryItem } from "$lib/eLibLoader.svelte";
	import { library } from "$lib/eLibLoader.svelte";

	let { book, onclick } = $props<{
		book: LibraryItem;
		onclick: () => void;
	}>();

	let showMenu = $state(false);
	let menuPos = $state({ x: 0, y: 0 });

	function handleContextMenu(e: MouseEvent) {
		e.preventDefault();
		e.stopImmediatePropagation();

		const existingMenus = document.querySelectorAll(".custom-context-menu");
		existingMenus.forEach((menu) => {
			menu.dispatchEvent(new CustomEvent("close-other-menus"));
		});

		menuPos = { x: e.clientX, y: e.clientY };
		showMenu = true;
	}

	function closeMenu() {
		showMenu = false;
	}

	function teleportToBody(node: HTMLElement) {
		document.body.appendChild(node);

		const handleCloseSignal = () => closeMenu();
		node.addEventListener("close-other-menus", handleCloseSignal);

		return {
			destroy() {
				node.remove();
				node.removeEventListener(
					"close-other-menus",
					handleCloseSignal,
				);
			},
		};
	}
</script>

<svelte:window onclick={closeMenu} oncontextmenu={closeMenu} />

<button
	type="button"
	class="group relative w-[40vmin] h-[56vmin] flex-shrink-0 text-left outline-none bg-stone-900 rounded-xl"
	{onclick}
	oncontextmenu={handleContextMenu}
>
	<div
		class="relative w-full h-full overflow-hidden rounded-xl pointer-events-none"
	>
		<img
			class="image w-full h-full object-cover rounded-xl shadow-2xl brightness-75 group-hover:brightness-100 transition-all duration-500 scale-x-110"
			src={book.cover || "/fallback.png"}
			alt={book.title}
			draggable="false"
		/>
		<div
			class="absolute bottom-0 left-0 pt-20 p-6 pb-10 w-full bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-b-xl"
		>
			{#if book.progress && book.progress > 0}
				<span
					class="text-[10px] text-stone-400 font-bold tracking-widest uppercase mb-1"
				>
					{Math.round((book.progress || 0) * 100)}% Read
				</span>
			{/if}

			<h3 class="text-white font-bold text-xl truncate">{book.title}</h3>
			<p class="text-white/70 text-sm">{book.author}</p>
		</div>
	</div>
</button>

{#if showMenu}
	<div
		use:teleportToBody
		role="none"
		class="custom-context-menu fixed min-w-[180px] bg-stone-900 border border-stone-800 rounded-xl p-1.5 shadow-2xl flex flex-col text-white"
		style="
            top: {menuPos.y}px; 
            left: {menuPos.x}px; 
            z-index: 999999;
        "
		onclick={(e) => e.stopPropagation()}
		oncontextmenu={(e) => e.preventDefault()}
	>
		<div
			class="text-[10px] text-stone-500 font-bold tracking-widest uppercase px-3 py-1.5 border-b border-stone-800/60 mb-1 select-none"
		>
			Options
		</div>

		<button
			type="button"
			class="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors duration-150 flex items-center gap-2 font-medium outline-none"
			onclick={() => {
				closeMenu();
				if (
					confirm(
						`Are you sure you want to completely delete "${book.title}"?`,
					)
				) {
					library.removeBook(book.path);
				}
			}}
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="14"
				height="14"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2.5"
			>
				<path d="M3 6h18"></path>
				<path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
				<path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
			</svg>
			Delete Book
		</button>
	</div>
{/if}
