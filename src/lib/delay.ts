// An order that is still open this many minutes after it was placed counts as delayed.
// Used by the small "delayed orders" strips on the delivery and restaurant panels.
export const DELAYED_AFTER_MIN = 50
// Anything older than this is a stuck old record rather than a live delay.
export const DELAYED_MAX_AGE_MIN = 24 * 60

export function delayedMinutes(placedAt: string | number | Date, nowMs: number): number {
  return Math.floor((nowMs - new Date(placedAt).getTime()) / 60000)
}
