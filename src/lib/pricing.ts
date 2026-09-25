import { estimateTokens } from "./parser";
import type { PricingEntry, Session, SessionStats } from "../types";

export const PRICING_STORAGE_KEY = "sessionscope.pricing.v1";
export const SESSIONS_STORAGE_KEY = "sessionscope.sessions.v1";

export const DEFAULT_PRICING: PricingEntry[] = [
  { model: "claude-opus-4-6", inputPerM: 15, outputPerM: 75 },
  { model: "claude-sonnet-4-5", inputPerM: 3, outputPerM: 15 },
  { model: "claude-haiku-4-5", inputPerM: 1, outputPerM: 5 },
  { model: "gpt-5", inputPerM: 1.25, outputPerM: 10 },
  { model: "gpt-5-mini", inputPerM: 0.25, outputPerM: 2 },
  { model: "default", inputPerM: 3, outputPerM: 15 },
];

export function loadPricing(): PricingEntry[] {
  try {
    const raw = localStorage.getItem(PRICING_STORAGE_KEY);
    if (!raw) return DEFAULT_PRICING;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_PRICING;
    return parsed.filter(
      (p): p is PricingEntry =>
        p && typeof p.model === "string" && isFinite(p.inputPerM) && isFinite(p.outputPerM),
    );
  } catch {
    return DEFAULT_PRICING;
  }
}

export function savePricing(pricing: PricingEntry[]): void {
  try {
    localStorage.setItem(PRICING_STORAGE_KEY, JSON.stringify(pricing));
  } catch {
    /* quota — ignore, pricing just won't persist */
  }
}

function rateFor(model: string | undefined, pricing: PricingEntry[]): PricingEntry {
  const fallback = pricing.find((p) => p.model === "default") ?? pricing[0] ?? DEFAULT_PRICING[0];
  if (!model) return fallback;
  const lower = model.toLowerCase();
  const exact = pricing.find((p) => p.model.toLowerCase() === lower);
  if (exact) return exact;
  const partial = pricing.find(
    (p) => p.model !== "default" && (lower.includes(p.model.toLowerCase()) || p.model.toLowerCase().includes(lower)),
  );
  return partial ?? fallback;
}

export function computeStats(session: Session, pricing: PricingEntry[]): SessionStats {
  let user = 0,
    assistant = 0,
    tool = 0,
    system = 0;
  let inputTokens = 0,
    outputTokens = 0;
  let inputCost = 0,
    outputCost = 0;
  let firstTs: string | undefined;
  let lastTs: string | undefined;
  const models = new Set<string>();

  for (const m of session.messages) {
    if (m.role === "user") user += 1;
    else if (m.role === "assistant") assistant += 1;
    else if (m.role === "tool") tool += 1;
    else system += 1;

    const tokens = estimateTokens(m.text);
    const rate = rateFor(m.model ?? session.modelHint, pricing);
    if (m.role === "assistant") {
      outputTokens += tokens;
      outputCost += (tokens / 1_000_000) * rate.outputPerM;
    } else {
      inputTokens += tokens;
      inputCost += (tokens / 1_000_000) * rate.inputPerM;
    }
    if (m.model) models.add(m.model);
    if (m.timestamp) {
      if (!firstTs || m.timestamp < firstTs) firstTs = m.timestamp;
      if (!lastTs || m.timestamp > lastTs) lastTs = m.timestamp;
    }
  }

  return {
    messages: session.messages.length,
    user,
    assistant,
    tool,
    system,
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    inputCost,
    outputCost,
    totalCost: inputCost + outputCost,
    firstTs,
    lastTs,
    model: models.size > 0 ? [...models].join(", ") : session.modelHint,
  };
}

export function loadSessions(): Session[] {
  try {
    const raw = localStorage.getItem(SESSIONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Returns false when storage quota was exceeded. */
export function saveSessions(sessions: Session[]): boolean {
  try {
    localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
    return true;
  } catch {
    return false;
  }
}
