// Plays a loud repeating "new order" chime using the Web Audio API (no audio file needed).
// Browsers only allow sound after a user gesture — call unlock() from a click handler first.

let ctx: AudioContext | null = null

export function unlockAudio() {
  if (typeof window === 'undefined') return
  if (!ctx) ctx = new AudioContext()
  if (ctx.state === 'suspended') ctx.resume()
}

function beep(at: number, freq: number, dur = 0.18) {
  if (!ctx) return
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'square'
  osc.frequency.value = freq
  gain.gain.setValueAtTime(0.0001, at)
  gain.gain.exponentialRampToValueAtTime(0.35, at + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, at + dur)
  osc.connect(gain).connect(ctx.destination)
  osc.start(at)
  osc.stop(at + dur)
}

export function playNewOrderAlarm() {
  if (typeof window === 'undefined') return
  if (!ctx) ctx = new AudioContext()
  if (ctx.state === 'suspended') { ctx.resume() }
  const t = ctx.currentTime
  // Three rounds of a two-tone ding-dong so it's hard to miss in a busy kitchen
  for (let round = 0; round < 3; round++) {
    const base = t + round * 0.6
    beep(base, 880)
    beep(base + 0.2, 1174)
  }
}
