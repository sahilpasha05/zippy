// Loops a real ringtone for new orders until explicitly stopped (e.g. by clicking
// "Accept" on the new-order popup). Browsers only allow audio after a user gesture —
// call unlockAudio() from a click handler once before the first startAlarm() call.

let audio: HTMLAudioElement | null = null
let originalTitle: string | null = null
let activeNotification: Notification | null = null
// True while the alarm is meant to be sounding. Kept separate from the element's
// own state because a blocked play() leaves the element paused even though the
// alarm is logically ringing.
let wantPlaying = false
let retryArmed = false
let onBlockedChange: ((blocked: boolean) => void) | null = null

// A browser refuses audio until the page has seen a real user gesture. When that
// happens the popup still appears but the ringtone is silent, which is worse than
// no alarm at all — so retry on the very next interaction of any kind.
function armRetry() {
  if (retryArmed || typeof window === 'undefined') return
  retryArmed = true
  onBlockedChange?.(true)

  const retry = () => {
    if (!wantPlaying) { cleanup(); return }
    getAudio().play().then(() => { cleanup(); onBlockedChange?.(false) }).catch(() => {})
  }
  const cleanup = () => {
    retryArmed = false
    for (const e of ['pointerdown', 'keydown', 'touchstart', 'click'] as const) {
      document.removeEventListener(e, retry)
    }
  }
  for (const e of ['pointerdown', 'keydown', 'touchstart', 'click'] as const) {
    document.addEventListener(e, retry)
  }
}

// Lets a panel show "tap to enable sound" while audio is blocked.
export function onAudioBlockedChange(cb: ((blocked: boolean) => void) | null) {
  onBlockedChange = cb
}

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
  a.play().then(() => { if (!wantPlaying) a.pause(); onBlockedChange?.(false) }).catch(() => {})
  // The same gesture also buys the right to raise a system notification, which
  // is what actually reaches someone sitting in a different tab or application.
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().catch(() => {})
  }
}

// Audio keeps playing while a tab is in the background — browsers throttle
// timers, not sound — so the ringtone itself survives a tab switch. The tab
// title and the system notification are what make it *visible* from elsewhere.
// Both are set once rather than animated: a background tab's timers are
// throttled to roughly once a minute, so anything flashing would just stall.
export function startAlarm(label = 'New order') {
  if (typeof window === 'undefined') return
  wantPlaying = true
  const a = getAudio()
  a.currentTime = 0
  a.play().then(() => onBlockedChange?.(false)).catch(() => armRetry())

  if (originalTitle === null) originalTitle = document.title
  document.title = `🔔 ${label} — ${originalTitle}`

  if ('Notification' in window && Notification.permission === 'granted' && !activeNotification) {
    try {
      activeNotification = new Notification(label, {
        body: 'Open Zippy to accept this order.',
        icon: '/logo-zippy.png',
        tag: 'zippy-order',       // collapses repeats into a single notification
        requireInteraction: true, // stays up until dismissed, like the alarm
      })
      activeNotification.onclick = () => { window.focus(); stopAlarm() }
    } catch {
      // Notifications unsupported or blocked — the ringtone still plays.
    }
  }
}

export function stopAlarm() {
  if (typeof window === 'undefined') return
  wantPlaying = false
  onBlockedChange?.(false)
  if (audio) {
    audio.pause()
    audio.currentTime = 0
  }
  if (originalTitle !== null) {
    document.title = originalTitle
    originalTitle = null
  }
  if (activeNotification) {
    activeNotification.close()
    activeNotification = null
  }
}
