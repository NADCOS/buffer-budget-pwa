"use client";

import { parseMonth, daysInMonth, isCurrentMonth } from "@/lib/budget";
import { type Transaction } from "@/lib/types";

/**
 * "Cash flow" chart for the viewed month: a flat income line and a cumulative
 * spend area rising toward it. The gap between them is what's left. Pure SVG.
 */
export function FlowChart({
  month,
  income,
  txns,
  currency,
}: {
  month: string;
  income: number;
  txns: Transaction[];
  currency: string;
}) {
  const total = daysInMonth(month);
  const daily = new Array(total + 1).fill(0);
  for (const t of txns) {
    if (t.occurred_on.slice(0, 7) !== month.slice(0, 7)) continue;
    const d = parseInt(t.occurred_on.slice(8, 10), 10);
    if (d >= 1 && d <= total) daily[d] += Number(t.amount);
  }

  const cum: number[] = [];
  let run = 0;
  for (let d = 1; d <= total; d++) {
    run += daily[d];
    cum.push(run);
  }
  const spent = run;
  const remaining = income - spent;

  const fmt = (n: number) =>
    new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(n);

  const W = 340;
  const H = 150;
  const P = 16;
  const innerW = W - P * 2;
  const innerH = H - P * 2;
  const max = Math.max(income, spent, 1);
  const x = (i: number) => (total <= 1 ? W / 2 : P + (i * innerW) / (total - 1));
  const y = (v: number) => P + innerH - (Math.min(v, max) / max) * innerH;

  const incomeY = y(income);
  const line = cum.map((v, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(v)}`).join(" ");
  const area = `${line} L${x(cum.length - 1)},${P + innerH} L${x(0)},${P + innerH} Z`;

  // Highlight where cumulative spend crosses income (overspending).
  const over = spent > income;

  return (
    <div className="rounded-2xl border border-neutral-900 bg-neutral-950 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-400">Cash flow</h3>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="flex items-center gap-1 text-emerald-400">
            <span className="h-0.5 w-3 rounded bg-emerald-400" /> Income
          </span>
          <span className="flex items-center gap-1 text-sky-400">
            <span className="h-0.5 w-3 rounded bg-sky-400" /> Spent
          </span>
        </div>
      </div>

      <div className="mb-3 grid grid-cols-3 gap-2">
        <Mini label="Income" value={fmt(income)} tone="text-emerald-400" />
        <Mini label="Deducted" value={fmt(spent)} tone="text-sky-400" />
        <Mini label="Remaining" value={fmt(remaining)} tone={remaining < 0 ? "text-red-400" : "text-neutral-100"} />
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Income versus spending">
        <defs>
          <linearGradient id="flow-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#38bdf8" stopOpacity="0.35" />
            <stop offset="1" stopColor="#38bdf8" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Income reference line */}
        {income > 0 && (
          <line
            x1={P}
            y1={incomeY}
            x2={W - P}
            y2={incomeY}
            stroke="#10b981"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
        )}

        {cum.length > 1 && <path d={area} fill="url(#flow-grad)" />}
        <path
          d={line}
          fill="none"
          stroke={over ? "#f87171" : "#38bdf8"}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>

      <div className="mt-1 flex justify-between text-[11px] text-neutral-600">
        <span>Day 1</span>
        <span>Day {total}</span>
      </div>
    </div>
  );
}

function Mini({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-xl bg-neutral-900/60 p-2.5">
      <p className="text-[10px] uppercase tracking-wide text-neutral-500">{label}</p>
      <p className={`truncate text-sm font-semibold tabular-nums ${tone}`}>{value}</p>
    </div>
  );
}
