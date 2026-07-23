import type { ComponentType } from "react";
import { Utensils, Home, Bus, PartyPopper, Zap, Package } from "lucide-react";
import type { Category } from "@/lib/types";

export const CATEGORY_ICONS: Record<Category, ComponentType<{ className?: string }>> = {
  Food: Utensils,
  Rent: Home,
  Transport: Bus,
  Fun: PartyPopper,
  Utilities: Zap,
  Miscellaneous: Package,
};

/** Distinct hue per category for the breakdown chart. */
export const CATEGORY_COLORS: Record<Category, string> = {
  Food: "#34d399",
  Rent: "#60a5fa",
  Transport: "#fbbf24",
  Fun: "#f472b6",
  Utilities: "#22d3ee",
  Miscellaneous: "#a78bfa",
};
