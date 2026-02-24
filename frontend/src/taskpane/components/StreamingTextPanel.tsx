/**
 * StreamingTextPanel - shows LLM raw text generation in real-time.
 * Similar to a chatbot typing effect.
 */

import { useEffect, useRef } from "react";
import {
    Text,
    ProgressBar,
} from "@fluentui/react-components";
import { motion, AnimatePresence } from "framer-motion";
import type { StreamingProgress } from "../hooks/useStreaming";
import { cn } from "../utils";

interface StreamingTextPanelProps {
    rawText: string;
    isStreaming: boolean;
    progress: StreamingProgress | null;
}

export function StreamingTextPanel({
    rawText,
    isStreaming,
    progress,
}: StreamingTextPanelProps) {
    const textRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom as text grows
    useEffect(() => {
        if (textRef.current) {
            textRef.current.scrollTop = textRef.current.scrollHeight;
        }
    }, [rawText]);

    if (!isStreaming) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="flex flex-col mx-4 my-3 bg-[#1e1e1e] rounded-[1rem] border border-zinc-800 shadow-xl overflow-hidden"
        >
            {/* Header with batch info */}
            <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/50 border-b border-zinc-800 backdrop-blur-md">
                <div className="text-[13px] font-semibold text-zinc-100 tracking-tight flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    {progress && progress.totalBatches > 1
                        ? `AI 批次处理中 (${progress.currentBatch}/${progress.totalBatches})`
                        : "AI 深层分析中..."}
                </div>
                {progress && (
                    <div className="text-[11px] text-zinc-400">
                        {progress.message}
                    </div>
                )}
            </div>

            {/* Progress bar */}
            {progress && progress.totalBatches > 1 && (
                <div className="h-0.5 w-full bg-zinc-800">
                    <motion.div
                        className="h-full bg-emerald-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${(progress.currentBatch / progress.totalBatches) * 100}%` }}
                        transition={{ type: "spring", bounce: 0 }}
                    />
                </div>
            )}

            {/* Streaming text area */}
            <div
                className="p-5 max-h-[320px] overflow-y-auto text-[11px] leading-[1.8] text-zinc-300"
                ref={textRef}
            >
                {rawText ? (
                    <div className="whitespace-pre-wrap break-words">
                        {rawText}
                        <motion.span
                            animate={{ opacity: [1, 0] }}
                            transition={{ repeat: Infinity, duration: 0.8 }}
                            className="inline-block w-1.5 h-3.5 bg-emerald-500 ml-1 align-text-bottom"
                        />
                    </div>
                ) : (
                    <div className="text-zinc-500 italic flex items-center gap-2">
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                            className="w-3 h-3 rounded-full border-2 border-zinc-500 border-t-transparent"
                        />
                        正在解析文档结构与关键节点...
                    </div>
                )}
            </div>
        </motion.div>
    );
}
