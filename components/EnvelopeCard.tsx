"use client";

import { envelopeStatus } from "@/lib/budget";
import type { Category } from "@/lib/types";
import { Utensils, Home, Bus, PartyPopper, Zap, Package } from "lucide-react";

const ICONS: Record<Category, React.ComponentType<{ className?: string }>> = {
  Food: Utensils,
  Rent: Home,
  Transport: Bus,
  Fun: PartyPopper,
  Utilities: Zap,
  Miscellaneous: Package,
};

interface Props {
  category: Category;
  spent: number;
  limit: number;
  currency: string;
}

export function EnvelopeCard({ category, spent, limit, currency }: Props) {
  const { ratio, level, remaining } = envelopeStatus(spent, limit);
  const Icon = ICONS[category];
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
    <div
      className={`rounded-2xl border ${ring} bg-neutral-900/70 p-4 ${
        level === "danger" ? "animate-pulse" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-800">
            <Icon className="h-4.5 w-4.5 text-neutral-300" />
          </div>
          <span className="text-sm font-medium">{category}</span>
        </div>
        <span
          className={`text-xs font-semibold tabular-nums ${
            level === "danger" ? "text-red-400" : level === "warn" ? "text-amber-300" : "text-neutral-400"
          }`}
        >
          {Math.round(ratio * 100)}%
        </span>
      </div>

      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-neutral-800">
        <div
          className={`h-full rounded-full transition-all duration-500 ${bar}`}
          style={{ width: `${Math.min(100, ratio * 100)}%` }}
        />
      </div>

      <div className="mt-2 flex items-center justify-between text-xs tabular-nums text-neutral-500">
        <span>{fmt(spent)} spent</span>
        <span>{fmt(remaining)} left</span>
      </div>
    </div>
  );
}
