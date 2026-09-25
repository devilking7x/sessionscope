import { useState } from "react";
import type { PricingEntry } from "../types";
import { Badge, Btn, Card } from "./ui";

export function SettingsView({
  pricing,
  onSave,
  onResetPricing,
  onLoadSamples,
  onClearAll,
  sessionCount,
}: {
  pricing: PricingEntry[];
  onSave: (p: PricingEntry[]) => void;
  onResetPricing: () => void;
  onLoadSamples: () => void;
  onClearAll: () => void;
  sessionCount: number;
}) {
  const [rows, setRows] = useState<PricingEntry[]>(pricing);
  const [dirty, setDirty] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const update = (i: number, patch: Partial<PricingEntry>) => {
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
    setDirty(true);
  };
  const add = () => {
    setRows((rs) => [...rs, { model: "my-model", inputPerM: 1, outputPerM: 3 }]);
    setDirty(true);
  };
  const remove = (i: number) => {
    setRows((rs) => rs.filter((_, j) => j !== i));
    setDirty(true);
  };
  const save = () => {
    const cleaned = rows
      .map((r) => ({ model: r.model.trim(), inputPerM: Math.max(0, r.inputPerM || 0), outputPerM: Math.max(0, r.outputPerM || 0) }))
      .filter((r) => r.model.length > 0);
    if (!cleaned.some((r) => r.model === "default")) {
      cleaned.push({ model: "default", inputPerM: 3, outputPerM: 15 });
    }
    setRows(cleaned);
    onSave(cleaned);
    setDirty(false);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card className="p-5">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-base font-semibold text-zinc-100">💰 Model pricing</h3>
          <Badge tone="gold">USD / 1M tokens</Badge>
        </div>
        <p className="mb-4 text-sm text-zinc-500">
          Token counts are estimated from message length (~4 chars/token). Costs are computed from
          this table — edit it to match your provider's rates. The <code className="text-amber-200">default</code> row
          is used for unknown models. Saved to localStorage.
        </p>
        <div className="space-y-2">
          <div className="grid grid-cols-[1fr_110px_110px_40px] gap-2 px-1 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
            <span>Model</span><span>Input $/1M</span><span>Output $/1M</span><span />
          </div>
          {rows.map((r, i) => (
            <div key={i} className="grid grid-cols-[1fr_110px_110px_40px] items-center gap-2">
              <input
                value={r.model}
                onChange={(e) => update(i, { model: e.target.value })}
                className="rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 font-mono text-[13px] text-zinc-100 outline-none focus:border-amber-400/50"
              />
              <input
                type="number" min={0} step={0.01}
                value={r.inputPerM}
                onChange={(e) => update(i, { inputPerM: parseFloat(e.target.value) })}
                className="rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 text-[13px] text-zinc-100 outline-none focus:border-amber-400/50"
              />
              <input
                type="number" min={0} step={0.01}
                value={r.outputPerM}
                onChange={(e) => update(i, { outputPerM: parseFloat(e.target.value) })}
                className="rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 text-[13px] text-zinc-100 outline-none focus:border-amber-400/50"
              />
              <button
                onClick={() => remove(i)}
                title="Remove row"
                className="cursor-pointer rounded-lg px-2 py-1.5 text-zinc-500 hover:bg-rose-500/15 hover:text-rose-300"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Btn onClick={add}>+ Add model</Btn>
          <Btn variant="primary" onClick={save} className={dirty ? "" : "opacity-50"}>
            {dirty ? "● Save pricing" : "Saved ✓"}
          </Btn>
          <Btn onClick={() => { onResetPricing(); setRows(pricing); setDirty(false); }}>Reset defaults</Btn>
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="mb-1 text-base font-semibold text-zinc-100">📦 Demo data</h3>
        <p className="mb-4 text-sm text-zinc-500">
          Bundle of 3 realistic sample transcripts (debugging, refactor planning, roadmap) so the
          demo works with one click.
        </p>
        <Btn variant="primary" onClick={onLoadSamples}>⚡ Load sample data</Btn>
      </Card>

      <Card className="border-rose-500/20 p-5">
        <h3 className="mb-1 text-base font-semibold text-rose-300">🗑 Danger zone</h3>
        <p className="mb-4 text-sm text-zinc-500">
          {sessionCount} session{sessionCount === 1 ? "" : "s"} stored locally in your browser. This cannot be undone.
        </p>
        {confirmClear ? (
          <div className="flex gap-2">
            <Btn variant="danger" onClick={onClearAll}>Yes, delete everything</Btn>
            <Btn onClick={() => setConfirmClear(false)}>Cancel</Btn>
          </div>
        ) : (
          <Btn variant="danger" onClick={() => setConfirmClear(true)}>Clear all sessions</Btn>
        )}
      </Card>
    </div>
  );
}
