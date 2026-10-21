// A UPI payment link (the text inside a "pay this amount" QR). Any UPI app that
// scans it opens with the payee, the exact amount and the note already filled in.
export function upiPayLink({ upiId, name, amount, note }: { upiId: string; name: string; amount: number; note: string }): string {
  const params = new URLSearchParams({
    pa: upiId,
    pn: name,
    am: amount.toFixed(2),
    cu: 'INR',
    tn: note,
  })
  // URLSearchParams writes spaces as "+", which some UPI apps show literally.
  return `upi://pay?${params.toString().replace(/\+/g, '%20')}`
}
