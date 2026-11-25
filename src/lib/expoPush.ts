// Server-only. Sends push notifications through Expo's push service (which delivers via Google FCM).
const EXPO_URL = 'https://exp.host/--/api/v2/push/send'

export type PushMessage = { to: string; title: string; body: string; data?: Record<string, unknown> }

// Expo accepts up to 100 messages per request.
export async function sendExpoPush(messages: PushMessage[]) {
  let sent = 0
  const dead: string[] = []
  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100)
    const res = await fetch(EXPO_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(chunk.map((m) => ({ ...m, sound: 'default', channelId: 'default', priority: 'high' }))),
    })
    const json = await res.json().catch(() => ({}))
    const tickets: { status: string; details?: { error?: string } }[] = json.data ?? []
    tickets.forEach((t, idx) => {
      if (t.status === 'ok') sent++
      // The phone uninstalled the app or revoked permission: drop its token.
      else if (t.details?.error === 'DeviceNotRegistered') dead.push(chunk[idx].to)
    })
  }
  return { sent, dead }
}
