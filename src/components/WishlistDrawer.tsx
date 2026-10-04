import React, { useState } from 'react';
import {
  Eye,
  Heart,
  MessageCircle,
  ShoppingBag,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { useWedding } from '../context/WeddingContext';
import { Product } from '../types';
import {
  buildProductWhatsAppMessage,
  buildWhatsAppUrl,
  buildWishlistWhatsAppMessage,
  formatRupiah,
  getPrimaryImage,
} from '../utils/imageUtils';
import { SafeWeddingImage } from './SafeWeddingImage';

interface WishlistDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProduct: (product: Product) => void;
  onExploreCatalog: () => void;
  onOpenCart?: () => void;
}

export const WishlistDrawer: React.FC<WishlistDrawerProps> = ({
  isOpen,
  onClose,
  onSelectProduct,
  onExploreCatalog,
  onOpenCart,
}) => {
  const {
    settings,
    wishlistProducts,
    removeFromWishlist,
    clearWishlist,
    addToCart,
    cartItems,
  } = useWedding();
  const [customNote, setCustomNote] = useState('');

  const isInCart = (productId: string) =>
    cartItems.some((item) => item.productId === productId);

  if (!isOpen) return null;

  const totalEstimated = wishlistProducts.reduce(
    (sum, item) => sum + (Number(item.price) || 0),
    0
  );

  const combinedWhatsAppUrl = buildWhatsAppUrl(
    settings.whatsappNumber,
    buildWishlistWhatsAppMessage(wishlistProducts, customNote)
  );

  const handleMoveAllToCart = () => {
    wishlistProducts.forEach((product) => {
      if (!isInCart(product.id)) {
        addToCart(product, 1);
      }
    });
    onClose();
    if (onOpenCart) onOpenCart();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#1B1714]/60 backdrop-blur-xs flex justify-end">
      {/* Backdrop click to close */}
      <div className="flex-1" onClick={onClose} />

      {/* Slide-over Panel */}
      <aside className="w-full max-w-md bg-[#FBF9F5] h-full border-l border-[#E4DAC7] shadow-2xl flex flex-col justify-between overflow-hidden">
        {/* Drawer Header */}
        <div className="px-6 py-5 bg-[#FCFBF8] border-b border-[#EAE0CE] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#F7EBEB] text-[#B85D5A] flex items-center justify-center">
              <Heart className="w-4 h-4 fill-current" />
            </div>
            <div>
              <h2 className="text-xl font-serif-display font-semibold text-[#26211D]">
                Wedding Wishlist ❤️
              </h2>
              <p className="text-xs text-[#6E6359] font-tabular">
                {wishlistProducts.length} Produk Favorit Tersimpan
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup daftar favorit"
            className="w-9 h-9 rounded-full border border-[#DFD3BE] flex items-center justify-center text-[#4A4036] hover:bg-[#F2ECE1] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drawer Body: List of Saved Products */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {wishlistProducts.length > 0 ? (
            <>
              <div className="flex items-center justify-between text-xs text-[#6E6359] pb-1">
                <span>Tinjau kembali produk pilihan Anda sebelum konsultasi</span>
                <button
                  type="button"
                  onClick={clearWishlist}
                  className="text-[#9E3B3B] hover:underline whitespace-nowrap cursor-pointer"
                >
                  Kosongkan Semua
                </button>
              </div>

              {wishlistProducts.map((product) => {
                const primary = getPrimaryImage(product.images);
                const singleWaUrl = buildWhatsAppUrl(
                  settings.whatsappNumber,
                  buildProductWhatsAppMessage(product)
                );
                const inCart = isInCart(product.id);

                return (
                  <div
                    key={product.id}
                    className="rounded-2xl border border-[#E5DAC5] bg-white p-3.5 flex gap-3.5 items-start hover:border-[#C8B282] transition-colors"
                  >
                    <div
                      onClick={() => {
                        onClose();
                        onSelectProduct(product);
                      }}
                      className="w-20 h-20 rounded-xl overflow-hidden bg-[#F2ECE1] shrink-0 cursor-pointer border border-[#EDE4D3]"
                    >
                      <SafeWeddingImage
                        src={primary.url}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <span className="text-[11px] uppercase tracking-wider font-medium text-[#9E762C]">
                            {product.category} · {product.images.length} Foto
                          </span>
                          <h3
                            onClick={() => {
                              onClose();
                              onSelectProduct(product);
                            }}
                            className="font-serif-display font-semibold text-base text-[#26211D] truncate cursor-pointer hover:text-[#9E762C]"
                          >
                            {product.name}
                          </h3>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeFromWishlist(product.id)}
                          title="Hapus dari favorit"
                          className="p-1.5 rounded-lg text-[#8C5854] hover:bg-[#FDF2F2] shrink-0 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-baseline gap-1.5 mt-1">
                        {product.originalPrice && product.originalPrice > product.price && (
                          <span className="text-[11px] text-[#8E8071] line-through font-tabular">
                            {formatRupiah(product.originalPrice)}
                          </span>
                        )}
                        <p className="text-sm font-semibold text-[#26211D] font-tabular">
                          {formatRupiah(product.price)}
                        </p>
                      </div>

                      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onSelectProduct(product);
                          }}
                          className="px-2.5 py-1 rounded-lg border border-[#DCD0BA] bg-[#F9F6F0] hover:bg-[#EFE6D5] text-[11px] font-medium text-[#26211D] inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3 h-3 text-[#9E762C]" />
                          <span>Detail</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => addToCart(product, 1)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-medium inline-flex items-center gap-1 cursor-pointer ${
                            inCart
                              ? 'bg-[#26211D] text-white'
                              : 'border border-[#D5C5A8] bg-[#FAF6EE] text-[#5C4E3E] hover:bg-[#EFE5D2]'
                          }`}
                        >
                          <ShoppingBag className="w-3 h-3 text-[#9E762C]" />
                          <span>{inCart ? 'Di Konsultasi ✓' : '+ Konsultasi'}</span>
                        </button>

                        <a
                          href={singleWaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-[#F0F4F1] hover:bg-[#E1ECE3] text-[11px] font-medium text-[#3F5543] inline-flex items-center gap-1"
                        >
                          <MessageCircle className="w-3 h-3" />
                          <span>WA</span>
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Optional Consultation Note */}
              <div className="pt-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#5C4E3E] mb-1.5">
                  Catatan Rencana Pernikahan (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  placeholder="Contoh: Rencana acara bulan Desember di Jakarta, sekitar 300 tamu..."
                  className="w-full rounded-xl border border-[#D8C8AE] bg-white px-3.5 py-2 text-xs text-[#26211D] focus:outline-none focus:border-[#9E762C]"
                />
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center px-4 py-12 space-y-4">
              <div className="w-14 h-14 rounded-full bg-[#F5EFE4] text-[#9E762C] flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-serif-display text-2xl font-semibold text-[#26211D]">
                  Belum Ada Produk di Wishlist ❤️
                </h3>
                <p className="text-xs sm:text-sm text-[#6E6359] max-w-xs leading-relaxed">
                  Tekan ikon ❤️ pada produk dekorasi, tenda, undangan, souvenir, seserahan, atau mahar yang Anda sukai untuk menyimpannya di sini.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onExploreCatalog();
                }}
                className="px-5 py-2.5 rounded-xl bg-[#26211D] hover:bg-[#3A322C] text-white text-xs font-medium transition-colors cursor-pointer"
              >
                Jelajahi Katalog Produk
              </button>
            </div>
          )}
        </div>

        {/* Drawer Footer: Subtotal & Combined WhatsApp Consultation CTA */}
        {wishlistProducts.length > 0 && (
          <div className="p-5 bg-[#FCFBF8] border-t border-[#E6DEC8] space-y-2.5">
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-[#6E6359]">
                Estimasi Total ({wishlistProducts.length} Produk)
              </span>
              <span className="text-xl sm:text-2xl font-serif-display font-semibold text-[#26211D] font-tabular">
                {formatRupiah(totalEstimated)}
              </span>
            </div>

            {onOpenCart && (
              <button
                type="button"
                onClick={handleMoveAllToCart}
                className="w-full py-2.5 px-4 rounded-xl border border-[#D8C8AE] bg-[#FAF6EE] hover:bg-[#EFE6D5] text-[#26211D] text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <ShoppingBag className="w-3.5 h-3.5 text-[#9E762C]" />
                <span>Pindahkan Semua ke Daftar Konsultasi (Atur Jumlah Item)</span>
              </button>
            )}

            <a
              href={combinedWhatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3.5 px-5 rounded-xl bg-[#4E6752] hover:bg-[#3F5543] text-white text-xs sm:text-sm font-medium flex items-center justify-center gap-2 shadow-md transition-colors whitespace-nowrap"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Kirim Daftar Wishlist ke WhatsApp</span>
            </a>
          </div>
        )}
      </aside>
    </div>
  );
};
