import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Expand, MessageCircle, X } from 'lucide-react';
import { useWedding } from '../context/WeddingContext';
import { GALLERY_CATEGORIES } from '../data/initialData';
import { GalleryItem } from '../types';
import { buildWhatsAppUrl } from '../utils/imageUtils';
import { FloralDivider } from './FloralOrnaments';
import { SafeWeddingImage } from './SafeWeddingImage';

export const InspirationGalleryView: React.FC = () => {
  const { gallery, settings } = useWedding();
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const filteredGallery =
    selectedCategory === 'Semua'
      ? gallery
      : gallery.filter(
          (item) => item.category.toLowerCase() === selectedCategory.toLowerCase()
        );

  const openLightbox = (idx: number) => {
    setLightboxIndex(idx);
  };

  const closeLightbox = () => {
    setLightboxIndex(null);
  };

  const currentItem: GalleryItem | null =
    lightboxIndex !== null && filteredGallery[lightboxIndex]
      ? filteredGallery[lightboxIndex]
      : null;

  return (
    <section className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="max-w-2xl mx-auto text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-[#9E762C] font-medium">
          Portofolio & Momen Abadi
        </p>
        <h2 className="mt-2 heading-section-fluid font-serif-display font-semibold text-[#26211D] text-balance">
          Inspirasi Pernikahan
        </h2>
        <p className="mt-3 text-sm sm:text-base text-[#5C5147] leading-relaxed">
          Jelajahi dokumentasi detail pelaminan, dekorasi bunga segar, tenda malam hari, meja tamu, undangan, souvenir, hingga mahar pernikahan.
        </p>
        <FloralDivider className="mt-6" />
      </div>

      {/* Interactive Filter Tabs (Functional Buttons) */}
      <div className="mt-8 flex items-center justify-start sm:justify-center gap-1.5 overflow-x-auto no-scrollbar pb-2">
        {GALLERY_CATEGORIES.map((cat) => {
          const isActive = selectedCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => {
                setSelectedCategory(cat);
                setLightboxIndex(null);
              }}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-[#26211D] text-[#FBF9F5] shadow-xs'
                  : 'bg-[#F3EDE0] text-[#5C4E3E] hover:bg-[#E8DEC8] hover:text-[#26211D]'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Masonry-style Editorial Grid */}
      {filteredGallery.length > 0 ? (
        <div className="mt-8 columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
          {filteredGallery.map((item, idx) => {
            const aspectClass =
              item.aspectType === 'portrait'
                ? 'aspect-[3/4]'
                : item.aspectType === 'square'
                ? 'aspect-square'
                : 'aspect-[4/3]';

            return (
              <div
                key={item.id}
                onClick={() => openLightbox(idx)}
                className="break-inside-avoid group relative rounded-2xl overflow-hidden border border-[#E5DAC5] bg-[#F4EFE4] cursor-pointer"
              >
                <div className={`w-full ${aspectClass} overflow-hidden`}>
                  <SafeWeddingImage
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </div>

                {/* Measured Scrim Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-5 text-white">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] uppercase tracking-widest text-[#E8D8B9]">
                      {item.category}
                    </span>
                    <Expand className="w-4 h-4 text-[#E8D8B9]" />
                  </div>
                  <h3 className="font-serif-display text-xl font-medium mt-1">
                    {item.title}
                  </h3>
                  <p className="text-xs text-white/85 mt-1 line-clamp-2">
                    {item.caption}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-12 rounded-2xl border border-[#E5DAC5] bg-[#FAF6EE] p-12 text-center">
          <p className="font-serif-display text-2xl text-[#26211D]">
            Belum ada foto pada kategori {selectedCategory}
          </p>
          <p className="text-sm text-[#6E6359] mt-1">
            Silakan pilih kategori lain atau tambahkan foto baru melalui Dashboard Admin.
          </p>
        </div>
      )}

      {/* Fullscreen Lightbox Modal */}
      {currentItem && lightboxIndex !== null && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between p-4 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3 text-white">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-widest text-[#D9C7A3] truncate">
                {currentItem.category} · {lightboxIndex + 1} dari {filteredGallery.length}
              </p>
              <h3 className="font-serif-display text-lg sm:text-2xl mt-0.5 truncate">
                {currentItem.title}
              </h3>
            </div>
            <button
              type="button"
              onClick={closeLightbox}
              className="px-3.5 sm:px-4 py-2 rounded-full bg-white/15 hover:bg-white/25 text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <X className="w-4 h-4 shrink-0" />
              <span>Tutup</span>
            </button>
          </div>

          <div className="relative flex-1 flex items-center justify-center my-4 overflow-hidden">
            <SafeWeddingImage
              src={currentItem.imageUrl}
              alt={currentItem.title}
              className="max-h-[72vh] max-w-full object-contain rounded-lg"
            />

            {filteredGallery.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setLightboxIndex(
                      (prev) =>
                        ((prev ?? 0) - 1 + filteredGallery.length) %
                        filteredGallery.length
                    )
                  }
                  className="absolute left-2 sm:left-6 w-11 h-11 rounded-full bg-white/20 hover:bg-white/35 text-white flex items-center justify-center cursor-pointer"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setLightboxIndex(
                      (prev) => ((prev ?? 0) + 1) % filteredGallery.length
                    )
                  }
                  className="absolute right-2 sm:right-6 w-11 h-11 rounded-full bg-white/20 hover:bg-white/35 text-white flex items-center justify-center cursor-pointer"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
          </div>

          <div className="max-w-2xl mx-auto w-full flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 pt-2 border-t border-white/15 text-white">
            <p className="text-xs sm:text-sm text-white/80 text-center sm:text-left">
              {currentItem.caption}
            </p>
            <a
              href={buildWhatsAppUrl(
                settings.whatsappNumber,
                `Halo, saya terinspirasi dengan foto galeri "${currentItem.title}" (Kategori: ${currentItem.category}). Saya ingin konsultasi untuk konsep pernikahan serupa.`
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto justify-center px-4 py-2.5 rounded-xl bg-[#4E6752] hover:bg-[#3F5543] text-white text-xs font-medium flex items-center gap-2 shrink-0 whitespace-nowrap"
            >
              <MessageCircle className="w-4 h-4 shrink-0" />
              <span>Tanyakan Konsep Ini via WhatsApp</span>
            </a>
          </div>
        </div>
      )}
    </section>
  );
};
