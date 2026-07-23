"use client";

import { useEffect, useState } from "react";
import { ArrowLeftRight, RefreshCw, Check, X, Pencil } from "lucide-react";
import { fetchRate } from "@/lib/fx";

const CURRENCIES = ["PHP", "USD", "EUR", "GBP", "JPY", "AUD", "CAD", "SAR"];

/**
 * Editable exchange-rate card, surfaced on the dashboard. Shows
 * 1 {currency} = X {secondary}. The rate can be pinned manually or pulled
 * live; changes persist to the profile.
 */
export function FxRateCard({
  currency,
  secondary,
  fxRate,
  onSave,
}: {
  currency: string;
  secondary: string | null;
  fxRate: number | null;
  onSave: (secondary: string | null, rate: number | null) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [sec, setSec] = useState(secondary || "PHP");
  const [rate, setRate] = useState(fxRate ? String(fxRate) : "");
  const [live, setLive] = useState<number | null>(null);
  const [fetching, setFetching] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSec(secondary || "PHP");
    setRate(fxRate ? String(fxRate) : "");
  }, [secondary, fxRate]);

  // Keep a live reference rate on hand for display + the "use live" action.
  useEffect(() => {
    let alive = true;
    if (!sec || sec === currency) {
      setLive(null);
      return;
    }
    fetchRate(currency, sec).then((r) => {
      if (alive) setLive(r);
    });
    return () => {
      alive = false;
    };
  }, [currency, sec]);

  const nf = (n: number) => new Intl.NumberFormat(undefined, { maximumFractionDigits: 3 }).format(n);
  const effective = fxRate ?? live;
  const isLive = fxRate == null;

  async function pullLive() {
    setFetching(true);
    const r = await fetchRate(currency, sec);
    setFetching(false);
    if (r) setRate(String(Number(r.toFixed(4))));
  }

  async function commit() {
    setSaving(true);
    await onSave(sec || null, rate.trim() ? parseFloat(rate) : null);
    setSaving(false);
    setEditing(false);
  }

  function cancel() {
    setSec(secondary || "PHP");
    setRate(fxRate ? String(fxRate) : "");
    setEditing(false);
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="flex w-full items-center gap-3 rounded-2xl border border-neutral-900 bg-neutral-950 p-4 text-left transition active:scale-[0.99]"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
          <ArrowLeftRight className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">Exchange rate</span>
            <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase ${isLive ? "bg-emerald-500/15 text-emerald-400" : "bg-neutral-800 text-neutral-400"}`}>
              {isLive ? "live" : "manual"}
            </span>
          </div>
          <p className="mt-0.5 truncate text-base font-semibold tabular-nums">
            {effective != null ? (
              <>1 {currency} = {nf(effective)} {sec}</>
            ) : (
              <span className="text-neutral-500">Tap to set a rate</span>
            )}
          </p>
        </div>
        <Pencil className="h-4 w-4 shrink-0 text-neutral-500" />
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-emerald-500/20 bg-neutral-950 p-4">
      <div className="mb-3 flex items-center gap-2 text-emerald-400">
        <ArrowLeftRight className="h-4 w-4" />
        <span className="text-[11px] font-semibold uppercase tracking-wide">Exchange rate</span>
      </div>

      <label className="mb-1 block text-xs text-neutral-500">Convert {currency} to</label>
      <select
        value={sec}
        onChange={(e) => setSec(e.target.value)}
        className="mb-3 h-11 w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 text-base text-white outline-none focus:border-emerald-500"
      >
        {CURRENCIES.filter((c) => c !== currency).map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>

      <label className="mb-1 block text-xs text-neutral-500">
        1 {currency} = ? {sec}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          inputMode="decimal"
          step="0.0001"
          min="0"
          placeholder={live != null ? `Live ${nf(live)}` : "Enter rate"}
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          className="h-11 flex-1 rounded-xl border border-neutral-800 bg-neutral-900 px-3 text-base text-white outline-none focus:border-emerald-500"
        />
        <button
          type="button"
          onClick={pullLive}
          disabled={fetching}
          className="flex h-11 items-center gap-1.5 rounded-xl border border-neutral-800 px-3 text-xs font-semibold text-emerald-400 active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${fetching ? "animate-spin" : ""}`} />
          Live
        </button>
      </div>
      <p className="mt-1.5 text-xs text-neutral-500">
        Leave blank to always use today&rsquo;s live rate.
      </p>

      <div className="mt-4 flex gap-2">
        <button
          onClick={commit}
          disabled={saving}
          className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-500 text-sm font-semibold text-black active:scale-[0.98] disabled:opacity-60"
        >
          <Check className="h-4 w-4" />
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          onClick={cancel}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-neutral-800 text-neutral-400 active:scale-95"
          aria-label="Cancel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
