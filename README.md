# Buffer — Safe-to-Spend Budgeting PWA

A secure, personal, cloud-synced budgeting PWA. Next.js (App Router, TS) · Tailwind · Radix UI · Lucide · Supabase.

## Setup

```bash
npm install
cp .env.local.example .env.local   # fill in your Supabase URL + anon key
```

1. **Create a Supabase project** → Settings → API → copy the `URL` and `anon` key into `.env.local`.
2. **Run the schema**: Supabase Dashboard → SQL Editor → paste `supabase/schema.sql` → Run.
   This creates `profiles`, `budgets`, `transactions`, RLS policies, the signup trigger, and the `rollover_buffer` RPC.
3. **Enable magic links**: Authentication → Providers → Email → enable "Email OTP / Magic Link".
   Add `http://localhost:3000/auth/callback` (and your prod URL) under Auth → URL Configuration → Redirect URLs.
4. **Add icons** to `/public/icons/`: `icon-192.png`, `icon-512.png`, `maskable-192.png`, `maskable-512.png`, `apple-touch-icon.png`.
5. `npm run dev` → open http://localhost:3000

## Seeding a budget

The dashboard reads envelope limits from the `budgets` table. Insert rows per category/month, e.g.:

```sql
insert into budgets (user_id, category, monthly_limit, is_fixed, month) values
  (auth.uid(), 'Rent',          1500, true,  date_trunc('month', now())::date),
  (auth.uid(), 'Utilities',      180, true,  date_trunc('month', now())::date),
  (auth.uid(), 'Food',           500, false, date_trunc('month', now())::date),
  (auth.uid(), 'Transport',      150, false, date_trunc('month', now())::date),
  (auth.uid(), 'Fun',            250, false, date_trunc('month', now())::date),
  (auth.uid(), 'Miscellaneous',  120, false, date_trunc('month', now())::date);

update profiles set monthly_income = 4200 where id = auth.uid();
```

## Architecture notes

- **Auth gate** — `middleware.ts` refreshes the Supabase session on every request and redirects unauthenticated users to `/login`.
- **Rolling buffer** — computed both client-side (`lib/budget.ts → rolloverBuffer`) for instant UI and server-side (`rollover_buffer` RPC) as the source of truth. Unspent discretionary money from last month is clamped at ≥ 0 and added to this month's safe-to-spend.
- **Envelope safeguards** — `envelopeStatus()` returns `warn` at 75% and `danger` (red + `animate-pulse`) at 90%.
- **Offline resilience** — new transactions render instantly (optimistic), are written to a localStorage outbox (`lib/offline-queue.ts`), upserted with a `client_uuid` (unique per user for idempotent de-dupe), and flushed on the `online` event.
- **PWA** — `app/manifest.ts` (standalone display, black theme), `public/sw.js` (network-first navigations, cache-first shell, never caches Supabase), `viewport-fit=cover` + safe-area insets for the notch.
- **Tap targets** — FAB is 56×56; all buttons/inputs are ≥ 48px tall.
