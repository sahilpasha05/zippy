'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Bell, Shield, Store, Save, CheckCircle, Zap, Loader2, ShoppingBasket } from 'lucide-react'
import AdminSidebar from '@/components/admin/AdminSidebar'

const supabase = createClient()

type GroceryCategory = { id: string; name: string; available: boolean }

export default function AdminSettingsPage() {
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState({
    platformName: 'Zippy',
    supportEmail: 'zippytarikere@gmail.com',
    deliveryMinutes: '10',
    maxDeliveryFee: '99',
    minOrderValue: '49',
    orderNotifications: true,
    newRestaurantAlerts: true,
    maintenanceMode: false,
    groceriesAvailable: true,
  })
  const [categories, setCategories] = useState<GroceryCategory[]>([])
  const [togglingCategory, setTogglingCategory] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const [{ data }, { data: cats }] = await Promise.all([
        supabase.from('platform_settings').select('*').eq('id', 1).single(),
        supabase.from('grocery_categories').select('id, name, available').eq('is_active', true).order('sort_order'),
      ])
      if (data) {
        setSettings((s) => ({
          ...s,
          platformName: data.platform_name ?? s.platformName,
          supportEmail: data.support_email ?? s.supportEmail,
          deliveryMinutes: String(data.delivery_minutes ?? 10),
          maxDeliveryFee: String(data.max_delivery_fee ?? 99),
          minOrderValue: String(data.min_order_value ?? 49),
          groceriesAvailable: data.groceries_available ?? true,
        }))
      }
      setCategories((cats as GroceryCategory[]) ?? [])
      setLoading(false)
    }
    load()
  }, [])

  function set(k: string, v: unknown) { setSettings((s) => ({ ...s, [k]: v })) }

  // Each category's pause takes effect immediately, unlike the fields above —
  // it's a per-row DB write, not part of the single platform_settings row the
  // "Save Changes" button writes, so batching it behind that button would be
  // misleading (toggle it, walk away, and it never actually saved).
  async function toggleCategory(cat: GroceryCategory) {
    const next = !cat.available
    setTogglingCategory(cat.id)
    setCategories((cs) => cs.map((c) => c.id === cat.id ? { ...c, available: next } : c))
    const { error } = await supabase.from('grocery_categories').update({ available: next }).eq('id', cat.id)
    if (error) setCategories((cs) => cs.map((c) => c.id === cat.id ? { ...c, available: !next } : c))
    setTogglingCategory(null)
  }

  async function save() {
    setSaving(true)
    await supabase.from('platform_settings').update({
      platform_name: settings.platformName,
      support_email: settings.supportEmail,
      delivery_minutes: +settings.deliveryMinutes || 10,
      max_delivery_fee: +settings.maxDeliveryFee || 99,
      min_order_value: +settings.minOrderValue || 49,
      groceries_available: settings.groceriesAvailable,
      updated_at: new Date().toISOString(),
    }).eq('id', 1)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#F8FAFC]">
      <AdminSidebar />
      <main className="flex-1 overflow-auto">
        <div className="bg-white border-b border-[#E5E7EB] px-6 py-5 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-[20px] font-[800] text-[#111827]" style={{ fontWeight: 800 }}>Settings</h1>
              <p className="text-[12.5px] text-[#9CA3AF]">Platform configuration</p>
            </div>
            <button onClick={save} disabled={saving || loading}
              className="flex items-center gap-2 px-4 py-2 bg-[#7C3AED] text-white text-[13px] font-[600] rounded-xl hover:bg-[#6D28D9] transition-all shadow-[0_2px_8px_rgba(124,58,237,0.3)] disabled:opacity-60">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saved ? 'Saved!' : 'Save Changes'}
            </button>
          </div>
        </div>

        <div className="max-w-2xl mx-auto p-6 space-y-5">
          {/* Delivery promise — the headline number across the customer app */}
          <div className="bg-white rounded-2xl border-2 border-[#7C3AED] p-5 space-y-3 shadow-[0_2px_12px_rgba(124,58,237,0.12)]">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-[#7C3AED]" />
              <h2 className="text-[14px] font-[700] text-[#111827]">Delivery Promise</h2>
            </div>
            <p className="text-[12.5px] text-[#6B7280]">
              Shown everywhere on the customer app — navbar, hero, product cards, cart and checkout.
            </p>
            <div className="flex items-center gap-3">
              <input type="number" min="1" value={settings.deliveryMinutes} onChange={(e) => set('deliveryMinutes', e.target.value)}
                className="w-28 px-3.5 py-2.5 border border-[#E5E7EB] rounded-xl text-[18px] font-[800] text-center outline-none focus:border-[#7C3AED] transition-all" />
              <span className="text-[13.5px] text-[#374151] font-medium">minutes</span>
              <span className="ml-auto text-[12px] text-[#9CA3AF] italic">Preview: &quot;Delivery in {settings.deliveryMinutes || '10'} minutes&quot;</span>
            </div>
          </div>

          {/* General */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Store className="w-4 h-4 text-[#7C3AED]" />
              <h2 className="text-[14px] font-[700] text-[#111827]">General</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[12px] font-[600] text-[#374151] mb-1.5">Platform Name</label>
                <input value={settings.platformName} onChange={(e) => set('platformName', e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-[#E5E7EB] rounded-xl text-[13.5px] outline-none focus:border-[#7C3AED] transition-all" />
              </div>
              <div>
                <label className="block text-[12px] font-[600] text-[#374151] mb-1.5">Support Email</label>
                <input value={settings.supportEmail} onChange={(e) => set('supportEmail', e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-[#E5E7EB] rounded-xl text-[13.5px] outline-none focus:border-[#7C3AED] transition-all" />
              </div>
            </div>
          </div>

          {/* Groceries availability */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5">
            <div className="flex items-center gap-2 mb-1">
              <ShoppingBasket className="w-4 h-4 text-[#7C3AED]" />
              <h2 className="text-[14px] font-[700] text-[#111827]">Groceries</h2>
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-[13.5px] font-[600] text-[#111827]">Groceries available to customers</p>
                <p className="text-[12px] text-[#6B7280]">Turn off to pause grocery ordering — customers see a &quot;currently unavailable&quot; message instead of the catalog. Restaurant ordering is unaffected.</p>
              </div>
              <button onClick={() => set('groceriesAvailable', !settings.groceriesAvailable)}
                className={`relative w-11 h-6 rounded-full shrink-0 ml-4 transition-all duration-300 ${settings.groceriesAvailable ? 'bg-[#16A34A]' : 'bg-[#D1D5DB]'}`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-300 ${settings.groceriesAvailable ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>

            {categories.length > 0 && (
              <div className="mt-3 pt-3 border-t border-[#F3F4F6] space-y-1">
                <p className="text-[12px] font-[600] text-[#374151] mb-1">Pause a single category</p>
                <p className="text-[11.5px] text-[#9CA3AF] mb-2">Takes effect immediately — no need to hit Save. The rest of groceries stays open.</p>
                {categories.map((c) => (
                  <div key={c.id} className="flex items-center justify-between py-1.5">
                    <p className="text-[13px] text-[#111827]">{c.name}</p>
                    <button onClick={() => toggleCategory(c)} disabled={togglingCategory === c.id}
                      className={`relative w-9 h-5 rounded-full shrink-0 ml-4 transition-all duration-300 disabled:opacity-60 ${c.available ? 'bg-[#16A34A]' : 'bg-[#D1D5DB]'}`}>
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300 ${c.available ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Order defaults */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 space-y-4">
            <h2 className="text-[14px] font-[700] text-[#111827]">Order Defaults</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[12px] font-[600] text-[#374151] mb-1.5">Max Delivery Fee (₹)</label>
                <input type="number" value={settings.maxDeliveryFee} onChange={(e) => set('maxDeliveryFee', e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-[#E5E7EB] rounded-xl text-[13.5px] outline-none focus:border-[#7C3AED] transition-all" />
              </div>
              <div>
                <label className="block text-[12px] font-[600] text-[#374151] mb-1.5">Min Order Value (₹)</label>
                <input type="number" value={settings.minOrderValue} onChange={(e) => set('minOrderValue', e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-[#E5E7EB] rounded-xl text-[13.5px] outline-none focus:border-[#7C3AED] transition-all" />
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Bell className="w-4 h-4 text-[#7C3AED]" />
              <h2 className="text-[14px] font-[700] text-[#111827]">Notifications</h2>
            </div>
            {[
              { key: 'orderNotifications', label: 'New order alerts', desc: 'Notify admin when a new order is placed' },
              { key: 'newRestaurantAlerts', label: 'New restaurant registrations', desc: 'Alert when a restaurant owner signs up' },
            ].map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-[13.5px] font-[600] text-[#111827]">{label}</p>
                  <p className="text-[12px] text-[#6B7280]">{desc}</p>
                </div>
                <button onClick={() => set(key, !settings[key as keyof typeof settings])}
                  className={`relative w-11 h-6 rounded-full transition-all duration-300 ${settings[key as keyof typeof settings] ? 'bg-[#7C3AED]' : 'bg-[#D1D5DB]'}`}>
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-300 ${settings[key as keyof typeof settings] ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
            ))}
          </div>

          {/* Danger zone */}
          <div className="bg-white rounded-2xl border border-[#FECACA] p-5">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-[#DC2626]" />
              <h2 className="text-[14px] font-[700] text-[#DC2626]">Danger Zone</h2>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13.5px] font-[600] text-[#111827]">Maintenance Mode</p>
                <p className="text-[12px] text-[#6B7280]">Disable the app for all users while you make changes</p>
              </div>
              <button onClick={() => set('maintenanceMode', !settings.maintenanceMode)}
                className={`relative w-11 h-6 rounded-full transition-all duration-300 ${settings.maintenanceMode ? 'bg-[#DC2626]' : 'bg-[#D1D5DB]'}`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-300 ${settings.maintenanceMode ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
