import React, { useState } from 'react';
import {
  ArrowRight,
  Calculator,
  Calendar,
  MessageCircle,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { useWedding } from '../context/WeddingContext';
import { Product } from '../types';
import {
  buildCartWhatsAppMessage,
  buildWhatsAppUrl,
  formatRupiah,
  getPrimaryImage,
} from '../utils/imageUtils';
import { SafeWeddingImage } from './SafeWeddingImage';

interface ConsultationCartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProduct: (product: Product) => void;
  onExploreCatalog: () => void;
  onOpenBudgetCalculator?: () => void;
}

export const ConsultationCartDrawer: React.FC<ConsultationCartDrawerProps> = ({
  isOpen,
  onClose,
  onSelectProduct,
  onExploreCatalog,
  onOpenBudgetCalculator,
}) => {
  const {
    user,
    currentUserId,
    isGuestUser,
    loginCustomerWithGoogle,
    switchGuestSession,
    settings,
    cartItems,
    cartTotal,
    cartWeddingDate,
    cartGuestCount,
    setCartWeddingDate,
    setCartGuestCount,
    weddingPlan,
    updateWeddingPlan,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    syncCartToBudget,
    recordInquiry,
  } = useWedding();

  const [customNote, setCustomNote] = useState('');

  if (!isOpen) return null;

  const whatsappMessage = buildCartWhatsAppMessage(
    cartItems,
    cartWeddingDate,
    cartGuestCount,
    customNote,
    weddingPlan.coupleName,
    weddingPlan.weddingLocation
  );
  const whatsappUrl = buildWhatsAppUrl(settings.whatsappNumber, whatsappMessage);

  const handleConsultClick = () => {
    recordInquiry({
      type: 'cart',
      coupleName: weddingPlan.coupleName,
      weddingLocation: weddingPlan.weddingLocation,
      customerDate: cartWeddingDate || 'Belum ditentukan',
      guestCount: cartGuestCount || 0,
      itemsSummary: cartItems.map(
        (i) => `${i.product.name} (${i.quantity} ${i.product.unit || 'paket'})`
      ),
      totalEstimate: cartTotal,
      customNotes: customNote,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label="Keranjang & Daftar Konsultasi Pernikahan"
    >
      <div className="flex-1" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-[#FBF9F5] h-full shadow-2xl border-l border-[#DFD3BE] flex flex-col justify-between overflow-hidden">
        {/* Top Header */}
        <div className="px-6 py-5 bg-[#FCFBF8] border-b border-[#EAE0CE] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#F4EFE4] border border-[#E2D4BC] flex items-center justify-center text-[#9E762C]">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-serif-display text-2xl font-semibold text-[#26211D] leading-none">
                Daftar Konsultasi Saya
              </h2>
              <p className="text-xs text-[#7A6E63] mt-1 font-tabular">
                {cartItems.length} Produk Dipilih · Estimasi Real-Time
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup keranjang konsultasi"
            className="p-2 rounded-full hover:bg-[#EFE6D5] text-[#5C4E3E] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Multi-User Isolation Status Banner */}
          <div className="p-3 rounded-2xl bg-[#FAF6EE] border border-[#E2D6C1] flex items-center justify-between gap-2 text-xs">
            <div className="min-w-0">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#9E762C] block">
                Keranjang Pribadi Terisolasi
              </span>
              <p className="text-[#26211D] font-medium truncate">
                {!isGuestUser && user
                  ? `Akun: ${user.displayName || user.email}`
                  : `Sesi Pengantin: ${currentUserId.slice(0, 14)}`}
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {isGuestUser ? (
                <button
                  type="button"
                  onClick={() => void loginCustomerWithGoogle()}
                  className="px-2.5 py-1.5 rounded-lg bg-[#26211D] text-[#FBF9F5] text-[11px] font-medium hover:bg-[#3A322C] cursor-pointer"
                >
                  Simpan ke Google
                </button>
              ) : null}
              <button
                type="button"
                onClick={switchGuestSession}
                title="Ganti Sesi Pengguna Baru"
                className="px-2.5 py-1.5 rounded-lg border border-[#D8C8AE] bg-white text-[#5C4E3E] text-[11px] font-medium hover:bg-[#F2ECE1] cursor-pointer"
              >
                {isGuestUser ? 'Sesi Baru' : 'Keluar'}
              </button>
            </div>
          </div>

          {cartItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12 px-4 space-y-4">
              <div className="w-16 h-16 rounded-full bg-[#F4EFE4] border border-[#E5DAC5] flex items-center justify-center text-[#9E762C]">
                <ShoppingBag className="w-7 h-7 stroke-[1.5]" />
              </div>
              <div className="space-y-1.5 max-w-xs">
                <h3 className="font-serif-display text-2xl font-semibold text-[#26211D]">
                  Daftar Konsultasi Masih Kosong
                </h3>
                <p className="text-xs sm:text-sm text-[#6E6359] leading-relaxed">
                  Pilih produk dekorasi, tenda, undangan, souvenir, atau mahar dari katalog untuk menghitung subtotal dan berkonsultasi via WhatsApp.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onExploreCatalog();
                }}
                className="mt-2 px-5 py-2.5 rounded-xl bg-[#26211D] hover:bg-[#3A322C] text-white text-xs sm:text-sm font-medium inline-flex items-center gap-2 transition-colors cursor-pointer"
              >
                <span>Jelajahi Katalog Produk</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              {/* Event Identity, Date & Guest Count Inputs for WhatsApp Summary */}
              <div className="p-4 rounded-2xl bg-[#F4EFE4] border border-[#E4DAC7] grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#5C4E3E] mb-1">
                    <span>Nama Pengantin</span>
                  </label>
                  <input
                    type="text"
                    value={weddingPlan.coupleName || ''}
                    onChange={(e) => updateWeddingPlan({ coupleName: e.target.value })}
                    placeholder="Contoh: Putri & Reza"
                    className="w-full rounded-xl border border-[#D8C8AE] bg-white px-3 py-1.5 text-xs text-[#26211D]"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#5C4E3E] mb-1">
                    <span>Lokasi Acara</span>
                  </label>
                  <input
                    type="text"
                    value={weddingPlan.weddingLocation || ''}
                    onChange={(e) => updateWeddingPlan({ weddingLocation: e.target.value })}
                    placeholder="Contoh: Gedung / Rumah, Jakarta"
                    className="w-full rounded-xl border border-[#D8C8AE] bg-white px-3 py-1.5 text-xs text-[#26211D]"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#5C4E3E] mb-1">
                    <Calendar className="w-3.5 h-3.5 text-[#9E762C]" />
                    <span>Rencana Tanggal</span>
                  </label>
                  <input
                    type="date"
                    value={cartWeddingDate}
                    onChange={(e) => setCartWeddingDate(e.target.value)}
                    className="w-full rounded-xl border border-[#D8C8AE] bg-white px-3 py-1.5 text-xs text-[#26211D]"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#5C4E3E] mb-1">
                    <Users className="w-3.5 h-3.5 text-[#9E762C]" />
                    <span>Jumlah Tamu</span>
                  </label>
                  <input
                    type="number"
                    min={10}
                    step={50}
                    value={cartGuestCount}
                    onChange={(e) => setCartGuestCount(Number(e.target.value) || 0)}
                    className="w-full rounded-xl border border-[#D8C8AE] bg-white px-3 py-1.5 text-xs text-[#26211D] font-tabular"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-[#6E6359] pb-1">
                <span>Atur jumlah (misal 500 pcs untuk souvenir/undangan):</span>
                <button
                  type="button"
                  onClick={clearCart}
                  className="text-[#9E3B3B] hover:underline font-medium cursor-pointer"
                >
                  Kosongkan Semua
                </button>
              </div>

              {cartItems.map((item) => {
                const primaryImg = getPrimaryImage(item.product.images);
                const unit = item.product.unit || 'Paket';
                const isBulkItem = unit.toLowerCase() === 'pcs';
                const step = isBulkItem ? 50 : 1;
                const subtotal = item.product.price * item.quantity;

                return (
                  <div
                    key={item.productId}
                    className="group rounded-2xl border border-[#E5DAC5] bg-white p-3.5 flex flex-col gap-3 hover:border-[#C8B282] transition-all"
                  >
                    <div className="flex gap-3.5 items-start">
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onSelectProduct(item.product);
                        }}
                        className="w-20 h-18 rounded-xl overflow-hidden bg-[#F2ECE1] shrink-0 border border-[#EAE0CE] cursor-pointer"
                      >
                        <SafeWeddingImage
                          src={primaryImg.url}
                          alt={item.product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#9E762C] block">
                              {item.product.category}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                onClose();
                                onSelectProduct(item.product);
                              }}
                              className="text-left font-serif-display font-semibold text-base text-[#26211D] hover:text-[#9E762C] line-clamp-1 cursor-pointer"
                            >
                              {item.product.name}
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeFromCart(item.productId)}
                            title="Hapus dari daftar"
                            className="p-1.5 rounded-lg text-[#8C7A65] hover:text-[#9E3B3B] hover:bg-[#FDF2F2] transition-colors shrink-0 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <p className="text-xs text-[#6E6359] font-tabular mt-0.5">
                          Harga: {formatRupiah(item.product.price)} / {unit}
                        </p>
                      </div>
                    </div>

                    {/* Quantity & Subtotal Row */}
                    <div className="pt-2.5 border-t border-[#F2ECE1] flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            updateCartQuantity(
                              item.productId,
                              Math.max(1, item.quantity - step)
                            )
                          }
                          className="w-7 h-7 rounded-lg border border-[#D8C8AE] bg-[#FAF6EE] flex items-center justify-center text-[#26211D] cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) =>
                            updateCartQuantity(
                              item.productId,
                              Math.max(1, Number(e.target.value) || 1)
                            )
                          }
                          className="w-16 text-center py-1 rounded-lg border border-[#D8C8AE] bg-white text-xs font-semibold font-tabular"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            updateCartQuantity(item.productId, item.quantity + step)
                          }
                          className="w-7 h-7 rounded-lg border border-[#D8C8AE] bg-[#FAF6EE] flex items-center justify-center text-[#26211D] cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <span className="text-[11px] text-[#7A6E63]">{unit}</span>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-[#7A6E63] block">Subtotal</span>
                        <span className="text-sm font-bold text-[#9E762C] font-tabular">
                          {formatRupiah(subtotal)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Optional Custom Consultation Note */}
              <div className="pt-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#5C4E3E] mb-1.5">
                  Catatan Tambahan (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  placeholder="Contoh: Lokasi di Gedung Kartika, mohon info paket diskon..."
                  className="w-full rounded-xl border border-[#D8C8AE] bg-white px-3.5 py-2 text-xs text-[#26211D] focus:outline-none focus:border-[#9E762C]"
                />
              </div>
            </>
          )}
        </div>

        {/* Sticky Footer with Total Estimation, Sync to Budget & WhatsApp Action */}
        {cartItems.length > 0 && (
          <div className="p-6 bg-[#FCFBF8] border-t border-[#EAE0CE] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#6E6359]">Total Estimasi Pilihan</p>
                <p className="text-[11px] text-[#8C7A65]">
                  Otomatis terhubung dengan Kalkulator Budget
                </p>
              </div>
              <p className="text-2xl font-serif-display font-bold text-[#26211D] font-tabular">
                {formatRupiah(cartTotal)}
              </p>
            </div>

            {onOpenBudgetCalculator && (
              <button
                type="button"
                onClick={() => {
                  syncCartToBudget();
                  onClose();
                  onOpenBudgetCalculator();
                }}
                className="w-full py-2.5 px-4 rounded-xl border border-[#C8B282] bg-[#FAF6EE] hover:bg-[#EFE6D5] text-[#26211D] text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Calculator className="w-4 h-4 text-[#9E762C]" />
                <span>Lihat di Kalkulator Budget Pernikahan</span>
              </button>
            )}

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleConsultClick}
              className="w-full py-3.5 px-5 rounded-xl bg-[#4E6752] hover:bg-[#3F5543] text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-md transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Konsultasikan Pilihan Saya ({cartItems.length} Produk)</span>
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
