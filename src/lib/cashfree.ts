import crypto from 'crypto'

// Server-only. Never import this file from a 'use client' component.

const ENV = process.env.CASHFREE_ENV === 'sandbox' ? 'sandbox' : 'production'
const API_VERSION = process.env.CASHFREE_API_VERSION ?? '2023-08-01'

const BASE_URL = ENV === 'sandbox'
  ? 'https://sandbox.cashfree.com/pg'
  : 'https://api.cashfree.com/pg'

function authHeaders() {
  const appId = process.env.CASHFREE_APP_ID
  const secretKey = process.env.CASHFREE_SECRET_KEY
  if (!appId || !secretKey) throw new Error('Cashfree credentials are not configured')
  return {
    'Content-Type': 'application/json',
    'x-client-id': appId,
    'x-client-secret': secretKey,
    'x-api-version': API_VERSION,
  }
}

export async function createCashfreeOrder(params: {
  orderId: string
  orderAmount: number // decimal rupees, NOT paise
  customerId: string
  customerPhone: string // exactly 10 digits, no +91
  customerName?: string
  returnUrl: string
}): Promise<{ cf_order_id: string; order_id: string; order_status: string; payment_session_id: string }> {
  const res = await fetch(`${BASE_URL}/orders`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      order_id: params.orderId,
      order_amount: params.orderAmount,
      order_currency: 'INR',
      customer_details: {
        customer_id: params.customerId,
        customer_phone: params.customerPhone,
        ...(params.customerName ? { customer_name: params.customerName } : {}),
      },
      order_meta: { return_url: params.returnUrl },
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`Cashfree create order failed: ${data.message ?? res.statusText}`)
  return data
}

export async function getCashfreeOrderStatus(orderId: string): Promise<{
  order_id: string
  cf_order_id?: string
  order_status: 'ACTIVE' | 'PAID' | 'EXPIRED' | 'TERMINATED' | 'TERMINATION_REQUESTED'
}> {
  const res = await fetch(`${BASE_URL}/orders/${orderId}`, {
    method: 'GET',
    headers: authHeaders(),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`Cashfree status check failed: ${data.message ?? res.statusText}`)
  return data
}

// Cashfree webhook signing: HMAC-SHA256(base64) of (timestamp + rawBody), keyed by the
// client secret. rawBody MUST be the untouched request text — parsing to JSON first can
// reformat decimal values and break the signature.
export function verifyCashfreeWebhookSignature(
  rawBody: string,
  timestamp: string | null,
  signature: string | null
): boolean {
  const secretKey = process.env.CASHFREE_SECRET_KEY
  if (!rawBody || !timestamp || !signature || !secretKey) return false
  const expected = crypto.createHmac('sha256', secretKey).update(timestamp + rawBody).digest('base64')
  const receivedBuf = Buffer.from(signature)
  const expectedBuf = Buffer.from(expected)
  if (receivedBuf.length !== expectedBuf.length) return false
  return crypto.timingSafeEqual(receivedBuf, expectedBuf)
}
