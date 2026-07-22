import {
  type Budget,
  type Category,
  type Transaction,
  FIXED_CATEGORIES,
} from "./types";

export function firstOfMonth(d = new Date()): string {
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

export function daysLeftInMonth(d = new Date()): number {
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return Math.max(1, end.getDate() - d.getDate() + 1);
}

function inMonth(iso: string, monthStart: string): boolean {
  return iso.slice(0, 7) === monthStart.slice(0, 7);
}

/** Total spent in a single category for the given month. */
export function spentByCategory(
  txns: Transaction[],
  category: Category,
  monthStart: string,
): number {
  return txns
    .filter((t) => t.category === category && inMonth(t.occurred_on, monthStart))
    .reduce((sum, t) => sum + Number(t.amount), 0);
}

/** Envelope usage ratio (0–1+) and an alert level. */
export function envelopeStatus(spent: number, limit: number) {
  const ratio = limit > 0 ? spent / limit : 0;
  const level: "ok" | "warn" | "danger" =
    ratio >= 0.9 ? "danger" : ratio >= 0.75 ? "warn" : "ok";
  return { ratio, level, remaining: Math.max(0, limit - spent) };
}

/**
 * Rolling buffer: unspent discretionary money from the *previous* month.
 * Discretionary = every non-fixed category. Clamped at 0 (no negative rollover).
 */
export function rolloverBuffer(
  budgets: Budget[],
  txns: Transaction[],
  currentMonth: string,
): number {
  const d = new Date(currentMonth);
  const prevMonth = firstOfMonth(new Date(d.getFullYear(), d.getMonth() - 1, 1));

  const discretionaryLimit = budgets
    .filter((b) => !b.is_fixed && inMonth(b.month, prevMonth))
    .reduce((s, b) => s + Number(b.monthly_limit), 0);

  const discretionarySpent = txns
    .filter(
      (t) =>
        !FIXED_CATEGORIES.includes(t.category) && inMonth(t.occurred_on, prevMonth),
    )
    .reduce((s, t) => s + Number(t.amount), 0);

  return Math.max(0, discretionaryLimit - discretionarySpent);
}

export interface DashboardSummary {
  balance: number;
  income: number;
  fixedExpenses: number;
  discretionaryBudget: number;
  discretionarySpent: number;
  buffer: number;
  safeToSpendMonth: number;
  safeToSpendDaily: number;
}

/** Everything the dashboard needs, derived from raw rows. */
export function computeSummary(
  income: number,
  budgets: Budget[],
  txns: Transaction[],
  now = new Date(),
): DashboardSummary {
  const month = firstOfMonth(now);

  const fixedExpenses = budgets
    .filter((b) => b.is_fixed && inMonth(b.month, month))
    .reduce((s, b) => s + Number(b.monthly_limit), 0);

  const discretionaryBudget = budgets
    .filter((b) => !b.is_fixed && inMonth(b.month, month))
    .reduce((s, b) => s + Number(b.monthly_limit), 0);

  const discretionarySpent = txns
    .filter(
      (t) => !FIXED_CATEGORIES.includes(t.category) && inMonth(t.occurred_on, month),
    )
    .reduce((s, t) => s + Number(t.amount), 0);

  const totalSpent = txns
    .filter((t) => inMonth(t.occurred_on, month))
    .reduce((s, t) => s + Number(t.amount), 0);

  const buffer = rolloverBuffer(budgets, txns, month);

  const safeToSpendMonth = Math.max(
    0,
    discretionaryBudget + buffer - discretionarySpent,
  );
  const safeToSpendDaily = safeToSpendMonth / daysLeftInMonth(now);

  return {
    balance: income - totalSpent,
    income,
    fixedExpenses,
    discretionaryBudget,
    discretionarySpent,
    buffer,
    safeToSpendMonth,
    safeToSpendDaily,
  };
}
