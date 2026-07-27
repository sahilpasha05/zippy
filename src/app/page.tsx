import Navbar from '@/components/layout/Navbar'
import CartSidebar from '@/components/layout/CartSidebar'
import HeroSection from '@/components/home/HeroSection'
import CategoryGrid from '@/components/home/CategoryGrid'
import BannerCarousel from '@/components/home/BannerCarousel'
import TrendingProducts from '@/components/home/TrendingProducts'
import FeaturedRestaurants from '@/components/home/FeaturedRestaurants'
import OffersStrip from '@/components/home/OffersStrip'
import QuickCategories from '@/components/home/QuickCategories'
import SiteFooter from '@/components/layout/SiteFooter'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <CartSidebar />

      {/* Hero is desktop-only — mobile goes straight to categories like Blinkit */}
      <div className="hidden lg:block">
        <HeroSection />
      </div>

      <div className="max-w-[1440px] mx-auto px-6 lg:px-10 space-y-10 lg:space-y-16 pb-20 pt-4 lg:pt-0">
        <QuickCategories />
        {/* Desktop only: banner sits after the category grid */}
        <div className="hidden lg:block">
          <BannerCarousel />
        </div>
        <CategoryGrid />
        <OffersStrip />
        <TrendingProducts />
        <FeaturedRestaurants />
      </div>
      <SiteFooter />
    </div>
  )
}
