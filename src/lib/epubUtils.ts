import { invoke } from "@tauri-apps/api/core";
import { error } from '@tauri-apps/plugin-log';

export function rewriteResourceUrls(html: string, spineIndex: number): string {
    const assetUrlBase = `http://epub-asset.localhost/img?ch=${spineIndex}&path=`;

    let processedHtml = html
        .replace(/<\?xml[^>]*\?>/gi, "")
        .replace(/<!DOCTYPE[^>]*>/gi, "")
        .replace(/margin-(left|right)\s*:\s*10%/gi, "margin-$1: 0 !important");

    const urlPattern = /(<(?:img|link)\s+[^>]*?)(src|href)=["']([^"']*)["']/gi;
    processedHtml = processedHtml.replace(urlPattern, (match, prefix, attr, url) => {
        if (/^(http|data:|epub-asset:)/i.test(url)) return match;
        return `${prefix}${attr}="${assetUrlBase}${encodeURIComponent(url)}"`;
    });

    return processedHtml.replace(/url\(['"]?([^'"\)]+)['"]?\)/gi, (match, url) => {
        if (/^(http|data:|epub-asset:)/i.test(url)) return match;
        return `url("${assetUrlBase}${encodeURIComponent(url)}")`;
    });
}

export async function saveProgress(filePath: string, position: string, progress: number) {
    try {
        await invoke("update_last_position", { filePath, position, progress });
    } catch (e) {
        error(`Failed to save progress: ${e}`);
    }
}

export async function getProgress(filePath: string): Promise<string | null> {
    try {
        return await invoke<string | null>("get_last_position", { filePath });
    } catch (e) {
        error(`Failed to load progress: ${e}`);
        return null;
    }
}
