"use client";

interface Pt {
  label: string;
  value: number;
}

/** Lightweight cumulative-savings area chart. Pure SVG, no dependencies. */
export function SavingsChart({ points }: { points: Pt[] }) {
  if (points.length === 0) return null;

  const W = 340;
  const H = 140;
  const P = 16;
  const innerW = W - P * 2;
  const innerH = H - P * 2;
  const n = points.length;
  const max = Math.max(...points.map((p) => p.value), 1);

  const x = (i: number) => (n <= 1 ? W / 2 : P + (i * innerW) / (n - 1));
  const y = (v: number) => P + innerH - (v / max) * innerH;

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(p.value)}`).join(" ");
  const area = `${line} L${x(n - 1)},${P + innerH} L${x(0)},${P + innerH} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Savings growth">
      <defs>
        <linearGradient id="savings-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#10b981" stopOpacity="0.35" />
          <stop offset="1" stopColor="#10b981" stopOpacity="0" />
        </linearGradient>
      </defs>
      {n > 1 && <path d={area} fill="url(#savings-grad)" />}
      <path d={line} fill="none" stroke="#10b981" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => (
        <circle key={i} cx={x(i)} cy={y(p.value)} r="2.5" fill="#10b981" />
      ))}
    </svg>
  );
}
