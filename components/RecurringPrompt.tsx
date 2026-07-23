"use client";

import { Repeat, Check, X } from "lucide-react";
import { type Recurring } from "@/lib/types";

export interface PendingRecurring {
  rule: Recurring;
  dates: string[];
}

/**
 * Shown on the dashboard when non-auto recurring rules have charges due.
 * The user confirms (posts them) or skips (advances the rule without posting).
 */
export function RecurringPrompt({
  pending,
  currency,
  onConfirm,
  onSkip,
}: {
  pending: PendingRecurring[];
  currency: string;
  onConfirm: (p: PendingRecurring) => void;
  onSkip: (p: PendingRecurring) => void;
}) {
  if (pending.length === 0) return null;
  const fmt = (n: number) =>
    new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
  const dateLabel = (s: string) =>
    new Date(s + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });

  return (
    <div className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] p-4">
      <div className="mb-3 flex items-center gap-2 text-amber-300">
        <Repeat className="h-4 w-4" />
        <span className="text-xs font-semibold uppercase tracking-wide">Recurring charges due</span>
      </div>

      <div className="space-y-3">
        {pending.map((p) => (
          <div key={p.rule.id} className="rounded-xl border border-neutral-900 bg-neutral-950 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-neutral-100">
                  {p.rule.description || p.rule.category}
                </p>
                <p className="text-xs text-neutral-500">
                  {p.dates.length > 1 ? `${p.dates.length} × ` : ""}
                  {fmt(Number(p.rule.amount))} · {p.rule.category} · due {dateLabel(p.dates[p.dates.length - 1])}
                </p>
              </div>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-amber-300">
                {fmt(Number(p.rule.amount) * p.dates.length)}
              </span>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => onConfirm(p)}
                className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-500 text-xs font-semibold text-black active:scale-[0.98]"
              >
                <Check className="h-4 w-4" /> Add {p.dates.length > 1 ? "all" : ""}
              </button>
              <button
                onClick={() => onSkip(p)}
                className="flex h-9 items-center justify-center gap-1.5 rounded-lg border border-neutral-800 px-3 text-xs font-semibold text-neutral-400 active:scale-95"
              >
                <X className="h-4 w-4" /> Skip
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
