/** "More Tools" tab — a config-driven launcher for secondary tools that no
 *  longer live directly in the bottom navigation. New tools are added by
 *  appending to MORE_TOOLS; each renders full-screen with a Back button. */
import { useState } from "react";
import CaavTab from "../caav/CaavTab";

interface ToolDef {
  key: string;
  title: string;
  desc: string;
  tone: "green" | "blue" | "teal" | "gray";
  render: (onBack: () => void) => JSX.Element;
}

const MORE_TOOLS: ToolDef[] = [
  {
    key: "caav",
    title: "CAAV Exam",
    desc: "Ôn thi gia hạn CAAV — học bank, test và thi thử",
    tone: "teal",
    // CaavTab manages its own internal navigation; the Back button here
    // returns to the More list.
    render: () => <CaavTab />,
  },
];

export default function MoreTab() {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const active = MORE_TOOLS.find((t) => t.key === openKey) ?? null;

  if (active) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setOpenKey(null)}
          className="mb-3 flex min-h-[40px] items-center gap-1 text-sm font-semibold text-gray-400 hover:text-white"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          More Tools
        </button>
        {active.render(() => setOpenKey(null))}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-bold text-white">More Tools</h2>
        <p className="mt-0.5 text-xs text-gray-400">Thêm công cụ hỗ trợ cho thợ máy</p>
      </div>
      <div className="space-y-3">
        {MORE_TOOLS.map((tool) => (
          <ToolCard key={tool.key} tool={tool} onClick={() => setOpenKey(tool.key)} />
        ))}
      </div>
    </div>
  );
}

function ToolCard({ tool, onClick }: { tool: ToolDef; onClick: () => void }) {
  const ring =
    tool.tone === "green"
      ? "hover:border-bamboo-green/70"
      : tool.tone === "blue"
        ? "hover:border-bamboo-blue/70"
        : tool.tone === "teal"
          ? "hover:border-teal-accent/70"
          : "hover:border-line";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between gap-3 rounded-2xl border border-line-soft bg-ink-800 p-4 text-left transition-colors ${ring}`}
    >
      <div className="min-w-0">
        <div className="font-bold text-white">{tool.title}</div>
        <div className="mt-1 text-xs leading-relaxed text-gray-400">{tool.desc}</div>
      </div>
      <svg className="shrink-0 text-gray-500" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M9 18l6-6-6-6" />
      </svg>
    </button>
  );
}
