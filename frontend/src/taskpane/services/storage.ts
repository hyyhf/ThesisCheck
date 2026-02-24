/**
 * Local storage service for persisting user settings.
 * Settings are stored in browser localStorage, never sent to third parties.
 */

const STORAGE_KEY = "thesischeck_settings";

export interface Settings {
    apiKey: string;
    baseUrl: string;
    modelName: string;
    backendUrl: string;
}

const DEFAULT_SETTINGS: Settings = {
    apiKey: "",
    baseUrl: "https://api.openai.com/v1",
    modelName: "gpt-4o",
    backendUrl: "http://localhost:8000",
};

export function saveSettings(settings: Settings): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (err) {
        console.error("Failed to save settings:", err);
    }
}

export function loadSettings(): Settings {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw) as Partial<Settings>;
            return { ...DEFAULT_SETTINGS, ...parsed };
        }
    } catch (err) {
        console.error("Failed to load settings:", err);
    }
    return { ...DEFAULT_SETTINGS };
}

export function clearSettings(): void {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
        console.error("Failed to clear settings:", err);
    }
}

export function hasValidSettings(settings: Settings): boolean {
    return !!(settings.apiKey && settings.baseUrl && settings.modelName && settings.backendUrl);
}
