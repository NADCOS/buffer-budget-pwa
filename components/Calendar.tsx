"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { parseMonth, daysInMonth, firstOfMonth } from "@/lib/budget";
import { type Transaction } from "@/lib/types";

export interface DateRange {
  start: string; // inclusive ISO date
  end: string; // inclusive ISO date
}

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Month calendar for navigating dates and weeks. Tapping a day (or a week, in
 * week mode) sets a date range that filters the transaction list. Each day
 * shows a spend-intensity dot.
 */
export function Calendar({
  month,
  txns,
  currency,
  range,
  onRangeChange,
}: {
  month: string; // ISO first-of-month
  txns: Transaction[];
  currency: string;
  range: DateRange | null;
  onRangeChange: (r: DateRange | null) => void;
}) {
  const [mode, setMode] = useState<"day" | "week">("day");

  const base = parseMonth(month);
  const year = base.getFullYear();
  const mon = base.getMonth();
  const total = daysInMonth(month);
  const firstDow = new Date(year, mon, 1).getDay();
  const iso = (d: number) =>
    `${year}-${String(mon + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  // Spend per day-of-month for this month.
  const spend: Record<number, number> = {};
  for (const t of txns) {
    if (t.occurred_on.slice(0, 7) !== month.slice(0, 7)) continue;
    const d = parseInt(t.occurred_on.slice(8, 10), 10);
    spend[d] = (spend[d] ?? 0) + Number(t.amount);
  }
  const maxSpend = Math.max(1, ...Object.values(spend));
  const today = todayIso();

  const fmt = (n: number) =>
    new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(n);

  function selectDay(d: number) {
    const dISO = iso(d);
    if (mode === "day") {
      if (range && range.start === dISO && range.end === dISO) {
        onRangeChange(null);
        return;
      }
      onRangeChange({ start: dISO, end: dISO });
    } else {
      // Whole week (Sun–Sat) containing this day, clamped to the month.
      const dow = new Date(year, mon, d).getDay();
      const startD = Math.max(1, d - dow);
      const endD = Math.min(total, d + (6 - dow));
      const r = { start: iso(startD), end: iso(endD) };
      if (range && range.start === r.start && range.end === r.end) {
        onRangeChange(null);
        return;
      }
      onRangeChange(r);
    }
  }

  const inRange = (d: number) => {
    if (!range) return false;
    const v = iso(d);
    return v >= range.start && v <= range.end;
  };
  const isEdge = (d: number) => range && (iso(d) === range.start || iso(d) === range.end);

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= total; d++) cells.push(d);

  const rangeLabel = () => {
    if (!range) return null;
    const fmtD = (s: string) =>
      new Date(s + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });
    return range.start === range.end ? fmtD(range.start) : `${fmtD(range.start)} – ${fmtD(range.end)}`;
  };

  const rangeSpend = () => {
    if (!range) return 0;
    return txns
      .filter((t) => t.occurred_on >= range.start && t.occurred_on <= range.end)
      .reduce((s, t) => s + Number(t.amount), 0);
  };

  return (
    <div className="rounded-2xl border border-neutral-900 bg-neutral-950 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-400">Calendar</h3>
        <div className="flex rounded-full bg-neutral-900 p-0.5 text-xs font-medium">
          {(["day", "week"] as const).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                onRangeChange(null);
              }}
              className={`rounded-full px-3 py-1 capitalize transition ${
                mode === m ? "bg-emerald-500 text-black" : "text-neutral-400"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-neutral-600">
        {WEEKDAYS.map((w, i) => (
          <div key={i}>{w}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (d == null) return <div key={`e${i}`} />;
          const s = spend[d] ?? 0;
          const active = inRange(d);
          const edge = isEdge(d);
          const isToday = iso(d) === today;
          const intensity = s > 0 ? 0.25 + (s / maxSpend) * 0.75 : 0;
          return (
            <button
              key={d}
              onClick={() => selectDay(d)}
              className={`relative flex aspect-square flex-col items-center justify-center rounded-lg text-xs tabular-nums transition ${
                active ? "bg-emerald-500/15" : "active:bg-neutral-900"
              } ${edge ? "ring-1 ring-emerald-500" : ""}`}
            >
              <span className={isToday ? "font-bold text-emerald-400" : active ? "text-emerald-200" : "text-neutral-300"}>
                {d}
              </span>
              <span
                className="mt-0.5 h-1 w-1 rounded-full bg-sky-400"
                style={{ opacity: intensity }}
              />
            </button>
          );
        })}
      </div>

      {range && (
        <div className="mt-3 flex items-center justify-between border-t border-neutral-900 pt-3 text-xs">
          <span className="text-neutral-400">
            {rangeLabel()} · <span className="tabular-nums text-sky-400">{fmt(rangeSpend())}</span> spent
          </span>
          <button onClick={() => onRangeChange(null)} className="font-semibold text-emerald-400">
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
