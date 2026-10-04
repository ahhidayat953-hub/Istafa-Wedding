import React, { useState } from 'react';
import {
  Calculator,
  Check,
  ChevronLeft,
  ChevronRight,
  Expand,
  MessageCircle,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { useWedding } from '../context/WeddingContext';
import { WeddingPackage } from '../types';
import {
  buildPackageWhatsAppMessage,
  buildWhatsAppUrl,
  formatRupiah,
} from '../utils/imageUtils';
import { FloralDivider } from './FloralOrnaments';
import { SafeWeddingImage } from './SafeWeddingImage';

interface WeddingPackagesViewProps {
  onOpenPlanner?: () => void;
}

export const WeddingPackagesView: React.FC<WeddingPackagesViewProps> = ({
  onOpenPlanner,
}) => {
  const { packages, settings, updateBudgetAllocation } = useWedding();
  const activePackages = packages.filter((pkg) => pkg.isActive !== false);
  const [selectedPkgForGallery, setSelectedPkgForGallery] = useState<WeddingPackage | null>(null);
  const [galleryPhotoIdx, setGalleryPhotoIdx] = useState(0);
  const [budgetAppliedToast, setBudgetAppliedToast] = useState<string | null>(null);

  const handleApplyPackageToBudget = (pkg: WeddingPackage) => {
    // Distribute package value intelligently across the budget calculator
    updateBudgetAllocation({
      dekorasi: Math.round(pkg.price * 0.45),
      dokumentasi: Math.round(pkg.price * 0.2),
      makeup: Math.round(pkg.price * 0.1),
      busana: Math.round(pkg.price * 0.1),
      undangan: Math.round(pkg.price * 0.05),
      souvenir: Math.round(pkg.price * 0.05),
      mahar: Math.round(pkg.price * 0.05),
    });
    setBudgetAppliedToast(pkg.name);
    setTimeout(() => setBudgetAppliedToast(null), 3000);
  };

  return (
    <section className="py-12 sm:py-16 px-4 sm:px-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="max-w-2xl mx-auto text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-[#9E762C] font-medium">
          Paket Hemat · Paket Elegant · Paket Premium · Paket Custom
        </p>
        <h2 className="mt-2 text-3xl sm:text-4xl lg:text-5xl font-serif-display font-semibold text-[#26211D] text-balance">
          Paket Pernikahan Lengkap
        </h2>
        <p className="mt-3 text-sm sm:text-base text-[#5C5147] leading-relaxed">
          Pilih paket pernikahan sesuai kapasitas tamu dan impian Anda — mulai dari Paket Hemat, Paket Elegant, Paket Premium, hingga Paket Custom yang fleksibel.
        </p>
        <FloralDivider className="mt-6" />
      </div>

      {budgetAppliedToast && (
        <div className="mt-6 max-w-md mx-auto rounded-xl bg-[#EEF5F0] border border-[#BBD2C1] px-4 py-3 text-center text-xs font-medium text-[#35543D]">
          ✓ Estimasi <strong>{budgetAppliedToast}</strong> berhasil dimasukkan ke Kalkulator Budget Pernikahan!
        </div>
      )}

      {/* Packages Grid */}
      <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {activePackages.map((pkg) => (
          <PackageCardItem
            key={pkg.id}
            pkg={pkg}
            whatsappNumber={settings.whatsappNumber}
            onApplyToBudget={() => handleApplyPackageToBudget(pkg)}
            onOpenPlanner={onOpenPlanner}
            onOpenLightbox={(photoIdx) => {
              setSelectedPkgForGallery(pkg);
              setGalleryPhotoIdx(photoIdx);
            }}
          />
        ))}
      </div>

      {/* Lightbox Modal for Package Multi-Photo Gallery */}
      {selectedPkgForGallery && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between p-4 sm:p-8">
          <div className="flex items-center justify-between text-white">
            <div>
              <p className="text-xs text-[#D9C7A3] font-tabular">
                {selectedPkgForGallery.name} · Foto {galleryPhotoIdx + 1} /{' '}
                {selectedPkgForGallery.images.length}
              </p>
              <h4 className="font-serif-display text-lg sm:text-xl">
                {selectedPkgForGallery.images[galleryPhotoIdx]?.caption ||
                  selectedPkgForGallery.name}
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setSelectedPkgForGallery(null)}
              className="px-4 py-2 rounded-full bg-white/15 hover:bg-white/25 text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>Tutup Galeri Paket</span>
            </button>
          </div>

          <div className="relative flex-1 flex items-center justify-center my-4 overflow-hidden">
            <SafeWeddingImage
              src={selectedPkgForGallery.images[galleryPhotoIdx]?.url || ''}
              alt={selectedPkgForGallery.name}
              className="max-h-[74vh] max-w-full object-contain rounded-lg"
            />
            {selectedPkgForGallery.images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setGalleryPhotoIdx(
                      (prev) =>
                        (prev - 1 + selectedPkgForGallery.images.length) %
                        selectedPkgForGallery.images.length
                    )
                  }
                  className="absolute left-2 sm:left-6 w-11 h-11 rounded-full bg-white/20 hover:bg-white/35 text-white flex items-center justify-center cursor-pointer"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setGalleryPhotoIdx(
                      (prev) => (prev + 1) % selectedPkgForGallery.images.length
                    )
                  }
                  className="absolute right-2 sm:right-6 w-11 h-11 rounded-full bg-white/20 hover:bg-white/35 text-white flex items-center justify-center cursor-pointer"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
          </div>

          <div className="flex items-center justify-center gap-2.5 overflow-x-auto no-scrollbar py-2">
            {selectedPkgForGallery.images.map((img, idx) => (
              <button
                key={img.id || idx}
                type="button"
                onClick={() => setGalleryPhotoIdx(idx)}
                className={`w-16 h-12 sm:w-20 sm:h-14 rounded-lg overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
                  idx === galleryPhotoIdx
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
        </div>
      )}
    </section>
  );
};

interface PackageCardItemProps {
  pkg: WeddingPackage;
  whatsappNumber: string;
  onOpenLightbox: (index: number) => void;
  onApplyToBudget: () => void;
  onOpenPlanner?: () => void;
}

const PackageCardItem: React.FC<PackageCardItemProps> = ({
  pkg,
  whatsappNumber,
  onOpenLightbox,
  onApplyToBudget,
  onOpenPlanner,
}) => {
  const images =
    pkg.images && pkg.images.length > 0
      ? pkg.images
      : [
          {
            id: 'fallback',
            url: '/src/assets/images/wedding_hero_pelaminan_1791077458144.jpg',
            isPrimary: true,
            caption: pkg.name,
          },
        ];

  const primaryIndex = images.findIndex((i) => i.isPrimary);
  const [activePhotoIdx, setActivePhotoIdx] = useState(primaryIndex >= 0 ? primaryIndex : 0);
  const currentImg = images[activePhotoIdx] || images[0];

  const whatsappUrl = buildWhatsAppUrl(whatsappNumber, buildPackageWhatsAppMessage(pkg));

  return (
    <article
      className={`rounded-3xl border transition-all overflow-hidden flex flex-col justify-between ${
        pkg.isPopular
          ? 'border-[#B68D40] bg-[#FDFBF7] shadow-md'
          : 'border-[#E5DAC5] bg-[#FCFBF8]'
      }`}
    >
      <div>
        {/* Package Multi-Photo Interactive Header */}
        <div className="relative aspect-[16/10] w-full bg-[#F2ECE1] overflow-hidden group">
          <SafeWeddingImage
            src={currentImg.url}
            alt={currentImg.caption || pkg.name}
            onClick={() => onOpenLightbox(activePhotoIdx)}
            className="w-full h-full object-cover cursor-zoom-in transition-transform duration-500 group-hover:scale-105"
          />

          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent p-4 flex items-end justify-between text-white">
            <div>
              <p className="text-xs text-[#E8D8B9] font-tabular">
                {pkg.tier} · Foto {activePhotoIdx + 1} dari {images.length}
              </p>
              <p className="text-sm font-serif-display italic">
                {currentImg.caption || pkg.name}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenLightbox(activePhotoIdx)}
              className="px-2.5 py-1 rounded-md bg-white/90 text-[#26211D] text-xs font-medium flex items-center gap-1 cursor-pointer"
            >
              <Expand className="w-3 h-3" />
              <span>Perbesar</span>
            </button>
          </div>

          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={() =>
                  setActivePhotoIdx((prev) => (prev - 1 + images.length) % images.length)
                }
                className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/85 hover:bg-white text-[#26211D] flex items-center justify-center shadow-xs cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setActivePhotoIdx((prev) => (prev + 1) % images.length)}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/85 hover:bg-white text-[#26211D] flex items-center justify-center shadow-xs cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {/* Thumbnail strip for package photos */}
        {images.length > 1 && (
          <div className="px-5 pt-3 flex items-center gap-2 overflow-x-auto no-scrollbar">
            {images.map((img, i) => (
              <button
                key={img.id || i}
                type="button"
                onClick={() => setActivePhotoIdx(i)}
                className={`w-14 h-10 rounded-lg overflow-hidden border shrink-0 transition-all cursor-pointer ${
                  i === activePhotoIdx
                    ? 'border-[#9E762C] ring-1 ring-[#9E762C]'
                    : 'border-[#E2D6C1] opacity-60 hover:opacity-100'
                }`}
              >
                <SafeWeddingImage
                  src={img.url}
                  alt={img.caption || `Thumb ${i + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}

        {/* Package Content */}
        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#6E6359]">
            <span className="uppercase tracking-widest font-semibold text-[#9E762C]">
              {pkg.tier}
            </span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-[#7C6A56]" />
              {pkg.guestCapacity}
            </span>
            {pkg.isPopular && (
              <>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 font-semibold text-[#9E762C]">
                  <Sparkles className="w-3.5 h-3.5" />
                  Pilihan Terfavorit
                </span>
              </>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-baseline justify-between gap-4 pb-4 border-b border-[#EAE0CE]">
            <h3 className="text-2xl sm:text-3xl font-serif-display font-semibold text-[#26211D]">
              {pkg.name}
            </h3>
            <div className="text-right">
              <span className="text-xs text-[#6E6359] block">Investasi Paket Lengkap</span>
              {pkg.originalPrice && pkg.originalPrice > pkg.price && (
                <span className="text-xs text-[#8E8071] line-through font-tabular mr-2">
                  {formatRupiah(pkg.originalPrice)}
                </span>
              )}
              <span className="text-2xl sm:text-3xl font-serif-display font-semibold text-[#9E762C] font-tabular">
                {formatRupiah(pkg.price)}
              </span>
            </div>
          </div>

          <p className="mt-4 text-sm text-[#4A4036] leading-relaxed">{pkg.description}</p>

          {/* Inclusions */}
          <div className="mt-5 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#5C4E3E]">
              Isi Paket ({pkg.inclusions.length} Item):
            </p>
            <ul className="grid grid-cols-1 gap-2 pt-1">
              {pkg.inclusions.map((inc, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-[#2F2923]">
                  <Check className="w-4 h-4 text-[#5B705E] shrink-0 mt-0.5" />
                  <span>{inc}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="px-6 sm:px-8 pb-6 sm:pb-8 pt-2 space-y-2.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onApplyToBudget}
            className="py-2.5 px-3.5 rounded-xl border border-[#D8C8AE] bg-[#FAF6EE] hover:bg-[#EFE6D5] text-[#26211D] text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Calculator className="w-3.5 h-3.5 text-[#9E762C]" />
            <span>Simulasikan di Budget</span>
          </button>
          {onOpenPlanner && (
            <button
              type="button"
              onClick={onOpenPlanner}
              className="py-2.5 px-3.5 rounded-xl border border-[#D8C8AE] bg-[#FAF6EE] hover:bg-[#EFE6D5] text-[#26211D] text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#9E762C]" />
              <span>Kustomisasi di Planner</span>
            </button>
          )}
        </div>
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-3.5 px-5 rounded-xl bg-[#4E6752] hover:bg-[#3F5543] text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors shadow-xs whitespace-nowrap"
        >
          <MessageCircle className="w-4 h-4" />
          <span>Pesan / Konsultasi {pkg.name} via WhatsApp</span>
        </a>
      </div>
    </article>
  );
};
