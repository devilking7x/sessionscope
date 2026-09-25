import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CompareView } from "./components/CompareView";
import { GlobalSearch } from "./components/GlobalSearch";
import { SessionCard } from "./components/SessionCard";
import { SettingsView } from "./components/SettingsView";
import { TranscriptView } from "./components/TranscriptView";
import { Btn, EmptyState } from "./components/ui";
import { downloadMarkdown } from "./lib/exportMd";
import { computeStats, DEFAULT_PRICING, loadPricing, loadSessions, savePricing, saveSessions } from "./lib/pricing";
import { buildSampleSessions } from "./lib/samples";
import { newSessionId, parseSessionJsonl } from "./lib/parser";
import type { PricingEntry, Session } from "./types";

type Tab = "sessions" | "compare" | "settings";

export default function App() {
  const [sessions, setSessions] = useState<Session[]>(() => loadSessions());
  const [pricing, setPricing] = useState<PricingEntry[]>(() => loadPricing());
  const [tab, setTab] = useState<Tab>("sessions");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [searchSeed, setSearchSeed] = useState("");
  const [dragging, setDragging] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const dragDepth = useRef(0);

  useEffect(() => {
    const ok = saveSessions(sessions);
    if (!ok) setNotice("⚠️ Browser storage is full — sessions won't persist until you delete some.");
  }, [sessions]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(t);
  }, [notice]);

  const importFiles = useCallback(async (files: FileList | File[]) => {
    const list = [...files].filter((f) => /\.jsonl?$/i.test(f.name) || f.type === "application/x-ndjson");
    if (list.length === 0) {
      setNotice("Drop .jsonl transcript files to import them.");
      return;
    }
    const imported: Session[] = [];
    for (const f of list) {
      try {
        const text = await f.text();
        const parsed = parseSessionJsonl(text);
        if (parsed.messages.length === 0) {
          setNotice(`"${f.name}" had no readable messages — skipped.`);
          continue;
        }
        imported.push({
          id: newSessionId(),
          name: f.name.replace(/\.jsonl?$/i, "").replace(/[-_]+/g, " ").trim() || f.name,
          source: "upload",
          createdAt: new Date().toISOString(),
          messages: parsed.messages,
          skippedLines: parsed.skippedLines,
          totalLines: parsed.totalLines,
        });
      } catch {
        setNotice(`Could not read "${f.name}".`);
      }
    }
    if (imported.length > 0) {
      setSessions((s) => [...imported, ...s]);
      setNotice(`✅ Imported ${imported.length} session${imported.length === 1 ? "" : "s"}.`);
    }
  }, []);

  // Global drag & drop
  useEffect(() => {
    const onDragEnter = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes("Files")) {
        dragDepth.current += 1;
        setDragging(true);
      }
    };
    const onDragLeave = () => {
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (dragDepth.current === 0) setDragging(false);
    };
    const onDragOver = (e: DragEvent) => e.preventDefault();
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      dragDepth.current = 0;
      setDragging(false);
      if (e.dataTransfer?.files.length) void importFiles(e.dataTransfer.files);
    };
    window.addEventListener("dragenter", onDragEnter);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onDragEnter);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("drop", onDrop);
    };
  }, [importFiles]);

  const loadSamples = useCallback(() => {
    setSessions((s) => {
      const existing = new Set(s.map((x) => x.name));
      const fresh = buildSampleSessions().filter((x) => !existing.has(x.name));
      if (fresh.length === 0) setNotice("Sample sessions are already loaded.");
      else setNotice(`✅ Loaded ${fresh.length} sample sessions.`);
      return [...fresh, ...s];
    });
  }, []);

  const deleteSession = useCallback((id: string) => {
    setSessions((s) => s.filter((x) => x.id !== id));
    setActiveId((a) => (a === id ? null : a));
  }, []);

  const exportSession = useCallback(
    (s: Session) => downloadMarkdown(s, computeStats(s, pricing)),
    [pricing],
  );

  const active = sessions.find((s) => s.id === activeId) ?? null;
  const tabs: { id: Tab; label: string; icon: string }[] = useMemo(
    () => [
      { id: "sessions", label: "Sessions", icon: "📚" },
      { id: "compare", label: "Compare", icon: "⚖️" },
      { id: "settings", label: "Settings", icon: "⚙️" },
    ],
    [],
  );

  return (
    <div className="min-h-screen bg-[#0b0e14] text-zinc-200">
      {/* ambient glow */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_-10%,rgba(245,179,1,0.08),transparent)]" />

      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0b0e14]/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber-400/30 bg-amber-400/10 text-lg">
              ◈
            </div>
            <div>
              <h1 className="text-[17px] font-bold tracking-tight text-zinc-50">
                Session<span className="text-amber-400">Scope</span>
              </h1>
              <p className="text-[11px] text-zinc-500">AI session transcript explorer</p>
            </div>
          </div>
          <nav className="ml-4 flex items-center gap-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => { setTab(t.id); if (t.id !== "sessions") setActiveId(null); }}
                className={`cursor-pointer rounded-xl px-3.5 py-2 text-sm font-medium transition-colors ${
                  tab === t.id && !active
                    ? "bg-amber-400/15 text-amber-200"
                    : "text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200"
                }`}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".jsonl,.json"
                multiple
                className="hidden"
                onChange={(e) => { if (e.target.files) void importFiles(e.target.files); e.target.value = ""; }}
              />
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-sm text-zinc-200 transition-colors hover:bg-white/[0.08]">
                📥 Import .jsonl
              </span>
            </label>
            <Btn variant="primary" onClick={loadSamples}>⚡ Load sample data</Btn>
          </div>
        </div>
      </header>

      {notice && (
        <div className="fixed bottom-6 left-1/2 z-30 -translate-x-1/2 rounded-xl border border-amber-400/30 bg-zinc-900/95 px-4 py-2.5 text-sm text-amber-200 shadow-2xl backdrop-blur">
          {notice}
        </div>
      )}

      {dragging && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="flex h-[70vh] w-[80vw] max-w-3xl flex-col items-center justify-center rounded-3xl border-2 border-dashed border-amber-400/60 bg-amber-400/[0.05]">
            <div className="text-5xl">📥</div>
            <p className="mt-4 text-xl font-semibold text-amber-200">Drop .jsonl transcripts to import</p>
            <p className="mt-1 text-sm text-zinc-400">Malformed lines are skipped — the parser never crashes.</p>
          </div>
        </div>
      )}

      <main className="relative mx-auto max-w-6xl px-4 py-8">
        {active ? (
          <TranscriptView
            session={active}
            pricing={pricing}
            highlight={searchSeed}
            onBack={() => { setActiveId(null); setSearchSeed(""); }}
          />
        ) : tab === "sessions" ? (
          <>
            <div className="mb-6">
              <h2 className="text-2xl font-bold tracking-tight text-zinc-50">
                Your sessions <span className="text-amber-400">({sessions.length})</span>
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                Drag & drop Claude-style <code className="font-mono text-zinc-400">.jsonl</code> transcripts anywhere —
                everything stays in your browser.
              </p>
            </div>
            <GlobalSearch
              sessions={sessions}
              onJump={(id, q) => { setActiveId(id); setSearchSeed(q); }}
            />
            {sessions.length === 0 ? (
              <EmptyState
                icon="📭"
                title="No sessions yet"
                body="Drop a .jsonl transcript anywhere on this page, or load the bundled samples to explore the demo instantly."
                action={<Btn variant="primary" onClick={loadSamples}>⚡ Load sample data</Btn>}
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {sessions.map((s) => (
                  <SessionCard
                    key={s.id}
                    session={s}
                    pricing={pricing}
                    onOpen={() => setActiveId(s.id)}
                    onDelete={() => deleteSession(s.id)}
                    onExport={() => exportSession(s)}
                  />
                ))}
              </div>
            )}
          </>
        ) : tab === "compare" ? (
          <CompareView sessions={sessions} pricing={pricing} />
        ) : (
          <SettingsView
            pricing={pricing}
            onSave={(p) => { setPricing(p); savePricing(p); }}
            onResetPricing={() => { setPricing(DEFAULT_PRICING); savePricing(DEFAULT_PRICING); }}
            onLoadSamples={loadSamples}
            onClearAll={() => setSessions([])}
            sessionCount={sessions.length}
          />
        )}
      </main>

      <footer className="relative border-t border-white/5 py-6 text-center text-xs text-zinc-600">
        SessionScope · 100% local-first — your transcripts never leave this browser ·{" "}
        <a className="text-amber-400/70 hover:text-amber-300" href="https://github.com/devilking7x/sessionscope">
          GitHub
        </a>
      </footer>
    </div>
  );
}
