"use client";

import { envelopeStatus } from "@/lib/budget";
import type { Category } from "@/lib/types";
import { CATEGORY_ICONS } from "./categoryIcons";

interface Props {
  category: Category;
  spent: number;
  limit: number;
  currency: string;
}

export function EnvelopeCard({ category, spent, limit, currency }: Props) {
  const { ratio, level, remaining } = envelopeStatus(spent, limit);
  const Icon = CATEGORY_ICONS[category];
  const over = spent > limit;
  const fmt = (n: number) =>
    new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(n);

  const bar =
    level === "danger" ? "bg-red-500" : level === "warn" ? "bg-amber-400" : "bg-emerald-500";
  const ring =
    level === "danger"
      ? "border-red-500/50"
      : level === "warn"
      ? "border-amber-400/40"
      : "border-neutral-800";

  return (
    <div className={`rounded-2xl border ${ring} bg-neutral-900/70 p-4`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-800">
            <Icon className="h-4 w-4 text-neutral-300" />
          </div>
          <span className="text-sm font-medium">{category}</span>
        </div>
        <div className="flex items-center gap-2">
          {over && (
            <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-400">
              Over
            </span>
          )}
          <span
            className={`text-xs font-semibold tabular-nums ${
              level === "danger" ? "text-red-400" : level === "warn" ? "text-amber-300" : "text-neutral-400"
            }`}
          >
            {Math.round(ratio * 100)}%
          </span>
        </div>
      </div>

      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-neutral-800">
        <div
          className={`h-full rounded-full transition-all duration-500 ${bar}`}
          style={{ width: `${Math.min(100, ratio * 100)}%` }}
        />
      </div>

      <div className="mt-2 flex items-center justify-between text-xs tabular-nums text-neutral-500">
        <span>{fmt(spent)} spent</span>
        {over ? (
          <span className="text-red-400">{fmt(spent - limit)} over</span>
        ) : (
          <span>{fmt(remaining)} left</span>
        )}
      </div>
    </div>
  );
}
