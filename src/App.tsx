/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Calculator,
  Calendar,
  Camera,
  Flower2,
  Gem,
  Gift,
  Heart,
  Instagram,
  Mail,
  MailOpen,
  MapPin,
  Menu,
  MessageCircle,
  Phone,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Tag,
  Tent,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { AdminDashboard } from './components/AdminDashboard';
import { BudgetCalculatorSection } from './components/BudgetCalculatorSection';
import { ClientTestimonialsSection } from './components/ClientTestimonialsSection';
import { ConsultationCartDrawer } from './components/ConsultationCartDrawer';
import { BotanicalCornerOrnament, FloralDivider } from './components/FloralOrnaments';
import { InspirationGalleryView } from './components/InspirationGalleryView';
import { ProductCard } from './components/ProductCard';
import { ProductDetailModal } from './components/ProductDetailModal';
import {
  InspirationArticlesSection,
  PromoSection,
  ServiceAreaSection,
} from './components/PromoArticlesAreaSection';
import { SafeWeddingImage } from './components/SafeWeddingImage';
import { WeddingPackagesView } from './components/WeddingPackagesView';
import { WeddingConsultationView } from './components/WeddingConsultationView';
import { WeddingPlannerWizard } from './components/WeddingPlannerWizard';
import { WeddingServicesSection } from './components/WeddingServicesSection';
import { WishlistDrawer } from './components/WishlistDrawer';
import { useWedding, WeddingProvider } from './context/WeddingContext';
import { ActivePage, Product } from './types';
import { buildWhatsAppUrl } from './utils/imageUtils';

type SortOption =
  | 'featured'
  | 'price_asc'
  | 'price_desc'
  | 'newest'
  | 'popular'
  | 'promo';

const WeddingCatalogueApp: React.FC = () => {
  const {
    user,
    currentUserId,
    isGuestUser,
    loginCustomerWithGoogle,
    switchGuestSession,
    products,
    categories,
    settings,
    wishlistIds,
    cartItems,
    isCloudAdmin,
    isPreviewAdminUnlocked,
  } = useWedding();

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const isAdminAuthenticated = isCloudAdmin || isPreviewAdminUnlocked;

  const [activePage, setActivePage] = useState<ActivePage>('home');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortOption>('featured');
  const [onlyPromoFilter, setOnlyPromoFilter] = useState<boolean>(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [pageTransitionTick, setPageTransitionTick] = useState<number>(0);

  // Debounce product search query (250ms) for smooth performance
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  const navigateToPage = (nextPage: ActivePage) => {
    setActivePage(nextPage);
    setPageTransitionTick((t) => t + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Filter & Sort Active Products for Public Catalog
  const filteredProducts = useMemo(() => {
    const activeOnly = products.filter((p) => p.isActive !== false);

    const matched = activeOnly.filter((p) => {
      const matchCategory =
        selectedCategory === 'Semua' ||
        p.category.toLowerCase() === selectedCategory.toLowerCase() ||
        p.category.toLowerCase().includes(selectedCategory.toLowerCase());

      const q = debouncedSearchQuery.trim().toLowerCase();
      const matchQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.shortDescription.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q);

      const matchPromo =
        !onlyPromoFilter ||
        Boolean(p.isPromo) ||
        Boolean(p.originalPrice && p.originalPrice > p.price);

      return matchCategory && matchQuery && matchPromo;
    });

    const sorted = [...matched];
    if (sortBy === 'price_asc') {
      sorted.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price_desc') {
      sorted.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'newest') {
      sorted.sort(
        (a, b) =>
          Number(Boolean(b.isNew)) - Number(Boolean(a.isNew)) ||
          new Date(String(b.createdAt || 0)).getTime() -
            new Date(String(a.createdAt || 0)).getTime()
      );
    } else if (sortBy === 'popular') {
      sorted.sort((a, b) => (b.popularityScore || 0) - (a.popularityScore || 0));
    } else if (sortBy === 'promo') {
      sorted.sort(
        (a, b) =>
          Number(Boolean(b.isPromo || (b.originalPrice && b.originalPrice > b.price))) -
          Number(Boolean(a.isPromo || (a.originalPrice && a.originalPrice > a.price)))
      );
    } else {
      sorted.sort((a, b) => Number(Boolean(b.isFeatured)) - Number(Boolean(a.isFeatured)));
    }

    return sorted;
  }, [products, selectedCategory, debouncedSearchQuery, sortBy, onlyPromoFilter]);

  const handleCategoryClick = (categoryName: string) => {
    if (categoryName.toLowerCase().includes('paket')) {
      navigateToPage('packages');
      return;
    }
    setSelectedCategory(categoryName);
    navigateToPage('catalog');
  };

  const renderCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'Flower2':
        return <Flower2 className="w-5 h-5 text-[#9E762C]" />;
      case 'Tent':
        return <Tent className="w-5 h-5 text-[#9E762C]" />;
      case 'MailOpen':
        return <MailOpen className="w-5 h-5 text-[#9E762C]" />;
      case 'Gift':
        return <Gift className="w-5 h-5 text-[#9E762C]" />;
      case 'Gem':
        return <Gem className="w-5 h-5 text-[#9E762C]" />;
      case 'Camera':
        return <Camera className="w-5 h-5 text-[#9E762C]" />;
      default:
        return <Sparkles className="w-5 h-5 text-[#9E762C]" />;
    }
  };

  const generalWhatsAppUrl = buildWhatsAppUrl(
    settings.whatsappNumber,
    `Halo ${settings.businessName}, saya ingin berkonsultasi mengenai kebutuhan pernikahan saya (Dekorasi, Undangan, Souvenir, Mahar & Paket Pernikahan). Mohon informasi lebih lanjut.`
  );

  if (activePage === 'admin') {
    return (
      <div key={`admin-${pageTransitionTick}`} className="animate-page-fade-in">
        <AdminDashboard
          onBackToCatalog={() => {
            navigateToPage('home');
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-clip flex flex-col bg-[#FBF9F5] text-[#26211D] selection:bg-[#E8D8B9] selection:text-[#26211D]">
      {/* Translucent Editorial Header */}
      <header className="sticky top-0 z-40 h-16 sm:h-20 bg-[#FBF9F5]/95 backdrop-blur-md border-b border-[#EAE0CE] px-3 sm:px-6 lg:px-8 relative">
        {/* Subtle Champagne Gold Page Transition Sweep Line */}
        <div
          key={`progress-${activePage}-${pageTransitionTick}`}
          className="pointer-events-none absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-[#D9C296] via-[#9E762C] to-[#D9C296] animate-top-progress"
        />
        <div className="max-w-7xl mx-auto h-full flex items-center justify-between gap-2 sm:gap-3">
          {/* Brand Monogram & Name */}
          <button
            type="button"
            onClick={() => {
              navigateToPage('home');
            }}
            className="flex items-center gap-2.5 sm:gap-3 text-left group cursor-pointer min-w-0 flex-initial"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-[#C8B282] bg-[#F6EFE2] flex items-center justify-center text-[#9E762C] font-serif-display text-base sm:text-lg font-semibold group-hover:bg-[#9E762C] group-hover:text-white transition-colors shrink-0">
              IW
            </div>
            <div className="min-w-0">
              <span className="block font-serif-display text-lg sm:text-xl lg:text-2xl font-semibold tracking-tight text-[#26211D] leading-none truncate">
                {settings.businessName}
              </span>
              <span className="hidden min-[380px]:block text-[9px] sm:text-[10px] uppercase tracking-[0.14em] sm:tracking-[0.2em] text-[#8C7A65] mt-1 truncate">
                {settings.tagline}
              </span>
            </div>
          </button>

          {/* Desktop Center Navigation */}
          <nav className="hidden xl:flex items-center gap-3.5 2xl:gap-5 text-xs 2xl:text-sm font-medium text-[#5C4E3E] shrink-0">
            <button
              type="button"
              onClick={() => {
                navigateToPage('home');
              }}
              className={`py-1 whitespace-nowrap transition-colors cursor-pointer ${
                activePage === 'home'
                  ? 'text-[#26211D] font-semibold border-b-2 border-[#9E762C]'
                  : 'hover:text-[#26211D]'
              }`}
            >
              Beranda
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('Semua');
                navigateToPage('catalog');
              }}
              className={`py-1 whitespace-nowrap transition-colors cursor-pointer ${
                activePage === 'catalog'
                  ? 'text-[#26211D] font-semibold border-b-2 border-[#9E762C]'
                  : 'hover:text-[#26211D]'
              }`}
            >
              Katalog Produk
            </button>
            <button
              type="button"
              onClick={() => {
                navigateToPage('services');
              }}
              className={`py-1 whitespace-nowrap transition-colors cursor-pointer ${
                activePage === 'services'
                  ? 'text-[#26211D] font-semibold border-b-2 border-[#9E762C]'
                  : 'hover:text-[#26211D]'
              }`}
            >
              Layanan Wedding
            </button>
            <button
              type="button"
              onClick={() => {
                navigateToPage('consultation');
              }}
              className={`py-1 inline-flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer ${
                activePage === 'consultation'
                  ? 'text-[#9E762C] font-semibold border-b-2 border-[#9E762C]'
                  : 'text-[#9E762C] hover:text-[#7A591E]'
              }`}
            >
              <MessageCircle className="w-3.5 h-3.5 shrink-0" />
              <span>Konsultasi Pernikahan</span>
            </button>
            <button
              type="button"
              onClick={() => {
                navigateToPage('planner');
              }}
              className={`py-1 inline-flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer ${
                activePage === 'planner'
                  ? 'text-[#9E762C] font-semibold border-b-2 border-[#9E762C]'
                  : 'text-[#5C4E3E] hover:text-[#26211D]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>Rencanakan Pernikahan</span>
            </button>
            <button
              type="button"
              onClick={() => {
                navigateToPage('budget');
              }}
              className={`py-1 whitespace-nowrap transition-colors cursor-pointer ${
                activePage === 'budget'
                  ? 'text-[#26211D] font-semibold border-b-2 border-[#9E762C]'
                  : 'hover:text-[#26211D]'
              }`}
            >
              Kalkulator Budget
            </button>
            <button
              type="button"
              onClick={() => {
                navigateToPage('packages');
              }}
              className={`py-1 whitespace-nowrap transition-colors cursor-pointer ${
                activePage === 'packages'
                  ? 'text-[#26211D] font-semibold border-b-2 border-[#9E762C]'
                  : 'hover:text-[#26211D]'
              }`}
            >
              Paket Wedding
            </button>
            <button
              type="button"
              onClick={() => {
                navigateToPage('gallery');
              }}
              className={`py-1 whitespace-nowrap transition-colors cursor-pointer ${
                activePage === 'gallery'
                  ? 'text-[#26211D] font-semibold border-b-2 border-[#9E762C]'
                  : 'hover:text-[#26211D]'
              }`}
            >
              Inspirasi & Promo
            </button>
          </nav>

          {/* Right Actions: User Session, Wishlist, Consultation Cart, WhatsApp & Mobile Menu */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Multi-User Session / Account Button */}
            {isGuestUser ? (
              <button
                type="button"
                onClick={() => void loginCustomerWithGoogle()}
                title={`Sesi Anda: ${currentUserId} — Klik untuk simpan rencana ke Akun Google`}
                className="hidden lg:inline-flex xl:hidden 2xl:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#DFD3BE] bg-[#FCFBF8] hover:bg-[#F3ECE0] text-[#5C4E3E] text-xs font-medium transition-colors cursor-pointer whitespace-nowrap"
              >
                <Users className="w-3.5 h-3.5 text-[#9E762C] shrink-0" />
                <span>Masuk Pengantin</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={switchGuestSession}
                title={`Akun Aktif: ${user?.displayName || user?.email} — Klik untuk keluar / ganti sesi`}
                className="hidden lg:inline-flex xl:hidden 2xl:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#BBD2C1] bg-[#EEF5F0] hover:bg-[#E1EDE4] text-[#35543D] text-xs font-medium transition-colors cursor-pointer"
              >
                <UserCheck className="w-3.5 h-3.5 shrink-0" />
                <span className="max-w-[100px] truncate">
                  {user?.displayName || user?.email?.split('@')[0] || 'Akun Saya'}
                </span>
              </button>
            )}

            {/* Wishlist Drawer Trigger */}
            <button
              type="button"
              onClick={() => setIsWishlistOpen(true)}
              aria-label="Buka Wedding Wishlist"
              className="relative px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-xl border border-[#DFD3BE] bg-[#FCFBF8] hover:bg-[#F3ECE0] text-[#26211D] text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Heart
                className={`w-4 h-4 shrink-0 transition-colors ${
                  wishlistIds.length > 0
                    ? 'text-[#B85D5A] fill-[#B85D5A]'
                    : 'text-[#8C7A65]'
                }`}
              />
              <span className="hidden md:inline xl:hidden 2xl:inline">Wishlist</span>
              {wishlistIds.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-[#B85D5A] text-white text-[10px] font-semibold font-tabular leading-none">
                  {wishlistIds.length}
                </span>
              )}
            </button>

            {/* Consultation Cart Drawer Trigger */}
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              aria-label="Buka Daftar Konsultasi"
              className="relative px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-xl border border-[#DFD3BE] bg-[#FCFBF8] hover:bg-[#F3ECE0] text-[#26211D] text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4 text-[#9E762C] shrink-0" />
              <span className="hidden md:inline xl:hidden 2xl:inline">Daftar Konsultasi</span>
              {cartCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-[#26211D] text-[#F5EFE6] text-[10px] font-semibold font-tabular leading-none">
                  {cartCount}
                </span>
              )}
            </button>

            <a
              href={generalWhatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-xl bg-[#4E6752] hover:bg-[#3F5543] text-white text-xs font-medium transition-colors shadow-xs whitespace-nowrap"
            >
              <MessageCircle className="w-4 h-4 shrink-0" />
              <span>Konsultasi WA</span>
            </a>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="Menu Navigasi"
              className="xl:hidden p-2 sm:p-2.5 rounded-xl border border-[#DFD3BE] text-[#26211D] hover:bg-[#F3ECE0] shrink-0"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer Menu */}
        {mobileMenuOpen && (
          <div className="xl:hidden absolute inset-x-0 top-full max-h-[calc(100dvh-4rem)] sm:max-h-[calc(100dvh-5rem)] overflow-y-auto z-50 bg-[#FBF9F5] border-b border-[#DFD3BE] px-4 sm:px-6 py-5 shadow-xl space-y-2.5 animate-section-fade">
            <button
              type="button"
              onClick={() => {
                navigateToPage('home');
                setMobileMenuOpen(false);
              }}
              className="block w-full text-left py-2 text-base font-serif-display font-semibold text-[#26211D]"
            >
              Beranda Utama
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('Semua');
                navigateToPage('catalog');
                setMobileMenuOpen(false);
              }}
              className="block w-full text-left py-2 text-base font-serif-display font-semibold text-[#26211D]"
            >
              Katalog Produk ({products.filter((p) => p.isActive !== false).length} Koleksi)
            </button>
            <button
              type="button"
              onClick={() => {
                navigateToPage('services');
                setMobileMenuOpen(false);
              }}
              className="block w-full text-left py-2 text-base font-serif-display font-semibold text-[#26211D]"
            >
              Layanan Wedding (MUA, WO, Tim Sanggar & Tim Attire)
            </button>
            <button
              type="button"
              onClick={() => {
                navigateToPage('consultation');
                setMobileMenuOpen(false);
              }}
              className="block w-full text-left py-2 text-base font-serif-display font-semibold text-[#9E762C]"
            >
              💬 Konsultasi Pernikahan ISTAFA
            </button>
            <button
              type="button"
              onClick={() => {
                navigateToPage('planner');
                setMobileMenuOpen(false);
              }}
              className="block w-full text-left py-2 text-base font-serif-display font-semibold text-[#9E762C]"
            >
              ✨ Rencanakan Pernikahan Saya & Cek Tanggal
            </button>
            <button
              type="button"
              onClick={() => {
                navigateToPage('budget');
                setMobileMenuOpen(false);
              }}
              className="block w-full text-left py-2 text-base font-serif-display font-semibold text-[#26211D]"
            >
              Kalkulator Budget Pernikahan
            </button>
            <button
              type="button"
              onClick={() => {
                navigateToPage('packages');
                setMobileMenuOpen(false);
              }}
              className="block w-full text-left py-2 text-base font-serif-display font-semibold text-[#26211D]"
            >
              Paket Pernikahan (Hemat, Silver, Gold, Exclusive)
            </button>
            <button
              type="button"
              onClick={() => {
                navigateToPage('gallery');
                setMobileMenuOpen(false);
              }}
              className="block w-full text-left py-2 text-base font-serif-display font-semibold text-[#26211D]"
            >
              Galeri Inspirasi, Promo & Artikel
            </button>

            <div className="pt-3 border-t border-[#E8DFC8] grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setIsWishlistOpen(true);
                }}
                className="py-2.5 px-3 rounded-xl border border-[#DFD3BE] bg-white text-[#26211D] text-xs font-medium flex items-center justify-center gap-1.5"
              >
                <Heart className="w-3.5 h-3.5 text-[#B85D5A] fill-[#B85D5A]" />
                <span>Wishlist ({wishlistIds.length})</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setIsCartOpen(true);
                }}
                className="py-2.5 px-3 rounded-xl border border-[#DFD3BE] bg-white text-[#26211D] text-xs font-medium flex items-center justify-center gap-1.5"
              >
                <ShoppingBag className="w-3.5 h-3.5 text-[#9E762C]" />
                <span>Konsultasi ({cartCount})</span>
              </button>
            </div>

            <div className="pt-3 border-t border-[#E8DFC8] flex items-center justify-between gap-2">
              <div className="text-xs text-[#6E6359] truncate">
                {!isGuestUser && user
                  ? `Akun: ${user.displayName || user.email}`
                  : `Sesi Pengantin: ${currentUserId.slice(0, 14)}`}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {isGuestUser && (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      void loginCustomerWithGoogle();
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-[#26211D] text-white text-xs font-medium"
                  >
                    Simpan ke Google
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    switchGuestSession();
                    setMobileMenuOpen(false);
                  }}
                  className="px-2.5 py-1.5 rounded-lg border border-[#DFD3BE] bg-white text-[#5C4E3E] text-xs font-medium"
                >
                  {isGuestUser ? 'Sesi Baru' : 'Keluar'}
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                navigateToPage('admin');
                setMobileMenuOpen(false);
              }}
              className="block w-full text-left py-2 text-xs font-medium text-[#9E762C]"
            >
              {isAdminAuthenticated ? 'Kelola Katalog (Admin Aktif)' : 'Login Pengelola Toko'}
            </button>
          </div>
        )}
      </header>

      {/* Main Content Area with Smooth Fade-In Transition on Page Switch */}
      <main className="flex-1">
        <div key={`${activePage}-${pageTransitionTick}`} className="animate-page-fade-in">
        {/* ==================== HOME VIEW ==================== */}
        {activePage === 'home' && (
          <>
            {/* Editorial Romantic Wedding Hero Section */}
            <section className="relative overflow-hidden py-8 sm:py-14 lg:py-20 px-4 sm:px-6 lg:px-8 border-b border-[#EAE0CE] bg-gradient-to-b from-[#FAF6EE] via-[#FBF9F5] to-[#F5EFE6]">
              <BotanicalCornerOrnament className="pointer-events-none select-none absolute -top-6 -left-6 w-32 h-32 sm:w-48 sm:h-48 text-[#9E762C]" />
              <BotanicalCornerOrnament className="pointer-events-none select-none absolute -bottom-6 -right-6 w-32 h-32 sm:w-48 sm:h-48 text-[#9E762C] rotate-180" />

              <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-10 lg:gap-12 items-center relative z-10">
                {/* Left Column: Romantic Editorial Copy & Actions */}
                <div className="lg:col-span-7 space-y-5 sm:space-y-6 text-center lg:text-left min-w-0">
                  <div className="inline-flex items-center justify-center lg:justify-start gap-2 text-[11px] sm:text-xs uppercase tracking-[0.14em] sm:tracking-[0.22em] text-[#9E762C] font-semibold">
                    <Sparkles className="w-4 h-4 shrink-0" />
                    <span>Platform Layanan & Katalog Pernikahan Terpadu</span>
                  </div>

                  <h1 className="heading-hero-fluid font-serif-display font-semibold text-[#26211D] tracking-tight text-balance">
                    Lengkapi Momen Pernikahan Impian Anda
                  </h1>

                  <p className="text-sm sm:text-base lg:text-lg text-[#5C5147] max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                    Temukan berbagai kebutuhan pernikahan mulai dari dekorasi, undangan, souvenir hingga perlengkapan mahar dalam satu tempat.
                  </p>

                  {/* Primary & Secondary Hero Buttons */}
                  <div className="pt-1 sm:pt-2 flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-center lg:justify-start gap-2.5 sm:gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        navigateToPage('consultation');
                      }}
                      className="w-full sm:w-auto px-5 sm:px-6 py-3.5 sm:py-4 rounded-xl bg-[#9E762C] hover:bg-[#876322] text-white text-xs sm:text-sm font-medium flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
                    >
                      <MessageCircle className="w-4 h-4 shrink-0" />
                      <span>Konsultasi Pernikahan ISTAFA</span>
                      <ArrowRight className="w-4 h-4 shrink-0" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        navigateToPage('planner');
                      }}
                      className="w-full sm:w-auto px-5 sm:px-6 py-3.5 sm:py-4 rounded-xl bg-[#26211D] hover:bg-[#3A322C] text-[#FBF9F5] text-xs sm:text-sm font-medium flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 text-[#D9C296] shrink-0" />
                      <span>Mulai Rencanakan Pernikahan</span>
                    </button>

                    <a
                      href={generalWhatsAppUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full sm:w-auto px-5 sm:px-6 py-3.5 sm:py-4 rounded-xl border border-[#B8C6B9] bg-[#F1F5F2] hover:bg-[#4E6752] hover:text-white text-[#35543D] text-xs sm:text-sm font-medium flex items-center justify-center gap-2 transition-all"
                    >
                      <MessageCircle className="w-4 h-4 shrink-0" />
                      <span>Konsultasi via WhatsApp</span>
                    </a>
                  </div>

                  {/* Interactive Quick Feature Pills */}
                  <div className="pt-4 grid grid-cols-3 gap-2 sm:gap-6 border-t border-[#E6DEC8] max-w-xl mx-auto lg:mx-0 text-left">
                    <button
                      type="button"
                      onClick={() => {
                        navigateToPage('catalog');
                      }}
                      className="group text-left cursor-pointer min-w-0"
                    >
                      <p className="font-serif-display text-base min-[400px]:text-lg sm:text-2xl font-semibold text-[#26211D] group-hover:text-[#9E762C] transition-colors font-tabular leading-tight">
                        {categories.length} Kategori
                      </p>
                      <p className="text-[11px] sm:text-xs text-[#6E6359] mt-0.5 leading-snug">
                        Multi-Foto Detail HD →
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        navigateToPage('planner');
                      }}
                      className="group text-left cursor-pointer min-w-0"
                    >
                      <p className="font-serif-display text-base min-[400px]:text-lg sm:text-2xl font-semibold text-[#26211D] group-hover:text-[#9E762C] transition-colors leading-tight">
                        Cek Tanggal
                      </p>
                      <p className="text-[11px] sm:text-xs text-[#6E6359] mt-0.5 leading-snug">
                        Kalender Real-Time 🟢 →
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        navigateToPage('budget');
                      }}
                      className="group text-left cursor-pointer min-w-0"
                    >
                      <p className="font-serif-display text-base min-[400px]:text-lg sm:text-2xl font-semibold text-[#9E762C] font-tabular leading-tight">
                        Simulasi Biaya
                      </p>
                      <p className="text-[11px] sm:text-xs text-[#6E6359] mt-0.5 leading-snug">
                        Kalkulator Budget →
                      </p>
                    </button>
                  </div>
                </div>

                {/* Right Column: Arch-Framed Wedding Pelaminan Showcase */}
                <div className="lg:col-span-5 relative w-full">
                  <div className="relative mx-auto w-full max-w-sm sm:max-w-md lg:max-w-none">
                    {/* Soft Gold Decorative Arch Border */}
                    <div className="rounded-t-[130px] sm:rounded-t-[180px] rounded-b-3xl p-2 sm:p-2.5 border border-[#D5C096] bg-white/70 shadow-xl">
                      <div className="relative aspect-[4/5] rounded-t-[122px] sm:rounded-t-[170px] rounded-b-2xl overflow-hidden bg-[#EFE6D5]">
                        <SafeWeddingImage
                          src={settings.heroImageUrl || '/images/wedding_hero_pelaminan_1791077458144.jpg'}
                          alt="Dekorasi Pelaminan Pernikahan Impian Istafa Wedding"
                          loading="eager"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent p-4 sm:p-6 text-white">
                          <span className="text-[10px] sm:text-[11px] uppercase tracking-widest text-[#E8D8B9] block">
                            Signature Wedding Collection
                          </span>
                          <p className="font-serif-display text-xl sm:text-2xl font-medium mt-0.5 leading-snug">
                            Royal Champagne & White Rose Sanctuary
                          </p>
                          <div className="mt-1.5 sm:mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] sm:text-xs text-white/85">
                            <span>Pelaminan</span>
                            <span>·</span>
                            <span>Tenda Serut</span>
                            <span>·</span>
                            <span>Undangan & Mahar</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* ==================== CATEGORY SHOWCASE SECTION ==================== */}
            <section className="py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
              <div className="max-w-2xl mx-auto text-center">
                <p className="text-xs uppercase tracking-[0.2em] text-[#9E762C] font-semibold">
                  Eksplorasi Berdasarkan Kebutuhan
                </p>
                <h2 className="mt-2 heading-section-fluid font-serif-display font-semibold text-[#26211D]">
                  Kategori Kebutuhan Pernikahan
                </h2>
                <p className="mt-3 text-sm sm:text-base text-[#5C5147]">
                  Pilih kategori untuk melihat katalog lengkap dengan galeri multi-foto dari berbagai sudut:
                </p>
                <FloralDivider className="mt-5" />
              </div>

              <div className="mt-8 sm:mt-10 grid grid-cols-1 min-[380px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-5">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleCategoryClick(cat.name)}
                    className="group relative rounded-2xl overflow-hidden border border-[#E5DAC5] bg-white text-left transition-all duration-300 hover:-translate-y-1 hover:border-[#C8B282] hover:shadow-md cursor-pointer flex flex-col justify-between"
                  >
                    <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#F2ECE1]">
                      <SafeWeddingImage
                        src={cat.coverImageUrl}
                        alt={cat.name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      <div className="absolute top-2.5 left-2.5 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/90 backdrop-blur-xs flex items-center justify-center shadow-xs">
                        {renderCategoryIcon(cat.iconName)}
                      </div>
                    </div>

                    <div className="p-3 sm:p-4 flex items-center justify-between gap-2 bg-[#FCFBF8] flex-1">
                      <div className="min-w-0">
                        <h3 className="text-sm sm:text-base lg:text-lg font-serif-display font-semibold text-[#26211D] group-hover:text-[#9E762C] transition-colors leading-snug line-clamp-2">
                          {cat.name}
                        </h3>
                        <p className="text-[11px] sm:text-xs text-[#6E6359] mt-0.5 line-clamp-2">
                          {cat.description}
                        </p>
                      </div>
                      <div className="w-7 h-7 rounded-full border border-[#DFD3BE] flex items-center justify-center text-[#8C7A65] group-hover:bg-[#26211D] group-hover:text-white transition-colors shrink-0">
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {/* ==================== FEATURED MULTI-PHOTO CATALOG PREVIEW ==================== */}
            <section className="py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8 bg-[#F4EFE4]/70 border-y border-[#E6DEC8]">
              <div className="max-w-7xl mx-auto">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[#9E762C] font-semibold">
                      Kurasi Pilihan Pengantin
                    </p>
                    <h2 className="mt-1.5 heading-section-fluid font-serif-display font-semibold text-[#26211D]">
                      Koleksi Unggulan Multi-Foto
                    </h2>
                    <p className="mt-2 text-sm sm:text-base text-[#5C5147] max-w-2xl">
                      Setiap produk dilengkapi beberapa foto detail. Geser langsung pada kartu, simpan ke Wishlist ❤️, atau tambahkan ke Daftar Konsultasi.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory('Semua');
                      navigateToPage('catalog');
                    }}
                    className="w-full sm:w-auto justify-center px-5 py-2.5 rounded-xl border border-[#C8B282] bg-white hover:bg-[#26211D] hover:text-white text-xs sm:text-sm font-medium text-[#26211D] flex items-center gap-2 transition-colors shrink-0 cursor-pointer"
                  >
                    <span>Lihat Seluruh Katalog ({products.filter((p) => p.isActive !== false).length})</span>
                    <ArrowRight className="w-4 h-4 shrink-0" />
                  </button>
                </div>

                <div className="mt-8 sm:mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-7">
                  {products
                    .filter((p) => p.isActive !== false)
                    .slice(0, 6)
                    .map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        onOpenDetail={(prod) => setSelectedProduct(prod)}
                      />
                    ))}
                </div>
              </div>
            </section>

            {/* ==================== 4 LAYANAN WEDDING SECTION (MUA, WO, TIM SANGGAR, TIM ATTIRE) ==================== */}
            <WeddingServicesSection
              onOpenDetail={(prod) => setSelectedProduct(prod)}
              onOpenPlanner={() => {
                navigateToPage('planner');
              }}
              onOpenBudget={() => {
                navigateToPage('budget');
              }}
            />

            {/* ==================== INTERACTIVE WEDDING PLANNER PREVIEW BANNER ==================== */}
            <section className="py-10 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
              <div className="rounded-3xl border border-[#D8C7A8] bg-gradient-to-r from-[#26211D] via-[#332C26] to-[#26211D] text-white p-5 sm:p-8 lg:p-12 shadow-lg flex flex-col lg:flex-row items-center justify-between gap-6 sm:gap-8">
                <div className="max-w-2xl space-y-3 text-center lg:text-left">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#9E762C]/30 border border-[#D9C296]/40 text-[#E8D8B9] text-[11px] sm:text-xs font-semibold uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5 shrink-0" /> Fitur Interaktif Eksklusif
                  </span>
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl font-serif-display font-semibold leading-tight">
                    Rencanakan Pernikahan Saya & Cek Ketersediaan Tanggal
                  </h2>
                  <p className="text-xs sm:text-sm lg:text-base text-white/80 leading-relaxed">
                    Susun kebutuhan pernikahan langkah demi langkah — mulai dari cek kalender tanggal kosong (🟢 Tersedia), jumlah tamu, dekorasi, undangan, souvenir, hingga mahar dengan estimasi biaya otomatis.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 shrink-0 w-full sm:w-auto justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      navigateToPage('planner');
                    }}
                    className="w-full sm:w-auto px-5 sm:px-6 py-3.5 sm:py-4 rounded-xl bg-[#C8A96A] hover:bg-[#B89652] text-[#1E1A16] text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-colors shadow-md cursor-pointer"
                  >
                    <Calendar className="w-4 h-4 shrink-0" />
                    <span>Buka Wedding Planner & Kalender</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      navigateToPage('budget');
                    }}
                    className="w-full sm:w-auto px-5 sm:px-6 py-3.5 sm:py-4 rounded-xl border border-white/25 bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Calculator className="w-4 h-4 text-[#E8D8B9] shrink-0" />
                    <span>Kalkulator Budget</span>
                  </button>
                </div>
              </div>
            </section>

            {/* ==================== PACKAGES SECTION ON HOME ==================== */}
            <WeddingPackagesView
              onOpenPlanner={() => {
                navigateToPage('planner');
              }}
            />

            {/* ==================== BUDGET CALCULATOR ON HOME ==================== */}
            <div className="bg-[#F6F1E6]/70 border-y border-[#E6DEC8]">
              <BudgetCalculatorSection />
            </div>

            {/* ==================== PROMOS, ARTICLES & SERVICE AREAS ==================== */}
            <PromoSection />
            <InspirationArticlesSection />
            <ServiceAreaSection />

            {/* ==================== CLIENT TESTIMONIALS & DOCUMENTATION ==================== */}
            <ClientTestimonialsSection />

            {/* ==================== INSPIRATION GALLERY ON HOME ==================== */}
            <div className="bg-[#FAF6EE] border-t border-[#EAE0CE]">
              <InspirationGalleryView />
            </div>
          </>
        )}

        {/* ==================== FULL CATALOG VIEW ==================== */}
        {activePage === 'catalog' && (
          <section className="py-8 sm:py-14 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="max-w-2xl mx-auto text-center">
              <p className="text-xs uppercase tracking-[0.2em] text-[#9E762C] font-semibold">
                Katalog Pernikahan Profesional
              </p>
              <h1 className="mt-2 heading-section-fluid font-serif-display font-semibold text-[#26211D]">
                Koleksi Kebutuhan Pernikahan
              </h1>
              <p className="mt-2.5 text-sm sm:text-base text-[#5C5147]">
                Pilih kategori, urutkan berdasarkan harga atau promo, dan klik produk untuk melihat seluruh galeri foto detail beserta ukurannya.
              </p>
              <FloralDivider className="mt-5" />
            </div>

            {/* Search, Promo Toggle & Sorting Bar */}
            <div className="mt-6 sm:mt-8 rounded-2xl border border-[#E2D6C1] bg-white p-3.5 sm:p-5 shadow-xs space-y-3.5 sm:space-y-4">
              <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                {/* Search input */}
                <div className="relative flex-1 min-w-0">
                  <Search className="w-4 h-4 text-[#8C7A65] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari dekorasi, souvenir, undangan..."
                    className="w-full rounded-xl border border-[#DFD3BE] bg-[#FCFBF9] pl-10 pr-9 py-2.5 text-xs sm:text-sm text-[#26211D] focus:outline-none focus:border-[#9E762C]"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C7A65] hover:text-[#26211D]"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Fast Sorting & Promo Filter */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                  <button
                    type="button"
                    onClick={() => setOnlyPromoFilter((prev) => !prev)}
                    className={`px-3.5 py-2.5 rounded-xl text-xs font-medium inline-flex items-center justify-center gap-1.5 border transition-colors cursor-pointer ${
                      onlyPromoFilter
                        ? 'bg-[#9E3B3B] text-white border-[#9E3B3B]'
                        : 'bg-[#FCFBF9] text-[#5C4E3E] border-[#DFD3BE] hover:bg-[#FAF6EE]'
                    }`}
                  >
                    <Tag className="w-3.5 h-3.5 shrink-0" />
                    <span>Sedang Promo</span>
                  </button>

                  <div className="flex-1 sm:flex-initial flex items-center justify-between sm:justify-start gap-2 bg-[#FCFBF9] border border-[#DFD3BE] rounded-xl px-3 py-2 min-w-0">
                    <div className="flex items-center gap-1.5 shrink-0">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-[#9E762C]" />
                      <span className="text-xs text-[#6E6359]">Urutkan:</span>
                    </div>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as SortOption)}
                      className="text-xs font-semibold text-[#26211D] bg-transparent focus:outline-none cursor-pointer truncate"
                    >
                      <option value="featured">Unggulan Studio</option>
                      <option value="popular">Terpopuler</option>
                      <option value="newest">Terbaru</option>
                      <option value="price_asc">Harga Terendah</option>
                      <option value="price_desc">Harga Tertinggi</option>
                      <option value="promo">Diskon / Promo</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
                {['Semua', ...categories.map((c) => c.name)].map((catName) => {
                  const isActive =
                    selectedCategory.toLowerCase() === catName.toLowerCase();
                  return (
                    <button
                      key={catName}
                      type="button"
                      onClick={() => setSelectedCategory(catName)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                        isActive
                          ? 'bg-[#26211D] text-[#FBF9F5] shadow-xs'
                          : 'bg-[#F4EFE4] text-[#5C4E3E] hover:bg-[#E8DEC8] hover:text-[#26211D]'
                      }`}
                    >
                      {catName}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Product Grid with Smooth Category/Sort Fade Transition */}
            {filteredProducts.length > 0 ? (
              <div
                key={`cat-grid-${selectedCategory}-${sortBy}-${onlyPromoFilter}`}
                className="mt-6 sm:mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-7 animate-section-fade"
              >
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onOpenDetail={(prod) => setSelectedProduct(prod)}
                  />
                ))}
              </div>
            ) : (
              <div className="mt-12 rounded-3xl border border-[#E5DAC5] bg-white p-12 text-center max-w-lg mx-auto animate-section-fade">
                <p className="font-serif-display text-2xl font-semibold text-[#26211D]">
                  Produk Tidak Ditemukan
                </p>
                <p className="text-xs sm:text-sm text-[#6E6359] mt-1.5">
                  Belum ada produk yang cocok dengan filter "{selectedCategory}" atau kata kunci "{searchQuery}".
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory('Semua');
                    setSearchQuery('');
                    setOnlyPromoFilter(false);
                  }}
                  className="mt-4 px-5 py-2.5 rounded-xl bg-[#26211D] text-white text-xs font-medium cursor-pointer"
                >
                  Tampilkan Semua Koleksi
                </button>
              </div>
            )}
          </section>
        )}

        {/* ==================== LAYANAN WEDDING VIEW (MUA, WO, TIM SANGGAR, TIM ATTIRE) ==================== */}
        {activePage === 'services' && (
          <WeddingServicesSection
            onOpenDetail={(prod) => setSelectedProduct(prod)}
            onOpenPlanner={() => {
              navigateToPage('planner');
            }}
            onOpenBudget={() => {
              navigateToPage('budget');
            }}
          />
        )}

        {/* ==================== KONSULTASI PERNIKAHAN ISTAFA VIEW ==================== */}
        {activePage === 'consultation' && (
          <WeddingConsultationView
            onOpenDetail={(prod) => setSelectedProduct(prod)}
            onOpenPlanner={() => navigateToPage('planner')}
            onOpenBudget={() => navigateToPage('budget')}
            onOpenCart={() => setIsCartOpen(true)}
          />
        )}

        {/* ==================== WEDDING PLANNER & CALENDAR VIEW ==================== */}
        {activePage === 'planner' && <WeddingPlannerWizard />}

        {/* ==================== BUDGET CALCULATOR VIEW ==================== */}
        {activePage === 'budget' && (
          <>
            <BudgetCalculatorSection />
            <WeddingPackagesView
              onOpenPlanner={() => {
                navigateToPage('planner');
              }}
            />
          </>
        )}

        {/* ==================== PACKAGES VIEW ==================== */}
        {activePage === 'packages' && (
          <WeddingPackagesView
            onOpenPlanner={() => {
              navigateToPage('planner');
            }}
          />
        )}

        {/* ==================== INSPIRATION, PROMOS & ARTICLES VIEW ==================== */}
        {(activePage === 'gallery' || activePage === 'promo' || activePage === 'articles') && (
          <>
            <PromoSection />
            <InspirationArticlesSection />
            <ServiceAreaSection />
            <InspirationGalleryView />
          </>
        )}
        </div>
      </main>

      {/* ==================== ROMANTIC CONSULTATION CTA BANNER ==================== */}
      <section className="py-12 sm:py-16 lg:py-18 px-4 sm:px-6 lg:px-8 bg-[#EFE6D5] border-t border-[#DFD2BA]">
        <div className="max-w-4xl mx-auto text-center space-y-4 sm:space-y-5">
          <span className="text-xs uppercase tracking-[0.2em] text-[#9E762C] font-semibold">
            Pendampingan Personal Hari Bahagia
          </span>
          <h2 className="heading-section-fluid font-serif-display font-semibold text-[#26211D] text-balance">
            Wujudkan Konsep Pernikahan Impian Anda Bersama {settings.businessName}
          </h2>
          <p className="text-xs sm:text-sm lg:text-base text-[#5C4E3E] max-w-2xl mx-auto leading-relaxed">
            Diskusikan tema warna pelaminan, ukuran tenda lokasi acara, desain undangan, hingga pilihan souvenir dan mahar. Konsultan pernikahan kami siap membantu menyesuaikan paket dengan anggaran Anda.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                navigateToPage('consultation');
              }}
              className="w-full sm:w-auto px-5 sm:px-7 py-3.5 sm:py-4 rounded-xl bg-[#9E762C] hover:bg-[#876322] text-white text-xs sm:text-sm font-medium inline-flex items-center justify-center gap-2.5 shadow-md transition-colors cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 shrink-0" />
              <span>Buka Konsultasi Pernikahan ISTAFA</span>
            </button>
            <a
              href={generalWhatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-5 sm:px-7 py-3.5 sm:py-4 rounded-xl bg-[#4E6752] hover:bg-[#3F5543] text-white text-xs sm:text-sm font-medium inline-flex items-center justify-center gap-2.5 shadow-md transition-colors text-center"
            >
              <MessageCircle className="w-4 h-4 shrink-0" />
              <span>Hubungi Konsultan via WhatsApp ({settings.whatsappNumber})</span>
            </a>
            <button
              type="button"
              onClick={() => {
                navigateToPage('planner');
              }}
              className="w-full sm:w-auto px-5 sm:px-6 py-3.5 sm:py-4 rounded-xl border border-[#C8B282] bg-[#FBF9F5] hover:bg-[#26211D] hover:text-white text-[#26211D] text-xs sm:text-sm font-medium inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-[#9E762C] shrink-0" />
              <span>Mulai Rencanakan Pernikahan</span>
            </button>
          </div>
        </div>
      </section>

      {/* ==================== FOOTER ==================== */}
      <footer className="bg-[#221D19] text-[#EAE0CE] pt-12 sm:pt-16 pb-24 sm:pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-10 pb-10 border-b border-white/10">
          {/* Col 1: Brand Info */}
          <div className="sm:col-span-2 lg:col-span-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full border border-[#C8B282] bg-[#332B24] flex items-center justify-center text-[#D9C296] font-serif-display text-base font-semibold shrink-0">
                IW
              </div>
              <span className="font-serif-display text-xl sm:text-2xl font-semibold text-white">
                {settings.businessName}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#C2B6A3] max-w-md leading-relaxed">
              Platform layanan dan katalog pernikahan terpadu untuk dekorasi pelaminan, tenda serut, undangan, souvenir, seserahan, dokumentasi, dan mahar pernikahan.
            </p>
          </div>

          {/* Col 2: Quick Links */}
          <div className="sm:col-span-1 lg:col-span-3 space-y-2.5">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-[#D9C296]">
              Layanan & Fitur
            </h3>
            <ul className="space-y-2 text-xs sm:text-sm text-[#C2B6A3]">
              <li>
                <button
                  type="button"
                  onClick={() => {
                    navigateToPage('consultation');
                  }}
                  className="hover:text-white text-left cursor-pointer"
                >
                  💬 Konsultasi Pernikahan ISTAFA
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    navigateToPage('planner');
                  }}
                  className="hover:text-white text-left cursor-pointer"
                >
                  ✨ Rencanakan Pernikahan & Cek Tanggal
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    navigateToPage('budget');
                  }}
                  className="hover:text-white text-left cursor-pointer"
                >
                  Kalkulator Budget Pernikahan
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory('Semua');
                    navigateToPage('catalog');
                  }}
                  className="hover:text-white text-left cursor-pointer"
                >
                  Katalog Produk ({categories.length} Kategori)
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    navigateToPage('services');
                  }}
                  className="hover:text-white text-left cursor-pointer"
                >
                  Layanan Wedding (MUA, WO, Sanggar & Attire)
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    navigateToPage('packages');
                  }}
                  className="hover:text-white text-left cursor-pointer"
                >
                  Paket Pernikahan Lengkap
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Studio Contact */}
          <div className="sm:col-span-1 lg:col-span-4 space-y-2.5 text-xs sm:text-sm text-[#C2B6A3] min-w-0">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-[#D9C296]">
              Galeri & Kontak Konsultasi
            </h3>
            <p className="flex items-start gap-2 break-words">
              <MapPin className="w-4 h-4 text-[#D9C296] shrink-0 mt-0.5" />
              <span>{settings.address}</span>
            </p>
            <p className="flex items-center gap-2 font-tabular">
              <Phone className="w-4 h-4 text-[#D9C296] shrink-0" />
              <span>+{settings.whatsappNumber}</span>
            </p>
            <p className="flex items-center gap-2 break-all">
              <Instagram className="w-4 h-4 text-[#D9C296] shrink-0" />
              <span>{settings.instagram}</span>
            </p>
            <p className="text-xs text-[#9E917E] pt-1">Senin – Minggu: 08.00 – 21.00 WIB</p>
          </div>
        </div>

        {/* Bottom Legal & Subtle Admin Link */}
        <div className="max-w-7xl mx-auto pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#9E917E] text-center sm:text-left">
          <p>© {new Date().getFullYear()} {settings.businessName}. Seluruh hak cipta dilindungi.</p>
          <button
            type="button"
            onClick={() => {
              navigateToPage('admin');
            }}
            className="text-[#C2B6A3] hover:text-white underline underline-offset-4 cursor-pointer"
          >
            {isAdminAuthenticated
              ? 'Buka Dashboard Admin (Mode Aktif)'
              : 'Login Admin / Kelola Toko'}
          </button>
        </div>
      </footer>

      {/* ==================== FLOATING WHATSAPP & CART BAR ==================== */}
      <div className="fixed bottom-4 right-4 sm:bottom-5 sm:right-5 z-30 flex flex-col items-end gap-2 max-w-[calc(100vw-2rem)]">
        {cartCount > 0 && (
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="flex items-center gap-2 px-4 py-3 rounded-full bg-[#26211D] hover:bg-[#3A322C] text-white text-xs font-medium shadow-lg transition-transform hover:scale-105 cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4 text-[#D9C296]" />
            <span>Daftar Konsultasi ({cartCount} Item)</span>
          </button>
        )}

        <a
          href={generalWhatsAppUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Konsultasi Cepat via WhatsApp"
          className="flex items-center gap-2 px-4 py-3 rounded-full bg-[#4E6752] hover:bg-[#3F5543] text-white text-xs sm:text-sm font-medium shadow-lg transition-transform hover:scale-105"
        >
          <MessageCircle className="w-4 h-4" />
          <span>Konsultasi Cepat</span>
        </a>
      </div>

      {/* ==================== PRODUCT DETAIL MODAL (MULTI-PHOTO GALLERY & ZOOM) ==================== */}
      <ProductDetailModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />

      {/* ==================== WISHLIST SLIDE-OVER DRAWER ==================== */}
      <WishlistDrawer
        isOpen={isWishlistOpen}
        onClose={() => setIsWishlistOpen(false)}
        onSelectProduct={(prod) => setSelectedProduct(prod)}
        onExploreCatalog={() => {
          setSelectedCategory('Semua');
          navigateToPage('catalog');
        }}
        onOpenCart={() => setIsCartOpen(true)}
      />

      {/* ==================== CONSULTATION CART SLIDE-OVER DRAWER ==================== */}
      <ConsultationCartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onSelectProduct={(prod) => setSelectedProduct(prod)}
        onExploreCatalog={() => {
          setSelectedCategory('Semua');
          navigateToPage('catalog');
        }}
        onOpenBudgetCalculator={() => {
          navigateToPage('budget');
        }}
      />
    </div>
  );
};

export default function App() {
  return (
    <WeddingProvider>
      <WeddingCatalogueApp />
    </WeddingProvider>
  );
}
