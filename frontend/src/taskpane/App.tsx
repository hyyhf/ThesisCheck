/**
 * ThesisCheck - Main App component.
 * Routes between Rewrite, Review and Settings pages.
 */

import { useState } from "react";
import { FluentProvider, webLightTheme } from "@fluentui/react-components";
import { Header } from "./components/Header";
import { RewritePage } from "./pages/RewritePage";
import { ReviewPage } from "./pages/ReviewPage";
import { SettingsPage } from "./pages/SettingsPage";
import { useSettings } from "./hooks/useSettings";

export function App() {
    const [activePage, setActivePage] = useState<"rewrite" | "review" | "settings">("rewrite");
    const { settings, updateSettings, saveSettings } = useSettings();

    return (
        <FluentProvider theme={webLightTheme}>
            <div className="flex flex-col h-screen overflow-hidden bg-white selection:bg-blue-500/20">
                <Header activePage={activePage} onPageChange={setActivePage} />
                <div className="flex-1 overflow-auto overflow-x-hidden relative">
                    {activePage === "rewrite" ? (
                        <RewritePage
                            settings={settings}
                            onNavigateToSettings={() => setActivePage("settings")}
                        />
                    ) : activePage === "review" ? (
                        <ReviewPage
                            settings={settings}
                            onNavigateToSettings={() => setActivePage("settings")}
                        />
                    ) : (
                        <SettingsPage
                            settings={settings}
                            onUpdateSettings={updateSettings}
                            onSaveSettings={saveSettings}
                        />
                    )}
                </div>
            </div>
        </FluentProvider>
    );
}
