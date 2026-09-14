export interface GroceryCategory {
  id: string
  name: string
  slug: string
  image_url: string | null
  icon: string | null
  sort_order: number
  is_active: boolean
  created_at: string
}

export interface GroceryProduct {
  id: string
  category_id: string
  name: string
  description: string | null
  image_url: string | null
  price: number
  mrp: number
  weight: string | null
  unit: string | null
  brand: string | null
  rating: number
  rating_count: number
  in_stock: boolean
  delivery_eta: string | null
  tags: string[] | null
  is_active: boolean
  created_at: string
  grocery_categories?: GroceryCategory
}

export interface Restaurant {
  id: string
  owner_id: string
  name: string
  slug: string
  description: string | null
  logo_url: string | null
  cover_url: string | null
  cuisine: string[]
  rating: number
  rating_count: number
  distance: number | null
  delivery_time: number
  min_order: number
  delivery_fee: number
  is_open: boolean
  is_active: boolean
  address: string | null
  latitude: number | null
  longitude: number | null
  created_at: string
}

export interface RestaurantCategory {
  id: string
  restaurant_id: string
  name: string
  sort_order: number
  is_active: boolean
}

export interface RestaurantProduct {
  id: string
  restaurant_id: string
  category_id: string | null
  name: string
  description: string | null
  image_url: string | null
  price: number
  mrp: number | null
  is_veg: boolean
  rating: number
  is_available: boolean
  is_bestseller: boolean
  customization_options: Record<string, unknown> | null
  restaurant_categories?: RestaurantCategory
}

export interface CartItem {
  id: string
  product_id: string
  product_type: 'grocery' | 'restaurant'
  restaurant_id: string | null
  name: string
  image_url: string | null
  price: number
  quantity: number
}

export interface Order {
  id: string
  user_id: string
  restaurant_id: string | null
  order_type: 'grocery' | 'restaurant'
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled'
  total: number
  delivery_fee: number
  discount: number
  address: string
  notes: string | null
  created_at: string
  restaurants?: Restaurant
  order_items?: OrderItem[]
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  product_type: 'grocery' | 'restaurant'
  name: string
  image_url: string | null
  price: number
  quantity: number
}

export interface Offer {
  id: string
  title: string
  description: string | null
  image_url: string | null
  discount_type: 'percentage' | 'flat'
  discount_value: number
  min_order: number | null
  code: string | null
  is_active: boolean
  expires_at: string | null
}

export interface Banner {
  id: string
  title: string
  subtitle: string | null
  image_url: string
  link: string | null
  sort_order: number
  is_active: boolean
}

export interface UserProfile {
  id: string
  email: string
  full_name: string | null
  phone: string | null
  avatar_url: string | null
  role: 'customer' | 'restaurant_owner' | 'admin' | 'delivery_partner'
  created_at: string
}

export interface Address {
  id: string
  user_id: string
  label: string
  full_address: string
  city: string
  pincode: string
  latitude: number | null
  longitude: number | null
  is_default: boolean
}
