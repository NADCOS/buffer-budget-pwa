/**
 * Live FX rate lookup with a localStorage fallback so conversions still work
 * offline. Uses the free, key-less open.er-api.com endpoint.
 */
export async function fetchRate(base: string, quote: string): Promise<number | null> {
  if (!base || !quote) return null;
  if (base === quote) return 1;
  const key = `fx.${base}.${quote}`;
  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/${base}`, { cache: "no-store" });
    if (res.ok) {
      const j = await res.json();
      const r = j?.rates?.[quote];
      if (typeof r === "number" && r > 0) {
        try {
          localStorage.setItem(key, JSON.stringify({ r, t: Date.now() }));
        } catch {}
        return r;
      }
    }
  } catch {}
  // Fall back to the last cached rate.
  try {
    const cached = JSON.parse(localStorage.getItem(key) || "null");
    if (cached?.r) return cached.r as number;
  } catch {}
  return null;
}
