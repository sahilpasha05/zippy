// Everything that differs between Zippy cities lives here. The city is picked at
// build time with NEXT_PUBLIC_CITY (set it in the Vercel project's env vars).
// Unset or unknown → Tarikere, so the original site behaves exactly as before.

export type CityConfig = {
  slug: 'tarikere' | 'kadur'
  name: string
  state: string
  siteUrl: string
  supportEmail: string
  // 10 digits, no country code
  supportWhatsapp: string
}

const CITIES: Record<CityConfig['slug'], CityConfig> = {
  tarikere: {
    slug: 'tarikere',
    name: 'Tarikere',
    state: 'Karnataka',
    siteUrl: 'https://www.zippytarikere.com',
    supportEmail: 'zippytarikere@gmail.com',
    supportWhatsapp: '8277802605',
  },
  kadur: {
    slug: 'kadur',
    name: 'Kadur',
    state: 'Karnataka',
    siteUrl: 'https://www.zippykadur.com',
    supportEmail: 'zippykadur@gmail.com', // TODO: confirm Kadur support email
    supportWhatsapp: '8277802605', // TODO: confirm Kadur support WhatsApp number
  },
}

const key = (process.env.NEXT_PUBLIC_CITY ?? 'tarikere').toLowerCase() as CityConfig['slug']

export const CITY: CityConfig = CITIES[key] ?? CITIES.tarikere
