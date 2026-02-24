/**
 * Settings page - API Key, Base URL, Model Name configuration.
 */

import { useState, useCallback } from "react";
import {
    Input,
    Button,
    Label,
    MessageBar,
    MessageBarBody,
    MessageBarTitle,
    Spinner,
} from "@fluentui/react-components";
import {
    EyeRegular,
    EyeOffRegular,
    PlugConnectedRegular,
    SaveRegular,
    DeleteRegular,
    KeyRegular,
    ServerRegular,
} from "@fluentui/react-icons";
import { motion, AnimatePresence } from "framer-motion";
import type { Settings } from "../services/storage";
import { clearSettings } from "../services/storage";
import { checkHealth } from "../services/api";

interface SettingsPageProps {
    settings: Settings;
    onUpdateSettings: (partial: Partial<Settings>) => void;
    onSaveSettings: () => void;
}

export function SettingsPage({
    settings,
    onUpdateSettings,
    onSaveSettings,
}: SettingsPageProps) {
    const [showKey, setShowKey] = useState(false);
    const [testStatus, setTestStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [testMessage, setTestMessage] = useState("");

    const handleTestConnection = useCallback(async () => {
        setTestStatus("loading");
        setTestMessage("");
        try {
            const result = await checkHealth(settings);
            if (result.status === "ok") {
                setTestStatus("success");
                setTestMessage(result.message);
            } else {
                setTestStatus("error");
                setTestMessage(result.message);
            }
        } catch (err) {
            setTestStatus("error");
            setTestMessage((err as Error).message || "连接失败");
        }
    }, [settings]);

    const handleSave = useCallback(() => {
        onSaveSettings();
        setTestStatus("idle");
        setTestMessage("设置已保存");
        setTimeout(() => setTestMessage(""), 2000);
    }, [onSaveSettings]);

    const handleClear = useCallback(() => {
        clearSettings();
        onUpdateSettings({
            apiKey: "",
            baseUrl: "https://api.openai.com/v1",
            modelName: "gpt-4o",
            backendUrl: "http://localhost:8000",
        });
    }, [onUpdateSettings]);

    return (
        <div className="flex flex-col h-full bg-[#fcfcfc] overflow-y-auto">
            <div className="flex flex-col gap-6 p-6">

                {/* Header */}
                <div>
                    <h1 className="text-xl font-semibold text-zinc-900 tracking-tight">配置项</h1>
                    <p className="text-[13px] text-zinc-500 mt-1">
                        自定义 AI 引擎与本地服务端点
                    </p>
                </div>

                <AnimatePresence mode="popLayout">
                    {testStatus === "success" && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                            <MessageBar intent="success" className="rounded-xl shadow-sm border border-emerald-200/50 mb-2">
                                <MessageBarBody>
                                    <MessageBarTitle>连接成功</MessageBarTitle>
                                    {testMessage}
                                </MessageBarBody>
                            </MessageBar>
                        </motion.div>
                    )}
                    {testStatus === "error" && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                            <MessageBar intent="error" className="rounded-xl shadow-sm border border-red-200/50 mb-2">
                                <MessageBarBody>
                                    <MessageBarTitle>连接失败</MessageBarTitle>
                                    {testMessage}
                                </MessageBarBody>
                            </MessageBar>
                        </motion.div>
                    )}
                    {testStatus === "idle" && testMessage && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                            <MessageBar intent="info" className="rounded-xl shadow-sm border border-blue-200/50 mb-2">
                                <MessageBarBody>{testMessage}</MessageBarBody>
                            </MessageBar>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Section 1: LLM Settings */}
                <div className="flex flex-col gap-5 p-5 bg-white border border-zinc-200/70 rounded-2xl shadow-sm transition-all hover:shadow-md">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center">
                            <KeyRegular className="text-blue-500" />
                        </div>
                        <span className="text-sm font-semibold text-zinc-900">LLM API 配置</span>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <Label className="text-[13px] font-medium text-zinc-700" htmlFor="apiKey">
                            API 密钥
                        </Label>
                        <Input
                            id="apiKey"
                            type={showKey ? "text" : "password"}
                            value={settings.apiKey}
                            onChange={(_, data) => onUpdateSettings({ apiKey: data.value })}
                            placeholder="sk-..."
                            contentAfter={
                                <Button
                                    appearance="transparent"
                                    size="small"
                                    icon={showKey ? <EyeOffRegular /> : <EyeRegular />}
                                    onClick={() => setShowKey(!showKey)}
                                    className="text-zinc-400 hover:text-zinc-600"
                                />
                            }
                            className="bg-zinc-50 border-zinc-200"
                        />
                        <span className="text-[11px] text-zinc-400 mt-1">
                            凭据仅保存在当前设备，不会上传至云端。
                        </span>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <Label className="text-[13px] font-medium text-zinc-700" htmlFor="baseUrl">
                            接口连接地址
                        </Label>
                        <Input
                            id="baseUrl"
                            value={settings.baseUrl}
                            onChange={(_, data) => onUpdateSettings({ baseUrl: data.value })}
                            placeholder="https://api.openai.com/v1"
                            className="bg-zinc-50 border-zinc-200"
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <Label className="text-[13px] font-medium text-zinc-700" htmlFor="modelName">
                            解析模型名称
                        </Label>
                        <Input
                            id="modelName"
                            value={settings.modelName}
                            onChange={(_, data) => onUpdateSettings({ modelName: data.value })}
                            placeholder="gpt-4o"
                            className="bg-zinc-50 border-zinc-200"
                        />
                    </div>
                </div>

                {/* Section 2: Backend Settings */}
                <div className="flex flex-col gap-5 p-5 bg-white border border-zinc-200/70 rounded-2xl shadow-sm transition-all hover:shadow-md">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                            <ServerRegular className="text-indigo-500" />
                        </div>
                        <span className="text-sm font-semibold text-zinc-900">文档处理微服务</span>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <Label className="text-[13px] font-medium text-zinc-700" htmlFor="backendUrl">
                            服务端点 URL
                        </Label>
                        <Input
                            id="backendUrl"
                            value={settings.backendUrl}
                            onChange={(_, data) => onUpdateSettings({ backendUrl: data.value })}
                            placeholder="http://localhost:8000"
                            className="bg-zinc-50 border-zinc-200"
                        />
                        <span className="text-[11px] text-zinc-400 mt-1">
                            用于报告导出等后台密集型任务。
                        </span>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 pt-4 border-t border-zinc-200/50 mt-2">
                    <Button
                        appearance="primary"
                        icon={<SaveRegular />}
                        onClick={handleSave}
                        className="bg-zinc-900 text-white hover:bg-zinc-800 border-none shadow-md shadow-zinc-200 font-medium"
                    >
                        保存配置
                    </Button>
                    <Button
                        appearance="secondary"
                        icon={testStatus === "loading" ? <Spinner size="tiny" /> : <PlugConnectedRegular />}
                        onClick={handleTestConnection}
                        disabled={testStatus === "loading" || !settings.apiKey}
                        className="bg-white border-zinc-300 text-zinc-700 hover:bg-zinc-50 font-medium"
                    >
                        测试连通性
                    </Button>
                    <div className="flex-1" />
                    <Button
                        appearance="subtle"
                        icon={<DeleteRegular />}
                        onClick={handleClear}
                        className="text-red-500 hover:bg-red-50 hover:text-red-600"
                    >
                        清空
                    </Button>
                </div>

            </div>
        </div>
    );
}
