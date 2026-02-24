/**
 * Backend API service for review and health check.
 */

import type { ParagraphData } from "./wordApi";
import type { Settings } from "./storage";

export interface ReviewComment {
    paragraph_index: number;
    target_text: string;
    comment: string;
    severity: "error" | "warning" | "suggestion";
}

export interface StreamEvent {
    event: string;
    data: string;
}

/**
 * Check API health (verify API key and base URL).
 */
export async function checkHealth(
    settings: Settings,
): Promise<{ status: string; message: string }> {
    const response = await fetch(`${settings.backendUrl}/api/health`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            api_key: settings.apiKey,
            base_url: settings.baseUrl,
            model_name: settings.modelName,
        }),
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Generic SSE stream reader that parses events and dispatches to callbacks.
 */
function processSSEStream(
    response: Response,
    callbacks: {
        onComment?: (comment: ReviewComment) => void;
        onProgress?: (progress: { current_batch: number; total_batches: number; message: string }) => void;
        onSummary?: (summary: string) => void;
        onText?: (text: string) => void;
        onError?: (message: string) => void;
        onDone?: () => void;
    },
): void {
    const reader = response.body?.getReader();
    if (!reader) {
        callbacks.onError?.("Response body is not readable");
        return;
    }

    const decoder = new TextDecoder();
    let buffer = "";

    (async () => {
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() || "";

                let currentEvent = "";

                for (const line of lines) {
                    if (line.startsWith("event:")) {
                        currentEvent = line.slice(6).trim();
                    } else if (line.startsWith("data:")) {
                        const data = line.slice(5).trim();
                        try {
                            const parsed = JSON.parse(data);
                            switch (currentEvent) {
                                case "comment":
                                    callbacks.onComment?.(parsed as ReviewComment);
                                    break;
                                case "progress":
                                    callbacks.onProgress?.(parsed);
                                    break;
                                case "summary":
                                    callbacks.onSummary?.(parsed.summary || "");
                                    break;
                                case "text":
                                    callbacks.onText?.(parsed.content || "");
                                    break;
                                case "error":
                                    callbacks.onError?.(parsed.message || "Unknown error");
                                    break;
                                case "done":
                                    callbacks.onDone?.();
                                    break;
                            }
                        } catch {
                            // Skip malformed JSON lines
                        }
                        currentEvent = "";
                    }
                }
            }
        } catch (err) {
            // AbortError is expected when the user cancels the stream
            if ((err as Error).name !== "AbortError") {
                callbacks.onError?.((err as Error).message || "Stream read error");
            }
        }
    })();
}

/**
 * Start a streaming review session using SSE.
 * Returns an AbortController for cancellation.
 */
export function startStreamingReview(
    settings: Settings,
    paragraphs: ParagraphData[],
    callbacks: {
        onComment: (comment: ReviewComment) => void;
        onProgress: (progress: { current_batch: number; total_batches: number; message: string }) => void;
        onSummary: (summary: string) => void;
        onText: (text: string) => void;
        onError: (message: string) => void;
        onDone: () => void;
    },
): AbortController {
    const controller = new AbortController();

    (async () => {
        try {
            const response = await fetch(`${settings.backendUrl}/api/review/stream`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    paragraphs,
                    api_key: settings.apiKey,
                    base_url: settings.baseUrl,
                    model_name: settings.modelName,
                }),
                signal: controller.signal,
            });

            if (!response.ok) {
                callbacks.onError(`HTTP ${response.status}: ${response.statusText}`);
                return;
            }

            processSSEStream(response, callbacks);
        } catch (err) {
            if ((err as Error).name !== "AbortError") {
                callbacks.onError((err as Error).message || "Network error");
            }
        }
    })();

    return controller;
}

/**
 * Start a streaming overall comment generation session using SSE.
 * Returns an AbortController for cancellation.
 */
export function startOverallCommentStream(
    settings: Settings,
    paragraphs: ParagraphData[],
    callbacks: {
        onText: (text: string) => void;
        onError: (message: string) => void;
        onDone: () => void;
    },
): AbortController {
    const controller = new AbortController();

    (async () => {
        try {
            const response = await fetch(`${settings.backendUrl}/api/review/comment/stream`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    paragraphs,
                    api_key: settings.apiKey,
                    base_url: settings.baseUrl,
                    model_name: settings.modelName,
                }),
                signal: controller.signal,
            });

            if (!response.ok) {
                callbacks.onError(`HTTP ${response.status}: ${response.statusText}`);
                return;
            }

            processSSEStream(response, callbacks);
        } catch (err) {
            if ((err as Error).name !== "AbortError") {
                callbacks.onError((err as Error).message || "Network error");
            }
        }
    })();

    return controller;
}
