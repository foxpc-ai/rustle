import { invoke } from "@tauri-apps/api/core";
import { error } from '@tauri-apps/plugin-log';

export const readerPrefs = $state({
    fontSize: 18,
    theme: 'dark',
    brightness: 1.0
});

export const readerStatus = $state({
    isLoading: false,
    showToc: false,
    showSettings: false,
    showAnnotations: false,
});

export async function initSettings() {
    try {
        const saved = await invoke("load_settings") as Record<string, string>;
        if (saved) {
            if (saved.fontSize) readerPrefs.fontSize = parseInt(saved.fontSize);
            if (saved.theme) readerPrefs.theme = saved.theme;
            if (saved.brightness) readerPrefs.brightness = parseFloat(saved.brightness);
        }
    } catch (e) {
        error(`Failed to load settings from DB ${e}`);
    }
}

$effect.root(() => {
    $effect(() => {
        const settingsMap = {
            fontSize: readerPrefs.fontSize.toString(),
            theme: readerPrefs.theme,
            brightness: readerPrefs.brightness.toString(),
        };

        const timer = setTimeout(() => {
            invoke("save_settings", { settings: settingsMap })
                .catch(e => error(`Failed to save settings: ${e}`));
        }, 2000);

        return () => clearTimeout(timer);
    });
});