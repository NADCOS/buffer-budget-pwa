export const CATEGORIES = [
  "Food",
  "Rent",
  "Transport",
  "Fun",
  "Utilities",
  "Miscellaneous",
] as const;

export type Category = (typeof CATEGORIES)[number];

/** Categories that are recurring/fixed rather than discretionary. */
export const FIXED_CATEGORIES: Category[] = ["Rent", "Utilities"];

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  currency: string;
  monthly_income: number;
}

export interface Budget {
  id: string;
  user_id: string;
  category: Category;
  monthly_limit: number;
  is_fixed: boolean;
  month: string; // ISO date (1st of month)
}

export interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  category: Category;
  description: string | null;
  occurred_on: string; // ISO date
  client_uuid: string | null;
  created_at?: string;
  /** UI-only: set on optimistic rows that have not confirmed with the server. */
  pending?: boolean;
}
