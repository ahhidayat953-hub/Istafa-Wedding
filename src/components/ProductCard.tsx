import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Heart,
  MessageCircle,
  ShoppingBag,
} from 'lucide-react';
import { useWedding } from '../context/WeddingContext';
import { Product } from '../types';
import {
  buildProductWhatsAppMessage,
  buildWhatsAppUrl,
  formatRupiah,
} from '../utils/imageUtils';
import { SafeWeddingImage } from './SafeWeddingImage';

interface ProductCardProps {
  product: Product;
  onOpenDetail: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onOpenDetail,
}) => {
  const { settings, isInWishlist, toggleWishlist, addToCart, trackProductInterest } = useWedding();
  const liked = isInWishlist(product.id);

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

  const primaryIndex = images.findIndex((i) => i.isPrimary);
  const [previewIdx, setPreviewIdx] = useState(primaryIndex >= 0 ? primaryIndex : 0);

  const activePhoto = images[previewIdx] || images[0];

  const handlePrevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreviewIdx((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleNextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreviewIdx((prev) => (prev + 1) % images.length);
  };

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleWishlist(product);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    trackProductInterest(product.id, 'interested');
    addToCart(product);
  };

  const whatsappUrl = buildWhatsAppUrl(
    settings.whatsappNumber,
    buildProductWhatsAppMessage(product)
  );

  const hasDiscount =
    Boolean(product.originalPrice) && (product.originalPrice || 0) > product.price;

  return (
    <article
      onClick={() => {
        trackProductInterest(product.id, 'viewed');
        onOpenDetail(product);
      }}
      className="group bg-[#FCFBF8] rounded-2xl border border-[#E5DAC5] hover:border-[#C8B282] overflow-hidden flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-md cursor-pointer"
    >
      <div>
        {/* Image Frame (4:3 Disciplined Aspect Ratio) */}
        <div className="relative aspect-[4/3] w-full bg-[#F2ECE1] overflow-hidden">
          <SafeWeddingImage
            src={activePhoto.url}
            alt={activePhoto.caption || product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />

          {/* Top Left Promo / New Status Label */}
          <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-1.5">
            {(product.isPromo || product.promoLabel) && (
              <span className="px-2.5 py-1 rounded-lg bg-[#9E762C] text-white text-[10px] font-semibold tracking-wider uppercase shadow-xs">
                {product.promoLabel || 'Promo'}
              </span>
            )}
            {product.isNew && (
              <span className="px-2.5 py-1 rounded-lg bg-[#26211D]/85 text-[#FBF9F5] text-[10px] font-medium tracking-wider uppercase backdrop-blur-xs">
                Baru
              </span>
            )}
          </div>

          {/* Wishlist Favorite Toggle Button */}
          <button
            type="button"
            onClick={handleToggleWishlist}
            aria-label={liked ? 'Hapus dari Wishlist Saya' : 'Simpan ke Wishlist Saya'}
            title={liked ? 'Tersimpan di Wishlist Saya' : 'Simpan ke Wishlist Saya'}
            className={`absolute top-3 right-3 z-10 w-9 h-9 rounded-full flex items-center justify-center shadow-sm transition-all cursor-pointer ${
              liked
                ? 'bg-[#FFF5F5] text-[#B85D5A] border border-[#E8B4B2]'
                : 'bg-white/90 hover:bg-white text-[#6E5A4F] border border-[#E5DAC5]'
            }`}
          >
            <Heart
              className={`w-4 h-4 transition-transform active:scale-125 ${
                liked ? 'fill-[#B85D5A] text-[#B85D5A]' : ''
              }`}
            />
          </button>

          {/* Subtle gradient scrim at bottom for multi-photo counter */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent px-3.5 sm:px-4 py-2.5 flex items-center justify-between gap-2 text-white">
            <span className="text-[11px] font-medium tracking-wider uppercase text-[#F5EFE6] truncate min-w-0">
              {product.category}
            </span>
            <span className="text-[11px] text-white/90 font-tabular shrink-0">
              {previewIdx + 1}/{images.length} Foto
            </span>
          </div>

          {/* Quick Prev/Next Controls on Hover if Product has Multiple Photos */}
          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={handlePrevPhoto}
                aria-label="Foto sebelumnya"
                className="opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/85 hover:bg-white text-[#26211D] flex items-center justify-center shadow-xs cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNextPhoto}
                aria-label="Foto selanjutnya"
                className="opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/85 hover:bg-white text-[#26211D] flex items-center justify-center shadow-xs cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {/* Product Body Copy */}
        <div className="p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2 text-[11px] text-[#7A6E63]">
            <span className="truncate">{product.priceLabel || 'Mulai dari'}</span>
            <span
              className={`font-medium shrink-0 ${
                product.isAvailable ? 'text-[#4E6752]' : 'text-[#9E3B3B]'
              }`}
            >
              {product.stockStatus || (product.isAvailable ? 'Tersedia' : 'Penuh')}
            </span>
          </div>

          <div className="mt-0.5 flex items-baseline gap-2 flex-wrap">
            <p className="text-base sm:text-lg font-semibold text-[#9E762C] font-tabular">
              {formatRupiah(product.price)}
              {product.unit ? (
                <span className="text-xs font-normal text-[#7A6E63]">
                  {' '}
                  / {product.unit}
                </span>
              ) : null}
            </p>
            {hasDiscount && (
              <span className="text-xs text-[#9C8F80] line-through font-tabular">
                {formatRupiah(product.originalPrice!)}
              </span>
            )}
          </div>

          <h3 className="mt-1.5 text-lg sm:text-xl font-serif-display font-semibold text-[#26211D] leading-snug line-clamp-2 group-hover:text-[#8C6622] transition-colors">
            {product.name}
          </h3>

          <p className="mt-2 text-xs sm:text-sm text-[#5C5147] leading-relaxed line-clamp-2">
            {product.shortDescription}
          </p>

          {/* Show Jenis Pertunjukan & Durasi for Tim Sanggar or Layanan Wedding */}
          {product.category.toLowerCase().includes('sanggar') &&
            ((product.variants && product.variants.length > 0) ||
              (product.sizes && product.sizes.length > 0)) && (
              <div className="mt-2.5 pt-2 border-t border-[#EFE8D8] space-y-1 text-[11px] text-[#5C4E3E]">
                {product.variants && product.variants[0] && (
                  <p className="truncate">
                    <strong className="text-[#9E762C]">Pertunjukan:</strong>{' '}
                    {product.variants[0]}
                  </p>
                )}
                {product.sizes && product.sizes[0] && (
                  <p className="truncate">
                    <strong className="text-[#9E762C]">Durasi:</strong>{' '}
                    {product.sizes[0]}
                  </p>
                )}
              </div>
            )}

          {/* Show Fasilitas yang didapat preview */}
          {product.inclusions && product.inclusions.length > 0 && (
            <div className="mt-2.5 pt-2.5 border-t border-[#EFE8D8]">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#8C7A65] mb-1">
                Fasilitas yang Didapat:
              </p>
              <ul className="space-y-1">
                {product.inclusions.slice(0, 4).map((inc, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-1.5 text-[11px] text-[#3D352E]"
                  >
                    <span className="text-[#4E6752] font-bold shrink-0">✓</span>
                    <span className="line-clamp-1">{inc}</span>
                  </li>
                ))}
                {product.inclusions.length > 4 && (
                  <li className="text-[11px] text-[#9E762C] font-medium">
                    +{product.inclusions.length - 4} fasilitas lainnya...
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons Row */}
      <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-3 border-t border-[#EFE8D8] grid grid-cols-12 gap-1.5 sm:gap-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenDetail(product);
          }}
          className="col-span-5 py-2.5 px-2 sm:px-2.5 rounded-xl border border-[#D8C8AE] bg-[#FAF6EE] hover:bg-[#EFE6D5] text-[#26211D] text-[11px] sm:text-xs font-medium flex items-center justify-center gap-1 sm:gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
        >
          <Eye className="w-3.5 h-3.5 text-[#9E762C] shrink-0" />
          <span>Lihat Detail</span>
        </button>

        <button
          type="button"
          onClick={handleAddToCart}
          title="Tambahkan ke Keranjang Konsultasi & Kalkulator Budget"
          className="col-span-5 py-2.5 px-2 sm:px-2.5 rounded-xl bg-[#26211D] hover:bg-[#3A322C] text-white text-[11px] sm:text-xs font-medium flex items-center justify-center gap-1 sm:gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
        >
          <ShoppingBag className="w-3.5 h-3.5 text-[#D9C7A3] shrink-0" />
          <span>+ Keranjang</span>
        </button>

        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          title="Konsultasi langsung via WhatsApp"
          aria-label="Konsultasi via WhatsApp"
          className="col-span-2 py-2.5 rounded-xl bg-[#4E6752] hover:bg-[#3F5543] text-white flex items-center justify-center transition-colors"
        >
          <MessageCircle className="w-4 h-4 shrink-0" />
        </a>
      </div>
    </article>
  );
};
