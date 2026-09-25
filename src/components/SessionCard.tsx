import { useState } from "react";
import { fmtCost, fmtInt, fmtTokens, timeAgo } from "../lib/format";
import { computeStats } from "../lib/pricing";
import type { PricingEntry, Session } from "../types";
import { Badge, Card } from "./ui";

export function SessionCard({
  session,
  pricing,
  onOpen,
  onDelete,
  onExport,
}: {
  session: Session;
  pricing: PricingEntry[];
  onOpen: () => void;
  onDelete: () => void;
  onExport: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const stats = computeStats(session, pricing);

  return (
    <Card className="group flex flex-col p-5 transition-all hover:border-amber-400/30 hover:bg-white/[0.05]">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3
            onClick={onOpen}
            className="cursor-pointer truncate text-[15px] font-semibold text-zinc-100 hover:text-amber-300"
            title={session.name}
          >
            {session.name}
          </h3>
          <p className="mt-0.5 text-xs text-zinc-500">{timeAgo(session.createdAt)}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Badge tone={session.source === "sample" ? "blue" : "gold"}>
            {session.source === "sample" ? "sample" : "upload"}
          </Badge>
          {session.skippedLines > 0 && (
            <Badge tone="zinc" >
              {session.skippedLines} skipped
            </Badge>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-zinc-500">Messages</div>
          <div className="text-lg font-semibold text-zinc-100">{fmtInt(stats.messages)}</div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-wider text-zinc-500">Tokens</div>
          <div className="text-lg font-semibold text-zinc-100">~{fmtTokens(stats.totalTokens)}</div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-wider text-zinc-500">Est. cost</div>
          <div className="text-lg font-semibold text-amber-300">{fmtCost(stats.totalCost)}</div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
        <span className="inline-flex items-center gap-1"><Dot className="bg-sky-400" />{stats.user} user</span>
        <span className="inline-flex items-center gap-1"><Dot className="bg-violet-400" />{stats.assistant} asst</span>
        {stats.tool > 0 && <span className="inline-flex items-center gap-1"><Dot className="bg-emerald-400" />{stats.tool} tool</span>}
      </div>

      <div className="mt-4 flex items-center gap-2 border-t border-white/5 pt-3">
        <button
          onClick={onOpen}
          className="flex-1 cursor-pointer rounded-lg bg-white/[0.05] px-3 py-1.5 text-sm font-medium text-zinc-200 transition-colors hover:bg-amber-400/20 hover:text-amber-200"
        >
          Open transcript →
        </button>
        <button
          onClick={onExport}
          title="Export as Markdown"
          className="cursor-pointer rounded-lg border border-white/10 px-2.5 py-1.5 text-sm text-zinc-400 transition-colors hover:bg-white/[0.08] hover:text-zinc-200"
        >
          ⤓
        </button>
        {confirm ? (
          <button
            onClick={onDelete}
            className="cursor-pointer rounded-lg border border-rose-500/40 bg-rose-500/15 px-2.5 py-1.5 text-sm text-rose-300"
          >
            Sure?
          </button>
        ) : (
          <button
            onClick={() => setConfirm(true)}
            onBlur={() => setTimeout(() => setConfirm(false), 1500)}
            title="Delete session"
            className="cursor-pointer rounded-lg border border-white/10 px-2.5 py-1.5 text-sm text-zinc-500 transition-colors hover:border-rose-500/40 hover:text-rose-300"
          >
            ✕
          </button>
        )}
      </div>
    </Card>
  );
}

function Dot({ className = "" }: { className?: string }) {
  return <span className={`inline-block h-1.5 w-1.5 rounded-full ${className}`} />;
}
