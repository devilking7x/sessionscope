import type { MessageRole, ParsedMessage } from "../types";

/** Rough heuristic: ~4 characters per token. */
export const CHARS_PER_TOKEN = 4;

function blockToText(block: unknown): string {
  if (typeof block === "string") return block;
  if (block && typeof block === "object") {
    const b = block as Record<string, unknown>;
    if (typeof b.text === "string") return b.text;
    if (b.type === "tool_use") {
      const input =
        b.input !== undefined ? JSON.stringify(b.input).slice(0, 400) : "";
      return `[tool: ${String(b.name ?? "unknown")}]${input ? ` ${input}` : ""}`;
    }
    if (b.type === "tool_result") {
      const c = b.content;
      const s =
        typeof c === "string"
          ? c
          : Array.isArray(c)
            ? c.map(blockToText).join("\n")
            : "";
      return `[tool result]${s ? ` ${s.slice(0, 600)}` : ""}`;
    }
    if (typeof b.content === "string") return b.content;
    if (Array.isArray(b.content)) return b.content.map(blockToText).join("\n");
  }
  return "";
}

/** Extract plain text from the many content shapes transcripts use. */
export function contentToText(content: unknown): string {
  if (content === null || content === undefined) return "";
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content.map(blockToText).filter(Boolean).join("\n");
  }
  if (typeof content === "object") {
    const o = content as Record<string, unknown>;
    if (typeof o.text === "string") return o.text;
    return "";
  }
  return "";
}

function toolNames(content: unknown): string[] {
  if (!Array.isArray(content)) return [];
  const names: string[] = [];
  for (const block of content) {
    if (block && typeof block === "object") {
      const b = block as Record<string, unknown>;
      if (b.type === "tool_use" && typeof b.name === "string") names.push(b.name);
    }
  }
  return names;
}

function normalizeRole(obj: Record<string, unknown>): MessageRole | null {
  const msg = obj.message as Record<string, unknown> | undefined;
  const candidates = [
    msg?.role,
    obj.role,
    obj.type,
    obj.sender,
  ];
  for (const c of candidates) {
    if (typeof c !== "string") continue;
    const v = c.toLowerCase();
    if (v === "user" || v === "human") return "user";
    if (v === "assistant" || v === "ai" || v === "bot") return "assistant";
    if (v === "system") return "system";
    if (v === "tool" || v === "tool_result" || v === "function") return "tool";
  }
  return null;
}

function parseLine(line: string, index: number): ParsedMessage | null {
  let obj: unknown;
  try {
    obj = JSON.parse(line);
  } catch {
    return null;
  }
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return null;
  const o = obj as Record<string, unknown>;

  const role = normalizeRole(o);
  if (!role) return null;

  const msg = (o.message ?? {}) as Record<string, unknown>;
  const content = o.message !== undefined ? msg.content : o.content;
  const text = contentToText(content);
  if (!text.trim()) return null;

  const ts =
    typeof o.timestamp === "string"
      ? o.timestamp
      : typeof o.created_at === "string"
        ? o.created_at
        : undefined;
  const model =
    typeof msg.model === "string"
      ? msg.model
      : typeof o.model === "string"
        ? o.model
        : undefined;

  return {
    id: `${index}`,
    index,
    role,
    text: text.trim(),
    toolCalls: toolNames(msg.content ?? o.content),
    model,
    timestamp: ts,
  };
}

export interface ParseResult {
  messages: ParsedMessage[];
  skippedLines: number;
  totalLines: number;
}

export function parseSessionJsonl(raw: string): ParseResult {
  const lines = raw.split(/\r?\n/);
  const messages: ParsedMessage[] = [];
  let skipped = 0;
  let total = 0;
  for (const line of lines) {
    if (!line.trim()) continue;
    total += 1;
    const m = parseLine(line, messages.length);
    if (m) messages.push(m);
    else skipped += 1;
  }
  return { messages, skippedLines: skipped, totalLines: total };
}

export function estimateTokens(text: string): number {
  return Math.max(1, Math.round(text.length / CHARS_PER_TOKEN));
}

let idCounter = 0;
export function newSessionId(): string {
  idCounter += 1;
  return `s_${Date.now().toString(36)}_${idCounter.toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}
