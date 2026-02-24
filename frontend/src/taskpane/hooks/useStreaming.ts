/**
 * Hook for managing SSE streaming review state.
 */

import { useState, useCallback, useRef } from "react";
import { type ReviewComment, startStreamingReview, startOverallCommentStream } from "../services/api";
import type { Settings } from "../services/storage";
import type { ParagraphData } from "../services/wordApi";

export interface StreamingProgress {
    currentBatch: number;
    totalBatches: number;
    message: string;
}

export function useStreaming() {
    const [comments, setComments] = useState<ReviewComment[]>([]);
    const [isStreaming, setIsStreaming] = useState(false);
    const [progress, setProgress] = useState<StreamingProgress | null>(null);
    const [summary, setSummary] = useState("");
    const [error, setError] = useState("");
    const [rawText, setRawText] = useState("");
    const [overallComment, setOverallComment] = useState("");
    const [isGeneratingComment, setIsGeneratingComment] = useState(false);
    const abortRef = useRef<AbortController | null>(null);
    const commentAbortRef = useRef<AbortController | null>(null);

    const startReview = useCallback(
        (settings: Settings, paragraphs: ParagraphData[]) => {
            // Reset state
            setComments([]);
            setSummary("");
            setError("");
            setIsStreaming(true);
            setProgress(null);
            setRawText("");

            const controller = startStreamingReview(settings, paragraphs, {
                onComment: (comment) => {
                    setComments((prev) => [...prev, comment]);
                },
                onProgress: (p) => {
                    setProgress({
                        currentBatch: p.current_batch,
                        totalBatches: p.total_batches,
                        message: p.message,
                    });
                },
                onSummary: (s) => {
                    setSummary(s);
                },
                onText: (text) => {
                    setRawText((prev) => prev + text);
                },
                onError: (msg) => {
                    setError(msg);
                },
                onDone: () => {
                    setIsStreaming(false);
                },
            });

            abortRef.current = controller;
        },
        [],
    );

    const cancelReview = useCallback(() => {
        if (abortRef.current) {
            abortRef.current.abort();
            abortRef.current = null;
        }
        setIsStreaming(false);
    }, []);

    const startCommentGeneration = useCallback(
        (settings: Settings, paragraphs: ParagraphData[]) => {
            setOverallComment("");
            setIsGeneratingComment(true);
            setError("");

            const controller = startOverallCommentStream(settings, paragraphs, {
                onText: (text) => {
                    setOverallComment((prev) => prev + text);
                },
                onError: (msg) => {
                    setError(msg);
                    setIsGeneratingComment(false);
                },
                onDone: () => {
                    setIsGeneratingComment(false);
                },
            });

            commentAbortRef.current = controller;
        },
        [],
    );

    const cancelCommentGeneration = useCallback(() => {
        if (commentAbortRef.current) {
            commentAbortRef.current.abort();
            commentAbortRef.current = null;
        }
        setIsGeneratingComment(false);
    }, []);

    const clearResults = useCallback(() => {
        setComments([]);
        setSummary("");
        setError("");
        setProgress(null);
        setRawText("");
        setOverallComment("");
    }, []);

    return {
        comments,
        isStreaming,
        progress,
        summary,
        error,
        rawText,
        overallComment,
        isGeneratingComment,
        startReview,
        cancelReview,
        startCommentGeneration,
        cancelCommentGeneration,
        clearResults,
    };
}
