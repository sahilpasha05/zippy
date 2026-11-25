// Shared by the customer help button, the "My tickets" list and Admin > Support Tickets.

export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed'

export type Ticket = {
  id: string
  ticket_no: number
  user_id: string
  name: string
  phone: string
  category: string
  order_id: string | null
  message: string
  status: TicketStatus
  admin_reply: string | null
  created_at: string
  updated_at: string
}

export const TICKET_STATUS: Record<TicketStatus, { label: string; color: string; bg: string }> = {
  open:        { label: 'Open',        color: '#D97706', bg: '#FFFBEB' },
  in_progress: { label: 'In progress', color: '#0891B2', bg: '#ECFEFF' },
  resolved:    { label: 'Resolved',    color: '#16A34A', bg: '#DCFCE7' },
  closed:      { label: 'Closed',      color: '#6B7280', bg: '#F3F4F6' },
}

export type HelpTopic = {
  id: string
  label: string
  emoji: string
  answer: string
  needsOrder: boolean
}

// First-line answers shown before a customer raises a ticket.
export const HELP_TOPICS: HelpTopic[] = [
  {
    id: 'refund', label: 'Refund or payment issue', emoji: '💸', needsOrder: true,
    answer: 'If money was deducted but your order failed, it is refunded to the original payment method in 5–7 working days. For a cancelled order or a wrong charge, raise a ticket with the order and our team will check and refund it.',
  },
  {
    id: 'late', label: 'Order is late or not delivered', emoji: '⏱️', needsOrder: true,
    answer: 'Open Order History to see live tracking and call your rider from there. Orders can run late in rain or at rush hour. If your order is far past its estimate, raise a ticket and we will chase it right away.',
  },
  {
    id: 'missing', label: 'Missing or wrong item', emoji: '📦', needsOrder: true,
    answer: 'Sorry about that. Check your order summary first, as some items arrive in a separate bag. If something is still missing or wrong, raise a ticket with the order and the item name, and we will make it right.',
  },
  {
    id: 'taste', label: 'Food taste or quality', emoji: '🍽️', needsOrder: true,
    answer: 'We are sorry the food was not up to the mark. Tell us what was wrong with the dish and the restaurant. A photo-free description is fine, and we will take it up with the restaurant and, where it applies, refund or credit you.',
  },
  {
    id: 'cancel', label: 'Cancel or change my order', emoji: '✋', needsOrder: true,
    answer: 'An order can be cancelled only before the restaurant starts preparing it. If it is already being prepared it cannot be changed. If you still need to cancel, raise a ticket right now and we will try.',
  },
  {
    id: 'account', label: 'Sign-in, address or app problem', emoji: '🔑', needsOrder: false,
    answer: 'Try signing out and back in with your phone number, and refresh the page. For address or location problems, set your delivery location again from the top bar. If it still fails, raise a ticket and describe what you see.',
  },
  {
    id: 'other', label: 'Something else', emoji: '💬', needsOrder: false,
    answer: 'Tell us what is going on and our team will help.',
  },
]

export const topicLabel = (id: string) => HELP_TOPICS.find((t) => t.id === id)?.label ?? 'Other'
export const ticketCode = (no: number) => `ZT-${no}`
