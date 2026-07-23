import type { Category } from "./types";

/** Original short lines — rotate one per calendar day. */
export const MONEY_QUOTES: string[] = [
  "Every coin you save today is a choice your future self will thank you for.",
  "Wealth is built in small, boring, repeated deposits — not lucky breaks.",
  "Pay yourself first: save before you spend, not what's left after.",
  "The best time to start investing was years ago. The second best is today.",
  "Money saved quietly becomes freedom loudly.",
  "Don't work for money alone — put your money to work for you.",
  "A budget isn't a limit on your life; it's a plan for the life you want.",
  "Small leaks sink big ships. Watch the little expenses.",
  "Spend less than you earn, invest the difference, repeat.",
  "Your savings rate matters more than your salary.",
  "Delayed gratification is the price of financial freedom.",
  "Compound growth rewards the patient.",
  "Build the emergency fund first — peace of mind is a great return.",
  "What gets measured gets improved. Track every coin.",
  "Discipline today buys options tomorrow.",
  "The goal isn't to be rich for a day, but secure for a lifetime.",
  "Invest in things that pay you while you sleep.",
  "Future you is counting on the deposit you make right now.",
  "Automate your savings so willpower never gets a vote.",
  "Don't save what's left after spending; spend what's left after saving.",
  "Cutting one daily expense can fund a yearly investment.",
  "A small habit repeated for years beats a big effort done once.",
  "You don't need more income to start — you need to start.",
  "Treat your savings like a bill you must pay yourself.",
  "Every peso invested today is a worker hired for your future.",
  "Emergencies are certain; an emergency fund makes them survivable.",
  "Patience turns small savings into large freedom.",
  "The market rewards those who stay in their seats.",
  "Rich is having money; wealthy is having time — buy back your time.",
  "The habit is the asset. Build the habit first.",
  "Financial freedom is built one boring deposit at a time.",
];

/** Deterministic quote for a given calendar day (timezone-safe). */
export function dailyQuote(d = new Date()): string {
  const idx = d.getFullYear() * 372 + d.getMonth() * 31 + d.getDate();
  return MONEY_QUOTES[idx % MONEY_QUOTES.length];
}

export interface InsightInput {
  income: number;
  savedThisMonth: number;
  savingsTotal: number;
  creditsRemaining: number;
  hasCredits: boolean;
  safeToSpendDaily: number;
  discretionarySpent: number;
  discretionaryBudget: number;
  topCategory: { category: Category; amount: number } | null;
  overspent: { category: Category; over: number }[];
  fmt: (n: number) => string;
}

/** Data-driven nudges — spending first, then saving + investing. */
export function buildInsights(i: InsightInput): string[] {
  const out: string[] = [];

  // ── Spending ────────────────────────────────────────────
  for (const o of i.overspent) {
    out.push(`You're ${i.fmt(o.over)} over budget on ${o.category}. Ease off to protect your savings.`);
  }

  if (i.discretionaryBudget > 0) {
    const pct = Math.round((i.discretionarySpent / i.discretionaryBudget) * 100);
    out.push(`You've spent ${i.fmt(i.discretionarySpent)} of your ${i.fmt(i.discretionaryBudget)} spending budget (${pct}%).`);
  }

  if (i.topCategory && i.topCategory.amount > 0) {
    out.push(`Biggest spend this month: ${i.topCategory.category} at ${i.fmt(i.topCategory.amount)}. Trim 10% and save it.`);
  }

  // ── Saving + investing ──────────────────────────────────
  if (i.income > 0) {
    const rate = i.savedThisMonth / i.income;
    if (i.savedThisMonth > 0) {
      out.push(`You've saved ${i.fmt(i.savedThisMonth)} this month — ${Math.round(rate * 100)}% of your income.`);
      if (rate < 0.2) {
        out.push(`Aiming for 20% would mean setting aside ${i.fmt(Math.round(i.income * 0.2))} a month.`);
      } else {
        out.push(`Great rate — consider investing part of it so it compounds.`);
      }
    } else {
      out.push(`No savings logged this month. Even ${i.fmt(Math.round(i.income * 0.1))} (10%) builds the habit.`);
    }
  }

  if (i.creditsRemaining > 0) {
    out.push(`Clearing ${i.fmt(i.creditsRemaining)} of credits frees that cash for investing.`);
  } else if (i.hasCredits) {
    out.push(`Debt-free — redirect those old payments straight into savings.`);
  }

  if (i.savingsTotal > 0) {
    out.push(`Your ${i.fmt(i.savingsTotal)} could be growing. A low-cost index fund is a common first step.`);
  }

  if (i.safeToSpendDaily > 0) {
    out.push(`Staying under ${i.fmt(i.safeToSpendDaily)}/day keeps this month on track.`);
  }

  return out;
}
