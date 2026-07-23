"use client";

import { useMemo } from "react";
import { PieChart } from "lucide-react";
import { CATEGORIES, type Category, type Transaction } from "@/lib/types";
import { CATEGORY_COLORS } from "@/components/categoryIcons";

/**
 * Donut breakdown of a month's spending by category. Pure SVG (stroke-arc
 * ring) plus a legend with amount + share. Renders an empty state when there
 * is nothing to show.
 */
export function CategoryChart({
  txns,
  month,
  currency,
}: {
  txns: Transaction[];
  month: string;
  currency: string;
}) {
  const { slices, total } = useMemo(() => {
    const sums = Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<Category, number>;
    for (const t of txns) {
      if (t.occurred_on.slice(0, 7) !== month.slice(0, 7)) continue;
      sums[t.category] += Number(t.amount);
    }
    const total = CATEGORIES.reduce((s, c) => s + sums[c], 0);
    const slices = CATEGORIES.map((c) => ({ category: c, amount: sums[c] }))
      .filter((s) => s.amount > 0)
      .sort((a, b) => b.amount - a.amount);
    return { slices, total };
  }, [txns, month]);

  const fmt = (n: number) =>
    new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(n);

  const R = 52;
  const C = 2 * Math.PI * R;
  let offset = 0;

  return (
    <div className="rounded-2xl border border-neutral-900 bg-neutral-950 p-4">
      <div className="mb-4 flex items-center gap-2">
        <PieChart className="h-4 w-4 text-neutral-400" />
        <h3 className="text-sm font-semibold text-neutral-400">Where it went</h3>
      </div>

      {total === 0 ? (
        <p className="py-6 text-center text-sm text-neutral-600">No spending logged this month yet.</p>
      ) : (
        <div className="flex items-center gap-5">
          <div className="relative h-32 w-32 shrink-0">
            <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
              <circle cx="64" cy="64" r={R} fill="none" stroke="#1a1a1a" strokeWidth="16" />
              {slices.map((s) => {
                const frac = s.amount / total;
                const dash = frac * C;
                const el = (
                  <circle
                    key={s.category}
                    cx="64"
                    cy="64"
                    r={R}
                    fill="none"
                    stroke={CATEGORY_COLORS[s.category]}
                    strokeWidth="16"
                    strokeDasharray={`${dash} ${C - dash}`}
                    strokeDashoffset={-offset}
                  />
                );
                offset += dash;
                return el;
              })}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[10px] uppercase tracking-wide text-neutral-500">Total</span>
              <span className="text-sm font-bold tabular-nums">{fmt(total)}</span>
            </div>
          </div>

          <ul className="min-w-0 flex-1 space-y-1.5">
            {slices.map((s) => (
              <li key={s.category} className="flex items-center gap-2 text-sm">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: CATEGORY_COLORS[s.category] }} />
                <span className="flex-1 truncate text-neutral-300">{s.category}</span>
                <span className="tabular-nums text-neutral-400">{Math.round((s.amount / total) * 100)}%</span>
                <span className="w-16 text-right tabular-nums text-neutral-500">{fmt(s.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
