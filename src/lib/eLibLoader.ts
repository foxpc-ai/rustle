import { writable } from 'svelte/store';
import { invoke, convertFileSrc } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';

export interface LibraryItem {
    id: number;
    title: string;
    author: string;
    path: string;
    cover: string | null;
}

export const libraryBooks = writable<LibraryItem[]>([]);
export const loadingStatus = writable<'idle' | 'loading' | 'error' | 'loaded'>('idle');
export const selectedBook = writable<LibraryItem | null>(null);


/**
 * Helper to transform raw system paths from Rust into URLs the browser can render
 */
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
    loadingStatus.set('loading');
    try {
        const books = await invoke('get_library') as LibraryItem[];
        libraryBooks.set(processCoverPaths(books));
        loadingStatus.set('loaded');
    } catch (e) {
        console.error("Failed to load library:", e);
        loadingStatus.set('error');
    }
}

/**
 * Scans a new directory and adds books to the database.
 */
export async function scanLibrary() {
    try {
        const selected = await open({ directory: true, multiple: false });
        if (!selected) return;

        loadingStatus.set('loading');
        const books = await invoke('sync_library', { folderPath: selected }) as LibraryItem[];

        libraryBooks.set(processCoverPaths(books));
        loadingStatus.set('loaded');
    } catch (e) {
        console.error("Failed to scan library:", e);
        loadingStatus.set('error');
    }
}