"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { MoneyInput } from "@/components/MoneyInput";
import { firstOfMonth } from "@/lib/budget";
import { SAVINGS_CURRENCY, type Remittance } from "@/lib/types";

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function RemittancePage() {
  const supabase = useMemo(() => createClient(), []);
  const [userId, setUserId] = useState<string | null>(null);
  const [currency, setCurrency] = useState("USD");
  const [fxRate, setFxRate] = useState<number | null>(null);
  const [rows, setRows] = useState<Remittance[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);
    const [{ data: profile }, { data: r }] = await Promise.all([
      supabase.from("profiles").select("currency, fx_rate").eq("id", user.id).single(),
      supabase.from("remittances").select("*").eq("user_id", user.id).order("sent_on", { ascending: false }),
    ]);
    if (profile?.currency) setCurrency(profile.currency);
    setFxRate(profile?.fx_rate != null ? Number(profile.fx_rate) : null);
    setRows((r as Remittance[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!userId) return;
    const ch = supabase
      .channel(`remit-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "remittances", filter: `user_id=eq.${userId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [supabase, userId, load]);

  const fmt = (n: number) =>
    new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
  const fmtPhp = (n: number) =>
    new Intl.NumberFormat("en-PH", { style: "currency", currency: SAVINGS_CURRENCY, maximumFractionDigits: 0 }).format(n);

  async function add() {
    if (!userId) return;
    setErr(null);
    const { data, error } = await supabase
      .from("remittances")
      .insert({ user_id: userId, amount: 0, recipient: "", sent_on: todayIso(), note: null })
      .select()
      .single();
    if (error) { setErr(error.message + " — run supabase/setup_all.sql in the Supabase SQL Editor."); return; }
    if (data) setRows((prev) => [data as Remittance, ...prev]);
  }

  async function patch(id: string, fields: Partial<Remittance>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...fields } : r)));
    await supabase.from("remittances").update(fields).eq("id", id);
  }

  async function remove(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id));
    await supabase.from("remittances").delete().eq("id", id);
  }

  const totalAll = rows.reduce((s, r) => s + Number(r.amount), 0);
  const totalMonth = rows
    .filter((r) => r.sent_on.slice(0, 7) === firstOfMonth().slice(0, 7))
    .reduce((s, r) => s + Number(r.amount), 0);

  const inputCls =
    "h-11 w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 text-base text-white outline-none focus:border-emerald-500";

  return (
    <main className="mx-auto min-h-[100dvh] max-w-md px-5 pb-32 pt-[calc(env(safe-area-inset-top)+1.25rem)]">
      <header className="mb-6 flex items-center gap-3">
        <Link href="/" aria-label="Back to dashboard" className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-900 text-neutral-300">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-semibold">Remittance</h1>
      </header>

      <section className="mb-8 rounded-3xl border border-neutral-900 bg-neutral-950 p-6 text-center">
        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-500/15 text-sky-400">
          <Send className="h-5 w-5" />
        </div>
        <p className="text-xs uppercase tracking-wide text-neutral-500">Sent this month</p>
        <p className="mt-1 text-4xl font-bold tabular-nums text-sky-400">{fmt(totalMonth)}</p>
        {fxRate != null && totalMonth > 0 && (
          <p className="mt-1 text-xs text-neutral-500">≈ {fmtPhp(totalMonth * fxRate)} received</p>
        )}
        <p className="mt-2 text-xs text-neutral-500">{fmt(totalAll)} sent all-time</p>
      </section>

      {err && (
        <p className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{err}</p>
      )}

      {loading ? (
        <div className="grid gap-3">
          {[0, 1].map((i) => <div key={i} className="h-32 rounded-2xl border border-neutral-900 bg-neutral-950" />)}
        </div>
      ) : (
        <div className="grid gap-3">
          {rows.map((r) => (
            <div key={r.id} className="rounded-2xl border border-neutral-900 bg-neutral-900/60 p-4">
              <div className="mb-3 flex items-center gap-2">
                <input
                  defaultValue={r.recipient ?? ""}
                  placeholder="Recipient (e.g. Mama, GCash)"
                  onBlur={(e) => (e.target.value || null) !== r.recipient && patch(r.id, { recipient: e.target.value || null })}
                  className="h-9 flex-1 rounded-lg bg-transparent px-1 text-base font-medium outline-none placeholder:text-neutral-600 focus:bg-neutral-900"
                />
                <button onClick={() => remove(r.id)} aria-label="Delete remittance" className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-500 active:bg-neutral-800">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {fxRate != null && Number(r.amount) > 0 && (
                <p className="mb-3 text-xs text-neutral-500">≈ {fmtPhp(Number(r.amount) * fxRate)} received in ₱</p>
              )}

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block text-xs text-neutral-500">Amount sent ({currency})</span>
                  <MoneyInput value={Number(r.amount)} onCommit={(n) => patch(r.id, { amount: n })} className={inputCls} />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs text-neutral-500">Date sent</span>
                  <input
                    type="date"
                    value={r.sent_on.slice(0, 10)}
                    onChange={(e) => e.target.value && patch(r.id, { sent_on: e.target.value })}
                    className={inputCls}
                  />
                </label>
              </div>

              <label className="mt-3 block">
                <span className="mb-1 block text-xs text-neutral-500">Note</span>
                <input
                  defaultValue={r.note ?? ""}
                  placeholder="Optional"
                  onBlur={(e) => (e.target.value || null) !== r.note && patch(r.id, { note: e.target.value || null })}
                  className={inputCls}
                />
              </label>
            </div>
          ))}

          <button onClick={add} className="flex h-14 items-center justify-center gap-2 rounded-2xl border border-dashed border-neutral-800 text-sm font-semibold text-emerald-400 active:scale-[0.98]">
            <Plus className="h-5 w-5" /> Log a remittance
          </button>
        </div>
      )}
    </main>
  );
}
