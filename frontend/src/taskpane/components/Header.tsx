/**
 * Header component with navigation between Review and Settings pages.
 */

import {
    Tab,
    TabList,
} from "@fluentui/react-components";
import {
    DocumentSearchRegular,
    SettingsRegular,
} from "@fluentui/react-icons";

interface HeaderProps {
    activePage: "review" | "settings";
    onPageChange: (page: "review" | "settings") => void;
}

export function Header({ activePage, onPageChange }: HeaderProps) {
    return (
        <div className="flex items-center justify-between px-5 py-3.5 bg-white border-b border-zinc-200/60 sticky top-0 z-10">
            <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-gradient-to-br from-zinc-800 to-zinc-950 flex items-center justify-center shadow-sm">
                    <DocumentSearchRegular className="text-white text-sm" />
                </div>
                <span className="text-[16px] font-semibold text-zinc-900 tracking-tight font-sans">
                    <span className="text-zinc-400 font-normal ml-0.5" style={{ fontFamily: 'Inter, sans-serif' }}>ThesisCheck</span>
                </span>
            </div>

            <TabList
                className="min-w-0"
                selectedValue={activePage}
                onTabSelect={(_, data) => onPageChange(data.value as "review" | "settings")}
                size="small"
                appearance="subtle"
            >
                <Tab value="review" icon={<DocumentSearchRegular />}>
                    <span className="text-[13px] font-medium tracking-tight">评审</span>
                </Tab>
                <Tab value="settings" icon={<SettingsRegular />}>
                    <span className="text-[13px] font-medium tracking-tight">设置</span>
                </Tab>
            </TabList>
        </div>
    );
}
