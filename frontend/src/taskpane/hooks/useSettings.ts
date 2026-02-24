/**
 * Hook for managing user settings state.
 */

import { useState, useEffect, useCallback } from "react";
import {
    type Settings,
    loadSettings,
    saveSettings as persistSettings,
    hasValidSettings,
} from "../services/storage";

export function useSettings() {
    const [settings, setSettings] = useState<Settings>(loadSettings);
    const [isValid, setIsValid] = useState(false);

    useEffect(() => {
        setIsValid(hasValidSettings(settings));
    }, [settings]);

    const updateSettings = useCallback((partial: Partial<Settings>) => {
        setSettings((prev) => ({ ...prev, ...partial }));
    }, []);

    const saveSettings = useCallback(() => {
        persistSettings(settings);
    }, [settings]);

    const resetSettings = useCallback(() => {
        const defaults = loadSettings();
        setSettings(defaults);
    }, []);

    return {
        settings,
        isValid,
        updateSettings,
        saveSettings,
        resetSettings,
    };
}
