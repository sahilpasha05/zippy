import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Money is shown exactly: a 50/50 split of an odd total lands on .5, and
// rounding that to the rupee misreports what was actually charged or collected.
// Whole amounts stay clean (₹240, not ₹240.00).
export function formatMoney(value: number | string | null | undefined): string {
  const n = Number(value ?? 0)
  if (!Number.isFinite(n)) return '0'
  return Number.isInteger(n) ? String(n) : n.toFixed(2)
}
