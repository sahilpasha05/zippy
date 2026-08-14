import Navbar from '@/components/layout/Navbar'
import CartSidebar from '@/components/layout/CartSidebar'
import ViewCartBar from '@/components/layout/ViewCartBar'
import IndependenceDayHero from '@/components/home/IndependenceDayHero'
import BannerCarousel from '@/components/home/BannerCarousel'
import TrendingProducts from '@/components/home/TrendingProducts'
import FeaturedRestaurants from '@/components/home/FeaturedRestaurants'
import QuickCategories from '@/components/home/QuickCategories'
import SiteFooter from '@/components/layout/SiteFooter'
import HomeSignInPrompt from '@/components/HomeSignInPrompt'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <CartSidebar />
      <ViewCartBar />
      <HomeSignInPrompt />

      <div className="max-w-[1440px] mx-auto px-6 lg:px-10 space-y-10 lg:space-y-16 pb-20 pt-4">
        <IndependenceDayHero />
        <BannerCarousel />
        <QuickCategories />
        <TrendingProducts />
        <FeaturedRestaurants />
      </div>
      <SiteFooter />
    </div>
  )
}
