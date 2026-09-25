export type MessageRole = "user" | "assistant" | "system" | "tool";

export interface ParsedMessage {
  id: string;
  index: number;
  role: MessageRole;
  text: string;
  toolCalls: string[];
  model?: string;
  timestamp?: string;
}

export interface Session {
  id: string;
  name: string;
  source: "upload" | "sample";
  createdAt: string;
  messages: ParsedMessage[];
  skippedLines: number;
  totalLines: number;
  modelHint?: string;
}

export interface SessionStats {
  messages: number;
  user: number;
  assistant: number;
  tool: number;
  system: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  inputCost: number;
  outputCost: number;
  totalCost: number;
  firstTs?: string;
  lastTs?: string;
  model?: string;
}

export interface PricingEntry {
  model: string;
  inputPerM: number;
  outputPerM: number;
}
