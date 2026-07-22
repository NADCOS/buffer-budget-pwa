"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Wallet } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "working">("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setStatus("working");
    setError("");

    const supabase = createClient();

    // Try to sign in first.
    let { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    // If the account doesn't exist yet, create it (no separate signup screen).
    if (signInError && /invalid login credentials/i.test(signInError.message)) {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });
      if (signUpError) {
        setStatus("idle");
        setError(signUpError.message);
        return;
      }
      // Sign in immediately after creating the account.
      ({ error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      }));
    }

    if (signInError) {
      setStatus("idle");
      setError(signInError.message);
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <main className="flex min-h-[100dvh] flex-col justify-center bg-black px-6 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] text-white">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-10 flex flex-col items-center text-center">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 ring-1 ring-emerald-500/30">
            <Wallet className="h-8 w-8 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Buffer</h1>
          <p className="mt-2 text-sm text-neutral-400">
            Know exactly what&apos;s safe to spend today.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="email" className="sr-only">
              Email address
            </label>
            <input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-14 w-full rounded-2xl border border-neutral-800 bg-neutral-900 px-4 text-base text-white outline-none transition placeholder:text-neutral-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>

          <div>
            <label htmlFor="password" className="sr-only">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              minLength={6}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-14 w-full rounded-2xl border border-neutral-800 bg-neutral-900 px-4 text-base text-white outline-none transition placeholder:text-neutral-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>

          <button
            type="submit"
            disabled={status === "working"}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 text-base font-semibold text-black transition active:scale-[0.98] disabled:opacity-60"
          >
            {status === "working" ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Signing in…
              </>
            ) : (
              "Continue"
            )}
          </button>

          {error && <p className="text-center text-sm text-red-400">{error}</p>}
          <p className="pt-2 text-center text-xs text-neutral-500">
            First time? Just enter an email and password — your account is created
            automatically.
          </p>
        </form>
      </div>
    </main>
  );
}