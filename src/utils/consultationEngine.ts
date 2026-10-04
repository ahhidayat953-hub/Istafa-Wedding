import {
  CalendarPublicEntry,
  ConsultationBudgetBreakdown,
  ConsultationBudgetLineItem,
  ConsultationExtractedContext,
  ConsultationMessage,
  ConsultationRecommendationItem,
  Product,
  Promo,
  WeddingPackage,
} from '../types';
import { formatRupiah } from './imageUtils';

export const INITIAL_CONSULTATION_GREETING =
  'Halo 👋 Selamat datang di Konsultasi Pernikahan ISTAFA. Ceritakan rencana pernikahan Anda, dan kami akan membantu memberikan rekomendasi berdasarkan pilihan produk dan layanan yang tersedia di ISTAFA Wedding.\n\nSaya siap membantu kamu mempersiapkan kebutuhan pernikahan dengan nyaman. Untuk memulai, boleh saya tahu **nama kamu dan pasangan**? (Atau langsung ceritakan kebutuhan & kisaran budgetmu 😊)';

export const UNAVAILABLE_CATALOG_NOTICE =
  'Saat ini pilihan tersebut belum tersedia di katalog ISTAFA Wedding. Silakan hubungi kami melalui WhatsApp untuk konsultasi lebih lanjut.';

const UNSUPPORTED_KEYWORDS = [
  'honeymoon',
  'bulan madu',
  'tiket pesawat',
  'helikopter',
  'mobil pengantin',
  'sewa mobil',
  'alphard',
  'ferrari',
  'limousine',
  'kembang api',
  'fireworks',
  'kue pengantin',
  'wedding cake',
  'kue tart',
  'penginapan',
  'kamar hotel',
  'sewa gedung',
  'sewa villa',
  'cincin berlian',
  'toko emas',
  'jas hujan',
];

export const CATEGORY_MATCHERS: {
  key: string;
  label: string;
  keywords: string[];
  catalogCategoryMatchers: string[];
}[] = [
  {
    key: 'dekorasi',
    label: 'Dekorasi Pernikahan',
    keywords: [
      'dekorasi',
      'dekor',
      'pelaminan',
      'backdrop',
      'lorong',
      'aisle',
      'photobooth',
      'bunga pelaminan',
    ],
    catalogCategoryMatchers: ['dekorasi'],
  },
  {
    key: 'tenda',
    label: 'Tenda',
    keywords: [
      'tenda',
      'roder',
      'serut',
      'kanopi',
      'kursi',
      'ac standing',
      'misty fan',
      'flooring',
    ],
    catalogCategoryMatchers: ['tenda'],
  },
  {
    key: 'undangan-digital',
    label: 'Undangan Digital',
    keywords: [
      'undangan digital',
      'undangan online',
      'website undangan',
      'link undangan',
      'e-invitation',
      'rsvp online',
    ],
    catalogCategoryMatchers: ['undangan digital'],
  },
  {
    key: 'undangan-cetak',
    label: 'Undangan Cetak',
    keywords: [
      'undangan cetak',
      'undangan fisik',
      'hardcover',
      'wax seal',
      'kartu undangan',
    ],
    catalogCategoryMatchers: ['undangan cetak'],
  },
  {
    key: 'undangan',
    label: 'Undangan',
    keywords: ['undangan'],
    catalogCategoryMatchers: ['undangan'],
  },
  {
    key: 'souvenir',
    label: 'Souvenir',
    keywords: [
      'souvenir',
      'suvenir',
      'cindera mata',
      'bingkisan',
      'parfum',
      'diffuser',
      'cangkir',
      'keramik',
    ],
    catalogCategoryMatchers: ['souvenir'],
  },
  {
    key: 'mahar',
    label: 'Mahar / Tempat Mahar',
    keywords: [
      'mahar',
      'mas kawin',
      'tempat mahar',
      'kotak cincin',
      'ring box',
      'terrarium',
      'bingkai mahar',
    ],
    catalogCategoryMatchers: ['mahar'],
  },
  {
    key: 'seserahan',
    label: 'Seserahan & Hampers',
    keywords: [
      'seserahan',
      'hantaran',
      'hampers',
      'baki',
      'kotak seserahan',
      'sangjit',
      'lamaran',
    ],
    catalogCategoryMatchers: ['seserahan', 'mahar'],
  },
  {
    key: 'buket',
    label: 'Buket Bunga',
    keywords: [
      'buket',
      'hand bouquet',
      'bouquet',
      'bunga tangan',
      'boutonniere',
      'corsage',
    ],
    catalogCategoryMatchers: ['buket'],
  },
  {
    key: 'dokumentasi',
    label: 'Dokumentasi',
    keywords: [
      'dokumentasi',
      'foto',
      'video',
      'fotografer',
      'videografer',
      'cinematic',
      'drone',
      'album',
    ],
    catalogCategoryMatchers: ['dokumentasi'],
  },
  {
    key: 'makeup',
    label: 'MUA — Make Up Artist',
    keywords: [
      'makeup',
      'make up',
      'mua',
      'rias',
      'perias',
      'hairdo',
      'hijab',
      'siger',
      'paes',
    ],
    catalogCategoryMatchers: ['mua', 'makeup'],
  },
  {
    key: 'busana',
    label: 'Busana Pengantin',
    keywords: [
      'busana',
      'kebaya',
      'gaun',
      'beskap',
      'jas pengantin',
      'baju pengantin',
      'dress',
    ],
    catalogCategoryMatchers: ['busana'],
  },
  {
    key: 'wo',
    label: 'WO — Wedding Organizer',
    keywords: [
      'wo',
      'wedding organizer',
      'organizer',
      'koordinator',
      'rundown',
      'panitia',
      'crew',
    ],
    catalogCategoryMatchers: ['wo', 'wedding organizer'],
  },
  {
    key: 'sanggar',
    label: 'Tim Sanggar',
    keywords: [
      'sanggar',
      'tim sanggar',
      'tari',
      'lengser',
      'mapag',
      'kirab',
      'adat',
      'gamelan',
      'kecapi',
      'cucuk lampah',
    ],
    catalogCategoryMatchers: ['sanggar'],
  },
  {
    key: 'attire',
    label: 'Tim Attire',
    keywords: [
      'tim attire',
      'attire',
      'pendamping pakaian',
      'stylist',
      'merapikan pakaian',
      'fitting',
    ],
    catalogCategoryMatchers: ['attire'],
  },
  {
    key: 'entertainment',
    label: 'Entertainment',
    keywords: [
      'entertainment',
      'musik',
      'band',
      'akustik',
      'saxophone',
      'sound system',
      'organ',
      'penyanyi',
      'live music',
    ],
    catalogCategoryMatchers: ['entertainment'],
  },
  {
    key: 'mc',
    label: 'MC',
    keywords: ['mc', 'master of ceremony', 'pembawa acara', 'host acara'],
    catalogCategoryMatchers: ['mc'],
  },
  {
    key: 'parkir',
    label: 'Parkir & Security Venue',
    keywords: ['parkir', 'security', 'keamanan', 'valet', 'lalu lintas'],
    catalogCategoryMatchers: ['parkir', 'security'],
  },
];

const THEME_KEYWORDS: { label: string; patterns: string[] }[] = [
  {
    label: 'Elegant',
    patterns: ['elegant', 'elegan', 'mewah', 'luxury', 'royal', 'glamour', 'megah'],
  },
  {
    label: 'Modern Minimalis',
    patterns: ['modern', 'minimalis', 'minimalist', 'clean', 'simpel', 'sederhana'],
  },
  {
    label: 'Intimate',
    patterns: ['intimate', 'akrab', 'hangat', 'keluarga'],
  },
  {
    label: 'Garden / Outdoor',
    patterns: ['garden', 'outdoor', 'taman', 'semi outdoor', 'glasshouse'],
  },
  {
    label: 'Rustic Botanical',
    patterns: ['rustic', 'botanical', 'boho', 'kayu', 'natural', 'alam'],
  },
  {
    label: 'Tradisional / Adat',
    patterns: ['tradisional', 'adat', 'sunda', 'jawa', 'betawi', 'minang', 'nasional'],
  },
];

const COLOR_KEYWORDS: { label: string; patterns: string[] }[] = [
  { label: 'Champagne Gold', patterns: ['champagne', 'gold', 'emas', 'keemasan'] },
  { label: 'Cream & Ivory', patterns: ['cream', 'krem', 'ivory', 'gading', 'beige', 'nude'] },
  { label: 'Putih Bersih (White)', patterns: ['putih', 'white', 'off white'] },
  { label: 'Sage Green & Olive', patterns: ['sage', 'hijau', 'green', 'olive', 'emerald'] },
  {
    label: 'Blush Pink & Rose Gold',
    patterns: ['pink', 'blush', 'rose gold', 'rosegold', 'peach', 'dusty pink'],
  },
  { label: 'Terracotta & Earth Tone', patterns: ['terracotta', 'cokelat', 'earth', 'bronze', 'rust'] },
  { label: 'Burgundy & Maroon', patterns: ['burgundy', 'maroon', 'merah'] },
  { label: 'Silver & Dusty Blue', patterns: ['silver', 'perak', 'biru', 'blue', 'navy'] },
];

const LOCATION_KEYWORDS = [
  'jakarta',
  'bogor',
  'depok',
  'tangerang',
  'bekasi',
  'bandung',
  'sentul',
  'puncak',
  'cibinong',
  'bsd',
  'serpong',
  'cimahi',
  'karawang',
  'gedung',
  'ballroom',
  'hotel',
  'rumah',
  'taman',
  'outdoor',
  'glasshouse',
  'masjid',
  'villa',
];

const INDONESIAN_MONTHS: Record<string, string> = {
  januari: '01',
  februari: '02',
  maret: '03',
  april: '04',
  mei: '05',
  juni: '06',
  juli: '07',
  agustus: '08',
  september: '09',
  oktober: '10',
  november: '11',
  desember: '12',
};

/**
 * Extracts structured wedding context (names, whatsapp, email, budget, guestCount, date, location, theme, colors, categories)
 * from a user message while considering the last assistant question.
 */
export function extractWeddingContextFromText(
  rawText: string,
  lastAssistantMessage?: string
): ConsultationExtractedContext {
  const text = rawText.trim();
  const lower = text.toLowerCase();
  const result: ConsultationExtractedContext = {};
  const lastLower = (lastAssistantMessage || '').toLowerCase();

  // 1. Extract Budget (e.g. "1 juta", "10 juta", "30 juta", "500 ribu", "Rp 35.000.000", "25,5 jt")
  const jutaMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*(?:juta|jt)\b/i);
  const ribuMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*(?:ribu|rb)\b/i);
  const rpFullMatch = lower.match(/(?:rp\.?\s*)?(\d{1,3}(?:\.\d{3}){2,})/i);
  const miliarMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*(?:miliar|milyar)\b/i);

  if (jutaMatch) {
    const num = parseFloat(jutaMatch[1].replace(',', '.'));
    if (!isNaN(num) && num > 0 && num < 5000) {
      result.targetBudget = Math.round(num * 1_000_000);
    }
  } else if (miliarMatch) {
    const num = parseFloat(miliarMatch[1].replace(',', '.'));
    if (!isNaN(num) && num > 0 && num < 50) {
      result.targetBudget = Math.round(num * 1_000_000_000);
    }
  } else if (rpFullMatch) {
    const digits = parseInt(rpFullMatch[1].replace(/\./g, ''), 10);
    if (!isNaN(digits) && digits >= 100_000) {
      result.targetBudget = digits;
    }
  } else if (ribuMatch) {
    const num = parseFloat(ribuMatch[1].replace(',', '.'));
    if (!isNaN(num) && num >= 100 && num < 10000) {
      result.targetBudget = Math.round(num * 1_000);
    }
  } else if (
    lastLower.includes('budget') &&
    /^\d{1,3}$/.test(lower.trim())
  ) {
    const num = parseInt(lower.trim(), 10);
    if (num >= 1 && num <= 999) {
      result.targetBudget = num * 1_000_000;
    }
  }

  // 2. Extract Guest Count (e.g. "300 tamu", "500 orang", "200 undangan", "400 pax")
  const guestMatch = lower.match(/(\d{2,5})\s*(?:tamu|orang|pax|kursi)\b/i);
  if (guestMatch) {
    const count = parseInt(guestMatch[1], 10);
    if (count >= 20 && count <= 20000) {
      result.guestCount = count;
    }
  } else if (
    (lastLower.includes('jumlah tamu') || lastLower.includes('berapa tamu')) &&
    /^\d{2,5}$/.test(lower.trim())
  ) {
    const count = parseInt(lower.trim(), 10);
    if (count >= 20 && count <= 20000) {
      result.guestCount = count;
    }
  }

  // 3. Extract WhatsApp & Email if user shares contact in chat
  const phoneMatch = text.match(/(?:\+62|62|0)8[1-9][0-9]{6,11}\b/);
  if (phoneMatch) {
    result.whatsapp = phoneMatch[0].replace(/[^0-9+]/g, '');
  }
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) {
    result.email = emailMatch[0].toLowerCase();
  }

  // 4. Extract Date (YYYY-MM-DD or "14 November 2026" or "November 2026" or just "Desember")
  const isoDateMatch = lower.match(/\b(202\d-\d{2}-\d{2})\b/);
  if (isoDateMatch) {
    result.weddingDate = isoDateMatch[1];
  } else {
    for (const [monthName, monthNum] of Object.entries(INDONESIAN_MONTHS)) {
      const fullDateRegex = new RegExp(`\\b(\\d{1,2})\\s+${monthName}(?:\\s+(202\\d))?\\b`, 'i');
      const monthYearRegex = new RegExp(`\\b${monthName}\\s+(202\\d)\\b`, 'i');
      const mFull = lower.match(fullDateRegex);
      const mMonth = lower.match(monthYearRegex);
      if (mFull) {
        const day = mFull[1].padStart(2, '0');
        const year = mFull[2] || '2026';
        result.weddingDate = `${year}-${monthNum}-${day}`;
        break;
      } else if (mMonth) {
        result.weddingDate = `${mMonth[1]}-${monthNum}-14`;
        break;
      } else if (
        (lastLower.includes('tanggal') || lastLower.includes('kapan')) &&
        new RegExp(`\\b${monthName}\\b`, 'i').test(lower)
      ) {
        result.weddingDate = `2026-${monthNum}-14`;
        break;
      }
    }
  }

  // 5. Extract Location
  const locExplicitMatch = text.match(
    /(?:lokasi|tempat|venue|di\s+daerah|di\s+kota|acara\s+di)\s+([A-Za-z0-9\s,.-]{3,45})/i
  );
  if (locExplicitMatch) {
    const candidate = locExplicitMatch[1]
      .replace(/\b(dengan|untuk|jumlah|budget|tanggal|tema|warna|sekitar|tamu)\b.*$/i, '')
      .trim();
    if (candidate.length >= 3) {
      result.weddingLocation = candidate;
    }
  } else {
    const matchedLocs = LOCATION_KEYWORDS.filter((kw) =>
      new RegExp(`\\b${kw}\\b`, 'i').test(lower)
    );
    if (matchedLocs.length > 0) {
      result.weddingLocation = matchedLocs
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' / ');
    } else if (
      (lastLower.includes('di mana') || lastLower.includes('lokasi')) &&
      text.length >= 3 &&
      text.length <= 45 &&
      !/\d/.test(text)
    ) {
      result.weddingLocation = text;
    }
  }

  // 6. Extract Theme
  const matchedThemes: string[] = [];
  for (const t of THEME_KEYWORDS) {
    if (t.patterns.some((p) => lower.includes(p))) {
      matchedThemes.push(t.label);
    }
  }
  if (matchedThemes.length > 0) {
    result.weddingTheme = matchedThemes.join(', ');
  }

  // 7. Extract Colors
  const matchedColors: string[] = [];
  for (const c of COLOR_KEYWORDS) {
    if (c.patterns.some((p) => lower.includes(p))) {
      matchedColors.push(c.label);
    }
  }
  if (matchedColors.length > 0) {
    result.desiredColors = matchedColors.join(', ');
  }

  // 8. Extract Requested Categories / Needs
  const matchedCategories: string[] = [];
  const matchedNeedsLabels: string[] = [];
  for (const cat of CATEGORY_MATCHERS) {
    if (cat.keywords.some((kw) => lower.includes(kw))) {
      matchedCategories.push(cat.key);
      matchedNeedsLabels.push(cat.label);
    }
  }
  if (lower.includes('paket wedding') || lower.includes('paket pernikahan') || lower.includes('all in')) {
    matchedNeedsLabels.push('Paket Wedding');
  }
  if (matchedCategories.length > 0) {
    result.requestedCategories = Array.from(new Set(matchedCategories));
  }
  if (matchedNeedsLabels.length > 0) {
    result.needs = Array.from(new Set(matchedNeedsLabels));
  }

  // 9. Extract Customer Name & Partner Name
  const pairMatch = text.match(
    /(?:nama\s+saya|saya|aku|kami)\s+([A-Z][a-zA-Z]{1,20})\s+(?:dan|&|sama|pasangan\s+saya|pasangan)\s+([A-Z][a-zA-Z]{1,20})/i
  );
  const ampersandMatch = text.match(/^([A-Za-z]{2,20})\s*(?:&|dan)\s*([A-Za-z]{2,20})$/i);
  const singleNameMatch = text.match(/(?:nama\s+saya|saya\s+dengan|perkenalkan\s+saya)\s+([A-Za-z]{2,25})/i);
  const partnerOnlyMatch = text.match(/(?:nama\s+pasangan(?:\s+saya|\s+aku)?|pasangan\s+saya|calon\s+saya)\s+([A-Za-z]{2,25})/i);

  if (pairMatch) {
    const cName = pairMatch[1].trim();
    const pName = pairMatch[2].trim();
    result.customerName = cName.charAt(0).toUpperCase() + cName.slice(1);
    result.partnerName = pName.charAt(0).toUpperCase() + pName.slice(1);
    result.coupleName = `${result.customerName} & ${result.partnerName}`;
  } else if (ampersandMatch && !result.requestedCategories) {
    const cName = ampersandMatch[1].trim();
    const pName = ampersandMatch[2].trim();
    result.customerName = cName.charAt(0).toUpperCase() + cName.slice(1);
    result.partnerName = pName.charAt(0).toUpperCase() + pName.slice(1);
    result.coupleName = `${result.customerName} & ${result.partnerName}`;
  } else if (partnerOnlyMatch) {
    const pName = partnerOnlyMatch[1].trim();
    result.partnerName = pName.charAt(0).toUpperCase() + pName.slice(1);
  } else if (singleNameMatch && !result.requestedCategories) {
    const cName = singleNameMatch[1].trim();
    result.customerName = cName.charAt(0).toUpperCase() + cName.slice(1);
  } else if (
    lastLower.includes('nama kamu') &&
    !lastLower.includes('pasangan kamu siapa') &&
    /^[a-zA-Z\s]{2,25}$/.test(text) &&
    !result.requestedCategories &&
    !result.weddingLocation
  ) {
    const clean = text.trim();
    result.customerName = clean.charAt(0).toUpperCase() + clean.slice(1);
  } else if (
    lastLower.includes('pasangan kamu siapa') &&
    /^[a-zA-Z\s]{2,25}$/.test(text) &&
    !result.requestedCategories &&
    !result.weddingLocation
  ) {
    const clean = text.trim();
    result.partnerName = clean.charAt(0).toUpperCase() + clean.slice(1);
  }

  return result;
}

/**
 * Checks if the user is asking for something that does not exist in ISTAFA Wedding catalog.
 */
export function isUnsupportedCatalogRequest(
  rawText: string,
  activeProducts: Product[]
): boolean {
  const lower = rawText.toLowerCase();
  if (UNSUPPORTED_KEYWORDS.some((kw) => lower.includes(kw))) {
    return true;
  }

  if (
    (lower.includes('catering') || lower.includes('katering') || lower.includes('prasmanan')) &&
    !lower.includes('dekor') &&
    !lower.includes('tenda') &&
    !lower.includes('budget')
  ) {
    const hasCateringProduct = activeProducts.some((p) =>
      p.category.toLowerCase().includes('catering')
    );
    if (!hasCateringProduct) {
      return true;
    }
  }

  return false;
}

/**
 * Detects if the user is saying "Saya pilih yang ini", "Saya tertarik", "Masukkan ke keranjang", etc.
 */
export function detectDirectCartSelection(
  rawText: string,
  previousMessages: ConsultationMessage[],
  activeProducts: Product[]
): Product[] {
  const lower = rawText.toLowerCase().trim();
  const isSelectionPhrase =
    lower.includes('saya pilih yang ini') ||
    lower.includes('pilih yang ini') ||
    lower.includes('saya tertarik') ||
    lower.includes('saya mau yang ini') ||
    lower.includes('ambil yang ini') ||
    lower.includes('masukkan ke keranjang') ||
    lower.includes('tambah ke keranjang') ||
    lower.includes('masukin keranjang') ||
    lower.includes('saya pilih semua') ||
    lower.includes('pilih rekomendasi') ||
    lower.includes('pilih nomor 1') ||
    lower.includes('pilih nomor 2') ||
    lower.includes('pilih nomor 3') ||
    lower.includes('pilih yang pertama') ||
    lower.includes('pilih yang kedua') ||
    lower.includes('pilih yang ketiga');

  if (!isSelectionPhrase) return [];

  const lastConsultantWithRecs = [...previousMessages]
    .reverse()
    .find((m) => m.sender === 'consultant' && m.recommendations && m.recommendations.length > 0);

  if (!lastConsultantWithRecs) return [];

  const recs = lastConsultantWithRecs.recommendations;

  if (lower.includes('nomor 1') || lower.includes('pertama')) {
    const p = activeProducts.find((prod) => prod.id === recs[0]?.productId);
    return p ? [p] : [];
  }
  if ((lower.includes('nomor 2') || lower.includes('kedua')) && recs[1]) {
    const p = activeProducts.find((prod) => prod.id === recs[1]?.productId);
    return p ? [p] : [];
  }
  if ((lower.includes('nomor 3') || lower.includes('ketiga')) && recs[2]) {
    const p = activeProducts.find((prod) => prod.id === recs[2]?.productId);
    return p ? [p] : [];
  }

  for (const rec of recs) {
    const prod = activeProducts.find((p) => p.id === rec.productId);
    if (prod && lower.includes(prod.name.toLowerCase().split('—')[0].trim())) {
      return [prod];
    }
  }

  if (lower.includes('semua')) {
    return recs
      .map((r) => activeProducts.find((p) => p.id === r.productId))
      .filter((p): p is Product => Boolean(p));
  }

  const topProduct = activeProducts.find((p) => p.id === recs[0]?.productId);
  return topProduct ? [topProduct] : [];
}

/**
 * Builds a tailored reason why a product matches the user's consultation context.
 */
function buildRecommendationReason(
  product: Product,
  context: {
    weddingTheme?: string;
    desiredColors?: string;
    guestCount?: number;
    targetBudget?: number;
    weddingLocation?: string;
  }
): string {
  const reasons: string[] = [];
  const pText = `${product.name} ${product.shortDescription} ${product.description} ${product.variants.join(' ')}`.toLowerCase();
  const isPcs = product.unit?.toLowerCase() === 'pcs';
  const guests = context.guestCount && context.guestCount > 0 ? context.guestCount : 300;

  if (context.weddingTheme || context.desiredColors) {
    const themeLabel = [context.weddingTheme, context.desiredColors]
      .filter(Boolean)
      .join(' dengan nuansa ');
    reasons.push(`Cocok untuk konsep ${themeLabel.toLowerCase()}`);
  } else if (pText.includes('gold') || pText.includes('champagne')) {
    reasons.push('Cocok untuk tema elegant dengan warna cream dan champagne gold');
  } else {
    reasons.push(`Pilihan favorit kategori ${product.category} di katalog ISTAFA Wedding`);
  }

  if (context.targetBudget && context.targetBudget > 0) {
    if (isPcs) {
      const estTotal = product.price * guests;
      if (estTotal <= context.targetBudget) {
        reasons.push(
          `estimasi ${guests} pcs (${formatRupiah(estTotal)}) masuk dalam budget ${formatRupiah(context.targetBudget)}`
        );
      } else {
        const affordableQty = Math.max(50, Math.floor(context.targetBudget / product.price));
        reasons.push(
          `dengan harga ${formatRupiah(product.price)}/pcs dapat disesuaikan sekitar ${affordableQty} pcs untuk budget ${formatRupiah(context.targetBudget)}`
        );
      }
    } else if (product.price <= context.targetBudget) {
      reasons.push(
        `harga ${formatRupiah(product.price)} sesuai dengan kisaran budget ${formatRupiah(context.targetBudget)}`
      );
    }
  } else if (product.isPromo || (product.originalPrice && product.originalPrice > product.price)) {
    reasons.push(`sedang promo spesial (${formatRupiah(product.price)})`);
  } else if (product.inclusions && product.inclusions.length > 0) {
    reasons.push(`sudah termasuk ${product.inclusions.slice(0, 2).join(' & ').toLowerCase()}`);
  }

  if (isPcs && (!context.targetBudget || context.targetBudget <= 0) && context.guestCount && context.guestCount > 0) {
    reasons.push(`dapat dipesan sesuai kebutuhan ${context.guestCount} tamu (${formatRupiah(product.price * context.guestCount)})`);
  }

  const combined = reasons.join(', ');
  return combined.charAt(0).toUpperCase() + combined.slice(1) + '.';
}

/**
 * Selects up to 3 best matching active products from the Firestore catalog.
 */
export function selectTopCatalogRecommendations(
  activeProducts: Product[],
  context: {
    queryText: string;
    requestedCategories?: string[];
    weddingTheme?: string;
    desiredColors?: string;
    guestCount?: number;
    targetBudget?: number;
    weddingLocation?: string;
  },
  maxCount = 3
): ConsultationRecommendationItem[] {
  const available = activeProducts.filter(
    (p) => p.isActive !== false && p.isAvailable !== false
  );
  if (available.length === 0) return [];

  const qLower = context.queryText.toLowerCase();
  const themeWords = `${context.weddingTheme || ''} ${context.desiredColors || ''}`
    .toLowerCase()
    .split(/[\s,&/]+/)
    .filter((w) => w.length >= 3);

  const reqCats = context.requestedCategories || [];
  const guestCount = context.guestCount && context.guestCount > 0 ? context.guestCount : 300;
  const budget = context.targetBudget || 0;

  // Score each product
  const scored = available.map((product) => {
    let score = 0;
    const catLower = product.category.toLowerCase();
    const isPcs = product.unit?.toLowerCase() === 'pcs';
    const effectiveCost = isPcs ? product.price * guestCount : product.price;
    const fullText = `${product.name} ${product.category} ${product.shortDescription} ${product.description} ${product.variants.join(' ')} ${product.inclusions.join(' ')}`.toLowerCase();

    // Category match
    if (reqCats.length > 0) {
      for (const reqKey of reqCats) {
        const matcher = CATEGORY_MATCHERS.find((m) => m.key === reqKey);
        if (matcher) {
          if (matcher.catalogCategoryMatchers.some((cm) => catLower.includes(cm))) {
            score += 60;
          }
          if (matcher.keywords.some((kw) => fullText.includes(kw))) {
            score += 20;
          }
        }
      }
    }

    // Direct query keyword match
    const queryWords = qLower
      .split(/\s+/)
      .filter(
        (w) =>
          w.length >= 3 &&
          ![
            'saya',
            'mau',
            'ingin',
            'untuk',
            'yang',
            'dan',
            'dengan',
            'ada',
            'bisa',
            'tolong',
            'cari',
            'budget',
            'sekitar',
            'juta',
          ].includes(w)
      );
    for (const qw of queryWords) {
      if (product.name.toLowerCase().includes(qw)) score += 25;
      else if (catLower.includes(qw)) score += 20;
      else if (fullText.includes(qw)) score += 8;
    }

    // Theme & Color match
    for (const tw of themeWords) {
      if (fullText.includes(tw)) {
        score += 14;
      }
    }

    // Promo query boost
    if (
      (qLower.includes('promo') || qLower.includes('diskon') || qLower.includes('hemat')) &&
      (product.isPromo || (product.originalPrice && product.originalPrice > product.price))
    ) {
      score += 30;
    }

    // Smart Budget Fitness Scoring
    if (budget > 0) {
      if (effectiveCost <= budget) {
        score += 25;
      } else if (isPcs && product.price * 100 <= budget) {
        score += 18;
      } else if (product.price <= budget * 1.25) {
        score += 10;
      } else {
        score -= 10;
      }
    }

    if (product.isFeatured) score += 4;
    score += Math.min(5, (product.popularityScore || 80) / 25);

    return { product, score };
  });

  scored.sort((a, b) => b.score - a.score);

  const selected: Product[] = [];
  if (reqCats.length === 1) {
    const matchingCat = scored.filter((s) => s.score >= 40);
    for (const item of matchingCat) {
      if (selected.length < maxCount) {
        selected.push(item.product);
      }
    }
  } else if (reqCats.length > 1) {
    for (const reqKey of reqCats) {
      if (selected.length >= maxCount) break;
      const matcher = CATEGORY_MATCHERS.find((m) => m.key === reqKey);
      const bestForCat = scored.find(
        (s) =>
          !selected.some((sel) => sel.id === s.product.id) &&
          matcher?.catalogCategoryMatchers.some((cm) =>
            s.product.category.toLowerCase().includes(cm)
          )
      );
      if (bestForCat) {
        selected.push(bestForCat.product);
      }
    }
  }

  const usedCategories = new Set(selected.map((p) => p.category));
  for (const item of scored) {
    if (selected.length >= maxCount) break;
    if (selected.some((s) => s.id === item.product.id)) continue;
    if (!usedCategories.has(item.product.category) || reqCats.length === 1) {
      selected.push(item.product);
      usedCategories.add(item.product.category);
    }
  }

  for (const item of scored) {
    if (selected.length >= maxCount) break;
    if (!selected.some((s) => s.id === item.product.id)) {
      selected.push(item.product);
    }
  }

  return selected.slice(0, maxCount).map((product) => {
    const isPcs = product.unit?.toLowerCase() === 'pcs';
    let suggestedQty = isPcs ? guestCount : 1;
    if (isPcs && budget > 0 && product.price * guestCount > budget && reqCats.length === 1) {
      suggestedQty = Math.max(50, Math.floor(budget / product.price));
    }
    return {
      productId: product.id,
      reason: buildRecommendationReason(product, context),
      suggestedQuantity: suggestedQty,
    };
  });
}

/**
 * Builds a complete Wedding Budget Combination & Breakdown strictly using real active catalog products.
 */
export function buildBudgetCombination(
  activeProducts: Product[],
  targetBudget: number,
  guestCount = 300
): ConsultationBudgetBreakdown {
  const available = activeProducts.filter(
    (p) => p.isActive !== false && p.isAvailable !== false
  );

  const byCat = (keyword: string) =>
    available
      .filter((p) => p.category.toLowerCase().includes(keyword))
      .sort((a, b) => a.price - b.price);

  const decorList = byCat('dekorasi');
  const invCetakList = byCat('undangan cetak');
  const invDigitalList = byCat('undangan digital');
  const allInvList = [...invDigitalList, ...invCetakList, ...byCat('undangan')];
  const souvList = byCat('souvenir');
  const docList = byCat('dokumentasi');
  const muaList = [...byCat('mua'), ...byCat('makeup')];
  const otherServicesList = [
    ...byCat('wo'),
    ...byCat('mahar'),
    ...byCat('seserahan'),
    ...byCat('attire'),
    ...byCat('mc'),
  ].sort((a, b) => a.price - b.price);

  const isHighBudget = targetBudget >= 40_000_000;

  const pickProduct = (list: Product[], preferHigher: boolean): Product | undefined => {
    if (list.length === 0) return undefined;
    return preferHigher ? list[list.length - 1] : list[0];
  };

  const primaryDecor = pickProduct(decorList, isHighBudget);
  const primaryInv =
    targetBudget < 28_000_000 && invDigitalList.length > 0
      ? invDigitalList[0]
      : pickProduct(invCetakList.length > 0 ? invCetakList : allInvList, isHighBudget);
  const primarySouv = pickProduct(souvList, isHighBudget);
  const primaryDoc = pickProduct(docList, isHighBudget);
  const primaryMua = pickProduct(muaList, isHighBudget);
  const primaryOther = pickProduct(otherServicesList, isHighBudget);

  const makeLineItem = (
    categoryLabel: string,
    prod: Product | undefined,
    qtyForPcs: number
  ): ConsultationBudgetLineItem | null => {
    if (!prod) return null;
    const isPcs = prod.unit?.toLowerCase() === 'pcs';
    const qty = isPcs ? qtyForPcs : 1;
    return {
      categoryLabel,
      productId: prod.id,
      productName: prod.name,
      quantity: qty,
      unit: prod.unit || 'Paket',
      unitPrice: prod.price,
      subtotal: prod.price * qty,
    };
  };

  const invitationCount = Math.max(100, Math.round(guestCount));
  const souvenirCount = Math.max(100, Math.round(guestCount));

  const decorItem = makeLineItem('Dekorasi', primaryDecor, 1);
  const invItem = makeLineItem('Undangan', primaryInv, invitationCount);
  const souvItem = makeLineItem('Souvenir', primarySouv, souvenirCount);
  const docItem = makeLineItem('Dokumentasi', primaryDoc, 1);
  const muaItem = makeLineItem('Makeup', primaryMua, 1);
  const otherItem = makeLineItem('Layanan lainnya', primaryOther, 1);

  const items = [decorItem, invItem, souvItem, docItem, muaItem, otherItem].filter(
    (x): x is ConsultationBudgetLineItem => x !== null
  );

  const dekorasi = decorItem?.subtotal || 0;
  const undangan = invItem?.subtotal || 0;
  const souvenir = souvItem?.subtotal || 0;
  const dokumentasi = docItem?.subtotal || 0;
  const makeup = muaItem?.subtotal || 0;
  const layananLainnya = otherItem?.subtotal || 0;

  const totalEstimate =
    dekorasi + undangan + souvenir + dokumentasi + makeup + layananLainnya;

  const isOverBudget = totalEstimate > targetBudget;
  const overBudgetAmount = isOverBudget ? totalEstimate - targetBudget : 0;

  let alternativeItems: ConsultationBudgetLineItem[] | undefined;
  let alternativeTotal: number | undefined;

  if (isOverBudget) {
    const altList: ConsultationBudgetLineItem[] = [];
    const econDecor = decorList[0];
    const econInv = invDigitalList[0] || allInvList[0];
    const econSouv = souvList[0];
    const econDoc = docList[0];
    const econMua = muaList[0];
    const econOther = otherServicesList[0];

    const economicalPcsCount = Math.max(100, Math.round(guestCount * 0.6));

    const altDecorItem = makeLineItem('Dekorasi', econDecor, 1);
    const altInvItem = makeLineItem('Undangan', econInv, economicalPcsCount);
    const altSouvItem = makeLineItem('Souvenir', econSouv, economicalPcsCount);
    const altDocItem = makeLineItem('Dokumentasi', econDoc, 1);
    const altMuaItem = makeLineItem('Makeup', econMua, 1);
    const altOtherItem = makeLineItem('Layanan lainnya', econOther, 1);

    const candidateAlts = [
      altDecorItem,
      altMuaItem,
      altDocItem,
      altInvItem,
      altSouvItem,
      altOtherItem,
    ].filter((x): x is ConsultationBudgetLineItem => x !== null);

    let runningSum = 0;
    for (const cand of candidateAlts) {
      if (runningSum + cand.subtotal <= targetBudget || altList.length < 3) {
        altList.push(cand);
        runningSum += cand.subtotal;
      }
    }

    alternativeItems = altList;
    alternativeTotal = runningSum;
  }

  return {
    targetBudget,
    guestCount,
    dekorasi,
    undangan,
    souvenir,
    dokumentasi,
    makeup,
    layananLainnya,
    totalEstimate,
    isOverBudget,
    overBudgetAmount,
    items,
    alternativeItems,
    alternativeTotal,
  };
}

/**
 * Generates a complete, natural Indonesian wedding consultation reply with product recommendations
 * and optional budget breakdown strictly grounded in the ISTAFA Wedding catalog.
 */
export function generateConsultationResponse(params: {
  userMessage: string;
  sessionContext: {
    customerName?: string;
    partnerName?: string;
    coupleName: string;
    weddingDate: string;
    weddingLocation: string;
    guestCount: number;
    targetBudget: number;
    weddingTheme: string;
    desiredColors: string;
    needs?: string[];
  };
  previousMessages: ConsultationMessage[];
  products: Product[];
  packages: WeddingPackage[];
  promos: Promo[];
  calendarPublic: CalendarPublicEntry[];
}): {
  replyText: string;
  recommendations: ConsultationRecommendationItem[];
  budgetBreakdown?: ConsultationBudgetBreakdown;
  updatedContext: ConsultationExtractedContext;
  directCartProducts: Product[];
  isUnavailableNotice?: boolean;
  quickReplies?: string[];
} {
  const {
    userMessage,
    sessionContext,
    previousMessages,
    products,
    packages,
    promos,
    calendarPublic,
  } = params;

  const activeProducts = products.filter(
    (p) => p.isActive !== false && p.isAvailable !== false
  );

  const lastAssistantMsg = [...previousMessages]
    .reverse()
    .find((m) => m.sender === 'consultant')?.message;

  const extracted = extractWeddingContextFromText(userMessage, lastAssistantMsg);

  // Merge context
  const mergedCustomerName = extracted.customerName || sessionContext.customerName || '';
  const mergedPartnerName = extracted.partnerName || sessionContext.partnerName || '';
  const mergedCouple =
    extracted.coupleName ||
    (mergedCustomerName && mergedPartnerName
      ? `${mergedCustomerName} & ${mergedPartnerName}`
      : sessionContext.coupleName || mergedCustomerName);
  if (mergedCouple && !extracted.coupleName) {
    extracted.coupleName = mergedCouple;
  }
  const mergedBudget = extracted.targetBudget ?? sessionContext.targetBudget;
  const mergedGuests = extracted.guestCount ?? sessionContext.guestCount;
  const mergedDate = extracted.weddingDate || sessionContext.weddingDate;
  const mergedLocation = extracted.weddingLocation || sessionContext.weddingLocation;
  const mergedTheme = extracted.weddingTheme || sessionContext.weddingTheme;
  const mergedColors = extracted.desiredColors || sessionContext.desiredColors;
  const mergedNeeds = Array.from(
    new Set([...(sessionContext.needs || []), ...(extracted.needs || [])])
  );
  if (mergedNeeds.length > 0) {
    extracted.needs = mergedNeeds;
  }

  const greetingName = mergedCouple
    ? `Kak **${mergedCouple}**`
    : mergedCustomerName
    ? `Kak **${mergedCustomerName}**`
    : 'Kak';

  // 1. Check if user is selecting a recommended product ("Saya pilih yang ini" / "Saya tertarik")
  const directCartProducts = detectDirectCartSelection(
    userMessage,
    previousMessages,
    activeProducts
  );

  if (directCartProducts.length > 0) {
    const names = directCartProducts
      .map((p) => `**${p.name}** (${formatRupiah(p.price)})`)
      .join(', ');
    const recs: ConsultationRecommendationItem[] = directCartProducts.slice(0, 3).map((p) => ({
      productId: p.id,
      reason: 'Telah ditandai sebagai produk yang kamu minati & dimasukkan ke Keranjang Konsultasi.',
      suggestedQuantity: p.unit?.toLowerCase() === 'pcs' ? mergedGuests || 300 : 1,
    }));

    return {
      replyText: `Senang sekali ${greetingName}! Pilihan kamu yaitu ${names} sudah saya simpan ke dalam **Daftar Produk Diminati & Keranjang Konsultasi**.\n\nKalau kamu mau, saya bisa bantu hitungkan total estimasi budget keseluruhannya, atau kamu ingin melihat rekomendasi kebutuhan pernikahan lainnya?`,
      recommendations: recs,
      updatedContext: extracted,
      directCartProducts,
      quickReplies: [
        'Bantu hitungkan estimasi budget',
        'Rekomendasi Souvenir & Undangan',
        'Rekomendasi Dekorasi & MUA',
        'Konsultasikan dengan Istafa via WhatsApp',
      ],
    };
  }

  // 2. Check if user is requesting an item that is NOT available in ISTAFA Wedding catalog
  if (isUnsupportedCatalogRequest(userMessage, activeProducts)) {
    return {
      replyText: UNAVAILABLE_CATALOG_NOTICE,
      recommendations: [],
      updatedContext: extracted,
      directCartProducts: [],
      isUnavailableNotice: true,
    };
  }

  // Check if user requested a specific category, and verify if that category has active products
  if (extracted.requestedCategories && extracted.requestedCategories.length > 0) {
    const anyMatchInCatalog = extracted.requestedCategories.some((catKey) => {
      const matcher = CATEGORY_MATCHERS.find((m) => m.key === catKey);
      if (!matcher) return false;
      return activeProducts.some((p) =>
        matcher.catalogCategoryMatchers.some((cm) =>
          p.category.toLowerCase().includes(cm)
        )
      );
    });

    if (!anyMatchInCatalog) {
      return {
        replyText: UNAVAILABLE_CATALOG_NOTICE,
        recommendations: [],
        updatedContext: extracted,
        directCartProducts: [],
        isUnavailableNotice: true,
      };
    }
  }

  const lowerMsg = userMessage.toLowerCase();
  const hasSpecificCategory =
    Boolean(extracted.requestedCategories && extracted.requestedCategories.length > 0);

  // 3. Targeted Category + Specific Budget (e.g., "Saya ingin undangan yang elegant tapi budget sekitar 1 juta" or "Budget 10 juta untuk 300 tamu butuh undangan + souvenir")
  if (
    mergedBudget > 0 &&
    (hasSpecificCategory || mergedBudget < 15_000_000)
  ) {
    const effectiveGuests = mergedGuests > 0 ? mergedGuests : 300;
    const reqCats =
      extracted.requestedCategories && extracted.requestedCategories.length > 0
        ? extracted.requestedCategories
        : mergedBudget <= 3_000_000
        ? ['undangan', 'souvenir', 'mahar', 'seserahan']
        : ['dekorasi', 'undangan', 'souvenir', 'makeup', 'dokumentasi'];

    const topRecs = selectTopCatalogRecommendations(
      activeProducts,
      {
        queryText: userMessage,
        requestedCategories: reqCats,
        weddingTheme: mergedTheme,
        desiredColors: mergedColors,
        guestCount: effectiveGuests,
        targetBudget: mergedBudget,
        weddingLocation: mergedLocation,
      },
      3
    );

    const needsText =
      mergedNeeds.length > 0
        ? mergedNeeds.join(' & ')
        : 'kebutuhan pernikahan kamu';

    let replyText = `Kalau budget ${greetingName} sekitar **${formatRupiah(
      mergedBudget
    )}** untuk **${needsText}**${
      mergedGuests > 0 ? ` (${effectiveGuests} tamu)` : ''
    }, saya punya beberapa pilihan terbaik dari katalog ISTAFA Wedding yang cocok untuk kamu:\n\nSepertinya pilihan di bawah ini sangat pas dengan rencana kamu. Kalau kamu mau, tekan **"Saya Tertarik"** atau **"Konsultasikan"** pada produk yang paling kamu sukai.`;

    if (!mergedGuests || mergedGuests <= 0) {
      replyText += `\n\nNgomong-ngomong, perkiraan jumlah tamu yang akan diundang berapa orang, Kak?`;
    }

    return {
      replyText,
      recommendations: topRecs,
      updatedContext: extracted,
      directCartProducts: [],
      quickReplies: [
        'Saya pilih yang ini',
        'Jumlah tamu 300 orang',
        'Lihat rekomendasi dekorasi',
        'Simpan data konsultasi saya',
      ],
    };
  }

  // 4. Full Wedding Budget Simulation (when budget >= 15M and no single small category restriction)
  const isAskingBudgetSimulation =
    Boolean(extracted.targetBudget) ||
    lowerMsg.includes('budget') ||
    lowerMsg.includes('anggaran') ||
    lowerMsg.includes('biaya') ||
    lowerMsg.includes('hitung') ||
    lowerMsg.includes('estimasi') ||
    (Boolean(extracted.guestCount) && mergedBudget >= 15_000_000);

  if (isAskingBudgetSimulation && mergedBudget >= 15_000_000) {
    const effectiveGuests = mergedGuests > 0 ? mergedGuests : 300;
    const breakdown = buildBudgetCombination(activeProducts, mergedBudget, effectiveGuests);

    const sourceLineItems =
      breakdown.isOverBudget && breakdown.alternativeItems && breakdown.alternativeItems.length > 0
        ? breakdown.alternativeItems
        : breakdown.items;

    const topRecs: ConsultationRecommendationItem[] = sourceLineItems
      .slice(0, 3)
      .map((li) => {
        const prod = activeProducts.find((p) => p.id === li.productId);
        return {
          productId: li.productId,
          reason: breakdown.isOverBudget
            ? `Alternatif hemat dari katalog ISTAFA (${formatRupiah(li.subtotal)}) agar sesuai dengan budget ${formatRupiah(mergedBudget)}.`
            : prod
            ? buildRecommendationReason(prod, {
                weddingTheme: mergedTheme,
                desiredColors: mergedColors,
                guestCount: effectiveGuests,
                targetBudget: mergedBudget,
              })
            : `Direkomendasikan untuk alokasi ${li.categoryLabel} Anda.`,
          suggestedQuantity: li.quantity,
        };
      });

    let introLines = `Terima kasih informasinya ${greetingName}! Untuk rencana pernikahan dengan target budget **${formatRupiah(
      mergedBudget
    )}** dan perkiraan **${effectiveGuests} tamu**${
      mergedLocation ? ` di **${mergedLocation}**` : ''
    }, berikut simulasi kombinasi produk & layanan dari katalog ISTAFA Wedding:`;

    if (breakdown.isOverBudget) {
      introLines += `\n\nRencana standar melebihi budget sekitar **${formatRupiah(
        breakdown.overBudgetAmount
      )}**. Saya sudah menyiapkan alternatif kombinasi yang lebih hemat dari katalog ISTAFA Wedding di bawah ini agar tetap nyaman di budget kamu.`;
    } else {
      const remaining = mergedBudget - breakdown.totalEstimate;
      introLines += `\n\nKombinasi ini masuk dengan nyaman di dalam anggaran kamu${
        remaining > 0 ? ` dengan sisa ruang budget sekitar **${formatRupiah(remaining)}**` : ''
      }. Berikut 3 rekomendasi produk utamanya:`;
    }

    if (!mergedGuests || (!extracted.guestCount && sessionContext.guestCount === 0)) {
      introLines += `\n\n*Catatan: Simulasi di atas menggunakan asumsi 300 tamu. Berapa jumlah tamu yang diperkirakan hadir pada acara kamu?*`;
    }

    return {
      replyText: introLines,
      recommendations: topRecs,
      budgetBreakdown: breakdown,
      updatedContext: extracted,
      directCartProducts: [],
      quickReplies: [
        'Saya pilih yang ini',
        'Rekomendasi Undangan & Souvenir',
        'Rekomendasi MUA & WO',
        'Konsultasikan dengan Istafa',
      ],
    };
  }

  // 5. Guided Personal Wedding Consultant Progressive Flow (Requirement 9)
  const hasThemeOrColor = Boolean(extracted.weddingTheme || extracted.desiredColors);
  const isPackageOrPromoQuery =
    lowerMsg.includes('paket') ||
    lowerMsg.includes('promo') ||
    lowerMsg.includes('diskon') ||
    lowerMsg.includes('bantu saya pilih');

  if (!hasSpecificCategory && !hasThemeOrColor && !isPackageOrPromoQuery) {
    // If user just gave their name, ask partner's name or wedding date warmly
    if (extracted.customerName && !mergedPartnerName && !extracted.coupleName) {
      return {
        replyText: `Salam kenal Kak **${extracted.customerName}**! 😊 Senang bisa membantu persiapan hari bahagiamu.\n\nKalau boleh tahu, **nama pasangan kamu siapa**?`,
        recommendations: [],
        updatedContext: extracted,
        directCartProducts: [],
        quickReplies: [
          'Langsung tanya rekomendasi produk',
          'Simulasi Budget 30 Juta',
          'Cari Undangan & Souvenir',
        ],
      };
    }

    if ((extracted.partnerName || extracted.coupleName) && !mergedDate) {
      return {
        replyText: `Wah, salam kenal untuk **${mergedCouple}**! Semoga persiapan pernikahannya lancar ya ✨\n\n**Rencana tanggal atau bulan pernikahannya kapan**, dan **acara akan diadakan di mana** (kota/gedung/rumah)?`,
        recommendations: [],
        updatedContext: extracted,
        directCartProducts: [],
        quickReplies: [
          'Desember 2026 di Bogor',
          'November 2026 di Jakarta',
          'Tahun depan di Gedung',
          'Belum ditentukan tanggalnya',
        ],
      };
    }

    // Check date availability if user mentioned a date
    let dateInfoPrefix = '';
    if (extracted.weddingDate) {
      const calEntry = calendarPublic.find((c) => c.date === extracted.weddingDate);
      if (calEntry?.status === 'unavailable') {
        dateInfoPrefix = `Untuk tanggal **${extracted.weddingDate}**, saat ini jadwal utama di kalender ISTAFA Wedding berstatus **Penuh (🔴)** (${calEntry.publicNote}). Namun tim kami bisa membantu mengecek ketersediaan slot khusus. `;
      } else if (calEntry?.status === 'reserved') {
        dateInfoPrefix = `Untuk tanggal **${extracted.weddingDate}**, saat ini jadwal berstatus **Tersisa 1 Slot (🟡)** (${calEntry.publicNote}). `;
      } else {
        dateInfoPrefix = `Kabar baik! Tanggal **${extracted.weddingDate}** saat ini masih **Tersedia (🟢)** di jadwal ISTAFA Wedding. `;
      }
    }

    if (extracted.weddingLocation && !dateInfoPrefix) {
      dateInfoPrefix = `Baik ${greetingName}, kami melayani area **${mergedLocation}** dan sekitarnya. `;
    }

    if ((extracted.weddingDate || extracted.weddingLocation) && (!mergedGuests || mergedGuests <= 0)) {
      return {
        replyText: `${dateInfoPrefix}Kalau boleh tahu, **perkiraan jumlah tamu yang akan hadir berapa orang**, Kak?`,
        recommendations: [],
        updatedContext: extracted,
        directCartProducts: [],
        quickReplies: ['150 tamu (Intimate)', '300 tamu', '500 tamu', '800 tamu'],
      };
    }

    if (extracted.guestCount && mergedNeeds.length === 0 && (!mergedBudget || mergedBudget <= 0)) {
      return {
        replyText: `Siap ${greetingName}, untuk **${mergedGuests} tamu** sudah saya catat.\n\nSaat ini kamu **lagi mencari kebutuhan apa saja**? Kamu bisa memilih salah satu atau beberapa kebutuhan di bawah ini, serta menyebutkan **kisaran budget yang sudah disiapkan**:`,
        recommendations: [],
        updatedContext: extracted,
        directCartProducts: [],
        quickReplies: [
          'Undangan & Souvenir',
          'Dekorasi Pernikahan',
          'Paket Wedding Lengkap',
          'Dokumentasi & MUA',
          'Mahar & Seserahan / Hampers',
          'Budget saya 30 juta',
        ],
      };
    }

    if (!mergedBudget || mergedBudget <= 0) {
      return {
        replyText: `${dateInfoPrefix}Agar saya dapat merekomendasikan produk katalog ISTAFA Wedding yang paling pas untuk ${greetingName}, **lagi mencari kebutuhan apa** (Undangan, Souvenir, Dekorasi, Dokumentasi, Paket Wedding, Hampers) dan **berapa kisaran budget yang sudah disiapkan**?`,
        recommendations: [],
        updatedContext: extracted,
        directCartProducts: [],
        quickReplies: [
          'Undangan elegant budget 1 juta',
          'Undangan & Souvenir budget 5 juta',
          'Dekorasi & Dokumentasi budget 15 juta',
          'Paket lengkap budget 30 juta',
        ],
      };
    }

    if (!mergedGuests || mergedGuests <= 0) {
      return {
        replyText: `${dateInfoPrefix}Terima kasih ${greetingName}! Dengan perkiraan budget **${formatRupiah(
          mergedBudget
        )}**, **berapa perkiraan jumlah tamu** yang akan hadir?`,
        recommendations: [],
        updatedContext: extracted,
        directCartProducts: [],
        quickReplies: ['200 tamu', '300 tamu', '500 tamu', '750 tamu'],
      };
    }
  }

  // 6. Specific Category, Theme, Color, Package, or Promo Recommendation (Max 3 Cards)
  const topRecs = selectTopCatalogRecommendations(
    activeProducts,
    {
      queryText: userMessage,
      requestedCategories: extracted.requestedCategories,
      weddingTheme: mergedTheme,
      desiredColors: mergedColors,
      guestCount: mergedGuests || 300,
      targetBudget: mergedBudget,
      weddingLocation: mergedLocation,
    },
    3
  );

  if (topRecs.length === 0) {
    return {
      replyText: UNAVAILABLE_CATALOG_NOTICE,
      recommendations: [],
      updatedContext: extracted,
      directCartProducts: [],
      isUnavailableNotice: true,
    };
  }

  const contextDetails: string[] = [];
  if (mergedTheme) contextDetails.push(`tema **${mergedTheme}**`);
  if (mergedColors) contextDetails.push(`nuansa warna **${mergedColors}**`);
  if (mergedLocation) contextDetails.push(`lokasi **${mergedLocation}**`);
  if (mergedGuests > 0) contextDetails.push(`kapasitas **${mergedGuests} tamu**`);
  if (mergedBudget > 0) contextDetails.push(`budget **${formatRupiah(mergedBudget)}**`);

  let replyHeader = `Untuk kebutuhan ${greetingName}, saya merekomendasikan pilihan terbaik dari katalog ISTAFA Wedding`;
  if (contextDetails.length > 0) {
    replyHeader += ` (disesuaikan dengan ${contextDetails.join(', ')})`;
  }
  replyHeader += ':';

  let extraPackageNote = '';
  if (lowerMsg.includes('paket') && packages.length > 0) {
    const activePkgs = packages.filter((p) => p.isActive !== false).slice(0, 3);
    if (activePkgs.length > 0) {
      extraPackageNote =
        '\n\nSelain produk di bawah, ISTAFA Wedding juga memiliki paket bundling hemat seperti ' +
        activePkgs.map((pk) => `**${pk.name}** (${formatRupiah(pk.price)})`).join(', ') +
        '.';
    }
  } else if (lowerMsg.includes('promo') && promos.length > 0) {
    const activeP = promos.filter((p) => p.isActive).slice(0, 2);
    if (activeP.length > 0) {
      extraPackageNote =
        '\n\nSaat ini juga berlangsung promo spesial: ' +
        activeP
          .map((pr) => `**${pr.title}** (${formatRupiah(pr.promoPrice)})`)
          .join(' & ') +
        '.';
    }
  }

  let followUpQuestion =
    '\n\nSepertinya pilihan ini cocok dengan kebutuhan kamu. Kalau kamu mau, saya bisa bantu hitungkan kebutuhan dan estimasi budgetnya, atau kamu bisa menekan **"Saya Tertarik"** pada kartu produk di bawah.';
  if (!mergedBudget || mergedBudget <= 0) {
    followUpQuestion +=
      '\n\nNgomong-ngomong, berapa kisaran budget yang sudah disiapkan agar saya bisa menyesuaikan rekomendasinya?';
  } else if (!mergedGuests || mergedGuests <= 0) {
    followUpQuestion +=
      '\n\nPerkiraan jumlah tamu yang hadir berapa orang, Kak, agar saya bisa hitungkan kuota undangan & souvenirnya?';
  }

  return {
    replyText: `${replyHeader}${extraPackageNote}${followUpQuestion}`,
    recommendations: topRecs,
    updatedContext: extracted,
    directCartProducts: [],
    quickReplies: [
      'Saya pilih yang ini',
      'Bantu hitungkan estimasi budget',
      'Konsultasikan dengan Istafa',
      'Lihat kebutuhan lainnya',
    ],
  };
}
