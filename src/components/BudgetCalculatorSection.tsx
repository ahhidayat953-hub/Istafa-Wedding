import React from 'react';
import {
  BookmarkCheck,
  Calculator,
  MessageCircle,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  Users,
} from 'lucide-react';
import { useWedding } from '../context/WeddingContext';
import { INITIAL_BUDGET_ALLOCATION } from '../data/initialData';
import { BudgetAllocation } from '../types';
import {
  buildBudgetWhatsAppMessage,
  buildWhatsAppUrl,
  formatRupiah,
} from '../utils/imageUtils';
import { FloralDivider } from './FloralOrnaments';

const BUDGET_FIELDS: {
  key: keyof Omit<BudgetAllocation, 'guestCount' | 'notes'>;
  label: string;
  hint: string;
  catalogCategoryKeyword: string;
}[] = [
  {
    key: 'catering',
    label: 'Catering & Jamuan Tamu',
    hint: 'Prasmanan & pondokan tamu',
    catalogCategoryKeyword: 'catering',
  },
  {
    key: 'dekorasi',
    label: 'Dekorasi Pernikahan',
    hint: 'Pelaminan, meja VIP & bunga segar',
    catalogCategoryKeyword: 'dekorasi',
  },
  {
    key: 'tenda',
    label: 'Tenda & Flooring',
    hint: 'Tenda transparan / serut & kursi',
    catalogCategoryKeyword: 'tenda',
  },
  {
    key: 'undangan',
    label: 'Undangan (Cetak & Digital)',
    hint: 'Undangan fisik & website RSVP',
    catalogCategoryKeyword: 'undangan',
  },
  {
    key: 'souvenir',
    label: 'Souvenir Pernikahan',
    hint: 'Bingkisan tanda terima kasih tamu',
    catalogCategoryKeyword: 'souvenir',
  },
  {
    key: 'dokumentasi',
    label: 'Dokumentasi Foto & Video',
    hint: 'Liputan foto, video sinematik & album',
    catalogCategoryKeyword: 'dokumentasi',
  },
  {
    key: 'makeup',
    label: 'MUA — Make Up Artist',
    hint: 'Makeup pengantin, hairdo, touch up & keluarga',
    catalogCategoryKeyword: 'mua',
  },
  {
    key: 'wo',
    label: 'WO — Wedding Organizer',
    hint: 'Koordinasi acara, rundown, vendor & hari H',
    catalogCategoryKeyword: 'wo',
  },
  {
    key: 'sanggar',
    label: 'Tim Sanggar (Pertunjukan)',
    hint: 'Tari penyambutan, kirab adat & kesenian',
    catalogCategoryKeyword: 'sanggar',
  },
  {
    key: 'attire',
    label: 'Tim Attire (Pendampingan Pakaian)',
    hint: 'Persiapan attire & merapikan pakaian pengantin',
    catalogCategoryKeyword: 'attire',
  },
  {
    key: 'entertainment',
    label: 'Entertainment (Musik & Sound)',
    hint: 'Band akustik, chamber orchestra & sound system',
    catalogCategoryKeyword: 'entertainment',
  },
  {
    key: 'mc',
    label: 'MC (Master of Ceremony)',
    hint: 'Pemandu acara akad nikah & resepsi',
    catalogCategoryKeyword: 'mc',
  },
  {
    key: 'parkir',
    label: 'Parkir & Security Venue',
    hint: 'Tata kelola parkir tamu VIP & pengamanan area',
    catalogCategoryKeyword: 'parkir',
  },
  {
    key: 'busana',
    label: 'Busana Pengantin & Keluarga',
    hint: 'Kebaya, gaun & beskap/jas',
    catalogCategoryKeyword: 'busana',
  },
  {
    key: 'mahar',
    label: 'Mahar / Tempat Mahar',
    hint: 'Bingkai mahar & kotak cincin',
    catalogCategoryKeyword: 'mahar',
  },
  {
    key: 'seserahan',
    label: 'Seserahan & Hantaran',
    hint: 'Sewa & hias kotak seserahan',
    catalogCategoryKeyword: 'seserahan',
  },
  {
    key: 'lainnya',
    label: 'Kebutuhan Lainnya',
    hint: 'Buket bunga, buku tamu, welcome sign',
    catalogCategoryKeyword: 'lainnya',
  },
];

export const BudgetCalculatorSection: React.FC = () => {
  const {
    settings,
    products,
    cartItems,
    weddingPlan,
    budgetAllocation,
    updateBudgetAllocation,
    syncCartToBudget,
    saveBudgetPlan,
    recordInquiry,
  } = useWedding();

  const totalBudget = BUDGET_FIELDS.reduce(
    (sum, item) => sum + (Number(budgetAllocation[item.key]) || 0),
    0
  );

  const selectedProductNames = cartItems.map(
    (ci) => `${ci.product.name} (${ci.quantity} ${ci.product.unit || 'paket'})`
  );

  const whatsappUrl = buildWhatsAppUrl(
    settings.whatsappNumber,
    buildBudgetWhatsAppMessage(
      budgetAllocation,
      totalBudget,
      selectedProductNames,
      weddingPlan.coupleName,
      weddingPlan.weddingDate,
      weddingPlan.weddingLocation
    )
  );

  const handleCatalogQuickSelect = (
    fieldKey: keyof Omit<BudgetAllocation, 'guestCount' | 'notes'>,
    productId: string
  ) => {
    if (!productId) return;
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;
    const isPerPcs = prod.unit?.toLowerCase() === 'pcs';
    const qty = isPerPcs ? budgetAllocation.guestCount || 300 : 1;
    updateBudgetAllocation({ [fieldKey]: prod.price * qty });
  };

  return (
    <section id="kalkulator-budget" className="py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="max-w-2xl mx-auto text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-[#9E762C] font-medium">
          Perencanaan Anggaran Transparan
        </p>
        <h2 className="mt-2 heading-section-fluid font-serif-display font-semibold text-[#26211D] text-balance">
          Hitung Estimasi Budget Pernikahan
        </h2>
        <p className="mt-3 text-sm sm:text-base text-[#5C5147]">
          Masukkan estimasi jumlah tamu dan sesuaikan anggaran setiap komponen, atau pilih langsung produk dari katalog ISTAFA Wedding untuk menghitung total biaya secara otomatis.
        </p>
        <FloralDivider className="mt-5" />
      </div>

      <div className="mt-8 sm:mt-10 grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
        {/* Left 7 Columns: Interactive Inputs & Catalog Product Selector */}
        <div className="lg:col-span-7 rounded-3xl border border-[#E4DAC7] bg-[#FCFBF8] p-4 sm:p-6 lg:p-8 shadow-xs space-y-5 sm:space-y-6 min-w-0">
          {/* Guest Count Header Input */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#F4EFE4] border border-[#E2D6C1] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#26211D] text-[#D9C7A3] flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <label
                  htmlFor="budget-guest-count"
                  className="text-sm font-semibold text-[#26211D] block"
                >
                  Estimasi Jumlah Tamu Undangan
                </label>
                <span className="text-xs text-[#6E6359]">
                  Mempengaruhi perhitungan otomatis undangan, souvenir & katering
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="budget-guest-count"
                type="number"
                min={20}
                step={50}
                value={budgetAllocation.guestCount}
                onChange={(e) => {
                  const guests = Math.max(0, Number(e.target.value) || 0);
                  updateBudgetAllocation({
                    guestCount: guests,
                    catering: guests * 80000,
                  });
                }}
                className="w-28 rounded-xl border border-[#9E762C] bg-white px-3.5 py-2 text-base font-bold text-[#26211D] text-center font-tabular"
              />
              <span className="text-xs font-medium text-[#5C4E3E]">Tamu</span>
            </div>
          </div>

          {cartItems.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-[#FAF3E3] border border-[#DFC99B] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-[#5C461E]">
                <ShoppingBag className="w-4 h-4 text-[#9E762C] shrink-0" />
                <span>
                  Terdapat <strong>{cartItems.length} produk</strong> di Daftar Konsultasi Anda.
                </span>
              </div>
              <button
                type="button"
                onClick={syncCartToBudget}
                className="px-3.5 py-1.5 rounded-xl bg-[#26211D] text-white text-xs font-medium cursor-pointer"
              >
                Sinkronkan dari Keranjang
              </button>
            </div>
          )}

          {/* Budget Category Rows */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {BUDGET_FIELDS.map((field) => {
              const matchingCatalogProducts = products.filter((p) => {
                if (p.isActive === false) return false;
                const catLower = p.category.toLowerCase();
                if (field.key === 'makeup') {
                  return catLower.includes('mua') || catLower.includes('makeup');
                }
                return catLower.includes(field.catalogCategoryKeyword);
              });

              return (
                <div
                  key={field.key}
                  className="p-4 rounded-2xl border border-[#EAE0CE] bg-white space-y-2.5 hover:border-[#C8B282] transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-[#26211D] block">
                        {field.label}
                      </label>
                      <span className="text-[11px] text-[#7A6E63]">{field.hint}</span>
                    </div>
                  </div>

                  {/* Optional Quick Pick from Catalog */}
                  {matchingCatalogProducts.length > 0 && (
                    <select
                      defaultValue=""
                      onChange={(e) => handleCatalogQuickSelect(field.key, e.target.value)}
                      className="w-full min-w-0 truncate rounded-xl border border-[#E5DAC5] bg-[#FAF6EE] px-2.5 py-1.5 text-[11px] text-[#4A4036] focus:outline-none focus:border-[#9E762C]"
                    >
                      <option value="">✨ Pilih dari Katalog (Opsional)...</option>
                      {matchingCatalogProducts.map((prod) => (
                        <option key={prod.id} value={prod.id}>
                          {prod.name} — {formatRupiah(prod.price)}
                          {prod.unit ? `/${prod.unit}` : ''}
                        </option>
                      ))}
                    </select>
                  )}

                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#8C7A65]">
                      Rp
                    </span>
                    <input
                      type="number"
                      min={0}
                      step={250000}
                      value={budgetAllocation[field.key] || 0}
                      onChange={(e) =>
                        updateBudgetAllocation({
                          [field.key]: Math.max(0, Number(e.target.value) || 0),
                        })
                      }
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#D8C8AE] bg-[#FCFBF8] text-sm font-semibold text-[#26211D] font-tabular focus:outline-none focus:border-[#9E762C]"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 5 Columns: Visual Breakdown & Total Estimation Card */}
        <div className="lg:col-span-5 lg:sticky lg:top-24 rounded-3xl border border-[#D8C8AE] bg-[#221D19] text-[#FBF9F5] p-5 sm:p-6 lg:p-8 shadow-xl space-y-5 sm:space-y-6 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/15 pb-4">
            <div className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-[#D9C7A3] shrink-0" />
              <span className="text-xs uppercase tracking-[0.16em] sm:tracking-[0.2em] text-[#D9C7A3] font-semibold">
                Ringkasan Anggaran
              </span>
            </div>
            <button
              type="button"
              onClick={() => updateBudgetAllocation(INITIAL_BUDGET_ALLOCATION)}
              className="text-xs text-[#CBBFA8] hover:text-white inline-flex items-center gap-1 cursor-pointer shrink-0"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Reset Standar</span>
            </button>
          </div>

          {/* Big Total Estimate Display */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white/5 border border-[#C8A25A]/40 space-y-1.5">
            <p className="text-xs uppercase tracking-widest text-[#D9C7A3]">
              TOTAL ESTIMASI
            </p>
            <p className="text-2xl sm:text-3xl lg:text-4xl font-serif-display font-bold text-[#FBF9F5] font-tabular break-words">
              {formatRupiah(totalBudget)}
            </p>
            <p className="text-xs text-[#CBBFA8] font-tabular">
              Untuk {budgetAllocation.guestCount || 0} Tamu · Rata-rata{' '}
              {formatRupiah(
                budgetAllocation.guestCount > 0
                  ? Math.round(totalBudget / budgetAllocation.guestCount)
                  : 0
              )}{' '}
              / tamu
            </p>
          </div>

          {/* Visual Allocation Bars */}
          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {BUDGET_FIELDS.map((field) => {
              const val = Number(budgetAllocation[field.key]) || 0;
              const pct =
                totalBudget > 0 ? Math.min(100, Math.round((val / totalBudget) * 100)) : 0;
              if (val <= 0) return null;
              return (
                <div key={field.key} className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-[#E6DEC8] truncate min-w-0">{field.label}</span>
                    <span className="font-tabular text-[#D9C7A3] font-medium shrink-0">
                      {formatRupiah(val)} ({pct}%)
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#C8A25A] transition-all duration-300"
                      style={{ width: `${Math.max(3, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected Catalog Items Badge */}
          {selectedProductNames.length > 0 && (
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
              <p className="text-[11px] uppercase tracking-wider text-[#D9C7A3] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Termasuk Pilihan Katalog Anda:</span>
              </p>
              <ul className="text-xs text-[#EAE0CE] space-y-1">
                {selectedProductNames.slice(0, 4).map((name, i) => (
                  <li key={i} className="truncate">
                    • {name}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Buttons: Simpan Rencana & Konsultasikan ke WhatsApp */}
          <div className="space-y-2.5 pt-2">
            <button
              type="button"
              onClick={saveBudgetPlan}
              className="w-full py-3 px-5 rounded-xl border border-[#D9C7A3]/50 bg-white/10 hover:bg-white/15 text-white text-xs sm:text-sm font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <BookmarkCheck className="w-4 h-4 text-[#D9C7A3]" />
              <span>Simpan Rencana</span>
            </button>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() =>
                recordInquiry({
                  type: 'budget',
                  coupleName: weddingPlan.coupleName,
                  weddingLocation: weddingPlan.weddingLocation,
                  customerDate: weddingPlan.weddingDate || 'Sesuai Rencana Budget',
                  guestCount: budgetAllocation.guestCount,
                  itemsSummary: [
                    `Total Estimasi Budget: ${formatRupiah(totalBudget)}`,
                    ...selectedProductNames,
                  ],
                  totalEstimate: totalBudget,
                })
              }
              className="w-full py-3.5 px-5 rounded-xl bg-[#4E6752] hover:bg-[#3F5543] text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-lg transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Konsultasikan ke WhatsApp</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};
