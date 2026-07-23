"use client";

import { useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { CATEGORY_ICONS } from "./categoryIcons";
import type { Transaction } from "@/lib/types";

interface Props {
  txn: Transaction;
  currency: string;
  onEdit: (t: Transaction) => void;
  onDelete: (t: Transaction) => void;
}

const REVEAL = 80; // px the row slides to expose the delete action

export function TransactionRow({ txn, currency, onEdit, onDelete }: Props) {
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);
  const baseX = useRef(0);
  const moved = useRef(false);

  const Icon = CATEGORY_ICONS[txn.category];
  const fmt = (n: number) =>
    new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
  const dateLabel = new Date(txn.occurred_on + "T00:00:00").toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

  function onTouchStart(e: React.TouchEvent) {
    startX.current = e.touches[0].clientX;
    baseX.current = dx;
    moved.current = false;
    setDragging(true);
  }
  function onTouchMove(e: React.TouchEvent) {
    const delta = e.touches[0].clientX - startX.current;
    if (Math.abs(delta) > 6) moved.current = true;
    setDx(Math.max(-REVEAL, Math.min(0, baseX.current + delta)));
  }
  function onTouchEnd() {
    setDragging(false);
    setDx(dx <= -REVEAL / 2 ? -REVEAL : 0);
  }
  function handleClick() {
    if (moved.current) {
      moved.current = false;
      return;
    }
    if (dx < 0) {
      setDx(0);
      return;
    }
    onEdit(txn);
  }

  return (
    <div className="relative overflow-hidden rounded-2xl">
      <button
        type="button"
        onClick={() => onDelete(txn)}
        aria-label="Delete"
        className="absolute inset-y-0 right-0 flex items-center justify-center bg-red-500 text-white"
        style={{ width: REVEAL }}
      >
        <Trash2 className="h-5 w-5" />
      </button>
      <div
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{ transform: `translateX(${dx}px)`, transition: dragging ? "none" : "transform 0.2s ease" }}
        className="relative flex cursor-pointer items-center gap-3 border border-neutral-900 bg-neutral-950 p-3"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neutral-900">
          <Icon className="h-4 w-4 text-neutral-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{txn.description || txn.category}</p>
          <p className="text-xs text-neutral-500">
            {txn.category} · {dateLabel}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {txn.pending && <span className="h-1.5 w-1.5 rounded-full bg-amber-400" title="Pending sync" />}
          <span className="text-sm font-semibold tabular-nums text-neutral-200">−{fmt(txn.amount)}</span>
        </div>
      </div>
    </div>
  );
}
