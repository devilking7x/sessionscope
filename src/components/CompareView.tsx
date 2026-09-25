import { useMemo, useState } from "react";
import { fmtCost, fmtInt, fmtTokens } from "../lib/format";
import { computeStats } from "../lib/pricing";
import type { PricingEntry, Session } from "../types";
import { Card, EmptyState } from "./ui";

function RoleBar({ label, a, b, color }: { label: string; a: number; b: number; color: string }) {
  const max = Math.max(a, b, 1);
  return (
    <div className="py-1.5">
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-zinc-400">{label}</span>
        <span className="text-zinc-500">{a} vs {b}</span>
      </div>
      <div className="space-y-1">
        <div className="h-1.5 rounded-full bg-white/5">
          <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${(a / max) * 100}%` }} />
        </div>
        <div className="h-1.5 rounded-full bg-white/5">
          <div className="h-1.5 rounded-full bg-zinc-600" style={{ width: `${(b / max) * 100}%` }} />
        </div>
      </div>
    </div>
  );
}

export function CompareView({ sessions, pricing }: { sessions: Session[]; pricing: PricingEntry[] }) {
  const [aId, setAId] = useState(sessions[0]?.id ?? "");
  const [bId, setBId] = useState(sessions[1]?.id ?? "");
  const a = sessions.find((s) => s.id === aId);
  const b = sessions.find((s) => s.id === bId);
  const statsA = useMemo(() => (a ? computeStats(a, pricing) : null), [a, pricing]);
  const statsB = useMemo(() => (b ? computeStats(b, pricing) : null), [b, pricing]);

  if (sessions.length < 2) {
    return (
      <EmptyState
        icon="⚖️"
        title="Need at least 2 sessions"
        body="Load sample data or drop in more .jsonl transcripts to compare sessions side by side."
      />
    );
  }

  const rows: { label: string; fa: (s: NonNullable<typeof statsA>) => string; fb: (s: NonNullable<typeof statsB>) => string; better?: "a" | "b" }[] = [
    { label: "Messages", fa: (s) => fmtInt(s.messages), fb: (s) => fmtInt(s.messages) },
    { label: "Est. tokens", fa: (s) => `~${fmtTokens(s.totalTokens)}`, fb: (s) => `~${fmtTokens(s.totalTokens)}`, better: "b" },
    { label: "Est. cost", fa: (s) => fmtCost(s.totalCost), fb: (s) => fmtCost(s.totalCost), better: "b" },
    { label: "Input / output", fa: (s) => `${fmtTokens(s.inputTokens)} / ${fmtTokens(s.outputTokens)}`, fb: (s) => `${fmtTokens(s.inputTokens)} / ${fmtTokens(s.outputTokens)}` },
    { label: "User ⇄ assistant", fa: (s) => `${s.user} ⇄ ${s.assistant}`, fb: (s) => `${s.user} ⇄ ${s.assistant}` },
    { label: "Tool messages", fa: (s) => fmtInt(s.tool), fb: (s) => fmtInt(s.tool) },
    { label: "Model", fa: (s) => s.model ?? "—", fb: (s) => s.model ?? "—" },
  ];

  const picker = (value: string, set: (v: string) => void, exclude: string) => (
    <select
      value={value}
      onChange={(e) => set(e.target.value)}
      className="w-full cursor-pointer rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/50"
    >
      {sessions
        .filter((s) => s.id !== exclude)
        .map((s) => (
          <option key={s.id} value={s.id} className="bg-zinc-900">
            {s.name}
          </option>
        ))}
    </select>
  );

  return (
    <div>
      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        <div>
          <div className="mb-1.5 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-amber-300">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-400" /> Session A
          </div>
          {picker(aId, setAId, bId)}
        </div>
        <div>
          <div className="mb-1.5 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-zinc-400">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-zinc-500" /> Session B
          </div>
          {picker(bId, setBId, aId)}
        </div>
      </div>

      {a && b && statsA && statsB && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-5">
            <h3 className="mb-4 truncate text-base font-semibold text-zinc-100">{a.name}</h3>
            <div className="divide-y divide-white/5">
              {rows.map((r) => (
                <div key={r.label} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="text-zinc-500">{r.label}</span>
                  <span className={`font-semibold ${r.better === "a" && betterVal(statsA, statsB, r.label) ? "text-emerald-300" : "text-zinc-100"}`}>
                    {r.fa(statsA)}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 border-t border-white/5 pt-4">
              <RoleBar label="User" a={statsA.user} b={statsB.user} color="bg-sky-400" />
              <RoleBar label="Assistant" a={statsA.assistant} b={statsB.assistant} color="bg-violet-400" />
              <RoleBar label="Tool" a={statsA.tool} b={statsB.tool} color="bg-emerald-400" />
            </div>
          </Card>
          <Card className="p-5">
            <h3 className="mb-4 truncate text-base font-semibold text-zinc-100">{b.name}</h3>
            <div className="divide-y divide-white/5">
              {rows.map((r) => (
                <div key={r.label} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="text-zinc-500">{r.label}</span>
                  <span className={`font-semibold ${r.better === "b" && betterVal(statsB, statsA, r.label) ? "text-emerald-300" : "text-zinc-100"}`}>
                    {r.fb(statsB)}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 border-t border-white/5 pt-4">
              <p className="mb-1 text-xs text-zinc-500">Cost per message</p>
              <p className="text-2xl font-bold text-amber-300">
                {fmtCost(statsB.totalCost / Math.max(1, statsB.messages))}
                <span className="text-xs font-normal text-zinc-500"> avg / msg</span>
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                A: {fmtCost(statsA.totalCost / Math.max(1, statsA.messages))} avg / msg
              </p>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function betterVal(self: { totalTokens: number; totalCost: number }, other: { totalTokens: number; totalCost: number }, label: string): boolean {
  if (label === "Est. tokens") return self.totalTokens < other.totalTokens;
  if (label === "Est. cost") return self.totalCost < other.totalCost;
  return false;
}
