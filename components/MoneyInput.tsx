"use client";

import { useState } from "react";

interface Props {
  value: number;
  onCommit: (n: number) => void;
  className?: string;
  placeholder?: string;
}

/**
 * A numeric money input that commits on blur. Keeps a local draft string
 * while focused so decimals/backspacing feel natural and realtime updates
 * don't clobber what you're typing.
 */
export function MoneyInput({ value, onCommit, className = "", placeholder = "0" }: Props) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <input
      type="number"
      inputMode="decimal"
      step="0.01"
      min="0"
      value={draft ?? String(value)}
      placeholder={placeholder}
      onFocus={() => setDraft(String(value))}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        const n = parseFloat(draft ?? "");
        setDraft(null);
        const clean = Number.isFinite(n) ? n : 0;
        if (clean !== value) onCommit(clean);
      }}
      className={className}
    />
  );
}
