import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Calculator,
  Calendar as CalendarIcon,
  Check,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Sparkles,
  Users,
} from 'lucide-react';
import { useWedding } from '../context/WeddingContext';
import { Product } from '../types';
import {
  buildWhatsAppUrl,
  formatRupiah,
  getPrimaryImage,
} from '../utils/imageUtils';
import { FloralDivider } from './FloralOrnaments';
import { SafeWeddingImage } from './SafeWeddingImage';

const STEP_LABELS = [
  { step: 1, title: 'Tanggal Pernikahan' },
  { step: 2, title: 'Jumlah Tamu' },
  { step: 3, title: 'Pilih Dekorasi' },
  { step: 4, title: 'Pilih Undangan' },
  { step: 5, title: 'Pilih Souvenir' },
  { step: 6, title: 'Pilih Mahar/Seserahan' },
  { step: 7, title: 'Layanan Tambahan' },
  { step: 8, title: 'Ringkasan Pilihan' },
  { step: 9, title: 'Rencana Pernikahan Anda' },
];

const INDONESIAN_MONTHS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

export const WeddingPlannerWizard: React.FC = () => {
  const {
    settings,
    products,
    calendarPublic,
    weddingPlan,
    updateWeddingPlan,
    syncPlannerToBudget,
    recordInquiry,
  } = useWedding();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [calMonth, setCalMonth] = useState<number>(9); // October (0-indexed)
  const [calYear, setCalYear] = useState<number>(2026);

  const activeProducts = useMemo(
    () => products.filter((p) => p.isActive !== false),
    [products]
  );

  const decorProducts = useMemo(
    () =>
      activeProducts.filter(
        (p) =>
          p.category.toLowerCase().includes('dekorasi') ||
          p.category.toLowerCase().includes('tenda')
      ),
    [activeProducts]
  );

  const invitationProducts = useMemo(
    () =>
      activeProducts.filter((p) => p.category.toLowerCase().includes('undangan')),
    [activeProducts]
  );

  const souvenirProducts = useMemo(
    () =>
      activeProducts.filter((p) => p.category.toLowerCase().includes('souvenir')),
    [activeProducts]
  );

  const maharSeserahanProducts = useMemo(
    () =>
      activeProducts.filter(
        (p) =>
          p.category.toLowerCase().includes('mahar') ||
          p.category.toLowerCase().includes('seserahan')
      ),
    [activeProducts]
  );

  const additionalProducts = useMemo(
    () =>
      activeProducts.filter((p) => {
        const c = p.category.toLowerCase();
        return (
          c.includes('mua') ||
          c.includes('makeup') ||
          c.includes('wo') ||
          c.includes('organizer') ||
          c.includes('sanggar') ||
          c.includes('attire') ||
          c.includes('entertainment') ||
          c.includes('mc') ||
          c.includes('parkir') ||
          c.includes('security') ||
          c.includes('dokumentasi') ||
          c.includes('busana') ||
          c.includes('buket') ||
          c.includes('tenda') ||
          c.includes('lainnya')
        );
      }),
    [activeProducts]
  );

  // Selected entities
  const selectedDecor = products.find((p) => p.id === weddingPlan.selectedDecorId);
  const selectedInvitation = products.find(
    (p) => p.id === weddingPlan.selectedInvitationId
  );
  const selectedSouvenir = products.find(
    (p) => p.id === weddingPlan.selectedSouvenirId
  );
  const selectedMahar = products.find((p) => p.id === weddingPlan.selectedMaharId);
  const selectedAddons = products.filter((p) =>
    weddingPlan.additionalServiceIds.includes(p.id)
  );

  // Calculate Total Plan Budget
  const totalEstimatedPlan = useMemo(() => {
    let sum = 0;
    if (selectedDecor) sum += selectedDecor.price;
    if (selectedInvitation) {
      const qty =
        selectedInvitation.unit?.toLowerCase() === 'pcs'
          ? weddingPlan.invitationQty || weddingPlan.guestCount
          : 1;
      sum += selectedInvitation.price * qty;
    }
    if (selectedSouvenir) {
      const qty =
        selectedSouvenir.unit?.toLowerCase() === 'pcs'
          ? weddingPlan.souvenirQty || weddingPlan.guestCount
          : 1;
      sum += selectedSouvenir.price * qty;
    }
    if (selectedMahar) sum += selectedMahar.price;
    for (const addon of selectedAddons) {
      sum += addon.price;
    }
    return sum;
  }, [
    selectedDecor,
    selectedInvitation,
    selectedSouvenir,
    selectedMahar,
    selectedAddons,
    weddingPlan.invitationQty,
    weddingPlan.souvenirQty,
    weddingPlan.guestCount,
  ]);

  // Calendar Helper for Step 1 & Date Availability Checker
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(calYear, calMonth, 1).getDay();

  const selectedDateEntry = calendarPublic.find(
    (c) => c.date === weddingPlan.weddingDate
  );
  const selectedDateStatus = selectedDateEntry?.status || 'available';
  const selectedDateNote =
    selectedDateEntry?.publicNote || 'Tanggal tersedia untuk semua layanan & paket';

  const toggleAddon = (productId: string) => {
    const exists = weddingPlan.additionalServiceIds.includes(productId);
    const next = exists
      ? weddingPlan.additionalServiceIds.filter((id) => id !== productId)
      : [...weddingPlan.additionalServiceIds, productId];
    updateWeddingPlan({ additionalServiceIds: next });
  };

  // Build WhatsApp Message for Step 9
  const plannerWhatsAppMessage = useMemo(() => {
    const lines: string[] = [];
    if (selectedDecor) {
      lines.push(`- Dekorasi: ${selectedDecor.name} (${formatRupiah(selectedDecor.price)})`);
    }
    if (selectedInvitation) {
      const qty =
        selectedInvitation.unit?.toLowerCase() === 'pcs'
          ? weddingPlan.invitationQty || weddingPlan.guestCount
          : 1;
      lines.push(
        `- Undangan: ${selectedInvitation.name} (${qty} ${
          selectedInvitation.unit || 'pcs'
        }) = ${formatRupiah(selectedInvitation.price * qty)}`
      );
    }
    if (selectedSouvenir) {
      const qty =
        selectedSouvenir.unit?.toLowerCase() === 'pcs'
          ? weddingPlan.souvenirQty || weddingPlan.guestCount
          : 1;
      lines.push(
        `- Souvenir: ${selectedSouvenir.name} (${qty} ${
          selectedSouvenir.unit || 'pcs'
        }) = ${formatRupiah(selectedSouvenir.price * qty)}`
      );
    }
    if (selectedMahar) {
      lines.push(
        `- Mahar/Seserahan: ${selectedMahar.name} (${formatRupiah(selectedMahar.price)})`
      );
    }
    for (const addon of selectedAddons) {
      lines.push(`- Layanan Tambahan: ${addon.name} (${formatRupiah(addon.price)})`);
    }

    const notePart = weddingPlan.customNotes.trim()
      ? `\nCatatan Pengantin: ${weddingPlan.customNotes.trim()}\n`
      : '';

    return `Halo ISTAFA Wedding.\n\nSaya ingin berkonsultasi mengenai rencana pernikahan saya.\n\nNama: ${
      weddingPlan.coupleName?.trim() || 'Calon Pengantin'
    }\nTanggal: ${weddingPlan.weddingDate} (${
      selectedDateStatus === 'available'
        ? 'Tersedia'
        : selectedDateStatus === 'reserved'
        ? 'Reservasi'
        : 'Perlu Cek Jadwal'
    })\nLokasi: ${
      weddingPlan.weddingLocation?.trim() || 'Menyesuaikan lokasi acara'
    }\nJumlah tamu: ${weddingPlan.guestCount} Tamu\n\nProduk/Layanan:\n${
      lines.length > 0 ? lines.join('\n') : '- Konsultasi Kustom'
    }\n\nEstimasi Budget:\n${formatRupiah(
      totalEstimatedPlan
    )}${notePart}\n\nMohon informasi mengenai ketersediaan dan detail layanan.`;
  }, [
    weddingPlan,
    selectedDecor,
    selectedInvitation,
    selectedSouvenir,
    selectedMahar,
    selectedAddons,
    selectedDateStatus,
    totalEstimatedPlan,
  ]);

  const plannerWhatsAppUrl = buildWhatsAppUrl(
    settings.whatsappNumber,
    plannerWhatsAppMessage
  );

  const renderProductSelectGrid = (
    list: Product[],
    selectedId: string,
    onSelect: (id: string) => void
  ) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {list.map((prod) => {
        const isSelected = prod.id === selectedId;
        const primary = getPrimaryImage(prod.images);
        return (
          <div
            key={prod.id}
            onClick={() => onSelect(isSelected ? '' : prod.id)}
            className={`rounded-2xl border p-3.5 transition-all cursor-pointer flex flex-col justify-between ${
              isSelected
                ? 'border-[#9E762C] bg-[#FAF3E3] ring-2 ring-[#9E762C]/30'
                : 'border-[#E5DAC5] bg-white hover:border-[#C8B282]'
            }`}
          >
            <div>
              <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-[#F2ECE1] mb-3">
                <SafeWeddingImage
                  src={primary.url}
                  alt={prod.name}
                  className="w-full h-full object-cover"
                />
                {isSelected && (
                  <div className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-[#26211D] text-[#D9C7A3] flex items-center justify-center shadow-md">
                    <Check className="w-4 h-4" />
                  </div>
                )}
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#9E762C]">
                {prod.category}
              </span>
              <h4 className="font-serif-display font-semibold text-lg text-[#26211D] line-clamp-2 mt-0.5">
                {prod.name}
              </h4>
              <p className="text-xs text-[#6E6359] line-clamp-2 mt-1">
                {prod.shortDescription}
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-[#EAE0CE] flex items-center justify-between">
              <span className="text-sm font-bold text-[#9E762C] font-tabular">
                {formatRupiah(prod.price)}
                {prod.unit ? ` / ${prod.unit}` : ''}
              </span>
              <span className="text-xs font-medium text-[#26211D]">
                {isSelected ? 'Terpilih ✓' : 'Pilih'}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <section
      id="rencanakan-pernikahan"
      className="py-10 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto"
    >
      <div className="max-w-3xl mx-auto text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-[#9E762C] font-medium">
          Interactive Wedding Planner & Cek Tanggal
        </p>
        <h2 className="mt-2 heading-section-fluid font-serif-display font-semibold text-[#26211D] text-balance">
          Rencanakan Pernikahan Saya & Cek Ketersediaan Tanggal
        </h2>
        <p className="mt-3 text-sm sm:text-base text-[#5C5147]">
          Susun rencana hari bahagia Anda dalam 9 langkah mudah — mulai dari cek ketersediaan tanggal, jumlah tamu, dekorasi, undangan, souvenir, hingga ringkasan estimasi biaya.
        </p>
        <FloralDivider className="mt-5" />
      </div>

      {/* Stepper Progress Pills */}
      <div className="mt-8 sm:mt-10 flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
        {STEP_LABELS.map((item) => {
          const isCurrent = currentStep === item.step;
          const isCompleted = currentStep > item.step;
          return (
            <button
              key={item.step}
              type="button"
              onClick={() => setCurrentStep(item.step)}
              className={`px-3.5 py-2 rounded-xl text-xs font-medium flex items-center gap-2 shrink-0 transition-all cursor-pointer whitespace-nowrap ${
                isCurrent
                  ? 'bg-[#26211D] text-[#FBF9F5] shadow-sm'
                  : isCompleted
                  ? 'bg-[#EAE0CE] text-[#26211D]'
                  : 'bg-[#FCFBF8] text-[#7A6E63] border border-[#E5DAC5] hover:bg-[#F2ECE1]'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full text-[11px] flex items-center justify-center font-tabular shrink-0 ${
                  isCurrent
                    ? 'bg-[#C8A25A] text-[#1D1814] font-bold'
                    : isCompleted
                    ? 'bg-[#4E6752] text-white'
                    : 'bg-[#EFE8D8] text-[#5C4E3E]'
                }`}
              >
                {isCompleted ? '✓' : item.step}
              </span>
              <span>{item.title}</span>
            </button>
          );
        })}
      </div>

      {/* Wizard Container Card */}
      <div className="mt-5 sm:mt-6 rounded-3xl border border-[#DFD3BE] bg-[#FCFBF8] p-4 sm:p-6 lg:p-8 shadow-sm space-y-6 sm:space-y-8">
        <div key={`planner-step-${currentStep}`} className="animate-section-fade">
        {/* ===================================================================
            STEP 1: TANGGAL PERNIKAHAN & KALENDER KETERSEDIAAN (Req 9 & 10)
           =================================================================== */}
        {currentStep === 1 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-5 space-y-5">
              <div>
                <span className="text-xs font-semibold uppercase tracking-widest text-[#9E762C]">
                  Langkah 1 dari 9
                </span>
                <h3 className="mt-1 text-2xl sm:text-3xl font-serif-display font-semibold text-[#26211D]">
                  Pilih Tanggal & Cek Ketersediaan Jadwal
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-[#5C5147] leading-relaxed">
                  Pilih rencana tanggal pernikahan Anda melalui kalender interaktif di samping atau kotak tanggal di bawah ini untuk melihat status ketersediaan tim ISTAFA Wedding.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#F4EFE4] border border-[#E2D6C1] space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#5C4E3E] mb-1">
                      Nama Calon Pengantin
                    </label>
                    <input
                      type="text"
                      value={weddingPlan.coupleName || ''}
                      onChange={(e) => updateWeddingPlan({ coupleName: e.target.value })}
                      placeholder="Contoh: Aisyah & Rizky"
                      className="w-full rounded-xl border border-[#D8C8AE] bg-white px-3.5 py-2 text-xs sm:text-sm font-medium text-[#26211D]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#5C4E3E] mb-1">
                      Lokasi / Venue Acara
                    </label>
                    <input
                      type="text"
                      value={weddingPlan.weddingLocation || ''}
                      onChange={(e) => updateWeddingPlan({ weddingLocation: e.target.value })}
                      placeholder="Contoh: Gedung / Rumah, Jakarta"
                      className="w-full rounded-xl border border-[#D8C8AE] bg-white px-3.5 py-2 text-xs sm:text-sm font-medium text-[#26211D]"
                    />
                  </div>
                </div>

                <label className="block text-xs font-semibold uppercase tracking-wider text-[#5C4E3E]">
                  Tanggal Pernikahan Pilihan Anda
                </label>
                <input
                  type="date"
                  value={weddingPlan.weddingDate}
                  onChange={(e) => updateWeddingPlan({ weddingDate: e.target.value })}
                  className="w-full rounded-xl border border-[#9E762C] bg-white px-4 py-2.5 text-sm font-semibold text-[#26211D] font-tabular"
                />

                {/* Status Badge for Selected Date */}
                <div className="p-3.5 rounded-xl bg-white border border-[#E5DAC5] flex items-start gap-3">
                  <span className="text-lg leading-none mt-0.5">
                    {selectedDateStatus === 'available'
                      ? '🟢'
                      : selectedDateStatus === 'reserved'
                      ? '🟡'
                      : '🔴'}
                  </span>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-[#26211D]">
                      Status {weddingPlan.weddingDate}:{' '}
                      {selectedDateStatus === 'available'
                        ? 'Tersedia'
                        : selectedDateStatus === 'reserved'
                        ? 'Reservasi (Slot Terbatas)'
                        : 'Tidak Tersedia (Full Booked)'}
                    </p>
                    <p className="text-xs text-[#6E6359]">{selectedDateNote}</p>
                  </div>
                </div>

                <a
                  href={buildWhatsAppUrl(
                    settings.whatsappNumber,
                    `Halo ISTAFA Wedding, saya ingin mengecek ketersediaan jadwal pernikahan untuk tanggal ${weddingPlan.weddingDate}.`
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-xs font-semibold text-[#4E6752] hover:underline pt-1"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Konfirmasi langsung tanggal ini via WhatsApp</span>
                </a>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-[#5C4E3E]">
                <span className="inline-flex items-center gap-1.5">
                  <span>🟢</span>
                  <span>Tersedia</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span>🟡</span>
                  <span>Reservasi</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span>🔴</span>
                  <span>Tidak tersedia</span>
                </span>
              </div>
            </div>

            {/* Interactive Monthly Calendar Grid */}
            <div className="lg:col-span-7 rounded-2xl border border-[#E4DAC7] bg-white p-3.5 sm:p-5 space-y-4 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (calMonth === 0) {
                      setCalMonth(11);
                      setCalYear((y) => y - 1);
                    } else {
                      setCalMonth((m) => m - 1);
                    }
                  }}
                  className="p-2 rounded-xl border border-[#E2D6C1] hover:bg-[#F4EFE4] cursor-pointer shrink-0"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="text-center min-w-0">
                  <h4 className="font-serif-display font-semibold text-lg sm:text-xl text-[#26211D]">
                    {INDONESIAN_MONTHS[calMonth]} {calYear}
                  </h4>
                  <p className="text-[11px] text-[#7A6E63]">
                    Klik tanggal untuk memilih & melihat status
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (calMonth === 11) {
                      setCalMonth(0);
                      setCalYear((y) => y + 1);
                    } else {
                      setCalMonth((m) => m + 1);
                    }
                  }}
                  className="p-2 rounded-xl border border-[#E2D6C1] hover:bg-[#F4EFE4] cursor-pointer shrink-0"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 sm:gap-1.5 text-center text-[10px] sm:text-[11px] font-semibold text-[#8C7A65] pb-1 border-b border-[#EFE8D8]">
                <span>Min</span>
                <span>Sen</span>
                <span>Sel</span>
                <span>Rab</span>
                <span>Kam</span>
                <span>Jum</span>
                <span>Sab</span>
              </div>

              <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
                  <div key={`empty-${idx}`} className="h-11 sm:h-12" />
                ))}
                {Array.from({ length: daysInMonth }).map((_, idx) => {
                  const dayNum = idx + 1;
                  const dateStr = `${calYear}-${String(calMonth + 1).padStart(
                    2,
                    '0'
                  )}-${String(dayNum).padStart(2, '0')}`;
                  const entry = calendarPublic.find((c) => c.date === dateStr);
                  const status = entry?.status || 'available';
                  const isSelected = weddingPlan.weddingDate === dateStr;

                  return (
                    <button
                      key={dateStr}
                      type="button"
                      onClick={() => updateWeddingPlan({ weddingDate: dateStr })}
                      className={`h-11 sm:h-12 rounded-xl border text-[11px] sm:text-xs font-tabular flex flex-col items-center justify-center transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#26211D] bg-[#26211D] text-white font-bold shadow-xs'
                          : status === 'unavailable'
                          ? 'border-[#F2CACA] bg-[#FFF5F5] text-[#9E3B3B]'
                          : status === 'reserved'
                          ? 'border-[#EDD79A] bg-[#FFFBEB] text-[#8C6218]'
                          : 'border-[#E8E2D5] bg-[#FCFBF8] hover:border-[#9E762C] text-[#26211D]'
                      }`}
                    >
                      <span>{dayNum}</span>
                      <span className="text-[8px] sm:text-[9px] leading-none mt-0.5">
                        {status === 'available'
                          ? '🟢'
                          : status === 'reserved'
                          ? '🟡'
                          : '🔴'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            STEP 2: JUMLAH TAMU
           =================================================================== */}
        {currentStep === 2 && (
          <div className="max-w-2xl mx-auto space-y-6 text-center">
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-[#9E762C]">
                Langkah 2 dari 9
              </span>
              <h3 className="mt-1 text-2xl sm:text-3xl font-serif-display font-semibold text-[#26211D]">
                Berapa Estimasi Jumlah Tamu Undangan Anda?
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-[#5C5147]">
                Jumlah tamu akan otomatis menyesuaikan perhitungan kebutuhan undangan cetak dan souvenir pernikahan Anda.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              {[100, 200, 300, 500, 800, 1000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() =>
                    updateWeddingPlan({
                      guestCount: preset,
                      invitationQty: preset,
                      souvenirQty: preset,
                    })
                  }
                  className={`px-5 py-3 rounded-2xl border text-sm font-semibold font-tabular transition-all cursor-pointer ${
                    weddingPlan.guestCount === preset
                      ? 'border-[#9E762C] bg-[#26211D] text-white shadow-xs'
                      : 'border-[#E2D6C1] bg-white text-[#26211D] hover:bg-[#F4EFE4]'
                  }`}
                >
                  {preset} Tamu
                </button>
              ))}
            </div>

            <div className="max-w-xs mx-auto p-4 rounded-2xl bg-[#F4EFE4] border border-[#E2D6C1]">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#5C4E3E] mb-2">
                Atau Masukkan Jumlah Spesifik
              </label>
              <div className="flex items-center justify-center gap-2">
                <Users className="w-5 h-5 text-[#9E762C]" />
                <input
                  type="number"
                  min={20}
                  step={25}
                  value={weddingPlan.guestCount}
                  onChange={(e) => {
                    const val = Math.max(10, Number(e.target.value) || 100);
                    updateWeddingPlan({
                      guestCount: val,
                      invitationQty: val,
                      souvenirQty: val,
                    });
                  }}
                  className="w-32 text-center rounded-xl border border-[#9E762C] bg-white px-3 py-2 text-lg font-bold font-tabular"
                />
                <span className="text-sm font-medium">Orang</span>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            STEP 3: PILIH DEKORASI
           =================================================================== */}
        {currentStep === 3 && (
          <div className="space-y-5">
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-[#9E762C]">
                Langkah 3 dari 9
              </span>
              <h3 className="mt-1 text-2xl sm:text-3xl font-serif-display font-semibold text-[#26211D]">
                Pilih Dekorasi Pernikahan / Tenda Utama
              </h3>
              <p className="text-xs sm:text-sm text-[#5C5147]">
                Pilih salah satu konsep dekorasi pelaminan atau tenda dari katalog ISTAFA Wedding.
              </p>
            </div>
            {renderProductSelectGrid(
              decorProducts,
              weddingPlan.selectedDecorId,
              (id) => updateWeddingPlan({ selectedDecorId: id })
            )}
          </div>
        )}

        {/* ===================================================================
            STEP 4: PILIH UNDANGAN
           =================================================================== */}
        {currentStep === 4 && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-widest text-[#9E762C]">
                  Langkah 4 dari 9
                </span>
                <h3 className="mt-1 text-2xl sm:text-3xl font-serif-display font-semibold text-[#26211D]">
                  Pilih Undangan Cetak atau Undangan Digital
                </h3>
              </div>
              <div className="flex items-center gap-2 bg-[#F4EFE4] px-3.5 py-2 rounded-xl border border-[#E2D6C1]">
                <span className="text-xs font-medium text-[#5C4E3E]">Jumlah Pcs:</span>
                <input
                  type="number"
                  min={50}
                  step={50}
                  value={weddingPlan.invitationQty}
                  onChange={(e) =>
                    updateWeddingPlan({
                      invitationQty: Math.max(1, Number(e.target.value) || 100),
                    })
                  }
                  className="w-20 rounded-lg border border-[#D8C8AE] bg-white px-2 py-1 text-xs font-bold text-center font-tabular"
                />
              </div>
            </div>
            {renderProductSelectGrid(
              invitationProducts,
              weddingPlan.selectedInvitationId,
              (id) => updateWeddingPlan({ selectedInvitationId: id })
            )}
          </div>
        )}

        {/* ===================================================================
            STEP 5: PILIH SOUVENIR
           =================================================================== */}
        {currentStep === 5 && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-widest text-[#9E762C]">
                  Langkah 5 dari 9
                </span>
                <h3 className="mt-1 text-2xl sm:text-3xl font-serif-display font-semibold text-[#26211D]">
                  Pilih Souvenir Pernikahan
                </h3>
              </div>
              <div className="flex items-center gap-2 bg-[#F4EFE4] px-3.5 py-2 rounded-xl border border-[#E2D6C1]">
                <span className="text-xs font-medium text-[#5C4E3E]">Jumlah Pcs:</span>
                <input
                  type="number"
                  min={50}
                  step={50}
                  value={weddingPlan.souvenirQty}
                  onChange={(e) =>
                    updateWeddingPlan({
                      souvenirQty: Math.max(1, Number(e.target.value) || 100),
                    })
                  }
                  className="w-20 rounded-lg border border-[#D8C8AE] bg-white px-2 py-1 text-xs font-bold text-center font-tabular"
                />
              </div>
            </div>
            {renderProductSelectGrid(
              souvenirProducts,
              weddingPlan.selectedSouvenirId,
              (id) => updateWeddingPlan({ selectedSouvenirId: id })
            )}
          </div>
        )}

        {/* ===================================================================
            STEP 6: PILIH MAHAR / SESERAHAN
           =================================================================== */}
        {currentStep === 6 && (
          <div className="space-y-5">
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-[#9E762C]">
                Langkah 6 dari 9
              </span>
              <h3 className="mt-1 text-2xl sm:text-3xl font-serif-display font-semibold text-[#26211D]">
                Pilih Mahar & Kotak Seserahan
              </h3>
            </div>
            {renderProductSelectGrid(
              maharSeserahanProducts,
              weddingPlan.selectedMaharId,
              (id) => updateWeddingPlan({ selectedMaharId: id })
            )}
          </div>
        )}

        {/* ===================================================================
            STEP 7: PILIH LAYANAN WEDDING & PENDUKUNG (MUA, WO, Sanggar, Attire, Dokumentasi, dll)
           =================================================================== */}
        {currentStep === 7 && (
          <div className="space-y-5">
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-[#9E762C]">
                Langkah 7 dari 9
              </span>
              <h3 className="mt-1 text-2xl sm:text-3xl font-serif-display font-semibold text-[#26211D]">
                Pilih Layanan Wedding & Pendukung (Bisa Lebih dari Satu)
              </h3>
              <p className="text-xs sm:text-sm text-[#5C5147]">
                Lengkapi rencana pernikahan Anda dengan layanan <strong>MUA — Make Up Artist</strong>, <strong>WO — Wedding Organizer</strong>, <strong>Tim Sanggar</strong>, <strong>Tim Attire</strong>, Dokumentasi, atau Busana Pengantin.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {additionalProducts.map((prod) => {
                const isSelected = weddingPlan.additionalServiceIds.includes(prod.id);
                const primary = getPrimaryImage(prod.images);
                return (
                  <div
                    key={prod.id}
                    onClick={() => toggleAddon(prod.id)}
                    className={`rounded-2xl border p-4 transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-[#9E762C] bg-[#FAF3E3] ring-2 ring-[#9E762C]/30'
                        : 'border-[#E5DAC5] bg-white hover:border-[#C8B282]'
                    }`}
                  >
                    <div>
                      <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-[#F2ECE1] mb-3">
                        <SafeWeddingImage
                          src={primary.url}
                          alt={prod.name}
                          className="w-full h-full object-cover"
                        />
                        {isSelected && (
                          <div className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-[#26211D] text-[#D9C7A3] flex items-center justify-center">
                            <Check className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#9E762C]">
                        {prod.category}
                      </span>
                      <h4 className="font-serif-display font-semibold text-lg text-[#26211D] line-clamp-2 mt-0.5">
                        {prod.name}
                      </h4>
                      {prod.inclusions && prod.inclusions.length > 0 && (
                        <ul className="mt-2 space-y-1 text-[11px] text-[#5C5147]">
                          {prod.inclusions.slice(0, 4).map((inc, idx) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <span className="text-[#9E762C] font-bold">✓</span>
                              <span className="line-clamp-1">{inc}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="mt-3 pt-2.5 border-t border-[#EAE0CE] flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-[#7A6B58] block">
                          {prod.priceLabel || 'Mulai dari'}
                        </span>
                        <span className="text-sm font-bold text-[#9E762C] font-tabular">
                          {formatRupiah(prod.price)}
                        </span>
                      </div>
                      <span className="text-xs font-medium text-[#26211D]">
                        {isSelected ? 'Ditambahkan ✓' : '+ Pilih Layanan'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ===================================================================
            STEP 8: TAMPILKAN RINGKASAN SEMENTARA & CATATAN
           =================================================================== */}
        {currentStep === 8 && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-[#9E762C]">
                Langkah 8 dari 9
              </span>
              <h3 className="mt-1 text-2xl sm:text-3xl font-serif-display font-semibold text-[#26211D]">
                Tinjau Ringkasan & Tambahkan Catatan Khusus
              </h3>
              <p className="text-xs sm:text-sm text-[#5C5147]">
                Periksa kembali pilihan Anda sebelum membuat dokumen Rencana Pernikahan di Langkah 9.
              </p>
            </div>

            <div className="rounded-2xl border border-[#E4DAC7] bg-white p-4 sm:p-5 space-y-2.5 text-xs sm:text-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4 py-2 border-b border-[#F2ECE1]">
                <span className="text-[#6E6359] shrink-0">Nama Pengantin & Lokasi</span>
                <span className="font-semibold text-[#26211D] sm:text-right break-words">
                  {weddingPlan.coupleName || 'Calon Pengantin'} ·{' '}
                  {weddingPlan.weddingLocation || 'Lokasi Menyesuaikan'}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4 py-2 border-b border-[#F2ECE1]">
                <span className="text-[#6E6359] shrink-0">Tanggal & Jumlah Tamu</span>
                <span className="font-semibold text-[#26211D] font-tabular sm:text-right">
                  {weddingPlan.weddingDate} · {weddingPlan.guestCount} Tamu
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4 py-2 border-b border-[#F2ECE1]">
                <span className="text-[#6E6359] shrink-0">Dekorasi Pilihan</span>
                <span className="font-semibold text-[#26211D] sm:text-right break-words">
                  {selectedDecor ? selectedDecor.name : 'Belum dipilih'}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4 py-2 border-b border-[#F2ECE1]">
                <span className="text-[#6E6359] shrink-0">Undangan & Souvenir</span>
                <span className="font-semibold text-[#26211D] sm:text-right break-words">
                  {selectedInvitation ? `${selectedInvitation.name} (${weddingPlan.invitationQty})` : '-'} /{' '}
                  {selectedSouvenir ? `${selectedSouvenir.name} (${weddingPlan.souvenirQty})` : '-'}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4 py-2 border-b border-[#F2ECE1]">
                <span className="text-[#6E6359] shrink-0">Mahar & Layanan Tambahan</span>
                <span className="font-semibold text-[#26211D] sm:text-right break-words">
                  {[selectedMahar?.name, ...selectedAddons.map((a) => a.name)]
                    .filter(Boolean)
                    .join(', ') || '-'}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#5C4E3E] mb-1.5">
                Catatan Tambahan untuk Tim Konsultan (Opsional)
              </label>
              <textarea
                rows={3}
                value={weddingPlan.customNotes}
                onChange={(e) => updateWeddingPlan({ customNotes: e.target.value })}
                placeholder="Contoh: Acara akad pagi jam 08.00 di rumah, resepsi siang di gedung..."
                className="w-full rounded-xl border border-[#D8C8AE] bg-white px-4 py-2.5 text-sm text-[#26211D]"
              />
            </div>
          </div>
        )}

        {/* ===================================================================
            STEP 9: "RENCANA PERNIKAHAN ANDA" (Final Summary + Send to WhatsApp)
           =================================================================== */}
        {currentStep === 9 && (
          <div className="max-w-4xl mx-auto rounded-3xl border-2 border-[#C8A25A] bg-[#221D19] text-[#FBF9F5] p-6 sm:p-10 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/15">
              <div>
                <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#D9C7A3]">
                  <Sparkles className="w-4 h-4" />
                  <span>Langkah 9 · Dokumen Perencanaan Resmi</span>
                </div>
                <h3 className="mt-1 text-3xl sm:text-4xl font-serif-display font-semibold text-white">
                  Rencana Pernikahan Anda
                </h3>
              </div>

              <div className="text-left sm:text-right">
                <p className="text-xs uppercase tracking-widest text-[#D9C7A3]">
                  Estimasi Total Budget
                </p>
                <p className="text-2xl sm:text-3xl font-serif-display font-bold text-[#E6D3B3] font-tabular">
                  {formatRupiah(totalEstimatedPlan)}
                </p>
              </div>
            </div>

            {/* Key Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <p className="text-[11px] uppercase tracking-wider text-[#CBBFA8]">
                  Tanggal Pernikahan
                </p>
                <p className="text-lg font-serif-display font-semibold text-white mt-0.5 font-tabular">
                  {weddingPlan.weddingDate}
                </p>
                <p className="text-[11px] text-[#D9C7A3] mt-0.5">
                  {selectedDateStatus === 'available'
                    ? '🟢 Jadwal Tersedia'
                    : selectedDateStatus === 'reserved'
                    ? '🟡 Slot Terbatas'
                    : '🔴 Perlu Cek Alternatif'}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <p className="text-[11px] uppercase tracking-wider text-[#CBBFA8]">
                  Estimasi Jumlah Tamu
                </p>
                <p className="text-lg font-serif-display font-semibold text-white mt-0.5 font-tabular">
                  {weddingPlan.guestCount} Tamu Undangan
                </p>
                <p className="text-[11px] text-[#D9C7A3] mt-0.5">
                  Undangan: {weddingPlan.invitationQty} · Souvenir: {weddingPlan.souvenirQty}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <p className="text-[11px] uppercase tracking-wider text-[#CBBFA8]">
                  Pengantin & Lokasi Acara
                </p>
                <p className="text-lg font-serif-display font-semibold text-white mt-0.5 truncate">
                  {weddingPlan.coupleName || 'Calon Pengantin'}
                </p>
                <p className="text-[11px] text-[#D9C7A3] mt-0.5 truncate">
                  {weddingPlan.weddingLocation || `Kurasi ${settings.businessName}`}
                </p>
              </div>
            </div>

            {/* Detailed Items Breakdown */}
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-5 space-y-3 text-xs sm:text-sm">
              <h4 className="text-xs font-semibold uppercase tracking-widest text-[#D9C7A3]">
                Rincian Komponen Pernikahan Terpilih
              </h4>

              {selectedDecor && (
                <div className="flex justify-between items-start gap-3 py-2 border-b border-white/10">
                  <span className="min-w-0 break-words">Dekorasi: {selectedDecor.name}</span>
                  <span className="font-tabular font-semibold text-[#E6D3B3] shrink-0">
                    {formatRupiah(selectedDecor.price)}
                  </span>
                </div>
              )}

              {selectedInvitation && (
                <div className="flex justify-between items-start gap-3 py-2 border-b border-white/10">
                  <span className="min-w-0 break-words">
                    Undangan: {selectedInvitation.name} ({weddingPlan.invitationQty}{' '}
                    {selectedInvitation.unit || 'pcs'})
                  </span>
                  <span className="font-tabular font-semibold text-[#E6D3B3] shrink-0">
                    {formatRupiah(
                      selectedInvitation.price *
                        (selectedInvitation.unit?.toLowerCase() === 'pcs'
                          ? weddingPlan.invitationQty
                          : 1)
                    )}
                  </span>
                </div>
              )}

              {selectedSouvenir && (
                <div className="flex justify-between items-start gap-3 py-2 border-b border-white/10">
                  <span className="min-w-0 break-words">
                    Souvenir: {selectedSouvenir.name} ({weddingPlan.souvenirQty}{' '}
                    {selectedSouvenir.unit || 'pcs'})
                  </span>
                  <span className="font-tabular font-semibold text-[#E6D3B3] shrink-0">
                    {formatRupiah(
                      selectedSouvenir.price *
                        (selectedSouvenir.unit?.toLowerCase() === 'pcs'
                          ? weddingPlan.souvenirQty
                          : 1)
                    )}
                  </span>
                </div>
              )}

              {selectedMahar && (
                <div className="flex justify-between items-start gap-3 py-2 border-b border-white/10">
                  <span className="min-w-0 break-words">Mahar / Seserahan: {selectedMahar.name}</span>
                  <span className="font-tabular font-semibold text-[#E6D3B3] shrink-0">
                    {formatRupiah(selectedMahar.price)}
                  </span>
                </div>
              )}

              {selectedAddons.map((addon) => (
                <div
                  key={addon.id}
                  className="flex justify-between items-start gap-3 py-2 border-b border-white/10"
                >
                  <span className="min-w-0 break-words">
                    {addon.category}: {addon.name}
                  </span>
                  <span className="font-tabular font-semibold text-[#E6D3B3] shrink-0">
                    {formatRupiah(addon.price)}
                  </span>
                </div>
              ))}
            </div>

            {/* Action Buttons: Sync to Budget & Send to WhatsApp */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={syncPlannerToBudget}
                className="py-3.5 px-6 rounded-xl border border-[#D9C7A3]/40 bg-white/10 hover:bg-white/15 text-white text-xs sm:text-sm font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Calculator className="w-4 h-4 text-[#D9C7A3]" />
                <span>Masukkan ke Kalkulator Budget</span>
              </button>

              <a
                href={plannerWhatsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() =>
                  recordInquiry({
                    type: 'planner',
                    coupleName: weddingPlan.coupleName,
                    weddingLocation: weddingPlan.weddingLocation,
                    customerDate: weddingPlan.weddingDate,
                    guestCount: weddingPlan.guestCount,
                    itemsSummary: [
                      selectedDecor?.name || '',
                      selectedInvitation?.name || '',
                      selectedSouvenir?.name || '',
                      selectedMahar?.name || '',
                      ...selectedAddons.map((a) => a.name),
                    ].filter(Boolean),
                    totalEstimate: totalEstimatedPlan,
                    customNotes: weddingPlan.customNotes,
                  })
                }
                className="py-3.5 px-7 rounded-xl bg-[#C8A25A] hover:bg-[#B58E47] text-[#1D1814] font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Kirim Rencana ke WhatsApp</span>
              </a>
            </div>
          </div>
        )}
        </div>

        {/* Wizard Bottom Navigation Bar */}
        <div className="pt-5 sm:pt-6 border-t border-[#EAE0CE] space-y-3">
          <div className="sm:hidden text-center text-xs text-[#7A6E63] font-tabular">
            Langkah {currentStep} dari 9 · Estimasi Sementara:{' '}
            <strong className="text-[#9E762C]">{formatRupiah(totalEstimatedPlan)}</strong>
          </div>

          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <button
              type="button"
              disabled={currentStep === 1}
              onClick={() => setCurrentStep((s) => Math.max(1, s - 1))}
              className="px-3.5 sm:px-4 py-2.5 rounded-xl border border-[#D8C8AE] bg-white hover:bg-[#F4EFE4] disabled:opacity-40 text-xs sm:text-sm font-medium text-[#26211D] flex items-center gap-1.5 sm:gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 shrink-0" />
              <span>Sebelumnya</span>
            </button>

            <div className="text-xs text-[#7A6E63] font-tabular hidden sm:block">
              Langkah {currentStep} dari 9 · Estimasi Sementara:{' '}
              <strong className="text-[#9E762C]">{formatRupiah(totalEstimatedPlan)}</strong>
            </div>

            {currentStep < 9 ? (
              <button
                type="button"
                onClick={() => setCurrentStep((s) => Math.min(9, s + 1))}
                className="px-4 sm:px-5 py-2.5 rounded-xl bg-[#26211D] hover:bg-[#3A322C] text-white text-xs sm:text-sm font-medium flex items-center gap-1.5 sm:gap-2 cursor-pointer"
              >
                <span>Selanjutnya</span>
                <ArrowRight className="w-4 h-4 text-[#D9C7A3] shrink-0" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-4 sm:px-5 py-2.5 rounded-xl border border-[#9E762C] text-[#9E762C] text-xs sm:text-sm font-medium flex items-center gap-1.5 sm:gap-2 cursor-pointer"
              >
                <CalendarIcon className="w-4 h-4 shrink-0" />
                <span>Ubah dari Langkah 1</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
