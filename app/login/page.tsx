"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, MailCheck, Wallet } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("");

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus("sending");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setStatus("error");
      setMessage(error.message);
    } else {
      setStatus("sent");
    }
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

        {status === "sent" ? (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
            <MailCheck className="mx-auto mb-3 h-8 w-8 text-emerald-400" />
            <p className="font-medium">Check your inbox</p>
            <p className="mt-1 text-sm text-neutral-300">
              We sent a magic link to{" "}
              <span className="font-medium text-white">{email}</span>.
            </p>
          </div>
        ) : (
          <form onSubmit={sendMagicLink} className="space-y-4">
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

            <button
              type="submit"
              disabled={status === "sending"}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 text-base font-semibold text-black transition active:scale-[0.98] disabled:opacity-60"
            >
              {status === "sending" ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Sending…
                </>
              ) : (
                "Send magic link"
              )}
            </button>

            {status === "error" && (
              <p className="text-center text-sm text-red-400">{message}</p>
            )}
            <p className="pt-2 text-center text-xs text-neutral-500">
              No passwords. We email you a secure sign-in link.
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
