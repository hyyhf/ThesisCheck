/**
 * Streaming view component - displays review comments as they arrive via SSE.
 */

import {
    tokens,
    Badge,
    ProgressBar,
    Text,
    Button,
    Tooltip,
} from "@fluentui/react-components";
import {
    ErrorCircleRegular,
    WarningRegular,
    LightbulbRegular,
    LocationRegular,
    DocumentSearchRegular,
} from "@fluentui/react-icons";
import { motion, AnimatePresence } from "framer-motion";
import type { ReviewComment } from "../services/api";
import type { StreamingProgress } from "../hooks/useStreaming";
import { cn } from "../utils";

const SEVERITY_CONFIG = {
    error: {
        label: "错误",
        icon: <ErrorCircleRegular />,
        className: "bg-red-50 text-red-600 border border-red-200 shadow-[0_4px_12px_-4px_rgba(220,38,38,0.1)]",
        badgeColor: "danger" as const,
    },
    warning: {
        label: "警告",
        icon: <WarningRegular />,
        className: "bg-amber-50 text-amber-600 border border-amber-200 shadow-[0_4px_12px_-4px_rgba(217,119,6,0.1)]",
        badgeColor: "warning" as const,
    },
    suggestion: {
        label: "建议",
        icon: <LightbulbRegular />,
        className: "bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-[0_4px_12px_-4px_rgba(5,150,105,0.1)]",
        badgeColor: "success" as const,
    },
};

interface StreamingViewProps {
    comments: ReviewComment[];
    isStreaming: boolean;
    progress: StreamingProgress | null;
    summary: string;
    onClickComment: (comment: ReviewComment) => void;
    onLocateComment: (comment: ReviewComment) => void;
}

export function StreamingView({
    comments,
    isStreaming,
    progress,
    summary,
    onClickComment,
    onLocateComment,
}: StreamingViewProps) {
    const errorCount = comments.filter((c) => c.severity === "error").length;
    const warningCount = comments.filter((c) => c.severity === "warning").length;
    const suggestionCount = comments.filter((c) => c.severity === "suggestion").length;

    return (
        <div className="flex flex-col gap-4 px-4 pb-4">

            {/* Stats row */}
            <AnimatePresence>
                {comments.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex gap-2 py-2 flex-wrap"
                    >
                        {errorCount > 0 && (
                            <Badge appearance="filled" color="danger" size="small" >
                                {errorCount} 错误
                            </Badge>
                        )}
                        {warningCount > 0 && (
                            <Badge appearance="filled" color="warning" size="small" >
                                {warningCount} 警告
                            </Badge>
                        )}
                        {suggestionCount > 0 && (
                            <Badge appearance="filled" color="success" size="small" >
                                {suggestionCount} 建议
                            </Badge>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Empty state */}
            {!isStreaming && comments.length === 0 && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center py-16 px-4 text-center gap-4 bg-zinc-50/50 rounded-2xl border border-zinc-200/50 border-dashed"
                >
                    <div className="p-4 bg-white rounded-full shadow-sm">
                        <DocumentSearchRegular className="text-4xl text-zinc-400" />
                    </div>
                    <div>
                        <Text className="text-zinc-600 block mb-1 font-medium">
                            暂无评审结果
                        </Text>
                        <Text className="text-zinc-400 text-xs">
                            点击"全文评审"或选中文本后点击"选中评审"
                        </Text>
                    </div>
                </motion.div>
            )}

            {/* Comment list */}
            <div className="flex flex-col gap-3">
                <AnimatePresence mode="popLayout">
                    {comments.map((comment, idx) => {
                        const config = SEVERITY_CONFIG[comment.severity] || SEVERITY_CONFIG.suggestion;
                        return (
                            <motion.div
                                layout
                                layoutId={`comment-${idx}`}
                                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                                transition={{
                                    type: "spring",
                                    stiffness: 400,
                                    damping: 30,
                                    delay: Math.min(idx * 0.05, 0.5) // Cap delay at 0.5s to avoid feeling slow
                                }}
                                key={idx}
                                className={cn(
                                    "p-4 rounded-xl cursor-pointer group hover:-translate-y-0.5 transition-transform duration-200",
                                    "bg-white border border-zinc-200 shadow-sm hover:shadow-md"
                                )}
                                onClick={() => onClickComment(comment)}
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <span className={cn(
                                        "inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-md",
                                        "shadow-sm transition-colors",
                                        config.className
                                    )}>
                                        {config.icon}
                                        {config.label}
                                    </span>
                                    <Tooltip content="定位到文档" relationship="label">
                                        <Button
                                            className="opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-50 hover:bg-zinc-100 border-none text-zinc-500 min-w-0 px-2 h-7"
                                            appearance="outline"
                                            size="small"
                                            icon={<LocationRegular className="text-sm" />}
                                            onClick={(e) => { e.stopPropagation(); onLocateComment(comment); }}
                                        />
                                    </Tooltip>
                                </div>

                                <blockquote className="text-xs text-zinc-500 italic px-3 py-2 bg-zinc-50 rounded-lg mb-3 leading-relaxed border-l-1 border-zinc-300 break-words">
                                    "{comment.target_text}"
                                </blockquote>

                                <div className="text-[12px] text-zinc-800 leading-relaxed">
                                    {comment.comment}
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>

            {/* Summary */}
            <AnimatePresence>
                {summary && !isStreaming && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ type: "spring", delay: 0.3 }}
                        className="p-5 bg-gradient-to-br from-zinc-50 to-white border border-zinc-200 rounded-2xl shadow-sm mt-4 relative overflow-hidden group"
                    >
                        {/* Shimmer effect for premium feel */}
                        <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent group-hover:animate-[shimmer_1.5s_infinite] pointer-events-none" />

                        <div className="flex items-center gap-2 mb-3">
                            <LightbulbRegular className="text-emerald-500 text-xl" />
                            <Text className="font-semibold text-zinc-800 text-sm tracking-tight">总体评价</Text>
                        </div>
                        <Text className="text-[13px] text-zinc-600 leading-relaxed block">{summary}</Text>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
