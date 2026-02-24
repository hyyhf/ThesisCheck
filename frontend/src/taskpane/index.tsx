/**
 * ThesisCheck - Taskpane entry point.
 * Initializes Office.js and renders the React app.
 */

import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles/global.css";

/* global Office */

Office.onReady(() => {
    const rootElement = document.getElementById("root");
    if (rootElement) {
        const root = createRoot(rootElement);
        root.render(<App />);
    }
});
