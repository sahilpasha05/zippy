'use client'

import { useState } from 'react'
import { Plus, Search, Edit2, Trash2, ToggleLeft, ToggleRight, Star, Award } from 'lucide-react'
import RestaurantSidebar from '@/components/restaurant/RestaurantSidebar'
import { cn } from '@/lib/utils'

const CATEGORIES = ['All', 'Bestsellers', 'Biryani', 'Starters', 'Breads', 'Desserts', 'Drinks']

const MENU_ITEMS = [
  { id: 'm1', cat: 'Biryani',    name: 'Hyderabadi Chicken Dum Biryani', desc: 'Slow-cooked with aged basmati & whole spices', price: 299, mrp: 349, veg: false, available: true,  bestseller: true,  rating: 4.8, orders: 142 },
  { id: 'm2', cat: 'Biryani',    name: 'Veg Dum Biryani',                 desc: 'Fragrant basmati with seasonal vegetables',   price: 249, mrp: 289, veg: true,  available: true,  bestseller: false, rating: 4.5, orders: 76  },
  { id: 'm3', cat: 'Biryani',    name: 'Mutton Dum Biryani',              desc: 'Tender mutton in slow-dum biryani style',      price: 349, mrp: 399, veg: false, available: true,  bestseller: false, rating: 4.7, orders: 55  },
  { id: 'm4', cat: 'Biryani',    name: 'Paneer Biryani',                  desc: 'Cottage cheese biryani with kesar rice',       price: 289, mrp: 329, veg: true,  available: true,  bestseller: false, rating: 4.4, orders: 42  },
  { id: 'm5', cat: 'Starters',   name: 'Seekh Kebab (6 pcs)',             desc: 'Minced lamb skewers from tandoor',            price: 180, mrp: 220, veg: false, available: true,  bestseller: true,  rating: 4.9, orders: 98  },
  { id: 'm6', cat: 'Starters',   name: 'Chicken 65',                      desc: 'Crispy fried chicken with curry leaves',      price: 189, mrp: 229, veg: false, available: true,  bestseller: false, rating: 4.6, orders: 61  },
  { id: 'm7', cat: 'Starters',   name: 'Paneer Tikka (6 pcs)',            desc: 'Marinated cottage cheese in tandoor',         price: 169, mrp: 199, veg: true,  available: false, bestseller: false, rating: 4.5, orders: 38  },
  { id: 'm8', cat: 'Breads',     name: 'Tandoori Roti',                   desc: 'Whole wheat bread from clay oven',            price: 40,  mrp: 50,  veg: true,  available: true,  bestseller: false, rating: 4.3, orders: 210 },
  { id: 'm9', cat: 'Breads',     name: 'Butter Naan',                     desc: 'Fluffy leavened bread with butter',           price: 55,  mrp: 65,  veg: true,  available: true,  bestseller: false, rating: 4.4, orders: 187 },
  { id: 'm10', cat: 'Desserts',  name: 'Shahi Tukda',                     desc: 'Fried bread in saffron rabri',                price: 119, mrp: 149, veg: true,  available: true,  bestseller: false, rating: 4.7, orders: 44  },
  { id: 'm11', cat: 'Drinks',    name: 'Sweet Lassi',                     desc: 'Chilled yoghurt drink with cardamom',         price: 89,  mrp: 99,  veg: true,  available: true,  bestseller: false, rating: 4.6, orders: 132 },
  { id: 'm12', cat: 'Drinks',    name: 'Masala Chaas',                    desc: 'Spiced buttermilk with ginger & coriander',  price: 69,  mrp: 79,  veg: true,  available: true,  bestseller: false, rating: 4.5, orders: 98  },
]

type MenuItem = typeof MENU_ITEMS[0]

function ItemCard({ item, onToggle, onEdit }: { item: MenuItem; onToggle: (id: string) => void; onEdit: (item: MenuItem) => void }) {
  return (
    <div className={cn(
      'bg-white rounded-2xl border transition-all',
      item.available ? 'border-[#E5E7EB] shadow-zippy-sm' : 'border-[#E5E7EB] opacity-60'
    )}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {/* Veg/non-veg dot */}
              <span className={cn(
                'w-4 h-4 border-2 rounded-sm flex items-center justify-center shrink-0',
                item.veg ? 'border-[#16A34A]' : 'border-[#DC2626]'
              )}>
                <span className={cn('w-2 h-2 rounded-full', item.veg ? 'bg-[#16A34A]' : 'bg-[#DC2626]')} />
              </span>
              {item.bestseller && (
                <span className="flex items-center gap-1 text-[10px] font-[700] text-[#D97706] bg-[#FFFBEB] border border-[#FDE68A] px-1.5 py-0.5 rounded-lg">
                  <Award className="w-3 h-3" /> Bestseller
                </span>
              )}
            </div>
            <h3 className="text-[13.5px] font-[700] text-[#111827] leading-snug">{item.name}</h3>
            <p className="text-[11.5px] text-[#9CA3AF] mt-0.5 line-clamp-1">{item.desc}</p>
          </div>
          <button
            onClick={() => onToggle(item.id)}
            className="shrink-0 mt-0.5"
          >
            {item.available
              ? <ToggleRight className="w-8 h-8 text-[#16A34A]" />
              : <ToggleLeft className="w-8 h-8 text-[#D1D5DB]" />
            }
          </button>
        </div>

        <div className="flex items-center justify-between mt-3">
          <div>
            <span className="text-[15px] font-[800] text-[#111827]">₹{item.price}</span>
            <span className="text-[11.5px] text-[#9CA3AF] line-through ml-1.5">₹{item.mrp}</span>
          </div>
          <div className="flex items-center gap-3 text-[11.5px] text-[#6B7280]">
            <span className="flex items-center gap-0.5 text-[#D97706]"><Star className="w-3 h-3 fill-[#D97706]" /> {item.rating}</span>
            <span>{item.orders} orders</span>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#F3F4F6]">
          <button
            onClick={() => onEdit(item)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-[#E5E7EB] rounded-xl text-[12px] font-medium text-[#374151] hover:border-[#16A34A] hover:text-[#16A34A] transition-all"
          >
            <Edit2 className="w-3.5 h-3.5" /> Edit
          </button>
          <button className="flex items-center justify-center gap-1.5 py-2 px-4 border border-[#FEE2E2] rounded-xl text-[12px] font-medium text-[#DC2626] hover:bg-[#FEF2F2] transition-all">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default function RestaurantMenuPage() {
  const [items, setItems] = useState(MENU_ITEMS)
  const [activeCategory, setActiveCategory] = useState('All')
  const [search, setSearch] = useState('')
  const [editItem, setEditItem] = useState<MenuItem | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)

  const toggle = (id: string) => setItems((prev) => prev.map((i) => i.id === id ? { ...i, available: !i.available } : i))

  const filtered = items.filter((i) => {
    const matchCat =
      activeCategory === 'All' ? true :
      activeCategory === 'Bestsellers' ? i.bestseller :
      i.cat === activeCategory
    const matchSearch = i.name.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <RestaurantSidebar restaurant={null} />
      <main className="flex-1 overflow-auto">
        {/* Top bar */}
        <div className="bg-white border-b border-[#E5E7EB] px-6 py-4 sticky top-0 z-10">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h1 className="text-[18px] font-[800] text-[#111827]" style={{ fontWeight: 800 }}>Menu</h1>
              <p className="text-[12.5px] text-[#9CA3AF]">{items.filter((i) => i.available).length} available · {items.filter((i) => !i.available).length} unavailable</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3.5 py-2 border border-[#E5E7EB] rounded-xl bg-[#F8FAFC] focus-within:border-[#16A34A] transition-all">
                <Search className="w-3.5 h-3.5 text-[#9CA3AF]" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search items..."
                  className="bg-transparent text-[13px] outline-none w-36 placeholder:text-[#9CA3AF]"
                />
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[#16A34A] text-white text-[13px] font-[600] rounded-xl hover:bg-[#15803D] active:scale-95 transition-all shadow-[0_2px_8px_rgba(22,163,74,0.3)]"
              >
                <Plus className="w-4 h-4" /> Add Item
              </button>
            </div>
          </div>
          {/* Category tabs */}
          <div className="flex gap-2 overflow-x-auto">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setActiveCategory(c)}
                className={cn(
                  'px-4 py-1.5 rounded-xl text-[12.5px] font-medium whitespace-nowrap transition-all shrink-0',
                  activeCategory === c
                    ? 'bg-[#16A34A] text-white shadow-[0_2px_6px_rgba(22,163,74,0.3)]'
                    : 'bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]'
                )}
              >
                {c}
                {c !== 'All' && (
                  <span className="ml-1.5 text-[10.5px] opacity-70">
                    ({c === 'Bestsellers' ? items.filter((i) => i.bestseller).length : items.filter((i) => i.cat === c).length})
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-20">
              <span className="text-4xl">🍽️</span>
              <p className="text-[15px] font-semibold text-[#374151]">No items found</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((item) => (
                <ItemCard key={item.id} item={item} onToggle={toggle} onEdit={setEditItem} />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Add/Edit modal */}
      {(showAddModal || editItem) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setShowAddModal(false); setEditItem(null) }} />
          <div className="relative bg-white rounded-2xl shadow-zippy-xl w-full max-w-md p-6 z-10">
            <h2 className="text-[17px] font-[800] text-[#111827] mb-5">{editItem ? 'Edit Item' : 'Add New Item'}</h2>
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setShowAddModal(false); setEditItem(null) }}>
              <div>
                <label className="block text-[12.5px] font-[600] text-[#374151] mb-1.5">Item Name</label>
                <input
                  defaultValue={editItem?.name ?? ''}
                  placeholder="e.g. Chicken Biryani"
                  className="w-full px-4 py-3 border border-[#E5E7EB] rounded-xl text-[13.5px] text-[#111827] placeholder:text-[#9CA3AF] outline-none focus:border-[#16A34A] focus:shadow-[0_0_0_3px_rgba(22,163,74,0.1)] transition-all"
                />
              </div>
              <div>
                <label className="block text-[12.5px] font-[600] text-[#374151] mb-1.5">Description</label>
                <textarea
                  defaultValue={editItem?.desc ?? ''}
                  placeholder="Short description..."
                  rows={2}
                  className="w-full px-4 py-3 border border-[#E5E7EB] rounded-xl text-[13.5px] text-[#111827] placeholder:text-[#9CA3AF] outline-none focus:border-[#16A34A] focus:shadow-[0_0_0_3px_rgba(22,163,74,0.1)] transition-all resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12.5px] font-[600] text-[#374151] mb-1.5">Price (₹)</label>
                  <input
                    type="number"
                    defaultValue={editItem?.price ?? ''}
                    placeholder="299"
                    className="w-full px-4 py-3 border border-[#E5E7EB] rounded-xl text-[13.5px] outline-none focus:border-[#16A34A] focus:shadow-[0_0_0_3px_rgba(22,163,74,0.1)] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[12.5px] font-[600] text-[#374151] mb-1.5">MRP (₹)</label>
                  <input
                    type="number"
                    defaultValue={editItem?.mrp ?? ''}
                    placeholder="349"
                    className="w-full px-4 py-3 border border-[#E5E7EB] rounded-xl text-[13.5px] outline-none focus:border-[#16A34A] focus:shadow-[0_0_0_3px_rgba(22,163,74,0.1)] transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[12.5px] font-[600] text-[#374151] mb-1.5">Category</label>
                <select
                  defaultValue={editItem?.cat ?? 'Biryani'}
                  className="w-full px-4 py-3 border border-[#E5E7EB] rounded-xl text-[13.5px] text-[#111827] outline-none focus:border-[#16A34A] transition-all bg-white"
                >
                  {['Biryani', 'Starters', 'Breads', 'Desserts', 'Drinks'].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" defaultChecked={editItem ? editItem.veg : true} className="w-4 h-4 accent-[#16A34A]" />
                  <span className="text-[12.5px] text-[#374151] font-medium">Vegetarian</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" defaultChecked={editItem?.bestseller ?? false} className="w-4 h-4 accent-[#D97706]" />
                  <span className="text-[12.5px] text-[#374151] font-medium">Bestseller</span>
                </label>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setEditItem(null) }}
                  className="flex-1 py-3 border border-[#E5E7EB] rounded-xl text-[13.5px] font-medium text-[#374151] hover:bg-[#F8FAFC] transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-[#16A34A] text-white rounded-xl text-[13.5px] font-[700] hover:bg-[#15803D] active:scale-[0.98] transition-all shadow-[0_2px_8px_rgba(22,163,74,0.3)]"
                >
                  {editItem ? 'Save Changes' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
