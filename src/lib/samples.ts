import { newSessionId, parseSessionJsonl } from "./parser";
import type { Session } from "../types";

/**
 * Sample sessions are authored as realistic Claude-style JSONL transcripts and
 * run through the real parser, so the demo exercises the same code path as uploads.
 */

interface LineSpec {
  role: "user" | "assistant" | "system";
  text: string;
  tools?: { name: string; input: string }[];
  model?: string;
  ts: string;
}

function jsonl(spec: LineSpec[]): string {
  return spec
    .map((s) => {
      const content: unknown[] =
        s.role === "assistant" && s.tools?.length
          ? [
              { type: "text", text: s.text },
              ...s.tools.map((t) => ({
                type: "tool_use",
                id: `toolu_${Math.random().toString(36).slice(2, 10)}`,
                name: t.name,
                input: JSON.parse(t.input),
              })),
            ]
          : [{ type: "text", text: s.text }];
      return JSON.stringify({
        type: s.role,
        timestamp: s.ts,
        message: { role: s.role === "system" ? "system" : s.role, model: s.model, content },
        ...(s.role === "system" ? { isSidechain: false } : {}),
      });
    })
    .join("\n");
}

const M = "claude-sonnet-4-5";

const S1: LineSpec[] = [
  { role: "user", ts: "2026-09-20T09:12:03Z", text: "Users are getting logged out randomly after ~15 minutes. The JWT should last 24h. Can you help me debug?", model: M },
  { role: "assistant", ts: "2026-09-20T09:12:41Z", model: M, text: "I'll investigate the session handling. Let me look at the auth middleware and token issuance code first.", tools: [{ name: "Grep", input: `{"pattern":"expiresIn|jwt.sign","path":"src/auth"}` }] },
  { role: "assistant", ts: "2026-09-20T09:13:02Z", model: M, text: "Found it — `signToken()` uses `expiresIn: \"15m\"` in `src/auth/tokens.ts`, but the refresh-token rotation endpoint never gets called because the client only refreshes on 401, and the API returns 403 for expired tokens. Two fixes needed:\n\n1. Bump access-token TTL to match the documented 24h (or implement sliding refresh)\n2. Make the client treat 403-with-`token_expired` as a refresh trigger\n\nWant me to patch both?", tools: [{ name: "Read", input: `{"file_path":"src/auth/tokens.ts"}` }] },
  { role: "user", ts: "2026-09-20T09:14:19Z", text: "Yes, patch both. Keep the access token at 1h and add sliding refresh — that's more secure than 24h.", model: M },
  { role: "assistant", ts: "2026-09-20T09:15:55Z", model: M, text: "Done. Changes:\n\n- `src/auth/tokens.ts` → `expiresIn: \"1h\"`, added `issueRefreshToken()` with rotation\n- `src/middleware.ts` → 403 now carries `code: \"token_expired\"`\n- `web/lib/api-client.ts` → refresh on 403 `token_expired`, single-flight dedupe so parallel requests don't stampede\n\nTests: added `auth.refresh.test.ts` covering rotation, reuse detection (old refresh token is revoked), and the dedupe path. 14/14 passing.", tools: [{ name: "Edit", input: `{"file_path":"src/auth/tokens.ts"}` }, { name: "Bash", input: `{"command":"pnpm test auth.refresh"}` }] },
  { role: "user", ts: "2026-09-20T09:17:02Z", text: "Reuse detection — what happens if a refresh token is used twice?", model: M },
  { role: "assistant", ts: "2026-09-20T09:17:38Z", model: M, text: "If a rotated refresh token is presented again, we treat it as token theft: the whole token family is revoked and the user is logged out everywhere with a security email. That's the standard rotation-reuse pattern (same as Auth0). The test `revokes family on reuse` covers it." },
  { role: "user", ts: "2026-09-20T09:18:11Z", text: "Perfect, ship it. Open a PR with a summary.", model: M },
  { role: "assistant", ts: "2026-09-20T09:19:44Z", model: M, text: "PR opened: **fix(auth): sliding refresh + 1h access tokens** (#482)\n\nSummary, test plan, and the security notes on reuse detection are in the description. CI is green.", tools: [{ name: "Bash", input: `{"command":"gh pr create --title \\"fix(auth): sliding refresh + 1h access tokens\\""}` }] },
];

const S2: LineSpec[] = [
  { role: "user", ts: "2026-09-22T14:02:11Z", text: "I need to refactor the billing module. It's 2,400 lines in one file and every change breaks something. Plan first, don't write code yet.", model: M },
  { role: "assistant", ts: "2026-09-22T14:03:30Z", model: M, text: "Let me map the module's actual responsibilities before proposing a split.", tools: [{ name: "Read", input: `{"file_path":"src/billing/index.ts","limit":120}` }, { name: "Bash", input: `{"command":"wc -l src/billing/*.ts && grep -c \\"export\\" src/billing/index.ts"}` }] },
  { role: "assistant", ts: "2026-09-22T14:04:52Z", model: M, text: "Here's the plan — the file is really 5 modules wearing a trench coat:\n\n| New module | Responsibility | ~LOC |\n|---|---|---|\n| `billing/invoices.ts` | invoice CRUD + PDF rendering | 520 |\n| `billing/subscriptions.ts` | plan changes, trials, proration | 610 |\n| `billing/webhooks.ts` | Stripe event handling, idempotency | 380 |\n| `billing/dunning.ts` | retries, grace periods, emails | 290 |\n| `billing/index.ts` | thin facade re-exporting the public API | 120 |\n\nKey risk: `calculateProration()` is called from 6 places with subtly different rounding. I'll extract it into `billing/proration.ts` with the existing behavior pinned by characterization tests *before* moving anything.\n\nSteps: 1) characterization tests → 2) extract proration → 3) split modules one at a time, running the suite after each → 4) delete the monolith. Shout if the split looks wrong.", tools: [{ name: "Grep", input: `{"pattern":"calculateProration","path":"src"}` }] },
  { role: "user", ts: "2026-09-22T14:06:03Z", text: "Plan looks good. One concern: webhooks must stay idempotent during the move. How are you guaranteeing that?", model: M },
  { role: "assistant", ts: "2026-09-22T14:07:21Z", model: M, text: "Idempotency lives in the `webhook_events` table (unique on `stripe_event_id`), not in the file layout — the split doesn't touch that path's logic, only moves it. I'll add a regression test that replays the same Stripe event twice and asserts a single invoice, run it before and after the move. If the count differs, we stop." },
  { role: "user", ts: "2026-09-22T14:08:45Z", text: "Good. Start with step 1 — characterization tests only.", model: M },
  { role: "assistant", ts: "2026-09-22T14:12:09Z", model: M, text: "Characterization tests are in: `billing/__tests__/characterization.test.ts` — 31 tests pinning current proration math, webhook dedupe, dunning schedules, and invoice numbering. All passing against the unmodified monolith. Baseline is locked; ready for step 2 whenever you are.", tools: [{ name: "Write", input: `{"file_path":"src/billing/__tests__/characterization.test.ts"}` }, { name: "Bash", input: `{"command":"pnpm test billing/__tests__/characterization"}` }] },
];

const S3: LineSpec[] = [
  { role: "system", ts: "2026-09-24T10:00:00Z", text: "Session started — project: sessionscope, cwd: ~/workspace/sessionscope", model: M },
  { role: "user", ts: "2026-09-24T10:00:22Z", text: "Help me plan the Q4 roadmap for SessionScope. Keep it to 3 big bets.", model: M },
  { role: "assistant", ts: "2026-09-24T10:01:05Z", model: M, text: "Three bets for Q4:\n\n**1. Token forensics** — per-message cost waterfall + anomaly flags (\"this one tool call burned 40% of the session\"). This is the thing people screenshot.\n\n**2. Prompt library from history** — detect repeated successful task patterns across sessions and turn them into reusable prompts. Your transcript corpus becomes an asset.\n\n**3. Team rollups** — aggregate stats across sessions by project/tag with a weekly digest. Moves you from personal tool to team tool.\n\nSuggested order: 1 → 3 → 2. Forensics drives sharing, sharing drives teams, teams generate the corpus that makes the library valuable." },
  { role: "user", ts: "2026-09-24T10:02:40Z", text: "I like 1 and 3. For #2, what's the simplest version that isn't embarrassing?", model: M },
  { role: "assistant", ts: "2026-09-24T10:03:18Z", model: M, text: "Simplest honest v1: **\"Top tasks\" list.** Cluster sessions by the first user message's intent (cheap embedding or even keyword overlap), show the 10 most repeated task shapes with their success rate and median cost. One screen, no generation, no magic claims. If a cluster has 15+ sessions, *then* you offer \"draft a reusable prompt from these\" — the frequency is the justification." },
  { role: "user", ts: "2026-09-24T10:04:02Z", text: "Sold. Write it up as a one-pager I can share.", model: M },
  { role: "assistant", ts: "2026-09-24T10:05:31Z", model: M, text: "# SessionScope Q4 Roadmap — one-pager\n\n**Bet 1 — Token forensics (Oct):** per-message cost waterfall, anomaly flags, shareable screenshots.\n**Bet 2 — Team rollups (Nov):** project tags, weekly digest email, per-member cost attribution.\n**Bet 3 — Top tasks (Dec):** repeated-task detection → draft reusable prompts from high-frequency clusters.\n\nSuccess metric: 30% of active users share at least one forensics screenshot by end of Q4." },
];

function buildSample(name: string, specs: LineSpec[], modelHint: string): Session {
  const raw = jsonl(specs);
  // A couple of intentionally malformed lines to prove the parser is tolerant.
  const noisy = `${raw}\n{not valid json\n{"type":"assistant","message":{"role":"assistant","content":[]}}\n`;
  const parsed = parseSessionJsonl(noisy);
  return {
    id: newSessionId(),
    name,
    source: "sample",
    createdAt: specs[0]?.ts ?? new Date().toISOString(),
    messages: parsed.messages,
    skippedLines: parsed.skippedLines,
    totalLines: parsed.totalLines,
    modelHint,
  };
}

export function buildSampleSessions(): Session[] {
  return [
    buildSample("debug — jwt session expiry", S1, M),
    buildSample("refactor — billing module split", S2, M),
    buildSample("planning — q4 roadmap", S3, M),
  ];
}
