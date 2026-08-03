'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Search, Package, Loader2, MessageCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn, matchesSearchQuery, whatsappSupportUrl } from '@/lib/utils'
import { applyPriceMarkup } from '@/lib/cartPricing'

type SearchProduct = {
  id: string
  name: string
  price: number
  image_url: string | null
  category_slug: string
  brand: string | null
  weight: string | null
}

const MAX_RESULTS = 8

// The whole active grocery catalog is small enough to fetch once and filter
// client-side (same matchesSearchQuery logic as the Essentials pages), rather
// than round-tripping per keystroke.
export default function GrocerySearchBox({ variant }: { variant: 'mobile' | 'desktop' }) {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [catalog, setCatalog] = useState<SearchProduct[] | null>(null)
  const [loadingCatalog, setLoadingCatalog] = useState(false)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  function ensureCatalogLoaded() {
    if (catalog !== null || loadingCatalog) return
    setLoadingCatalog(true)
    createClient()
      .from('grocery_products')
      .select('id, name, price, image_url, brand, weight, grocery_categories(slug)')
      .eq('is_active', true)
      .then(({ data }) => {
        type Row = { id: string; name: string; price: number; image_url: string | null; brand: string | null; weight: string | null; grocery_categories: { slug: string } | null }
        setCatalog(
          ((data as unknown as Row[]) ?? []).map((p) => ({
            id: p.id,
            name: p.name,
            price: applyPriceMarkup(p.price),
            image_url: p.image_url,
            category_slug: p.grocery_categories?.slug ?? '',
            brand: p.brand,
            weight: p.weight,
          }))
        )
        setLoadingCatalog(false)
      })
  }

  function goToResults(q: string) {
    const trimmed = q.trim()
    if (!trimmed) return
    router.push(`/essentials?q=${encodeURIComponent(trimmed)}`)
    setOpen(false)
  }

  function goToProduct(p: SearchProduct) {
    router.push(p.category_slug ? `/essentials/${p.category_slug}?q=${encodeURIComponent(p.name)}` : `/essentials?q=${encodeURIComponent(p.name)}`)
    setOpen(false)
  }

  const trimmedQuery = query.trim()
  const results = (trimmedQuery && catalog
    ? catalog.filter((p) => matchesSearchQuery(trimmedQuery, p.name, p.brand, p.weight))
    : []
  ).slice(0, MAX_RESULTS)
  const showDropdown = open && trimmedQuery.length > 0

  return (
    <div ref={containerRef} className={cn('relative', variant === 'desktop' ? 'flex-1 max-w-2xl' : 'w-full')}>
      <div className={cn(
        'flex items-center gap-2.5 rounded-xl border transition-all',
        variant === 'mobile'
          ? 'px-4 py-3 bg-[#F8F8F8] border-[#EEEEEE]'
          : 'px-4 py-2.5 rounded-2xl gap-3 border-[#E5E7EB] bg-[#F8FAFC] hover:border-[#D1D5DB] focus-within:border-[#16A34A] focus-within:shadow-[0_0_0_3px_rgba(22,163,74,0.12)] focus-within:bg-white'
      )}>
        <button onClick={() => goToResults(query)} aria-label="Search" className="shrink-0">
          <Search className={cn('text-[#9CA3AF]', variant === 'mobile' ? 'w-4.5 h-4.5 text-[#6B7280]' : 'w-4 h-4')} strokeWidth={2} />
        </button>
        <input
          type="text"
          placeholder={variant === 'mobile' ? 'Search "chocolate"' : 'Search groceries...'}
          value={query}
          onChange={(e) => { setQuery(e.target.value); ensureCatalogLoaded() }}
          onFocus={() => { setOpen(true); ensureCatalogLoaded() }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') goToResults(query)
            if (e.key === 'Escape') { setOpen(false); (e.target as HTMLInputElement).blur() }
          }}
          className={cn('flex-1 bg-transparent outline-none min-w-0 text-[#111827] placeholder:text-[#9CA3AF]', variant === 'mobile' ? 'text-[14.5px]' : 'text-[14px]')}
        />
      </div>

      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-[#E5E7EB] rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.12)] z-[60] overflow-hidden">
          {loadingCatalog ? (
            <div className="flex items-center justify-center gap-2 py-6 text-[13px] text-[#9CA3AF]">
              <Loader2 className="w-4 h-4 animate-spin" /> Searching...
            </div>
          ) : results.length > 0 ? (
            <>
              <div className="max-h-80 overflow-y-auto py-1">
                {results.map((p) => (
                  <button key={p.id} onClick={() => goToProduct(p)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#F8FAFC] transition-colors text-left">
                    <div className="w-9 h-9 rounded-lg overflow-hidden bg-[#F8FAFC] border border-[#E5E7EB] shrink-0 relative">
                      {p.image_url ? (
                        <Image src={p.image_url} alt={p.name} fill className="object-contain" sizes="36px" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#D1D5DB]"><Package className="w-4 h-4" /></div>
                      )}
                    </div>
                    <span className="flex-1 text-[13px] text-[#111827] truncate">{p.name}</span>
                    <span className="text-[12.5px] font-[700] text-[#111827] shrink-0">₹{p.price}</span>
                  </button>
                ))}
              </div>
              <button onClick={() => goToResults(query)}
                className="w-full py-2.5 text-[12.5px] font-[600] text-[#16A34A] hover:bg-[#F0FDF4] border-t border-[#F3F4F6] transition-colors">
                See all results for &quot;{trimmedQuery}&quot;
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2 py-6 px-5 text-center">
              <p className="text-[13px] font-[600] text-[#374151]">No products found for &quot;{trimmedQuery}&quot;</p>
              <p className="text-[11.5px] text-[#9CA3AF]">We couldn&apos;t find that — ask us directly instead.</p>
              <a
                href={whatsappSupportUrl(`Hi, I need assistance with groceries. I couldn't find: "${trimmedQuery}"`)}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 mt-1 px-4 py-2 bg-[#25D366] text-white text-[12.5px] font-[700] rounded-xl hover:bg-[#1DA851] transition-all"
              >
                <MessageCircle className="w-3.5 h-3.5" /> Ask us on WhatsApp
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
