"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Loader2, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { CATEGORIES, FIXED_CATEGORIES, type Budget, type Category } from "@/lib/types";
import { firstOfMonth } from "@/lib/budget";

const CURRENCIES = ["USD", "EUR", "GBP", "PHP", "JPY", "AUD", "CAD", "SAR"];

export default function SettingsPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const month = firstOfMonth();

  const [userId, setUserId] = useState<string | null>(null);
  const [income, setIncome] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [limits, setLimits] = useState<Record<Category, string>>(
    () => Object.fromEntries(CATEGORIES.map((c) => [c, ""])) as Record<Category, string>,
  );
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const [{ data: profile }, { data: budgets }] = await Promise.all([
        supabase.from("profiles").select("monthly_income, currency").eq("id", user.id).single(),
        supabase.from("budgets").select("*").eq("user_id", user.id).eq("month", month),
      ]);

      if (profile) {
        setIncome(String(profile.monthly_income ?? ""));
        setCurrency(profile.currency ?? "USD");
      }
      const map = Object.fromEntries(CATEGORIES.map((c) => [c, ""])) as Record<Category, string>;
      (budgets as Budget[] | null)?.forEach((b) => {
        map[b.category] = String(b.monthly_limit);
      });
      setLimits(map);
      setLoading(false);
    })();
  }, [supabase, month]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setStatus("saving");

    await supabase.from("profiles").upsert({
      id: userId,
      monthly_income: parseFloat(income) || 0,
      currency,
      updated_at: new Date().toISOString(),
    });

    const rows = CATEGORIES.map((c) => ({
      user_id: userId,
      category: c,
      monthly_limit: parseFloat(limits[c]) || 0,
      is_fixed: FIXED_CATEGORIES.includes(c),
      month,
    }));
    await supabase.from("budgets").upsert(rows, { onConflict: "user_id,category,month" });

    setStatus("saved");
    setTimeout(() => setStatus("idle"), 1500);
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  const inputCls =
    "h-12 w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 text-base text-white outline-none focus:border-emerald-500";

  return (
    <main className="mx-auto min-h-[100dvh] max-w-md px-5 pb-32 pt-[calc(env(safe-area-inset-top)+1.25rem)]">
      <header className="mb-6 flex items-center gap-3">
        <Link
          href="/"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-900 text-neutral-300"
          aria-label="Back to dashboard"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-semibold">Settings</h1>
      </header>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-neutral-500" />
        </div>
      ) : (
        <form onSubmit={save} className="space-y-8">
          <section>
            <h2 className="mb-3 text-sm font-semibold text-neutral-400">Income</h2>
            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-xs text-neutral-500">Monthly income</label>
                <input
                  type="number" inputMode="decimal" step="0.01" min="0"
                  placeholder="0.00" value={income}
                  onChange={(e) => setIncome(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-neutral-500">Currency</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className={inputCls}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-1 text-sm font-semibold text-neutral-400">Monthly budgets</h2>
            <p className="mb-3 text-xs text-neutral-500">
              Rent &amp; Utilities are fixed expenses; the rest are discretionary.
            </p>
            <div className="space-y-3">
              {CATEGORIES.map((c) => (
                <div key={c} className="flex items-center gap-3">
                  <label className="w-32 shrink-0 text-sm">
                    {c}
                    {FIXED_CATEGORIES.includes(c) && (
                      <span className="ml-1 text-[10px] uppercase text-sky-400">fixed</span>
                    )}
                  </label>
                  <input
                    type="number" inputMode="decimal" step="0.01" min="0"
                    placeholder="0.00" value={limits[c]}
                    onChange={(e) => setLimits((p) => ({ ...p, [c]: e.target.value }))}
                    className={inputCls}
                  />
                </div>
              ))}
            </div>
          </section>

          <button
            type="submit"
            disabled={status === "saving"}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 text-base font-semibold text-black transition active:scale-[0.98] disabled:opacity-60"
          >
            {status === "saving" ? (
              <><Loader2 className="h-5 w-5 animate-spin" />Saving…</>
            ) : status === "saved" ? (
              <><Check className="h-5 w-5" />Saved</>
            ) : (
              "Save changes"
            )}
          </button>

          <button
            type="button"
            onClick={signOut}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-neutral-800 text-sm font-medium text-neutral-400 transition active:scale-[0.98]"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </form>
      )}
    </main>
  );
}