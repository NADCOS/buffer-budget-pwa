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
