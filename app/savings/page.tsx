"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, PiggyBank, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { MoneyInput } from "@/components/MoneyInput";
import { SavingsChart } from "@/components/SavingsChart";
import { fetchRate } from "@/lib/fx";
import { firstOfMonth } from "@/lib/budget";
import type { Account, SavingsEntry } from "@/lib/types";

const shortMonth = (iso: string) =>
  new Date(iso.slice(0, 7) + "-01T00:00:00").toLocaleDateString(undefined, {
    month: "short",
    year: "2-digit",
  });

export default function SavingsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [userId, setUserId] = useState<string | null>(null);
  const [currency, setCurrency] = useState("USD");
  const [secondary, setSecondary] = useState("");
  const [rate, setRate] = useState<number | null>(null);
  const [manualRate, setManualRate] = useState<number | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [entries, setEntries] = useState<SavingsEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);
    const [{ data: profile }, { data: acc }, { data: ent }] = await Promise.all([
      supabase.from("profiles").select("currency, secondary_currency, fx_rate").eq("id", user.id).single(),
      supabase.from("accounts").select("*").eq("user_id", user.id).order("created_at"),
      supabase.from("savings_entries").select("*").eq("user_id", user.id).order("month"),
    ]);
    if (profile?.currency) setCurrency(profile.currency);
    setSecondary(profile?.secondary_currency ?? "");
    setManualRate(profile?.fx_rate ? Number(profile.fx_rate) : null);
    setAccounts((acc as Account[]) ?? []);
    setEntries((ent as SavingsEntry[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  // Rate: use the manual rate if set, otherwise fetch live.
  useEffect(() => {
    if (!secondary || secondary === currency) { setRate(secondary === currency ? 1 : null); return; }
    if (manualRate && manualRate > 0) { setRate(manualRate); return; }
    let alive = true;
    fetchRate(currency, secondary).then((r) => { if (alive) setRate(r); });
    return () => { alive = false; };
  }, [currency, secondary, manualRate]);

  useEffect(() => {
    if (!userId) return;
    const ch = supabase
      .channel(`savings-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "accounts", filter: `user_id=eq.${userId}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "savings_entries", filter: `user_id=eq.${userId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [supabase, userId, load]);

  const fmt = (n: number) =>
    new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
  const fmt2 = (n: number) =>
    new Intl.NumberFormat(undefined, { style: "currency", currency: secondary || "USD", maximumFractionDigits: 0 }).format(n);
  const showSecondary = !!secondary && secondary !== currency && rate != null;

  // ── Accounts (current balances) ───────────────────────────
  async function addAccount() {
    if (!userId) return;
    const { data } = await supabase.from("accounts").insert({ user_id: userId, name: "", balance: 0 }).select().single();
    if (data) setAccounts((prev) => [...prev, data as Account]);
  }
  async function patchAccount(id: string, fields: Partial<Account>) {
    setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, ...fields } : a)));
    await supabase.from("accounts").update({ ...fields, updated_at: new Date().toISOString() }).eq("id", id);
  }
  async function removeAccount(id: string) {
    setAccounts((prev) => prev.filter((a) => a.id !== id));
    await supabase.from("accounts").delete().eq("id", id);
  }

  // ── Monthly contributions (growth history) ────────────────
  async function addEntry() {
    if (!userId) return;
    const { data } = await supabase
      .from("savings_entries")
      .insert({ user_id: userId, month: firstOfMonth(), amount: 0, note: null })
      .select()
      .single();
    if (data) setEntries((prev) => [...prev, data as SavingsEntry]);
  }
  async function patchEntry(id: string, fields: Partial<SavingsEntry>) {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...fields } : e)));
    await supabase.from("savings_entries").update(fields).eq("id", id);
  }
  async function removeEntry(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    await supabase.from("savings_entries").delete().eq("id", id);
  }

  const totalBalance = accounts.reduce((s, a) => s + Number(a.balance), 0);

  // Cumulative savings by month → chart points.
  const { points, totalContrib } = useMemo(() => {
    const byMonth: Record<string, number> = {};
    for (const e of entries) {
      const m = e.month.slice(0, 7);
      byMonth[m] = (byMonth[m] ?? 0) + Number(e.amount);
    }
    const months = Object.keys(byMonth).sort();
    let run = 0;
    const pts = months.map((m) => {
      run += byMonth[m];
      return { label: shortMonth(m), value: run };
    });
    return { points: pts, totalContrib: run };
  }, [entries]);

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

      {/* Total saved (reflects both the monthly log and bank balances) */}
      <section className="mb-8 rounded-3xl border border-neutral-900 bg-neutral-950 p-6 text-center">
        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400">
          <PiggyBank className="h-5 w-5" />
        </div>
        <p className="text-xs uppercase tracking-wide text-neutral-500">Total saved</p>
        <p className="mt-1 text-4xl font-bold tabular-nums text-emerald-400">{fmt(totalContrib)}</p>
        {showSecondary && (
          <p className="mt-1 text-sm font-medium tabular-nums text-neutral-400">
            ≈ {fmt2(totalContrib * (rate as number))} {secondary}
          </p>
        )}
        {showSecondary && (
          <p className="mt-1 text-[11px] text-neutral-600">
            1 {currency} = {new Intl.NumberFormat(undefined, { maximumFractionDigits: 3 }).format(rate as number)} {secondary}
            {manualRate ? " · manual" : " · live"}
          </p>
        )}
        <p className="mt-2 text-xs text-neutral-500">
          {fmt(totalBalance)} held across {accounts.length} bank {accounts.length === 1 ? "account" : "accounts"}
        </p>
      </section>

      {loading ? (
        <div className="grid gap-3">
          {[0, 1].map((i) => <div key={i} className="h-24 rounded-2xl border border-neutral-900 bg-neutral-950" />)}
        </div>
      ) : (
        <>
          {/* Bank accounts */}
          <h2 className="mb-1 text-sm font-semibold text-neutral-400">Bank accounts</h2>
          <p className="mb-3 text-xs text-neutral-500">Edit a balance whenever you deposit or withdraw.</p>
          <div className="mb-8 grid gap-3">
            {accounts.map((a) => (
              <div key={a.id} className="rounded-2xl border border-neutral-900 bg-neutral-900/60 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <input
                    defaultValue={a.name}
                    placeholder="Account name (e.g. Al Rajhi, Cash)"
                    onBlur={(e) => e.target.value !== a.name && patchAccount(a.id, { name: e.target.value })}
                    className="h-9 flex-1 rounded-lg bg-transparent px-1 text-base font-medium outline-none placeholder:text-neutral-600 focus:bg-neutral-900"
                  />
                  <button onClick={() => removeAccount(a.id)} aria-label="Delete account" className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-500 active:bg-neutral-800">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <label className="block">
                  <span className="mb-1 block text-xs text-neutral-500">Balance</span>
                  <MoneyInput value={Number(a.balance)} onCommit={(n) => patchAccount(a.id, { balance: n })} className={inputCls} />
                </label>
              </div>
            ))}
            <button onClick={addAccount} className="flex h-14 items-center justify-center gap-2 rounded-2xl border border-dashed border-neutral-800 text-sm font-semibold text-emerald-400 active:scale-[0.98]">
              <Plus className="h-5 w-5" /> Add an account
            </button>
          </div>

          {/* Growth over time */}
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-400">Savings growth</h2>
            <span className="flex items-center gap-1 text-xs text-emerald-400">
              <TrendingUp className="h-3.5 w-3.5" />
              {fmt(totalContrib)} all-time
            </span>
          </div>
          {showSecondary && totalContrib > 0 && (
            <p className="-mt-1 mb-3 text-right text-xs text-neutral-500">
              ≈ {fmt2(totalContrib * (rate as number))} {secondary}
            </p>
          )}

          {points.length > 0 ? (
            <div className="mb-4 rounded-2xl border border-neutral-900 bg-neutral-950 p-4">
              <SavingsChart points={points} />
              <div className="mt-1 flex justify-between text-[11px] text-neutral-500">
                <span>{points[0].label}</span>
                <span>{points[points.length - 1].label}</span>
              </div>
            </div>
          ) : (
            <p className="mb-4 rounded-2xl border border-dashed border-neutral-800 bg-neutral-950 px-4 py-6 text-center text-sm text-neutral-500">
              Log what you set aside each month to see your growth here.
            </p>
          )}

          {/* Monthly contribution log */}
          <div className="grid gap-3">
            {entries.map((e) => (
              <div key={e.id} className="rounded-2xl border border-neutral-900 bg-neutral-900/60 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <input
                    type="month"
                    value={e.month.slice(0, 7)}
                    onChange={(ev) => ev.target.value && patchEntry(e.id, { month: ev.target.value + "-01" })}
                    className="h-9 rounded-lg border border-neutral-800 bg-neutral-900 px-2 text-sm outline-none focus:border-emerald-500"
                  />
                  <div className="flex-1" />
                  <button onClick={() => removeEntry(e.id)} aria-label="Delete entry" className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-500 active:bg-neutral-800">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="mb-1 block text-xs text-neutral-500">Saved this month</span>
                    <MoneyInput value={Number(e.amount)} onCommit={(n) => patchEntry(e.id, { amount: n })} className={inputCls} />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs text-neutral-500">Note</span>
                    <input
                      defaultValue={e.note ?? ""}
                      placeholder="Optional"
                      onBlur={(ev) => (ev.target.value || null) !== e.note && patchEntry(e.id, { note: ev.target.value || null })}
                      className={inputCls}
                    />
                  </label>
                </div>
              </div>
            ))}
            <button onClick={addEntry} className="flex h-14 items-center justify-center gap-2 rounded-2xl border border-dashed border-neutral-800 text-sm font-semibold text-emerald-400 active:scale-[0.98]">
              <Plus className="h-5 w-5" /> Log a month
            </button>
          </div>
        </>
      )}
    </main>
  );
}
