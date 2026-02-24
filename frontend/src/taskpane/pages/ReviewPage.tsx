/**
 * Review page - main thesis review interface.
 */

import { useState, useCallback, useEffect, useRef } from "react";
import {
    Button,
    MessageBar,
    MessageBarBody,
    MessageBarTitle,
    Text,
    ToggleButton,
    ProgressBar,
} from "@fluentui/react-components";
import {
    DocumentSearchRegular,
    MultiselectLtrRegular,
    ArrowDownloadRegular,
    CommentRegular,
    DismissRegular,
    StopRegular,
    PlayRegular,
    TextEffectsRegular,
    NoteRegular,
} from "@fluentui/react-icons";
import { motion, AnimatePresence } from "framer-motion";
import type { Settings } from "../services/storage";
import { hasValidSettings } from "../services/storage";
import { getDocumentParagraphs, getSelectedParagraphs, getSelectedText, getDocumentTitle, insertComment, insertComments, scrollToText } from "../services/wordApi";
import { exportReviewReport, exportCommentReport } from "../services/exportService";
import { useStreaming } from "../hooks/useStreaming";
import { StreamingView } from "../components/StreamingView";
import { StreamingTextPanel } from "../components/StreamingTextPanel";
import type { ReviewComment } from "../services/api";
import type { ParagraphData } from "../services/wordApi";

type ReviewMode = "full" | "selection";

interface ReviewPageProps {
    settings: Settings;
    onNavigateToSettings: () => void;
}

export function ReviewPage({ settings, onNavigateToSettings }: ReviewPageProps) {
    const [reviewMode, setReviewMode] = useState<ReviewMode>("full");
    const [selectedPreview, setSelectedPreview] = useState<string>("");
    const [applyStatus, setApplyStatus] = useState<string>("");
    const [pageError, setPageError] = useState("");
    const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
    // Store paragraphs for later use in comment generation
    const paragraphsRef = useRef<ParagraphData[]>([]);

    const {
        comments,
        isStreaming,
        progress,
        summary,
        error: streamError,
        rawText,
        overallComment,
        isGeneratingComment,
        startReview,
        cancelReview,
        startCommentGeneration,
        cancelCommentGeneration,
        clearResults,
    } = useStreaming();

    const isConfigured = hasValidSettings(settings);

    // Poll for selection changes when in selection mode
    useEffect(() => {
        if (reviewMode === "selection" && !isStreaming) {
            const pollSelection = async () => {
                try {
                    const text = await getSelectedText();
                    setSelectedPreview(text);
                } catch {
                    // Silently ignore polling errors
                }
            };

            // Initial check
            pollSelection();

            // Poll every 800ms
            pollingRef.current = setInterval(pollSelection, 800);

            return () => {
                if (pollingRef.current) {
                    clearInterval(pollingRef.current);
                    pollingRef.current = null;
                }
            };
        } else {
            // Clear polling when not in selection mode
            if (pollingRef.current) {
                clearInterval(pollingRef.current);
                pollingRef.current = null;
            }
            if (reviewMode === "full") {
                setSelectedPreview("");
            }
        }
    }, [reviewMode, isStreaming]);

    const handleStartReview = useCallback(async () => {
        setPageError("");
        try {
            if (reviewMode === "full") {
                const paragraphs = await getDocumentParagraphs();
                if (paragraphs.length === 0) {
                    setPageError("文档为空或无可读取的文本内容");
                    return;
                }
                paragraphsRef.current = paragraphs;
                startReview(settings, paragraphs);
            } else {
                const paragraphs = await getSelectedParagraphs();
                if (paragraphs.length === 0) {
                    setPageError("未选中文本，请先在文档中选中要评审的内容");
                    return;
                }
                // For selection review, merge all selected paragraphs into one single block
                const mergedText = paragraphs.map((p) => p.text).join("\n");
                const singleParagraph = [{ index: 0, text: mergedText }];
                paragraphsRef.current = singleParagraph;
                startReview(settings, singleParagraph);
            }
        } catch (err) {
            setPageError((err as Error).message || "读取文档失败");
        }
    }, [reviewMode, settings, startReview]);

    const handleGenerateComment = useCallback(async () => {
        setPageError("");
        try {
            // Use stored paragraphs if available, otherwise re-read
            let paragraphs = paragraphsRef.current;
            if (paragraphs.length === 0) {
                paragraphs = await getDocumentParagraphs();
                if (paragraphs.length === 0) {
                    setPageError("文档为空或无可读取的文本内容");
                    return;
                }
                paragraphsRef.current = paragraphs;
            }
            startCommentGeneration(settings, paragraphs);
        } catch (err) {
            setPageError((err as Error).message || "读取文档失败");
        }
    }, [settings, startCommentGeneration]);

    const handleApplyAll = useCallback(async () => {
        setApplyStatus("正在插入批注...");
        try {
            const items = comments.map((c) => ({
                targetText: c.target_text,
                comment: `[${c.severity.toUpperCase()}] ${c.comment}`,
            }));
            const result = await insertComments(items);
            setApplyStatus(`完成，${result.success} 条已插入，${result.failed} 条跳过`);
            setTimeout(() => setApplyStatus(""), 4000);
        } catch (err) {
            setApplyStatus(`失败: ${(err as Error).message}`);
        }
    }, [comments]);

    const handleExport = useCallback(async () => {
        try {
            const title = await getDocumentTitle();
            await exportReviewReport(
                comments,
                summary,
                title,
                settings.backendUrl,
            );
        } catch (err) {
            setPageError(`导出失败: ${(err as Error).message}`);
        }
    }, [comments, summary, settings.backendUrl]);

    const handleExportComment = useCallback(async () => {
        try {
            const title = await getDocumentTitle();
            await exportCommentReport(
                overallComment,
                title,
                settings.backendUrl,
            );
        } catch (err) {
            setPageError(`导出评语失败: ${(err as Error).message}`);
        }
    }, [overallComment, settings.backendUrl]);

    const handleScrollToComment = useCallback(async (comment: ReviewComment) => {
        try {
            await scrollToText(comment.target_text);
        } catch {
            // Silently fail if location not found
        }
    }, []);

    const handleLocateComment = useCallback(async (comment: ReviewComment) => {
        try {
            await insertComment(
                comment.target_text,
                `[${comment.severity.toUpperCase()}] ${comment.comment}`,
            );
        } catch {
            // Silently fail if location not found
        }
    }, []);

    const handleModeChange = useCallback((mode: ReviewMode) => {
        setReviewMode(mode);
        setPageError("");
        clearResults();
    }, [clearResults]);

    // Not configured - show prompt
    if (!isConfigured) {
        return (
            <div className="flex flex-col h-full bg-zinc-50 relative">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30"></div>

                <div className="flex flex-col items-center justify-center h-full p-8 text-center gap-6 relative z-10">
                    <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-zinc-200 flex items-center justify-center p-3">
                        <svg className="w-full h-full text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-xl font-semibold text-zinc-900 tracking-tight">配置 API</h2>
                        <p className="text-sm text-zinc-500 max-w-[250px] leading-relaxed mx-auto">
                            在使用珍格格进行智能审查前，请先配置大语言模型及接口地址。
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

    const isBusy = isStreaming || isGeneratingComment;

    return (
        <div className="flex flex-col h-full bg-zinc-50">
            {/* Action Bar (Top Section) */}
            <div className="flex flex-col gap-4 p-3 bg-white border-b border-zinc-200/60 shadow-sm z-10">
                {/* Mode Toggles */}
                <div className="flex bg-zinc-100 p-1 rounded-lg w-fit mx-auto border border-zinc-200/50 relative">
                    {/* Animated background pill */}
                    <motion.div
                        className="absolute inset-0.5 w-[calc(50%-2px)] bg-white rounded-md shadow-sm border border-zinc-200"
                        layoutId="mode-pill"
                        initial={false}
                        animate={{
                            x: reviewMode === "full" ? 0 : "100%",
                        }}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                    <button
                        className={`relative z-10 flex items-center gap-1 px-4 py-1.5 text-sm font-medium transition-colors ${reviewMode === "full" ? "text-zinc-900" : "text-zinc-500 hover:text-zinc-700"} rounded-md`}
                        onClick={() => handleModeChange("full")}
                        disabled={isBusy}
                    >
                        <DocumentSearchRegular className="text-[16px]" />
                        <span>全文评审</span>
                    </button>
                    <button
                        className={`relative z-10 flex items-center gap-1 px-4 py-1.5 text-sm font-medium transition-colors ${reviewMode === "selection" ? "text-zinc-900" : "text-zinc-500 hover:text-zinc-700"} rounded-md`}
                        onClick={() => handleModeChange("selection")}
                        disabled={isBusy}
                    >
                        <MultiselectLtrRegular className="text-[16px]" />
                        <span>片段评审</span>
                    </button>
                </div>

                <div className="w-full h-px bg-gradient-to-r from-transparent via-zinc-200 to-transparent"></div>

                {/* Main Action Area */}
                <div className="flex flex-col items-center gap-4">
                    <AnimatePresence mode="popLayout">
                        {reviewMode === "selection" && !isBusy && (
                            <motion.div
                                initial={{ opacity: 0, height: 0, scale: 0.95 }}
                                animate={{ opacity: 1, height: "auto", scale: 1 }}
                                exit={{ opacity: 0, height: 0, scale: 0.95 }}
                                className="w-full"
                            >
                                {selectedPreview ? (
                                    <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200/80 w-full overflow-hidden shadow-sm">
                                        <div className="text-[10px] font-semibold text-zinc-400 tracking-wider uppercase mb-1.5">当前选中</div>
                                        <div className="text-[12px] text-zinc-600 line-clamp-3 leading-relaxed break-all">
                                            "{selectedPreview}"
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center gap-2 p-4 bg-zinc-50/50 rounded-xl border border-dashed border-zinc-300 w-full text-zinc-400">
                                        <TextEffectsRegular className="text-lg" />
                                        <span className="text-xs font-medium">请在文档中划选文本</span>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {!isBusy ? (
                        <Button
                            appearance="primary"
                            icon={<PlayRegular />}
                            onClick={handleStartReview}
                            disabled={reviewMode === "selection" && !selectedPreview}
                            className={`w-full max-w-[200px] shadow-sm tracking-tight transition-all duration-300 ${(!selectedPreview && reviewMode === "selection") ? "" : "hover:shadow-blue-500/20 shadow-blue-500/10 active:scale-[0.98]"}`}
                        >
                            开始智能分析
                        </Button>
                    ) : (
                        <div className="flex flex-col items-center gap-3 w-full animate-in fade-in zoom-in duration-300">
                            <div className="relative flex items-center justify-center">
                                <span className="absolute inline-flex h-full w-full rounded-full bg-blue-400/30 animate-ping"></span>
                                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-zinc-200 z-10">
                                    <div className="w-4 h-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
                                </div>
                            </div>
                            <Button
                                appearance="subtle"
                                onClick={isGeneratingComment ? cancelCommentGeneration : cancelReview}
                                className="text-zinc-500 hover:text-red-500 transition-colors"
                            >
                                <StopRegular className="mr-2" /> 取消处理
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Results Toolbar */}
            <AnimatePresence>
                {comments.length > 0 && !isStreaming && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-wrap items-center gap-2 px-4 py-3 bg-white border-b border-zinc-200 shadow-[0_4px_12px_-4px_rgba(0,0,0,0.02)] z-[5]"
                    >
                        <Button
                            appearance="subtle"
                            icon={<CommentRegular />}
                            onClick={handleApplyAll}
                            size="small"
                            disabled={isGeneratingComment}
                            className="bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-100"
                        >
                            插入批注
                        </Button>
                        <Button
                            appearance="subtle"
                            icon={<ArrowDownloadRegular />}
                            onClick={handleExport}
                            size="small"
                            disabled={isGeneratingComment}
                            className="bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-zinc-700"
                        >
                            导出意见
                        </Button>
                        <Button
                            appearance="subtle"
                            icon={<NoteRegular />}
                            onClick={handleGenerateComment}
                            size="small"
                            disabled={isGeneratingComment}
                            className="bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-zinc-700"
                        >
                            生成总评
                        </Button>
                        <div className="flex-1" />
                        <Button
                            appearance="transparent"
                            icon={<DismissRegular />}
                            onClick={clearResults}
                            size="small"
                            disabled={isGeneratingComment}
                            className="text-zinc-400 hover:text-zinc-600 min-w-0 px-2"
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Error Area */}
            <AnimatePresence>
                {(pageError || streamError) && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="px-4 pt-4"
                    >
                        <MessageBar intent="error" className="rounded-xl shadow-sm border border-red-200/50">
                            <MessageBarBody>
                                <MessageBarTitle>运行错误</MessageBarTitle>
                                {pageError || streamError}
                            </MessageBarBody>
                        </MessageBar>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Content scroll area */}
            <div className="flex-1 overflow-y-auto w-full pt-2">
                <StreamingTextPanel
                    rawText={rawText}
                    isStreaming={isStreaming}
                    progress={progress}
                />
                <StreamingView
                    comments={comments}
                    isStreaming={isStreaming}
                    progress={progress}
                    summary={summary}
                    onClickComment={handleScrollToComment}
                    onLocateComment={handleLocateComment}
                />

                {/* Overall comment streaming */}
                <AnimatePresence>
                    {isGeneratingComment && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mx-4 mb-6 p-5 bg-white rounded-2xl border border-zinc-200 shadow-sm"
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center">
                                    <NoteRegular className="text-blue-500" />
                                </div>
                                <h3 className="text-sm font-semibold text-zinc-800">构建全文评语中...</h3>
                            </div>
                            <ProgressBar shape="rounded" thickness="medium" className="mb-4" color="brand" />
                            <div className="text-[13px] leading-[1.8] text-zinc-600 whitespace-pre-wrap">
                                {overallComment}
                                <span className="inline-block w-1.5 h-3.5 bg-blue-500 ml-1 align-text-bottom animate-pulse" />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Overall comment static */}
                <AnimatePresence>
                    {overallComment && !isGeneratingComment && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mx-4 mb-6 p-6 bg-rose-50 rounded-2xl border border-zinc-200 shadow-sm relative overflow-hidden group"
                        >
                            {/* Decorative line */}

                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-semibold text-zinc-800 flex items-center gap-2">
                                    <NoteRegular className="text-blue-500" /> 全文评级与总结
                                </h3>
                                <Button
                                    appearance="transparent"
                                    icon={<ArrowDownloadRegular />}
                                    onClick={handleExportComment}
                                    size="small"
                                    className="text-zinc-500 hover:bg-zinc-100"
                                >
                                    导出文档
                                </Button>
                            </div>
                            <div className="text-[13px] leading-[1.8] text-zinc-700 whitespace-pre-wrap break-words">
                                {overallComment}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Status bar */}
            {(applyStatus || comments.length > 0) && (
                <div className="flex justify-between items-center px-4 py-2 bg-zinc-100/80 border-t border-zinc-200/80 text-[10px] text-zinc-400 tracking-wider backdrop-blur-md">
                    <span>{applyStatus || `${comments.length} 条意见`}</span>
                    <span>{settings.modelName}模型</span>
                </div>
            )}
        </div>
    );
}
