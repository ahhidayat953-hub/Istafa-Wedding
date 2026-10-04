import React, { useState } from 'react';
import {
  BookOpen,
  Calendar,
  Clock,
  MapPin,
  MessageCircle,
  Sparkles,
  Tag,
  X,
} from 'lucide-react';
import { useWedding } from '../context/WeddingContext';
import { InspirationArticle } from '../types';
import {
  buildPromoWhatsAppMessage,
  buildWhatsAppUrl,
  formatRupiah,
} from '../utils/imageUtils';
import { FloralDivider } from './FloralOrnaments';
import { SafeWeddingImage } from './SafeWeddingImage';

// =============================================================================
// 1. PROMO SECTION (Requirement 14 — Active Deals with Automatic Expiry Check)
// =============================================================================
export const PromoSection: React.FC = () => {
  const { activePromos, settings } = useWedding();

  if (!activePromos || activePromos.length === 0) return null;

  return (
    <section id="promo-pernikahan" className="py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="max-w-2xl mx-auto text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-[#9E762C] font-medium">
          Penawaran Terbatas Bulan Ini
        </p>
        <h2 className="mt-2 heading-section-fluid font-serif-display font-semibold text-[#26211D] text-balance">
          Promo Spesial Pernikahan ISTAFA Wedding
        </h2>
        <p className="mt-3 text-sm sm:text-base text-[#5C5147]">
          Klaim harga spesial bundling dekorasi, tenda, undangan, dan dokumentasi selama periode promo masih berlangsung.
        </p>
        <FloralDivider className="mt-5" />
      </div>

      <div className="mt-8 sm:mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-7">
        {activePromos.map((promo) => {
          const savings = Math.max(0, promo.normalPrice - promo.promoPrice);
          const waUrl = buildWhatsAppUrl(
            settings.whatsappNumber,
            buildPromoWhatsAppMessage(promo)
          );

          return (
            <article
              key={promo.id}
              className="rounded-3xl border border-[#DFD3BE] bg-[#FCFBF8] overflow-hidden flex flex-col justify-between shadow-xs hover:border-[#9E762C] transition-all"
            >
              <div>
                <div className="relative aspect-[4/3] bg-[#F2ECE1] overflow-hidden">
                  <SafeWeddingImage
                    src={promo.imageUrl}
                    alt={promo.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-[#9E762C] text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm">
                    <Tag className="w-3.5 h-3.5 shrink-0" />
                    <span>{promo.badgeText || 'Promo Aktif'}</span>
                  </div>
                  <div className="absolute bottom-3 inset-x-3 px-3 py-1.5 rounded-xl bg-black/70 backdrop-blur-xs text-white text-[11px] flex flex-wrap items-center justify-between gap-1.5 font-tabular">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-[#D9C7A3] shrink-0" />
                      <span>Berlaku s/d {promo.endDate}</span>
                    </span>
                    {savings > 0 && (
                      <span className="text-[#E8D8B9] font-semibold">
                        Hemat {formatRupiah(savings)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-5 sm:p-6 space-y-3">
                  <h3 className="text-xl sm:text-2xl font-serif-display font-semibold text-[#26211D] leading-snug">
                    {promo.title}
                  </h3>

                  <div className="flex items-baseline gap-2.5 flex-wrap">
                    <span className="text-2xl font-serif-display font-bold text-[#9E762C] font-tabular">
                      {formatRupiah(promo.promoPrice)}
                    </span>
                    {promo.normalPrice > promo.promoPrice && (
                      <span className="text-xs text-[#8C7A65] line-through font-tabular">
                        {formatRupiah(promo.normalPrice)}
                      </span>
                    )}
                  </div>

                  <p className="text-xs sm:text-sm text-[#5C5147] leading-relaxed">
                    {promo.description}
                  </p>
                </div>
              </div>

              <div className="px-6 pb-6 pt-3 border-t border-[#EFE8D8]">
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 px-5 rounded-xl bg-[#4E6752] hover:bg-[#3F5543] text-white text-xs sm:text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Klaim Promo via WhatsApp</span>
                </a>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};

// =============================================================================
// 2. INSPIRATION ARTICLES SECTION (Requirement 15 — Blog / Guides & Checklist)
// =============================================================================
export const InspirationArticlesSection: React.FC = () => {
  const { articles, settings } = useWedding();
  const [selectedArticle, setSelectedArticle] = useState<InspirationArticle | null>(null);

  if (!articles || articles.length === 0) return null;

  return (
    <section
      id="artikel-inspirasi"
      className="py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto"
    >
      <div className="max-w-2xl mx-auto text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-[#9E762C] font-medium">
          Jurnal & Panduan Calon Pengantin
        </p>
        <h2 className="mt-2 heading-section-fluid font-serif-display font-semibold text-[#26211D] text-balance">
          Inspirasi & Tips Persiapan Pernikahan
        </h2>
        <p className="mt-3 text-sm sm:text-base text-[#5C5147]">
          Pelajari checklist persiapan pernikahan, tips memilih dekorasi & souvenir, hingga cara membagi budget pernikahan secara bijak.
        </p>
        <FloralDivider className="mt-5" />
      </div>

      <div className="mt-8 sm:mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
        {articles.map((art) => (
          <article
            key={art.id}
            onClick={() => setSelectedArticle(art)}
            className="group rounded-2xl border border-[#E5DAC5] bg-[#FCFBF8] hover:border-[#C8B282] overflow-hidden flex flex-col justify-between transition-all hover:-translate-y-1 hover:shadow-md cursor-pointer"
          >
            <div>
              <div className="aspect-[4/3] bg-[#F2ECE1] overflow-hidden">
                <SafeWeddingImage
                  src={art.imageUrl}
                  alt={art.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="p-5 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-[#9E762C] font-medium">
                  <span>{art.category}</span>
                  <span className="inline-flex items-center gap-1 text-[#7A6E63]">
                    <Clock className="w-3 h-3" />
                    <span>{art.readTime}</span>
                  </span>
                </div>
                <h3 className="font-serif-display font-semibold text-xl text-[#26211D] leading-snug group-hover:text-[#9E762C] transition-colors line-clamp-2">
                  {art.title}
                </h3>
                <p className="text-xs text-[#5C5147] leading-relaxed line-clamp-3">
                  {art.excerpt}
                </p>
              </div>
            </div>

            <div className="px-5 pb-5 pt-3 border-t border-[#EFE8D8] flex items-center justify-between text-xs font-medium text-[#26211D]">
              <span className="inline-flex items-center gap-1.5 text-[#9E762C]">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Baca Selengkapnya</span>
              </span>
              <span className="text-[11px] text-[#8C7A65]">{art.publishedDate}</span>
            </div>
          </article>
        ))}
      </div>

      {/* Article Reader Modal */}
      {selectedArticle && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-w-3xl w-full bg-[#FBF9F5] rounded-3xl border border-[#DFD3BE] shadow-2xl overflow-hidden my-auto max-h-[92dvh] flex flex-col">
            <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-[#FCFBF8] border-b border-[#EAE0CE] flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-[#9E762C] truncate">
                {selectedArticle.category} · {selectedArticle.readTime}
              </span>
              <button
                type="button"
                onClick={() => setSelectedArticle(null)}
                className="p-2 rounded-full hover:bg-[#EFE6D5] text-[#5C4E3E] cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 lg:p-8 overflow-y-auto space-y-5 sm:space-y-6">
              <div className="aspect-[16/9] rounded-2xl overflow-hidden bg-[#F2ECE1]">
                <SafeWeddingImage
                  src={selectedArticle.imageUrl}
                  alt={selectedArticle.title}
                  className="w-full h-full object-cover"
                />
              </div>

              <div>
                <h2 className="text-xl sm:text-3xl lg:text-4xl font-serif-display font-semibold text-[#26211D] leading-tight">
                  {selectedArticle.title}
                </h2>
                <p className="text-xs text-[#7A6E63] mt-2">
                  Diterbitkan oleh Tim Editorial {settings.businessName} ·{' '}
                  {selectedArticle.publishedDate}
                </p>
              </div>

              <div className="text-sm sm:text-base text-[#3D352E] leading-relaxed whitespace-pre-line">
                {selectedArticle.content}
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-[#F4EFE4] border border-[#E2D6C1] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                <div>
                  <p className="font-serif-display font-semibold text-lg text-[#26211D]">
                    Ingin Mewujudkan Konsep Ini di Hari Bahagia Anda?
                  </p>
                  <p className="text-xs text-[#6E6359]">
                    Diskusikan kebutuhan dekorasi, undangan, souvenir, dan budget gratis bersama tim kami.
                  </p>
                </div>
                <a
                  href={buildWhatsAppUrl(
                    settings.whatsappNumber,
                    `Halo ${settings.businessName}, saya baru membaca artikel "${selectedArticle.title}" dan ingin berkonsultasi mengenai persiapan pernikahan kami.`
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto justify-center px-5 py-2.5 rounded-xl bg-[#4E6752] hover:bg-[#3F5543] text-white text-xs font-medium flex items-center gap-2 shrink-0 whitespace-nowrap"
                >
                  <MessageCircle className="w-4 h-4 shrink-0" />
                  <span>Konsultasi via WhatsApp</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

// =============================================================================
// 3. SERVICE AREA SECTION (Requirement 16 — Wilayah Layanan ISTAFA Wedding)
// =============================================================================
export const ServiceAreaSection: React.FC = () => {
  const { serviceAreas, settings } = useWedding();

  if (!serviceAreas || serviceAreas.length === 0) return null;

  const areaWhatsAppUrl = buildWhatsAppUrl(
    settings.whatsappNumber,
    `Halo ${settings.businessName}, saya ingin menanyakan cakupan Area Layanan untuk lokasi acara pernikahan kami.`
  );

  return (
    <section id="area-layanan" className="py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="rounded-3xl border border-[#E4DAC7] bg-[#F5EFE4] p-5 sm:p-8 lg:p-12 space-y-6 sm:space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 sm:gap-6">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.2em] text-[#9E762C] font-medium flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span>Jangkauan Wilayah & Pengiriman</span>
            </p>
            <h2 className="mt-2 heading-section-fluid font-serif-display font-semibold text-[#26211D]">
              Area Layanan {settings.businessName}
            </h2>
            <p className="mt-2 text-sm sm:text-base text-[#5C5147]">
              Tim dekorator, teknisi tenda, dan dokumentasi kami siap melayani pemasangan langsung di lokasi acara Anda, serta pengiriman undangan & souvenir ke seluruh Indonesia.
            </p>
          </div>

          <a
            href={areaWhatsAppUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto justify-center self-start lg:self-auto px-6 py-3.5 rounded-xl bg-[#4E6752] hover:bg-[#3F5543] text-white text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-sm transition-colors whitespace-nowrap"
          >
            <MessageCircle className="w-4 h-4 shrink-0" />
            <span>Konsultasi Area Layanan</span>
          </a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {serviceAreas.map((area) => (
            <div
              key={area.id}
              className="p-5 rounded-2xl border border-[#E2D6C1] bg-[#FCFBF8] flex flex-col justify-between gap-3"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#9E762C]">
                    {area.province}
                  </span>
                  {area.isPrimary && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#4E6752]">
                      <Sparkles className="w-3 h-3" />
                      <span>Layanan Penuh</span>
                    </span>
                  )}
                </div>
                <h3 className="mt-1 font-serif-display font-semibold text-xl text-[#26211D]">
                  {area.city}
                </h3>
                <p className="mt-1.5 text-xs text-[#5C5147] leading-relaxed">
                  {area.description}
                </p>
              </div>

              <div className="pt-2.5 border-t border-[#EFE8D8]">
                <a
                  href={buildWhatsAppUrl(
                    settings.whatsappNumber,
                    `Halo ${settings.businessName}, saya ingin berkonsultasi untuk rencana pernikahan di wilayah ${area.city} (${area.province}).`
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-[#9E762C] hover:underline inline-flex items-center gap-1.5"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Tanyakan Jadwal Wilayah {area.city.split(' ')[0]}</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
