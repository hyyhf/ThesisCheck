/**
 * Rewrite page - academic text rewriting interface.
 * Users select text, input rewrite requirements, and get streaming AI rewrite results.
 */

import { useState, useCallback, useEffect, useRef } from "react";
import {
    Button,
    MessageBar,
    MessageBarBody,
    MessageBarTitle,
    Textarea,
    ProgressBar,
} from "@fluentui/react-components";
import {
    TextEffectsRegular,
    PlayRegular,
    StopRegular,
    CheckmarkRegular,
    DismissRegular,
    ArrowResetRegular,
} from "@fluentui/react-icons";
import { motion, AnimatePresence } from "framer-motion";
import type { Settings } from "../services/storage";
import { hasValidSettings } from "../services/storage";
import { getSelectedText, markSelectedRange, replaceMarkedRange, clearRewriteMark } from "../services/wordApi";
import { startRewriteStream } from "../services/api";

interface RewritePageProps {
    settings: Settings;
    onNavigateToSettings: () => void;
}

export function RewritePage({ settings, onNavigateToSettings }: RewritePageProps) {
    const [selectedText, setSelectedText] = useState<string>("");
    const [requirement, setRequirement] = useState<string>("");
    const [rewrittenText, setRewrittenText] = useState<string>("");
    const [isRewriting, setIsRewriting] = useState(false);
    const [isDone, setIsDone] = useState(false);
    const [error, setError] = useState("");
    const [replaceStatus, setReplaceStatus] = useState("");
    const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const abortRef = useRef<AbortController | null>(null);
    const resultRef = useRef<HTMLDivElement | null>(null);

    const isConfigured = hasValidSettings(settings);

    // Poll for selection changes
    useEffect(() => {
        if (!isRewriting && !isDone) {
            const pollSelection = async () => {
                try {
                    const text = await getSelectedText();
                    setSelectedText(text);
                } catch {
                    // Silently ignore polling errors
                }
            };

            pollSelection();
            pollingRef.current = setInterval(pollSelection, 800);

            return () => {
                if (pollingRef.current) {
                    clearInterval(pollingRef.current);
                    pollingRef.current = null;
                }
            };
        } else {
            if (pollingRef.current) {
                clearInterval(pollingRef.current);
                pollingRef.current = null;
            }
        }
    }, [isRewriting, isDone]);

    // Cleanup content control marks on unmount
    useEffect(() => {
        return () => {
            clearRewriteMark().catch(() => {});
        };
    }, []);

    // Auto-scroll result area during streaming
    useEffect(() => {
        if (isRewriting && resultRef.current) {
            resultRef.current.scrollTop = resultRef.current.scrollHeight;
        }
    }, [rewrittenText, isRewriting]);

    const handleStartRewrite = useCallback(async () => {
        if (!selectedText || !requirement.trim()) return;

        setError("");
        setRewrittenText("");
        setIsRewriting(true);
        setIsDone(false);
        setReplaceStatus("");

        // Mark the current selection with an invisible ContentControl
        // so we can reliably replace it later regardless of text length
        try {
            const markedText = await markSelectedRange();
            if (!markedText) {
                setError("无法标记选中文本，请重新选择");
                setIsRewriting(false);
                return;
            }
        } catch (err) {
            setError(`标记选区失败: ${(err as Error).message}`);
            setIsRewriting(false);
            return;
        }

        const controller = startRewriteStream(settings, selectedText, requirement, {
            onText: (text) => {
                setRewrittenText((prev) => prev + text);
            },
            onError: (msg) => {
                setError(msg);
                setIsRewriting(false);
                // Clean up mark on error
                clearRewriteMark().catch(() => {});
            },
            onDone: () => {
                setIsRewriting(false);
                setIsDone(true);
            },
        });

        abortRef.current = controller;
    }, [selectedText, requirement, settings]);

    const handleCancel = useCallback(() => {
        if (abortRef.current) {
            abortRef.current.abort();
            abortRef.current = null;
        }
        setIsRewriting(false);
        // Clean up the content control mark
        clearRewriteMark().catch(() => {});
    }, []);

    const handleReplace = useCallback(async () => {
        if (!rewrittenText) return;

        setReplaceStatus("replacing");
        try {
            // Replace content via the marked ContentControl (handles any text length)
            const success = await replaceMarkedRange(rewrittenText);
            if (success) {
                setReplaceStatus("success");
                setTimeout(() => {
                    setReplaceStatus("");
                    setRewrittenText("");
                    setIsDone(false);
                    setSelectedText("");
                    setRequirement("");
                }, 2000);
            } else {
                setReplaceStatus("not_found");
                setTimeout(() => setReplaceStatus(""), 4000);
            }
        } catch (err) {
            setReplaceStatus("error");
            setError(`替换失败: ${(err as Error).message}`);
            setTimeout(() => setReplaceStatus(""), 4000);
        }
    }, [rewrittenText]);

    const handleReset = useCallback(() => {
        setRewrittenText("");
        setIsDone(false);
        setReplaceStatus("");
        setError("");
        // Clean up the content control mark so user can re-select
        clearRewriteMark().catch(() => {});
    }, []);

    // Not configured - show prompt
    if (!isConfigured) {
        return (
            <div className="flex flex-col h-full bg-zinc-50 relative">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30"></div>

                <div className="flex flex-col items-center justify-center h-full p-8 text-center gap-6 relative z-10">
                    <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-zinc-200 flex items-center justify-center p-3">
                        <svg className="w-full h-full text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-xl font-semibold text-zinc-900 tracking-tight">配置 API</h2>
                        <p className="text-sm text-zinc-500 max-w-[250px] leading-relaxed mx-auto">
                            在使用改写功能前，请先配置大语言模型及接口地址。
                        </p>
                    </div>

                    <Button
                        appearance="primary"
                        onClick={onNavigateToSettings}
                        className="rounded-full px-6 shadow-sm shadow-blue-500/20"
                    >
                        前往设置
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-zinc-50">
            {/* Input Area */}
            <div className="flex flex-col gap-3 p-3 bg-white border-b border-zinc-200/60 shadow-sm z-10">
                {/* Selected text preview */}
                <AnimatePresence mode="popLayout">
                    {!isRewriting && !isDone && (
                        <motion.div
                            initial={{ opacity: 0, height: 0, scale: 0.95 }}
                            animate={{ opacity: 1, height: "auto", scale: 1 }}
                            exit={{ opacity: 0, height: 0, scale: 0.95 }}
                            className="w-full"
                        >
                            {selectedText ? (
                                <div className="p-3 bg-violet-50/60 rounded-xl border border-violet-200/60 w-full overflow-hidden shadow-sm">
                                    <div className="text-[10px] font-semibold text-violet-400 tracking-wider uppercase mb-1.5">当前选中文本</div>
                                    <div className="text-[12px] text-zinc-600 line-clamp-4 leading-relaxed break-all">
                                        "{selectedText}"
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center gap-2 p-4 bg-zinc-50/50 rounded-xl border border-dashed border-zinc-300 w-full text-zinc-400">
                                    <TextEffectsRegular className="text-lg" />
                                    <span className="text-xs font-medium">请在文档中选中要改写的文本</span>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Requirement input */}
                {!isRewriting && !isDone && (
                    <div className="w-full">
                        <div className="text-[10px] font-semibold text-zinc-400 tracking-wider uppercase mb-1.5">改写需求</div>
                        <Textarea
                            value={requirement}
                            onChange={(_, data) => setRequirement(data.value)}
                            placeholder="请输入改写需求，例如: 使语言更加学术化、精炼表达、增强逻辑性..."
                            resize="vertical"
                            className="w-full"
                            style={{ minHeight: "60px" }}
                            disabled={isRewriting}
                        />
                    </div>
                )}

                {/* Action buttons */}
                <div className="flex items-center justify-center gap-2">
                    {!isRewriting && !isDone && (
                        <Button
                            appearance="primary"
                            icon={<PlayRegular />}
                            onClick={handleStartRewrite}
                            disabled={!selectedText || !requirement.trim()}
                            className={`w-full max-w-[200px] shadow-sm tracking-tight transition-all duration-300 ${(!selectedText || !requirement.trim()) ? "" : "hover:shadow-violet-500/20 shadow-violet-500/10 active:scale-[0.98]"}`}
                            style={selectedText && requirement.trim() ? { backgroundColor: "#7c3aed" } : {}}
                        >
                            开始改写
                        </Button>
                    )}

                    {isRewriting && (
                        <div className="flex flex-col items-center gap-3 w-full animate-in fade-in zoom-in duration-300">
                            <div className="relative flex items-center justify-center">
                                <span className="absolute inline-flex h-full w-full rounded-full bg-violet-400/30 animate-ping"></span>
                                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-zinc-200 z-10">
                                    <div className="w-4 h-4 rounded-full border-2 border-violet-500 border-t-transparent animate-spin"></div>
                                </div>
                            </div>
                            <Button
                                appearance="subtle"
                                onClick={handleCancel}
                                className="text-zinc-500 hover:text-red-500 transition-colors"
                            >
                                <StopRegular className="mr-2" /> 取消改写
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Error Area */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="px-4 pt-4"
                    >
                        <MessageBar intent="error" className="rounded-xl shadow-sm border border-red-200/50">
                            <MessageBarBody>
                                <MessageBarTitle>运行错误</MessageBarTitle>
                                {error}
                            </MessageBarBody>
                        </MessageBar>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Result Area */}
            <div className="flex-1 overflow-y-auto w-full pt-2">
                <AnimatePresence>
                    {(isRewriting || isDone) && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mx-3 mb-4"
                        >
                            {/* Original text card (compact) */}
                            <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200/80 mb-3 shadow-sm">
                                <div className="text-[10px] font-semibold text-zinc-400 tracking-wider uppercase mb-1.5">原文</div>
                                <div className="text-[12px] text-zinc-500 line-clamp-3 leading-relaxed break-all">
                                    "{selectedText}"
                                </div>
                            </div>

                            {/* Rewritten text card */}
                            <div className="p-4 bg-white rounded-2xl border border-violet-200/60 shadow-sm relative overflow-hidden">
                                {/* Top accent line */}
                                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-400 via-purple-400 to-violet-400"></div>

                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-6 h-6 rounded-full bg-violet-50 border border-violet-100 flex items-center justify-center">
                                        <TextEffectsRegular className="text-violet-500 text-[14px]" />
                                    </div>
                                    <h3 className="text-sm font-semibold text-zinc-800">改写结果</h3>
                                    {isRewriting && (
                                        <ProgressBar shape="rounded" thickness="medium" className="flex-1 ml-2" color="brand" />
                                    )}
                                </div>

                                <div
                                    ref={resultRef}
                                    className="text-[13px] leading-[1.8] text-zinc-700 whitespace-pre-wrap break-words max-h-[300px] overflow-y-auto"
                                >
                                    {rewrittenText}
                                    {isRewriting && (
                                        <span className="inline-block w-1.5 h-3.5 bg-violet-500 ml-1 align-text-bottom animate-pulse" />
                                    )}
                                </div>

                                {/* Action buttons when done */}
                                {isDone && rewrittenText && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="flex items-center gap-2 mt-4 pt-3 border-t border-zinc-100"
                                    >
                                        <Button
                                            appearance="primary"
                                            icon={<CheckmarkRegular />}
                                            onClick={handleReplace}
                                            disabled={replaceStatus === "replacing" || replaceStatus === "success"}
                                            className="flex-1 shadow-sm"
                                            style={{ backgroundColor: "#7c3aed" }}
                                        >
                                            {replaceStatus === "replacing"
                                                ? "替换中..."
                                                : replaceStatus === "success"
                                                    ? "替换成功!"
                                                    : replaceStatus === "not_found"
                                                        ? "未找到原文"
                                                        : "确认替换"}
                                        </Button>
                                        <Button
                                            appearance="subtle"
                                            icon={<ArrowResetRegular />}
                                            onClick={handleReset}
                                            disabled={replaceStatus === "replacing"}
                                            className="text-zinc-500 hover:text-zinc-700"
                                        >
                                            重新改写
                                        </Button>
                                        <Button
                                            appearance="transparent"
                                            icon={<DismissRegular />}
                                            onClick={() => {
                                                handleReset();
                                                setSelectedText("");
                                            }}
                                            disabled={replaceStatus === "replacing"}
                                            className="text-zinc-400 hover:text-zinc-600 min-w-0 px-2"
                                        />
                                    </motion.div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Empty state when no results */}
                {!isRewriting && !isDone && !error && (
                    <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                        <div className="w-12 h-12 bg-violet-50 rounded-2xl flex items-center justify-center mb-4 border border-violet-100">
                            <TextEffectsRegular className="text-violet-400 text-xl" />
                        </div>
                        <p className="text-sm text-zinc-400 max-w-[220px] leading-relaxed">
                            选中文档中的文本片段，输入改写需求，即可进行学术化改写
                        </p>
                    </div>
                )}
            </div>

            {/* Status bar */}
            {(isDone || isRewriting) && (
                <div className="flex justify-between items-center px-4 py-2 bg-zinc-100/80 border-t border-zinc-200/80 text-[10px] text-zinc-400 tracking-wider backdrop-blur-md">
                    <span>{isRewriting ? "正在改写..." : "改写完成"}</span>
                    <span>{settings.modelName}模型</span>
                </div>
            )}
        </div>
    );
}
