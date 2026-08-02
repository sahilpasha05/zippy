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

// "min ago" is fine for a fresh order but stops being useful once a shift or
// a day has passed — this gives the actual calendar date and clock time to
// pin down exactly when an order was placed, in the shop's local time.
export function formatDateTime(d: string): string {
  return new Date(d).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}
