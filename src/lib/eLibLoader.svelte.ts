import { invoke, convertFileSrc } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { error } from '@tauri-apps/plugin-log';

export interface LibraryItem {
    id: number;
    title: string;
    author: string;
    path: string;
    cover: string | null;
    progress: number
}


export const library = $state({
    books: [] as LibraryItem[],
    loadingStatus: 'idle' as 'idle' | 'loading' | 'error' | 'loaded',
    selectedBook: null as LibraryItem | null
});

function processCoverPaths(books: LibraryItem[]): LibraryItem[] {
    return books.map(book => {
        if (book.cover) {
            const normalizedPath = book.cover.replace(/\\/g, '/');
            const assetUrl = convertFileSrc(normalizedPath);
            return { ...book, cover: assetUrl };
        }
        return book;
    });
}

export async function loadLibrary() {
    library.loadingStatus = 'loading';
    try {
        const books = await invoke('get_library') as LibraryItem[];
        library.books = processCoverPaths(books);
        library.loadingStatus = 'loaded';
    } catch (e) {
        error(`Failed to load library:${e}`);
        library.loadingStatus = 'error';
    }
}

export async function scanLibrary() {
    try {
        const selected = await open({
            directory: true,
            multiple: false,
            title: "Select Library Folder"
        });

        if (!selected) return;

        library.loadingStatus = 'loading';

        await invoke('sync_library', { folderPath: selected });

    } catch (e) {
        error(`Failed to scan library: ${e}`);
        library.loadingStatus = 'error';
    }
}