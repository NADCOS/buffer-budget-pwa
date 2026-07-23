"use client";

import { useEffect, useState } from "react";
import { Logo } from "./Logo";

/**
 * Brief branded splash shown on a full page load. Pulses the logo, then fades
 * out and unmounts. Purely visual — never blocks interaction for long.
 */
export function SplashScreen() {
  const [phase, setPhase] = useState<"in" | "out" | "gone">("in");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("out"), 850);
    const t2 = setTimeout(() => setPhase("gone"), 1250);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (phase === "gone") return null;

  return (
    <div
      aria-hidden
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black transition-opacity duration-300"
      style={{ opacity: phase === "out" ? 0 : 1, pointerEvents: phase === "out" ? "none" : "auto" }}
    >
      <div className="relative flex h-24 w-24 items-center justify-center">
        <span
          className="absolute h-20 w-20 rounded-3xl border-2 border-emerald-500/50"
          style={{ animation: "ringPulse 1.4s ease-out infinite" }}
        />
        <span
          className="absolute h-20 w-20 rounded-3xl border-2 border-emerald-500/50"
          style={{ animation: "ringPulse 1.4s ease-out infinite", animationDelay: "0.5s" }}
        />
        <div style={{ animation: "logoPop 0.5s ease-out both" }}>
          <Logo size={60} priority />
        </div>
      </div>
      <p className="mt-5 text-sm font-semibold tracking-[0.2em] text-neutral-500">BUFFER</p>
    </div>
  );
}
