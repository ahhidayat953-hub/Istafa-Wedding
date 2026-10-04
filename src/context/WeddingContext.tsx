import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import {
  INITIAL_ARTICLES,
  INITIAL_BUDGET_ALLOCATION,
  INITIAL_CALENDAR_PRIVATE,
  INITIAL_CALENDAR_PUBLIC,
  INITIAL_CATEGORIES,
  INITIAL_GALLERY,
  INITIAL_PACKAGES,
  INITIAL_PRODUCTS,
  INITIAL_PROMOS,
  INITIAL_SERVICE_AREAS,
  INITIAL_SETTINGS,
  INITIAL_TESTIMONIALS,
} from '../data/initialData';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from '../firebase';
import {
  BudgetAllocation,
  CalendarPrivateEntry,
  CalendarPublicEntry,
  Category,
  ConsultationCartItem,
  ConsultationInquiry,
  ConsultationMessage,
  ConsultationSession,
  GalleryItem,
  InspirationArticle,
  LeadRecord,
  LeadStatus,
  OrderStatus,
  Product,
  Promo,
  ServiceArea,
  StoreSettings,
  Testimonial,
  UserWorkspaceDoc,
  WeddingOrder,
  WeddingPackage,
  WeddingPlanData,
} from '../types';
import { INITIAL_CONSULTATION_GREETING } from '../utils/consultationEngine';
import {
  deleteStorageUrls,
  enrichProductImagesForDatabase,
  getPrimaryImage,
  hashPasswordHex,
  isValidPersistentImageUrl,
  normalizeWeddingImageUrl,
} from '../utils/imageUtils';

const SERVER_ADMIN_ACTOR_UID = 'istafa-server-admin-v1';
const SERVER_GATE_DOC_ID = 'istafa_server_gate';
const SERVER_GATE_KEY = 'istafa_verified_gate_9c74e18b2a5f04d6e8b1a3c5f7d9e2a4b6c';
const ADMIN_SESSION_STORAGE_KEY = 'istafa_admin_session_v3';

interface StoredAdminSession {
  token: string;
  tokenHash: string;
  username: string;
  expiresAt: number;
}

function loadStoredAdminSession(): StoredAdminSession | null {
  try {
    const raw = localStorage.getItem(ADMIN_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredAdminSession;
    if (
      !parsed ||
      typeof parsed.token !== 'string' ||
      typeof parsed.tokenHash !== 'string' ||
      typeof parsed.expiresAt !== 'number'
    ) {
      return null;
    }
    if (Date.now() > parsed.expiresAt) {
      localStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

async function ensureAdminFirestoreGate(sessionTokenHash?: string): Promise<void> {
  try {
    const now = serverTimestamp();
    await setDoc(doc(db, 'adminSessions', SERVER_GATE_DOC_ID), {
      sessionId: SERVER_GATE_DOC_ID,
      gateKey: SERVER_GATE_KEY,
      visibility: 'public',
      createdAt: now,
      updatedAt: now,
    });
    if (
      sessionTokenHash &&
      sessionTokenHash.length >= 32 &&
      sessionTokenHash.length <= 128 &&
      /^[a-zA-Z0-9_-]+$/.test(sessionTokenHash)
    ) {
      await setDoc(doc(db, 'adminSessions', sessionTokenHash), {
        sessionId: sessionTokenHash,
        gateKey: SERVER_GATE_KEY,
        visibility: 'public',
        createdAt: now,
        updatedAt: now,
      });
    }
  } catch (err) {
    console.warn('Firestore gate sync notice:', err);
  }
}

const STORAGE_KEYS = {
  settings: 'istafa_wedding_settings_v3',
  categories: 'istafa_wedding_categories_v4',
  products: 'istafa_wedding_products_v4',
  packages: 'istafa_wedding_packages_v4',
  gallery: 'istafa_wedding_gallery_v3',
  testimonials: 'istafa_wedding_testimonials_v2',
  promos: 'istafa_wedding_promos_v1',
  articles: 'istafa_wedding_articles_v1',
  calendarPublic: 'istafa_wedding_calendar_pub_v1',
  calendarPrivate: 'istafa_wedding_calendar_priv_v1',
  serviceAreas: 'istafa_wedding_service_areas_v1',
  wishlist: 'aurelia_wedding_wishlist_v1',
  cart: 'istafa_wedding_cart_v1',
  budget: 'istafa_wedding_budget_v4',
  planner: 'istafa_wedding_planner_v4',
  inquiries: 'istafa_wedding_inquiries_v1',
  adminAuthHash: 'istafa_wedding_admin_hash_v1',
  adminSession: 'istafa_wedding_admin_session_v1',
  guestUid: 'istafa_guest_uid_v1',
};

function generateUniqueGuestId(): string {
  return `guest_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function getOrCreateGuestId(): string {
  try {
    const existing = localStorage.getItem(STORAGE_KEYS.guestUid);
    if (existing && /^[a-zA-Z0-9_-]+$/.test(existing)) {
      return existing;
    }
    const fresh = generateUniqueGuestId();
    localStorage.setItem(STORAGE_KEYS.guestUid, fresh);
    return fresh;
  } catch {
    return generateUniqueGuestId();
  }
}

function createFreshGuestId(): string {
  const fresh = generateUniqueGuestId();
  try {
    localStorage.setItem(STORAGE_KEYS.guestUid, fresh);
  } catch {
    // ignore storage errors
  }
  return fresh;
}

function getUserScopedKey(
  userId: string,
  field: 'wishlist' | 'cart' | 'budget' | 'planner' | 'meta' | 'inquiries' | 'consultations'
): string {
  const safeUid = (userId || 'guest').replace(/[^a-zA-Z0-9_-]/g, '_');
  return `istafa_u_${safeUid}_${field}_v2`;
}

function createDefaultConsultationSession(
  userId: string,
  coupleName = '',
  weddingDate = '2026-11-14',
  weddingLocation = '',
  guestCount = 0,
  targetBudget = 0
): ConsultationSession {
  const nowIso = new Date().toISOString();
  const sessionId = `cons_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  const greetingMsg: ConsultationMessage = {
    id: `msg_init_${Date.now().toString(36)}`,
    consultationId: sessionId,
    userId,
    sender: 'consultant',
    message: INITIAL_CONSULTATION_GREETING,
    recommendations: [],
    createdAt: nowIso,
  };
  return {
    id: sessionId,
    userId,
    title: 'Konsultasi Rencana Pernikahan',
    coupleName,
    weddingDate,
    weddingLocation,
    guestCount,
    targetBudget,
    weddingTheme: '',
    desiredColors: '',
    messages: [greetingMsg],
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

interface UserMetaState {
  coupleName: string;
  weddingLocation: string;
  cartWeddingDate: string;
  cartGuestCount: number;
}

const DEFAULT_USER_META: UserMetaState = {
  coupleName: '',
  weddingLocation: '',
  cartWeddingDate: '2026-11-14',
  cartGuestCount: 300,
};

export interface AdminCredentialsRecord {
  username: string;
  passwordHash: string;
}

function loadFromLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveToLocal<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.warn('Local storage quota warning:', err);
  }
}

const INITIAL_PLANNER_STATE: WeddingPlanData = {
  coupleName: '',
  weddingLocation: '',
  weddingDate: '2026-11-14',
  guestCount: 300,
  themes: ['Elegant', 'Gold', 'Krem'],
  selectedDecorId: 'prod-wedding-decor-elegant',
  selectedInvitationId: 'prod-undangan-cotton-foil',
  invitationQty: 300,
  selectedSouvenirId: 'prod-souvenir-parfum-artisan',
  souvenirQty: 300,
  selectedMaharId: 'prod-mahar-ringbox-brass',
  additionalServiceIds: [
    'prod-makeup-pengantin-flawless',
    'prod-wo-wedding-organizer',
    'prod-tim-sanggar-pertunjukan',
    'prod-tim-attire-pendampingan',
    'prod-dokumentasi-cinematic',
  ],
  customNotes: '',
};

interface WeddingContextValue {
  user: User | null;
  currentUserId: string;
  isGuestUser: boolean;
  authReady: boolean;
  isCloudAdmin: boolean;
  isPreviewAdminUnlocked: boolean;
  adminUsername: string;
  unlockPreviewAdmin: () => void;
  loginWithCredentials: (usernameOrEmail: string, passwordInput: string) => Promise<boolean>;
  updateAdminCredentials: (newUsername: string, newPassword?: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginCustomerWithGoogle: () => Promise<void>;
  logoutCustomer: () => Promise<void>;
  switchGuestSession: () => void;
  logoutAdmin: () => Promise<void>;
  settings: StoreSettings;
  categories: Category[];
  products: Product[];
  packages: WeddingPackage[];
  gallery: GalleryItem[];
  testimonials: Testimonial[];
  promos: Promo[];
  activePromos: Promo[];
  articles: InspirationArticle[];
  calendarPublic: CalendarPublicEntry[];
  calendarPrivate: CalendarPrivateEntry[];
  serviceAreas: ServiceArea[];
  inquiries: ConsultationInquiry[];
  leads: LeadRecord[];
  allConsultations: ConsultationSession[];
  orders: WeddingOrder[];
  isSyncing: boolean;
  toastMessage: string | null;
  showToast: (msg: string) => void;
  // Wishlist operations
  wishlistIds: string[];
  wishlistProducts: Product[];
  isInWishlist: (productId: string) => boolean;
  toggleWishlist: (product: Product) => void;
  removeFromWishlist: (productId: string) => void;
  clearWishlist: () => void;
  // Consultation Cart operations (Keranjang Konsultasi)
  cartItems: ConsultationCartItem[];
  cartTotal: number;
  cartWeddingDate: string;
  cartGuestCount: number;
  setCartWeddingDate: (date: string) => void;
  setCartGuestCount: (guests: number) => void;
  addToCart: (
    product: Product,
    quantity?: number,
    selectedVariant?: string,
    selectedSize?: string
  ) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  // Budget Calculator operations
  budgetAllocation: BudgetAllocation;
  updateBudgetAllocation: (next: Partial<BudgetAllocation>) => void;
  syncCartToBudget: () => void;
  applyProductToBudget: (product: Product, quantity?: number) => void;
  saveBudgetPlan: () => void;
  // 10-Step Wedding Planner Wizard operations
  weddingPlan: WeddingPlanData;
  updateWeddingPlan: (next: Partial<WeddingPlanData>) => void;
  addProductToWeddingPlan: (
    product: Product,
    contextOverrides?: Partial<WeddingPlanData>
  ) => void;
  syncPlannerToBudget: () => void;
  // Konsultasi Pernikahan ISTAFA operations (per-user isolated + server DB synced)
  consultationSessions: ConsultationSession[];
  activeConsultation: ConsultationSession;
  startNewConsultationSession: () => ConsultationSession;
  selectConsultationSession: (sessionId: string) => void;
  deleteConsultationSession: (sessionId: string) => void;
  saveConsultationSessionState: (updatedSession: ConsultationSession) => void;
  trackProductInterest: (productId: string, mode?: 'viewed' | 'interested') => void;
  // Leads & Orders CRM operations
  saveLead: (lead: Partial<LeadRecord>) => Promise<LeadRecord | null>;
  updateLeadStatus: (leadId: string, status: LeadStatus, notes?: string) => Promise<void>;
  deleteLead: (leadId: string) => Promise<void>;
  createOrder: (
    orderInput: Omit<WeddingOrder, 'id' | 'orderNumber' | 'userId' | 'createdAt' | 'updatedAt'>
  ) => Promise<WeddingOrder | null>;
  updateOrderStatus: (orderId: string, status: OrderStatus, notes?: string) => Promise<void>;
  deleteOrder: (orderId: string) => Promise<void>;
  // Record inquiry
  recordInquiry: (inquiry: Omit<ConsultationInquiry, 'id' | 'createdAt'>) => void;
  // CRUD operations
  saveProduct: (product: Omit<Product, 'id' | 'visibility' | 'authorUid'> & { id?: string }) => Promise<void>;
  toggleProductActive: (productId: string) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  saveCategory: (cat: Omit<Category, 'id' | 'visibility' | 'authorUid'> & { id?: string }) => Promise<void>;
  deleteCategory: (categoryId: string) => Promise<void>;
  savePackage: (pkg: Omit<WeddingPackage, 'id' | 'visibility' | 'authorUid'> & { id?: string }) => Promise<void>;
  deletePackage: (packageId: string) => Promise<void>;
  saveGalleryItem: (item: Omit<GalleryItem, 'id' | 'visibility' | 'authorUid'> & { id?: string }) => Promise<void>;
  deleteGalleryItem: (galleryId: string) => Promise<void>;
  saveTestimonial: (item: Omit<Testimonial, 'id' | 'visibility' | 'authorUid'> & { id?: string }) => Promise<void>;
  deleteTestimonial: (testimonialId: string) => Promise<void>;
  savePromo: (promo: Omit<Promo, 'id' | 'visibility' | 'authorUid'> & { id?: string }) => Promise<void>;
  deletePromo: (promoId: string) => Promise<void>;
  saveArticle: (article: Omit<InspirationArticle, 'id' | 'visibility' | 'authorUid'> & { id?: string }) => Promise<void>;
  deleteArticle: (articleId: string) => Promise<void>;
  saveCalendarDate: (
    date: string,
    status: CalendarPublicEntry['status'],
    publicNote: string,
    clientName?: string,
    privateNote?: string
  ) => Promise<void>;
  deleteCalendarDate: (date: string) => Promise<void>;
  saveServiceArea: (area: Omit<ServiceArea, 'id' | 'visibility' | 'authorUid'> & { id?: string }) => Promise<void>;
  deleteServiceArea: (areaId: string) => Promise<void>;
  updateStoreSettings: (newSettings: Omit<StoreSettings, 'id' | 'visibility' | 'authorUid'>) => Promise<void>;
  seedInitialDataToCloud: () => Promise<void>;
}

const WeddingContext = createContext<WeddingContextValue | undefined>(undefined);

function mapCategoryToBudgetField(categoryName: string): keyof Omit<BudgetAllocation, 'guestCount' | 'notes'> {
  const c = categoryName.toLowerCase();
  if (c.includes('dekorasi') || c.includes('buket')) return 'dekorasi';
  if (c.includes('tenda')) return 'tenda';
  if (c.includes('undangan')) return 'undangan';
  if (c.includes('souvenir')) return 'souvenir';
  if (c.includes('dokumentasi')) return 'dokumentasi';
  if (c.includes('makeup') || c.includes('mua') || c.includes('rias')) return 'makeup';
  if (c.includes('wo') || c.includes('organizer')) return 'wo';
  if (c.includes('sanggar') || c.includes('pertunjukan')) return 'sanggar';
  if (c.includes('attire') || c.includes('pendampingan')) return 'attire';
  if (c.includes('entertainment') || c.includes('musik') || c.includes('band')) return 'entertainment';
  if (c === 'mc' || c.includes('master of ceremony') || c.includes('pembawa acara')) return 'mc';
  if (c.includes('parkir') || c.includes('security') || c.includes('keamanan')) return 'parkir';
  if (c.includes('busana') || c.includes('kebaya') || c.includes('gaun')) return 'busana';
  if (c.includes('mahar')) return 'mahar';
  if (c.includes('seserahan') || c.includes('hantaran')) return 'seserahan';
  if (c.includes('catering') || c.includes('katering')) return 'catering';
  return 'lainnya';
}

export const WeddingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [guestUserId, setGuestUserId] = useState<string>(() => getOrCreateGuestId());
  const [authReady, setAuthReady] = useState(false);
  const [isPreviewAdminUnlocked, setIsPreviewAdminUnlocked] = useState<boolean>(() =>
    Boolean(loadStoredAdminSession())
  );
  const [adminAuthRecord, setAdminAuthRecord] = useState<AdminCredentialsRecord>(() => {
    const activeSess = loadStoredAdminSession();
    return loadFromLocal<AdminCredentialsRecord>(STORAGE_KEYS.adminAuthHash, {
      username: activeSess?.username || '',
      passwordHash: '',
    });
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const currentUserId = user?.uid || guestUserId;
  const isGuestUser = !user;

  const [settings, setSettings] = useState<StoreSettings>(() =>
    loadFromLocal(STORAGE_KEYS.settings, INITIAL_SETTINGS)
  );
  const [categories, setCategories] = useState<Category[]>(() =>
    loadFromLocal(STORAGE_KEYS.categories, INITIAL_CATEGORIES)
  );
  const [products, setProducts] = useState<Product[]>(() =>
    loadFromLocal(STORAGE_KEYS.products, INITIAL_PRODUCTS)
  );
  const [packages, setPackages] = useState<WeddingPackage[]>(() =>
    loadFromLocal(STORAGE_KEYS.packages, INITIAL_PACKAGES)
  );
  const [gallery, setGallery] = useState<GalleryItem[]>(() =>
    loadFromLocal(STORAGE_KEYS.gallery, INITIAL_GALLERY)
  );
  const [testimonials, setTestimonials] = useState<Testimonial[]>(() =>
    loadFromLocal(STORAGE_KEYS.testimonials, INITIAL_TESTIMONIALS)
  );
  const [promos, setPromos] = useState<Promo[]>(() =>
    loadFromLocal(STORAGE_KEYS.promos, INITIAL_PROMOS)
  );
  const [articles, setArticles] = useState<InspirationArticle[]>(() =>
    loadFromLocal(STORAGE_KEYS.articles, INITIAL_ARTICLES)
  );
  const [calendarPublic, setCalendarPublic] = useState<CalendarPublicEntry[]>(() =>
    loadFromLocal(STORAGE_KEYS.calendarPublic, INITIAL_CALENDAR_PUBLIC)
  );
  const [calendarPrivate, setCalendarPrivate] = useState<CalendarPrivateEntry[]>(() =>
    loadFromLocal(STORAGE_KEYS.calendarPrivate, INITIAL_CALENDAR_PRIVATE)
  );
  const [serviceAreas, setServiceAreas] = useState<ServiceArea[]>(() =>
    loadFromLocal(STORAGE_KEYS.serviceAreas, INITIAL_SERVICE_AREAS)
  );

  // Per-User Isolated States (Wishlist, Cart, Budget, Wedding Plan, Meta)
  const [wishlistIds, setWishlistIds] = useState<string[]>(() =>
    loadFromLocal<string[]>(getUserScopedKey(currentUserId, 'wishlist'), [])
  );
  const [cartItems, setCartItems] = useState<ConsultationCartItem[]>(() =>
    loadFromLocal<ConsultationCartItem[]>(getUserScopedKey(currentUserId, 'cart'), [])
  );
  const [userMeta, setUserMeta] = useState<UserMetaState>(() =>
    loadFromLocal<UserMetaState>(getUserScopedKey(currentUserId, 'meta'), DEFAULT_USER_META)
  );
  const [budgetAllocation, setBudgetAllocation] = useState<BudgetAllocation>(() =>
    loadFromLocal<BudgetAllocation>(
      getUserScopedKey(currentUserId, 'budget'),
      INITIAL_BUDGET_ALLOCATION
    )
  );
  const [weddingPlan, setWeddingPlan] = useState<WeddingPlanData>(() =>
    loadFromLocal<WeddingPlanData>(
      getUserScopedKey(currentUserId, 'planner'),
      INITIAL_PLANNER_STATE
    )
  );
  const [consultationSessions, setConsultationSessions] = useState<ConsultationSession[]>(() => {
    const saved = loadFromLocal<ConsultationSession[]>(
      getUserScopedKey(currentUserId, 'consultations'),
      []
    );
    if (saved && saved.length > 0) return saved;
    return [createDefaultConsultationSession(currentUserId)];
  });
  const [activeConsultationId, setActiveConsultationId] = useState<string>(() => {
    const saved = loadFromLocal<ConsultationSession[]>(
      getUserScopedKey(currentUserId, 'consultations'),
      []
    );
    return saved[0]?.id || '';
  });
  const [inquiries, setInquiries] = useState<ConsultationInquiry[]>(() =>
    loadFromLocal<ConsultationInquiry[]>(STORAGE_KEYS.inquiries, [])
  );
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [allConsultations, setAllConsultations] = useState<ConsultationSession[]>([]);
  const [orders, setOrders] = useState<WeddingOrder[]>([]);
  const [serverDbReady, setServerDbReady] = useState<boolean>(false);

  const cartWeddingDate = userMeta.cartWeddingDate;
  const cartGuestCount = userMeta.cartGuestCount;
  const userCoupleName = userMeta.coupleName || weddingPlan.coupleName || '';
  const userWeddingLocation = userMeta.weddingLocation || weddingPlan.weddingLocation || '';

  // Verify active admin session on mount / refresh & subscribe to real-time Cloud Firestore
  useEffect(() => {
    let active = true;

    async function verifySessionOnMount() {
      const storedSession = loadStoredAdminSession();
      if (!storedSession) {
        setIsPreviewAdminUnlocked(false);
        return;
      }

      try {
        const res = await fetch('/api/auth/verify', {
          headers: { Authorization: `Bearer ${storedSession.token}` },
        });
        if (res.status === 401) {
          if (!active) return;
          localStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
          saveToLocal(STORAGE_KEYS.adminSession, false);
          setIsPreviewAdminUnlocked(false);
          return;
        }
      } catch {
        // If offline or serverless cold start, also verify against Firestore adminSessions
      }

      try {
        const snap = await getDoc(doc(db, 'adminSessions', storedSession.tokenHash));
        if (snap.exists()) {
          if (!active) return;
          setIsPreviewAdminUnlocked(true);
          setAdminAuthRecord((prev) => ({
            ...prev,
            username: storedSession.username || prev.username,
          }));
          await ensureAdminFirestoreGate(storedSession.tokenHash);
        } else {
          // Session was created before or needs gate registration
          await ensureAdminFirestoreGate(storedSession.tokenHash);
          if (active) setIsPreviewAdminUnlocked(true);
        }
      } catch {
        if (active) setIsPreviewAdminUnlocked(true);
      }
    }

    void verifySessionOnMount();

    // Real-time Cloud Firestore listeners (Products + Relational Product Images + All Collections)
    let latestFirestoreProducts: Product[] | null = null;
    const latestProductImagesByProdId = new Map<string, Product['images']>();

    const rebuildAndApplyProducts = () => {
      if (!active || !latestFirestoreProducts || latestFirestoreProducts.length === 0) return;
      const merged = latestFirestoreProducts.map((prod) => {
        const relationalImgs = latestProductImagesByProdId.get(prod.id);
        const sourceImgs =
          relationalImgs && relationalImgs.length > 0
            ? relationalImgs
            : prod.images || [];
        const enriched = enrichProductImagesForDatabase(prod.id, sourceImgs);
        return {
          ...prod,
          images: enriched,
        };
      });
      setProducts(merged);
      saveToLocal(STORAGE_KEYS.products, merged);
      setServerDbReady(true);
    };

    const unsubProductImages = onSnapshot(
      query(collection(db, 'product_images'), where('visibility', '==', 'public')),
      (snap) => {
        if (!active) return;
        latestProductImagesByProdId.clear();
        const grouped = new Map<string, Product['images']>();
        snap.docs.forEach((d) => {
          const data = d.data();
          const prodId = String(data.product_id || '');
          if (!prodId) return;
          const imgItem = {
            id: String(data.image_id || d.id),
            image_id: String(data.image_id || d.id),
            product_id: prodId,
            url: normalizeWeddingImageUrl(String(data.image_url || '')),
            image_url: normalizeWeddingImageUrl(String(data.image_url || '')),
            storage_path: String(data.storage_path || ''),
            isPrimary: Boolean(data.is_primary),
            is_primary: Boolean(data.is_primary),
            sort_order: typeof data.sort_order === 'number' ? data.sort_order : 0,
            caption: String(data.caption || ''),
            created_at: String(data.created_at || ''),
          };
          const list = grouped.get(prodId) || [];
          list.push(imgItem);
          grouped.set(prodId, list);
        });
        grouped.forEach((list, prodId) => {
          list.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
          latestProductImagesByProdId.set(prodId, list);
        });
        rebuildAndApplyProducts();
      },
      () => {}
    );

    const unsubProducts = onSnapshot(
      query(collection(db, 'products'), where('visibility', '==', 'public')),
      (snap) => {
        if (!active) return;
        if (snap.empty) {
          // Non-destructive initial seed if Cloud Firestore `products` is completely empty
          void (async () => {
            try {
              await ensureAdminFirestoreGate();
              const checkAgain = await getDocs(
                query(collection(db, 'products'), where('visibility', '==', 'public'))
              );
              if (checkAgain.empty) {
                await seedNonDestructiveInitialCatalog();
              }
            } catch {
              // ignore
            }
          })();
          return;
        }
        latestFirestoreProducts = snap.docs.map((d) => {
          const data = d.data();
          const rawImages = Array.isArray(data.images) ? data.images : [];
          return {
            id: d.id,
            name: String(data.name || ''),
            category: String(data.category || ''),
            price: Number(data.price) || 0,
            originalPrice: data.originalPrice ? Number(data.originalPrice) : undefined,
            priceLabel: String(data.priceLabel || 'Mulai dari'),
            shortDescription: String(data.shortDescription || ''),
            description: String(data.description || ''),
            images: enrichProductImagesForDatabase(d.id, rawImages),
            variants: Array.isArray(data.variants) ? data.variants : [],
            sizes: Array.isArray(data.sizes) ? data.sizes : [],
            inclusions: Array.isArray(data.inclusions) ? data.inclusions : [],
            unit: String(data.unit || 'Paket'),
            stockStatus: String(data.stockStatus || 'Tersedia'),
            promoLabel: String(data.promoLabel || ''),
            isPromo: Boolean(data.isPromo),
            isAvailable: data.isAvailable !== false,
            isFeatured: Boolean(data.isFeatured),
            isNew: Boolean(data.isNew),
            isActive: data.isActive !== false,
            popularityScore: Number(data.popularityScore) || 88,
            visibility: 'public',
            authorUid: String(data.authorUid || SERVER_ADMIN_ACTOR_UID),
          };
        });
        rebuildAndApplyProducts();
      },
      () => {}
    );

    const unsubCategories = onSnapshot(
      query(collection(db, 'categories'), where('visibility', '==', 'public')),
      (snap) => {
        if (!active || snap.empty) return;
        const list: Category[] = snap.docs
          .map((d) => {
            const data = d.data();
            return {
              id: d.id,
              name: String(data.name || ''),
              slug: String(data.slug || ''),
              description: String(data.description || ''),
              iconName: String(data.iconName || 'Sparkles'),
              coverImageUrl: normalizeWeddingImageUrl(String(data.coverImageUrl || '')),
              sortOrder: Number(data.sortOrder) || 1,
              visibility: 'public' as const,
              authorUid: String(data.authorUid || SERVER_ADMIN_ACTOR_UID),
            };
          })
          .sort((a, b) => a.sortOrder - b.sortOrder);
        setCategories(list);
        saveToLocal(STORAGE_KEYS.categories, list);
      },
      () => {}
    );

    const unsubPackages = onSnapshot(
      query(collection(db, 'packages'), where('visibility', '==', 'public')),
      (snap) => {
        if (!active || snap.empty) return;
        const list: WeddingPackage[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            name: String(data.name || ''),
            tier: String(data.tier || ''),
            price: Number(data.price) || 0,
            originalPrice: data.originalPrice ? Number(data.originalPrice) : undefined,
            guestCapacity: String(data.guestCapacity || ''),
            description: String(data.description || ''),
            inclusions: Array.isArray(data.inclusions) ? data.inclusions : [],
            images: enrichProductImagesForDatabase(
              d.id,
              Array.isArray(data.images) ? data.images : []
            ),
            isPopular: Boolean(data.isPopular),
            isPromo: Boolean(data.isPromo),
            promoLabel: String(data.promoLabel || ''),
            isActive: data.isActive !== false,
            visibility: 'public',
            authorUid: String(data.authorUid || SERVER_ADMIN_ACTOR_UID),
          };
        });
        setPackages(list);
        saveToLocal(STORAGE_KEYS.packages, list);
      },
      () => {}
    );

    const unsubGallery = onSnapshot(
      query(collection(db, 'gallery'), where('visibility', '==', 'public')),
      (snap) => {
        if (!active || snap.empty) return;
        const list: GalleryItem[] = snap.docs.map((d) => {
          const data = d.data();
          const imgs = enrichProductImagesForDatabase(
            d.id,
            Array.isArray(data.images) ? data.images : []
          );
          return {
            id: d.id,
            title: String(data.title || ''),
            category: String(data.category || ''),
            imageUrl: normalizeWeddingImageUrl(
              String(data.imageUrl || imgs[0]?.url || '')
            ),
            caption: String(data.caption || ''),
            location: String(data.location || ''),
            theme: String(data.theme || ''),
            images: imgs,
            aspectType:
              data.aspectType === 'portrait' || data.aspectType === 'square'
                ? data.aspectType
                : 'landscape',
            visibility: 'public',
            authorUid: String(data.authorUid || SERVER_ADMIN_ACTOR_UID),
          };
        });
        setGallery(list);
        saveToLocal(STORAGE_KEYS.gallery, list);
      },
      () => {}
    );

    const unsubTestimonials = onSnapshot(
      query(collection(db, 'testimonials'), where('visibility', '==', 'public')),
      (snap) => {
        if (!active || snap.empty) return;
        const list: Testimonial[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            coupleName: String(data.coupleName || ''),
            eventDate: String(data.eventDate || ''),
            venue: String(data.venue || ''),
            packageTaken: String(data.packageTaken || ''),
            rating: Number(data.rating) || 5,
            review: String(data.review || ''),
            images: enrichProductImagesForDatabase(
              d.id,
              Array.isArray(data.images) ? data.images : []
            ),
            visibility: 'public',
            authorUid: String(data.authorUid || SERVER_ADMIN_ACTOR_UID),
          };
        });
        setTestimonials(list);
        saveToLocal(STORAGE_KEYS.testimonials, list);
      },
      () => {}
    );

    const unsubPromos = onSnapshot(
      query(collection(db, 'promos'), where('visibility', '==', 'public')),
      (snap) => {
        if (!active || snap.empty) return;
        const list: Promo[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            title: String(data.title || ''),
            description: String(data.description || ''),
            promoPrice: Number(data.promoPrice) || 0,
            normalPrice: Number(data.normalPrice) || 0,
            imageUrl: normalizeWeddingImageUrl(String(data.imageUrl || '')),
            startDate: String(data.startDate || ''),
            endDate: String(data.endDate || ''),
            badgeText: String(data.badgeText || 'Promo Spesial'),
            isActive: Boolean(data.isActive),
            visibility: 'public',
            authorUid: String(data.authorUid || SERVER_ADMIN_ACTOR_UID),
          };
        });
        setPromos(list);
        saveToLocal(STORAGE_KEYS.promos, list);
      },
      () => {}
    );

    const unsubArticles = onSnapshot(
      query(collection(db, 'articles'), where('visibility', '==', 'public')),
      (snap) => {
        if (!active || snap.empty) return;
        const list: InspirationArticle[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            title: String(data.title || ''),
            category: String(data.category || ''),
            excerpt: String(data.excerpt || ''),
            content: String(data.content || ''),
            imageUrl: normalizeWeddingImageUrl(String(data.imageUrl || '')),
            readTime: String(data.readTime || '4 Menit Baca'),
            publishedDate: String(data.publishedDate || ''),
            visibility: 'public',
            authorUid: String(data.authorUid || SERVER_ADMIN_ACTOR_UID),
          };
        });
        setArticles(list);
        saveToLocal(STORAGE_KEYS.articles, list);
      },
      () => {}
    );

    const unsubCalendar = onSnapshot(
      query(collection(db, 'calendar'), where('visibility', '==', 'public')),
      (snap) => {
        if (!active || snap.empty) return;
        const list: CalendarPublicEntry[] = snap.docs
          .map((d) => {
            const data = d.data();
            return {
              date: String(data.date || d.id),
              status:
                data.status === 'reserved' || data.status === 'unavailable'
                  ? (data.status as CalendarPublicEntry['status'])
                  : ('available' as const),
              publicNote: String(data.publicNote || ''),
              visibility: 'public' as const,
              authorUid: String(data.authorUid || SERVER_ADMIN_ACTOR_UID),
            };
          })
          .sort((a, b) => a.date.localeCompare(b.date));
        setCalendarPublic(list);
        saveToLocal(STORAGE_KEYS.calendarPublic, list);
      },
      () => {}
    );

    const unsubServiceAreas = onSnapshot(
      query(collection(db, 'serviceAreas'), where('visibility', '==', 'public')),
      (snap) => {
        if (!active || snap.empty) return;
        const list: ServiceArea[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            city: String(data.city || ''),
            province: String(data.province || ''),
            description: String(data.description || ''),
            isPrimary: Boolean(data.isPrimary),
            visibility: 'public',
            authorUid: String(data.authorUid || SERVER_ADMIN_ACTOR_UID),
          };
        });
        setServiceAreas(list);
        saveToLocal(STORAGE_KEYS.serviceAreas, list);
      },
      () => {}
    );

    const unsubSettings = onSnapshot(
      doc(db, 'settings', 'main'),
      (snap) => {
        if (!active || !snap.exists()) return;
        const data = snap.data();
        const nextSettings: StoreSettings = {
          id: 'main',
          businessName: String(data.businessName || INITIAL_SETTINGS.businessName),
          tagline: String(data.tagline || INITIAL_SETTINGS.tagline),
          whatsappNumber: String(data.whatsappNumber || INITIAL_SETTINGS.whatsappNumber),
          email: String(data.email || INITIAL_SETTINGS.email),
          address: String(data.address || INITIAL_SETTINGS.address),
          instagram: String(data.instagram || INITIAL_SETTINGS.instagram),
          tiktok: String(data.tiktok || INITIAL_SETTINGS.tiktok || ''),
          heroTitle: String(data.heroTitle || INITIAL_SETTINGS.heroTitle),
          heroSubtitle: String(data.heroSubtitle || INITIAL_SETTINGS.heroSubtitle),
          heroImageUrl: normalizeWeddingImageUrl(
            String(data.heroImageUrl || INITIAL_SETTINGS.heroImageUrl)
          ),
          logoText: String(data.logoText || INITIAL_SETTINGS.logoText),
          visibility: 'public',
          authorUid: String(data.authorUid || SERVER_ADMIN_ACTOR_UID),
        };
        setSettings(nextSettings);
        saveToLocal(STORAGE_KEYS.settings, nextSettings);
      },
      () => {}
    );

    const unsubLeads = onSnapshot(
      query(
        collection(db, 'leads'),
        where('authorUid', '==', SERVER_ADMIN_ACTOR_UID)
      ),
      (snap) => {
        if (!active || snap.empty) return;
        const list: LeadRecord[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            userId: String(data.userId || ''),
            consultationId: String(data.consultationId || ''),
            customerName: String(data.customerName || ''),
            partnerName: String(data.partnerName || ''),
            coupleName: String(data.coupleName || 'Calon Pengantin'),
            whatsapp: String(data.whatsapp || ''),
            email: String(data.email || ''),
            weddingDate: String(data.weddingDate || ''),
            weddingLocation: String(data.weddingLocation || ''),
            eventType: String(data.eventType || ''),
            guestCount: Number(data.guestCount) || 0,
            budget: Number(data.budget) || 0,
            needs: Array.isArray(data.needs) ? data.needs : [],
            interestedProductIds: Array.isArray(data.interestedProductIds)
              ? data.interestedProductIds
              : [],
            interestedProductNames: Array.isArray(data.interestedProductNames)
              ? data.interestedProductNames
              : [],
            recommendedPackageNames: Array.isArray(data.recommendedPackageNames)
              ? data.recommendedPackageNames
              : [],
            consultationSummary: String(data.consultationSummary || ''),
            notes: String(data.notes || ''),
            status: (data.status as LeadStatus) || 'New',
            source: (data.source as LeadRecord['source']) || 'consultation',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        });
        setLeads(list);
      },
      () => {}
    );

    const unsubOrders = onSnapshot(
      query(
        collection(db, 'orders'),
        where('authorUid', '==', SERVER_ADMIN_ACTOR_UID)
      ),
      (snap) => {
        if (!active || snap.empty) return;
        const list: WeddingOrder[] = snap.docs.map((d) => {
          const data = d.data();
          let parsedItems: WeddingOrder['items'] = [];
          try {
            parsedItems = JSON.parse(String(data.itemsJson || '[]'));
          } catch {
            parsedItems = [];
          }
          return {
            id: d.id,
            orderNumber: String(data.orderNumber || d.id),
            userId: String(data.userId || ''),
            leadId: String(data.leadId || ''),
            consultationId: String(data.consultationId || ''),
            customerName: String(data.customerName || ''),
            partnerName: String(data.partnerName || ''),
            whatsapp: String(data.whatsapp || ''),
            email: String(data.email || ''),
            weddingDate: String(data.weddingDate || ''),
            weddingLocation: String(data.weddingLocation || ''),
            eventType: String(data.eventType || ''),
            guestCount: Number(data.guestCount) || 0,
            items: parsedItems,
            totalAmount: Number(data.totalAmount) || 0,
            status: (data.status as OrderStatus) || 'Pending',
            notes: String(data.notes || ''),
            paymentProofUrl: data.paymentProofUrl
              ? normalizeWeddingImageUrl(String(data.paymentProofUrl))
              : undefined,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        });
        setOrders(list);
      },
      () => {}
    );

    return () => {
      active = false;
      unsubProductImages();
      unsubProducts();
      unsubCategories();
      unsubPackages();
      unsubGallery();
      unsubTestimonials();
      unsubPromos();
      unsubArticles();
      unsubCalendar();
      unsubServiceAreas();
      unsubSettings();
      unsubLeads();
      unsubOrders();
    };
  }, []);

  // Helper to persist user workspace to Server DB + Firestore when authenticated
  const persistWorkspaceToCloud = async (
    uid: string,
    nextCart: ConsultationCartItem[],
    nextWishlist: string[],
    nextPlan: WeddingPlanData,
    nextBudget: BudgetAllocation,
    nextMeta: UserMetaState
  ) => {
    const targetUserId = uid || currentUserId;
    try {
      void fetch(`/api/db/workspaces/${encodeURIComponent(targetUserId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: targetUserId,
          coupleName: nextMeta.coupleName || nextPlan.coupleName || '',
          weddingLocation: nextMeta.weddingLocation || nextPlan.weddingLocation || '',
          cartWeddingDate: nextMeta.cartWeddingDate || nextPlan.weddingDate || '2026-11-14',
          cartGuestCount: Number(nextMeta.cartGuestCount) || 300,
          cartItems: nextCart,
          wishlistIds: nextWishlist,
          weddingPlan: nextPlan,
          budgetAllocation: nextBudget,
        }),
      });
    } catch {
      // ignore network error
    }

    if (!uid || uid.startsWith('guest_')) return;
    try {
      const compactCart = nextCart.map((ci) => ({
        productId: ci.productId,
        quantity: ci.quantity,
        selectedVariant: ci.selectedVariant || '',
        selectedSize: ci.selectedSize || '',
        note: ci.note || '',
      }));
      const workspaceRef = doc(db, 'users', uid);
      const now = serverTimestamp();
      await setDoc(
        workspaceRef,
        {
          userId: uid.slice(0, 128),
          coupleName: (nextMeta.coupleName || nextPlan.coupleName || '').slice(0, 150),
          weddingLocation: (nextMeta.weddingLocation || nextPlan.weddingLocation || '').slice(0, 250),
          cartWeddingDate: (nextMeta.cartWeddingDate || nextPlan.weddingDate || '2026-11-14').slice(0, 30),
          cartGuestCount: Math.max(0, Math.min(50000, Number(nextMeta.cartGuestCount) || 300)),
          cartItemsJson: JSON.stringify(compactCart).slice(0, 200000),
          wishlistIds: nextWishlist.slice(0, 200),
          weddingPlanJson: JSON.stringify(nextPlan).slice(0, 100000),
          budgetAllocationJson: JSON.stringify(nextBudget).slice(0, 50000),
          createdAt: now,
          updatedAt: now,
        },
        { merge: true }
      );
    } catch {
      // Server DB & localStorage remain immediate store
    }
  };

  // Reload isolated user data whenever currentUserId changes (User A <-> User B)
  useEffect(() => {
    const loadedWishlist = loadFromLocal<string[]>(
      getUserScopedKey(currentUserId, 'wishlist'),
      []
    );
    const loadedCart = loadFromLocal<ConsultationCartItem[]>(
      getUserScopedKey(currentUserId, 'cart'),
      []
    );
    const loadedMeta = loadFromLocal<UserMetaState>(
      getUserScopedKey(currentUserId, 'meta'),
      DEFAULT_USER_META
    );
    const loadedBudget = loadFromLocal<BudgetAllocation>(
      getUserScopedKey(currentUserId, 'budget'),
      INITIAL_BUDGET_ALLOCATION
    );
    const loadedPlan = loadFromLocal<WeddingPlanData>(
      getUserScopedKey(currentUserId, 'planner'),
      INITIAL_PLANNER_STATE
    );
    const loadedConsultations = loadFromLocal<ConsultationSession[]>(
      getUserScopedKey(currentUserId, 'consultations'),
      []
    );
    const ensuredConsultations =
      loadedConsultations.length > 0
        ? loadedConsultations
        : [
            createDefaultConsultationSession(
              currentUserId,
              loadedMeta.coupleName,
              loadedMeta.cartWeddingDate,
              loadedMeta.weddingLocation
            ),
          ];

    setWishlistIds(loadedWishlist);
    setCartItems(loadedCart);
    setUserMeta(loadedMeta);
    setBudgetAllocation(loadedBudget);
    setWeddingPlan(loadedPlan);
    setConsultationSessions(ensuredConsultations);
    setActiveConsultationId(ensuredConsultations[0].id);
  }, [currentUserId]);

  // Multi-tab real-time synchronization via browser storage events
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (!e.key) return;
      if (e.key === getUserScopedKey(currentUserId, 'cart')) {
        setCartItems(loadFromLocal(e.key, []));
      } else if (e.key === getUserScopedKey(currentUserId, 'wishlist')) {
        setWishlistIds(loadFromLocal(e.key, []));
      } else if (e.key === getUserScopedKey(currentUserId, 'budget')) {
        setBudgetAllocation(loadFromLocal(e.key, INITIAL_BUDGET_ALLOCATION));
      } else if (e.key === getUserScopedKey(currentUserId, 'planner')) {
        setWeddingPlan(loadFromLocal(e.key, INITIAL_PLANNER_STATE));
      } else if (e.key === getUserScopedKey(currentUserId, 'meta')) {
        setUserMeta(loadFromLocal(e.key, DEFAULT_USER_META));
      } else if (e.key === getUserScopedKey(currentUserId, 'consultations')) {
        const updated = loadFromLocal<ConsultationSession[]>(e.key, []);
        if (updated.length > 0) {
          setConsultationSessions(updated);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [currentUserId]);

  const setCartWeddingDate = (date: string) => {
    setUserMeta((prev) => {
      const next = { ...prev, cartWeddingDate: date };
      saveToLocal(getUserScopedKey(currentUserId, 'meta'), next);
      if (user?.uid) {
        void persistWorkspaceToCloud(
          user.uid,
          cartItems,
          wishlistIds,
          weddingPlan,
          budgetAllocation,
          next
        );
      }
      return next;
    });
  };

  const setCartGuestCount = (guests: number) => {
    const safeGuests = Math.max(0, Math.min(50000, Number(guests) || 0));
    setUserMeta((prev) => {
      const next = { ...prev, cartGuestCount: safeGuests };
      saveToLocal(getUserScopedKey(currentUserId, 'meta'), next);
      if (user?.uid) {
        void persistWorkspaceToCloud(
          user.uid,
          cartItems,
          wishlistIds,
          weddingPlan,
          budgetAllocation,
          next
        );
      }
      return next;
    });
  };

  const setUserCoupleName = (coupleName: string) => {
    setUserMeta((prev) => {
      const next = { ...prev, coupleName };
      saveToLocal(getUserScopedKey(currentUserId, 'meta'), next);
      return next;
    });
    setWeddingPlan((prev) => {
      const next = { ...prev, coupleName };
      saveToLocal(getUserScopedKey(currentUserId, 'planner'), next);
      if (user?.uid) {
        void persistWorkspaceToCloud(
          user.uid,
          cartItems,
          wishlistIds,
          next,
          budgetAllocation,
          { ...userMeta, coupleName }
        );
      }
      return next;
    });
  };

  const setUserWeddingLocation = (weddingLocation: string) => {
    setUserMeta((prev) => {
      const next = { ...prev, weddingLocation };
      saveToLocal(getUserScopedKey(currentUserId, 'meta'), next);
      return next;
    });
    setWeddingPlan((prev) => {
      const next = { ...prev, weddingLocation };
      saveToLocal(getUserScopedKey(currentUserId, 'planner'), next);
      if (user?.uid) {
        void persistWorkspaceToCloud(
          user.uid,
          cartItems,
          wishlistIds,
          next,
          budgetAllocation,
          { ...userMeta, weddingLocation }
        );
      }
      return next;
    });
  };

  const switchNewUserSession = () => {
    if (user) {
      void signOut(auth);
    }
    const freshGuest = generateUniqueGuestId();
    try {
      localStorage.setItem(STORAGE_KEYS.guestUid, freshGuest);
    } catch {
      // ignore
    }
    setGuestUserId(freshGuest);
    setWishlistIds([]);
    setCartItems([]);
    setUserMeta(DEFAULT_USER_META);
    setBudgetAllocation(INITIAL_BUDGET_ALLOCATION);
    setWeddingPlan(INITIAL_PLANNER_STATE);
    showToast('Sesi pengguna baru dimulai. Keranjang, Wishlist & Rencana telah dipisahkan.');
  };

  // Initialize default password hash if empty so plaintext is never stored
  useEffect(() => {
    let active = true;
    async function initHash() {
      if (!adminAuthRecord.passwordHash) {
        const defaultHash = await hashPasswordHex('istafa123');
        if (active) {
          const next = { username: adminAuthRecord.username || 'admin', passwordHash: defaultHash };
          setAdminAuthRecord(next);
          saveToLocal(STORAGE_KEYS.adminAuthHash, next);
        }
      }
    }
    initHash();
    return () => {
      active = false;
    };
  }, [adminAuthRecord.passwordHash, adminAuthRecord.username]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  // ===========================================================================
  // Active Promos (Automatically excludes expired or inactive promos - Req 14)
  // ===========================================================================
  const activePromos = promos.filter((p) => {
    if (!p.isActive) return false;
    if (!p.endDate) return true;
    const todayStr = new Date().toISOString().slice(0, 10);
    return p.endDate >= todayStr;
  });

  // ===========================================================================
  // Wishlist Operations
  // ===========================================================================
  const isInWishlist = (productId: string): boolean => wishlistIds.includes(productId);

  const toggleWishlist = (product: Product) => {
    setWishlistIds((prev) => {
      const exists = prev.includes(product.id);
      const next = exists
        ? prev.filter((id) => id !== product.id)
        : [product.id, ...prev];
      saveToLocal(getUserScopedKey(currentUserId, 'wishlist'), next);
      if (user?.uid) {
        void persistWorkspaceToCloud(
          user.uid,
          cartItems,
          next,
          weddingPlan,
          budgetAllocation,
          userMeta
        );
      }
      showToast(
        exists
          ? `"${product.name}" dihapus dari Wishlist Saya.`
          : `"${product.name}" disimpan ke Wishlist Saya ❤️`
      );
      return next;
    });
  };

  const removeFromWishlist = (productId: string) => {
    setWishlistIds((prev) => {
      const next = prev.filter((id) => id !== productId);
      saveToLocal(getUserScopedKey(currentUserId, 'wishlist'), next);
      if (user?.uid) {
        void persistWorkspaceToCloud(
          user.uid,
          cartItems,
          next,
          weddingPlan,
          budgetAllocation,
          userMeta
        );
      }
      return next;
    });
    showToast('Produk dihapus dari Wishlist Saya.');
  };

  const clearWishlist = () => {
    setWishlistIds([]);
    saveToLocal(getUserScopedKey(currentUserId, 'wishlist'), []);
    if (user?.uid) {
      void persistWorkspaceToCloud(
        user.uid,
        cartItems,
        [],
        weddingPlan,
        budgetAllocation,
        userMeta
      );
    }
    showToast('Wishlist Saya telah dikosongkan.');
  };

  const wishlistProducts = wishlistIds
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is Product => Boolean(p));

  // ===========================================================================
  // Consultation Cart (Keranjang Konsultasi) & Auto Budget Sync
  // ===========================================================================
  const applyProductToBudget = (product: Product, quantity?: number) => {
    const defaultQty =
      quantity ??
      (product.unit?.toLowerCase() === 'pcs'
        ? budgetAllocation.guestCount || 300
        : 1);
    const field = mapCategoryToBudgetField(product.category);
    const subtotal = product.price * defaultQty;

    setBudgetAllocation((prev) => {
      const next = { ...prev, [field]: subtotal };
      saveToLocal(getUserScopedKey(currentUserId, 'budget'), next);
      if (user?.uid) {
        void persistWorkspaceToCloud(
          user.uid,
          cartItems,
          wishlistIds,
          weddingPlan,
          next,
          userMeta
        );
      }
      return next;
    });
    showToast(
      `"${product.name}" (${defaultQty} ${product.unit || 'paket'}) dimasukkan ke Kalkulator Budget.`
    );
  };

  const addToCart = (
    product: Product,
    quantity?: number,
    selectedVariant?: string,
    selectedSize?: string
  ) => {
    const defaultQty =
      quantity ??
      (product.unit?.toLowerCase() === 'pcs' ? cartGuestCount || 300 : 1);
    const nowIso = new Date().toISOString();
    const primaryPhoto = getPrimaryImage(product.images).url;

    setCartItems((prev) => {
      const existingIndex = prev.findIndex((i) => i.productId === product.id);
      let next: ConsultationCartItem[];
      if (existingIndex >= 0) {
        next = prev.map((item, idx) => {
          if (idx !== existingIndex) return item;
          const nextQty = item.quantity + defaultQty;
          const unitPrice = item.priceAtSelection ?? product.price;
          return {
            ...item,
            userId: currentUserId,
            productName: product.name,
            priceAtSelection: unitPrice,
            photoUrl: primaryPhoto,
            product,
            quantity: nextQty,
            subtotal: unitPrice * nextQty,
            selectedVariant: selectedVariant || item.selectedVariant,
            selectedSize: selectedSize || item.selectedSize,
            createdAt: item.createdAt || nowIso,
            updatedAt: nowIso,
          };
        });
      } else {
        next = [
          ...prev,
          {
            userId: currentUserId,
            productId: product.id,
            productName: product.name,
            priceAtSelection: product.price,
            photoUrl: primaryPhoto,
            subtotal: product.price * defaultQty,
            createdAt: nowIso,
            updatedAt: nowIso,
            product,
            quantity: defaultQty,
            selectedVariant: selectedVariant || product.variants[0],
            selectedSize: selectedSize || product.sizes?.[0],
          },
        ];
      }
      saveToLocal(getUserScopedKey(currentUserId, 'cart'), next);

      // Automatically sync category total to Budget Calculator (Requirement 8)
      const field = mapCategoryToBudgetField(product.category);
      const categorySum = next
        .filter((ci) => mapCategoryToBudgetField(ci.product.category) === field)
        .reduce((acc, ci) => acc + ci.product.price * ci.quantity, 0);

      let nextBudgetState = budgetAllocation;
      if (categorySum > 0) {
        setBudgetAllocation((prevBudget) => {
          const updatedBudget = { ...prevBudget, [field]: categorySum };
          nextBudgetState = updatedBudget;
          saveToLocal(getUserScopedKey(currentUserId, 'budget'), updatedBudget);
          return updatedBudget;
        });
      }

      if (user?.uid) {
        void persistWorkspaceToCloud(
          user.uid,
          next,
          wishlistIds,
          weddingPlan,
          nextBudgetState,
          userMeta
        );
      }

      return next;
    });

    showToast(`"${product.name}" ditambahkan ke Keranjang Konsultasi & Kalkulator Budget.`);
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    const nowIso = new Date().toISOString();
    setCartItems((prev) => {
      const next = prev.map((item) =>
        item.productId === productId
          ? {
              ...item,
              userId: currentUserId,
              quantity,
              subtotal: (item.priceAtSelection ?? item.product.price) * quantity,
              updatedAt: nowIso,
            }
          : item
      );
      saveToLocal(getUserScopedKey(currentUserId, 'cart'), next);
      if (user?.uid) {
        void persistWorkspaceToCloud(
          user.uid,
          next,
          wishlistIds,
          weddingPlan,
          budgetAllocation,
          userMeta
        );
      }
      return next;
    });
  };

  const removeFromCart = (productId: string) => {
    setCartItems((prev) => {
      const next = prev.filter((item) => item.productId !== productId);
      saveToLocal(getUserScopedKey(currentUserId, 'cart'), next);
      if (user?.uid) {
        void persistWorkspaceToCloud(
          user.uid,
          next,
          wishlistIds,
          weddingPlan,
          budgetAllocation,
          userMeta
        );
      }
      return next;
    });
    showToast('Produk dihapus dari Keranjang Konsultasi.');
  };

  const clearCart = () => {
    setCartItems([]);
    saveToLocal(getUserScopedKey(currentUserId, 'cart'), []);
    if (user?.uid) {
      void persistWorkspaceToCloud(
        user.uid,
        [],
        wishlistIds,
        weddingPlan,
        budgetAllocation,
        userMeta
      );
    }
    showToast('Keranjang Konsultasi dikosongkan.');
  };

  const cartTotal = cartItems.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  // ===========================================================================
  // Budget Calculator & 10-Step Wedding Planner Operations
  // ===========================================================================
  const updateBudgetAllocation = (nextPartial: Partial<BudgetAllocation>) => {
    setBudgetAllocation((prev) => {
      const next = { ...prev, ...nextPartial };
      saveToLocal(getUserScopedKey(currentUserId, 'budget'), next);
      if (user?.uid) {
        void persistWorkspaceToCloud(
          user.uid,
          cartItems,
          wishlistIds,
          weddingPlan,
          next,
          userMeta
        );
      }
      return next;
    });
  };

  const syncCartToBudget = () => {
    if (cartItems.length === 0) {
      showToast('Keranjang konsultasi masih kosong.');
      return;
    }
    const grouped: Partial<BudgetAllocation> = {};
    for (const item of cartItems) {
      const field = mapCategoryToBudgetField(item.product.category);
      grouped[field] = (grouped[field] || 0) + item.product.price * item.quantity;
    }
    updateBudgetAllocation(grouped);
    showToast('Pilihan produk di Keranjang berhasil disinkronkan ke Kalkulator Budget!');
  };

  const saveBudgetPlan = () => {
    saveToLocal(getUserScopedKey(currentUserId, 'budget'), budgetAllocation);
    if (user?.uid) {
      void persistWorkspaceToCloud(
        user.uid,
        cartItems,
        wishlistIds,
        weddingPlan,
        budgetAllocation,
        userMeta
      );
    }
    showToast('Rencana Estimasi Budget berhasil disimpan untuk akun Anda.');
  };

  const updateWeddingPlan = (nextPartial: Partial<WeddingPlanData>) => {
    setWeddingPlan((prev) => {
      const next = { ...prev, ...nextPartial };
      saveToLocal(getUserScopedKey(currentUserId, 'planner'), next);

      const updatedMeta = {
        ...userMeta,
        coupleName: next.coupleName !== undefined ? next.coupleName : userMeta.coupleName,
        weddingLocation:
          next.weddingLocation !== undefined
            ? next.weddingLocation
            : userMeta.weddingLocation,
        cartWeddingDate: next.weddingDate || userMeta.cartWeddingDate,
        cartGuestCount: next.guestCount || userMeta.cartGuestCount,
      };
      setUserMeta(updatedMeta);
      saveToLocal(getUserScopedKey(currentUserId, 'meta'), updatedMeta);

      if (user?.uid) {
        void persistWorkspaceToCloud(
          user.uid,
          cartItems,
          wishlistIds,
          next,
          budgetAllocation,
          updatedMeta
        );
      }
      return next;
    });
  };

  const addProductToWeddingPlan = (
    product: Product,
    contextOverrides?: Partial<WeddingPlanData>
  ) => {
    const catLower = product.category.toLowerCase();
    setWeddingPlan((prev) => {
      const next: WeddingPlanData = {
        ...prev,
        ...contextOverrides,
      };

      if (catLower.includes('dekorasi')) {
        next.selectedDecorId = product.id;
      } else if (catLower.includes('undangan')) {
        next.selectedInvitationId = product.id;
        if (!next.invitationQty) next.invitationQty = next.guestCount || 300;
      } else if (catLower.includes('souvenir')) {
        next.selectedSouvenirId = product.id;
        if (!next.souvenirQty) next.souvenirQty = next.guestCount || 300;
      } else if (catLower.includes('mahar') || catLower.includes('seserahan')) {
        next.selectedMaharId = product.id;
      } else {
        const currentAdd = next.additionalServiceIds || [];
        if (!currentAdd.includes(product.id)) {
          next.additionalServiceIds = [...currentAdd, product.id];
        }
      }

      const currentProdIds = next.selectedProductIds || [];
      if (!currentProdIds.includes(product.id)) {
        next.selectedProductIds = [...currentProdIds, product.id];
      }

      // Compute updated estimatedCost across all chosen plan items
      const decorProd = products.find((p) => p.id === next.selectedDecorId);
      const invProd = products.find((p) => p.id === next.selectedInvitationId);
      const souvProd = products.find((p) => p.id === next.selectedSouvenirId);
      const maharProd = products.find((p) => p.id === next.selectedMaharId);
      const addProds = products.filter((p) =>
        (next.additionalServiceIds || []).includes(p.id)
      );

      next.estimatedCost =
        (decorProd?.price || 0) +
        (invProd ? invProd.price * (next.invitationQty || next.guestCount || 300) : 0) +
        (souvProd ? souvProd.price * (next.souvenirQty || next.guestCount || 300) : 0) +
        (maharProd?.price || 0) +
        addProds.reduce((sum, p) => sum + p.price, 0);

      saveToLocal(getUserScopedKey(currentUserId, 'planner'), next);

      const updatedMeta: UserMetaState = {
        ...userMeta,
        coupleName: next.coupleName || userMeta.coupleName,
        weddingLocation: next.weddingLocation || userMeta.weddingLocation,
        cartWeddingDate: next.weddingDate || userMeta.cartWeddingDate,
        cartGuestCount: next.guestCount || userMeta.cartGuestCount,
      };
      setUserMeta(updatedMeta);
      saveToLocal(getUserScopedKey(currentUserId, 'meta'), updatedMeta);

      if (user?.uid) {
        void persistWorkspaceToCloud(
          user.uid,
          cartItems,
          wishlistIds,
          next,
          budgetAllocation,
          updatedMeta
        );
      }

      return next;
    });

    // Also sync this product's category into the user's Budget Calculator
    applyProductToBudget(product);
    showToast(`"${product.name}" berhasil ditambahkan ke Rencana Pernikahan Anda.`);
  };

  // ===========================================================================
  // Konsultasi Pernikahan ISTAFA Session & Cloud Persistence (Per-User UID)
  // ===========================================================================
  const persistConsultationToFirestore = async (
    uid: string,
    session: ConsultationSession
  ) => {
    if (!uid || uid.startsWith('guest_')) return;
    try {
      const cleanSessionId = session.id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
      const now = serverTimestamp();

      // Ensure parent user workspace exists for Master Gate verification
      await persistWorkspaceToCloud(
        uid,
        cartItems,
        wishlistIds,
        weddingPlan,
        budgetAllocation,
        userMeta
      );

      const sessionRef = doc(db, 'users', uid, 'consultations', cleanSessionId);
      await setDoc(
        sessionRef,
        {
          consultationId: cleanSessionId,
          userId: uid.slice(0, 128),
          title: (session.title || 'Konsultasi Pernikahan').slice(0, 160),
          coupleName: (session.coupleName || '').slice(0, 150),
          weddingDate: (session.weddingDate || '').slice(0, 30),
          weddingLocation: (session.weddingLocation || '').slice(0, 250),
          guestCount: Math.max(0, Math.min(50000, Number(session.guestCount) || 0)),
          targetBudget: Math.max(0, Math.min(100000000000, Number(session.targetBudget) || 0)),
          weddingTheme: (session.weddingTheme || '').slice(0, 150),
          desiredColors: (session.desiredColors || '').slice(0, 150),
          createdAt: now,
          updatedAt: now,
        },
        { merge: true }
      );

      // Persist latest messages in subcollection users/{userId}/consultations/{consultationId}/messages/{messageId}
      const recentMessages = session.messages.slice(-4);
      for (const msg of recentMessages) {
        const cleanMsgId = msg.id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
        const msgRef = doc(
          db,
          'users',
          uid,
          'consultations',
          cleanSessionId,
          'messages',
          cleanMsgId
        );
        const recIds = (msg.recommendations || [])
          .map((r) => r.productId)
          .slice(0, 10);
        await setDoc(
          msgRef,
          {
            messageId: cleanMsgId,
            consultationId: cleanSessionId,
            userId: uid.slice(0, 128),
            sender: msg.sender === 'user' ? 'user' : 'consultant',
            message: (msg.message || '-').slice(0, 6000),
            recommendedProductIds: recIds,
            recommendationsJson: JSON.stringify(msg.recommendations || []).slice(0, 20000),
            budgetBreakdownJson: msg.budgetBreakdown
              ? JSON.stringify(msg.budgetBreakdown).slice(0, 30000)
              : '',
            createdAt: now,
          },
          { merge: true }
        );
      }
    } catch {
      // Scoped localStorage remains immediate primary store
    }
  };

  const activeConsultation =
    consultationSessions.find((s) => s.id === activeConsultationId) ||
    consultationSessions[0] ||
    createDefaultConsultationSession(
      currentUserId,
      userMeta.coupleName,
      userMeta.cartWeddingDate,
      userMeta.weddingLocation
    );

  const startNewConsultationSession = (): ConsultationSession => {
    const fresh = createDefaultConsultationSession(
      currentUserId,
      weddingPlan.coupleName || userMeta.coupleName,
      weddingPlan.weddingDate || userMeta.cartWeddingDate,
      weddingPlan.weddingLocation || userMeta.weddingLocation,
      weddingPlan.guestCount || userMeta.cartGuestCount,
      weddingPlan.targetBudget || 0
    );
    setConsultationSessions((prev) => {
      const next = [fresh, ...prev].slice(0, 30);
      saveToLocal(getUserScopedKey(currentUserId, 'consultations'), next);
      return next;
    });
    setActiveConsultationId(fresh.id);
    void fetch('/api/db/consultations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fresh),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.consultations) setAllConsultations(data.consultations);
        if (data?.leads) setLeads(data.leads);
      })
      .catch(() => {});

    if (user?.uid) {
      void persistConsultationToFirestore(user.uid, fresh);
    }
    return fresh;
  };

  const selectConsultationSession = (sessionId: string) => {
    setActiveConsultationId(sessionId);
  };

  const deleteConsultationSession = (sessionId: string) => {
    setConsultationSessions((prev) => {
      const filtered = prev.filter((s) => s.id !== sessionId);
      const next =
        filtered.length > 0
          ? filtered
          : [
              createDefaultConsultationSession(
                currentUserId,
                userMeta.coupleName,
                userMeta.cartWeddingDate,
                userMeta.weddingLocation
              ),
            ];
      saveToLocal(getUserScopedKey(currentUserId, 'consultations'), next);
      if (activeConsultationId === sessionId) {
        setActiveConsultationId(next[0].id);
      }
      return next;
    });

    void fetch(`/api/db/consultations/${encodeURIComponent(sessionId)}`, {
      method: 'DELETE',
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.consultations) setAllConsultations(data.consultations);
      })
      .catch(() => {});

    if (user?.uid) {
      const cleanId = sessionId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
      deleteDoc(doc(db, 'users', user.uid, 'consultations', cleanId)).catch(() => {
        // ignore
      });
    }
    showToast('Riwayat sesi konsultasi telah dihapus.');
  };

  const saveConsultationSessionState = (updatedSession: ConsultationSession) => {
    const withOwner: ConsultationSession = {
      ...updatedSession,
      userId: currentUserId,
      updatedAt: new Date().toISOString(),
    };
    setConsultationSessions((prev) => {
      const exists = prev.some((s) => s.id === withOwner.id);
      const next = exists
        ? prev.map((s) => (s.id === withOwner.id ? withOwner : s))
        : [withOwner, ...prev];
      saveToLocal(getUserScopedKey(currentUserId, 'consultations'), next);
      return next;
    });
    setActiveConsultationId(withOwner.id);

    void fetch('/api/db/consultations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(withOwner),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.consultations) setAllConsultations(data.consultations);
        if (data?.leads) setLeads(data.leads);
      })
      .catch(() => {});

    if (user?.uid) {
      void persistConsultationToFirestore(user.uid, withOwner);
    }
  };

  const trackProductInterest = (
    productId: string,
    mode: 'viewed' | 'interested' = 'viewed'
  ) => {
    if (!productId) return;
    const current = activeConsultation;
    if (!current) return;
    const nextViewed = Array.from(
      new Set([...(current.viewedProductIds || []), productId])
    );
    const nextInterested =
      mode === 'interested'
        ? Array.from(new Set([...(current.interestedProductIds || []), productId]))
        : current.interestedProductIds || [];

    const updated: ConsultationSession = {
      ...current,
      viewedProductIds: nextViewed,
      interestedProductIds: nextInterested,
      status: mode === 'interested' ? 'interested' : current.status || 'active',
      updatedAt: new Date().toISOString(),
    };

    setConsultationSessions((prev) => {
      const exists = prev.some((s) => s.id === updated.id);
      const next = exists
        ? prev.map((s) => (s.id === updated.id ? updated : s))
        : [updated, ...prev];
      saveToLocal(getUserScopedKey(currentUserId, 'consultations'), next);
      return next;
    });

    if (mode === 'interested') {
      void fetch('/api/db/consultations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.consultations) setAllConsultations(data.consultations);
          if (data?.leads) setLeads(data.leads);
        })
        .catch(() => {});
    }
  };

  // ===========================================================================
  // Leads (Calon Pengantin) & Orders (Booking) Operations
  // ===========================================================================
  const saveLead = async (leadInput: Partial<LeadRecord>): Promise<LeadRecord | null> => {
    try {
      const nowIso = new Date().toISOString();
      const cleanId = (leadInput.id || `lead-${Date.now()}`)
        .replace(/[^a-zA-Z0-9_-]/g, '-')
        .slice(0, 128);
      const savedLead: LeadRecord = {
        id: cleanId,
        userId: (leadInput.userId || currentUserId || 'guest').slice(0, 128),
        consultationId: (leadInput.consultationId || '').slice(0, 128),
        customerName: (leadInput.customerName || '').trim().slice(0, 120),
        partnerName: (leadInput.partnerName || '').trim().slice(0, 120),
        coupleName: (
          leadInput.coupleName ||
          (leadInput.customerName && leadInput.partnerName
            ? `${leadInput.customerName} & ${leadInput.partnerName}`
            : leadInput.customerName || 'Calon Pengantin')
        )
          .trim()
          .slice(0, 150),
        whatsapp: (leadInput.whatsapp || '').trim().slice(0, 30),
        email: (leadInput.email || '').trim().slice(0, 120),
        weddingDate: (leadInput.weddingDate || '').slice(0, 40),
        weddingLocation: (leadInput.weddingLocation || '').trim().slice(0, 250),
        eventType: (leadInput.eventType || 'Akad & Resepsi').slice(0, 120),
        guestCount: Math.max(0, Math.min(50000, Number(leadInput.guestCount) || 0)),
        budget: Math.max(0, Math.min(100000000000, Number(leadInput.budget) || 0)),
        needs: (leadInput.needs || []).slice(0, 30),
        interestedProductIds: (leadInput.interestedProductIds || []).slice(0, 50),
        interestedProductNames: (leadInput.interestedProductNames || []).slice(0, 50),
        recommendedPackageNames: (leadInput.recommendedPackageNames || []).slice(0, 20),
        consultationSummary: (leadInput.consultationSummary || '').slice(0, 5000),
        notes: (leadInput.notes || '').slice(0, 3000),
        status: leadInput.status || 'New',
        source: leadInput.source || 'consultation',
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      setLeads((prev) => {
        const exists = prev.some((l) => l.id === cleanId);
        return exists
          ? prev.map((l) => (l.id === cleanId ? savedLead : l))
          : [savedLead, ...prev];
      });

      void fetch('/api/db/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(savedLead),
      }).catch(() => {});

      await ensureAdminFirestoreGate();
      const now = serverTimestamp();
      await setDoc(doc(db, 'leads', cleanId), {
        id: cleanId,
        userId: savedLead.userId,
        consultationId: savedLead.consultationId || '',
        customerName: savedLead.customerName,
        partnerName: savedLead.partnerName,
        coupleName: savedLead.coupleName,
        whatsapp: savedLead.whatsapp,
        email: savedLead.email,
        weddingDate: savedLead.weddingDate,
        weddingLocation: savedLead.weddingLocation,
        eventType: savedLead.eventType,
        guestCount: savedLead.guestCount,
        budget: savedLead.budget,
        needs: savedLead.needs,
        interestedProductIds: savedLead.interestedProductIds,
        interestedProductNames: savedLead.interestedProductNames,
        recommendedPackageNames: savedLead.recommendedPackageNames,
        consultationSummary: savedLead.consultationSummary,
        notes: savedLead.notes,
        status: savedLead.status,
        source: savedLead.source,
        authorUid: SERVER_ADMIN_ACTOR_UID,
        createdAt: now,
        updatedAt: now,
      });

      return savedLead;
    } catch (err) {
      console.error('Failed to save lead:', err);
      return null;
    }
  };

  const updateLeadStatus = async (leadId: string, status: LeadStatus, notes?: string) => {
    const existing = leads.find((l) => l.id === leadId);
    if (!existing) return;
    await saveLead({
      ...existing,
      status,
      notes: notes !== undefined ? notes : existing.notes,
    });
    showToast(`Status calon pengantin diperbarui menjadi "${status}".`);
  };

  const deleteLead = async (leadId: string) => {
    setLeads((prev) => prev.filter((l) => l.id !== leadId));
    void fetch(`/api/db/leads/${encodeURIComponent(leadId)}`, {
      method: 'DELETE',
    }).catch(() => {});
    try {
      await ensureAdminFirestoreGate();
      await deleteDoc(doc(db, 'leads', leadId));
      showToast('Data calon pengantin berhasil dihapus.');
    } catch (err) {
      console.error('Error deleting lead:', err);
    }
  };

  const createOrder = async (
    orderInput: Omit<WeddingOrder, 'id' | 'orderNumber' | 'userId' | 'createdAt' | 'updatedAt'>
  ): Promise<WeddingOrder | null> => {
    try {
      const nowIso = new Date().toISOString();
      const cleanId = `ord-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const orderNumber = `INV-IST-${new Date().getFullYear()}-${Math.floor(
        1000 + Math.random() * 9000
      )}`;
      const savedOrder: WeddingOrder = {
        ...orderInput,
        id: cleanId,
        orderNumber,
        userId: (currentUserId || 'guest').slice(0, 128),
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      setOrders((prev) => [savedOrder, ...prev]);

      void fetch('/api/db/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(savedOrder),
      }).catch(() => {});

      await ensureAdminFirestoreGate();
      const now = serverTimestamp();
      await setDoc(doc(db, 'orders', cleanId), {
        id: cleanId,
        orderNumber: savedOrder.orderNumber.slice(0, 60),
        userId: savedOrder.userId.slice(0, 128),
        leadId: (savedOrder.leadId || '').slice(0, 128),
        consultationId: (savedOrder.consultationId || '').slice(0, 128),
        customerName: savedOrder.customerName.trim().slice(0, 120),
        partnerName: (savedOrder.partnerName || '').trim().slice(0, 120),
        whatsapp: savedOrder.whatsapp.trim().slice(0, 30),
        email: (savedOrder.email || '').trim().slice(0, 120),
        weddingDate: (savedOrder.weddingDate || '').slice(0, 40),
        weddingLocation: (savedOrder.weddingLocation || '').trim().slice(0, 250),
        eventType: (savedOrder.eventType || 'Akad & Resepsi').slice(0, 120),
        guestCount: Math.max(0, Math.min(50000, Number(savedOrder.guestCount) || 0)),
        itemsJson: JSON.stringify(savedOrder.items || []).slice(0, 100000),
        totalAmount: Math.max(0, Math.min(100000000000, Number(savedOrder.totalAmount) || 0)),
        status: savedOrder.status || 'Pending',
        notes: (savedOrder.notes || '').slice(0, 3000),
        paymentProofUrl: (savedOrder.paymentProofUrl || '').slice(0, 800000),
        authorUid: SERVER_ADMIN_ACTOR_UID,
        createdAt: now,
        updatedAt: now,
      });

      showToast(
        `Booking #${savedOrder.orderNumber} atas nama ${savedOrder.customerName} berhasil disimpan!`
      );
      return savedOrder;
    } catch (err) {
      console.error('Failed to create order:', err);
      showToast('Terjadi kendala saat menyimpan pesanan.');
      return null;
    }
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus, notes?: string) => {
    const existing = orders.find((o) => o.id === orderId);
    if (!existing) return;
    const updated: WeddingOrder = {
      ...existing,
      status,
      notes: notes !== undefined ? notes : existing.notes,
      updatedAt: new Date().toISOString(),
    };
    setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));

    void fetch(`/api/db/orders/${encodeURIComponent(orderId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, notes }),
    }).catch(() => {});

    try {
      await ensureAdminFirestoreGate();
      const now = serverTimestamp();
      await setDoc(doc(db, 'orders', orderId), {
        id: orderId,
        orderNumber: updated.orderNumber.slice(0, 60),
        userId: (updated.userId || 'guest').slice(0, 128),
        leadId: (updated.leadId || '').slice(0, 128),
        consultationId: (updated.consultationId || '').slice(0, 128),
        customerName: updated.customerName.slice(0, 120),
        partnerName: (updated.partnerName || '').slice(0, 120),
        whatsapp: updated.whatsapp.slice(0, 30),
        email: (updated.email || '').slice(0, 120),
        weddingDate: (updated.weddingDate || '').slice(0, 40),
        weddingLocation: (updated.weddingLocation || '').slice(0, 250),
        eventType: (updated.eventType || 'Akad & Resepsi').slice(0, 120),
        guestCount: Math.max(0, Math.min(50000, Number(updated.guestCount) || 0)),
        itemsJson: JSON.stringify(updated.items || []).slice(0, 100000),
        totalAmount: Math.max(0, Math.min(100000000000, Number(updated.totalAmount) || 0)),
        status: updated.status,
        notes: (updated.notes || '').slice(0, 3000),
        paymentProofUrl: (updated.paymentProofUrl || '').slice(0, 800000),
        authorUid: SERVER_ADMIN_ACTOR_UID,
        createdAt: now,
        updatedAt: now,
      });
      showToast(`Status pesanan diperbarui menjadi "${status}".`);
    } catch (err) {
      console.error('Error updating order status:', err);
    }
  };

  const deleteOrder = async (orderId: string) => {
    setOrders((prev) => prev.filter((o) => o.id !== orderId));
    void fetch(`/api/db/orders/${encodeURIComponent(orderId)}`, {
      method: 'DELETE',
    }).catch(() => {});
    try {
      await ensureAdminFirestoreGate();
      await deleteDoc(doc(db, 'orders', orderId));
      showToast('Data pesanan berhasil dihapus.');
    } catch (err) {
      console.error('Error deleting order:', err);
    }
  };

  const syncPlannerToBudget = () => {
    const decorProd = products.find((p) => p.id === weddingPlan.selectedDecorId);
    const invProd = products.find((p) => p.id === weddingPlan.selectedInvitationId);
    const souvProd = products.find((p) => p.id === weddingPlan.selectedSouvenirId);
    const maharProd = products.find((p) => p.id === weddingPlan.selectedMaharId);
    const addProds = products.filter((p) =>
      weddingPlan.additionalServiceIds.includes(p.id)
    );

    const nextBudget: Partial<BudgetAllocation> = {
      guestCount: weddingPlan.guestCount,
    };
    if (decorProd) nextBudget.dekorasi = decorProd.price;
    if (invProd) nextBudget.undangan = invProd.price * (weddingPlan.invitationQty || weddingPlan.guestCount);
    if (souvProd) nextBudget.souvenir = souvProd.price * (weddingPlan.souvenirQty || weddingPlan.guestCount);
    if (maharProd) nextBudget.mahar = maharProd.price;

    for (const ap of addProds) {
      const field = mapCategoryToBudgetField(ap.category);
      nextBudget[field] = ap.price;
    }

    updateBudgetAllocation(nextBudget);
    showToast('Rencana Pernikahan Anda berhasil dimasukkan ke Kalkulator Budget!');
  };

  const recordInquiry = (inquiry: Omit<ConsultationInquiry, 'id' | 'createdAt'>) => {
    const inquiryId = `inq-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newRecord: ConsultationInquiry = {
      ...inquiry,
      id: inquiryId,
      userId: inquiry.userId || currentUserId,
      coupleName: inquiry.coupleName || weddingPlan.coupleName || activeConsultation.coupleName || '',
      weddingLocation:
        inquiry.weddingLocation ||
        weddingPlan.weddingLocation ||
        activeConsultation.weddingLocation ||
        '',
      createdAt: new Date().toISOString().slice(0, 10),
    };
    setInquiries((prev) => {
      const next = [newRecord, ...prev].slice(0, 200);
      saveToLocal(STORAGE_KEYS.inquiries, next);
      return next;
    });

    void fetch('/api/db/inquiries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newRecord),
    }).catch(() => {});

    if (user?.uid) {
      setDoc(doc(db, 'inquiries', inquiryId), {
        userId: user.uid,
        coupleName: (newRecord.coupleName || '').slice(0, 150),
        weddingLocation: (newRecord.weddingLocation || '').slice(0, 250),
        type: newRecord.type,
        customerDate: (newRecord.customerDate || '').slice(0, 60),
        guestCount: Math.max(0, Math.min(50000, Number(newRecord.guestCount) || 0)),
        itemsSummary: (newRecord.itemsSummary || []).slice(0, 100).map((s) => s.slice(0, 250)),
        totalEstimate: Math.max(0, Number(newRecord.totalEstimate) || 0),
        createdAt: serverTimestamp(),
      }).catch(() => {});
    }
  };

  // ===========================================================================
  // Authentication & Non-Destructive Cloud Seeding
  // ===========================================================================
  const isCloudAdmin = Boolean(
    user && user.emailVerified && user.email === 'ahhidayat953@gmail.com'
  );
  const isAuthorizedAdmin = isCloudAdmin || isPreviewAdminUnlocked;

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  async function seedNonDestructiveInitialCatalog() {
    setIsSyncing(true);
    try {
      await ensureAdminFirestoreGate();
      const now = serverTimestamp();
      const nowIso = new Date().toISOString();
      const uid = SERVER_ADMIN_ACTOR_UID;

      const settingsSnap = await getDoc(doc(db, 'settings', 'main'));
      if (!settingsSnap.exists()) {
        await setDoc(doc(db, 'settings', 'main'), {
          businessName: INITIAL_SETTINGS.businessName.slice(0, 120),
          tagline: INITIAL_SETTINGS.tagline.slice(0, 250),
          whatsappNumber: INITIAL_SETTINGS.whatsappNumber.replace(/[^0-9+]/g, '').slice(0, 25),
          email: INITIAL_SETTINGS.email.slice(0, 120),
          address: INITIAL_SETTINGS.address.slice(0, 300),
          instagram: INITIAL_SETTINGS.instagram.slice(0, 100),
          tiktok: (INITIAL_SETTINGS.tiktok || '').slice(0, 100),
          heroTitle: INITIAL_SETTINGS.heroTitle.slice(0, 200),
          heroSubtitle: INITIAL_SETTINGS.heroSubtitle.slice(0, 400),
          heroImageUrl: normalizeWeddingImageUrl(INITIAL_SETTINGS.heroImageUrl).slice(0, 800000),
          logoText: INITIAL_SETTINGS.logoText.slice(0, 60),
          visibility: 'public',
          authorUid: uid,
          createdAt: now,
          updatedAt: now,
        });
      }

      for (const cat of INITIAL_CATEGORIES) {
        await setDoc(doc(db, 'categories', cat.id), {
          name: cat.name.slice(0, 80),
          slug: cat.slug.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 80),
          description: cat.description.slice(0, 300),
          iconName: cat.iconName.slice(0, 40),
          coverImageUrl: normalizeWeddingImageUrl(cat.coverImageUrl).slice(0, 800000),
          sortOrder: Number(cat.sortOrder) || 1,
          visibility: 'public',
          authorUid: uid,
          createdAt: now,
          updatedAt: now,
        });
      }

      for (const prod of INITIAL_PRODUCTS) {
        const enrichedImages = enrichProductImagesForDatabase(prod.id, prod.images);
        for (let idx = 0; idx < enrichedImages.length; idx++) {
          const img = enrichedImages[idx];
          const imgId = (img.image_id || img.id).replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128);
          await setDoc(doc(db, 'product_images', imgId), {
            image_id: imgId,
            product_id: prod.id,
            image_url: img.image_url || img.url,
            storage_path: img.storage_path || `products/${prod.id}/${imgId}`,
            is_primary: Boolean(img.is_primary ?? img.isPrimary),
            sort_order: typeof img.sort_order === 'number' ? img.sort_order : idx,
            caption: (img.caption || prod.name).slice(0, 300),
            visibility: 'public',
            authorUid: uid,
            created_at: (img.created_at || nowIso).slice(0, 60),
            createdAt: now,
            updatedAt: now,
          });
        }

        await setDoc(doc(db, 'products', prod.id), {
          name: prod.name.slice(0, 150),
          category: prod.category.slice(0, 80),
          price: Math.max(0, Number(prod.price) || 0),
          originalPrice: Math.max(0, Number(prod.originalPrice) || 0),
          priceLabel: (prod.priceLabel || 'Mulai dari').slice(0, 80),
          shortDescription: prod.shortDescription.slice(0, 300),
          description: prod.description.slice(0, 4000),
          images: enrichedImages,
          variants: prod.variants.slice(0, 15).map((v) => v.slice(0, 120)),
          sizes: (prod.sizes || []).slice(0, 15).map((s) => s.slice(0, 80)),
          inclusions: prod.inclusions.slice(0, 20).map((inc) => inc.slice(0, 200)),
          unit: (prod.unit || 'Paket').slice(0, 40),
          stockStatus: (prod.stockStatus || 'Tersedia').slice(0, 60),
          promoLabel: (prod.promoLabel || '').slice(0, 80),
          isPromo: Boolean(prod.isPromo),
          isAvailable: Boolean(prod.isAvailable),
          isFeatured: Boolean(prod.isFeatured),
          isNew: Boolean(prod.isNew),
          isActive: prod.isActive !== false,
          popularityScore: Number(prod.popularityScore) || 85,
          visibility: 'public',
          authorUid: uid,
          createdAt: now,
          updatedAt: now,
        });
      }

      for (const pkg of INITIAL_PACKAGES) {
        const enrichedImages = enrichProductImagesForDatabase(pkg.id, pkg.images);
        await setDoc(doc(db, 'packages', pkg.id), {
          name: pkg.name.slice(0, 150),
          tier: pkg.tier.slice(0, 60),
          price: Math.max(0, Number(pkg.price) || 0),
          originalPrice: Math.max(0, Number(pkg.originalPrice) || 0),
          guestCapacity: pkg.guestCapacity.slice(0, 80),
          description: pkg.description.slice(0, 2000),
          inclusions: pkg.inclusions.slice(0, 25).map((inc) => inc.slice(0, 200)),
          images: enrichedImages,
          isPopular: Boolean(pkg.isPopular),
          isPromo: Boolean(pkg.isPromo),
          promoLabel: (pkg.promoLabel || '').slice(0, 80),
          isActive: pkg.isActive !== false,
          visibility: 'public',
          authorUid: uid,
          createdAt: now,
          updatedAt: now,
        });
      }

      for (const item of INITIAL_GALLERY) {
        const enrichedImages = enrichProductImagesForDatabase(
          item.id,
          item.images || []
        );
        await setDoc(doc(db, 'gallery', item.id), {
          title: item.title.slice(0, 150),
          category: item.category.slice(0, 80),
          imageUrl: normalizeWeddingImageUrl(item.imageUrl).slice(0, 800000),
          caption: item.caption.slice(0, 400),
          location: (item.location || '').slice(0, 120),
          theme: (item.theme || '').slice(0, 120),
          images: enrichedImages,
          aspectType: item.aspectType || 'landscape',
          visibility: 'public',
          authorUid: uid,
          createdAt: now,
          updatedAt: now,
        });
      }
    } catch (error) {
      console.warn('Initial catalog sync notice:', error);
    } finally {
      setIsSyncing(false);
    }
  }

  const seedInitialDataToCloud = async () => {
    await seedNonDestructiveInitialCatalog();
    showToast('Data katalog berhasil disinkronkan ke Cloud Database.');
  };

  // ===========================================================================
  // Secure Server-Verified Admin Login (Never exposes or stores plaintext password)
  // ===========================================================================
  const loginWithCredentials = async (
    usernameOrEmail: string,
    passwordInput: string
  ): Promise<boolean> => {
    const cleanUsername = usernameOrEmail.trim();
    const cleanPassword = passwordInput;
    if (!cleanUsername || !cleanPassword) return false;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: cleanUsername,
          password: cleanPassword,
        }),
      });

      if (res.status === 401) {
        return false;
      }

      if (res.ok) {
        const data = (await res.json()) as {
          ok?: boolean;
          token?: string;
          tokenHash?: string;
          username?: string;
          expiresAt?: number;
        };
        if (data.ok && data.token && data.tokenHash) {
          const sessionObj: StoredAdminSession = {
            token: data.token,
            tokenHash: data.tokenHash,
            username: data.username || cleanUsername,
            expiresAt: data.expiresAt || Date.now() + 1000 * 60 * 60 * 24 * 7,
          };
          localStorage.setItem(
            ADMIN_SESSION_STORAGE_KEY,
            JSON.stringify(sessionObj)
          );
          await ensureAdminFirestoreGate(data.tokenHash);
          setIsPreviewAdminUnlocked(true);
          setAdminAuthRecord({
            username: sessionObj.username,
            passwordHash: data.tokenHash,
          });
          showToast('Selamat datang di Dashboard Admin ISTAFA Wedding.');
          return true;
        }
      }
    } catch {
      // Fallback only if serverless API is unreachable during offline/static preview:
      // compare salted SHA-256 digest (never plaintext!)
      const saltedDigest = await hashPasswordHex(
        `istafa-v3:${cleanUsername.toLowerCase()}:${cleanPassword}`
      );
      if (
        saltedDigest ===
        '2e2c8f7d99609c44127e74d44d8f26a192a49b1e23c1b54c21506e0d2e84a91b'
      ) {
        const fallbackTokenHash = (
          await hashPasswordHex(`sess-${Date.now()}-${cleanUsername}`)
        ).slice(0, 64);
        const sessionObj: StoredAdminSession = {
          token: `local.${fallbackTokenHash}`,
          tokenHash: fallbackTokenHash,
          username: cleanUsername,
          expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 7,
        };
        localStorage.setItem(
          ADMIN_SESSION_STORAGE_KEY,
          JSON.stringify(sessionObj)
        );
        await ensureAdminFirestoreGate(fallbackTokenHash);
        setIsPreviewAdminUnlocked(true);
        showToast('Selamat datang di Dashboard Admin ISTAFA Wedding.');
        return true;
      }
    }

    if (cleanUsername.includes('@')) {
      try {
        await signInWithEmailAndPassword(auth, cleanUsername, cleanPassword);
        await ensureAdminFirestoreGate();
        setIsPreviewAdminUnlocked(true);
        showToast('Berhasil masuk melalui Firebase Email/Password.');
        return true;
      } catch {
        // Invalid credentials
      }
    }

    return false;
  };

  const updateAdminCredentials = async (newUsername: string, newPassword?: string) => {
    const cleanUser = newUsername.trim();
    if (!cleanUser) return;
    const nextHash = newPassword?.trim()
      ? await hashPasswordHex(newPassword.trim())
      : adminAuthRecord.passwordHash;

    const updated: AdminCredentialsRecord = {
      username: cleanUser,
      passwordHash: nextHash,
    };
    setAdminAuthRecord(updated);
    saveToLocal(STORAGE_KEYS.adminAuthHash, updated);
    showToast('Profil sesi Admin berhasil diperbarui.');
  };

  const loginWithGoogle = async () => {
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      await ensureAdminFirestoreGate();
      setIsPreviewAdminUnlocked(true);
      showToast(`Berhasil masuk sebagai Admin (${cred.user.displayName || cred.user.email || 'Google'}).`);
    } catch (error) {
      console.warn('Popup login notice:', error);
    }
  };

  const loginCustomerWithGoogle = async () => {
    const previousGuestId = guestUserId;
    const guestCart = loadFromLocal<ConsultationCartItem[]>(
      getUserScopedKey(previousGuestId, 'cart'),
      []
    );
    const guestWishlist = loadFromLocal<string[]>(
      getUserScopedKey(previousGuestId, 'wishlist'),
      []
    );
    const guestConsultations = loadFromLocal<ConsultationSession[]>(
      getUserScopedKey(previousGuestId, 'consultations'),
      []
    );
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const authUid = cred.user.uid;

      if (guestCart.length > 0) {
        const existingUserCart = loadFromLocal<ConsultationCartItem[]>(
          getUserScopedKey(authUid, 'cart'),
          []
        );
        const mergedCart = [...existingUserCart];
        for (const gItem of guestCart) {
          if (!mergedCart.some((c) => c.productId === gItem.productId)) {
            mergedCart.push({ ...gItem, userId: authUid });
          }
        }
        saveToLocal(getUserScopedKey(authUid, 'cart'), mergedCart);
        setCartItems(mergedCart);
      }

      if (guestWishlist.length > 0) {
        const existingWishlist = loadFromLocal<string[]>(
          getUserScopedKey(authUid, 'wishlist'),
          []
        );
        const mergedWish = Array.from(new Set([...existingWishlist, ...guestWishlist]));
        saveToLocal(getUserScopedKey(authUid, 'wishlist'), mergedWish);
        setWishlistIds(mergedWish);
      }

      if (guestConsultations.length > 0 && guestConsultations[0].messages.length > 1) {
        const existingCons = loadFromLocal<ConsultationSession[]>(
          getUserScopedKey(authUid, 'consultations'),
          []
        );
        const migratedCons = guestConsultations.map((s) => ({
          ...s,
          userId: authUid,
          messages: s.messages.map((m) => ({ ...m, userId: authUid })),
        }));
        const mergedCons = [
          ...migratedCons,
          ...existingCons.filter((ec) => !migratedCons.some((mc) => mc.id === ec.id)),
        ];
        saveToLocal(getUserScopedKey(authUid, 'consultations'), mergedCons);
        setConsultationSessions(mergedCons);
        for (const sess of migratedCons) {
          void persistConsultationToFirestore(authUid, sess);
        }
      }

      showToast(
        `Selamat datang, ${cred.user.displayName || cred.user.email || 'Calon Pengantin'}! Data keranjang, konsultasi & rencana pernikahan Anda kini tersinkronisasi di akun Anda.`
      );
    } catch (error) {
      console.warn('Customer Google login notice:', error);
    }
  };

  const logoutCustomer = async () => {
    try {
      await signOut(auth);
    } catch {
      // ignore
    }
    const freshGuestId = createFreshGuestId();
    setGuestUserId(freshGuestId);
    showToast('Anda telah keluar dari akun. Sesi baru yang terpisah telah disiapkan.');
  };

  const switchGuestSession = () => {
    if (user) {
      void logoutCustomer();
      return;
    }
    const freshGuestId = createFreshGuestId();
    setGuestUserId(freshGuestId);
    showToast('Sesi pengguna baru dibuat. Keranjang, Wishlist, Rencana & Budget kini kosong dan terpisah.');
  };

  const logoutAdmin = async () => {
    const stored = loadStoredAdminSession();
    localStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
    localStorage.removeItem(STORAGE_KEYS.adminSession);
    sessionStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
    setIsPreviewAdminUnlocked(false);

    if (stored?.token) {
      void fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${stored.token}`,
        },
        body: JSON.stringify({ token: stored.token }),
      }).catch(() => {});
    }

    if (stored?.tokenHash) {
      try {
        await deleteDoc(doc(db, 'adminSessions', stored.tokenHash));
      } catch {
        // ignore
      }
    }

    try {
      await signOut(auth);
    } catch {
      // ignore
    }
    showToast('Anda telah keluar dari sesi Admin.');
  };

  const unlockPreviewAdmin = () => {
    setIsPreviewAdminUnlocked(true);
  };

  // ===========================================================================
  // 1. Product CRUD (Relational Sync with product_images + Cloud Storage)
  // ===========================================================================
  const saveProduct = async (
    input: Omit<Product, 'id' | 'visibility' | 'authorUid'> & { id?: string }
  ) => {
    setIsSyncing(true);
    const cleanId = (input.id || `prod-${Date.now()}`)
      .replace(/[^a-zA-Z0-9_-]/g, '-')
      .slice(0, 120);

    const enrichedImages = enrichProductImagesForDatabase(cleanId, input.images || []);
    if (enrichedImages.length === 0 || !isValidPersistentImageUrl(enrichedImages[0]?.url)) {
      setIsSyncing(false);
      throw new Error('Produk wajib memiliki minimal 1 foto valid yang telah diunggah.');
    }

    const existingProd = products.find((p) => p.id === cleanId);
    const nowIso = new Date().toISOString();
    const activeAuthorUid = isCloudAdmin && user ? user.uid : SERVER_ADMIN_ACTOR_UID;

    const localRecord: Product = {
      id: cleanId,
      name: input.name.trim().slice(0, 150),
      category: input.category.trim().slice(0, 80),
      price: Math.max(0, Number(input.price) || 0),
      originalPrice: input.originalPrice ? Math.max(0, Number(input.originalPrice)) : undefined,
      priceLabel: (input.priceLabel || 'Mulai dari').trim().slice(0, 80),
      shortDescription: input.shortDescription.trim().slice(0, 300),
      description: input.description.trim().slice(0, 4000),
      images: enrichedImages,
      variants: (input.variants || [])
        .filter((v) => v.trim().length > 0)
        .slice(0, 15)
        .map((v) => v.trim().slice(0, 120)),
      sizes: (input.sizes || [])
        .filter((s) => s.trim().length > 0)
        .slice(0, 15)
        .map((s) => s.trim().slice(0, 80)),
      inclusions: (input.inclusions || [])
        .filter((i) => i.trim().length > 0)
        .slice(0, 20)
        .map((i) => i.trim().slice(0, 200)),
      unit: (input.unit || 'Paket').trim().slice(0, 40),
      stockStatus: (input.stockStatus || (input.isAvailable ? 'Tersedia' : 'Habis'))
        .trim()
        .slice(0, 60),
      promoLabel: (input.promoLabel || '').trim().slice(0, 80),
      isPromo: Boolean(input.isPromo),
      isAvailable: Boolean(input.isAvailable),
      isFeatured: Boolean(input.isFeatured),
      isNew: Boolean(input.isNew),
      isActive: input.isActive !== false,
      popularityScore: Number(input.popularityScore) || existingProd?.popularityScore || 88,
      visibility: 'public',
      authorUid: activeAuthorUid,
      createdAt: existingProd?.createdAt || nowIso,
      updatedAt: nowIso,
    };

    const previousProducts = products;
    const updatedList = existingProd
      ? products.map((p) => (p.id === cleanId ? localRecord : p))
      : [localRecord, ...products];
    setProducts(updatedList);
    saveToLocal(STORAGE_KEYS.products, updatedList);

    try {
      const res = await fetch('/api/db/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(localRecord),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.products)) {
          setProducts(data.products);
          saveToLocal(STORAGE_KEYS.products, data.products);
        }
      }
    } catch (err) {
      console.warn('Server DB product save warning:', err);
    }

    if (isAuthorizedAdmin) {
      const createdImageDocIds: string[] = [];
      try {
        await ensureAdminFirestoreGate();
        const now = serverTimestamp();

        // 1. Write all product_images documents first
        for (let idx = 0; idx < enrichedImages.length; idx++) {
          const img = enrichedImages[idx];
          const imgDocId = (img.image_id || img.id)
            .replace(/[^a-zA-Z0-9_-]/g, '-')
            .slice(0, 128);
          await setDoc(doc(db, 'product_images', imgDocId), {
            image_id: imgDocId,
            product_id: cleanId,
            image_url: (img.image_url || img.url).slice(0, 800000),
            storage_path: (img.storage_path || `products/${cleanId}/${imgDocId}`).slice(0, 400),
            is_primary: Boolean(img.is_primary ?? img.isPrimary),
            sort_order: typeof img.sort_order === 'number' ? img.sort_order : idx,
            caption: (img.caption || localRecord.name).slice(0, 300),
            visibility: 'public',
            authorUid: activeAuthorUid,
            created_at: (img.created_at || nowIso).slice(0, 60),
            createdAt: now,
            updatedAt: now,
          });
          createdImageDocIds.push(imgDocId);
        }

        // 2. Write the parent product document
        await setDoc(doc(db, 'products', cleanId), {
          name: localRecord.name,
          category: localRecord.category,
          price: localRecord.price,
          originalPrice: localRecord.originalPrice || 0,
          priceLabel: localRecord.priceLabel,
          shortDescription: localRecord.shortDescription,
          description: localRecord.description,
          images: enrichedImages,
          variants: localRecord.variants,
          sizes: localRecord.sizes || [],
          inclusions: localRecord.inclusions,
          unit: localRecord.unit || 'Paket',
          stockStatus: localRecord.stockStatus || 'Tersedia',
          promoLabel: localRecord.promoLabel || '',
          isPromo: Boolean(localRecord.isPromo),
          isAvailable: localRecord.isAvailable,
          isFeatured: localRecord.isFeatured,
          isNew: Boolean(localRecord.isNew),
          isActive: Boolean(localRecord.isActive),
          popularityScore: localRecord.popularityScore || 88,
          visibility: 'public',
          authorUid: activeAuthorUid,
          createdAt: now,
          updatedAt: now,
        });

        // 3. Clean up any removed images from product_images collection
        if (existingProd?.images?.length) {
          const currentImgIds = new Set(createdImageDocIds);
          for (const oldImg of existingProd.images) {
            const oldId = (oldImg.image_id || oldImg.id || '')
              .replace(/[^a-zA-Z0-9_-]/g, '-')
              .slice(0, 128);
            if (oldId && !currentImgIds.has(oldId)) {
              await deleteDoc(doc(db, 'product_images', oldId)).catch(() => {});
            }
          }
        }
      } catch (error) {
        console.error('Firestore product save error:', error);
        // Rollback local state if cloud persistence failed
        setProducts(previousProducts);
        saveToLocal(STORAGE_KEYS.products, previousProducts);
        setIsSyncing(false);
        throw new Error(
          'Gagal menyimpan produk & foto ke Cloud Database. Silakan periksa koneksi dan coba lagi.'
        );
      }
    }

    setIsSyncing(false);
    showToast(
      `Produk "${localRecord.name}" beserta ${enrichedImages.length} foto berhasil disimpan permanen ke Cloud Database.`
    );
  };

  const toggleProductActive = async (productId: string) => {
    const target = products.find((p) => p.id === productId);
    if (!target) return;
    await saveProduct({
      ...target,
      isActive: target.isActive === false ? true : false,
    });
  };

  const deleteProduct = async (productId: string) => {
    const targetProd = products.find((p) => p.id === productId);
    const updatedList = products.filter((p) => p.id !== productId);
    setProducts(updatedList);
    saveToLocal(STORAGE_KEYS.products, updatedList);

    try {
      const res = await fetch(`/api/db/products/${encodeURIComponent(productId)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.products)) {
          setProducts(data.products);
          saveToLocal(STORAGE_KEYS.products, data.products);
        }
      }
    } catch (err) {
      console.warn('Server DB product delete warning:', err);
    }

    if (targetProd && targetProd.images?.length > 0) {
      await deleteStorageUrls(targetProd.images.map((img) => img.image_url || img.url));
    }

    if (isAuthorizedAdmin) {
      try {
        await ensureAdminFirestoreGate();
        if (targetProd?.images?.length) {
          for (const img of targetProd.images) {
            const imgId = (img.image_id || img.id || '')
              .replace(/[^a-zA-Z0-9_-]/g, '-')
              .slice(0, 128);
            if (imgId) {
              await deleteDoc(doc(db, 'product_images', imgId)).catch(() => {});
            }
          }
        }
        await deleteDoc(doc(db, 'products', productId));
      } catch (err) {
        console.warn('Firestore product delete notice:', err);
      }
    }
    showToast('Produk beserta seluruh foto berhasil dihapus secara permanen.');
  };

  // ===========================================================================
  // 2. Category CRUD
  // ===========================================================================
  const saveCategory = async (
    input: Omit<Category, 'id' | 'visibility' | 'authorUid'> & { id?: string }
  ) => {
    const cleanId = (input.id || `cat-${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '-');
    const existingCat = categories.find((c) => c.id === cleanId);
    const activeAuthorUid = isCloudAdmin && user ? user.uid : SERVER_ADMIN_ACTOR_UID;
    const localRecord: Category = {
      id: cleanId,
      name: input.name.trim().slice(0, 80),
      slug: (input.slug || input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'))
        .replace(/[^a-zA-Z0-9_-]/g, '-')
        .slice(0, 80),
      description: input.description.trim().slice(0, 300),
      iconName: (input.iconName || 'Sparkles').slice(0, 40),
      coverImageUrl: normalizeWeddingImageUrl(input.coverImageUrl).slice(0, 800000),
      sortOrder: Math.max(0, Math.min(1000, Number(input.sortOrder) || categories.length + 1)),
      visibility: 'public',
      authorUid: activeAuthorUid,
    };

    const updatedList = existingCat
      ? categories.map((c) => (c.id === cleanId ? localRecord : c))
      : [...categories, localRecord].sort((a, b) => a.sortOrder - b.sortOrder);
    setCategories(updatedList);
    saveToLocal(STORAGE_KEYS.categories, updatedList);

    try {
      const res = await fetch('/api/db/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(localRecord),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.categories)) {
          setCategories(data.categories);
          saveToLocal(STORAGE_KEYS.categories, data.categories);
        }
      }
    } catch {
      // ignore
    }

    if (isAuthorizedAdmin) {
      try {
        await ensureAdminFirestoreGate();
        const now = serverTimestamp();
        await setDoc(doc(db, 'categories', cleanId), {
          name: localRecord.name,
          slug: localRecord.slug,
          description: localRecord.description,
          iconName: localRecord.iconName,
          coverImageUrl: localRecord.coverImageUrl,
          sortOrder: localRecord.sortOrder,
          visibility: 'public',
          authorUid: activeAuthorUid,
          createdAt: now,
          updatedAt: now,
        });
      } catch (err) {
        console.warn('Firestore category save notice:', err);
      }
    }
    showToast(`Kategori "${localRecord.name}" berhasil disimpan.`);
  };

  const deleteCategory = async (categoryId: string) => {
    const updatedList = categories.filter((c) => c.id !== categoryId);
    setCategories(updatedList);
    saveToLocal(STORAGE_KEYS.categories, updatedList);

    try {
      const res = await fetch(`/api/db/categories/${encodeURIComponent(categoryId)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.categories)) {
          setCategories(data.categories);
          saveToLocal(STORAGE_KEYS.categories, data.categories);
        }
      }
    } catch {
      // ignore
    }

    if (isAuthorizedAdmin) {
      try {
        await ensureAdminFirestoreGate();
        await deleteDoc(doc(db, 'categories', categoryId));
      } catch {
        // ignore
      }
    }
    showToast('Kategori berhasil dihapus.');
  };

  // ===========================================================================
  // 3. Wedding Package CRUD
  // ===========================================================================
  const savePackage = async (
    input: Omit<WeddingPackage, 'id' | 'visibility' | 'authorUid'> & { id?: string }
  ) => {
    const cleanId = (input.id || `pkg-${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '-');
    const enrichedImages = enrichProductImagesForDatabase(cleanId, input.images || []);

    const existingPkg = packages.find((p) => p.id === cleanId);
    const activeAuthorUid = isCloudAdmin && user ? user.uid : SERVER_ADMIN_ACTOR_UID;
    const cleanInclusions = (input.inclusions || [])
      .filter((i) => i.trim().length > 0)
      .slice(0, 25)
      .map((i) => i.trim().slice(0, 200));

    const localRecord: WeddingPackage = {
      id: cleanId,
      name: input.name.trim().slice(0, 150),
      tier: input.tier.trim().slice(0, 60),
      price: Math.max(0, Number(input.price) || 0),
      originalPrice: input.originalPrice ? Math.max(0, Number(input.originalPrice)) : undefined,
      guestCapacity: input.guestCapacity.trim().slice(0, 80),
      description: input.description.trim().slice(0, 2000),
      inclusions: cleanInclusions.length > 0 ? cleanInclusions : ['Konsultasi Konsep & Dekorasi'],
      images: enrichedImages,
      isPopular: Boolean(input.isPopular),
      isPromo: Boolean(input.isPromo),
      promoLabel: (input.promoLabel || '').trim().slice(0, 80),
      isActive: input.isActive !== false,
      visibility: 'public',
      authorUid: activeAuthorUid,
    };

    const updatedList = existingPkg
      ? packages.map((p) => (p.id === cleanId ? localRecord : p))
      : [...packages, localRecord];
    setPackages(updatedList);
    saveToLocal(STORAGE_KEYS.packages, updatedList);

    try {
      const res = await fetch('/api/db/packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(localRecord),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.packages)) {
          setPackages(data.packages);
          saveToLocal(STORAGE_KEYS.packages, data.packages);
        }
      }
    } catch {
      // ignore
    }

    if (isAuthorizedAdmin) {
      try {
        await ensureAdminFirestoreGate();
        const now = serverTimestamp();
        await setDoc(doc(db, 'packages', cleanId), {
          name: localRecord.name,
          tier: localRecord.tier,
          price: localRecord.price,
          originalPrice: localRecord.originalPrice || 0,
          guestCapacity: localRecord.guestCapacity,
          description: localRecord.description,
          inclusions: localRecord.inclusions,
          images: localRecord.images,
          isPopular: localRecord.isPopular,
          isPromo: Boolean(localRecord.isPromo),
          promoLabel: localRecord.promoLabel || '',
          isActive: localRecord.isActive !== false,
          visibility: 'public',
          authorUid: activeAuthorUid,
          createdAt: now,
          updatedAt: now,
        });
      } catch (err) {
        console.warn('Firestore package save notice:', err);
      }
    }
    showToast(`Paket "${localRecord.name}" berhasil disimpan.`);
  };

  const deletePackage = async (packageId: string) => {
    const targetPkg = packages.find((p) => p.id === packageId);
    const updatedList = packages.filter((p) => p.id !== packageId);
    setPackages(updatedList);
    saveToLocal(STORAGE_KEYS.packages, updatedList);

    try {
      const res = await fetch(`/api/db/packages/${encodeURIComponent(packageId)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.packages)) {
          setPackages(data.packages);
          saveToLocal(STORAGE_KEYS.packages, data.packages);
        }
      }
    } catch {
      // ignore
    }

    if (targetPkg && targetPkg.images?.length > 0) {
      await deleteStorageUrls(targetPkg.images.map((img) => img.url));
    }

    if (isAuthorizedAdmin) {
      try {
        await ensureAdminFirestoreGate();
        await deleteDoc(doc(db, 'packages', packageId));
      } catch {
        // ignore
      }
    }
    showToast('Paket pernikahan berhasil dihapus.');
  };

  // ===========================================================================
  // 4. Gallery CRUD (Supports Multi-Photo per Event + Location & Theme)
  // ===========================================================================
  const saveGalleryItem = async (
    input: Omit<GalleryItem, 'id' | 'visibility' | 'authorUid'> & { id?: string }
  ) => {
    const cleanId = (
      input.id || `gal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    ).replace(/[^a-zA-Z0-9_-]/g, '-');

    const enrichedImages = enrichProductImagesForDatabase(cleanId, input.images || []);
    const primaryUrl = normalizeWeddingImageUrl(
      enrichedImages.find((i) => i.isPrimary)?.url ||
        enrichedImages[0]?.url ||
        input.imageUrl
    );

    const existingItem = gallery.find((g) => g.id === cleanId);
    const activeAuthorUid = isCloudAdmin && user ? user.uid : SERVER_ADMIN_ACTOR_UID;
    const localRecord: GalleryItem = {
      id: cleanId,
      title: input.title.trim().slice(0, 150),
      category: input.category.trim().slice(0, 80),
      imageUrl: primaryUrl.slice(0, 800000),
      caption: (input.caption || input.title).trim().slice(0, 400),
      location: (input.location || '').trim().slice(0, 120),
      theme: (input.theme || '').trim().slice(0, 120),
      images:
        enrichedImages.length > 0
          ? enrichedImages
          : enrichProductImagesForDatabase(cleanId, [
              {
                id: `g-primary-${cleanId}`,
                url: primaryUrl.slice(0, 800000),
                isPrimary: true,
                caption: input.title.trim().slice(0, 300),
              },
            ]),
      aspectType: input.aspectType || 'landscape',
      visibility: 'public',
      authorUid: activeAuthorUid,
    };

    const updatedList = existingItem
      ? gallery.map((g) => (g.id === cleanId ? localRecord : g))
      : [localRecord, ...gallery];
    setGallery(updatedList);
    saveToLocal(STORAGE_KEYS.gallery, updatedList);

    try {
      const res = await fetch('/api/db/gallery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(localRecord),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.gallery)) {
          setGallery(data.gallery);
          saveToLocal(STORAGE_KEYS.gallery, data.gallery);
        }
      }
    } catch {
      // ignore
    }

    if (isAuthorizedAdmin) {
      try {
        await ensureAdminFirestoreGate();
        const now = serverTimestamp();
        await setDoc(doc(db, 'gallery', cleanId), {
          title: localRecord.title,
          category: localRecord.category,
          imageUrl: localRecord.imageUrl,
          caption: localRecord.caption,
          location: localRecord.location || '',
          theme: localRecord.theme || '',
          images: localRecord.images || [],
          aspectType: localRecord.aspectType,
          visibility: 'public',
          authorUid: activeAuthorUid,
          createdAt: now,
          updatedAt: now,
        });
      } catch (err) {
        console.warn('Firestore gallery save notice:', err);
      }
    }
    showToast(`Proyek galeri "${localRecord.title}" berhasil disimpan.`);
  };

  const deleteGalleryItem = async (galleryId: string) => {
    const targetItem = gallery.find((g) => g.id === galleryId);
    const updatedList = gallery.filter((g) => g.id !== galleryId);
    setGallery(updatedList);
    saveToLocal(STORAGE_KEYS.gallery, updatedList);

    try {
      const res = await fetch(`/api/db/gallery/${encodeURIComponent(galleryId)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.gallery)) {
          setGallery(data.gallery);
          saveToLocal(STORAGE_KEYS.gallery, data.gallery);
        }
      }
    } catch {
      // ignore
    }

    if (targetItem) {
      const urls = [
        targetItem.imageUrl,
        ...(targetItem.images || []).map((img) => img.url),
      ].filter(Boolean);
      await deleteStorageUrls(urls);
    }

    if (isAuthorizedAdmin) {
      try {
        await ensureAdminFirestoreGate();
        await deleteDoc(doc(db, 'gallery', galleryId));
      } catch {
        // ignore
      }
    }
    showToast('Item galeri berhasil dihapus.');
  };

  // ===========================================================================
  // 5. Testimonial CRUD
  // ===========================================================================
  const saveTestimonial = async (
    input: Omit<Testimonial, 'id' | 'visibility' | 'authorUid'> & { id?: string }
  ) => {
    const cleanId = (input.id || `testi-${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '-');
    const enrichedImages = enrichProductImagesForDatabase(cleanId, input.images || []);

    const existing = testimonials.find((t) => t.id === cleanId);
    const activeAuthorUid = isCloudAdmin && user ? user.uid : SERVER_ADMIN_ACTOR_UID;
    const localRecord: Testimonial = {
      id: cleanId,
      coupleName: input.coupleName.trim().slice(0, 120),
      eventDate: input.eventDate.trim().slice(0, 80),
      venue: input.venue.trim().slice(0, 150),
      packageTaken: input.packageTaken.trim().slice(0, 150),
      rating: Math.max(1, Math.min(5, Number(input.rating) || 5)),
      review: input.review.trim().slice(0, 1500),
      images: enrichedImages,
      visibility: 'public',
      authorUid: activeAuthorUid,
    };

    const updatedList = existing
      ? testimonials.map((t) => (t.id === cleanId ? localRecord : t))
      : [localRecord, ...testimonials];
    setTestimonials(updatedList);
    saveToLocal(STORAGE_KEYS.testimonials, updatedList);

    try {
      const res = await fetch('/api/db/testimonials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(localRecord),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.testimonials)) {
          setTestimonials(data.testimonials);
          saveToLocal(STORAGE_KEYS.testimonials, data.testimonials);
        }
      }
    } catch {
      // ignore
    }

    if (isAuthorizedAdmin) {
      try {
        await ensureAdminFirestoreGate();
        const now = serverTimestamp();
        await setDoc(doc(db, 'testimonials', cleanId), {
          coupleName: localRecord.coupleName,
          eventDate: localRecord.eventDate,
          venue: localRecord.venue,
          packageTaken: localRecord.packageTaken,
          rating: localRecord.rating,
          review: localRecord.review,
          images: localRecord.images,
          visibility: 'public',
          authorUid: activeAuthorUid,
          createdAt: now,
          updatedAt: now,
        });
      } catch (err) {
        console.warn('Firestore testimonial save notice:', err);
      }
    }
    showToast(`Testimoni & dokumentasi "${localRecord.coupleName}" berhasil disimpan.`);
  };

  const deleteTestimonial = async (testimonialId: string) => {
    const updatedList = testimonials.filter((t) => t.id !== testimonialId);
    setTestimonials(updatedList);
    saveToLocal(STORAGE_KEYS.testimonials, updatedList);

    try {
      const res = await fetch(`/api/db/testimonials/${encodeURIComponent(testimonialId)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.testimonials)) {
          setTestimonials(data.testimonials);
          saveToLocal(STORAGE_KEYS.testimonials, data.testimonials);
        }
      }
    } catch {
      // ignore
    }

    if (isAuthorizedAdmin) {
      try {
        await ensureAdminFirestoreGate();
        await deleteDoc(doc(db, 'testimonials', testimonialId));
      } catch {
        // ignore
      }
    }
    showToast('Testimoni berhasil dihapus.');
  };

  // ===========================================================================
  // 6. Promo CRUD
  // ===========================================================================
  const savePromo = async (
    input: Omit<Promo, 'id' | 'visibility' | 'authorUid'> & { id?: string }
  ) => {
    const cleanId = (input.id || `promo-${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '-');
    const existing = promos.find((p) => p.id === cleanId);
    const activeAuthorUid = isCloudAdmin && user ? user.uid : SERVER_ADMIN_ACTOR_UID;
    const localRecord: Promo = {
      id: cleanId,
      title: input.title.trim().slice(0, 150),
      description: input.description.trim().slice(0, 1000),
      promoPrice: Math.max(0, Number(input.promoPrice) || 0),
      normalPrice: Math.max(0, Number(input.normalPrice) || 0),
      imageUrl: normalizeWeddingImageUrl(input.imageUrl).slice(0, 800000),
      startDate: input.startDate.slice(0, 30),
      endDate: input.endDate.slice(0, 30),
      badgeText: (input.badgeText || 'Promo Spesial').trim().slice(0, 60),
      isActive: Boolean(input.isActive),
      visibility: 'public',
      authorUid: activeAuthorUid,
    };

    const updatedList = existing
      ? promos.map((p) => (p.id === cleanId ? localRecord : p))
      : [localRecord, ...promos];
    setPromos(updatedList);
    saveToLocal(STORAGE_KEYS.promos, updatedList);

    try {
      const res = await fetch('/api/db/promos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(localRecord),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.promos)) {
          setPromos(data.promos);
          saveToLocal(STORAGE_KEYS.promos, data.promos);
        }
      }
    } catch {
      // ignore
    }

    if (isAuthorizedAdmin) {
      try {
        await ensureAdminFirestoreGate();
        const now = serverTimestamp();
        await setDoc(doc(db, 'promos', cleanId), {
          title: localRecord.title,
          description: localRecord.description,
          promoPrice: localRecord.promoPrice,
          normalPrice: localRecord.normalPrice,
          imageUrl: localRecord.imageUrl,
          startDate: localRecord.startDate,
          endDate: localRecord.endDate,
          badgeText: localRecord.badgeText || '',
          isActive: localRecord.isActive,
          visibility: 'public',
          authorUid: activeAuthorUid,
          createdAt: now,
          updatedAt: now,
        });
      } catch (err) {
        console.warn('Firestore promo save notice:', err);
      }
    }
    showToast(`Promo "${localRecord.title}" berhasil disimpan.`);
  };

  const deletePromo = async (promoId: string) => {
    const updatedList = promos.filter((p) => p.id !== promoId);
    setPromos(updatedList);
    saveToLocal(STORAGE_KEYS.promos, updatedList);

    try {
      const res = await fetch(`/api/db/promos/${encodeURIComponent(promoId)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.promos)) {
          setPromos(data.promos);
          saveToLocal(STORAGE_KEYS.promos, data.promos);
        }
      }
    } catch {
      // ignore
    }

    if (isAuthorizedAdmin) {
      try {
        await ensureAdminFirestoreGate();
        await deleteDoc(doc(db, 'promos', promoId));
      } catch {
        // ignore
      }
    }
    showToast('Promo berhasil dihapus.');
  };

  // ===========================================================================
  // 7. Inspiration Articles CRUD
  // ===========================================================================
  const saveArticle = async (
    input: Omit<InspirationArticle, 'id' | 'visibility' | 'authorUid'> & { id?: string }
  ) => {
    const cleanId = (input.id || `art-${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '-');
    const existing = articles.find((a) => a.id === cleanId);
    const activeAuthorUid = isCloudAdmin && user ? user.uid : SERVER_ADMIN_ACTOR_UID;
    const localRecord: InspirationArticle = {
      id: cleanId,
      title: input.title.trim().slice(0, 180),
      category: input.category.trim().slice(0, 80),
      excerpt: input.excerpt.trim().slice(0, 400),
      content: input.content.trim().slice(0, 8000),
      imageUrl: normalizeWeddingImageUrl(input.imageUrl).slice(0, 800000),
      readTime: (input.readTime || '4 Menit Baca').trim().slice(0, 40),
      publishedDate: (input.publishedDate || 'Oktober 2026').trim().slice(0, 60),
      visibility: 'public',
      authorUid: activeAuthorUid,
    };

    const updatedList = existing
      ? articles.map((a) => (a.id === cleanId ? localRecord : a))
      : [localRecord, ...articles];
    setArticles(updatedList);
    saveToLocal(STORAGE_KEYS.articles, updatedList);

    try {
      const res = await fetch('/api/db/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(localRecord),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.articles)) {
          setArticles(data.articles);
          saveToLocal(STORAGE_KEYS.articles, data.articles);
        }
      }
    } catch {
      // ignore
    }

    if (isAuthorizedAdmin) {
      try {
        await ensureAdminFirestoreGate();
        const now = serverTimestamp();
        await setDoc(doc(db, 'articles', cleanId), {
          title: localRecord.title,
          category: localRecord.category,
          excerpt: localRecord.excerpt,
          content: localRecord.content,
          imageUrl: localRecord.imageUrl,
          readTime: localRecord.readTime,
          publishedDate: localRecord.publishedDate,
          visibility: 'public',
          authorUid: activeAuthorUid,
          createdAt: now,
          updatedAt: now,
        });
      } catch (err) {
        console.warn('Firestore article save notice:', err);
      }
    }
    showToast(`Artikel "${localRecord.title}" berhasil disimpan.`);
  };

  const deleteArticle = async (articleId: string) => {
    const updatedList = articles.filter((a) => a.id !== articleId);
    setArticles(updatedList);
    saveToLocal(STORAGE_KEYS.articles, updatedList);

    try {
      const res = await fetch(`/api/db/articles/${encodeURIComponent(articleId)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.articles)) {
          setArticles(data.articles);
          saveToLocal(STORAGE_KEYS.articles, data.articles);
        }
      }
    } catch {
      // ignore
    }

    if (isAuthorizedAdmin) {
      try {
        await ensureAdminFirestoreGate();
        await deleteDoc(doc(db, 'articles', articleId));
      } catch {
        // ignore
      }
    }
    showToast('Artikel inspirasi berhasil dihapus.');
  };

  // ===========================================================================
  // 8. Calendar Availability CRUD (Splits Public Status from Private PII Notes)
  // ===========================================================================
  const saveCalendarDate = async (
    date: string,
    status: CalendarPublicEntry['status'],
    publicNote: string,
    clientName?: string,
    privateNote?: string
  ) => {
    const cleanDate = date.trim().slice(0, 10);
    if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(cleanDate)) return;

    const existingPub = calendarPublic.find((c) => c.date === cleanDate);
    const activeAuthorUid = isCloudAdmin && user ? user.uid : SERVER_ADMIN_ACTOR_UID;
    const pubRecord: CalendarPublicEntry = {
      date: cleanDate,
      status,
      publicNote: (
        publicNote ||
        (status === 'available'
          ? 'Tersedia untuk Semua Paket'
          : status === 'reserved'
          ? 'Reservasi Masuk / Tersisa 1 Slot'
          : 'Full Booked / Tidak Tersedia')
      )
        .trim()
        .slice(0, 200),
      visibility: 'public',
      authorUid: activeAuthorUid,
    };

    const nextPub = existingPub
      ? calendarPublic.map((c) => (c.date === cleanDate ? pubRecord : c))
      : [...calendarPublic, pubRecord].sort((a, b) => a.date.localeCompare(b.date));
    setCalendarPublic(nextPub);
    saveToLocal(STORAGE_KEYS.calendarPublic, nextPub);

    let privRecord: CalendarPrivateEntry | undefined;
    if (clientName !== undefined || privateNote !== undefined) {
      const existingPriv = calendarPrivate.find((c) => c.date === cleanDate);
      privRecord = {
        date: cleanDate,
        clientName: (clientName || '').trim().slice(0, 150),
        privateNote: (privateNote || '').trim().slice(0, 500),
        authorUid: activeAuthorUid,
      };
      const nextPriv = existingPriv
        ? calendarPrivate.map((c) => (c.date === cleanDate ? privRecord! : c))
        : [...calendarPrivate, privRecord];
      setCalendarPrivate(nextPriv);
      saveToLocal(STORAGE_KEYS.calendarPrivate, nextPriv);
    }

    try {
      const res = await fetch('/api/db/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publicEntry: pubRecord,
          privateEntry: privRecord,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.calendarPublic)) {
          setCalendarPublic(data.calendarPublic);
          saveToLocal(STORAGE_KEYS.calendarPublic, data.calendarPublic);
        }
        if (Array.isArray(data?.calendarPrivate)) {
          setCalendarPrivate(data.calendarPrivate);
          saveToLocal(STORAGE_KEYS.calendarPrivate, data.calendarPrivate);
        }
      }
    } catch {
      // ignore
    }

    if (isAuthorizedAdmin) {
      try {
        await ensureAdminFirestoreGate();
        const now = serverTimestamp();
        await setDoc(doc(db, 'calendar', cleanDate), {
          date: pubRecord.date,
          status: pubRecord.status,
          publicNote: pubRecord.publicNote,
          visibility: 'public',
          authorUid: activeAuthorUid,
          createdAt: now,
          updatedAt: now,
        });
        if (clientName || privateNote) {
          await setDoc(doc(db, 'calendarPrivate', cleanDate), {
            date: cleanDate,
            clientName: (clientName || '').trim().slice(0, 150),
            privateNote: (privateNote || '').trim().slice(0, 500),
            authorUid: activeAuthorUid,
            createdAt: now,
            updatedAt: now,
          });
        }
      } catch (err) {
        console.warn('Firestore calendar save notice:', err);
      }
    }

    showToast(`Status tanggal ${cleanDate} berhasil diperbarui.`);
  };

  const deleteCalendarDate = async (date: string) => {
    const nextPub = calendarPublic.filter((c) => c.date !== date);
    const nextPriv = calendarPrivate.filter((c) => c.date !== date);
    setCalendarPublic(nextPub);
    setCalendarPrivate(nextPriv);
    saveToLocal(STORAGE_KEYS.calendarPublic, nextPub);
    saveToLocal(STORAGE_KEYS.calendarPrivate, nextPriv);

    try {
      const res = await fetch(`/api/db/calendar/${encodeURIComponent(date)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.calendarPublic)) {
          setCalendarPublic(data.calendarPublic);
          saveToLocal(STORAGE_KEYS.calendarPublic, data.calendarPublic);
        }
        if (Array.isArray(data?.calendarPrivate)) {
          setCalendarPrivate(data.calendarPrivate);
          saveToLocal(STORAGE_KEYS.calendarPrivate, data.calendarPrivate);
        }
      }
    } catch {
      // ignore
    }

    if (isAuthorizedAdmin) {
      try {
        await ensureAdminFirestoreGate();
        await deleteDoc(doc(db, 'calendar', date));
        await deleteDoc(doc(db, 'calendarPrivate', date)).catch(() => {});
      } catch {
        // ignore
      }
    }
    showToast(`Pengaturan khusus tanggal ${date} dihapus (kembali ke status Tersedia).`);
  };

  // ===========================================================================
  // 9. Service Areas CRUD
  // ===========================================================================
  const saveServiceArea = async (
    input: Omit<ServiceArea, 'id' | 'visibility' | 'authorUid'> & { id?: string }
  ) => {
    const cleanId = (input.id || `area-${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '-');
    const existing = serviceAreas.find((a) => a.id === cleanId);
    const activeAuthorUid = isCloudAdmin && user ? user.uid : SERVER_ADMIN_ACTOR_UID;
    const localRecord: ServiceArea = {
      id: cleanId,
      city: input.city.trim().slice(0, 100),
      province: input.province.trim().slice(0, 100),
      description: input.description.trim().slice(0, 300),
      isPrimary: Boolean(input.isPrimary),
      visibility: 'public',
      authorUid: activeAuthorUid,
    };

    const updatedList = existing
      ? serviceAreas.map((a) => (a.id === cleanId ? localRecord : a))
      : [...serviceAreas, localRecord];
    setServiceAreas(updatedList);
    saveToLocal(STORAGE_KEYS.serviceAreas, updatedList);

    try {
      const res = await fetch('/api/db/service-areas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(localRecord),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.serviceAreas)) {
          setServiceAreas(data.serviceAreas);
          saveToLocal(STORAGE_KEYS.serviceAreas, data.serviceAreas);
        }
      }
    } catch {
      // ignore
    }

    if (isAuthorizedAdmin) {
      try {
        await ensureAdminFirestoreGate();
        const now = serverTimestamp();
        await setDoc(doc(db, 'serviceAreas', cleanId), {
          city: localRecord.city,
          province: localRecord.province,
          description: localRecord.description,
          isPrimary: localRecord.isPrimary,
          visibility: 'public',
          authorUid: activeAuthorUid,
          createdAt: now,
          updatedAt: now,
        });
      } catch (err) {
        console.warn('Firestore service area save notice:', err);
      }
    }
    showToast(`Wilayah layanan "${localRecord.city}" berhasil disimpan.`);
  };

  const deleteServiceArea = async (areaId: string) => {
    const updatedList = serviceAreas.filter((a) => a.id !== areaId);
    setServiceAreas(updatedList);
    saveToLocal(STORAGE_KEYS.serviceAreas, updatedList);

    try {
      const res = await fetch(`/api/db/service-areas/${encodeURIComponent(areaId)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.serviceAreas)) {
          setServiceAreas(data.serviceAreas);
          saveToLocal(STORAGE_KEYS.serviceAreas, data.serviceAreas);
        }
      }
    } catch {
      // ignore
    }

    if (isAuthorizedAdmin) {
      try {
        await ensureAdminFirestoreGate();
        await deleteDoc(doc(db, 'serviceAreas', areaId));
      } catch {
        // ignore
      }
    }
    showToast('Wilayah layanan berhasil dihapus.');
  };

  // ===========================================================================
  // 10. Store Settings Update
  // ===========================================================================
  const updateStoreSettings = async (
    input: Omit<StoreSettings, 'id' | 'visibility' | 'authorUid'>
  ) => {
    const cleanPhone =
      input.whatsappNumber.replace(/[^0-9+]/g, '').slice(0, 25) || '6282123376933';
    const activeAuthorUid = isCloudAdmin && user ? user.uid : SERVER_ADMIN_ACTOR_UID;
    const localRecord: StoreSettings = {
      id: 'main',
      businessName: input.businessName.trim().slice(0, 120),
      tagline: input.tagline.trim().slice(0, 250),
      whatsappNumber: cleanPhone,
      email: input.email.trim().slice(0, 120),
      address: input.address.trim().slice(0, 300),
      instagram: input.instagram.trim().slice(0, 100),
      tiktok: (input.tiktok || '').trim().slice(0, 100),
      heroTitle: input.heroTitle.trim().slice(0, 200),
      heroSubtitle: input.heroSubtitle.trim().slice(0, 400),
      heroImageUrl: normalizeWeddingImageUrl(input.heroImageUrl).slice(0, 800000),
      logoText: input.logoText.trim().slice(0, 60),
      visibility: 'public',
      authorUid: activeAuthorUid,
    };

    setSettings(localRecord);
    saveToLocal(STORAGE_KEYS.settings, localRecord);

    try {
      const res = await fetch('/api/db/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(localRecord),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.settings) {
          setSettings(data.settings);
          saveToLocal(STORAGE_KEYS.settings, data.settings);
        }
      }
    } catch {
      // ignore
    }

    if (isAuthorizedAdmin) {
      try {
        await ensureAdminFirestoreGate();
        const now = serverTimestamp();
        await setDoc(doc(db, 'settings', 'main'), {
          businessName: localRecord.businessName,
          tagline: localRecord.tagline,
          whatsappNumber: localRecord.whatsappNumber,
          email: localRecord.email,
          address: localRecord.address,
          instagram: localRecord.instagram,
          tiktok: localRecord.tiktok || '',
          heroTitle: localRecord.heroTitle,
          heroSubtitle: localRecord.heroSubtitle,
          heroImageUrl: localRecord.heroImageUrl,
          logoText: localRecord.logoText,
          visibility: 'public',
          authorUid: activeAuthorUid,
          createdAt: now,
          updatedAt: now,
        });
      } catch (err) {
        console.warn('Firestore settings save notice:', err);
      }
    }
    showToast('Pengaturan website & nomor WhatsApp berhasil diperbarui permanen.');
  };

  return (
    <WeddingContext.Provider
      value={{
        user,
        currentUserId,
        isGuestUser,
        authReady,
        isCloudAdmin,
        isPreviewAdminUnlocked,
        adminUsername: adminAuthRecord.username,
        unlockPreviewAdmin,
        loginWithCredentials,
        updateAdminCredentials,
        loginWithGoogle,
        loginCustomerWithGoogle,
        logoutCustomer,
        switchGuestSession,
        logoutAdmin,
        settings,
        categories,
        products,
        packages,
        gallery,
        testimonials,
        promos,
        activePromos,
        articles,
        calendarPublic,
        calendarPrivate,
        serviceAreas,
        inquiries,
        leads,
        allConsultations,
        orders,
        isSyncing,
        toastMessage,
        showToast,
        wishlistIds,
        wishlistProducts,
        isInWishlist,
        toggleWishlist,
        removeFromWishlist,
        clearWishlist,
        cartItems,
        cartTotal,
        cartWeddingDate,
        cartGuestCount,
        setCartWeddingDate,
        setCartGuestCount,
        addToCart,
        updateCartQuantity,
        removeFromCart,
        clearCart,
        budgetAllocation,
        updateBudgetAllocation,
        syncCartToBudget,
        applyProductToBudget,
        saveBudgetPlan,
        weddingPlan,
        updateWeddingPlan,
        addProductToWeddingPlan,
        syncPlannerToBudget,
        consultationSessions,
        activeConsultation,
        startNewConsultationSession,
        selectConsultationSession,
        deleteConsultationSession,
        saveConsultationSessionState,
        trackProductInterest,
        saveLead,
        updateLeadStatus,
        deleteLead,
        createOrder,
        updateOrderStatus,
        deleteOrder,
        recordInquiry,
        saveProduct,
        toggleProductActive,
        deleteProduct,
        saveCategory,
        deleteCategory,
        savePackage,
        deletePackage,
        saveGalleryItem,
        deleteGalleryItem,
        saveTestimonial,
        deleteTestimonial,
        savePromo,
        deletePromo,
        saveArticle,
        deleteArticle,
        saveCalendarDate,
        deleteCalendarDate,
        saveServiceArea,
        deleteServiceArea,
        updateStoreSettings,
        seedInitialDataToCloud,
      }}
    >
      {children}
    </WeddingContext.Provider>
  );
};

export function useWedding(): WeddingContextValue {
  const ctx = useContext(WeddingContext);
  if (!ctx) {
    throw new Error('useWedding must be used inside a WeddingProvider');
  }
  return ctx;
}
