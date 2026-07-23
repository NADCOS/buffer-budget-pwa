"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Repeat, Zap } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { MoneyInput } from "@/components/MoneyInput";
import { CATEGORIES, FIXED_CATEGORIES, type Category, type Cadence, type Recurring } from "@/lib/types";
import { nextOccurrence, cadenceLabel, todayISO } from "@/lib/recurring";

const CADENCES: Cadence[] = ["weekly", "biweekly", "monthly"];

export default function RecurringPage() {
  const supabase = useMemo(() => createClient(), []);
  const [userId, setUserId] = useState<string | null>(null);
  const [currency, setCurrency] = useState("USD");
  const [rows, setRows] = useState<Recurring[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);
    const [{ data: profile }, { data: r }] = await Promise.all([
      supabase.from("profiles").select("currency").eq("id", user.id).single(),
      supabase.from("recurring").select("*").eq("user_id", user.id).order("created_at"),
    ]);
    if (profile?.currency) setCurrency(profile.currency);
    setRows((r as Recurring[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  const fmt = (n: number) =>
    new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(n);

  async function add() {
    if (!userId) return;
    setErr(null);
    const draft = {
      user_id: userId,
      amount: 0,
      category: "Miscellaneous" as Category,
      description: "",
      cadence: "monthly" as Cadence,
      day_of_month: new Date().getDate(),
      anchor_date: todayISO(),
      auto_post: false,
      active: true,
      last_run: null,
    };
    const { data, error } = await supabase.from("recurring").insert(draft).select().single();
    if (error) { setErr(error.message + " — run supabase/recurring.sql in the Supabase SQL Editor."); return; }
    if (data) setRows((prev) => [...prev, data as Recurring]);
  }

  async function patch(id: string, fields: Partial<Recurring>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...fields } : r)));
    await supabase.from("recurring").update(fields).eq("id", id);
  }

  async function remove(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id));
    await supabase.from("recurring").delete().eq("id", id);
  }

  const inputCls =
    "h-11 w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 text-base text-white outline-none focus:border-emerald-500";
  const nextLabel = (r: Recurring) =>
    new Date(nextOccurrence(r) + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });

  return (
    <main className="mx-auto min-h-[100dvh] max-w-md px-5 pb-32 pt-[calc(env(safe-area-inset-top)+1.25rem)]">
      <header className="mb-6 flex items-center gap-3">
        <Link href="/" aria-label="Back to dashboard" className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-900 text-neutral-300">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-semibold">Recurring</h1>
      </header>

      <p className="mb-6 text-sm text-neutral-500">
        Rules auto-create transactions on schedule. <span className="text-neutral-400">Auto-post</span> adds them
        silently (best for rent &amp; bills); leave it off to confirm each charge on the dashboard first.
      </p>

      {err && (
        <p className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{err}</p>
      )}

      {loading ? (
        <div className="grid gap-3">
          {[0, 1].map((i) => <div key={i} className="h-40 rounded-2xl border border-neutral-900 bg-neutral-950" />)}
        </div>
      ) : (
        <div className="grid gap-3">
          {rows.map((r) => (
            <div key={r.id} className={`rounded-2xl border p-4 ${r.active ? "border-neutral-900 bg-neutral-900/60" : "border-neutral-900/50 bg-neutral-950 opacity-60"}`}>
              <div className="mb-3 flex items-center gap-2">
                <input
                  defaultValue={r.description ?? ""}
                  placeholder="Name (e.g. Rent, Netflix)"
                  onBlur={(e) => (e.target.value || null) !== r.description && patch(r.id, { description: e.target.value || null })}
                  className="h-9 flex-1 rounded-lg bg-transparent px-1 text-base font-medium outline-none placeholder:text-neutral-600 focus:bg-neutral-900"
                />
                <button onClick={() => remove(r.id)} aria-label="Delete rule" className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-500 active:bg-neutral-800">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="mb-3 grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block text-xs text-neutral-500">Amount</span>
                  <MoneyInput value={Number(r.amount)} onCommit={(n) => patch(r.id, { amount: n })} className={inputCls} />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs text-neutral-500">Category</span>
                  <select
                    value={r.category}
                    onChange={(e) => patch(r.id, { category: e.target.value as Category })}
                    className={inputCls}
                  >
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </label>
              </div>

              <div className="mb-3 grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block text-xs text-neutral-500">Repeats</span>
                  <select
                    value={r.cadence}
                    onChange={(e) => patch(r.id, { cadence: e.target.value as Cadence })}
                    className={inputCls}
                  >
                    {CADENCES.map((c) => <option key={c} value={c}>{cadenceLabel(c)}</option>)}
                  </select>
                </label>
                {r.cadence === "monthly" ? (
                  <label className="block">
                    <span className="mb-1 block text-xs text-neutral-500">Day of month</span>
                    <input
                      type="number" min="1" max="31"
                      defaultValue={r.day_of_month ?? 1}
                      onBlur={(e) => {
                        const v = Math.min(31, Math.max(1, parseInt(e.target.value) || 1));
                        if (v !== r.day_of_month) patch(r.id, { day_of_month: v });
                      }}
                      className={inputCls}
                    />
                  </label>
                ) : (
                  <label className="block">
                    <span className="mb-1 block text-xs text-neutral-500">Starting</span>
                    <input
                      type="date"
                      value={r.anchor_date.slice(0, 10)}
                      onChange={(e) => e.target.value && patch(r.id, { anchor_date: e.target.value })}
                      className={inputCls}
                    />
                  </label>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-neutral-900 pt-3">
                <div className="flex items-center gap-3">
                  <Toggle
                    on={r.auto_post}
                    onToggle={() => patch(r.id, { auto_post: !r.auto_post })}
                    label="Auto-post"
                    icon={<Zap className="h-3.5 w-3.5" />}
                  />
                  <Toggle
                    on={r.active}
                    onToggle={() => patch(r.id, { active: !r.active })}
                    label="Active"
                  />
                </div>
                <span className="text-xs text-neutral-500">
                  {r.active ? <>next {nextLabel(r)}</> : "paused"}
                </span>
              </div>
            </div>
          ))}

          <button onClick={add} className="flex h-14 items-center justify-center gap-2 rounded-2xl border border-dashed border-neutral-800 text-sm font-semibold text-emerald-400 active:scale-[0.98]">
            <Plus className="h-5 w-5" /> Add a recurring rule
          </button>
        </div>
      )}
    </main>
  );
}

function Toggle({ on, onToggle, label, icon }: { on: boolean; onToggle: () => void; label: string; icon?: React.ReactNode }) {
  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition ${
        on ? "bg-emerald-500/15 text-emerald-400" : "bg-neutral-800 text-neutral-500"
      }`}
    >
      {icon}
      {label}
      <span className={`ml-0.5 h-2 w-2 rounded-full ${on ? "bg-emerald-400" : "bg-neutral-600"}`} />
    </button>
  );
}
