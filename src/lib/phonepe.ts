import crypto from 'crypto'

// Server-only. Never import this file from a 'use client' component.

const ENV = process.env.PHONEPE_ENV === 'production' ? 'production' : 'sandbox'

const HOSTS = {
  sandbox: {
    auth: 'https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token',
    pay: 'https://api-preprod.phonepe.com/apis/pg-sandbox/checkout/v2/pay',
    status: (merchantOrderId: string) =>
      `https://api-preprod.phonepe.com/apis/pg-sandbox/checkout/v2/order/${merchantOrderId}/status`,
  },
  production: {
    auth: 'https://api.phonepe.com/apis/identity-manager/v1/oauth/token',
    pay: 'https://api.phonepe.com/apis/pg/checkout/v2/pay',
    status: (merchantOrderId: string) =>
      `https://api.phonepe.com/apis/pg/checkout/v2/order/${merchantOrderId}/status`,
  },
}[ENV]

type TokenCache = { accessToken: string; expiresAt: number } | null
let tokenCache: TokenCache = null

async function getAccessToken(): Promise<string> {
  const clientId = process.env.PHONEPE_CLIENT_ID
  const clientSecret = process.env.PHONEPE_CLIENT_SECRET
  const clientVersion = process.env.PHONEPE_CLIENT_VERSION ?? '1'
  if (!clientId || !clientSecret) throw new Error('PhonePe credentials are not configured')

  // Refresh 60s before actual expiry to avoid races mid-request
  const now = Math.floor(Date.now() / 1000)
  if (tokenCache && tokenCache.expiresAt - 60 > now) return tokenCache.accessToken

  const res = await fetch(HOSTS.auth, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_version: clientVersion,
      client_secret: clientSecret,
      grant_type: 'client_credentials',
    }),
  })
  const data = await res.json()
  if (!res.ok || !data.access_token) {
    throw new Error(`PhonePe auth failed: ${data.message ?? res.statusText}`)
  }
  tokenCache = { accessToken: data.access_token, expiresAt: data.expires_at }
  return data.access_token
}

export async function createPhonePeOrder(params: {
  merchantOrderId: string
  amountPaise: number
  redirectUrl: string
}): Promise<{ orderId: string; state: string; redirectUrl: string; expireAt: number }> {
  const token = await getAccessToken()
  const res = await fetch(HOSTS.pay, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `O-Bearer ${token}`,
    },
    body: JSON.stringify({
      merchantOrderId: params.merchantOrderId,
      amount: params.amountPaise,
      paymentFlow: {
        type: 'PG_CHECKOUT',
        merchantUrls: { redirectUrl: params.redirectUrl },
      },
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`PhonePe create order failed: ${data.message ?? res.statusText}`)
  return data
}

export async function getPhonePeOrderStatus(merchantOrderId: string): Promise<{
  orderId: string
  state: 'PENDING' | 'COMPLETED' | 'FAILED'
  amount: number
  paymentDetails?: Array<{ transactionId: string; paymentMode: string; state: string }>
}> {
  const token = await getAccessToken()
  const res = await fetch(HOSTS.status(merchantOrderId), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `O-Bearer ${token}`,
    },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`PhonePe status check failed: ${data.message ?? res.statusText}`)
  return data
}

// Verifies the "SHA" (username/password) webhook auth scheme:
// PhonePe sends Authorization: SHA256(username:password)
export function verifyPhonePeWebhookAuth(authorizationHeader: string | null): boolean {
  const username = process.env.PHONEPE_WEBHOOK_USERNAME
  const password = process.env.PHONEPE_WEBHOOK_PASSWORD
  if (!authorizationHeader || !username || !password) return false
  const expected = crypto.createHash('sha256').update(`${username}:${password}`).digest('hex')
  const received = Buffer.from(authorizationHeader)
  const expectedBuf = Buffer.from(expected)
  if (received.length !== expectedBuf.length) return false
  return crypto.timingSafeEqual(received, expectedBuf)
}
