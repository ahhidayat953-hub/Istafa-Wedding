import React, { useState } from 'react';
import {
  Calculator,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Heart,
  MessageCircle,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';
import { useWedding } from '../context/WeddingContext';
import { Product } from '../types';
import {
  buildProductWhatsAppMessage,
  buildWhatsAppUrl,
  formatRupiah,
} from '../utils/imageUtils';
import { FloralDivider } from './FloralOrnaments';
import { SafeWeddingImage } from './SafeWeddingImage';

interface WeddingServicesSectionProps {
  onOpenDetail: (product: Product) => void;
  onOpenPlanner?: () => void;
  onOpenBudget?: () => void;
}

const SERVICE_CATEGORY_KEYWORDS = [
  'mua',
  'make up artist',
  'makeup',
  'wo',
  'wedding organizer',
  'tim sanggar',
  'sanggar',
  'tim attire',
  'attire',
  'entertainment',
  'mc',
  'master of ceremony',
  'dokumentasi',
  'parkir',
  'security',
];

export function isWeddingServiceProduct(product: Product): boolean {
  const cat = product.category.toLowerCase();
  const id = product.id.toLowerCase();
  return (
    SERVICE_CATEGORY_KEYWORDS.some((kw) => cat.includes(kw)) ||
    [
      'prod-makeup-pengantin-flawless',
      'prod-wo-wedding-organizer',
      'prod-tim-sanggar-pertunjukan',
      'prod-tim-attire-pendampingan',
      'prod-team-entertainment',
      'prod-team-mc',
      'prod-team-dokumentasi',
      'prod-team-parkir-security',
    ].includes(id)
  );
}

function getServiceBadgeRole(category: string): string {
  const c = category.toLowerCase();
  if (c.includes('mua') || c.includes('make up') || c.includes('makeup')) {
    return 'Layanan Rias & Kecantikan Pengantin';
  }
  if (c.includes('wo') || c.includes('organizer')) {
    return 'Layanan Manajemen & Koordinasi Acara';
  }
  if (c.includes('sanggar')) {
    return 'Layanan Pertunjukan Seni & Kirab Adat';
  }
  if (c.includes('attire')) {
    return 'Layanan Pendampingan Pakaian Pengantin';
  }
  if (c.includes('entertainment')) {
    return 'Layanan Hiburan Musik & Sound System';
  }
  if (c.includes('mc')) {
    return 'Layanan Pembawa Acara (Master of Ceremony)';
  }
  if (c.includes('dokumentasi')) {
    return 'Layanan Liputan Foto & Video Sinematik';
  }
  if (c.includes('parkir') || c.includes('security')) {
    return 'Layanan Tata Kelola Parkir & Keamanan Area';
  }
  return 'Layanan Profesional Pernikahan';
}

export const WeddingServicesSection: React.FC<WeddingServicesSectionProps> = ({
  onOpenDetail,
  onOpenPlanner,
  onOpenBudget,
}) => {
  const { products } = useWedding();
  const [selectedServiceFilter, setSelectedServiceFilter] = useState<string>('Semua');

  const serviceProducts = products.filter(
    (p) => p.isActive !== false && isWeddingServiceProduct(p)
  );

  const filteredServices = serviceProducts.filter((prod) => {
    if (selectedServiceFilter === 'Semua') return true;
    const cat = prod.category.toLowerCase();
    const filterLower = selectedServiceFilter.toLowerCase();
    return cat.includes(filterLower);
  });

  if (serviceProducts.length === 0) return null;

  return (
    <section
      id="layanan-wedding"
      className="py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto"
    >
      {/* Editorial Section Header */}
      <div className="max-w-3xl mx-auto text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-[#9E762C] font-semibold">
          Layanan Profesional Hari Bahagia
        </p>
        <h2 className="mt-2 heading-section-fluid font-serif-display font-semibold text-[#26211D] text-balance">
          Layanan Wedding Eksklusif ISTAFA Wedding
        </h2>
        <p className="mt-3 text-sm sm:text-base text-[#5C5147] leading-relaxed">
          Hadirkan kesempurnaan di setiap detik acara bersama layanan profesional{' '}
          <strong>MUA — Make Up Artist</strong>, <strong>WO — Wedding Organizer</strong>,{' '}
          <strong>Tim Sanggar</strong>, <strong>Tim Attire</strong>,{' '}
          <strong>Entertainment</strong>, <strong>MC</strong>, <strong>Dokumentasi</strong>,
          dan <strong>Parkir & Security Venue</strong> yang terintegrasi langsung dengan rencana
          pernikahan serta kalkulator budget Anda.
        </p>
        <FloralDivider className="mt-5" />
      </div>

      {/* Interactive Service Category Filter Tabs */}
      <div className="mt-7 sm:mt-8 flex items-center justify-start sm:justify-center gap-2 overflow-x-auto no-scrollbar pb-2">
        {[
          { label: 'Semua Layanan', value: 'Semua' },
          { label: 'MUA — Make Up Artist', value: 'mua' },
          { label: 'WO — Wedding Organizer', value: 'wo' },
          { label: 'Tim Sanggar', value: 'sanggar' },
          { label: 'Tim Attire', value: 'attire' },
          { label: 'Entertainment', value: 'entertainment' },
          { label: 'MC', value: 'mc' },
          { label: 'Dokumentasi', value: 'dokumentasi' },
          { label: 'Parkir & Security', value: 'parkir' },
        ].map((tab) => {
          const active = selectedServiceFilter === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => setSelectedServiceFilter(tab.value)}
              className={`px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                active
                  ? 'bg-[#26211D] text-[#FBF9F5] shadow-xs'
                  : 'bg-[#F4EFE4] text-[#5C4E3E] hover:bg-[#E8DEC8] hover:text-[#26211D] border border-[#E2D6C1]'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 2-Column Detailed Service Cards */}
      <div className="mt-6 sm:mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        {filteredServices.map((service) => (
          <WeddingServiceCard
            key={service.id}
            service={service}
            onOpenDetail={() => onOpenDetail(service)}
          />
        ))}
      </div>

      {/* Quick Integration Banner: Planner & Budget */}
      {(onOpenPlanner || onOpenBudget) && (
        <div className="mt-8 sm:mt-10 rounded-2xl border border-[#DFD3BE] bg-[#F6F1E6] p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <p className="text-sm sm:text-base font-serif-display font-semibold text-[#26211D]">
              Semua Layanan Terintegrasi Otomatis dengan Perencanaan Anda
            </p>
            <p className="text-xs text-[#6E6359] mt-0.5">
              Pilih layanan MUA, WO, Tim Sanggar, atau Tim Attire untuk dimasukkan langsung ke
              Rencana Pernikahan maupun Kalkulator Budget.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-center gap-2.5 w-full sm:w-auto shrink-0">
            {onOpenPlanner && (
              <button
                type="button"
                onClick={onOpenPlanner}
                className="w-full sm:w-auto justify-center px-4 py-2.5 rounded-xl bg-[#26211D] hover:bg-[#3A322C] text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#D9C7A3] shrink-0" />
                <span>Pilih di Rencana Pernikahan</span>
              </button>
            )}
            {onOpenBudget && (
              <button
                type="button"
                onClick={onOpenBudget}
                className="w-full sm:w-auto justify-center px-4 py-2.5 rounded-xl border border-[#C8B282] bg-white hover:bg-[#EFE6D5] text-[#26211D] text-xs font-medium flex items-center gap-1.5 cursor-pointer"
              >
                <Calculator className="w-3.5 h-3.5 text-[#9E762C] shrink-0" />
                <span>Hitung di Kalkulator Budget</span>
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

interface WeddingServiceCardProps {
  service: Product;
  onOpenDetail: () => void;
}

const WeddingServiceCard: React.FC<WeddingServiceCardProps> = ({
  service,
  onOpenDetail,
}) => {
  const {
    settings,
    isInWishlist,
    toggleWishlist,
    addToCart,
    applyProductToBudget,
  } = useWedding();

  const liked = isInWishlist(service.id);

  const images =
    service.images && service.images.length > 0
      ? service.images
      : [
          {
            id: 'fallback',
            url: '/src/assets/images/wedding_hero_pelaminan_1791077458144.jpg',
            isPrimary: true,
            caption: service.name,
          },
        ];

  const primaryIndex = images.findIndex((i) => i.isPrimary);
  const [activePhotoIdx, setActivePhotoIdx] = useState(
    primaryIndex >= 0 ? primaryIndex : 0
  );
  const currentImg = images[activePhotoIdx] || images[0];

  const isSanggar = service.category.toLowerCase().includes('sanggar');
  const hasDiscount =
    Boolean(service.originalPrice) && (service.originalPrice || 0) > service.price;

  const whatsappUrl = buildWhatsAppUrl(
    settings.whatsappNumber,
    buildProductWhatsAppMessage(
      service,
      service.variants?.[0],
      service.sizes?.[0]
    )
  );

  return (
    <article className="rounded-3xl border border-[#E2D6C1] bg-[#FCFBF8] hover:border-[#C8B282] transition-all shadow-xs overflow-hidden flex flex-col justify-between">
      <div>
        {/* Multi-Photo Gallery Frame */}
        <div className="relative aspect-[16/10] w-full bg-[#F2ECE1] overflow-hidden group">
          <SafeWeddingImage
            src={currentImg.url}
            alt={currentImg.caption || service.name}
            onClick={onOpenDetail}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 cursor-pointer"
          />

          {/* Top Left Promo & Availability Status */}
          <div className="absolute top-3.5 left-3.5 z-10 flex flex-wrap items-center gap-1.5">
            {(service.isPromo || service.promoLabel) && (
              <span className="px-3 py-1 rounded-lg bg-[#9E762C] text-white text-[11px] font-semibold tracking-wider uppercase shadow-xs">
                {service.promoLabel || 'Promo Layanan'}
              </span>
            )}
            <span
              className={`px-3 py-1 rounded-lg text-[11px] font-semibold tracking-wider uppercase backdrop-blur-xs ${
                service.isAvailable
                  ? 'bg-[#26211D]/85 text-[#D9C7A3]'
                  : 'bg-[#9E3B3B]/90 text-white'
              }`}
            >
              {service.stockStatus ||
                (service.isAvailable ? 'Tersedia' : 'Jadwal Penuh')}
            </span>
          </div>

          {/* Top Right Wishlist Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleWishlist(service);
            }}
            aria-label={liked ? 'Hapus dari Wishlist' : 'Simpan ke Wishlist'}
            className={`absolute top-3.5 right-3.5 z-10 w-9 h-9 rounded-full flex items-center justify-center shadow-sm transition-all cursor-pointer ${
              liked
                ? 'bg-[#FFF5F5] text-[#B85D5A] border border-[#E8B4B2]'
                : 'bg-white/90 hover:bg-white text-[#6E5A4F] border border-[#E5DAC5]'
            }`}
          >
            <Heart
              className={`w-4 h-4 ${
                liked ? 'fill-[#B85D5A] text-[#B85D5A]' : ''
              }`}
            />
          </button>

          {/* Bottom Caption & Photo Counter Scrim */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent p-4 flex items-end justify-between text-white">
            <div className="min-w-0 pr-2">
              <span className="text-[11px] uppercase tracking-widest text-[#E8D8B9] font-semibold block">
                {service.category}
              </span>
              <p className="text-xs sm:text-sm font-serif-display italic text-white/95 truncate">
                {currentImg.caption || service.name}
              </p>
            </div>
            <span className="text-[11px] text-white/90 font-tabular shrink-0">
              Galeri {activePhotoIdx + 1}/{images.length} Foto
            </span>
          </div>

          {/* Prev / Next Gallery Controls */}
          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActivePhotoIdx(
                    (prev) => (prev - 1 + images.length) % images.length
                  );
                }}
                aria-label="Foto layanan sebelumnya"
                className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/85 hover:bg-white text-[#26211D] flex items-center justify-center shadow-xs cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActivePhotoIdx((prev) => (prev + 1) % images.length);
                }}
                aria-label="Foto layanan selanjutnya"
                className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/85 hover:bg-white text-[#26211D] flex items-center justify-center shadow-xs cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {/* Multi-Photo Thumbnail Strip */}
        {images.length > 1 && (
          <div className="px-4 sm:px-6 pt-3 flex items-center gap-2 overflow-x-auto no-scrollbar">
            {images.map((img, idx) => (
              <button
                key={img.id || idx}
                type="button"
                onClick={() => setActivePhotoIdx(idx)}
                className={`w-14 h-10 rounded-lg overflow-hidden border shrink-0 transition-all cursor-pointer ${
                  idx === activePhotoIdx
                    ? 'border-[#9E762C] ring-1 ring-[#9E762C]'
                    : 'border-[#E2D6C1] opacity-65 hover:opacity-100'
                }`}
              >
                <SafeWeddingImage
                  src={img.url}
                  alt={img.caption || `Galeri ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}

        {/* Service Details Body */}
        <div className="p-4 sm:p-6 space-y-4">
          {/* Category Subtitle & Price */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-3 pb-3.5 border-b border-[#EAE0CE]">
            <div className="space-y-1 min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#8C7A65]">
                <span>{getServiceBadgeRole(service.category)}</span>
                <span aria-hidden="true">·</span>
                <span
                  className={
                    service.isAvailable
                      ? 'text-[#4E6752] font-semibold'
                      : 'text-[#9E3B3B] font-semibold'
                  }
                >
                  {service.stockStatus ||
                    (service.isAvailable ? 'Status Tersedia' : 'Penuh')}
                </span>
              </div>
              <h3
                onClick={onOpenDetail}
                className="text-xl sm:text-2xl font-serif-display font-semibold text-[#26211D] hover:text-[#9E762C] transition-colors cursor-pointer leading-snug"
              >
                {service.name}
              </h3>
            </div>

            <div className="text-left sm:text-right shrink-0">
              <span className="text-[11px] text-[#7A6E63] block">
                {service.priceLabel || 'Mulai dari'}
              </span>
              <div className="flex items-baseline sm:justify-end gap-2">
                {hasDiscount && (
                  <span className="text-xs text-[#9C8F80] line-through font-tabular">
                    {formatRupiah(service.originalPrice!)}
                  </span>
                )}
                <span className="text-xl sm:text-2xl font-serif-display font-bold text-[#9E762C] font-tabular">
                  {formatRupiah(service.price)}
                </span>
              </div>
              {service.unit && (
                <span className="text-[11px] text-[#7A6E63]">
                  Paket Layanan ({service.unit})
                </span>
              )}
            </div>
          </div>

          {/* Service Description */}
          <p className="text-xs sm:text-sm text-[#4A4036] leading-relaxed">
            {service.description}
          </p>

          {/* Jenis Pertunjukan / Pilihan Paket & Durasi (Especially highlighted for Tim Sanggar & Services) */}
          {((service.variants && service.variants.length > 0) ||
            (service.sizes && service.sizes.length > 0)) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {service.variants && service.variants.length > 0 && (
                <div className="p-3 rounded-xl bg-[#F6F1E6] border border-[#E6DEC8]">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8C6622] block">
                    {isSanggar ? 'Jenis Pertunjukan' : 'Pilihan Paket Layanan'}
                  </span>
                  <ul className="mt-1 space-y-1 text-xs text-[#26211D]">
                    {service.variants.map((v, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-[#9E762C]">•</span>
                        <span>{v}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {service.sizes && service.sizes.length > 0 && (
                <div className="p-3 rounded-xl bg-[#F6F1E6] border border-[#E6DEC8]">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8C6622] flex items-center gap-1">
                    <Clock className="w-3 h-3 text-[#9E762C]" />
                    <span>{isSanggar ? 'Durasi Pertunjukan' : 'Durasi & Cakupan Layanan'}</span>
                  </span>
                  <ul className="mt-1 space-y-1 text-xs text-[#26211D]">
                    {service.sizes.map((s, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-[#9E762C]">•</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Fasilitas yang Didapat */}
          {service.inclusions && service.inclusions.length > 0 && (
            <div className="p-4 rounded-2xl bg-[#F4EFE4] border border-[#E4DAC7] space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#5C4E3E] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#9E762C]" />
                <span>Fasilitas yang Didapat:</span>
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
                {service.inclusions.map((fasilitas, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-xs sm:text-sm text-[#26211D]"
                  >
                    <Check className="w-4 h-4 text-[#4E6752] shrink-0 mt-0.5" />
                    <span>{fasilitas}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons Footer: Detail, Cart/Plan, Budget & WhatsApp */}
      <div className="px-4 sm:px-6 pb-5 sm:pb-6 pt-3 border-t border-[#EFE8D8] space-y-2.5">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <button
            type="button"
            onClick={onOpenDetail}
            className="py-2.5 px-2.5 sm:px-3 rounded-xl border border-[#D8C8AE] bg-[#FAF6EE] hover:bg-[#EFE6D5] text-[#26211D] text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5 text-[#9E762C] shrink-0" />
            <span>Detail & Galeri</span>
          </button>

          <button
            type="button"
            onClick={() => addToCart(service, 1)}
            className="py-2.5 px-2.5 sm:px-3 rounded-xl bg-[#26211D] hover:bg-[#3A322C] text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-[#D9C7A3] shrink-0" />
            <span>+ Daftar Pilihan</span>
          </button>

          <button
            type="button"
            onClick={() => applyProductToBudget(service, 1)}
            className="col-span-2 sm:col-span-1 py-2.5 px-3 rounded-xl border border-[#C8B282] bg-[#FAF6EE] hover:bg-[#EFE6D5] text-[#26211D] text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Calculator className="w-3.5 h-3.5 text-[#9E762C] shrink-0" />
            <span>+ Hitung Budget</span>
          </button>
        </div>

        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-3 px-4 rounded-xl bg-[#4E6752] hover:bg-[#3F5543] text-white text-xs sm:text-sm font-medium flex items-center justify-center gap-2 transition-colors shadow-2xs text-center leading-snug"
        >
          <MessageCircle className="w-4 h-4 shrink-0" />
          <span>Konsultasi {service.category} via WhatsApp</span>
        </a>
      </div>
    </article>
  );
};
