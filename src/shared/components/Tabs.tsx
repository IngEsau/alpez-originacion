import { cx } from "../lib/formatters";

export interface TabItem {
  id: string;
  label: string;
}

export function Tabs({
  tabs,
  activeTab,
  onChange,
}: {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tab: string) => void;
}) {
  return (
    <div className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={cx(
            "h-9 whitespace-nowrap rounded-lg px-3 text-sm font-semibold transition",
            activeTab === tab.id ? "bg-[#0F4C81] text-white" : "text-slate-600 hover:bg-slate-100",
          )}
          type="button"
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
