import { invoke } from "@tauri-apps/api/core";

export interface NavItem {
    title: string;
    href: string;
    spine_index: number;
    children: NavItem[];
}

export async function openBook(path: string): Promise<NavItem[]> {
    try {
        return await invoke<NavItem[]>("open_book", { path });
    } catch (error) {
        console.error("Failed to open book:", error);
        throw new Error(error as string);
    }
}

export async function getChapter(bookPath: string, index: number): Promise<string> {
    const bytes: number[] = await invoke("get_chapter_content", { path: bookPath, index });

    const uint8Array = new Uint8Array(bytes);
    const decoder = new TextDecoder();
    const html = decoder.decode(uint8Array);

    return html;
}

export async function getResource(path: string, chapterIdx: number, relPath: string): Promise<Uint8Array> {
    return await invoke("get_book_resource", { path, chapterIdx, relPath });
}

export function flattenToc(items: NavItem[]): NavItem[] {
    let flat: NavItem[] = [];
    for (const item of items) {
        flat.push(item);
        if (item.children && item.children.length > 0) {
            flat = flat.concat(flattenToc(item.children));
        }
    }
    return flat;
}