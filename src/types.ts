export interface ProductImage {
  id: string;
  url: string;
  isPrimary: boolean;
  caption?: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  originalPrice?: number;
  priceLabel: string;
  shortDescription: string;
  description: string;
  images: ProductImage[];
  variants: string[];
  sizes?: string[];
  inclusions: string[];
  unit?: string;
  stockStatus?: string;
  promoLabel?: string;
  isPromo?: boolean;
  isAvailable: boolean;
  isFeatured: boolean;
  isNew?: boolean;
  isActive?: boolean;
  popularityScore?: number;
  visibility: 'public';
  authorUid: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  iconName: string;
  coverImageUrl: string;
  sortOrder: number;
  visibility: 'public';
  authorUid: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface WeddingPackage {
  id: string;
  name: string;
  tier: string;
  price: number;
  originalPrice?: number;
  guestCapacity: string;
  description: string;
  inclusions: string[];
  images: ProductImage[];
  isPopular: boolean;
  isPromo?: boolean;
  promoLabel?: string;
  isActive?: boolean;
  visibility: 'public';
  authorUid: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface GalleryItem {
  id: string;
  title: string;
  category: string;
  imageUrl: string;
  caption: string;
  location?: string;
  theme?: string;
  images?: ProductImage[];
  aspectType: 'landscape' | 'portrait' | 'square';
  visibility: 'public';
  authorUid: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Testimonial {
  id: string;
  coupleName: string;
  eventDate: string;
  venue: string;
  packageTaken: string;
  rating: number;
  review: string;
  images: ProductImage[];
  visibility: 'public';
  authorUid: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Promo {
  id: string;
  title: string;
  description: string;
  promoPrice: number;
  normalPrice: number;
  imageUrl: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  badgeText?: string;
  isActive: boolean;
  visibility: 'public';
  authorUid: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface InspirationArticle {
  id: string;
  title: string;
  category: string;
  excerpt: string;
  content: string;
  imageUrl: string;
  readTime: string;
  publishedDate: string;
  visibility: 'public';
  authorUid: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type CalendarDateStatus = 'available' | 'reserved' | 'unavailable';

export interface CalendarPublicEntry {
  date: string; // YYYY-MM-DD
  status: CalendarDateStatus;
  publicNote: string;
  visibility: 'public';
  authorUid: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface CalendarPrivateEntry {
  date: string; // YYYY-MM-DD
  clientName: string;
  privateNote: string;
  authorUid: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ServiceArea {
  id: string;
  city: string;
  province: string;
  description: string;
  isPrimary: boolean;
  visibility: 'public';
  authorUid: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ConsultationCartItem {
  productId: string;
  product: Product;
  quantity: number;
  selectedVariant?: string;
  selectedSize?: string;
  note?: string;
}

export interface BudgetAllocation {
  guestCount: number;
  catering: number;
  dekorasi: number;
  tenda: number;
  undangan: number;
  souvenir: number;
  dokumentasi: number;
  makeup: number;
  wo: number;
  sanggar: number;
  attire: number;
  entertainment?: number;
  mc?: number;
  parkir?: number;
  busana: number;
  mahar: number;
  seserahan: number;
  lainnya: number;
  notes?: string;
}

export interface WeddingPlanData {
  coupleName?: string;
  weddingLocation?: string;
  weddingDate: string;
  guestCount: number;
  themes: string[];
  selectedDecorId: string;
  selectedInvitationId: string;
  invitationQty: number;
  selectedSouvenirId: string;
  souvenirQty: number;
  selectedMaharId: string;
  additionalServiceIds: string[];
  customNotes: string;
}

export interface ConsultationInquiry {
  id: string;
  userId?: string;
  coupleName?: string;
  weddingLocation?: string;
  weddingDate?: string;
  weddingTheme?: string;
  guestScale?: string;
  estimatedTotal?: number;
  customNotes?: string;
  status?: string;
  type: 'cart' | 'budget' | 'planner' | 'product' | 'date';
  customerDate: string;
  guestCount: number;
  itemsSummary: string[];
  totalEstimate: number;
  createdAt: string;
}

export interface UserWorkspaceDoc {
  userId: string;
  coupleName: string;
  weddingLocation: string;
  cartWeddingDate: string;
  cartGuestCount: number;
  cartItemsJson: string;
  wishlistIds: string[];
  weddingPlanJson: string;
  budgetAllocationJson: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface StoreSettings {
  id: string;
  businessName: string;
  tagline: string;
  whatsappNumber: string;
  email: string;
  address: string;
  instagram: string;
  tiktok?: string;
  heroTitle: string;
  heroSubtitle: string;
  heroImageUrl: string;
  logoText: string;
  visibility: 'public';
  authorUid: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type ActivePage =
  | 'home'
  | 'services'
  | 'catalog'
  | 'packages'
  | 'planner'
  | 'budget'
  | 'gallery'
  | 'promo'
  | 'articles'
  | 'wishlist'
  | 'admin';
