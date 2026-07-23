"use client";

import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Check, Trash2 } from "lucide-react";
import { CATEGORIES, FIXED_CATEGORIES, type Category, type Transaction } from "@/lib/types";

export interface TxnDraft {
  id?: string;
  amount: number;
  category: Category;
  description: string | null;
  occurred_on: string;
  client_uuid: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (t: TxnDraft) => void;
  onDelete?: (t: Transaction) => void;
  editing?: Transaction | null;
  currency?: string;
}

function currencySymbol(currency: string): string {
  try {
    const parts = new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).formatToParts(0);
    return parts.find((p) => p.type === "currency")?.value ?? currency;
  } catch {
    return currency;
  }
}

const today = () => new Date().toISOString().slice(0, 10);
const yesterday = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
};
const buzz = () => {
  if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(8);
};

const DISCRETIONARY = CATEGORIES.filter((c) => !FIXED_CATEGORIES.includes(c));

export function QuickAddModal({ open, onOpenChange, onSubmit, onDelete, editing, currency = "USD" }: Props) {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<Category>("Food");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(today);
  const symbol = currencySymbol(currency);
  const isEdit = !!editing;

  // Prefill when opening in edit mode; reset when opening fresh.
  useEffect(() => {
    if (!open) return;
    if (editing) {
      setAmount(String(editing.amount));
      setCategory(editing.category);
      setDescription(editing.description ?? "");
      setDate(editing.occurred_on.slice(0, 10));
    } else {
      setAmount("");
      setCategory("Food");
      setDescription("");
      setDate(today());
    }
  }, [open, editing]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = parseFloat(amount);
    if (!value || value <= 0) return;
    buzz();
    onSubmit({
      id: editing?.id,
      amount: value,
      category,
      description: description.trim() || null,
      occurred_on: date,
      client_uuid: editing?.client_uuid ?? crypto.randomUUID(),
    });
    onOpenChange(false);
  }

  const chip = (c: Category) => (
    <button
      key={c}
      type="button"
      onClick={() => {
        buzz();
        setCategory(c);
      }}
      className={`h-12 rounded-xl text-sm font-medium transition active:scale-95 ${
        category === c ? "bg-emerald-500 text-black" : "bg-neutral-900 text-neutral-300"
      }`}
    >
      {c}
    </button>
  );

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm data-[state=open]:animate-[fadeIn_150ms_ease]" />
        <Dialog.Content
          className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border-t border-neutral-800 bg-neutral-950 pb-[env(safe-area-inset-bottom)] focus:outline-none data-[state=open]:animate-[slideUp_220ms_cubic-bezier(0.32,0.72,0,1)]"
          aria-describedby={undefined}
        >
          <div className="mx-auto mt-3 h-1.5 w-10 rounded-full bg-neutral-700" />
          <form onSubmit={submit} className="px-5 pb-6 pt-4">
            <div className="mb-5 flex items-center justify-between">
              <Dialog.Title className="text-lg font-semibold">
                {isEdit ? "Edit expense" : "Add expense"}
              </Dialog.Title>
              <div className="flex items-center gap-2">
                {isEdit && onDelete && (
                  <button
                    type="button"
                    onClick={() => {
                      buzz();
                      onDelete(editing!);
                      onOpenChange(false);
                    }}
                    aria-label="Delete expense"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-red-500/15 text-red-400"
                  >
                    <Trash2 className="h-4.5 w-4.5" />
                  </button>
                )}
                <Dialog.Close className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-900 text-neutral-400">
                  <X className="h-5 w-5" />
                </Dialog.Close>
              </div>
            </div>

            {/* Amount */}
            <div className="mb-5 text-center">
              <div className="flex items-center justify-center gap-1">
                <span className="text-3xl font-semibold text-neutral-500">{symbol}</span>
                <input
                  autoFocus
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-40 bg-transparent text-center text-5xl font-bold tabular-nums outline-none placeholder:text-neutral-700"
                />
              </div>
            </div>

            {/* Discretionary categories */}
            <div className="mb-3 grid grid-cols-2 gap-2">{DISCRETIONARY.map(chip)}</div>

            {/* Fixed / recurring categories */}
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-neutral-500">
              Fixed / recurring
            </p>
            <div className="mb-4 grid grid-cols-2 gap-2">{FIXED_CATEGORIES.map(chip)}</div>

            {/* Description */}
            <input
              type="text"
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mb-3 h-12 w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 text-base outline-none placeholder:text-neutral-500 focus:border-emerald-500"
            />

            {/* Date + quick-pick */}
            <div className="mb-5 flex gap-2">
              <button
                type="button"
                onClick={() => setDate(today())}
                className={`h-12 flex-1 rounded-xl text-sm font-medium transition active:scale-95 ${
                  date === today() ? "bg-emerald-500 text-black" : "bg-neutral-900 text-neutral-300"
                }`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setDate(yesterday())}
                className={`h-12 flex-1 rounded-xl text-sm font-medium transition active:scale-95 ${
                  date === yesterday() ? "bg-emerald-500 text-black" : "bg-neutral-900 text-neutral-300"
                }`}
              >
                Yesterday
              </button>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-12 flex-1 rounded-xl border border-neutral-800 bg-neutral-900 px-3 text-sm outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="submit"
              className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 text-base font-semibold text-black transition active:scale-[0.98]"
            >
              <Check className="h-5 w-5" />
              {isEdit ? "Save changes" : "Add expense"}
            </button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
