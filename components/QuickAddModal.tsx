"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Check } from "lucide-react";
import { CATEGORIES, type Category, type Transaction } from "@/lib/types";
import { firstOfMonth } from "@/lib/budget";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (t: Omit<Transaction, "id" | "user_id">) => void;
}

export function QuickAddModal({ open, onOpenChange, onSubmit }: Props) {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<Category>("Food");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  function reset() {
    setAmount("");
    setCategory("Food");
    setDescription("");
    setDate(new Date().toISOString().slice(0, 10));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = parseFloat(amount);
    if (!value || value <= 0) return;

    onSubmit({
      amount: value,
      category,
      description: description.trim() || null,
      occurred_on: date,
      client_uuid: crypto.randomUUID(),
    });
    reset();
    onOpenChange(false);
  }

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
              <Dialog.Title className="text-lg font-semibold">Add expense</Dialog.Title>
              <Dialog.Close className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-900 text-neutral-400">
                <X className="h-5 w-5" />
              </Dialog.Close>
            </div>

            {/* Amount */}
            <div className="mb-5 text-center">
              <div className="flex items-center justify-center gap-1">
                <span className="text-3xl font-semibold text-neutral-500">$</span>
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

            {/* Category chips */}
            <div className="mb-4 grid grid-cols-3 gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`h-12 rounded-xl text-sm font-medium transition active:scale-95 ${
                    category === c
                      ? "bg-emerald-500 text-black"
                      : "bg-neutral-900 text-neutral-300"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            {/* Description */}
            <input
              type="text"
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mb-3 h-12 w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 text-base outline-none placeholder:text-neutral-500 focus:border-emerald-500"
            />

            {/* Date */}
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mb-5 h-12 w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 text-base outline-none focus:border-emerald-500"
            />

            <button
              type="submit"
              className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 text-base font-semibold text-black transition active:scale-[0.98]"
            >
              <Check className="h-5 w-5" />
              Add expense
            </button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
