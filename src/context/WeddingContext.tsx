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
  GalleryItem,
  InspirationArticle,
  Product,
  Promo,
  ServiceArea,
  StoreSettings,
  Testimonial,
  UserWorkspaceDoc,
  WeddingPackage,
  WeddingPlanData,
} from '../types';
import { deleteStorageUrls, hashPasswordHex } from '../utils/imageUtils';

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
  field: 'wishlist' | 'cart' | 'budget' | 'planner' | 'meta' | 'inquiries'
): string {
  const safeUid = (userId || 'guest').replace(/[^a-zA-Z0-9_-]/g, '_');
  return `istafa_u_${safeUid}_${field}_v2`;
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
  isSyncing: boolean;
  toastMessage: string | null;
  showToast: (msg: string) => void;
  // Wishlist operations (localStorage)
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
  syncPlannerToBudget: () => void;
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
  const [isPreviewAdminUnlocked, setIsPreviewAdminUnlocked] = useState<boolean>(false);
  const [adminAuthRecord, setAdminAuthRecord] = useState<AdminCredentialsRecord>(() =>
    loadFromLocal<AdminCredentialsRecord>(STORAGE_KEYS.adminAuthHash, {
      username: 'admin',
      passwordHash: '',
    })
  );
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
  const [inquiries, setInquiries] = useState<ConsultationInquiry[]>(() =>
    loadFromLocal<ConsultationInquiry[]>(STORAGE_KEYS.inquiries, [
      {
        id: 'inq-sample-1',
        userId: 'system-sample',
        coupleName: 'Nadia & Reza',
        weddingLocation: 'Glasshouse Bogor',
        type: 'planner',
        customerDate: '2026-11-14',
        guestCount: 300,
        itemsSummary: [
          'Dekorasi Elegant Gold — Royal Glasshouse',
          'Undangan Cetak Fine Art (300 Pcs)',
          'Souvenir Eau de Parfum Artisan (300 Pcs)',
        ],
        totalEstimate: 48250000,
        createdAt: '2026-10-03',
      },
    ])
  );

  const cartWeddingDate = userMeta.cartWeddingDate;
  const cartGuestCount = userMeta.cartGuestCount;
  const userCoupleName = userMeta.coupleName || weddingPlan.coupleName || '';
  const userWeddingLocation = userMeta.weddingLocation || weddingPlan.weddingLocation || '';

  // Helper to persist user workspace to Firestore when authenticated
  const persistWorkspaceToCloud = async (
    uid: string,
    nextCart: ConsultationCartItem[],
    nextWishlist: string[],
    nextPlan: WeddingPlanData,
    nextBudget: BudgetAllocation,
    nextMeta: UserMetaState
  ) => {
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
      // Scoped localStorage remains primary immediate store if offline
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

    setWishlistIds(loadedWishlist);
    setCartItems(loadedCart);
    setUserMeta(loadedMeta);
    setBudgetAllocation(loadedBudget);
    setWeddingPlan(loadedPlan);
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

    setCartItems((prev) => {
      const existingIndex = prev.findIndex((i) => i.productId === product.id);
      let next: ConsultationCartItem[];
      if (existingIndex >= 0) {
        next = prev.map((item, idx) =>
          idx === existingIndex
            ? {
                ...item,
                product,
                quantity: item.quantity + defaultQty,
                selectedVariant: selectedVariant || item.selectedVariant,
                selectedSize: selectedSize || item.selectedSize,
              }
            : item
        );
      } else {
        next = [
          ...prev,
          {
            productId: product.id,
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
    setCartItems((prev) => {
      const next = prev.map((item) =>
        item.productId === productId ? { ...item, quantity } : item
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
      coupleName: inquiry.coupleName || weddingPlan.coupleName || '',
      weddingLocation: inquiry.weddingLocation || weddingPlan.weddingLocation || '',
      createdAt: new Date().toISOString().slice(0, 10),
    };
    setInquiries((prev) => {
      const next = [newRecord, ...prev].slice(0, 100);
      saveToLocal(STORAGE_KEYS.inquiries, next);
      return next;
    });

    if (user?.uid) {
      setDoc(doc(db, 'inquiries', inquiryId), {
        userId: user.uid,
        coupleName: (newRecord.coupleName || '').slice(0, 120),
        weddingDate: (newRecord.weddingDate || '').slice(0, 40),
        weddingLocation: (newRecord.weddingLocation || '').slice(0, 200),
        weddingTheme: (newRecord.weddingTheme || '').slice(0, 80),
        guestScale: (newRecord.guestScale || '').slice(0, 80),
        estimatedTotal: Math.max(0, Number(newRecord.estimatedTotal) || 0),
        itemsSummary: (newRecord.itemsSummary || []).slice(0, 40).map((s) => s.slice(0, 200)),
        customNotes: (newRecord.customNotes || '').slice(0, 1000),
        status: 'Baru',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }).catch((err) => {
        console.warn('Local inquiry record fallback:', err);
      });
    }
  };

  // ===========================================================================
  // Authentication & Firestore Real-Time Listeners
  // ===========================================================================
  const isCloudAdmin = Boolean(
    user && user.emailVerified && user.email === 'ahhidayat953@gmail.com'
  );

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!authReady) return;

    const settingsRef = doc(db, 'settings', 'main');
    const unsubSettings = onSnapshot(
      settingsRef,
      (snap) => {
        if (snap.exists()) {
          const rawData = snap.data() as StoreSettings;
          const upgraded: StoreSettings = {
            ...rawData,
            id: snap.id,
            businessName:
              rawData.businessName === 'Aurelia Wedding Atelier'
                ? 'ISTAFA Wedding'
                : rawData.businessName,
            logoText:
              rawData.logoText === 'Aurelia Atelier'
                ? 'ISTAFA Wedding'
                : rawData.logoText,
            whatsappNumber:
              rawData.whatsappNumber === '6281288997766'
                ? '6282123376933'
                : rawData.whatsappNumber,
          };
          setSettings(upgraded);
          saveToLocal(STORAGE_KEYS.settings, upgraded);
        }
      },
      (err) => console.warn('Settings listener info:', err)
    );

    const unsubCategories = onSnapshot(
      query(collection(db, 'categories'), where('visibility', '==', 'public')),
      (snap) => {
        if (!snap.empty) {
          const cloudCats = snap.docs.map((d) => ({ ...(d.data() as Category), id: d.id }));
          const missingServiceCats = INITIAL_CATEGORIES.filter(
            (initCat) =>
              [
                'cat-wo',
                'cat-sanggar',
                'cat-attire',
                'cat-entertainment',
                'cat-mc',
                'cat-parkir',
              ].includes(initCat.id) &&
              !cloudCats.some((c) => c.id === initCat.id)
          );
          const mergedCats = [...cloudCats, ...missingServiceCats]
            .map((c) =>
              c.id === 'cat-makeup' && c.name === 'Makeup'
                ? {
                    ...c,
                    name: 'MUA — Make Up Artist',
                    description:
                      'Layanan rias pengantin profesional, hairdo/hijab styling, touch up, makeup keluarga & pendampingan.',
                  }
                : c
            )
            .sort((a, b) => a.sortOrder - b.sortOrder);
          setCategories(mergedCats);
          saveToLocal(STORAGE_KEYS.categories, mergedCats);
        }
      },
      (err) => console.warn('Categories listener info:', err)
    );

    const unsubProducts = onSnapshot(
      query(collection(db, 'products'), where('visibility', '==', 'public')),
      (snap) => {
        if (!snap.empty) {
          const cloudProds = snap.docs.map((d) => ({ ...(d.data() as Product), id: d.id }));
          const missingServiceProds = INITIAL_PRODUCTS.filter(
            (initProd) =>
              [
                'prod-wo-wedding-organizer',
                'prod-tim-sanggar-pertunjukan',
                'prod-tim-attire-pendampingan',
                'prod-team-entertainment',
                'prod-team-mc',
                'prod-team-dokumentasi',
                'prod-team-parkir-security',
              ].includes(initProd.id) && !cloudProds.some((p) => p.id === initProd.id)
          );
          const mergedProds = [...cloudProds, ...missingServiceProds].map((p) => {
            if (p.id === 'prod-makeup-pengantin-flawless' && p.category === 'Makeup') {
              const initMua = INITIAL_PRODUCTS.find(
                (ip) => ip.id === 'prod-makeup-pengantin-flawless'
              );
              return initMua ? { ...initMua, price: p.price } : p;
            }
            return p;
          });
          setProducts(mergedProds);
          saveToLocal(STORAGE_KEYS.products, mergedProds);
        }
      },
      (err) => console.warn('Products listener info:', err)
    );

    const unsubPackages = onSnapshot(
      query(collection(db, 'packages'), where('visibility', '==', 'public')),
      (snap) => {
        if (!snap.empty) {
          const cloudPkgs = snap.docs.map((d) => ({ ...(d.data() as WeddingPackage), id: d.id }));
          const missingPkgs = INITIAL_PACKAGES.filter(
            (initPkg) => !cloudPkgs.some((cp) => cp.id === initPkg.id)
          );
          const list = [...cloudPkgs, ...missingPkgs];
          setPackages(list);
          saveToLocal(STORAGE_KEYS.packages, list);
        }
      },
      (err) => console.warn('Packages listener info:', err)
    );

    const unsubGallery = onSnapshot(
      query(collection(db, 'gallery'), where('visibility', '==', 'public')),
      (snap) => {
        if (!snap.empty) {
          const list = snap.docs.map((d) => ({ ...(d.data() as GalleryItem), id: d.id }));
          setGallery(list);
          saveToLocal(STORAGE_KEYS.gallery, list);
        }
      },
      (err) => console.warn('Gallery listener info:', err)
    );

    const unsubTestimonials = onSnapshot(
      query(collection(db, 'testimonials'), where('visibility', '==', 'public')),
      (snap) => {
        if (!snap.empty) {
          const list = snap.docs.map((d) => ({ ...(d.data() as Testimonial), id: d.id }));
          setTestimonials(list);
          saveToLocal(STORAGE_KEYS.testimonials, list);
        }
      },
      (err) => console.warn('Testimonials listener info:', err)
    );

    const unsubPromos = onSnapshot(
      query(collection(db, 'promos'), where('visibility', '==', 'public')),
      (snap) => {
        if (!snap.empty) {
          const list = snap.docs.map((d) => ({ ...(d.data() as Promo), id: d.id }));
          setPromos(list);
          saveToLocal(STORAGE_KEYS.promos, list);
        }
      },
      (err) => console.warn('Promos listener info:', err)
    );

    const unsubArticles = onSnapshot(
      query(collection(db, 'articles'), where('visibility', '==', 'public')),
      (snap) => {
        if (!snap.empty) {
          const list = snap.docs.map((d) => ({ ...(d.data() as InspirationArticle), id: d.id }));
          setArticles(list);
          saveToLocal(STORAGE_KEYS.articles, list);
        }
      },
      (err) => console.warn('Articles listener info:', err)
    );

    const unsubCalendar = onSnapshot(
      query(collection(db, 'calendar'), where('visibility', '==', 'public')),
      (snap) => {
        if (!snap.empty) {
          const list = snap.docs.map((d) => d.data() as CalendarPublicEntry);
          setCalendarPublic(list);
          saveToLocal(STORAGE_KEYS.calendarPublic, list);
        }
      },
      (err) => console.warn('Calendar listener info:', err)
    );

    const unsubServiceAreas = onSnapshot(
      query(collection(db, 'serviceAreas'), where('visibility', '==', 'public')),
      (snap) => {
        if (!snap.empty) {
          const list = snap.docs.map((d) => ({ ...(d.data() as ServiceArea), id: d.id }));
          setServiceAreas(list);
          saveToLocal(STORAGE_KEYS.serviceAreas, list);
        }
      },
      (err) => console.warn('ServiceAreas listener info:', err)
    );

    return () => {
      unsubSettings();
      unsubCategories();
      unsubProducts();
      unsubPackages();
      unsubGallery();
      unsubTestimonials();
      unsubPromos();
      unsubArticles();
      unsubCalendar();
      unsubServiceAreas();
    };
  }, [authReady, user]);

  // Seed initial data if cloud admin logs in and products collection is empty, or auto-sync missing Layanan Wedding
  useEffect(() => {
    if (!authReady || !isCloudAdmin || !user) return;
    const adminUid = user.uid;
    let mounted = true;

    async function checkAndSeed() {
      try {
        const snap = await getDocs(
          query(collection(db, 'products'), where('visibility', '==', 'public'))
        );
        if (snap.empty && mounted) {
          await seedInitialDataToCloudInternal(adminUid);
        } else if (mounted) {
          const existingIds = new Set(snap.docs.map((d) => d.id));
          const serviceIds = [
            'prod-makeup-pengantin-flawless',
            'prod-wo-wedding-organizer',
            'prod-tim-sanggar-pertunjukan',
            'prod-tim-attire-pendampingan',
            'prod-team-entertainment',
            'prod-team-mc',
            'prod-team-dokumentasi',
            'prod-team-parkir-security',
          ];
          const missingProds = INITIAL_PRODUCTS.filter(
            (p) => serviceIds.includes(p.id) && !existingIds.has(p.id)
          );
          if (missingProds.length > 0) {
            const now = serverTimestamp();
            const serviceCats = INITIAL_CATEGORIES.filter((c) =>
              [
                'cat-makeup',
                'cat-wo',
                'cat-sanggar',
                'cat-attire',
                'cat-entertainment',
                'cat-mc',
                'cat-parkir',
              ].includes(c.id)
            );
            for (const cat of serviceCats) {
              await setDoc(doc(db, 'categories', cat.id), {
                name: cat.name.slice(0, 80),
                slug: cat.slug.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 80),
                description: cat.description.slice(0, 300),
                iconName: cat.iconName.slice(0, 40),
                coverImageUrl: cat.coverImageUrl.slice(0, 800000),
                sortOrder: Number(cat.sortOrder) || 1,
                visibility: 'public',
                authorUid: adminUid,
                createdAt: now,
                updatedAt: now,
              });
            }
            for (const prod of INITIAL_PRODUCTS.filter((p) =>
              serviceIds.includes(p.id)
            )) {
              await setDoc(doc(db, 'products', prod.id), {
                name: prod.name.slice(0, 150),
                category: prod.category.slice(0, 80),
                price: Math.max(0, Number(prod.price) || 0),
                originalPrice: Math.max(0, Number(prod.originalPrice) || 0),
                priceLabel: (prod.priceLabel || 'Mulai dari').slice(0, 80),
                shortDescription: prod.shortDescription.slice(0, 300),
                description: prod.description.slice(0, 4000),
                images: prod.images.slice(0, 20).map((img, idx) => ({
                  id: (img.id || `img-${idx}`).slice(0, 128),
                  url: img.url.slice(0, 800000),
                  isPrimary: Boolean(img.isPrimary),
                  caption: (img.caption || '').slice(0, 300),
                })),
                variants: (prod.variants || []).slice(0, 25).map((v) => v.slice(0, 120)),
                sizes: (prod.sizes || []).slice(0, 20).map((s) => s.slice(0, 80)),
                unit: (prod.unit || 'Paket').slice(0, 40),
                stockStatus: prod.stockStatus || 'Tersedia',
                promoLabel: (prod.promoLabel || '').slice(0, 80),
                isPromo: Boolean(prod.isPromo),
                inclusions: (prod.inclusions || []).slice(0, 30).map((inc) => inc.slice(0, 200)),
                isAvailable: prod.isAvailable !== false,
                isFeatured: Boolean(prod.isFeatured),
                isNew: Boolean(prod.isNew),
                isActive: prod.isActive !== false,
                popularityScore: Number(prod.popularityScore) || 85,
                visibility: 'public',
                authorUid: adminUid,
                createdAt: now,
                updatedAt: now,
              });
            }
          }
        }
      } catch (err) {
        console.warn('Initial check seed skipped:', err);
      }
    }

    checkAndSeed();
    return () => {
      mounted = false;
    };
  }, [authReady, isCloudAdmin, user]);

  async function seedInitialDataToCloudInternal(uid: string) {
    setIsSyncing(true);
    try {
      const now = serverTimestamp();

      await setDoc(doc(db, 'settings', 'main'), {
        businessName: settings.businessName.slice(0, 120),
        tagline: settings.tagline.slice(0, 250),
        whatsappNumber: settings.whatsappNumber.replace(/[^0-9+]/g, '').slice(0, 25),
        email: settings.email.slice(0, 120),
        address: settings.address.slice(0, 300),
        instagram: settings.instagram.slice(0, 100),
        tiktok: (settings.tiktok || '').slice(0, 100),
        heroTitle: settings.heroTitle.slice(0, 200),
        heroSubtitle: settings.heroSubtitle.slice(0, 400),
        heroImageUrl: settings.heroImageUrl.slice(0, 800000),
        logoText: settings.logoText.slice(0, 60),
        visibility: 'public',
        authorUid: uid,
        createdAt: now,
        updatedAt: now,
      });

      for (const cat of categories) {
        await setDoc(doc(db, 'categories', cat.id), {
          name: cat.name.slice(0, 80),
          slug: cat.slug.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 80),
          description: cat.description.slice(0, 300),
          iconName: cat.iconName.slice(0, 40),
          coverImageUrl: cat.coverImageUrl.slice(0, 800000),
          sortOrder: Number(cat.sortOrder) || 1,
          visibility: 'public',
          authorUid: uid,
          createdAt: now,
          updatedAt: now,
        });
      }

      for (const prod of products) {
        await setDoc(doc(db, 'products', prod.id), {
          name: prod.name.slice(0, 150),
          category: prod.category.slice(0, 80),
          price: Math.max(0, Number(prod.price) || 0),
          originalPrice: Math.max(0, Number(prod.originalPrice) || 0),
          priceLabel: (prod.priceLabel || 'Mulai dari').slice(0, 80),
          shortDescription: prod.shortDescription.slice(0, 300),
          description: prod.description.slice(0, 4000),
          images: prod.images.slice(0, 20).map((img, idx) => ({
            id: (img.id || `img-${idx}`).slice(0, 128),
            url: img.url.slice(0, 800000),
            isPrimary: Boolean(img.isPrimary),
            caption: (img.caption || '').slice(0, 300),
          })),
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

      for (const pkg of packages) {
        await setDoc(doc(db, 'packages', pkg.id), {
          name: pkg.name.slice(0, 150),
          tier: pkg.tier.slice(0, 60),
          price: Math.max(0, Number(pkg.price) || 0),
          originalPrice: Math.max(0, Number(pkg.originalPrice) || 0),
          guestCapacity: pkg.guestCapacity.slice(0, 80),
          description: pkg.description.slice(0, 2000),
          inclusions: pkg.inclusions.slice(0, 25).map((inc) => inc.slice(0, 200)),
          images: pkg.images.slice(0, 20).map((img, idx) => ({
            id: (img.id || `pkg-img-${idx}`).slice(0, 128),
            url: img.url.slice(0, 800000),
            isPrimary: Boolean(img.isPrimary),
            caption: (img.caption || '').slice(0, 300),
          })),
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

      for (const item of gallery) {
        await setDoc(doc(db, 'gallery', item.id), {
          title: item.title.slice(0, 150),
          category: item.category.slice(0, 80),
          imageUrl: item.imageUrl.slice(0, 800000),
          caption: item.caption.slice(0, 400),
          location: (item.location || '').slice(0, 120),
          theme: (item.theme || '').slice(0, 120),
          images: (item.images || []).slice(0, 20).map((img, idx) => ({
            id: (img.id || `gal-img-${idx}`).slice(0, 128),
            url: img.url.slice(0, 800000),
            isPrimary: Boolean(img.isPrimary),
            caption: (img.caption || '').slice(0, 300),
          })),
          aspectType: item.aspectType || 'landscape',
          visibility: 'public',
          authorUid: uid,
          createdAt: now,
          updatedAt: now,
        });
      }

      showToast('Data katalog berhasil disinkronkan ke Cloud Database.');
    } catch (error) {
      console.error('Error seeding data:', error);
    } finally {
      setIsSyncing(false);
    }
  }

  const seedInitialDataToCloud = async () => {
    setSettings(INITIAL_SETTINGS);
    setCategories(INITIAL_CATEGORIES);
    setProducts(INITIAL_PRODUCTS);
    setPackages(INITIAL_PACKAGES);
    setGallery(INITIAL_GALLERY);
    setTestimonials(INITIAL_TESTIMONIALS);
    setPromos(INITIAL_PROMOS);
    setArticles(INITIAL_ARTICLES);
    setCalendarPublic(INITIAL_CALENDAR_PUBLIC);
    setCalendarPrivate(INITIAL_CALENDAR_PRIVATE);
    setServiceAreas(INITIAL_SERVICE_AREAS);

    saveToLocal(STORAGE_KEYS.settings, INITIAL_SETTINGS);
    saveToLocal(STORAGE_KEYS.categories, INITIAL_CATEGORIES);
    saveToLocal(STORAGE_KEYS.products, INITIAL_PRODUCTS);
    saveToLocal(STORAGE_KEYS.packages, INITIAL_PACKAGES);
    saveToLocal(STORAGE_KEYS.gallery, INITIAL_GALLERY);
    saveToLocal(STORAGE_KEYS.testimonials, INITIAL_TESTIMONIALS);
    saveToLocal(STORAGE_KEYS.promos, INITIAL_PROMOS);
    saveToLocal(STORAGE_KEYS.articles, INITIAL_ARTICLES);
    saveToLocal(STORAGE_KEYS.calendarPublic, INITIAL_CALENDAR_PUBLIC);
    saveToLocal(STORAGE_KEYS.calendarPrivate, INITIAL_CALENDAR_PRIVATE);
    saveToLocal(STORAGE_KEYS.serviceAreas, INITIAL_SERVICE_AREAS);

    if (isCloudAdmin && user) {
      await seedInitialDataToCloudInternal(user.uid);
    } else {
      showToast('Data katalog lengkap berhasil dimuat ulang.');
    }
  };

  // ===========================================================================
  // Secure Admin Login (Hashed password verification + Firebase Auth support)
  // ===========================================================================
  const loginWithCredentials = async (
    usernameOrEmail: string,
    passwordInput: string
  ): Promise<boolean> => {
    const cleanInput = usernameOrEmail.trim().toLowerCase();
    const expectedUser = (adminAuthRecord.username || 'admin').trim().toLowerCase();

    const isUsernameMatch =
      cleanInput === expectedUser ||
      cleanInput === 'admin@istafawedding.id' ||
      cleanInput === 'istafa' ||
      cleanInput === 'ahhidayat953@gmail.com';

    const inputHash = await hashPasswordHex(passwordInput);
    const defaultHash = await hashPasswordHex('istafa123');
    const targetHash = adminAuthRecord.passwordHash || defaultHash;

    if (isUsernameMatch && inputHash === targetHash) {
      setIsPreviewAdminUnlocked(true);
      saveToLocal(STORAGE_KEYS.adminSession, true);
      showToast('Selamat datang di Dashboard Admin ISTAFA Wedding.');
      return true;
    }

    if (cleanInput.includes('@')) {
      try {
        await signInWithEmailAndPassword(auth, cleanInput, passwordInput);
        setIsPreviewAdminUnlocked(true);
        saveToLocal(STORAGE_KEYS.adminSession, true);
        showToast('Berhasil masuk melalui Firebase Email/Password.');
        return true;
      } catch {
        // Invalid credentials
      }
    }

    return false;
  };

  const updateAdminCredentials = async (newUsername: string, newPassword?: string) => {
    const cleanUser = newUsername.trim() || 'admin';
    const nextHash = newPassword?.trim()
      ? await hashPasswordHex(newPassword.trim())
      : adminAuthRecord.passwordHash || (await hashPasswordHex('istafa123'));

    const updated: AdminCredentialsRecord = {
      username: cleanUser,
      passwordHash: nextHash,
    };
    setAdminAuthRecord(updated);
    saveToLocal(STORAGE_KEYS.adminAuthHash, updated);
    showToast('Kredensial Admin berhasil diperbarui dengan enkripsi SHA-256.');
  };

  const loginWithGoogle = async () => {
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      setIsPreviewAdminUnlocked(true);
      saveToLocal(STORAGE_KEYS.adminSession, true);
      showToast(`Berhasil masuk sebagai Admin (${cred.user.displayName || cred.user.email || 'Google'}).`);
    } catch (error) {
      console.warn('Popup login notice:', error);
    }
  };

  const loginCustomerWithGoogle = async () => {
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      showToast(
        `Selamat datang, ${cred.user.displayName || cred.user.email || 'Calon Pengantin'}! Data rencana pernikahan Anda kini tersinkronisasi aman di akun Anda.`
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
    try {
      await signOut(auth);
    } catch (err) {
      console.warn('Sign out warning:', err);
    }
    setIsPreviewAdminUnlocked(false);
    saveToLocal(STORAGE_KEYS.adminSession, false);
    showToast('Anda telah keluar dari sesi Admin.');
  };

  const unlockPreviewAdmin = () => {
    setIsPreviewAdminUnlocked(true);
    saveToLocal(STORAGE_KEYS.adminSession, true);
    showToast('Mode Kelola Admin Aktif.');
  };

  // ===========================================================================
  // 1. Product CRUD
  // ===========================================================================
  const saveProduct = async (
    input: Omit<Product, 'id' | 'visibility' | 'authorUid'> & { id?: string }
  ) => {
    setIsSyncing(true);
    const cleanId = (input.id || `prod-${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '-');

    const normalizedImages = (input.images || []).slice(0, 20).map((img, index) => ({
      id: (img.id || `img-${Date.now()}-${index}`).replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128),
      url: img.url.slice(0, 800000),
      isPrimary: Boolean(img.isPrimary),
      caption: (img.caption || `Foto ${index + 1}`).slice(0, 300),
    }));
    if (normalizedImages.length > 0 && !normalizedImages.some((i) => i.isPrimary)) {
      normalizedImages[0].isPrimary = true;
    }

    const existingProd = products.find((p) => p.id === cleanId);
    const localRecord: Product = {
      id: cleanId,
      name: input.name.trim().slice(0, 150),
      category: input.category.trim().slice(0, 80),
      price: Math.max(0, Number(input.price) || 0),
      originalPrice: input.originalPrice ? Math.max(0, Number(input.originalPrice)) : undefined,
      priceLabel: (input.priceLabel || 'Mulai dari').trim().slice(0, 80),
      shortDescription: input.shortDescription.trim().slice(0, 300),
      description: input.description.trim().slice(0, 4000),
      images: normalizedImages,
      variants: (input.variants || []).filter((v) => v.trim().length > 0).slice(0, 15).map((v) => v.trim().slice(0, 120)),
      sizes: (input.sizes || []).filter((s) => s.trim().length > 0).slice(0, 15).map((s) => s.trim().slice(0, 80)),
      inclusions: (input.inclusions || []).filter((i) => i.trim().length > 0).slice(0, 20).map((i) => i.trim().slice(0, 200)),
      unit: (input.unit || 'Paket').trim().slice(0, 40),
      stockStatus: (input.stockStatus || (input.isAvailable ? 'Tersedia' : 'Habis')).trim().slice(0, 60),
      promoLabel: (input.promoLabel || '').trim().slice(0, 80),
      isPromo: Boolean(input.isPromo),
      isAvailable: Boolean(input.isAvailable),
      isFeatured: Boolean(input.isFeatured),
      isNew: Boolean(input.isNew),
      isActive: input.isActive !== false,
      popularityScore: Number(input.popularityScore) || existingProd?.popularityScore || 88,
      visibility: 'public',
      authorUid: user?.uid || 'local-admin',
    };

    const updatedList = existingProd
      ? products.map((p) => (p.id === cleanId ? localRecord : p))
      : [localRecord, ...products];
    setProducts(updatedList);
    saveToLocal(STORAGE_KEYS.products, updatedList);

    if (isCloudAdmin && user) {
      const path = `products/${cleanId}`;
      try {
        const now = serverTimestamp();
        await setDoc(doc(db, 'products', cleanId), {
          name: localRecord.name,
          category: localRecord.category,
          price: localRecord.price,
          originalPrice: localRecord.originalPrice || 0,
          priceLabel: localRecord.priceLabel,
          shortDescription: localRecord.shortDescription,
          description: localRecord.description,
          images: localRecord.images,
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
          authorUid:
            existingProd?.authorUid &&
            existingProd.authorUid !== 'system-seed' &&
            existingProd.authorUid !== 'local-admin'
              ? existingProd.authorUid
              : user.uid,
          createdAt: existingProd?.createdAt ? existingProd.createdAt : now,
          updatedAt: now,
        });
      } catch (error) {
        setIsSyncing(false);
        handleFirestoreError(error, OperationType.WRITE, path);
      }
    }

    setIsSyncing(false);
    showToast(`Produk "${localRecord.name}" (${localRecord.images.length} foto) berhasil disimpan.`);
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

    if (targetProd && targetProd.images?.length > 0) {
      await deleteStorageUrls(targetProd.images.map((img) => img.url));
    }

    if (isCloudAdmin && user) {
      const path = `products/${productId}`;
      try {
        await deleteDoc(doc(db, 'products', productId));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path);
      }
    }
    showToast('Produk berhasil dihapus.');
  };

  // ===========================================================================
  // 2. Category CRUD
  // ===========================================================================
  const saveCategory = async (
    input: Omit<Category, 'id' | 'visibility' | 'authorUid'> & { id?: string }
  ) => {
    const cleanId = (input.id || `cat-${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '-');
    const existingCat = categories.find((c) => c.id === cleanId);
    const localRecord: Category = {
      id: cleanId,
      name: input.name.trim().slice(0, 80),
      slug: (input.slug || input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'))
        .replace(/[^a-zA-Z0-9_-]/g, '-')
        .slice(0, 80),
      description: input.description.trim().slice(0, 300),
      iconName: (input.iconName || 'Sparkles').slice(0, 40),
      coverImageUrl: input.coverImageUrl.slice(0, 800000),
      sortOrder: Math.max(0, Math.min(1000, Number(input.sortOrder) || categories.length + 1)),
      visibility: 'public',
      authorUid: user?.uid || 'local-admin',
    };

    const updatedList = existingCat
      ? categories.map((c) => (c.id === cleanId ? localRecord : c))
      : [...categories, localRecord].sort((a, b) => a.sortOrder - b.sortOrder);
    setCategories(updatedList);
    saveToLocal(STORAGE_KEYS.categories, updatedList);

    if (isCloudAdmin && user) {
      const path = `categories/${cleanId}`;
      try {
        const now = serverTimestamp();
        await setDoc(doc(db, 'categories', cleanId), {
          name: localRecord.name,
          slug: localRecord.slug,
          description: localRecord.description,
          iconName: localRecord.iconName,
          coverImageUrl: localRecord.coverImageUrl,
          sortOrder: localRecord.sortOrder,
          visibility: 'public',
          authorUid:
            existingCat?.authorUid &&
            existingCat.authorUid !== 'system-seed' &&
            existingCat.authorUid !== 'local-admin'
              ? existingCat.authorUid
              : user.uid,
          createdAt: existingCat?.createdAt ? existingCat.createdAt : now,
          updatedAt: now,
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
      }
    }
    showToast(`Kategori "${localRecord.name}" berhasil disimpan.`);
  };

  const deleteCategory = async (categoryId: string) => {
    const updatedList = categories.filter((c) => c.id !== categoryId);
    setCategories(updatedList);
    saveToLocal(STORAGE_KEYS.categories, updatedList);

    if (isCloudAdmin && user) {
      const path = `categories/${categoryId}`;
      try {
        await deleteDoc(doc(db, 'categories', categoryId));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path);
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
    const normalizedImages = (input.images || []).slice(0, 20).map((img, index) => ({
      id: (img.id || `pkg-img-${Date.now()}-${index}`).replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128),
      url: img.url.slice(0, 800000),
      isPrimary: Boolean(img.isPrimary),
      caption: (img.caption || `Foto Paket ${index + 1}`).slice(0, 300),
    }));
    if (normalizedImages.length > 0 && !normalizedImages.some((i) => i.isPrimary)) {
      normalizedImages[0].isPrimary = true;
    }

    const existingPkg = packages.find((p) => p.id === cleanId);
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
      images: normalizedImages,
      isPopular: Boolean(input.isPopular),
      isPromo: Boolean(input.isPromo),
      promoLabel: (input.promoLabel || '').trim().slice(0, 80),
      isActive: input.isActive !== false,
      visibility: 'public',
      authorUid: user?.uid || 'local-admin',
    };

    const updatedList = existingPkg
      ? packages.map((p) => (p.id === cleanId ? localRecord : p))
      : [...packages, localRecord];
    setPackages(updatedList);
    saveToLocal(STORAGE_KEYS.packages, updatedList);

    if (isCloudAdmin && user) {
      const path = `packages/${cleanId}`;
      try {
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
          authorUid:
            existingPkg?.authorUid &&
            existingPkg.authorUid !== 'system-seed' &&
            existingPkg.authorUid !== 'local-admin'
              ? existingPkg.authorUid
              : user.uid,
          createdAt: existingPkg?.createdAt ? existingPkg.createdAt : now,
          updatedAt: now,
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
      }
    }
    showToast(`Paket "${localRecord.name}" berhasil disimpan.`);
  };

  const deletePackage = async (packageId: string) => {
    const targetPkg = packages.find((p) => p.id === packageId);
    const updatedList = packages.filter((p) => p.id !== packageId);
    setPackages(updatedList);
    saveToLocal(STORAGE_KEYS.packages, updatedList);

    if (targetPkg && targetPkg.images?.length > 0) {
      await deleteStorageUrls(targetPkg.images.map((img) => img.url));
    }

    if (isCloudAdmin && user) {
      const path = `packages/${packageId}`;
      try {
        await deleteDoc(doc(db, 'packages', packageId));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path);
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

    const normalizedImages = (input.images || []).slice(0, 20).map((img, idx) => ({
      id: (img.id || `g-img-${Date.now()}-${idx}`).replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128),
      url: img.url.slice(0, 800000),
      isPrimary: Boolean(img.isPrimary),
      caption: (img.caption || input.title).slice(0, 300),
    }));

    const primaryUrl =
      normalizedImages.find((i) => i.isPrimary)?.url ||
      normalizedImages[0]?.url ||
      input.imageUrl;

    const existingItem = gallery.find((g) => g.id === cleanId);
    const localRecord: GalleryItem = {
      id: cleanId,
      title: input.title.trim().slice(0, 150),
      category: input.category.trim().slice(0, 80),
      imageUrl: primaryUrl.slice(0, 800000),
      caption: (input.caption || input.title).trim().slice(0, 400),
      location: (input.location || '').trim().slice(0, 120),
      theme: (input.theme || '').trim().slice(0, 120),
      images:
        normalizedImages.length > 0
          ? normalizedImages
          : [
              {
                id: `g-primary-${cleanId}`,
                url: primaryUrl.slice(0, 800000),
                isPrimary: true,
                caption: input.title.trim().slice(0, 300),
              },
            ],
      aspectType: input.aspectType || 'landscape',
      visibility: 'public',
      authorUid: user?.uid || 'local-admin',
    };

    const updatedList = existingItem
      ? gallery.map((g) => (g.id === cleanId ? localRecord : g))
      : [localRecord, ...gallery];
    setGallery(updatedList);
    saveToLocal(STORAGE_KEYS.gallery, updatedList);

    if (isCloudAdmin && user) {
      const path = `gallery/${cleanId}`;
      try {
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
          authorUid:
            existingItem?.authorUid &&
            existingItem.authorUid !== 'system-seed' &&
            existingItem.authorUid !== 'local-admin'
              ? existingItem.authorUid
              : user.uid,
          createdAt: existingItem?.createdAt ? existingItem.createdAt : now,
          updatedAt: now,
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
      }
    }
    showToast(`Proyek galeri "${localRecord.title}" berhasil disimpan.`);
  };

  const deleteGalleryItem = async (galleryId: string) => {
    const targetItem = gallery.find((g) => g.id === galleryId);
    const updatedList = gallery.filter((g) => g.id !== galleryId);
    setGallery(updatedList);
    saveToLocal(STORAGE_KEYS.gallery, updatedList);

    if (targetItem) {
      const urls = [
        targetItem.imageUrl,
        ...(targetItem.images || []).map((img) => img.url),
      ].filter(Boolean);
      await deleteStorageUrls(urls);
    }

    if (isCloudAdmin && user) {
      const path = `gallery/${galleryId}`;
      try {
        await deleteDoc(doc(db, 'gallery', galleryId));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path);
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
    const normalizedImages = (input.images || []).slice(0, 20).map((img, index) => ({
      id: (img.id || `t-img-${Date.now()}-${index}`).replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128),
      url: img.url.slice(0, 800000),
      isPrimary: Boolean(img.isPrimary),
      caption: (img.caption || `Dokumentasi ${input.coupleName} #${index + 1}`).slice(0, 300),
    }));
    if (normalizedImages.length > 0 && !normalizedImages.some((i) => i.isPrimary)) {
      normalizedImages[0].isPrimary = true;
    }

    const existing = testimonials.find((t) => t.id === cleanId);
    const localRecord: Testimonial = {
      id: cleanId,
      coupleName: input.coupleName.trim().slice(0, 120),
      eventDate: input.eventDate.trim().slice(0, 80),
      venue: input.venue.trim().slice(0, 150),
      packageTaken: input.packageTaken.trim().slice(0, 150),
      rating: Math.max(1, Math.min(5, Number(input.rating) || 5)),
      review: input.review.trim().slice(0, 1500),
      images: normalizedImages,
      visibility: 'public',
      authorUid: user?.uid || 'local-admin',
    };

    const updatedList = existing
      ? testimonials.map((t) => (t.id === cleanId ? localRecord : t))
      : [localRecord, ...testimonials];
    setTestimonials(updatedList);
    saveToLocal(STORAGE_KEYS.testimonials, updatedList);

    if (isCloudAdmin && user) {
      const path = `testimonials/${cleanId}`;
      try {
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
          authorUid:
            existing?.authorUid &&
            existing.authorUid !== 'system-seed' &&
            existing.authorUid !== 'local-admin'
              ? existing.authorUid
              : user.uid,
          createdAt: existing?.createdAt ? existing.createdAt : now,
          updatedAt: now,
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
      }
    }
    showToast(`Testimoni & dokumentasi "${localRecord.coupleName}" berhasil disimpan.`);
  };

  const deleteTestimonial = async (testimonialId: string) => {
    const updatedList = testimonials.filter((t) => t.id !== testimonialId);
    setTestimonials(updatedList);
    saveToLocal(STORAGE_KEYS.testimonials, updatedList);

    if (isCloudAdmin && user) {
      const path = `testimonials/${testimonialId}`;
      try {
        await deleteDoc(doc(db, 'testimonials', testimonialId));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path);
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
    const localRecord: Promo = {
      id: cleanId,
      title: input.title.trim().slice(0, 150),
      description: input.description.trim().slice(0, 1000),
      promoPrice: Math.max(0, Number(input.promoPrice) || 0),
      normalPrice: Math.max(0, Number(input.normalPrice) || 0),
      imageUrl: input.imageUrl.slice(0, 800000),
      startDate: input.startDate.slice(0, 30),
      endDate: input.endDate.slice(0, 30),
      badgeText: (input.badgeText || 'Promo Spesial').trim().slice(0, 60),
      isActive: Boolean(input.isActive),
      visibility: 'public',
      authorUid: user?.uid || 'local-admin',
    };

    const updatedList = existing
      ? promos.map((p) => (p.id === cleanId ? localRecord : p))
      : [localRecord, ...promos];
    setPromos(updatedList);
    saveToLocal(STORAGE_KEYS.promos, updatedList);

    if (isCloudAdmin && user) {
      const path = `promos/${cleanId}`;
      try {
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
          authorUid:
            existing?.authorUid &&
            existing.authorUid !== 'system-seed' &&
            existing.authorUid !== 'local-admin'
              ? existing.authorUid
              : user.uid,
          createdAt: existing?.createdAt ? existing.createdAt : now,
          updatedAt: now,
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
      }
    }
    showToast(`Promo "${localRecord.title}" berhasil disimpan.`);
  };

  const deletePromo = async (promoId: string) => {
    const updatedList = promos.filter((p) => p.id !== promoId);
    setPromos(updatedList);
    saveToLocal(STORAGE_KEYS.promos, updatedList);

    if (isCloudAdmin && user) {
      const path = `promos/${promoId}`;
      try {
        await deleteDoc(doc(db, 'promos', promoId));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path);
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
    const localRecord: InspirationArticle = {
      id: cleanId,
      title: input.title.trim().slice(0, 180),
      category: input.category.trim().slice(0, 80),
      excerpt: input.excerpt.trim().slice(0, 400),
      content: input.content.trim().slice(0, 8000),
      imageUrl: input.imageUrl.slice(0, 800000),
      readTime: (input.readTime || '4 Menit Baca').trim().slice(0, 40),
      publishedDate: (input.publishedDate || 'Oktober 2026').trim().slice(0, 60),
      visibility: 'public',
      authorUid: user?.uid || 'local-admin',
    };

    const updatedList = existing
      ? articles.map((a) => (a.id === cleanId ? localRecord : a))
      : [localRecord, ...articles];
    setArticles(updatedList);
    saveToLocal(STORAGE_KEYS.articles, updatedList);

    if (isCloudAdmin && user) {
      const path = `articles/${cleanId}`;
      try {
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
          authorUid:
            existing?.authorUid &&
            existing.authorUid !== 'system-seed' &&
            existing.authorUid !== 'local-admin'
              ? existing.authorUid
              : user.uid,
          createdAt: existing?.createdAt ? existing.createdAt : now,
          updatedAt: now,
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
      }
    }
    showToast(`Artikel "${localRecord.title}" berhasil disimpan.`);
  };

  const deleteArticle = async (articleId: string) => {
    const updatedList = articles.filter((a) => a.id !== articleId);
    setArticles(updatedList);
    saveToLocal(STORAGE_KEYS.articles, updatedList);

    if (isCloudAdmin && user) {
      const path = `articles/${articleId}`;
      try {
        await deleteDoc(doc(db, 'articles', articleId));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path);
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
      authorUid: user?.uid || 'local-admin',
    };

    const nextPub = existingPub
      ? calendarPublic.map((c) => (c.date === cleanDate ? pubRecord : c))
      : [...calendarPublic, pubRecord].sort((a, b) => a.date.localeCompare(b.date));
    setCalendarPublic(nextPub);
    saveToLocal(STORAGE_KEYS.calendarPublic, nextPub);

    if (clientName !== undefined || privateNote !== undefined) {
      const existingPriv = calendarPrivate.find((c) => c.date === cleanDate);
      const privRecord: CalendarPrivateEntry = {
        date: cleanDate,
        clientName: (clientName || '').trim().slice(0, 150),
        privateNote: (privateNote || '').trim().slice(0, 500),
        authorUid: user?.uid || 'local-admin',
      };
      const nextPriv = existingPriv
        ? calendarPrivate.map((c) => (c.date === cleanDate ? privRecord : c))
        : [...calendarPrivate, privRecord];
      setCalendarPrivate(nextPriv);
      saveToLocal(STORAGE_KEYS.calendarPrivate, nextPriv);
    }

    if (isCloudAdmin && user) {
      const pubPath = `calendar/${cleanDate}`;
      try {
        const now = serverTimestamp();
        await setDoc(doc(db, 'calendar', cleanDate), {
          date: pubRecord.date,
          status: pubRecord.status,
          publicNote: pubRecord.publicNote,
          visibility: 'public',
          authorUid: user.uid,
          createdAt: existingPub?.createdAt ? existingPub.createdAt : now,
          updatedAt: now,
        });
        if (clientName || privateNote) {
          await setDoc(doc(db, 'calendarPrivate', cleanDate), {
            date: cleanDate,
            clientName: (clientName || '').trim().slice(0, 150),
            privateNote: (privateNote || '').trim().slice(0, 500),
            authorUid: user.uid,
            createdAt: now,
            updatedAt: now,
          });
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, pubPath);
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

    if (isCloudAdmin && user) {
      try {
        await deleteDoc(doc(db, 'calendar', date));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `calendar/${date}`);
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
    const localRecord: ServiceArea = {
      id: cleanId,
      city: input.city.trim().slice(0, 100),
      province: input.province.trim().slice(0, 100),
      description: input.description.trim().slice(0, 300),
      isPrimary: Boolean(input.isPrimary),
      visibility: 'public',
      authorUid: user?.uid || 'local-admin',
    };

    const updatedList = existing
      ? serviceAreas.map((a) => (a.id === cleanId ? localRecord : a))
      : [...serviceAreas, localRecord];
    setServiceAreas(updatedList);
    saveToLocal(STORAGE_KEYS.serviceAreas, updatedList);

    if (isCloudAdmin && user) {
      const path = `serviceAreas/${cleanId}`;
      try {
        const now = serverTimestamp();
        await setDoc(doc(db, 'serviceAreas', cleanId), {
          city: localRecord.city,
          province: localRecord.province,
          description: localRecord.description,
          isPrimary: localRecord.isPrimary,
          visibility: 'public',
          authorUid:
            existing?.authorUid &&
            existing.authorUid !== 'system-seed' &&
            existing.authorUid !== 'local-admin'
              ? existing.authorUid
              : user.uid,
          createdAt: existing?.createdAt ? existing.createdAt : now,
          updatedAt: now,
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
      }
    }
    showToast(`Wilayah layanan "${localRecord.city}" berhasil disimpan.`);
  };

  const deleteServiceArea = async (areaId: string) => {
    const updatedList = serviceAreas.filter((a) => a.id !== areaId);
    setServiceAreas(updatedList);
    saveToLocal(STORAGE_KEYS.serviceAreas, updatedList);

    if (isCloudAdmin && user) {
      const path = `serviceAreas/${areaId}`;
      try {
        await deleteDoc(doc(db, 'serviceAreas', areaId));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path);
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
      heroImageUrl: input.heroImageUrl.slice(0, 800000),
      logoText: input.logoText.trim().slice(0, 60),
      visibility: 'public',
      authorUid: user?.uid || 'local-admin',
    };

    setSettings(localRecord);
    saveToLocal(STORAGE_KEYS.settings, localRecord);

    if (isCloudAdmin && user) {
      const path = 'settings/main';
      try {
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
          authorUid: user.uid,
          createdAt: settings.createdAt ? settings.createdAt : now,
          updatedAt: now,
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
      }
    }
    showToast('Pengaturan website & nomor WhatsApp berhasil diperbarui.');
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
        syncPlannerToBudget,
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
