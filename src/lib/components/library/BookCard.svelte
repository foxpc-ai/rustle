<script lang="ts">
	import type { LibraryItem } from "$lib/eLibLoader.svelte";
	import { library } from "$lib/eLibLoader.svelte";

	let { book, onclick } = $props<{
		book: LibraryItem;
		onclick: () => void;
	}>();

	let showMenu = $state(false);
	let menuPos = $state({ x: 0, y: 0 });
	let confirmingDelete = $state(false);

	function handleContextMenu(e: MouseEvent) {
		e.preventDefault();
		e.stopImmediatePropagation();

		const existingMenus = document.querySelectorAll(".custom-context-menu");
		existingMenus.forEach((menu) => {
			menu.dispatchEvent(new CustomEvent("close-other-menus"));
		});

		menuPos = { x: e.clientX, y: e.clientY };
		confirmingDelete = false;
		showMenu = true;
	}

	function closeMenu() {
		showMenu = false;
		confirmingDelete = false;
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
	class="card group relative w-[28vmin] h-[40vmin] flex-shrink-0 text-left outline-none bg-stone-900 rounded-xl"
	{onclick}
	oncontextmenu={handleContextMenu}
>
	<div
		class="relative w-full h-full overflow-hidden rounded-xl pointer-events-none"
	>
		<img
			class="card-image w-full h-full object-cover rounded-xl shadow-2xl brightness-75 group-hover:brightness-100 transition-all duration-500"
			src={book.cover ?? undefined}
			onerror={(e) => {
				(e.currentTarget as HTMLImageElement).style.display = "none";
			}}
			alt={book.title}
			draggable="false"
		/>
		{#if !book.cover}
			<div
				class="absolute inset-0 flex items-end bg-gradient-to-t from-stone-800 to-stone-700 rounded-xl"
			></div>
		{/if}
		<div
			class="absolute bottom-0 left-0 pt-20 p-4 pb-6 w-full bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-b-xl"
		>
			{#if book.progress > 0}
				<span
					class="text-[9px] text-stone-400 font-bold tracking-widest uppercase mb-1 block"
				>
					{Math.round(book.progress * 100)}% Read
				</span>
			{/if}
			<h3 class="text-white font-bold text-sm truncate">{book.title}</h3>
			<p class="text-white/60 text-xs">{book.author}</p>
		</div>
	</div>
</button>

{#if showMenu}
	<div
		use:teleportToBody
		role="menu"
		tabindex="0"
		aria-label="Book options"
		class="custom-context-menu fixed min-w-[200px] bg-stone-900 border border-stone-800 rounded-xl p-1.5 shadow-2xl flex flex-col text-white"
		style="top: {menuPos.y}px; left: {menuPos.x}px; z-index: 999999;"
		onclick={(e) => e.stopPropagation()}
		onkeydown={(e) => {
			e.stopPropagation();

			if (e.key === "Escape") {
				closeMenu();
			}
		}}
		oncontextmenu={(e) => e.preventDefault()}
	>
		<div
			class="text-[10px] text-stone-500 font-bold tracking-widest uppercase px-3 py-1.5 border-b border-stone-800/60 mb-1 select-none truncate"
		>
			{book.title}
		</div>

		<button
			role="menuitem"
			type="button"
			class="w-full text-left px-3 py-2 text-sm text-stone-300 hover:bg-stone-700/60 rounded-lg transition-colors duration-150 flex items-center gap-2 outline-none"
			onclick={() => {
				closeMenu();
				library.removeBook(book.path);
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
				<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline
					points="16 17 21 12 16 7"
				/><line x1="21" x2="9" y1="12" y2="12" />
			</svg>
			Remove from Library
		</button>

		<div class="border-t border-stone-800/60 my-1"></div>

		{#if confirmingDelete}
			<div class="px-3 py-2 space-y-2">
				<p class="text-[11px] text-stone-400 leading-snug">
					Permanently delete the file from disk? This cannot be
					undone.
				</p>
				<div class="flex gap-2">
					<button
						type="button"
						class="flex-1 px-2 py-1.5 text-[11px] font-bold bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition-colors outline-none"
						onclick={() => {
							closeMenu();
							library.deleteBook(book.path);
						}}
					>
						Delete
					</button>
					<button
						type="button"
						class="flex-1 px-2 py-1.5 text-[11px] font-bold bg-stone-700/60 text-stone-300 hover:bg-stone-700 rounded-lg transition-colors outline-none"
						onclick={() => (confirmingDelete = false)}
					>
						Cancel
					</button>
				</div>
			</div>
		{:else}
			<button
				role="menuitem"
				type="button"
				class="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors duration-150 flex items-center gap-2 font-medium outline-none"
				onclick={() => (confirmingDelete = true)}
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
					<path d="M3 6h18" /><path
						d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"
					/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
				</svg>
				Delete from Disk
			</button>
		{/if}
	</div>
{/if}

<style>
	.card-image {
		animation: parallax linear both;
		animation-timeline: scroll(x nearest);
		animation-range: cover;
	}

	@keyframes parallax {
		from {
			object-position: 30% center;
		}
		to {
			object-position: 70% center;
		}
	}
</style>
