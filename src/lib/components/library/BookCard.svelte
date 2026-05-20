<script lang="ts">
	import type { LibraryItem } from "$lib/eLibLoader.svelte";
	let { book, onclick } = $props<{
		book: LibraryItem;
		onclick: () => void;
	}>();
</script>

<button
	type="button"
	class="group relative w-[40vmin] h-[56vmin] flex-shrink-0 text-left outline-none"
	{onclick}
>
	<div class="relative w-full h-full overflow-hidden rounded-xl">
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
