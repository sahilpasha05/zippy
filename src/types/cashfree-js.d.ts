// @cashfreepayments/cashfree-js ships no TypeScript declarations.
declare module '@cashfreepayments/cashfree-js' {
  export type CashfreeInstance = {
    checkout: (options: {
      paymentSessionId: string
      redirectTarget?: '_self' | '_modal' | '_blank' | '_top'
    }) => Promise<{
      error?: { message: string }
      redirect?: boolean
      paymentDetails?: Record<string, unknown>
    }>
  }

  export function load(options: { mode: 'sandbox' | 'production' }): Promise<CashfreeInstance | null>
}
