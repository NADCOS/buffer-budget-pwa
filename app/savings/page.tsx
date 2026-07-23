"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, PiggyBank } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { MoneyInput } from "@/components/MoneyInput";
import type { Account } from "@/lib/types";

export default function SavingsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [userId, setUserId] = useState<string | null>(null);
  const [currency, setCurrency] = useState("USD");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);
    const [{ data: profile }, { data: rows }] = await Promise.all([
      supabase.from("profiles").select("currency").eq("id", user.id).single(),
      supabase.from("accounts").select("*").eq("user_id", user.id).order("created_at"),
    ]);
    if (profile?.currency) setCurrency(profile.currency);
    setAccounts((rows as Account[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!userId) return;
    const ch = supabase
      .channel(`accounts-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "accounts", filter: `user_id=eq.${userId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [supabase, userId, load]);

  const fmt = (n: number) =>
    new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(n);

  async function addAccount() {
    if (!userId) return;
    const { data } = await supabase
      .from("accounts")
      .insert({ user_id: userId, name: "", balance: 0 })
      .select()
      .single();
    if (data) setAccounts((prev) => [...prev, data as Account]);
  }

  async function patch(id: string, fields: Partial<Account>) {
    setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, ...fields } : a)));
    await supabase.from("accounts").update({ ...fields, updated_at: new Date().toISOString() }).eq("id", id);
  }

  async function remove(id: string) {
    setAccounts((prev) => prev.filter((a) => a.id !== id));
    await supabase.from("accounts").delete().eq("id", id);
  }

  const total = accounts.reduce((s, a) => s + Number(a.balance), 0);

  const inputCls =
    "h-11 w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 text-base text-white outline-none focus:border-emerald-500";

  return (
    <main className="mx-auto min-h-[100dvh] max-w-md px-5 pb-32 pt-[calc(env(safe-area-inset-top)+1.25rem)]">
      <header className="mb-6 flex items-center gap-3">
        <Link href="/" aria-label="Back to dashboard" className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-900 text-neutral-300">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-semibold">Savings</h1>
      </header>

      <section className="mb-8 rounded-3xl border border-neutral-900 bg-neutral-950 p-6 text-center">
        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400">
          <PiggyBank className="h-5 w-5" />
        </div>
        <p className="text-xs uppercase tracking-wide text-neutral-500">Total saved</p>
        <p className="mt-1 text-4xl font-bold tabular-nums text-emerald-400">{fmt(total)}</p>
        <p className="mt-1 text-xs text-neutral-500">
          across {accounts.length} {accounts.length === 1 ? "account" : "accounts"}
        </p>
      </section>

      <p className="mb-3 text-xs text-neutral-500">
        Edit each balance whenever you deposit or withdraw — the total updates automatically.
      </p>

      {loading ? (
        <div className="grid gap-3">
          {[0, 1].map((i) => <div key={i} className="h-24 rounded-2xl border border-neutral-900 bg-neutral-950" />)}
        </div>
      ) : (
        <div className="grid gap-3">
          {accounts.map((a) => (
            <div key={a.id} className="rounded-2xl border border-neutral-900 bg-neutral-900/60 p-4">
              <div className="mb-3 flex items-center gap-2">
                <input
                  defaultValue={a.name}
                  placeholder="Account name (e.g. Al Rajhi, Cash)"
                  onBlur={(e) => e.target.value !== a.name && patch(a.id, { name: e.target.value })}
                  className="h-9 flex-1 rounded-lg bg-transparent px-1 text-base font-medium outline-none placeholder:text-neutral-600 focus:bg-neutral-900"
                />
                <button onClick={() => remove(a.id)} aria-label="Delete account" className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-500 active:bg-neutral-800">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <label className="block">
                <span className="mb-1 block text-xs text-neutral-500">Balance</span>
                <MoneyInput value={Number(a.balance)} onCommit={(n) => patch(a.id, { balance: n })} className={inputCls} />
              </label>
            </div>
          ))}

          <button onClick={addAccount} className="flex h-14 items-center justify-center gap-2 rounded-2xl border border-dashed border-neutral-800 text-sm font-semibold text-emerald-400 active:scale-[0.98]">
            <Plus className="h-5 w-5" /> Add an account
          </button>
        </div>
      )}
    </main>
  );
}
