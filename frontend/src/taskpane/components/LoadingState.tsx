/**
 * Skeleton loading state component using modern framer-motion and tailwind styling.
 */

import { motion } from "framer-motion";

export function LoadingState() {
    return (
        <div className="flex flex-col gap-4 p-4">
            {[1, 2, 3].map((i) => (
                <motion.div
                    key={i}
                    className="p-5 bg-white border border-zinc-200/60 rounded-xl shadow-sm overflow-hidden relative"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1, duration: 0.4 }}
                >
                    {/* Shimmer effect overlay */}
                    <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent z-10" />

                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-5 bg-zinc-200/70 rounded-md" />
                            <div className="w-24 h-4 bg-zinc-100 rounded-md" />
                        </div>

                        <div className="space-y-2">
                            <div className="w-full h-3 bg-zinc-100 rounded-sm" />
                            <div className="w-5/6 h-3 bg-zinc-100 rounded-sm" />
                            <div className="w-3/4 h-3 bg-zinc-100 rounded-sm" />
                        </div>
                    </div>
                </motion.div>
            ))}
        </div>
    );
}
