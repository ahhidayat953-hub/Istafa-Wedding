import React, { useState } from 'react';
import {
  ArrowRight,
  Calculator,
  Calendar,
  Check,
  FileCheck,
  Loader2,
  MessageCircle,
  Minus,
  Phone,
  Plus,
  ShoppingBag,
  Sparkles,
  Trash2,
  Upload,
  Users,
  X,
} from 'lucide-react';
import { useWedding } from '../context/WeddingContext';
import { Product, WeddingOrder } from '../types';
import {
  buildCartWhatsAppMessage,
  buildWhatsAppUrl,
  compressImageFile,
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
    activeConsultation,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    syncCartToBudget,
    recordInquiry,
    createOrder,
    saveLead,
  } = useWedding();

  const [customNote, setCustomNote] = useState('');
  const [customerName, setCustomerName] = useState(
    activeConsultation.customerName ||
      (weddingPlan.coupleName ? weddingPlan.coupleName.split('&')[0]?.trim() : '') ||
      ''
  );
  const [partnerName, setPartnerName] = useState(
    activeConsultation.partnerName ||
      (weddingPlan.coupleName && weddingPlan.coupleName.includes('&')
        ? weddingPlan.coupleName.split('&')[1]?.trim()
        : '') ||
      ''
  );
  const [whatsappInput, setWhatsappInput] = useState(activeConsultation.whatsapp || '');
  const [emailInput, setEmailInput] = useState(activeConsultation.email || user?.email || '');
  const [eventType, setEventType] = useState(
    activeConsultation.eventType || 'Akad & Resepsi'
  );
  const [paymentProofUrl, setPaymentProofUrl] = useState('');
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<WeddingOrder | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  if (!isOpen) return null;

  const coupleDisplay =
    customerName && partnerName
      ? `${customerName} & ${partnerName}`
      : customerName || weddingPlan.coupleName || '';

  const whatsappMessage = buildCartWhatsAppMessage(
    cartItems,
    cartWeddingDate,
    cartGuestCount,
    customNote,
    coupleDisplay,
    weddingPlan.weddingLocation
  );
  const whatsappUrl = buildWhatsAppUrl(settings.whatsappNumber, whatsappMessage);

  const handleProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingProof(true);
    try {
      const url = await compressImageFile(file, 900, 0.75, 'orders');
      setPaymentProofUrl(url);
    } catch {
      setFormError('Gagal mengunggah bukti pembayaran.');
    } finally {
      setIsUploadingProof(false);
      e.target.value = '';
    }
  };

  const handleSaveBookingOrder = async () => {
    setFormError(null);
    const cleanName = customerName.trim() || (weddingPlan.coupleName || '').trim();
    const cleanWa = whatsappInput.trim();
    if (!cleanName) {
      setFormError('Mohon isi Nama Calon Pengantin terlebih dahulu.');
      return;
    }
    if (!cleanWa || cleanWa.length < 8) {
      setFormError('Mohon isi Nomor WhatsApp aktif untuk konfirmasi pesanan.');
      return;
    }
    if (cartItems.length === 0) return;

    setIsSubmittingOrder(true);
    try {
      const orderItems = cartItems.map((ci) => {
        const primaryImg = getPrimaryImage(ci.product.images);
        return {
          productId: ci.productId,
          productName: ci.product.name,
          category: ci.product.category,
          quantity: ci.quantity,
          unit: ci.product.unit || 'Paket',
          unitPrice: ci.product.price,
          subtotal: ci.product.price * ci.quantity,
          selectedVariant: ci.selectedVariant,
          selectedSize: ci.selectedSize,
          photoUrl: primaryImg?.url || '',
        };
      });

      const saved = await createOrder({
        consultationId: activeConsultation.id,
        customerName: cleanName,
        partnerName: partnerName.trim(),
        whatsapp: cleanWa,
        email: emailInput.trim(),
        weddingDate: cartWeddingDate || weddingPlan.weddingDate || 'Belum ditentukan',
        weddingLocation: weddingPlan.weddingLocation || activeConsultation.weddingLocation || '-',
        eventType,
        guestCount: cartGuestCount || 300,
        items: orderItems,
        totalAmount: cartTotal,
        status: paymentProofUrl ? 'DP Paid' : 'Pending',
        notes: customNote.trim(),
        paymentProofUrl: paymentProofUrl || undefined,
      });

      if (saved) {
        setCreatedOrder(saved);
        recordInquiry({
          type: 'cart',
          coupleName: coupleDisplay || cleanName,
          customerName: cleanName,
          partnerName: partnerName.trim(),
          whatsapp: cleanWa,
          email: emailInput.trim(),
          weddingLocation: weddingPlan.weddingLocation,
          customerDate: cartWeddingDate || 'Belum ditentukan',
          guestCount: cartGuestCount || 0,
          itemsSummary: cartItems.map(
            (i) => `${i.product.name} (${i.quantity} ${i.product.unit || 'paket'})`
          ),
          totalEstimate: cartTotal,
          customNotes: `Order #${saved.orderNumber} - ${customNote}`,
          status: 'Booking',
        });
      }
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const handleConsultClick = () => {
    const cleanName = customerName.trim() || (weddingPlan.coupleName || '').trim() || 'Calon Pengantin';
    void saveLead({
      consultationId: activeConsultation.id,
      customerName: cleanName,
      partnerName: partnerName.trim(),
      coupleName: coupleDisplay || cleanName,
      whatsapp: whatsappInput.trim(),
      email: emailInput.trim(),
      weddingDate: cartWeddingDate || weddingPlan.weddingDate,
      weddingLocation: weddingPlan.weddingLocation || activeConsultation.weddingLocation,
      eventType,
      guestCount: cartGuestCount || 300,
      budget: cartTotal,
      needs: Array.from(new Set(cartItems.map((i) => i.product.category))),
      interestedProductIds: cartItems.map((i) => i.productId),
      interestedProductNames: cartItems.map((i) => i.product.name),
      consultationSummary: `Keranjang Konsultasi (${cartItems.length} item) — Estimasi ${formatRupiah(cartTotal)}`,
      notes: customNote,
      status: 'Interested',
      source: 'cart',
    });

    recordInquiry({
      type: 'cart',
      coupleName: coupleDisplay || cleanName,
      customerName: cleanName,
      partnerName: partnerName.trim(),
      whatsapp: whatsappInput.trim(),
      weddingLocation: weddingPlan.weddingLocation,
      customerDate: cartWeddingDate || 'Belum ditentukan',
      guestCount: cartGuestCount || 0,
      itemsSummary: cartItems.map(
        (i) => `${i.product.name} (${i.quantity} ${i.product.unit || 'paket'})`
      ),
      totalEstimate: cartTotal,
      customNotes: customNote,
      status: 'Interested',
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

      <div className="relative w-full max-w-lg bg-[#FBF9F5] h-full max-h-[100dvh] shadow-2xl border-l border-[#DFD3BE] flex flex-col justify-between overflow-hidden">
        {/* Top Header */}
        <div className="px-4 sm:px-6 py-4 sm:py-5 bg-[#FCFBF8] border-b border-[#EAE0CE] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-full bg-[#F4EFE4] border border-[#E2D4BC] flex items-center justify-center text-[#9E762C] shrink-0">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="font-serif-display text-xl sm:text-2xl font-semibold text-[#26211D] leading-none truncate">
                Daftar Konsultasi Saya
              </h2>
              <p className="text-xs text-[#7A6E63] mt-1 font-tabular truncate">
                {cartItems.length} Produk Dipilih · Estimasi Real-Time
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup keranjang konsultasi"
            className="p-2 rounded-full hover:bg-[#EFE6D5] text-[#5C4E3E] transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Multi-User Isolation Status Banner */}
          <div className="p-3 rounded-2xl bg-[#FAF6EE] border border-[#E2D6C1] flex flex-wrap items-center justify-between gap-2 text-xs">
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
              {/* Official Order Confirmation Card if Order was just saved */}
              {createdOrder && (
                <div className="p-4 rounded-2xl bg-[#EEF5F0] border border-[#BBD2C1] space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#35543D]">
                      <FileCheck className="w-4 h-4" />
                      <span>Booking Tersimpan Permanen!</span>
                    </span>
                    <span className="px-2.5 py-0.5 rounded-lg bg-[#35543D] text-white text-[11px] font-tabular font-semibold">
                      #{createdOrder.orderNumber}
                    </span>
                  </div>
                  <p className="text-xs text-[#3D4F42] leading-relaxed">
                    Data pesanan atas nama <strong>{createdOrder.customerName}</strong> telah tercatat di sistem ISTAFA Wedding ({createdOrder.items.length} item · Total {formatRupiah(createdOrder.totalAmount)}).
                  </p>
                  <a
                    href={buildWhatsAppUrl(
                      settings.whatsappNumber,
                      `Halo ${settings.businessName}, saya telah melakukan Booking Resmi di website dengan Nomor Order *#${createdOrder.orderNumber}*.\n\nNama: ${createdOrder.customerName}${createdOrder.partnerName ? ` & ${createdOrder.partnerName}` : ''}\nWhatsApp: ${createdOrder.whatsapp}\nTanggal Acara: ${createdOrder.weddingDate}\nLokasi: ${createdOrder.weddingLocation}\nTotal Estimasi: ${formatRupiah(createdOrder.totalAmount)}\n\nMohon konfirmasi jadwal dan langkah selanjutnya.`
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-3.5 rounded-xl bg-[#35543D] hover:bg-[#2A4431] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Kirim Konfirmasi Order #{createdOrder.orderNumber} ke WhatsApp</span>
                  </a>
                </div>
              )}

              {formError && (
                <div className="p-3 rounded-xl bg-[#FDF2F2] border border-[#E8B8B8] text-xs text-[#9E3B3B] font-medium">
                  ⚠️ {formError}
                </div>
              )}

              {/* Event Identity, Contact, Date & Guest Count Inputs for Booking & WhatsApp Summary */}
              <div className="p-4 rounded-2xl bg-[#F4EFE4] border border-[#E4DAC7] space-y-3">
                <div className="flex items-center justify-between border-b border-[#E2D6C1] pb-2">
                  <span className="text-xs font-semibold text-[#26211D] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#9E762C]" />
                    <span>Data Calon Pengantin & Acara</span>
                  </span>
                  <span className="text-[10px] text-[#7A6E63]">Tersimpan Otomatis</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#5C4E3E] mb-1">
                      Nama Lengkap *
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => {
                        setCustomerName(e.target.value);
                        const nextCouple = partnerName
                          ? `${e.target.value} & ${partnerName}`
                          : e.target.value;
                        updateWeddingPlan({ coupleName: nextCouple });
                      }}
                      placeholder="Contoh: Nadia Putri"
                      className="w-full rounded-xl border border-[#D8C8AE] bg-white px-3 py-1.5 text-xs text-[#26211D]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#5C4E3E] mb-1">
                      Nama Pasangan
                    </label>
                    <input
                      type="text"
                      value={partnerName}
                      onChange={(e) => {
                        setPartnerName(e.target.value);
                        const nextCouple = customerName
                          ? `${customerName} & ${e.target.value}`
                          : e.target.value;
                        updateWeddingPlan({ coupleName: nextCouple });
                      }}
                      placeholder="Contoh: Reza Prakoso"
                      className="w-full rounded-xl border border-[#D8C8AE] bg-white px-3 py-1.5 text-xs text-[#26211D]"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-[#5C4E3E] mb-1">
                      <Phone className="w-3 h-3 text-[#9E762C]" />
                      <span>Nomor WhatsApp *</span>
                    </label>
                    <input
                      type="tel"
                      value={whatsappInput}
                      onChange={(e) => setWhatsappInput(e.target.value)}
                      placeholder="0812xxxxxxxx"
                      className="w-full rounded-xl border border-[#D8C8AE] bg-white px-3 py-1.5 text-xs text-[#26211D] font-tabular"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#5C4E3E] mb-1">
                      Email (Opsional)
                    </label>
                    <input
                      type="email"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="nama@email.com"
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
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#5C4E3E] mb-1">
                      Lokasi Acara
                    </label>
                    <input
                      type="text"
                      value={weddingPlan.weddingLocation || ''}
                      onChange={(e) => updateWeddingPlan({ weddingLocation: e.target.value })}
                      placeholder="Contoh: Gedung / Rumah, Bogor"
                      className="w-full rounded-xl border border-[#D8C8AE] bg-white px-3 py-1.5 text-xs text-[#26211D]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#5C4E3E] mb-1">
                      Jenis Acara
                    </label>
                    <select
                      value={eventType}
                      onChange={(e) => setEventType(e.target.value)}
                      className="w-full rounded-xl border border-[#D8C8AE] bg-white px-2.5 py-1.5 text-xs text-[#26211D]"
                    >
                      <option value="Akad & Resepsi">Akad & Resepsi</option>
                      <option value="Akad Nikah / Intimate">Akad Nikah / Intimate</option>
                      <option value="Resepsi Gedung / Ballroom">Resepsi Gedung / Ballroom</option>
                      <option value="Garden / Outdoor Wedding">Garden / Outdoor Wedding</option>
                      <option value="Pernikahan di Rumah">Pernikahan di Rumah</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#6E6359] pb-1">
                <span>Atur jumlah (misal 500 pcs untuk souvenir/undangan):</span>
                <button
                  type="button"
                  onClick={clearCart}
                  className="text-[#9E3B3B] hover:underline font-medium cursor-pointer shrink-0"
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
                    <div className="pt-2.5 border-t border-[#F2ECE1] flex flex-wrap items-center justify-between gap-2">
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

              {/* Optional Custom Consultation Note & Payment Proof */}
              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#5C4E3E] mb-1.5">
                    Catatan Tambahan (Opsional)
                  </label>
                  <textarea
                    rows={2}
                    value={customNote}
                    onChange={(e) => setCustomNote(e.target.value)}
                    placeholder="Contoh: Lokasi di Gedung Kartika, mohon info jadwal fitting & survei..."
                    className="w-full rounded-xl border border-[#D8C8AE] bg-white px-3.5 py-2 text-xs text-[#26211D] focus:outline-none focus:border-[#9E762C]"
                  />
                </div>

                <div className="p-3 rounded-xl border border-dashed border-[#C9B38B] bg-[#FAF6EE] flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-[#26211D] block">
                      Bukti DP / Pembayaran (Opsional)
                    </span>
                    <span className="text-[11px] text-[#6E6359] block truncate">
                      {paymentProofUrl
                        ? '✓ Bukti pembayaran terlampir'
                        : 'Unggah jika Anda sudah melakukan transfer DP'}
                    </span>
                  </div>
                  <label className="px-3 py-1.5 rounded-lg bg-white border border-[#D8C8AE] hover:border-[#9E762C] text-xs font-medium text-[#26211D] inline-flex items-center gap-1.5 cursor-pointer shrink-0">
                    {isUploadingProof ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#9E762C]" />
                    ) : paymentProofUrl ? (
                      <Check className="w-3.5 h-3.5 text-[#35543D]" />
                    ) : (
                      <Upload className="w-3.5 h-3.5 text-[#9E762C]" />
                    )}
                    <span>{paymentProofUrl ? 'Ganti Foto' : 'Upload Bukti'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleProofUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Sticky Footer with Total Estimation, Official Booking Submit, Sync to Budget & WhatsApp Action */}
        {cartItems.length > 0 && (
          <div className="p-4 sm:p-6 bg-[#FCFBF8] border-t border-[#EAE0CE] space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs text-[#6E6359]">Total Estimasi Pilihan</p>
                <p className="text-[11px] text-[#8C7A65]">
                  Tersimpan di database & terhubung Kalkulator Budget
                </p>
              </div>
              <p className="text-xl sm:text-2xl font-serif-display font-bold text-[#26211D] font-tabular">
                {formatRupiah(cartTotal)}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                disabled={isSubmittingOrder}
                onClick={handleSaveBookingOrder}
                className="py-3 px-4 rounded-xl bg-[#26211D] hover:bg-[#3A322C] text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                {isSubmittingOrder ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#D9C7A3]" />
                ) : (
                  <FileCheck className="w-4 h-4 text-[#D9C7A3] shrink-0" />
                )}
                <span>Simpan Booking Resmi</span>
              </button>

              {onOpenBudgetCalculator && (
                <button
                  type="button"
                  onClick={() => {
                    syncCartToBudget();
                    onClose();
                    onOpenBudgetCalculator();
                  }}
                  className="py-3 px-4 rounded-xl border border-[#C8B282] bg-[#FAF6EE] hover:bg-[#EFE6D5] text-[#26211D] text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-center"
                >
                  <Calculator className="w-4 h-4 text-[#9E762C] shrink-0" />
                  <span>Kalkulator Budget</span>
                </button>
              )}
            </div>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleConsultClick}
              className="w-full py-3 px-4 sm:px-5 rounded-xl bg-[#4E6752] hover:bg-[#3F5543] text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-md transition-colors text-center leading-snug"
            >
              <MessageCircle className="w-4 h-4 shrink-0" />
              <span>Konsultasikan Pilihan via WhatsApp ({cartItems.length} Produk)</span>
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
