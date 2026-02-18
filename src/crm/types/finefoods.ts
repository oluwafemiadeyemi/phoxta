// Types for Supabase-backed e-commerce features
// All IDs are UUIDs (strings). The custom data provider auto-converts
// snake_case ↔ camelCase on the top-level keys.

export interface ICategory {
  id: string;
  title: string;
  isActive: boolean;
  cover?: string;
  createdAt: string;
}

export interface IProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  isActive: boolean;
  categoryId?: string;
  categoryName?: string;
  imageUrl?: string;
  createdAt: string;
}

export interface IStore {
  id: string;
  title: string;
  email: string;
  gsm: string;
  address: string;
  isActive: boolean;
  createdAt: string;
  heroImageUrl?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  heroBadgeText?: string;
  heroCtaText?: string;
  heroCtaLink?: string;
  heroRatingText?: string;
  heroTypewriterWords?: string[];
  heroProductIds?: string[];
  heroBanners?: string[];
}

export interface ICustomer {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  gender: string;
  gsm: string;
  email: string;
  isActive: boolean;
  avatarUrl?: string;
  address?: string;
  createdAt: string;
}

export interface ICourierVehicle {
  model: string;
  vehicleType: string;
  engineSize?: number;
  color: string;
  year: number;
}

export interface ICourier {
  id: string;
  name: string;
  surname: string;
  email: string;
  gender: string;
  gsm: string;
  address: string;
  accountNumber: string;
  licensePlate: string;
  avatarUrl?: string;
  storeId?: string;
  storeName?: string;
  status: string; // "Available" | "Offline" | "On delivery"
  vehicle?: ICourierVehicle;
  createdAt: string;
}

export interface IOrder {
  id: string;
  orderNumber: number;
  amount: number;
  status: string; // "Pending" | "Ready" | "On The Way" | "Delivered" | "Cancelled"
  customerId?: string;
  customerName?: string;
  storeId?: string;
  storeName?: string;
  courierId?: string;
  courierName?: string;
  notes?: string;
  createdAt: string;
}

export interface IOrderProduct {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  price: number;
  productName?: string;
  productImageUrl?: string;
  createdAt: string;
}

export interface IReview {
  id: string;
  courierId: string;
  customerId?: string;
  customerName?: string;
  orderId?: string;
  star: number;
  text?: string;
  status: string; // "pending" | "approved" | "rejected"
  createdAt: string;
}
