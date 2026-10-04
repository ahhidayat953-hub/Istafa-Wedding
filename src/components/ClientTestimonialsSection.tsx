import React, { useState } from 'react';
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Expand,
  MessageCircle,
  Quote,
  Star,
  X,
} from 'lucide-react';
import { useWedding } from '../context/WeddingContext';
import { Testimonial } from '../types';
import { buildWhatsAppUrl } from '../utils/imageUtils';
import { FloralDivider } from './FloralOrnaments';
import { SafeWeddingImage } from './SafeWeddingImage';

export const ClientTestimonialsSection: React.FC = () => {
  const { testimonials, settings } = useWedding();
  const [activeLightboxTesti, setActiveLightboxTesti] = useState<Testimonial | null>(null);
  const [lightboxPhotoIdx, setLightboxPhotoIdx] = useState(0);

  if (!testimonials || testimonials.length === 0) return null;

  return (
    <section className="py-14 sm:py-20 px-4 sm:px-8 max-w-7xl mx-auto">
      {/* Section Header */}
      <div className="max-w-2xl mx-auto text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-[#9E762C] font-medium">
          Cerita Bahagia & Bukti Nyata
        </p>
        <h2 className="mt-2 text-3xl sm:text-4xl lg:text-5xl font-serif-display font-semibold text-[#26211D] text-balance">
          Testimoni & Dokumentasi Pernikahan Klien
        </h2>
        <p className="mt-3 text-sm sm:text-base text-[#5C5147] leading-relaxed">
          Kepercayaan setiap pasangan adalah kehormatan bagi {settings.businessName}. Lihat langsung ulasan pengantin beserta dokumentasi foto acara pernikahan mereka.
        </p>

        {/* Quantitative Social Proof Summary */}
        <div className="mt-5 inline-flex flex-wrap items-center justify-center gap-3 text-xs sm:text-sm text-[#4A4036]">
          <span className="inline-flex items-center gap-1 font-semibold text-[#26211D] font-tabular">
            <Star className="w-4 h-4 fill-[#C8A25A] text-[#C8A25A]" />
            <span>5.0 / 5.0 Rating Kepuasan</span>
          </span>
          <span aria-hidden="true">·</span>
          <span className="font-tabular">350+ Dokumentasi Pernikahan</span>
          <span aria-hidden="true">·</span>
          <span>Ulasan Pengantin Terverifikasi</span>
        </div>

        <FloralDivider className="mt-6" />
      </div>

      {/* Testimonials & Documentation Cards Grid */}
      <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {testimonials.map((item) => (
          <TestimonialCard
            key={item.id}
            item={item}
            whatsappNumber={settings.whatsappNumber}
            onOpenLightbox={(photoIdx) => {
              setActiveLightboxTesti(item);
              setLightboxPhotoIdx(photoIdx);
            }}
          />
        ))}
      </div>

      {/* Fullscreen Documentation Lightbox Modal */}
      {activeLightboxTesti && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between p-4 sm:p-8">
          <div className="flex items-center justify-between text-white">
            <div>
              <p className="text-xs text-[#D9C7A3] font-tabular">
                Dokumentasi Pernikahan {activeLightboxTesti.coupleName} · Foto{' '}
                {lightboxPhotoIdx + 1} / {activeLightboxTesti.images.length}
              </p>
              <h4 className="font-serif-display text-lg sm:text-2xl">
                {activeLightboxTesti.images[lightboxPhotoIdx]?.caption ||
                  activeLightboxTesti.packageTaken}
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setActiveLightboxTesti(null)}
              className="px-4 py-2 rounded-full bg-white/15 hover:bg-white/25 text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>Tutup Dokumentasi</span>
            </button>
          </div>

          <div className="relative flex-1 flex items-center justify-center my-4 overflow-hidden">
            <SafeWeddingImage
              src={activeLightboxTesti.images[lightboxPhotoIdx]?.url || ''}
              alt={activeLightboxTesti.coupleName}
              className="max-h-[72vh] max-w-full object-contain rounded-lg"
            />
            {activeLightboxTesti.images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setLightboxPhotoIdx(
                      (prev) =>
                        (prev - 1 + activeLightboxTesti.images.length) %
                        activeLightboxTesti.images.length
                    )
                  }
                  className="absolute left-2 sm:left-6 w-11 h-11 rounded-full bg-white/20 hover:bg-white/35 text-white flex items-center justify-center cursor-pointer"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setLightboxPhotoIdx(
                      (prev) => (prev + 1) % activeLightboxTesti.images.length
                    )
                  }
                  className="absolute right-2 sm:right-6 w-11 h-11 rounded-full bg-white/20 hover:bg-white/35 text-white flex items-center justify-center cursor-pointer"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
          </div>

          <div className="max-w-3xl mx-auto w-full space-y-3 pt-3 border-t border-white/15">
            <div className="flex items-center justify-center gap-2 overflow-x-auto no-scrollbar">
              {activeLightboxTesti.images.map((img, idx) => (
                <button
                  key={img.id || idx}
                  type="button"
                  onClick={() => setLightboxPhotoIdx(idx)}
                  className={`w-16 h-12 rounded-lg overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
                    idx === lightboxPhotoIdx
                      ? 'border-[#D9C7A3] scale-105'
                      : 'border-transparent opacity-50'
                  }`}
                >
                  <SafeWeddingImage
                    src={img.url}
                    alt={img.caption || `Foto ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-white">
              <p className="text-xs text-white/80 italic text-center sm:text-left line-clamp-2">
                "{activeLightboxTesti.review}" — {activeLightboxTesti.coupleName}
              </p>
              <a
                href={buildWhatsAppUrl(
                  settings.whatsappNumber,
                  `Halo ${settings.businessName}, saya melihat dokumentasi & testimoni pernikahan ${activeLightboxTesti.coupleName} (${activeLightboxTesti.packageTaken}). Saya ingin berkonsultasi untuk konsep serupa.`
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-xl bg-[#4E6752] hover:bg-[#3F5543] text-white text-xs font-medium flex items-center gap-2 shrink-0 whitespace-nowrap"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Konsultasi Konsep Serupa</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

interface TestimonialCardProps {
  item: Testimonial;
  whatsappNumber: string;
  onOpenLightbox: (index: number) => void;
}

const TestimonialCard: React.FC<TestimonialCardProps> = ({
  item,
  whatsappNumber,
  onOpenLightbox,
}) => {
  const images =
    item.images && item.images.length > 0
      ? item.images
      : [
          {
            id: 'fallback',
            url: '/src/assets/images/wedding_hero_pelaminan_1791077458144.jpg',
            isPrimary: true,
            caption: `Dokumentasi ${item.coupleName}`,
          },
        ];

  const primaryIdx = images.findIndex((i) => i.isPrimary);
  const [photoIdx, setPhotoIdx] = useState(primaryIdx >= 0 ? primaryIdx : 0);
  const activeImg = images[photoIdx] || images[0];

  const starCount = Math.max(1, Math.min(5, Math.round(item.rating || 5)));

  return (
    <article className="rounded-3xl border border-[#E5DAC5] bg-[#FCFBF8] overflow-hidden flex flex-col justify-between shadow-xs hover:border-[#C8B282] transition-all">
      <div>
        {/* Documentation Photo Gallery Header */}
        <div className="relative aspect-[4/3] w-full bg-[#F2ECE1] overflow-hidden group">
          <SafeWeddingImage
            src={activeImg.url}
            alt={activeImg.caption || item.coupleName}
            onClick={() => onOpenLightbox(photoIdx)}
            className="w-full h-full object-cover cursor-zoom-in transition-transform duration-500 group-hover:scale-105"
          />

          {/* Measured Scrim with Documentation Badge */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent p-4 flex items-end justify-between text-white">
            <div className="min-w-0 pr-2">
              <div className="flex items-center gap-1.5 text-[11px] text-[#E8D8B9] font-tabular">
                <Camera className="w-3.5 h-3.5" />
                <span>
                  Dokumentasi {photoIdx + 1} / {images.length} Foto
                </span>
              </div>
              <p className="text-xs sm:text-sm font-serif-display italic truncate mt-0.5">
                {activeImg.caption || item.coupleName}
              </p>
            </div>

            <button
              type="button"
              onClick={() => onOpenLightbox(photoIdx)}
              className="px-2.5 py-1 rounded-lg bg-white/90 hover:bg-white text-[#26211D] text-[11px] font-medium flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <Expand className="w-3 h-3" />
              <span>Buka Album</span>
            </button>
          </div>

          {/* Next/Prev arrows for multi-photo documentation */}
          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={() =>
                  setPhotoIdx((prev) => (prev - 1 + images.length) % images.length)
                }
                aria-label="Foto dokumentasi sebelumnya"
                className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/85 hover:bg-white text-[#26211D] flex items-center justify-center shadow-xs cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setPhotoIdx((prev) => (prev + 1) % images.length)}
                aria-label="Foto dokumentasi selanjutnya"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/85 hover:bg-white text-[#26211D] flex items-center justify-center shadow-xs cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {/* Mini Documentation Thumbnail Strip */}
        {images.length > 1 && (
          <div className="px-5 pt-3 flex items-center gap-2 overflow-x-auto no-scrollbar">
            {images.map((img, idx) => (
              <button
                key={img.id || idx}
                type="button"
                onClick={() => setPhotoIdx(idx)}
                className={`w-12 h-9 rounded-lg overflow-hidden border shrink-0 transition-all cursor-pointer ${
                  idx === photoIdx
                    ? 'border-[#9E762C] ring-1 ring-[#9E762C]'
                    : 'border-[#E2D6C1] opacity-60 hover:opacity-100'
                }`}
              >
                <SafeWeddingImage
                  src={img.url}
                  alt={img.caption || `Dok ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}

        {/* Review Body */}
        <div className="p-6 space-y-3.5">
          {/* Star Rating Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1" aria-label={`Rating ${starCount} dari 5 bintang`}>
              {Array.from({ length: 5 }).map((_, idx) => (
                <Star
                  key={idx}
                  className={`w-4 h-4 ${
                    idx < starCount
                      ? 'fill-[#C8A25A] text-[#C8A25A]'
                      : 'text-[#DFD3BE]'
                  }`}
                />
              ))}
              <span className="ml-1.5 text-xs font-semibold text-[#26211D] font-tabular">
                {starCount}.0
              </span>
            </div>
            <Quote className="w-5 h-5 text-[#D8C8AE]" />
          </div>

          {/* Client Review Quote */}
          <p className="text-xs sm:text-sm text-[#4A4036] leading-relaxed italic">
            "{item.review}"
          </p>
        </div>
      </div>

      {/* Couple Attribution & Metadata Footer */}
      <div className="px-6 pb-6 pt-3 border-t border-[#EFE8D8] flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-serif-display font-semibold text-xl text-[#26211D] truncate">
            {item.coupleName}
          </h3>
          {/* Clean unboxed metadata with middle-dot separators */}
          <p className="text-[11px] text-[#6E6359] truncate">
            {item.packageTaken} · {item.venue} · {item.eventDate}
          </p>
        </div>

        <a
          href={buildWhatsAppUrl(
            whatsappNumber,
            `Halo, saya tertarik dengan hasil dokumentasi dan paket pernikahan seperti acara ${item.coupleName} (${item.packageTaken}). Saya ingin berkonsultasi.`
          )}
          target="_blank"
          rel="noopener noreferrer"
          title="Tanyakan konsep pernikahan ini via WhatsApp"
          className="p-2.5 rounded-xl bg-[#F0F4F1] hover:bg-[#E1ECE3] text-[#3F5543] shrink-0 transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
        </a>
      </div>
    </article>
  );
};
