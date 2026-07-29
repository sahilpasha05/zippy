// Loops a real ringtone for new orders until explicitly stopped (e.g. by clicking
// "Accept" on the new-order popup). Browsers only allow audio after a user gesture —
// call unlockAudio() from a click handler once before the first startAlarm() call.

let audio: HTMLAudioElement | null = null

function getAudio(): HTMLAudioElement {
  if (!audio) {
    audio = new Audio('/sounds/new-order.mp3')
    audio.loop = true
  }
  return audio
}

export function unlockAudio() {
  if (typeof window === 'undefined') return
  const a = getAudio()
  a.play().then(() => a.pause()).catch(() => {})
}

export function startAlarm() {
  if (typeof window === 'undefined') return
  const a = getAudio()
  a.currentTime = 0
  a.play().catch(() => {})
}

export function stopAlarm() {
  if (typeof window === 'undefined' || !audio) return
  audio.pause()
  audio.currentTime = 0
}
