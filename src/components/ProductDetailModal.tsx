import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Calculator,
  Check,
  ChevronLeft,
  ChevronRight,
  Expand,
  Heart,
  MessageCircle,
  Minus,
  Plus,
  ShoppingBag,
  Sparkles,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useWedding } from '../context/WeddingContext';
import { Product } from '../types';
import {
  buildProductWhatsAppMessage,
  buildWhatsAppUrl,
  formatRupiah,
} from '../utils/imageUtils';
import { SafeWeddingImage } from './SafeWeddingImage';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
  onSelectRelatedProduct?: (product: Product) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  onClose,
  onSelectRelatedProduct,
}) => {
  const {
    settings,
    products,
    isInWishlist,
    toggleWishlist,
    addToCart,
    applyProductToBudget,
    trackProductInterest,
  } = useWedding();
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [isFullscreenLightbox, setIsFullscreenLightbox] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);

  useEffect(() => {
    if (product) {
      const primaryIdx = product.images.findIndex((img) => img.isPrimary);
      setActiveIndex(primaryIdx >= 0 ? primaryIdx : 0);
      setSelectedVariant(product.variants?.[0] || '');
      setSelectedSize(product.sizes?.[0] || '');
      setQuantity(product.unit?.toLowerCase() === 'pcs' ? 300 : 1);
      setIsFullscreenLightbox(false);
      setIsZoomed(false);
    }
  }, [product]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!product) return;
      if (e.key === 'Escape') {
        if (isFullscreenLightbox) {
          setIsFullscreenLightbox(false);
          setIsZoomed(false);
        } else {
          onClose();
        }
      } else if (e.key === 'ArrowRight') {
        setActiveIndex((prev) => (prev + 1) % Math.max(1, product.images.length));
      } else if (e.key === 'ArrowLeft') {
        setActiveIndex(
          (prev) =>
            (prev - 1 + Math.max(1, product.images.length)) %
            Math.max(1, product.images.length)
        );
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [product, isFullscreenLightbox, onClose]);

  if (!product) return null;

  const images =
    product.images && product.images.length > 0
      ? product.images
      : [
          {
            id: 'fallback',
            url: '/images/wedding_hero_pelaminan_1791077458144.jpg',
            isPrimary: true,
            caption: product.name,
          },
        ];

  const currentImage = images[activeIndex] || images[0];
  const whatsappMessage = buildProductWhatsAppMessage(
    product,
    selectedVariant,
    selectedSize
  );
  const whatsappUrl = buildWhatsAppUrl(settings.whatsappNumber, whatsappMessage);
  const liked = isInWishlist(product.id);

  const relatedProducts = products
    .filter(
      (p) =>
        p.id !== product.id &&
        p.isActive !== false &&
        p.category === product.category
    )
    .slice(0, 3);

  const hasDiscount =
    Boolean(product.originalPrice) && (product.originalPrice || 0) > product.price;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-0 sm:p-4 md:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      {/* Main Detail Sheet */}
      <div className="relative w-full max-w-6xl bg-[#FBF9F5] sm:rounded-3xl border border-[#DFD3BE] shadow-2xl overflow-hidden my-auto max-h-[100dvh] sm:max-h-[92vh] flex flex-col">
        {/* Top Sticky Header Bar */}
        <div className="sticky top-0 z-20 flex items-center justify-between gap-2 px-4 sm:px-8 py-3.5 sm:py-4 bg-[#FBF9F5]/95 backdrop-blur-md border-b border-[#EAE0CE]">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium text-[#5C4E3E] hover:text-[#26211D] transition-colors cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-4 h-4 shrink-0" />
            <span>Kembali ke Katalog</span>
          </button>

          <div className="hidden min-[420px]:flex items-center gap-1.5 text-xs text-[#8C7A65] min-w-0 truncate">
            <span className="truncate">{product.category}</span>
            <span className="shrink-0">·</span>
            <span className="font-tabular shrink-0">{images.length} Foto Detail</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup detail produk"
            className="p-2 rounded-full hover:bg-[#EFE6D5] text-[#5C4E3E] transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Container */}
        <div className="overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-8 sm:space-y-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
            {/* LEFT COLUMN: Multi-Photo Gallery & Horizontal Thumbnails */}
            <div className="lg:col-span-7 space-y-3.5 min-w-0">
              <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden bg-[#F0EAE1] border border-[#E5DAC5] group">
                <SafeWeddingImage
                  src={currentImage.url}
                  alt={currentImage.caption || product.name}
                  className="w-full h-full object-cover transition-transform duration-500 cursor-zoom-in"
                  onClick={() => setIsFullscreenLightbox(true)}
                />

                {/* Top Counter & Fullscreen Trigger */}
                <div className="absolute top-3 inset-x-3 flex items-center justify-between gap-2 pointer-events-none">
                  <span className="px-2.5 sm:px-3 py-1 rounded-full bg-black/55 backdrop-blur-xs text-white text-[11px] sm:text-xs font-medium font-tabular">
                    Foto {activeIndex + 1} / {images.length}
                  </span>

                  <button
                    type="button"
                    onClick={() => setIsFullscreenLightbox(true)}
                    className="pointer-events-auto px-2.5 sm:px-3 py-1.5 rounded-full bg-white/90 hover:bg-white text-[#26211D] text-[11px] sm:text-xs font-medium flex items-center gap-1.5 shadow-sm transition-transform hover:scale-105 cursor-pointer"
                  >
                    <Expand className="w-3.5 h-3.5 text-[#9E762C] shrink-0" />
                    <span>Layar Penuh & Zoom</span>
                  </button>
                </div>

                {/* Previous / Next Buttons */}
                {images.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        setActiveIndex((prev) => (prev - 1 + images.length) % images.length)
                      }
                      aria-label="Foto sebelumnya"
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 hover:bg-white text-[#26211D] shadow-md flex items-center justify-center transition-transform active:scale-95 cursor-pointer"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveIndex((prev) => (prev + 1) % images.length)}
                      aria-label="Foto selanjutnya"
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 hover:bg-white text-[#26211D] shadow-md flex items-center justify-center transition-transform active:scale-95 cursor-pointer"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}

                {/* Caption Scrim */}
                {currentImage.caption && (
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/75 via-black/40 to-transparent p-4 pt-8 text-white">
                    <p className="text-xs sm:text-sm font-medium">
                      {currentImage.caption}
                    </p>
                  </div>
                )}
              </div>

              {/* Horizontal Scrollable Thumbnail Strip */}
              <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar pb-1">
                {images.map((img, idx) => {
                  const isSelected = idx === activeIndex;
                  return (
                    <button
                      key={img.id || idx}
                      type="button"
                      onClick={() => setActiveIndex(idx)}
                      className={`relative shrink-0 w-20 h-16 sm:w-24 sm:h-18 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#9E762C] ring-2 ring-[#9E762C]/30 scale-[1.02]'
                          : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                    >
                      <SafeWeddingImage
                        src={img.url}
                        alt={img.caption || `Thumbnail ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* RIGHT COLUMN: Product Information, Options, Cart, Budget & WhatsApp CTA */}
            <div className="lg:col-span-5 space-y-5">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#8C7A65] uppercase tracking-widest">
                  <span>{product.category}</span>
                  <span>·</span>
                  <span
                    className={
                      product.isAvailable
                        ? 'text-[#4E6752] font-semibold'
                        : 'text-[#A65A5A] font-semibold'
                    }
                  >
                    {product.stockStatus ||
                      (product.isAvailable ? 'Tersedia untuk Tanggal Anda' : 'Jadwal Penuh')}
                  </span>
                  {(product.isPromo || product.promoLabel) && (
                    <span className="px-2 py-0.5 rounded bg-[#FAF0DC] text-[#9E762C] font-semibold">
                      {product.promoLabel || 'Promo'}
                    </span>
                  )}
                </div>

                <h2 className="mt-2 text-2xl sm:text-3xl font-serif-display font-semibold text-[#26211D] leading-tight">
                  {product.name}
                </h2>

                <div className="mt-3 pt-3 border-t border-[#EAE0CE] flex items-baseline gap-2.5 flex-wrap">
                  <span className="text-xs text-[#7D7165]">
                    {product.priceLabel || 'Mulai dari'}
                  </span>
                  <span className="text-2xl sm:text-3xl font-serif-display font-bold text-[#9E762C] font-tabular">
                    {formatRupiah(product.price)}
                  </span>
                  {product.unit && (
                    <span className="text-xs text-[#6E6359]">/ {product.unit}</span>
                  )}
                  {hasDiscount && (
                    <span className="text-sm text-[#9C8F80] line-through font-tabular">
                      {formatRupiah(product.originalPrice!)}
                    </span>
                  )}
                </div>
              </div>

              {/* Full Editorial Description */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#5C4E3E]">
                  Deskripsi Layanan / Produk
                </h3>
                <p className="text-sm text-[#4A4036] leading-relaxed whitespace-pre-line">
                  {product.description}
                </p>
              </div>

              {/* Selectable Variations / Themes / Jenis Pertunjukan */}
              {product.variants && product.variants.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#5C4E3E]">
                    {product.category.toLowerCase().includes('sanggar')
                      ? 'Jenis Pertunjukan'
                      : product.category.toLowerCase().includes('mua') ||
                        product.category.toLowerCase().includes('wo') ||
                        product.category.toLowerCase().includes('attire')
                      ? 'Pilihan Paket Layanan'
                      : 'Pilih Variasi / Tema Warna'}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {product.variants.map((variant) => {
                      const active = selectedVariant === variant;
                      return (
                        <button
                          key={variant}
                          type="button"
                          onClick={() => setSelectedVariant(variant)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                            active
                              ? 'border-[#9E762C] bg-[#F5EFE2] text-[#26211D] shadow-2xs'
                              : 'border-[#E2D6C1] bg-white text-[#6E6359] hover:border-[#C7B28E]'
                          }`}
                        >
                          {variant}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Selectable Sizes / Durasi */}
              {product.sizes && product.sizes.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#5C4E3E]">
                    {product.category.toLowerCase().includes('sanggar')
                      ? 'Durasi Pertunjukan'
                      : product.category.toLowerCase().includes('mua') ||
                        product.category.toLowerCase().includes('wo') ||
                        product.category.toLowerCase().includes('attire')
                      ? 'Durasi / Cakupan Layanan'
                      : 'Pilih Ukuran / Dimensi'}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {product.sizes.map((size) => {
                      const active = selectedSize === size;
                      return (
                        <button
                          key={size}
                          type="button"
                          onClick={() => setSelectedSize(size)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                            active
                              ? 'border-[#9E762C] bg-[#F5EFE2] text-[#26211D]'
                              : 'border-[#E2D6C1] bg-white text-[#6E6359] hover:border-[#C7B28E]'
                          }`}
                        >
                          {size}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quantity Selector */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#F4EFE4] border border-[#E6DEC8]">
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-[#26211D] block">
                    Jumlah ({product.unit || 'Paket'})
                  </span>
                  <span className="text-[11px] text-[#6E6359] font-tabular">
                    Subtotal: {formatRupiah(product.price * quantity)}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - (product.unit?.toLowerCase() === 'pcs' ? 50 : 1)))}
                    className="w-8 h-8 rounded-lg bg-white border border-[#D8C8AE] flex items-center justify-center text-[#26211D] cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                    className="w-20 text-center py-1 rounded-lg border border-[#D8C8AE] bg-white text-sm font-semibold font-tabular"
                  />
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => q + (product.unit?.toLowerCase() === 'pcs' ? 50 : 1))}
                    className="w-8 h-8 rounded-lg bg-white border border-[#D8C8AE] flex items-center justify-center text-[#26211D] cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Inclusions List / Fasilitas */}
              {product.inclusions && product.inclusions.length > 0 && (
                <div className="p-4 rounded-2xl bg-[#F4EFE4] border border-[#E6DEC8] space-y-2.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#6E5A3A]">
                    <Sparkles className="w-3.5 h-3.5 text-[#9E762C]" />
                    <span>Fasilitas yang Didapat</span>
                  </div>
                  <ul className="space-y-1.5">
                    {product.inclusions.map((inc, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2 text-xs sm:text-sm text-[#3D352E]"
                      >
                        <Check className="w-4 h-4 text-[#4E6752] shrink-0 mt-0.5" />
                        <span>{inc}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Primary CTA Stack: Cart, Budget Calculator, Wishlist & WhatsApp */}
              <div className="pt-2 space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      trackProductInterest(product.id, 'interested');
                      addToCart(product, quantity, selectedVariant, selectedSize);
                    }}
                    className="py-3 px-4 rounded-2xl bg-[#26211D] hover:bg-[#3A322C] text-white font-medium text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
                  >
                    <ShoppingBag className="w-4 h-4 text-[#D9C7A3]" />
                    <span>+ Keranjang Konsultasi</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      trackProductInterest(product.id, 'interested');
                      applyProductToBudget(product, quantity);
                    }}
                    className="py-3 px-4 rounded-2xl border border-[#C8B282] bg-[#FAF6EE] hover:bg-[#EFE6D5] text-[#26211D] font-medium text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Calculator className="w-4 h-4 text-[#9E762C]" />
                    <span>Masukkan ke Budget</span>
                  </button>
                </div>

                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3.5 px-6 rounded-2xl bg-[#4E6752] hover:bg-[#3F5543] text-white font-medium text-sm flex items-center justify-center gap-2.5 shadow-sm transition-all"
                >
                  <MessageCircle className="w-5 h-5" />
                  <span>Konsultasi Produk via WhatsApp</span>
                </a>

                <button
                  type="button"
                  onClick={() => toggleWishlist(product)}
                  className={`w-full py-2.5 px-5 rounded-2xl border text-xs sm:text-sm font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                    liked
                      ? 'border-[#E8B4B2] bg-[#FFF5F5] text-[#9E3B39]'
                      : 'border-[#D8C8AE] bg-[#FAF6EE] hover:bg-[#EFE6D5] text-[#26211D]'
                  }`}
                >
                  <Heart
                    className={`w-4 h-4 ${
                      liked ? 'fill-[#B85D5A] text-[#B85D5A]' : 'text-[#9E762C]'
                    }`}
                  />
                  <span>
                    {liked
                      ? 'Tersimpan di Wishlist Saya'
                      : 'Simpan ke Wishlist Saya ❤️'}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Related Products in the same category */}
          {relatedProducts.length > 0 && (
            <div className="pt-8 border-t border-[#EAE0CE] space-y-4">
              <h3 className="text-lg sm:text-xl font-serif-display font-semibold text-[#26211D]">
                Koleksi Serupa dalam Kategori {product.category}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
                {relatedProducts.map((rel) => {
                  const relImg =
                    rel.images.find((i) => i.isPrimary) || rel.images[0];
                  return (
                    <button
                      key={rel.id}
                      type="button"
                      onClick={() =>
                        onSelectRelatedProduct
                          ? onSelectRelatedProduct(rel)
                          : undefined
                      }
                      className="text-left group rounded-2xl border border-[#E5DAC5] bg-white p-3 flex items-center gap-3.5 hover:border-[#9E762C] transition-all cursor-pointer"
                    >
                      <div className="w-20 h-16 rounded-xl overflow-hidden shrink-0 bg-[#F2ECE1]">
                        <SafeWeddingImage
                          src={relImg?.url || ''}
                          alt={rel.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-serif-display font-semibold text-[#26211D] truncate">
                          {rel.name}
                        </p>
                        <p className="text-xs text-[#9E762C] font-medium font-tabular">
                          {formatRupiah(rel.price)}
                        </p>
                        <p className="text-[11px] text-[#7D7165]">
                          {rel.images.length} Foto Tersedia
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* FULLSCREEN LIGHTBOX OVERLAY WITH ZOOM SUPPORT */}
      {isFullscreenLightbox && (
        <div className="fixed inset-0 z-60 bg-black/95 flex flex-col justify-between p-4 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3 text-white">
            <div className="min-w-0">
              <p className="text-xs text-[#D9C7A3] font-tabular truncate">
                {product.name} — Foto {activeIndex + 1} / {images.length}
              </p>
              {currentImage.caption && (
                <p className="text-xs sm:text-sm font-serif-display italic text-white/90 truncate">
                  {currentImage.caption}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsZoomed((z) => !z)}
                className="px-3 sm:px-3.5 py-2 rounded-full bg-white/15 hover:bg-white/25 text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer"
              >
                {isZoomed ? (
                  <>
                    <ZoomOut className="w-4 h-4 shrink-0" />
                    <span>Perkecil (1x)</span>
                  </>
                ) : (
                  <>
                    <ZoomIn className="w-4 h-4 shrink-0" />
                    <span>Perbesar Zoom (2x)</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsFullscreenLightbox(false);
                  setIsZoomed(false);
                }}
                className="px-3.5 sm:px-4 py-2 rounded-full bg-white/15 hover:bg-white/25 text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer"
              >
                <X className="w-4 h-4 shrink-0" />
                <span>Tutup</span>
              </button>
            </div>
          </div>

          <div className="relative flex-1 flex items-center justify-center my-4 overflow-auto">
            <div
              onClick={() => setIsZoomed((z) => !z)}
              className={`transition-transform duration-300 ${
                isZoomed ? 'scale-175 cursor-zoom-out' : 'scale-100 cursor-zoom-in'
              }`}
            >
              <SafeWeddingImage
                src={currentImage.url}
                alt={currentImage.caption || product.name}
                className="max-h-[75vh] max-w-full object-contain rounded-lg"
              />
            </div>

            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setActiveIndex((prev) => (prev - 1 + images.length) % images.length)
                  }
                  className="absolute left-2 sm:left-6 w-12 h-12 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center cursor-pointer"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveIndex((prev) => (prev + 1) % images.length)}
                  className="absolute right-2 sm:right-6 w-12 h-12 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center cursor-pointer"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
          </div>

          <div className="flex items-center justify-center gap-2 overflow-x-auto py-2">
            {images.map((img, idx) => (
              <button
                key={img.id || idx}
                type="button"
                onClick={() => setActiveIndex(idx)}
                className={`w-16 h-12 rounded-lg overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
                  idx === activeIndex
                    ? 'border-[#D9C7A3] scale-105'
                    : 'border-transparent opacity-50 hover:opacity-90'
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
    </div>
  );
};
