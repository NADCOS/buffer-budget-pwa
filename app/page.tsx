"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Plus,
  TrendingUp,
  TrendingDown,
  Wallet,
  Wifi,
  WifiOff,
  Settings,
  ChevronLeft,
  ChevronRight,
  Receipt,
  CreditCard,
  PiggyBank,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { outbox } from "@/lib/offline-queue";
import { CATEGORIES, FIXED_CATEGORIES, type Budget, type Transaction, type Credit, type Account } from "@/lib/types";
import {
  computeSummary,
  firstOfMonth,
  spentByCategory,
  monthLabel,
  addMonths,
  isCurrentMonth,
  daysInMonth,
  daysLeftInMonth,
} from "@/lib/budget";
import { SafeToSpendGauge } from "@/components/SafeToSpendGauge";
import { EnvelopeCard } from "@/components/EnvelopeCard";
import { TransactionRow } from "@/components/TransactionRow";
import { QuickAddModal, type TxnDraft } from "@/components/QuickAddModal";

export default function Dashboard() {
  const supabase = useMemo(() => createClient(), []);
  const [userId, setUserId] = useState<string | null>(null);
  const [income, setIncome] = useState(0);
  const [currency, setCurrency] = useState("USD");
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [credits, setCredits] = useState<Credit[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [online, setOnline] = useState(true);
  const [queued, setQueued] = useState(0);
  const [loading, setLoading] = useState(true);

  // The month currently in view (defaults to this month).
  const [month, setMonth] = useState(() => firstOfMonth());
  const atCurrentMonth = isCurrentMonth(month);

  const refreshQueued = useCallback(() => setQueued(outbox.all().length), []);

  // ── Load everything (re-runnable for realtime + refocus) ──
  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const [{ data: profile }, { data: b }, { data: t }, { data: cr }, { data: ac }] = await Promise.all([
      supabase.from("profiles").select("monthly_income, currency").eq("id", user.id).single(),
      supabase.from("budgets").select("*").eq("user_id", user.id),
      supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("occurred_on", { ascending: false }),
      supabase.from("credits").select("*").eq("user_id", user.id).order("created_at"),
      supabase.from("accounts").select("*").eq("user_id", user.id).order("created_at"),
    ]);

    if (profile) {
      setIncome(Number(profile.monthly_income));
      setCurrency(profile.currency ?? "USD");
    }
    setBudgets((b as Budget[]) ?? []);
    setTxns((t as Transaction[]) ?? []);
    setCredits((cr as Credit[]) ?? []);
    setAccounts((ac as Account[]) ?? []);
    setLoading(false);
    refreshQueued();
  }, [supabase, refreshQueued]);

  useEffect(() => {
    load();
  }, [load]);

  // ── Live cross-device sync ────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`sync-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transactions", filter: `user_id=eq.${userId}` },
        () => load(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "budgets", filter: `user_id=eq.${userId}` },
        () => load(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles", filter: `id=eq.${userId}` },
        () => load(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "credits", filter: `user_id=eq.${userId}` },
        () => load(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "accounts", filter: `user_id=eq.${userId}` },
        () => load(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, userId, load]);

  // Refetch whenever the app regains focus.
  useEffect(() => {
    const onFocus = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onFocus);
    window.addEventListener("focus", onFocus);
    return () => {
      document.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener("focus", onFocus);
    };
  }, [load]);

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
          prev.map((tx) => (tx.client_uuid === item.client_uuid ? { ...tx, pending: false } : tx)),
        );
      }
    }
    refreshQueued();
  }, [supabase, refreshQueued]);

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

  // ── Create / edit a transaction (optimistic) ──────────────
  async function saveTransaction(draft: TxnDraft) {
    if (!userId) return;
    if (navigator.vibrate) navigator.vibrate(10);

    const base = {
      amount: draft.amount,
      category: draft.category,
      description: draft.description,
      occurred_on: draft.occurred_on,
      client_uuid: draft.client_uuid,
    };

    // EDIT — update an existing row in place.
    if (draft.id) {
      const optimistic: Transaction = { ...base, id: draft.id, user_id: userId, pending: true };
      setTxns((prev) => prev.map((t) => (t.id === draft.id ? optimistic : t)));
      if (navigator.onLine) {
        const res = base.client_uuid
          ? await supabase
              .from("transactions")
              .upsert({ ...base, user_id: userId }, { onConflict: "user_id,client_uuid" })
              .select()
              .single()
          : await supabase.from("transactions").update(base).eq("id", draft.id).select().single();
        if (!res.error && res.data) {
          setTxns((prev) => prev.map((t) => (t.id === draft.id ? (res.data as Transaction) : t)));
        }
      }
      return;
    }

    // ADD — new row, queued to the outbox for offline safety.
    const optimistic: Transaction = { ...base, id: base.client_uuid, user_id: userId, pending: true };
    setTxns((prev) => [optimistic, ...prev]);
    const payload = { ...base, user_id: userId };
    outbox.add({ client_uuid: base.client_uuid, payload });
    refreshQueued();

    if (navigator.onLine) {
      const { data, error } = await supabase
        .from("transactions")
        .upsert(payload, { onConflict: "user_id,client_uuid" })
        .select()
        .single();
      if (!error && data) {
        outbox.remove(base.client_uuid);
        refreshQueued();
        setTxns((prev) =>
          prev.map((tx) => (tx.client_uuid === base.client_uuid ? (data as Transaction) : tx)),
        );
      }
    }
  }

  async function deleteTransaction(t: Transaction) {
    if (navigator.vibrate) navigator.vibrate(10);
    setTxns((prev) => prev.filter((x) => x.id !== t.id));
    if (t.client_uuid) outbox.remove(t.client_uuid);
    refreshQueued();
    if (navigator.onLine) await supabase.from("transactions").delete().eq("id", t.id);
  }

  function openAdd() {
    setEditing(null);
    setModalOpen(true);
  }
  function openEdit(t: Transaction) {
    setEditing(t);
    setModalOpen(true);
  }

  const summary = useMemo(() => computeSummary(income, budgets, txns, month), [income, budgets, txns, month]);
  const days = atCurrentMonth ? daysLeftInMonth() : daysInMonth(month);

  const fmt = (n: number) =>
    new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(n);

  const discretionaryCats = CATEGORIES.filter((c) => !FIXED_CATEGORIES.includes(c));
  const envelopes = discretionaryCats
    .map((cat) => {
      const budget = budgets.find((b) => b.category === cat && b.month === month);
      return { cat, limit: budget ? Number(budget.monthly_limit) : 0 };
    })
    .filter((e) => e.limit > 0);

  const monthTxns = useMemo(
    () => txns.filter((t) => t.occurred_on.slice(0, 7) === month.slice(0, 7)),
    [txns, month],
  );

  const needsSetup = !loading && income === 0 && budgets.length === 0;

  const creditsRemaining = credits.reduce(
    (s, c) => s + Math.max(0, Number(c.total_amount) - Number(c.paid_amount)),
    0,
  );
  const savingsTotal = accounts.reduce((s, a) => s + Number(a.balance), 0);

  return (
    <main className="mx-auto min-h-[100dvh] max-w-md px-5 pb-32 pt-[calc(env(safe-area-inset-top)+1.5rem)]">
      {/* Header: month switcher + connection + settings */}
      <header className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMonth((m) => addMonths(m, -1))}
            aria-label="Previous month"
            className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-400 active:bg-neutral-900"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="min-w-[7.5rem] text-center text-base font-semibold">{monthLabel(month)}</span>
          <button
            onClick={() => setMonth((m) => addMonths(m, 1))}
            disabled={atCurrentMonth}
            aria-label="Next month"
            className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-400 active:bg-neutral-900 disabled:opacity-25"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${
              online ? "bg-neutral-900 text-neutral-400" : "bg-amber-500/15 text-amber-300"
            }`}
          >
            {online ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
            {online ? "Synced" : queued > 0 ? `${queued} queued` : "Offline"}
          </div>
          <Link
            href="/settings"
            aria-label="Settings"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-neutral-900 text-neutral-300"
          >
            <Settings className="h-5 w-5" />
          </Link>
        </div>
      </header>

      {loading ? (
        <LoadingState />
      ) : needsSetup ? (
        <SetupCard />
      ) : (
        <>
          {/* Safe-to-spend gauge (hero) */}
          <section className="mb-6 rounded-3xl border border-neutral-900 bg-neutral-950 py-6">
            <SafeToSpendGauge
              daily={summary.safeToSpendDaily}
              month={summary.safeToSpendMonth}
              currency={currency}
              days={days}
              isCurrent={atCurrentMonth}
            />
            {summary.buffer > 0 && (
              <p className="mt-2 text-center text-xs text-emerald-400">
                +{fmt(summary.buffer)} rolled over from last month
              </p>
            )}
          </section>

          {/* Stat row — balance is now here, not competing with the gauge */}
          <section className="mb-8 grid grid-cols-3 gap-3">
            <Stat icon={Wallet} label="Balance" value={fmt(summary.balance)} tone="text-neutral-100" />
            <Stat icon={TrendingUp} label="Income" value={fmt(summary.income)} tone="text-emerald-400" />
            <Stat icon={TrendingDown} label="Spent" value={fmt(summary.discretionarySpent)} tone="text-sky-400" />
          </section>

          {/* Credits + savings quick access */}
          <section className="mb-8 grid grid-cols-2 gap-3">
            <Link
              href="/credits"
              className="rounded-2xl border border-neutral-900 bg-neutral-950 p-4 transition active:scale-[0.98]"
            >
              <div className="flex items-center gap-1.5 text-neutral-400">
                <CreditCard className="h-4 w-4" />
                <span className="text-xs font-medium">Online credits</span>
              </div>
              <p className="mt-2 truncate text-xl font-bold tabular-nums text-red-400">{fmt(creditsRemaining)}</p>
              <p className="text-[11px] text-neutral-500">left to pay</p>
            </Link>
            <Link
              href="/savings"
              className="rounded-2xl border border-neutral-900 bg-neutral-950 p-4 transition active:scale-[0.98]"
            >
              <div className="flex items-center gap-1.5 text-neutral-400">
                <PiggyBank className="h-4 w-4" />
                <span className="text-xs font-medium">Savings</span>
              </div>
              <p className="mt-2 truncate text-xl font-bold tabular-nums text-emerald-400">{fmt(savingsTotal)}</p>
              <p className="text-[11px] text-neutral-500">total saved</p>
            </Link>
          </section>

          {/* Envelopes */}
          <section className="mb-8">
            <h2 className="mb-3 text-sm font-semibold text-neutral-400">Envelopes</h2>
            {envelopes.length > 0 ? (
              <div className="grid grid-cols-1 gap-3">
                {envelopes.map(({ cat, limit }) => (
                  <EnvelopeCard
                    key={cat}
                    category={cat}
                    spent={spentByCategory(txns, cat, month)}
                    limit={limit}
                    currency={currency}
                  />
                ))}
              </div>
            ) : (
              <EmptyCard
                text="No envelopes set for this month."
                cta={atCurrentMonth ? { href: "/settings", label: "Set budgets" } : undefined}
              />
            )}
          </section>

          {/* Recent transactions */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-neutral-400">Recent</h2>
              {monthTxns.length > 0 && (
                <span className="text-xs text-neutral-600">{monthTxns.length} this month</span>
              )}
            </div>
            {monthTxns.length > 0 ? (
              <div className="grid grid-cols-1 gap-2">
                {monthTxns.map((t) => (
                  <TransactionRow
                    key={t.id}
                    txn={t}
                    currency={currency}
                    onEdit={openEdit}
                    onDelete={deleteTransaction}
                  />
                ))}
              </div>
            ) : (
              <EmptyCard icon={Receipt} text="No expenses logged this month yet." />
            )}
          </section>
        </>
      )}

      {/* Floating action button — 56×56 */}
      <button
        onClick={openAdd}
        aria-label="Add expense"
        className="fixed bottom-[calc(env(safe-area-inset-bottom)+1.5rem)] right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-black shadow-lg shadow-emerald-500/30 transition active:scale-90"
      >
        <Plus className="h-7 w-7" />
      </button>

      <QuickAddModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSubmit={saveTransaction}
        onDelete={deleteTransaction}
        editing={editing}
        currency={currency}
      />
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
      <p className="truncate text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function EmptyCard({
  icon: Icon,
  text,
  cta,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  text: string;
  cta?: { href: string; label: string };
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-neutral-800 bg-neutral-950 px-5 py-8 text-center">
      {Icon && <Icon className="h-6 w-6 text-neutral-600" />}
      <p className="text-sm text-neutral-500">{text}</p>
      {cta && (
        <Link
          href={cta.href}
          className="rounded-full bg-neutral-900 px-4 py-2 text-xs font-semibold text-emerald-400"
        >
          {cta.label}
        </Link>
      )}
    </div>
  );
}

function SetupCard() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-3xl border border-neutral-900 bg-neutral-950 px-6 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400">
        <Wallet className="h-7 w-7" />
      </div>
      <div>
        <h2 className="text-lg font-semibold">Set up your budget</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Add your monthly income and category limits to start tracking safe-to-spend.
        </p>
      </div>
      <Link
        href="/settings"
        className="mt-2 rounded-2xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-black"
      >
        Get started
      </Link>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="animate-pulse">
      <div className="mb-6 flex h-72 items-center justify-center rounded-3xl border border-neutral-900 bg-neutral-950">
        <div className="h-40 w-40 rounded-full border-[14px] border-neutral-900" />
      </div>
      <div className="mb-8 grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-20 rounded-2xl border border-neutral-900 bg-neutral-950" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-20 rounded-2xl border border-neutral-900 bg-neutral-950" />
        ))}
      </div>
    </div>
  );
}
