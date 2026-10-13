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

export function cashfreeEnvironment(): 'production' | 'sandbox' {
  return ENV
}

export type CashfreeSettlement = {
  id: string
  utr: string | null
  status: string // PAID, FAILED, or an in-progress state such as INITIATED / PENDING
  amountSettled: number
  paymentAmount: number
  paymentFrom: string | null // payments from … till … are what this settlement covers
  paymentTill: string | null
  initiatedOn: string | null
  settledOn: string | null
  charges: number // Cashfree service charge + tax + settlement charge
  adjustment: number
  type: string | null
}

type RawSettlement = Record<string, unknown>
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : Number(v) || 0)
const str = (v: unknown) => (typeof v === 'string' && v ? v : null)

// Settlements Cashfree has created or paid out between two instants, newest
// pages first as Cashfree returns them. Pages are followed via `cursor`.
export async function listCashfreeSettlements(startISO: string, endISO: string): Promise<CashfreeSettlement[]> {
  const out: CashfreeSettlement[] = []
  let cursor: string | null = null
  for (let page = 0; page < 20; page++) {
    const res: Response = await fetch(`${BASE_URL}/settlements`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        pagination: { limit: 50, ...(cursor ? { cursor } : {}) },
        filters: { start_date: startISO, end_date: endISO },
      }),
      cache: 'no-store',
    })
    const data: { data?: RawSettlement[]; cursor?: string | null; message?: string } = await res.json()
    if (!res.ok) {
      const hint = res.status === 401 && ENV === 'sandbox'
        ? ' (CASHFREE_ENV is "sandbox" here, but settlements exist only on a live key — set CASHFREE_ENV=production)'
        : ''
      throw new Error(`Cashfree settlements failed: ${data.message ?? res.statusText}${hint}`)
    }
    for (const r of data.data ?? []) {
      out.push({
        id: String(r.cf_settlement_id ?? r.settlement_id ?? ''),
        utr: str(r.settlement_utr),
        status: String(r.status ?? 'UNKNOWN').toUpperCase(),
        amountSettled: num(r.amount_settled),
        paymentAmount: num(r.payment_amount),
        paymentFrom: str(r.payment_from),
        paymentTill: str(r.payment_till),
        initiatedOn: str(r.settlement_initiated_on),
        settledOn: str(r.settlement_date),
        charges: num(r.service_charge) + num(r.service_tax) + num(r.settlement_charge) + num(r.settlement_tax),
        adjustment: num(r.adjustment),
        type: str(r.settlement_type),
      })
    }
    cursor = typeof data.cursor === 'string' && data.cursor ? data.cursor : null
    if (!cursor || (data.data ?? []).length === 0) break
  }
  return out
}
