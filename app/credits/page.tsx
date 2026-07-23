"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, CreditCard } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { MoneyInput } from "@/components/MoneyInput";
import type { Credit } from "@/lib/types";

export default function CreditsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [userId, setUserId] = useState<string | null>(null);
  const [currency, setCurrency] = useState("USD");
  const [credits, setCredits] = useState<Credit[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);
    const [{ data: profile }, { data: rows }] = await Promise.all([
      supabase.from("profiles").select("currency").eq("id", user.id).single(),
      supabase.from("credits").select("*").eq("user_id", user.id).order("created_at"),
    ]);
    if (profile?.currency) setCurrency(profile.currency);
    setCredits((rows as Credit[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!userId) return;
    const ch = supabase
      .channel(`credits-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "credits", filter: `user_id=eq.${userId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [supabase, userId, load]);

  const fmt = (n: number) =>
    new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(n);

  async function addCredit() {
    if (!userId) return;
    const { data } = await supabase
      .from("credits")
      .insert({ user_id: userId, name: "", total_amount: 0, paid_amount: 0 })
      .select()
      .single();
    if (data) setCredits((prev) => [...prev, data as Credit]);
  }

  async function patch(id: string, fields: Partial<Credit>) {
    setCredits((prev) => prev.map((c) => (c.id === id ? { ...c, ...fields } : c)));
    await supabase.from("credits").update({ ...fields, updated_at: new Date().toISOString() }).eq("id", id);
  }

  async function remove(id: string) {
    setCredits((prev) => prev.filter((c) => c.id !== id));
    await supabase.from("credits").delete().eq("id", id);
  }

  const totalRemaining = credits.reduce(
    (s, c) => s + Math.max(0, Number(c.total_amount) - Number(c.paid_amount)),
    0,
  );

  const inputCls =
    "h-11 w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 text-base text-white outline-none focus:border-emerald-500";

  return (
    <main className="mx-auto min-h-[100dvh] max-w-md px-5 pb-32 pt-[calc(env(safe-area-inset-top)+1.25rem)]">
      <header className="mb-6 flex items-center gap-3">
        <Link href="/" aria-label="Back to dashboard" className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-900 text-neutral-300">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-semibold">Online credits</h1>
      </header>

      <section className="mb-8 rounded-3xl border border-neutral-900 bg-neutral-950 p-6 text-center">
        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-red-500/15 text-red-400">
          <CreditCard className="h-5 w-5" />
        </div>
        <p className="text-xs uppercase tracking-wide text-neutral-500">Left to pay</p>
        <p className="mt-1 text-4xl font-bold tabular-nums text-red-400">{fmt(totalRemaining)}</p>
        <p className="mt-1 text-xs text-neutral-500">
          across {credits.length} {credits.length === 1 ? "credit" : "credits"}
        </p>
      </section>

      {loading ? (
        <div className="grid gap-3">
          {[0, 1].map((i) => <div key={i} className="h-40 rounded-2xl border border-neutral-900 bg-neutral-950" />)}
        </div>
      ) : (
        <div className="grid gap-3">
          {credits.map((c) => {
            const remaining = Math.max(0, Number(c.total_amount) - Number(c.paid_amount));
            const ratio = c.total_amount > 0 ? Math.min(1, c.paid_amount / c.total_amount) : 0;
            const done = c.total_amount > 0 && remaining <= 0;
            return (
              <div key={c.id} className="rounded-2xl border border-neutral-900 bg-neutral-900/60 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <input
                    defaultValue={c.name}
                    placeholder="Credit name (e.g. Tabby, iPhone)"
                    onBlur={(e) => e.target.value !== c.name && patch(c.id, { name: e.target.value })}
                    className="h-9 flex-1 rounded-lg bg-transparent px-1 text-base font-medium outline-none placeholder:text-neutral-600 focus:bg-neutral-900"
                  />
                  <button onClick={() => remove(c.id)} aria-label="Delete credit" className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-500 active:bg-neutral-800">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="mb-1 flex items-baseline justify-between">
                  <span className="text-2xl font-bold tabular-nums">{fmt(remaining)}</span>
                  <span className={`text-xs font-medium ${done ? "text-emerald-400" : "text-neutral-500"}`}>
                    {done ? "Paid off" : `${Math.round(ratio * 100)}% paid`}
                  </span>
                </div>
                <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-neutral-800">
                  <div className={`h-full rounded-full transition-all ${done ? "bg-emerald-500" : "bg-red-500"}`} style={{ width: `${ratio * 100}%` }} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="mb-1 block text-xs text-neutral-500">Total owed</span>
                    <MoneyInput value={Number(c.total_amount)} onCommit={(n) => patch(c.id, { total_amount: n })} className={inputCls} />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs text-neutral-500">Paid so far</span>
                    <MoneyInput value={Number(c.paid_amount)} onCommit={(n) => patch(c.id, { paid_amount: n })} className={inputCls} />
                  </label>
                </div>
              </div>
            );
          })}

          <button onClick={addCredit} className="flex h-14 items-center justify-center gap-2 rounded-2xl border border-dashed border-neutral-800 text-sm font-semibold text-emerald-400 active:scale-[0.98]">
            <Plus className="h-5 w-5" /> Add a credit
          </button>
        </div>
      )}
    </main>
  );
}
