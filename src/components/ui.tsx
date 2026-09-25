import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm ${className}`}>
      {children}
    </div>
  );
}

export function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">{label}</span>
      <span className="mt-0.5 text-lg font-semibold text-zinc-100">{value}</span>
      {sub && <span className="text-xs text-zinc-500">{sub}</span>}
    </div>
  );
}

export function Badge({ children, tone = "zinc" }: { children: ReactNode; tone?: "zinc" | "gold" | "green" | "red" | "blue" }) {
  const tones: Record<string, string> = {
    zinc: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30",
    gold: "bg-amber-400/15 text-amber-300 border-amber-400/30",
    green: "bg-emerald-400/15 text-emerald-300 border-emerald-400/30",
    red: "bg-rose-400/15 text-rose-300 border-rose-400/30",
    blue: "bg-sky-400/15 text-sky-300 border-sky-400/30",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function Btn({
  children,
  onClick,
  variant = "ghost",
  className = "",
  title,
}: {
  children: ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  variant?: "primary" | "ghost" | "danger";
  className?: string;
  title?: string;
}) {
  const variants: Record<string, string> = {
    primary:
      "bg-amber-400 text-zinc-950 font-semibold hover:bg-amber-300 shadow-[0_0_24px_rgba(245,179,1,0.25)]",
    ghost: "border border-white/10 bg-white/[0.04] text-zinc-200 hover:bg-white/[0.08]",
    danger: "border border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20",
  };
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm transition-colors cursor-pointer ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

/** Renders message text with ``` fenced code blocks and `inline code` styled. */
export function RichText({ text }: { text: string }) {
  const parts = text.split(/```/);
  return (
    <div className="space-y-2">
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <pre
            key={i}
            className="overflow-x-auto rounded-xl border border-white/10 bg-black/50 p-3 font-mono text-[12.5px] leading-relaxed text-amber-100/90"
          >
            {part.replace(/^[a-zA-Z]+\n/, "")}
          </pre>
        ) : (
          <p key={i} className="whitespace-pre-wrap break-words leading-relaxed">
            {renderInlineCode(part)}
          </p>
        ),
      )}
    </div>
  );
}

function renderInlineCode(text: string): ReactNode {
  const parts = text.split(/(`[^`]+`)/g);
  return parts.map((p, i) =>
    p.startsWith("`") && p.endsWith("`") && p.length > 2 ? (
      <code key={i} className="rounded-md bg-amber-400/10 px-1.5 py-0.5 font-mono text-[0.92em] text-amber-200">
        {p.slice(1, -1)}
      </code>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: string;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-16 text-center">
      <div className="text-4xl">{icon}</div>
      <h3 className="mt-4 text-lg font-semibold text-zinc-100">{title}</h3>
      <p className="mt-1.5 max-w-md text-sm text-zinc-400">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
