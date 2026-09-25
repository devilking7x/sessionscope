import { useMemo, useState } from "react";
import { excerpt } from "../lib/format";
import type { Session } from "../types";
import { Card, EmptyState } from "./ui";

export interface SearchHit {
  sessionId: string;
  sessionName: string;
  messageIndex: number;
  role: string;
  snippet: string;
}

export function searchAll(sessions: Session[], query: string): SearchHit[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const hits: SearchHit[] = [];
  for (const s of sessions) {
    for (const m of s.messages) {
      const hay = `${m.text} ${m.toolCalls.join(" ")}`.toLowerCase();
      const at = hay.indexOf(q);
      if (at >= 0) {
        const start = Math.max(0, at - 70);
        hits.push({
          sessionId: s.id,
          sessionName: s.name,
          messageIndex: m.index,
          role: m.role,
          snippet: (start > 0 ? "…" : "") + excerpt(m.text.slice(start), 170),
        });
        if (hits.length >= 100) return hits;
      }
    }
  }
  return hits;
}

export function GlobalSearch({
  sessions,
  onJump,
}: {
  sessions: Session[];
  onJump: (sessionId: string, query: string) => void;
}) {
  const [query, setQuery] = useState("");
  const hits = useMemo(() => searchAll(sessions, query), [sessions, query]);

  if (sessions.length === 0) return null;

  return (
    <Card className="mb-6 p-4">
      <div className="flex items-center gap-3">
        <span className="text-lg">🔎</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search across all ${sessions.length} session${sessions.length === 1 ? "" : "s"}…`}
          className="flex-1 rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-amber-400/50"
        />
        {query.trim().length >= 2 && (
          <span className="shrink-0 text-xs text-zinc-500">
            {hits.length} hit{hits.length === 1 ? "" : "s"}
          </span>
        )}
      </div>
      {query.trim().length >= 2 && (
        <div className="mt-3 max-h-72 space-y-1.5 overflow-y-auto pr-1">
          {hits.length === 0 && (
            <p className="py-3 text-center text-sm text-zinc-500">No matches found.</p>
          )}
          {hits.map((h, i) => (
            <button
              key={`${h.sessionId}-${h.messageIndex}-${i}`}
              onClick={() => onJump(h.sessionId, query.trim())}
              className="block w-full cursor-pointer rounded-xl border border-white/5 bg-white/[0.02] px-3.5 py-2.5 text-left transition-colors hover:border-amber-400/25 hover:bg-amber-400/[0.06]"
            >
              <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-amber-300">{h.sessionName}</span>
                <span className="text-zinc-600">·</span>
                <span className="text-zinc-500 capitalize">{h.role}</span>
                <span className="text-zinc-600">·</span>
                <span className="text-zinc-500">msg #{h.messageIndex + 1}</span>
              </div>
              <p className="mt-1 text-[13px] leading-relaxed text-zinc-300">{h.snippet}</p>
            </button>
          ))}
        </div>
      )}
      {query.trim().length >= 2 && hits.length === 0 && (
        <EmptyState icon="🕳️" title="Nothing found" body="Try a different keyword." />
      )}
    </Card>
  );
}
