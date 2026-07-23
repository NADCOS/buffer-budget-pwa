"use client";

interface Props {
  daily: number;
  month: number;
  currency: string;
  days: number;
  isCurrent: boolean;
}

/** Circular safe-to-spend gauge. Fills toward the daily allowance. */
export function SafeToSpendGauge({ daily, month, currency, days, isCurrent }: Props) {
  const fmt = (n: number) =>
    new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(n);

  // Ring fill = how much of the month's allowance remains.
  const spentRatio = month <= 0 ? 0 : Math.min(1, (daily * days) / month);
  const R = 88;
  const C = 2 * Math.PI * R;
  const dash = C * spentRatio;

  const tone =
    daily <= 0 ? "#ef4444" : daily < 15 ? "#f59e0b" : "#10b981";

  return (
    <div className="relative mx-auto flex h-56 w-56 items-center justify-center">
      <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90">
        <circle cx="100" cy="100" r={R} fill="none" stroke="#171717" strokeWidth="14" />
        <circle
          cx="100"
          cy="100"
          r={R}
          fill="none"
          stroke={tone}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${C}`}
          className="transition-all duration-700 ease-out"
          style={{ filter: `drop-shadow(0 0 8px ${tone}66)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-xs font-medium uppercase tracking-wider text-neutral-400">
          {isCurrent ? "Safe to spend today" : "Daily allowance"}
        </span>
        <span className="mt-1 text-4xl font-bold tabular-nums" style={{ color: tone }}>
          {fmt(daily)}
        </span>
        <span className="mt-1 text-xs text-neutral-500">
          {fmt(month)} {isCurrent ? "left" : "budget"} · {days} days
        </span>
      </div>
    </div>
  );
}
