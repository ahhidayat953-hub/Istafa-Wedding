import React, { useEffect, useRef, useState } from 'react';
import {
  Calendar,
  Check,
  Compass,
  Eye,
  Heart,
  MapPin,
  MessageCircle,
  Phone,
  Plus,
  Save,
  Send,
  ShoppingBag,
  Sparkles,
  Trash2,
  UserCheck,
  Users,
  Wallet,
} from 'lucide-react';
import { useWedding } from '../context/WeddingContext';
import {
  ConsultationBudgetBreakdown,
  ConsultationBudgetLineItem,
  ConsultationExtractedContext,
  ConsultationMessage,
  ConsultationRecommendationItem,
  Product,
} from '../types';
import {
  generateConsultationResponse,
} from '../utils/consultationEngine';
import {
  buildProductWhatsAppMessage,
  buildWhatsAppUrl,
  formatRupiah,
  getPrimaryImage,
} from '../utils/imageUtils';
import { FloralDivider } from './FloralOrnaments';
import { SafeWeddingImage } from './SafeWeddingImage';

interface WeddingConsultationViewProps {
  onOpenDetail: (product: Product) => void;
  onOpenPlanner: () => void;
  onOpenBudget: () => void;
  onOpenCart: () => void;
}

const NEED_OPTIONS = [
  'Undangan',
  'Souvenir',
  'Dekorasi Pernikahan',
  'Dokumentasi',
  'MUA — Make Up Artist',
  'WO — Wedding Organizer',
  'Paket Wedding',
  'Mahar & Hampers',
];

const STARTER_PROMPTS = [
  {
    title: 'Bantu Saya Pilih Kebutuhan',
    subtitle: 'Konsultasi bertahap mulai dari profil, jumlah tamu & budget',
    prompt: 'Halo, bantu saya memilih kebutuhan pernikahan yang paling pas untuk kami.',
  },
  {
    title: 'Undangan Elegant Budget 1 Juta',
    subtitle: 'Rekomendasi undangan digital & cetak untuk 250-300 tamu',
    prompt: 'Saya ingin undangan yang elegant tapi budget sekitar 1 juta untuk 300 tamu.',
  },
  {
    title: 'Budget 10 Juta (Undangan + Souvenir)',
    subtitle: 'Kombinasi hemat undangan & souvenir untuk 300 tamu',
    prompt: 'Budget saya 10 juta untuk 300 tamu, butuh undangan dan souvenir yang berkesan.',
  },
  {
    title: 'Simulasi Budget 30 Juta Lengkap',
    subtitle: 'Kombinasi dekorasi, undangan, souvenir, dokumentasi & makeup',
    prompt: 'Budget saya 30 juta untuk 300 tamu. Mohon rekomendasi rencana pernikahan yang sesuai.',
  },
  {
    title: 'Dekorasi Tema Elegant Gold',
    subtitle: 'Nuansa warna cream, ivory, dan champagne gold',
    prompt: 'Saya mencari dekorasi pernikahan tema elegant dengan warna cream dan gold.',
  },
  {
    title: 'Tim Layanan Hari H Lengkap',
    subtitle: 'MUA, Wedding Organizer (WO), Dokumentasi & MC',
    prompt: 'Tolong rekomendasikan layanan MUA, WO, Dokumentasi, dan MC yang tersedia di katalog.',
  },
];

export const WeddingConsultationView: React.FC<WeddingConsultationViewProps> = ({
  onOpenDetail,
  onOpenPlanner,
  onOpenBudget,
  onOpenCart,
}) => {
  const {
    user,
    currentUserId,
    isGuestUser,
    loginCustomerWithGoogle,
    products,
    packages,
    activePromos,
    calendarPublic,
    settings,
    cartItems,
    addToCart,
    weddingPlan,
    updateWeddingPlan,
    addProductToWeddingPlan,
    updateBudgetAllocation,
    consultationSessions,
    activeConsultation,
    startNewConsultationSession,
    selectConsultationSession,
    deleteConsultationSession,
    saveConsultationSessionState,
    trackProductInterest,
    saveLead,
    recordInquiry,
    showToast,
  } = useWedding();

  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSavedBadge, setProfileSavedBadge] = useState(false);
  const [addedCartIds, setAddedCartIds] = useState<Record<string, boolean>>({});
  const [addedPlanIds, setAddedPlanIds] = useState<Record<string, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const activeProducts = products.filter(
    (p) => p.isActive !== false && p.isAvailable !== false
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [activeConsultation.messages.length, isProcessing]);

  const dateStatusEntry = calendarPublic.find(
    (c) => c.date === (activeConsultation.weddingDate || weddingPlan.weddingDate)
  );

  const handleToggleNeed = (needLabel: string) => {
    const currentNeeds = activeConsultation.needs || [];
    const exists = currentNeeds.includes(needLabel);
    const nextNeeds = exists
      ? currentNeeds.filter((n) => n !== needLabel)
      : [...currentNeeds, needLabel];
    saveConsultationSessionState({
      ...activeConsultation,
      needs: nextNeeds,
    });
  };

  const handleManualSaveProfile = async () => {
    setIsSavingProfile(true);
    try {
      const coupleDisplay =
        activeConsultation.coupleName ||
        (activeConsultation.customerName && activeConsultation.partnerName
          ? `${activeConsultation.customerName} & ${activeConsultation.partnerName}`
          : activeConsultation.customerName || weddingPlan.coupleName || 'Calon Pengantin');

      const allRecIds = Array.from(
        new Set([
          ...(activeConsultation.interestedProductIds || []),
          ...activeConsultation.messages.flatMap((m) =>
            (m.recommendations || []).map((r) => r.productId)
          ),
        ])
      );
      const recNames = allRecIds
        .map((id) => products.find((p) => p.id === id)?.name)
        .filter((n): n is string => Boolean(n));

      const updatedSess = {
        ...activeConsultation,
        coupleName: coupleDisplay,
        updatedAt: new Date().toISOString(),
      };
      saveConsultationSessionState(updatedSess);

      await saveLead({
        consultationId: activeConsultation.id,
        customerName: activeConsultation.customerName || coupleDisplay,
        partnerName: activeConsultation.partnerName || '',
        coupleName: coupleDisplay,
        whatsapp: activeConsultation.whatsapp || '',
        email: activeConsultation.email || user?.email || '',
        weddingDate: activeConsultation.weddingDate || weddingPlan.weddingDate || '',
        weddingLocation: activeConsultation.weddingLocation || weddingPlan.weddingLocation || '',
        eventType: activeConsultation.eventType || 'Akad & Resepsi',
        guestCount: activeConsultation.guestCount || weddingPlan.guestCount || 300,
        budget: activeConsultation.targetBudget || weddingPlan.targetBudget || 0,
        needs: activeConsultation.needs || [],
        interestedProductIds: allRecIds,
        interestedProductNames: recNames,
        notes: activeConsultation.notes || '',
        status: allRecIds.length > 0 ? 'Interested' : 'Consultation',
        source: 'consultation',
      });

      setProfileSavedBadge(true);
      showToast('Data profil & konsultasi Anda berhasil disimpan secara permanen!');
      setTimeout(() => setProfileSavedBadge(false), 4000);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSendMessage = async (textOverride?: string) => {
    const rawText = (textOverride ?? inputMessage).trim();
    if (!rawText || isProcessing) return;

    if (!textOverride) {
      setInputMessage('');
    }

    const nowIso = new Date().toISOString();
    const userMsg: ConsultationMessage = {
      id: `msg_u_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      consultationId: activeConsultation.id,
      userId: currentUserId,
      sender: 'user',
      message: rawText,
      recommendations: [],
      createdAt: nowIso,
    };

    const sessionWithUserMsg = {
      ...activeConsultation,
      messages: [...activeConsultation.messages, userMsg],
      updatedAt: nowIso,
    };
    saveConsultationSessionState(sessionWithUserMsg);
    setIsProcessing(true);

    try {
      const currentSessionContext = {
        customerName: activeConsultation.customerName || '',
        partnerName: activeConsultation.partnerName || '',
        coupleName: activeConsultation.coupleName || weddingPlan.coupleName || '',
        whatsapp: activeConsultation.whatsapp || '',
        email: activeConsultation.email || user?.email || '',
        weddingDate: activeConsultation.weddingDate || weddingPlan.weddingDate || '',
        weddingLocation: activeConsultation.weddingLocation || weddingPlan.weddingLocation || '',
        eventType: activeConsultation.eventType || 'Akad & Resepsi',
        guestCount: activeConsultation.guestCount || weddingPlan.guestCount || 0,
        targetBudget: activeConsultation.targetBudget || weddingPlan.targetBudget || 0,
        weddingTheme: activeConsultation.weddingTheme || '',
        desiredColors: activeConsultation.desiredColors || '',
        needs: activeConsultation.needs || [],
        notes: activeConsultation.notes || '',
        interestedProductIds: activeConsultation.interestedProductIds || [],
        viewedProductIds: activeConsultation.viewedProductIds || [],
      };

      let engineResult: {
        replyText: string;
        recommendations: ConsultationRecommendationItem[];
        budgetBreakdown?: ConsultationBudgetBreakdown;
        updatedContext: ConsultationExtractedContext;
        directCartProducts: Product[];
        isUnavailableNotice?: boolean;
        quickReplies?: string[];
      };

      try {
        const res = await fetch('/api/wedding-consultation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userMessage: rawText,
            sessionContext: currentSessionContext,
            previousMessages: activeConsultation.messages,
            products: activeProducts,
            packages,
            promos: activePromos,
            calendarPublic,
          }),
        });
        if (res.ok) {
          engineResult = await res.json();
        } else {
          engineResult = generateConsultationResponse({
            userMessage: rawText,
            sessionContext: currentSessionContext,
            previousMessages: activeConsultation.messages,
            products: activeProducts,
            packages,
            promos: activePromos,
            calendarPublic,
          });
        }
      } catch {
        engineResult = generateConsultationResponse({
          userMessage: rawText,
          sessionContext: currentSessionContext,
          previousMessages: activeConsultation.messages,
          products: activeProducts,
          packages,
          promos: activePromos,
          calendarPublic,
        });
      }

      // If the user said "Saya pilih yang ini" / "Saya tertarik", automatically add those exact catalog products to Cart & Interested list
      const newlyInterestedIds: string[] = [];
      if (engineResult.directCartProducts && engineResult.directCartProducts.length > 0) {
        const guestQty =
          engineResult.updatedContext.guestCount ||
          activeConsultation.guestCount ||
          weddingPlan.guestCount ||
          300;
        for (const prod of engineResult.directCartProducts) {
          const fullProd = products.find((p) => p.id === prod.id) || prod;
          const qty = fullProd.unit?.toLowerCase() === 'pcs' ? guestQty : 1;
          addToCart(fullProd, qty);
          newlyInterestedIds.push(fullProd.id);
          setAddedCartIds((prev) => ({ ...prev, [fullProd.id]: true }));
        }
      }

      const nextCustomerName =
        engineResult.updatedContext.customerName || activeConsultation.customerName || '';
      const nextPartnerName =
        engineResult.updatedContext.partnerName || activeConsultation.partnerName || '';
      const nextCoupleName =
        engineResult.updatedContext.coupleName ||
        (nextCustomerName && nextPartnerName
          ? `${nextCustomerName} & ${nextPartnerName}`
          : activeConsultation.coupleName || nextCustomerName);
      const nextWhatsapp =
        engineResult.updatedContext.whatsapp || activeConsultation.whatsapp || '';
      const nextEmail =
        engineResult.updatedContext.email || activeConsultation.email || '';
      const nextDate =
        engineResult.updatedContext.weddingDate || activeConsultation.weddingDate;
      const nextLocation =
        engineResult.updatedContext.weddingLocation || activeConsultation.weddingLocation;
      const nextGuests =
        engineResult.updatedContext.guestCount ?? activeConsultation.guestCount;
      const nextBudget =
        engineResult.updatedContext.targetBudget ?? activeConsultation.targetBudget;
      const nextTheme =
        engineResult.updatedContext.weddingTheme || activeConsultation.weddingTheme;
      const nextColors =
        engineResult.updatedContext.desiredColors || activeConsultation.desiredColors;
      const nextNeeds = Array.from(
        new Set([...(activeConsultation.needs || []), ...(engineResult.updatedContext.needs || [])])
      );
      const nextInterested = Array.from(
        new Set([...(activeConsultation.interestedProductIds || []), ...newlyInterestedIds])
      );

      // Sync extracted details into the user's Wedding Plan
      const planUpdates: Record<string, unknown> = {};
      if (nextCoupleName) planUpdates.coupleName = nextCoupleName;
      if (nextDate) planUpdates.weddingDate = nextDate;
      if (nextLocation) planUpdates.weddingLocation = nextLocation;
      if (nextGuests > 0) planUpdates.guestCount = nextGuests;
      if (nextBudget > 0) planUpdates.targetBudget = nextBudget;
      if (nextTheme || nextColors) {
        planUpdates.themes = [nextTheme, nextColors].filter(Boolean);
      }
      if (Object.keys(planUpdates).length > 0) {
        updateWeddingPlan(planUpdates);
      }

      // Compute dynamic session title from context
      let nextTitle = activeConsultation.title;
      if (
        nextTitle === 'Konsultasi Rencana Pernikahan' &&
        (nextCoupleName || nextBudget > 0 || nextTheme || nextLocation)
      ) {
        const parts: string[] = [];
        if (nextCoupleName) parts.push(nextCoupleName);
        if (nextTheme) parts.push(nextTheme);
        if (nextBudget > 0) parts.push(formatRupiah(nextBudget));
        if (nextLocation) parts.push(nextLocation);
        nextTitle = `Konsultasi: ${parts.join(' • ').slice(0, 48)}`;
      }

      const replyIso = new Date().toISOString();
      const consultantMsg: ConsultationMessage = {
        id: `msg_c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
        consultationId: activeConsultation.id,
        userId: currentUserId,
        sender: 'consultant',
        message: engineResult.replyText,
        recommendations: (engineResult.recommendations || []).slice(0, 3),
        budgetBreakdown: engineResult.budgetBreakdown,
        extractedContext: engineResult.updatedContext,
        isUnavailableNotice: engineResult.isUnavailableNotice,
        quickReplies: engineResult.quickReplies,
        createdAt: replyIso,
      };

      const finalSession = {
        ...sessionWithUserMsg,
        title: nextTitle,
        customerName: nextCustomerName,
        partnerName: nextPartnerName,
        coupleName: nextCoupleName,
        whatsapp: nextWhatsapp,
        email: nextEmail,
        weddingDate: nextDate,
        weddingLocation: nextLocation,
        guestCount: nextGuests,
        targetBudget: nextBudget,
        weddingTheme: nextTheme,
        desiredColors: nextColors,
        needs: nextNeeds,
        interestedProductIds: nextInterested,
        status:
          nextInterested.length > 0
            ? ('interested' as const)
            : (engineResult.recommendations || []).length > 0
            ? ('recommended' as const)
            : ('active' as const),
        messages: [...sessionWithUserMsg.messages, consultantMsg],
        updatedAt: replyIso,
      };

      saveConsultationSessionState(finalSession);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddRecommendationToCart = (
    product: Product,
    suggestedQuantity?: number
  ) => {
    const qty =
      suggestedQuantity ??
      (product.unit?.toLowerCase() === 'pcs'
        ? activeConsultation.guestCount || weddingPlan.guestCount || 300
        : 1);
    trackProductInterest(product.id, 'interested');
    addToCart(product, qty);
    setAddedCartIds((prev) => ({ ...prev, [product.id]: true }));
  };

  const handleAddRecommendationToPlan = (product: Product) => {
    addProductToWeddingPlan(product, {
      coupleName: activeConsultation.coupleName || weddingPlan.coupleName,
      weddingDate: activeConsultation.weddingDate || weddingPlan.weddingDate,
      weddingLocation: activeConsultation.weddingLocation || weddingPlan.weddingLocation,
      guestCount: activeConsultation.guestCount || weddingPlan.guestCount || 300,
      targetBudget: activeConsultation.targetBudget || weddingPlan.targetBudget,
    });
    setAddedPlanIds((prev) => ({ ...prev, [product.id]: true }));
  };

  const handleApplyBudgetLineItemsToCart = (items: ConsultationBudgetLineItem[]) => {
    for (const item of items) {
      const prod = products.find((p) => p.id === item.productId);
      if (prod) {
        addToCart(prod, item.quantity);
        setAddedCartIds((prev) => ({ ...prev, [prod.id]: true }));
      }
    }
    showToast('Seluruh kombinasi produk berhasil ditambahkan ke Keranjang Konsultasi!');
  };

  const handleApplyBudgetLineItemsToPlan = (
    breakdown: ConsultationBudgetBreakdown,
    useAlternative: boolean
  ) => {
    const sourceItems =
      useAlternative && breakdown.alternativeItems
        ? breakdown.alternativeItems
        : breakdown.items;

    for (const item of sourceItems) {
      const prod = products.find((p) => p.id === item.productId);
      if (prod) {
        addProductToWeddingPlan(prod, {
          guestCount: breakdown.guestCount,
          targetBudget: breakdown.targetBudget,
        });
        setAddedPlanIds((prev) => ({ ...prev, [prod.id]: true }));
      }
    }

    updateBudgetAllocation({
      guestCount: breakdown.guestCount,
      dekorasi: breakdown.dekorasi,
      undangan: breakdown.undangan,
      souvenir: breakdown.souvenir,
      dokumentasi: breakdown.dokumentasi,
      makeup: breakdown.makeup,
      lainnya: breakdown.layananLainnya,
    });

    showToast('Estimasi Rencana Pernikahan berhasil diterapkan ke Wedding Plan & Kalkulator Budget!');
  };

  // Build WhatsApp message from current consultation session (Requirement 15)
  const buildConsultationWhatsAppUrl = (specificProduct?: Product) => {
    const allRecIds = Array.from(
      new Set([
        ...(activeConsultation.interestedProductIds || []),
        ...activeConsultation.messages.flatMap((m) =>
          (m.recommendations || []).map((r) => r.productId)
        ),
      ])
    );
    const recommendedProds = specificProduct
      ? [specificProduct]
      : allRecIds
          .map((id) => products.find((p) => p.id === id))
          .filter((p): p is Product => Boolean(p));

    const prodLines =
      recommendedProds.length > 0
        ? recommendedProds
            .map((p) => `- ${p.name} (${p.category}: ${formatRupiah(p.price)})`)
            .join('\n')
        : cartItems.length > 0
        ? cartItems
            .map((c) => `- ${c.product.name} (${c.quantity} × ${formatRupiah(c.product.price)})`)
            .join('\n')
        : '- Mohon rekomendasi produk katalog ISTAFA Wedding';

    const customerNameDisplay =
      activeConsultation.customerName ||
      (activeConsultation.coupleName ? activeConsultation.coupleName.split('&')[0]?.trim() : '') ||
      (weddingPlan.coupleName ? weddingPlan.coupleName.split('&')[0]?.trim() : '') ||
      '-';
    const partnerNameDisplay =
      activeConsultation.partnerName ||
      (activeConsultation.coupleName && activeConsultation.coupleName.includes('&')
        ? activeConsultation.coupleName.split('&')[1]?.trim()
        : '') ||
      (weddingPlan.coupleName && weddingPlan.coupleName.includes('&')
        ? weddingPlan.coupleName.split('&')[1]?.trim()
        : '') ||
      '-';
    const needsDisplay =
      activeConsultation.needs && activeConsultation.needs.length > 0
        ? activeConsultation.needs.join(', ')
        : 'Dekorasi, Undangan & Souvenir';

    const message = `Halo Istafa Wedding, saya ingin konsultasi.\n\nNama: ${customerNameDisplay}\nPasangan: ${partnerNameDisplay}\nWhatsApp: ${
      activeConsultation.whatsapp || '-'
    }\nTanggal: ${
      activeConsultation.weddingDate || weddingPlan.weddingDate || 'Belum ditentukan'
    }\nLokasi: ${
      activeConsultation.weddingLocation || weddingPlan.weddingLocation || 'Belum ditentukan'
    }\nJumlah tamu: ${
      activeConsultation.guestCount || weddingPlan.guestCount || 300
    }\nBudget: ${
      activeConsultation.targetBudget > 0
        ? formatRupiah(activeConsultation.targetBudget)
        : 'Fleksibel'
    }\nKebutuhan: ${needsDisplay}\n\nProduk yang saya minati:\n${prodLines}`;

    return buildWhatsAppUrl(settings.whatsappNumber, message);
  };

  const renderFormattedMessage = (text: string) => {
    return text.split('\n').map((paragraph, pIdx) => {
      if (!paragraph.trim()) {
        return <div key={pIdx} className="h-2" />;
      }
      const parts = paragraph.split(/(\*\*.*?\*\*|\*.*?\*)/g);
      return (
        <p key={pIdx} className="leading-relaxed">
          {parts.map((part, idx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return (
                <strong key={idx} className="font-semibold text-[#26211D]">
                  {part.slice(2, -2)}
                </strong>
              );
            }
            if (part.startsWith('*') && part.endsWith('*')) {
              return (
                <em key={idx} className="italic text-[#6E5D4B]">
                  {part.slice(1, -1)}
                </em>
              );
            }
            return <span key={idx}>{part}</span>;
          })}
        </p>
      );
    });
  };

  const hasUserMessages = activeConsultation.messages.some((m) => m.sender === 'user');

  // Compute profile completion score for Guided Personal Wedding Consultant UI
  const completedStepsCount = [
    Boolean(activeConsultation.customerName || activeConsultation.coupleName),
    Boolean(activeConsultation.partnerName || (activeConsultation.coupleName && activeConsultation.coupleName.includes('&'))),
    Boolean(activeConsultation.weddingDate && activeConsultation.weddingLocation),
    Boolean(activeConsultation.guestCount > 0 && activeConsultation.targetBudget > 0),
    Boolean(activeConsultation.needs && activeConsultation.needs.length > 0),
  ].filter(Boolean).length;

  return (
    <section className="py-8 sm:py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
      {/* Editorial Section Header */}
      <div className="max-w-3xl mx-auto text-center mb-6 sm:mb-8">
        <p className="text-xs uppercase tracking-[0.22em] text-[#9E762C] font-semibold">
          Personal Wedding Consultant · Terhubung Katalog Asli
        </p>
        <h1 className="mt-2 heading-section-fluid font-serif-display font-semibold text-[#26211D] text-balance">
          Konsultasi Pernikahan ISTAFA
        </h1>
        <p className="mt-2.5 text-sm sm:text-base text-[#5C5147] max-w-2xl mx-auto leading-relaxed">
          Pengalaman konsultasi pernikahan personal yang cerdas, hangat, dan solutif. Ceritakan profil pasangan, tanggal, lokasi, jumlah tamu, kebutuhan, dan kisaran budget Anda untuk mendapatkan rekomendasi produk katalog yang paling sesuai.
        </p>
        <FloralDivider className="mt-5" />
      </div>

      {/* Main 12-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
        {/* ==================== LEFT SIDEBAR: SESSION HISTORY & WEDDING CONTEXT ==================== */}
        <aside className="lg:col-span-4 space-y-5 min-w-0">
          {/* Card 1: Per-User Context & Data Isolation Status */}
          <div className="rounded-3xl border border-[#E5DAC5] bg-[#FCFBF8] p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#EDE4D3]">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-full bg-[#F5EFE2] border border-[#D8C59E] flex items-center justify-center text-[#9E762C] shrink-0">
                  {isGuestUser ? (
                    <Users className="w-4 h-4" />
                  ) : (
                    <UserCheck className="w-4 h-4 text-[#35543D]" />
                  )}
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-serif-display font-semibold text-[#26211D] truncate">
                    Riwayat Sesi Konsultasi
                  </h2>
                  <p className="text-[11px] text-[#7D6E5D] truncate">
                    {isGuestUser
                      ? `Tersimpan di Server (${currentUserId.slice(0, 12)})`
                      : `Akun: ${user?.displayName || user?.email}`}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => startNewConsultationSession()}
                className="px-3 py-1.5 rounded-xl bg-[#26211D] hover:bg-[#3A322C] text-[#FBF9F5] text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5 text-[#D9C296]" />
                <span>Sesi Baru</span>
              </button>
            </div>

            {isGuestUser && (
              <div className="rounded-2xl bg-[#F6EFE2] border border-[#E2D3B5] p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
                <p className="text-xs text-[#5C4E3E] leading-snug">
                  Data konsultasi Anda sudah tersimpan otomatis. Masuk dengan Google untuk sinkronisasi lintas perangkat.
                </p>
                <button
                  type="button"
                  onClick={() => void loginCustomerWithGoogle()}
                  className="px-3 py-2 rounded-xl bg-[#9E762C] hover:bg-[#876322] text-white text-xs font-medium whitespace-nowrap transition-colors cursor-pointer shrink-0 self-start sm:self-auto"
                >
                  Simpan Akun
                </button>
              </div>
            )}

            {/* List of User's Isolated Consultation Sessions */}
            <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
              {consultationSessions.map((sess) => {
                const isSelected = sess.id === activeConsultation.id;
                const msgCount = sess.messages.length;
                return (
                  <div
                    key={sess.id}
                    className={`group rounded-2xl border p-3 transition-all flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'border-[#C8A96A] bg-[#FAF4E8] shadow-2xs'
                        : 'border-[#EAE0CE] bg-white hover:border-[#D5C3A3]'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => selectConsultationSession(sess.id)}
                      className="flex-1 text-left min-w-0 cursor-pointer"
                    >
                      <p className="text-xs font-semibold text-[#26211D] truncate">
                        {sess.title}
                      </p>
                      <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[#7D6E5D]">
                        <span>{msgCount} pesan</span>
                        <span>·</span>
                        <span>
                          {sess.targetBudget > 0
                            ? formatRupiah(sess.targetBudget)
                            : `${sess.guestCount || 300} tamu`}
                        </span>
                      </div>
                    </button>

                    {consultationSessions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => deleteConsultationSession(sess.id)}
                        title="Hapus sesi konsultasi ini"
                        className="p-1.5 rounded-lg text-[#9E8F7C] hover:text-[#9E3B3B] hover:bg-[#FDF2F2] transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Card 2: Ringkasan Profil Calon Pengantin & Kebutuhan (Requirement 2, 9 & 12) */}
          <div className="rounded-3xl border border-[#E5DAC5] bg-[#FCFBF8] p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#EDE4D3] pb-3">
              <div>
                <h3 className="text-base font-serif-display font-semibold text-[#26211D]">
                  Profil Calon Pengantin
                </h3>
                <p className="text-xs text-[#7D6E5D]">
                  Terisi otomatis dari percakapan atau lengkapi di bawah ({completedStepsCount}/5 tahap)
                </p>
              </div>
              <Sparkles className="w-4 h-4 text-[#9E762C] shrink-0" />
            </div>

            {/* Progress bar */}
            <div className="w-full h-1.5 rounded-full bg-[#EAE0CE] overflow-hidden">
              <div
                className="h-full bg-[#9E762C] transition-all duration-300"
                style={{ width: `${Math.max(15, (completedStepsCount / 5) * 100)}%` }}
              />
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[#6E6359] font-medium mb-1">
                    Nama Kamu
                  </label>
                  <input
                    type="text"
                    value={activeConsultation.customerName || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      const couple = activeConsultation.partnerName
                        ? `${val} & ${activeConsultation.partnerName}`
                        : val;
                      saveConsultationSessionState({
                        ...activeConsultation,
                        customerName: val,
                        coupleName: couple,
                      });
                      updateWeddingPlan({ coupleName: couple });
                    }}
                    placeholder="Contoh: Andi"
                    className="w-full rounded-xl border border-[#DFD3BE] bg-white px-3 py-2 text-xs text-[#26211D] focus:outline-none focus:border-[#9E762C]"
                  />
                </div>
                <div>
                  <label className="block text-[#6E6359] font-medium mb-1">
                    Nama Pasangan
                  </label>
                  <input
                    type="text"
                    value={activeConsultation.partnerName || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      const couple = activeConsultation.customerName
                        ? `${activeConsultation.customerName} & ${val}`
                        : val;
                      saveConsultationSessionState({
                        ...activeConsultation,
                        partnerName: val,
                        coupleName: couple,
                      });
                      updateWeddingPlan({ coupleName: couple });
                    }}
                    placeholder="Contoh: Sinta"
                    className="w-full rounded-xl border border-[#DFD3BE] bg-white px-3 py-2 text-xs text-[#26211D] focus:outline-none focus:border-[#9E762C]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="flex items-center gap-1 text-[#6E6359] font-medium mb-1">
                    <Phone className="w-3 h-3 text-[#9E762C]" />
                    <span>Nomor WhatsApp</span>
                  </label>
                  <input
                    type="tel"
                    value={activeConsultation.whatsapp || ''}
                    onChange={(e) =>
                      saveConsultationSessionState({
                        ...activeConsultation,
                        whatsapp: e.target.value,
                      })
                    }
                    placeholder="0812xxxxxxxx"
                    className="w-full rounded-xl border border-[#DFD3BE] bg-white px-3 py-2 text-xs text-[#26211D] font-tabular focus:outline-none focus:border-[#9E762C]"
                  />
                </div>
                <div>
                  <label className="block text-[#6E6359] font-medium mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={activeConsultation.email || ''}
                    onChange={(e) =>
                      saveConsultationSessionState({
                        ...activeConsultation,
                        email: e.target.value,
                      })
                    }
                    placeholder="email@anda.com"
                    className="w-full rounded-xl border border-[#DFD3BE] bg-white px-3 py-2 text-xs text-[#26211D] focus:outline-none focus:border-[#9E762C]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[#6E6359] font-medium mb-1">
                    Tanggal Pernikahan
                  </label>
                  <input
                    type="date"
                    value={activeConsultation.weddingDate || weddingPlan.weddingDate}
                    onChange={(e) => {
                      const val = e.target.value;
                      saveConsultationSessionState({
                        ...activeConsultation,
                        weddingDate: val,
                      });
                      updateWeddingPlan({ weddingDate: val });
                    }}
                    className="w-full rounded-xl border border-[#DFD3BE] bg-white px-2.5 py-2 text-xs text-[#26211D] focus:outline-none focus:border-[#9E762C]"
                  />
                </div>

                <div>
                  <label className="block text-[#6E6359] font-medium mb-1">
                    Jumlah Tamu
                  </label>
                  <input
                    type="number"
                    min={20}
                    max={10000}
                    step={50}
                    value={activeConsultation.guestCount || ''}
                    onChange={(e) => {
                      const val = Math.max(0, Number(e.target.value) || 0);
                      saveConsultationSessionState({
                        ...activeConsultation,
                        guestCount: val,
                      });
                      if (val > 0) updateWeddingPlan({ guestCount: val });
                    }}
                    placeholder="Contoh: 300"
                    className="w-full rounded-xl border border-[#DFD3BE] bg-white px-3 py-2 text-xs text-[#26211D] font-tabular focus:outline-none focus:border-[#9E762C]"
                  />
                </div>
              </div>

              {/* Real-time calendar availability indicator */}
              {activeConsultation.weddingDate && (
                <div className="rounded-xl bg-[#F5EFE3] px-3 py-2 flex items-center justify-between text-[11px]">
                  <span className="text-[#5C4E3E] flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#9E762C]" />
                    <span>Status Jadwal:</span>
                  </span>
                  <span className="font-semibold text-[#26211D]">
                    {dateStatusEntry?.status === 'unavailable'
                      ? '🔴 Penuh'
                      : dateStatusEntry?.status === 'reserved'
                      ? '🟡 Tersisa 1 Slot'
                      : '🟢 Tersedia'}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[#6E6359] font-medium mb-1">
                    Lokasi Acara
                  </label>
                  <div className="relative">
                    <MapPin className="w-3.5 h-3.5 text-[#9E762C] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={activeConsultation.weddingLocation}
                      onChange={(e) => {
                        const val = e.target.value;
                        saveConsultationSessionState({
                          ...activeConsultation,
                          weddingLocation: val,
                        });
                        updateWeddingPlan({ weddingLocation: val });
                      }}
                      placeholder="Kota / Venue"
                      className="w-full rounded-xl border border-[#DFD3BE] bg-white pl-8 pr-3 py-2 text-xs text-[#26211D] focus:outline-none focus:border-[#9E762C]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[#6E6359] font-medium mb-1">
                    Jenis Acara
                  </label>
                  <select
                    value={activeConsultation.eventType || 'Akad & Resepsi'}
                    onChange={(e) =>
                      saveConsultationSessionState({
                        ...activeConsultation,
                        eventType: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-[#DFD3BE] bg-white px-2.5 py-2 text-xs text-[#26211D] focus:outline-none focus:border-[#9E762C]"
                  >
                    <option value="Akad & Resepsi">Akad & Resepsi</option>
                    <option value="Akad Nikah / Intimate">Akad Nikah / Intimate</option>
                    <option value="Resepsi Gedung">Resepsi Gedung</option>
                    <option value="Outdoor / Garden">Outdoor / Garden</option>
                    <option value="Acara di Rumah">Acara di Rumah</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[#6E6359] font-medium mb-1">
                  Kisaran Budget (Rp)
                </label>
                <div className="relative">
                  <Wallet className="w-3.5 h-3.5 text-[#9E762C] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    min={0}
                    step={1000000}
                    value={activeConsultation.targetBudget || ''}
                    onChange={(e) => {
                      const val = Math.max(0, Number(e.target.value) || 0);
                      saveConsultationSessionState({
                        ...activeConsultation,
                        targetBudget: val,
                      });
                      updateWeddingPlan({ targetBudget: val });
                    }}
                    placeholder="Contoh: 10000000"
                    className="w-full rounded-xl border border-[#DFD3BE] bg-white pl-8 pr-3 py-2 text-xs text-[#26211D] font-tabular focus:outline-none focus:border-[#9E762C]"
                  />
                </div>
                {activeConsultation.targetBudget > 0 && (
                  <p className="mt-1 text-[11px] text-[#9E762C] font-semibold font-tabular">
                    Target Budget: {formatRupiah(activeConsultation.targetBudget)}
                  </p>
                )}
              </div>

              {/* Kebutuhan Pernikahan Selector */}
              <div>
                <label className="block text-[#6E6359] font-medium mb-1.5">
                  Kebutuhan Pernikahan (Bisa pilih beberapa)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {NEED_OPTIONS.map((need) => {
                    const isChecked = (activeConsultation.needs || []).includes(need);
                    return (
                      <button
                        key={need}
                        type="button"
                        onClick={() => handleToggleNeed(need)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                          isChecked
                            ? 'bg-[#26211D] text-[#FBF9F5]'
                            : 'bg-white border border-[#DFD3BE] text-[#5C4E3E] hover:border-[#9E762C]'
                        }`}
                      >
                        {isChecked ? `✓ ${need}` : `+ ${need}`}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-[#6E6359] font-medium mb-1">
                  Catatan Kebutuhan Khusus
                </label>
                <textarea
                  rows={2}
                  value={activeConsultation.notes || ''}
                  onChange={(e) =>
                    saveConsultationSessionState({
                      ...activeConsultation,
                      notes: e.target.value,
                    })
                  }
                  placeholder="Tema warna, adat, atau permintaan khusus..."
                  className="w-full rounded-xl border border-[#DFD3BE] bg-white px-3 py-2 text-xs text-[#26211D] focus:outline-none focus:border-[#9E762C]"
                />
              </div>

              <button
                type="button"
                disabled={isSavingProfile}
                onClick={() => void handleManualSaveProfile()}
                className={`w-full py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  profileSavedBadge
                    ? 'bg-[#35543D] text-white'
                    : 'bg-[#9E762C] hover:bg-[#866222] text-white'
                }`}
              >
                {profileSavedBadge ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Data Konsultasi Tersimpan Permanen</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Simpan Data & Dapatkan Rekomendasi</span>
                  </>
                )}
              </button>
            </div>

            {/* Quick Navigation & WhatsApp Integration Buttons */}
            <div className="pt-3 border-t border-[#EDE4D3] space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={onOpenPlanner}
                  className="py-2.5 px-2.5 sm:px-3 rounded-xl border border-[#D8C59E] bg-[#FAF4E8] hover:bg-[#EFE3CC] text-[#26211D] text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-w-0"
                >
                  <Compass className="w-3.5 h-3.5 text-[#9E762C] shrink-0" />
                  <span className="truncate">Lihat Rencana</span>
                </button>
                <button
                  type="button"
                  onClick={onOpenCart}
                  className="py-2.5 px-2.5 sm:px-3 rounded-xl border border-[#D8C59E] bg-[#FAF4E8] hover:bg-[#EFE3CC] text-[#26211D] text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-w-0"
                >
                  <ShoppingBag className="w-3.5 h-3.5 text-[#9E762C] shrink-0" />
                  <span className="truncate">Keranjang ({cartItems.length})</span>
                </button>
              </div>

              <a
                href={buildConsultationWhatsAppUrl()}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  void handleManualSaveProfile();
                  recordInquiry({
                    userId: currentUserId,
                    coupleName: activeConsultation.coupleName || weddingPlan.coupleName,
                    customerName: activeConsultation.customerName,
                    partnerName: activeConsultation.partnerName,
                    whatsapp: activeConsultation.whatsapp,
                    email: activeConsultation.email,
                    weddingLocation:
                      activeConsultation.weddingLocation || weddingPlan.weddingLocation,
                    type: 'consultation',
                    customerDate:
                      activeConsultation.weddingDate || weddingPlan.weddingDate || 'Belum ditentukan',
                    guestCount:
                      activeConsultation.guestCount || weddingPlan.guestCount || 300,
                    itemsSummary: [
                      `Konsultasi Pernikahan ISTAFA (${activeConsultation.title})`,
                    ],
                    totalEstimate:
                      activeConsultation.targetBudget || weddingPlan.estimatedCost || 0,
                  });
                }}
                className="w-full py-3 px-4 rounded-xl bg-[#4E6752] hover:bg-[#3F5543] text-white text-xs font-medium flex items-center justify-center gap-2 transition-colors shadow-xs"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Konsultasikan dengan Istafa via WhatsApp</span>
              </a>
            </div>
          </div>
        </aside>

        {/* ==================== RIGHT MAIN COLUMN: CONVERSATION & PRODUCT CARDS ==================== */}
        <div className="lg:col-span-8 min-w-0 rounded-3xl border border-[#E5DAC5] bg-white shadow-sm flex flex-col overflow-hidden min-h-[520px] sm:min-h-[680px]">
          {/* Conversation Top Bar */}
          <div className="px-4 sm:px-7 py-4 bg-gradient-to-r from-[#FAF6EE] via-[#FBF9F5] to-[#F5EFE6] border-b border-[#EAE0CE] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full border border-[#C8B282] bg-[#F6EFE2] flex items-center justify-center text-[#9E762C] font-serif-display text-base font-semibold shrink-0">
                IW
              </div>
              <div className="min-w-0">
                <h2 className="font-serif-display text-lg sm:text-xl font-semibold text-[#26211D]">
                  Personal Wedding Consultant ISTAFA
                </h2>
                <p className="text-xs text-[#7D6E5D]">
                  Rekomendasi cerdas dari katalog asli ISTAFA Wedding ({activeProducts.length} produk & layanan aktif)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  void handleSendMessage(
                    'Bantu saya pilih paket dan produk yang sesuai dengan profil pernikahan kami.'
                  )
                }
                className="px-3 py-1.5 rounded-xl bg-[#FAF4E8] border border-[#C8A96A] hover:bg-[#EFE3CC] text-[#26211D] text-xs font-medium transition-colors cursor-pointer"
              >
                Bantu Saya Pilih
              </button>
              <button
                type="button"
                onClick={onOpenBudget}
                className="px-3 py-1.5 rounded-xl border border-[#DFD3BE] bg-white hover:bg-[#F5EFE3] text-[#5C4E3E] text-xs font-medium transition-colors cursor-pointer"
              >
                Kalkulator Budget
              </button>
            </div>
          </div>

          {/* Messages Stream Area */}
          <div className="flex-1 p-3.5 sm:p-6 space-y-6 overflow-y-auto max-h-[580px] sm:max-h-[680px] bg-[#FBF9F5]/60">
            {activeConsultation.messages.map((msg) => {
              const isUser = msg.sender === 'user';

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-3 animate-section-fade`}
                >
                  {/* Message Bubble */}
                  <div
                    className={`max-w-2xl rounded-2xl px-4 sm:px-5 py-3.5 text-xs sm:text-sm shadow-2xs ${
                      isUser
                        ? 'bg-[#26211D] text-[#FBF9F5] rounded-br-none'
                        : 'bg-white border border-[#E6DAC3] text-[#26211D] rounded-bl-none'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4 mb-1.5">
                      <span
                        className={`text-[11px] font-semibold ${
                          isUser ? 'text-[#D9C296]' : 'text-[#9E762C]'
                        }`}
                      >
                        {isUser
                          ? activeConsultation.coupleName || 'Calon Pengantin'
                          : 'Konsultan Pernikahan ISTAFA'}
                      </span>
                    </div>

                    <div
                      className={`space-y-1.5 ${
                        isUser ? 'text-[#FBF9F5]' : 'text-[#362F29]'
                      }`}
                    >
                      {renderFormattedMessage(msg.message)}
                    </div>

                    {/* WhatsApp Direct Button when an item is not available in the catalog */}
                    {msg.isUnavailableNotice && (
                      <div className="mt-3 pt-3 border-t border-[#EDE3D0]">
                        <a
                          href={buildWhatsAppUrl(
                            settings.whatsappNumber,
                            `Halo ${settings.businessName}, saya sedang menggunakan Konsultasi Pernikahan ISTAFA dan ingin menanyakan kebutuhan khusus yang belum ada di katalog.`
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#4E6752] hover:bg-[#3F5543] text-white text-xs font-medium transition-colors"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>Hubungi Kami Melalui WhatsApp</span>
                        </a>
                      </div>
                    )}
                  </div>

                  {/* ==================== BUDGET SIMULATION BREAKDOWN CARD (Requirement 6) ==================== */}
                  {!isUser && msg.budgetBreakdown && (
                    <div className="w-full max-w-2xl rounded-2xl border border-[#D8C59E] bg-[#FCFBF8] p-4 sm:p-5 shadow-xs space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#EAE0CE]">
                        <div>
                          <span className="text-[11px] uppercase tracking-wider text-[#9E762C] font-semibold block">
                            Simulasi Kombinasi Katalog ISTAFA
                          </span>
                          <h3 className="text-base sm:text-lg font-serif-display font-semibold text-[#26211D]">
                            Estimasi Rencana Pernikahan ({msg.budgetBreakdown.guestCount} Tamu)
                          </h3>
                        </div>
                        <div className="text-right">
                          <span className="text-[11px] text-[#7D6E5D] block">Target Budget Anda</span>
                          <span className="text-sm font-semibold text-[#9E762C] font-tabular">
                            {formatRupiah(msg.budgetBreakdown.targetBudget)}
                          </span>
                        </div>
                      </div>

                      {/* Category Breakdown Rows */}
                      <div className="space-y-2 text-xs sm:text-sm">
                        <div className="flex items-center justify-between py-1 border-b border-[#F2ECE1]">
                          <span className="text-[#5C4E3E]">Dekorasi</span>
                          <span className="font-semibold text-[#26211D] font-tabular">
                            {formatRupiah(msg.budgetBreakdown.dekorasi)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between py-1 border-b border-[#F2ECE1]">
                          <span className="text-[#5C4E3E]">
                            Undangan ({msg.budgetBreakdown.guestCount} tamu)
                          </span>
                          <span className="font-semibold text-[#26211D] font-tabular">
                            {formatRupiah(msg.budgetBreakdown.undangan)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between py-1 border-b border-[#F2ECE1]">
                          <span className="text-[#5C4E3E]">
                            Souvenir ({msg.budgetBreakdown.guestCount} tamu)
                          </span>
                          <span className="font-semibold text-[#26211D] font-tabular">
                            {formatRupiah(msg.budgetBreakdown.souvenir)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between py-1 border-b border-[#F2ECE1]">
                          <span className="text-[#5C4E3E]">Dokumentasi</span>
                          <span className="font-semibold text-[#26211D] font-tabular">
                            {formatRupiah(msg.budgetBreakdown.dokumentasi)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between py-1 border-b border-[#F2ECE1]">
                          <span className="text-[#5C4E3E]">Makeup</span>
                          <span className="font-semibold text-[#26211D] font-tabular">
                            {formatRupiah(msg.budgetBreakdown.makeup)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between py-1 border-b border-[#F2ECE1]">
                          <span className="text-[#5C4E3E]">Layanan lainnya</span>
                          <span className="font-semibold text-[#26211D] font-tabular">
                            {formatRupiah(msg.budgetBreakdown.layananLainnya)}
                          </span>
                        </div>

                        <div className="pt-2 flex items-center justify-between text-sm sm:text-base font-semibold">
                          <span className="text-[#26211D]">Estimasi Total:</span>
                          <span
                            className={`font-tabular ${
                              msg.budgetBreakdown.isOverBudget
                                ? 'text-[#9E3B3B]'
                                : 'text-[#35543D]'
                            }`}
                          >
                            {formatRupiah(msg.budgetBreakdown.totalEstimate)}
                          </span>
                        </div>
                      </div>

                      {/* Over-budget Notice & Economical Catalog Alternative */}
                      {msg.budgetBreakdown.isOverBudget && (
                        <div className="rounded-xl bg-[#FDF6EC] border border-[#E6C89C] p-3.5 space-y-2.5">
                          <p className="text-xs font-medium text-[#7A5221] leading-relaxed">
                            “Rencana ini melebihi budget sekitar{' '}
                            <strong className="font-tabular">
                              {formatRupiah(msg.budgetBreakdown.overBudgetAmount)}
                            </strong>
                            . Saya bisa membantu mencari alternatif yang lebih hemat.”
                          </p>

                          {msg.budgetBreakdown.alternativeItems &&
                            msg.budgetBreakdown.alternativeItems.length > 0 && (
                              <div className="bg-white rounded-xl p-3 border border-[#EAE0CE] space-y-1.5">
                                <p className="text-xs font-semibold text-[#26211D]">
                                  Alternatif Kombinasi Lebih Hemat dari Katalog ISTAFA:
                                </p>
                                {msg.budgetBreakdown.alternativeItems.map((alt) => (
                                  <div
                                    key={alt.productId}
                                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-0.5 sm:gap-2 text-xs text-[#5C4E3E]"
                                  >
                                    <span className="min-w-0 break-words">
                                      • {alt.categoryLabel}: {alt.productName} (
                                      {alt.quantity} {alt.unit})
                                    </span>
                                    <span className="font-semibold text-[#26211D] font-tabular shrink-0 pl-3 sm:pl-0">
                                      {formatRupiah(alt.subtotal)}
                                    </span>
                                  </div>
                                ))}
                                <div className="pt-1.5 border-t border-[#F0E7D8] flex items-center justify-between text-xs font-semibold text-[#35543D]">
                                  <span>Estimasi Total Alternatif Hemat:</span>
                                  <span className="font-tabular">
                                    {formatRupiah(msg.budgetBreakdown.alternativeTotal || 0)}
                                  </span>
                                </div>
                              </div>
                            )}
                        </div>
                      )}

                      {/* Direct Action Buttons to Apply Budget Breakdown */}
                      <div className="pt-2 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            handleApplyBudgetLineItemsToCart(
                              msg.budgetBreakdown!.isOverBudget &&
                                msg.budgetBreakdown!.alternativeItems
                                ? msg.budgetBreakdown!.alternativeItems
                                : msg.budgetBreakdown!.items
                            )
                          }
                          className="px-3.5 py-2 rounded-xl bg-[#26211D] hover:bg-[#3A322C] text-white text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <ShoppingBag className="w-3.5 h-3.5 text-[#D9C296]" />
                          <span>Masukkan Kombinasi ke Keranjang</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleApplyBudgetLineItemsToPlan(
                              msg.budgetBreakdown!,
                              msg.budgetBreakdown!.isOverBudget
                            )
                          }
                          className="px-3.5 py-2 rounded-xl border border-[#C8A96A] bg-[#FAF4E8] hover:bg-[#EFE3CC] text-[#26211D] text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-[#9E762C]" />
                          <span>Tambah ke Rencana Pernikahan</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ==================== PRODUCT RECOMMENDATION CARDS (Max 3, Requirement 10, 11 & 14) ==================== */}
                  {!isUser && msg.recommendations && msg.recommendations.length > 0 && (
                    <div className="w-full max-w-2xl space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-[#9E762C]">
                        Rekomendasi Produk Katalog untuk Anda ({Math.min(3, msg.recommendations.length)} Pilihan Terbaik)
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
                        {msg.recommendations.slice(0, 3).map((rec, index) => {
                          const product = products.find((p) => p.id === rec.productId);
                          if (!product) return null;

                          const primaryImg = getPrimaryImage(product.images);
                          const isAddedToCart =
                            addedCartIds[product.id] ||
                            cartItems.some((ci) => ci.productId === product.id);
                          const isInterested =
                            isAddedToCart ||
                            (activeConsultation.interestedProductIds || []).includes(product.id) ||
                            addedPlanIds[product.id];

                          return (
                            <div
                              key={`${msg.id}-${product.id}`}
                              className="rounded-2xl border border-[#E2D5BE] bg-white overflow-hidden shadow-xs flex flex-col justify-between transition-all hover:border-[#C8A96A] hover:shadow-md"
                            >
                              <div>
                                {/* Product Image */}
                                <div className="relative aspect-[4/3] w-full bg-[#F2ECE1] overflow-hidden">
                                  <SafeWeddingImage
                                    src={primaryImg.url}
                                    alt={product.name}
                                    className="w-full h-full object-cover"
                                  />
                                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/65 text-white text-[10px] font-medium">
                                    #{index + 1} · {product.category}
                                  </div>
                                  {product.images.length > 1 && (
                                    <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/65 text-white text-[10px] font-tabular">
                                      {product.images.length} Foto
                                    </div>
                                  )}
                                </div>

                                {/* Product Info & Reason */}
                                <div className="p-3.5 space-y-2">
                                  <h4 className="font-serif-display text-sm sm:text-base font-semibold text-[#26211D] line-clamp-2 leading-snug">
                                    {product.name}
                                  </h4>

                                  <div className="flex items-baseline gap-1.5 flex-wrap">
                                    {product.originalPrice && product.originalPrice > product.price && (
                                      <span className="text-[10px] text-[#8E8071] line-through font-tabular">
                                        {formatRupiah(product.originalPrice)}
                                      </span>
                                    )}
                                    <span className="text-xs sm:text-sm font-semibold text-[#9E762C] font-tabular">
                                      {formatRupiah(product.price)}
                                    </span>
                                    {product.unit && (
                                      <span className="text-[10px] text-[#7D6E5D]">
                                        / {product.unit}
                                      </span>
                                    )}
                                  </div>

                                  <p className="text-[11px] text-[#6E6359] line-clamp-2 leading-snug">
                                    {product.shortDescription}
                                  </p>

                                  <p className="text-[11px] text-[#5C4E3E] bg-[#FAF6EE] border border-[#EDE3D0] rounded-xl p-2 italic leading-relaxed">
                                    “{rec.reason}”
                                  </p>
                                </div>
                              </div>

                              {/* 3 Action Buttons: Lihat Detail, Saya Tertarik, Konsultasikan */}
                              <div className="p-3 pt-0 space-y-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    trackProductInterest(product.id, 'viewed');
                                    onOpenDetail(product);
                                  }}
                                  className="w-full py-2 px-2.5 rounded-xl border border-[#DFD3BE] bg-[#FCFBF8] hover:bg-[#F2ECE1] text-[#26211D] text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                                >
                                  <Eye className="w-3.5 h-3.5 text-[#9E762C]" />
                                  <span>Lihat Detail</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    handleAddRecommendationToCart(
                                      product,
                                      rec.suggestedQuantity
                                    );
                                    handleAddRecommendationToPlan(product);
                                  }}
                                  className={`w-full py-2 px-2.5 rounded-xl text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                                    isInterested
                                      ? 'bg-[#35543D] text-white'
                                      : 'bg-[#26211D] hover:bg-[#3A322C] text-white'
                                  }`}
                                >
                                  {isInterested ? (
                                    <>
                                      <Check className="w-3.5 h-3.5" />
                                      <span>Saya Tertarik ✓</span>
                                    </>
                                  ) : (
                                    <>
                                      <Heart className="w-3.5 h-3.5 text-[#D9C296]" />
                                      <span>Saya Tertarik</span>
                                    </>
                                  )}
                                </button>

                                <a
                                  href={buildConsultationWhatsAppUrl(product)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={() => {
                                    trackProductInterest(product.id, 'interested');
                                    void handleManualSaveProfile();
                                  }}
                                  className="w-full py-2 px-2.5 rounded-xl border border-[#C8A96A] bg-[#FAF4E8] hover:bg-[#EFE3CC] text-[#7A591E] text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                                >
                                  <MessageCircle className="w-3.5 h-3.5 text-[#9E762C]" />
                                  <span>Konsultasikan</span>
                                </a>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Persuasive Smart CTA Box (Requirement 14) */}
                      <div className="rounded-2xl border border-[#E2D3B5] bg-[#FAF6EE] p-4 space-y-3">
                        <p className="text-xs text-[#4A3E33] leading-relaxed">
                          Sepertinya pilihan ini cocok dengan kebutuhan kamu. Kalau kamu mau, saya bisa bantu hitungkan kebutuhan dan estimasi budgetnya secara menyeluruh.
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <a
                            href={buildConsultationWhatsAppUrl()}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => void handleManualSaveProfile()}
                            className="px-3.5 py-2 rounded-xl bg-[#4E6752] hover:bg-[#3F5543] text-white text-xs font-medium inline-flex items-center gap-1.5 transition-colors"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>Konsultasikan dengan Istafa</span>
                          </a>

                          <button
                            type="button"
                            onClick={() =>
                              void handleSendMessage('Saya pilih yang ini')
                            }
                            className="px-3.5 py-2 rounded-xl bg-[#26211D] hover:bg-[#3A322C] text-white text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Heart className="w-3.5 h-3.5 text-[#D9C296]" />
                            <span>Saya Tertarik dengan Produk Ini</span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              void handleSendMessage(
                                'Bantu saya pilih dan hitungkan estimasi budget untuk rekomendasi di atas.'
                              )
                            }
                            className="px-3.5 py-2 rounded-xl border border-[#C8A96A] bg-white hover:bg-[#F5EFE3] text-[#26211D] text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-[#9E762C]" />
                            <span>Bantu Saya Pilih</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Interactive Guided Quick Replies for this message (Requirement 9) */}
                  {!isUser && msg.quickReplies && msg.quickReplies.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 max-w-2xl pt-0.5">
                      {msg.quickReplies.map((qr) => (
                        <button
                          key={qr}
                          type="button"
                          disabled={isProcessing}
                          onClick={() => void handleSendMessage(qr)}
                          className="px-3 py-1.5 rounded-xl border border-[#D8C59E] bg-[#FAF4E8] hover:bg-[#26211D] hover:text-white text-[#26211D] text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {qr}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Loading Indicator when processing consultation */}
            {isProcessing && (
              <div className="flex items-start animate-section-fade">
                <div className="rounded-2xl rounded-bl-none border border-[#E6DAC3] bg-white px-5 py-3.5 shadow-2xs flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#9E762C] animate-bounce" />
                    <span className="w-2 h-2 rounded-full bg-[#C8A96A] animate-bounce [animation-delay:150ms]" />
                    <span className="w-2 h-2 rounded-full bg-[#D9C296] animate-bounce [animation-delay:300ms]" />
                  </div>
                  <span className="text-xs text-[#6E6359]">
                    Konsultan Pernikahan ISTAFA sedang menyiapkan rekomendasi katalog untuk Anda...
                  </span>
                </div>
              </div>
            )}

            {/* Empty State Starter Cards when user hasn't sent a message yet */}
            {!hasUserMessages && !isProcessing && (
              <div className="pt-2 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#8C7A65]">
                  Mulai Percakapan Cepat — Pilih Topik Rencana Pernikahan Anda:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {STARTER_PROMPTS.map((item) => (
                    <button
                      key={item.title}
                      type="button"
                      onClick={() => void handleSendMessage(item.prompt)}
                      className="text-left p-3.5 rounded-2xl border border-[#E5DAC5] bg-white hover:border-[#C8A96A] hover:bg-[#FAF6EE] transition-all group cursor-pointer"
                    >
                      <p className="text-xs sm:text-sm font-serif-display font-semibold text-[#26211D] group-hover:text-[#9E762C] transition-colors">
                        {item.title}
                      </p>
                      <p className="text-[11px] text-[#7D6E5D] mt-0.5 line-clamp-2">
                        {item.subtitle}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Reply Suggestion Strip */}
          <div className="px-4 sm:px-6 py-2.5 bg-[#FAF6EE] border-t border-[#EAE0CE] flex items-center gap-2 overflow-x-auto no-scrollbar">
            {[
              'Saya pilih yang ini',
              'Budget saya 30 juta',
              'Jumlah tamu 300 orang',
              'Rekomendasi Dekorasi Elegant Gold',
              'Rekomendasi MUA & WO',
              'Rekomendasi Undangan & Souvenir',
              'Rekomendasi Tenda & Dokumentasi',
            ].map((chip) => (
              <button
                key={chip}
                type="button"
                disabled={isProcessing}
                onClick={() => void handleSendMessage(chip)}
                className="px-3 py-1.5 rounded-xl border border-[#DFD3BE] bg-white hover:bg-[#26211D] hover:text-white text-[#5C4E3E] text-xs font-medium whitespace-nowrap transition-colors shrink-0 cursor-pointer disabled:opacity-50"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Message Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSendMessage();
            }}
            className="p-3.5 sm:p-5 bg-white border-t border-[#EAE0CE] flex items-center gap-2.5 sm:gap-3"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              disabled={isProcessing}
              placeholder="Ceritakan rencana pernikahan Anda (misal: Budget saya 30 juta untuk 300 tamu, tema elegant gold)..."
              className="min-w-0 flex-1 rounded-2xl border border-[#DFD3BE] bg-[#FCFBF9] px-3.5 sm:px-4 py-3 text-xs sm:text-sm text-[#26211D] focus:outline-none focus:border-[#9E762C]"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || isProcessing}
              className="px-4 sm:px-5 py-3 rounded-2xl bg-[#26211D] hover:bg-[#3A322C] disabled:opacity-40 text-[#FBF9F5] text-xs sm:text-sm font-medium inline-flex items-center justify-center gap-2 transition-colors cursor-pointer shrink-0"
            >
              <Send className="w-4 h-4 text-[#D9C296]" />
              <span className="hidden sm:inline">Kirim</span>
            </button>
          </form>
        </div>
      </div>
    </section>
  );
};
