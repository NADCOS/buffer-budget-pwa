"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, TrendingUp, TrendingDown, Landmark, Wifi, WifiOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { outbox } from "@/lib/offline-queue";
import {
  CATEGORIES,
  FIXED_CATEGORIES,
  type Budget,
  type Transaction,
} from "@/lib/types";
import { computeSummary, firstOfMonth, spentByCategory } from "@/lib/budget";
import { SafeToSpendGauge } from "@/components/SafeToSpendGauge";
import { EnvelopeCard } from "@/components/EnvelopeCard";
import { QuickAddModal } from "@/components/QuickAddModal";

export default function Dashboard() {
  const supabase = useMemo(() => createClient(), []);
  const [userId, setUserId] = useState<string | null>(null);
  const [income, setIncome] = useState(0);
  const [currency, setCurrency] = useState("USD");
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [online, setOnline] = useState(true);

  const month = firstOfMonth();

  // ── Initial load ──────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const [{ data: profile }, { data: b }, { data: t }] = await Promise.all([
        supabase.from("profiles").select("monthly_income, currency").eq("id", user.id).single(),
        supabase.from("budgets").select("*").eq("user_id", user.id),
        supabase
          .from("transactions")
          .select("*")
          .eq("user_id", user.id)
          .order("occurred_on", { ascending: false }),
      ]);

      if (profile) {
        setIncome(Number(profile.monthly_income));
        setCurrency(profile.currency ?? "USD");
      }
      setBudgets((b as Budget[]) ?? []);
      setTxns((t as Transaction[]) ?? []);
    })();
  }, [supabase]);

  // ── Flush the offline outbox when the network returns ─────
  const flushOutbox = useCallback(async () => {
    if (!navigator.onLine) return;
    for (const item of outbox.all()) {
      const { error } = await supabase
        .from("transactions")
        .upsert(item.payload, { onConflict: "user_id,client_uuid" });
      if (!error) {
        outbox.remove(item.client_uuid);
        setTxns((prev) =>
          prev.map((tx) =>
            tx.client_uuid === item.client_uuid ? { ...tx, pending: false } : tx,
          ),
        );
      }
    }
  }, [supabase]);

  useEffect(() => {
    const update = () => {
      setOnline(navigator.onLine);
      if (navigator.onLine) flushOutbox();
    };
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, [flushOutbox]);

  // ── Optimistic add ────────────────────────────────────────
  async function addTransaction(t: Omit<Transaction, "id" | "user_id">) {
    if (!userId) return;
    const optimistic: Transaction = {
      ...t,
      id: t.client_uuid!,
      user_id: userId,
      pending: true,
    };
    // 1) Instant UI update
    setTxns((prev) => [optimistic, ...prev]);
    if (navigator.vibrate) navigator.vibrate(10);

    const payload = { ...t, user_id: userId };
    outbox.add({ client_uuid: t.client_uuid!, payload });

    // 2) Sync (silently queues if offline)
    if (navigator.onLine) {
      const { data, error } = await supabase
        .from("transactions")
        .upsert(payload, { onConflict: "user_id,client_uuid" })
        .select()
        .single();
      if (!error && data) {
        outbox.remove(t.client_uuid!);
        setTxns((prev) =>
          prev.map((tx) =>
            tx.client_uuid === t.client_uuid ? { ...(data as Transaction) } : tx,
          ),
        );
      }
    }
  }

  const summary = useMemo(
    () => computeSummary(income, budgets, txns),
    [income, budgets, txns],
  );

  const fmt = (n: number) =>
    new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(n);

  const discretionaryCats = CATEGORIES.filter((c) => !FIXED_CATEGORIES.includes(c));

  return (
    <main className="mx-auto min-h-[100dvh] max-w-md px-5 pb-32 pt-[calc(env(safe-area-inset-top)+1.5rem)]">
      {/* Header */}
      <header className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm text-neutral-400">Current balance</p>
          <p className="text-3xl font-bold tabular-nums">{fmt(summary.balance)}</p>
        </div>
        <div
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${
            online ? "bg-neutral-900 text-neutral-400" : "bg-amber-500/15 text-amber-300"
          }`}
        >
          {online ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
          {online ? "Synced" : "Offline"}
        </div>
      </header>

      {/* Safe-to-spend gauge */}
      <section className="mb-6 rounded-3xl border border-neutral-900 bg-neutral-950 py-6">
        <SafeToSpendGauge
          daily={summary.safeToSpendDaily}
          month={summary.safeToSpendMonth}
          currency={currency}
        />
        {summary.buffer > 0 && (
          <p className="mt-2 text-center text-xs text-emerald-400">
            +{fmt(summary.buffer)} rolled over from last month
          </p>
        )}
      </section>

      {/* Stat row */}
      <section className="mb-8 grid grid-cols-3 gap-3">
        <Stat icon={TrendingUp} label="Income" value={fmt(summary.income)} tone="text-emerald-400" />
        <Stat icon={Landmark} label="Fixed" value={fmt(summary.fixedExpenses)} tone="text-sky-400" />
        <Stat icon={TrendingDown} label="Spent" value={fmt(summary.discretionarySpent)} tone="text-neutral-300" />
      </section>

      {/* Envelopes */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-neutral-400">Envelopes</h2>
        <div className="grid grid-cols-1 gap-3">
          {discretionaryCats.map((cat) => {
            const budget = budgets.find((b) => b.category === cat && b.month === month);
            return (
              <EnvelopeCard
                key={cat}
                category={cat}
                spent={spentByCategory(txns, cat, month)}
                limit={budget ? Number(budget.monthly_limit) : 0}
                currency={currency}
              />
            );
          })}
        </div>
      </section>

      {/* Floating action button — 56×56, well above the 44px min target */}
      <button
        onClick={() => setModalOpen(true)}
        aria-label="Add expense"
        className="fixed bottom-[calc(env(safe-area-inset-bottom)+1.5rem)] right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-black shadow-lg shadow-emerald-500/30 transition active:scale-90"
      >
        <Plus className="h-7 w-7" />
      </button>

      <QuickAddModal open={modalOpen} onOpenChange={setModalOpen} onSubmit={addTransaction} />
    </main>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-neutral-900 bg-neutral-950 p-3">
      <Icon className={`h-4 w-4 ${tone}`} />
      <p className="mt-2 text-[11px] uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}
