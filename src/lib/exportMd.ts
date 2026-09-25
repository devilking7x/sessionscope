import { fmtCost, fmtDate, fmtInt } from "./format";
import type { Session, SessionStats } from "../types";

export function sessionToMarkdown(session: Session, stats: SessionStats): string {
  const lines: string[] = [];
  lines.push(`# ${session.name}`);
  lines.push("");
  lines.push(`- **Messages:** ${fmtInt(stats.messages)} (user ${stats.user} · assistant ${stats.assistant} · tool ${stats.tool})`);
  lines.push(`- **Tokens:** ~${fmtInt(stats.totalTokens)} (in ${fmtInt(stats.inputTokens)} / out ${fmtInt(stats.outputTokens)})`);
  lines.push(`- **Est. cost:** ${fmtCost(stats.totalCost)}`);
  if (stats.firstTs) lines.push(`- **Span:** ${fmtDate(stats.firstTs)} → ${fmtDate(stats.lastTs)}`);
  if (stats.model) lines.push(`- **Model:** ${stats.model}`);
  lines.push(`- **Exported:** ${new Date().toISOString()} (estimates via SessionScope)`);
  lines.push("");
  lines.push("---");
  lines.push("");

  for (const m of session.messages) {
    const label = m.role === "user" ? "🧑 User" : m.role === "assistant" ? "🤖 Assistant" : m.role === "tool" ? "🔧 Tool" : "⚙️ System";
    lines.push(`## ${label}${m.timestamp ? ` · ${m.timestamp}` : ""}`);
    lines.push("");
    if (m.toolCalls.length > 0) {
      lines.push(`> tools: ${m.toolCalls.map((t) => `\`${t}\``).join(", ")}`);
      lines.push("");
    }
    lines.push(m.text);
    lines.push("");
  }
  return lines.join("\n");
}

export function downloadMarkdown(session: Session, stats: SessionStats): void {
  const md = sessionToMarkdown(session, stats);
  const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const safe = session.name.replace(/[^a-z0-9-_]+/gi, "-").slice(0, 60) || "session";
  a.href = url;
  a.download = `${safe}.md`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
