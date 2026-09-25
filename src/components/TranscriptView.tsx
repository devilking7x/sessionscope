import { useMemo, useState } from "react";
import { downloadMarkdown } from "../lib/exportMd";
import { fmtCost, fmtDate, fmtInt, fmtTokens } from "../lib/format";
import { computeStats } from "../lib/pricing";
import type { MessageRole, PricingEntry, Session } from "../types";
import { Badge, Btn, Card, RichText } from "./ui";

const ROLE_META: Record<MessageRole, { label: string; dot: string; tone: "blue" | "gold" | "green" | "zinc" }> = {
  user: { label: "User", dot: "bg-sky-400", tone: "blue" },
  assistant: { label: "Assistant", dot: "bg-violet-400", tone: "gold" },
  tool: { label: "Tool", dot: "bg-emerald-400", tone: "green" },
  system: { label: "System", dot: "bg-zinc-500", tone: "zinc" },
};

export function TranscriptView({
  session,
  pricing,
  highlight,
  onBack,
}: {
  session: Session;
  pricing: PricingEntry[];
  highlight?: string;
  onBack: () => void;
}) {
  const [query, setQuery] = useState(highlight ?? "");
  const [roleFilter, setRoleFilter] = useState<MessageRole | "all">("all");
  const stats = useMemo(() => computeStats(session, pricing), [session, pricing]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return session.messages.filter((m) => {
      if (roleFilter !== "all" && m.role !== roleFilter) return false;
      if (q && !m.text.toLowerCase().includes(q) && !m.toolCalls.some((t) => t.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [session, query, roleFilter]);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Btn onClick={onBack}>← All sessions</Btn>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-xl font-bold text-zinc-50">{session.name}</h2>
          <p className="text-xs text-zinc-500">
            {fmtInt(stats.messages)} messages · ~{fmtTokens(stats.totalTokens)} tokens · {fmtCost(stats.totalCost)} est.
            {stats.firstTs && ` · ${fmtDate(stats.firstTs)}`}
          </p>
        </div>
        <Btn variant="primary" onClick={() => downloadMarkdown(session, stats)}>⤓ Export .md</Btn>
      </div>

      <Card className="mb-5 flex flex-wrap items-center gap-3 p-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search within this transcript…"
          className="min-w-[220px] flex-1 rounded-xl border border-white/10 bg-black/40 px-3.5 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-amber-400/50"
        />
        <div className="flex items-center gap-1.5">
          {(["all", "user", "assistant", "tool", "system"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`cursor-pointer rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                roleFilter === r
                  ? "bg-amber-400/20 text-amber-200"
                  : "text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-300"
              }`}
            >
              {r === "all" ? "All" : ROLE_META[r].label}
            </button>
          ))}
        </div>
        <span className="text-xs text-zinc-500">{fmtInt(filtered.length)} shown</span>
      </Card>

      <div className="space-y-3">
        {filtered.map((m) => {
          const meta = ROLE_META[m.role];
          const isUser = m.role === "user";
          return (
            <div key={m.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl border p-4 text-sm text-zinc-200 ${
                  isUser
                    ? "border-sky-400/20 bg-sky-400/[0.07]"
                    : m.role === "assistant"
                      ? "border-white/10 bg-white/[0.03]"
                      : m.role === "tool"
                        ? "border-emerald-400/15 bg-emerald-400/[0.04]"
                        : "border-white/5 bg-black/30"
                }`}
              >
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className={`inline-block h-2 w-2 rounded-full ${meta.dot}`} />
                  <Badge tone={meta.tone}>{meta.label}</Badge>
                  {m.toolCalls.length > 0 && (
                    <span className="text-[11px] text-zinc-500">
                      🔧 {m.toolCalls.join(", ")}
                    </span>
                  )}
                  {m.timestamp && <span className="ml-auto text-[11px] text-zinc-600">{fmtDate(m.timestamp)}</span>}
                </div>
                <RichText text={m.text} />
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="py-10 text-center text-sm text-zinc-500">No messages match your filters.</p>
        )}
      </div>
    </div>
  );
}
