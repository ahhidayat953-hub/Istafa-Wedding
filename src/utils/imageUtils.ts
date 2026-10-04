import { deleteObject, getDownloadURL, ref, uploadString } from 'firebase/storage';
import { auth, storage } from '../firebase';
import {
  BudgetAllocation,
  ConsultationCartItem,
  Product,
  ProductImage,
  Promo,
  WeddingPackage,
} from '../types';

/**
 * Formats a number into Indonesian Rupiah (e.g., Rp 18.500.000)
 */
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

/**
 * Computes a deterministic SHA-256 hex digest so admin passwords are never persisted in plaintext.
 */
export async function hashPasswordHex(rawPassword: string): Promise<string> {
  try {
    if (typeof window !== 'undefined' && window.crypto?.subtle) {
      const encoded = new TextEncoder().encode(`istafa_salt_v1_${rawPassword}`);
      const digest = await window.crypto.subtle.digest('SHA-256', encoded);
      return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    }
  } catch {
    // Fallback deterministic hash if subtle crypto is unavailable
  }
  let hash = 5381;
  const salted = `istafa_salt_v1_${rawPassword}`;
  for (let i = 0; i < salted.length; i++) {
    hash = (hash * 33) ^ salted.charCodeAt(i);
  }
  return `h_${(hash >>> 0).toString(16)}`;
}

/**
 * Returns the primary image from an array of ProductImage, falling back to the first item.
 */
export function getPrimaryImage(images: ProductImage[]): ProductImage {
  if (!images || images.length === 0) {
    return {
      id: 'fallback',
      url: '/src/assets/images/wedding_hero_pelaminan_1791077458144.jpg',
      isPrimary: true,
      caption: 'Foto Utama',
    };
  }
  return images.find((img) => img.isPrimary) || images[0];
}

/**
 * Normalizes a WhatsApp phone number to international digits (e.g., 6282123376933)
 */
export function normalizeWhatsAppNumber(raw: string): string {
  const digits = (raw || '').replace(/[^0-9]/g, '');
  if (digits.startsWith('0')) {
    return '62' + digits.slice(1);
  }
  if (digits.startsWith('8')) {
    return '62' + digits;
  }
  return digits || '6282123376933';
}

/**
 * Builds the exact WhatsApp message requested for a specific product (Requirement 17).
 */
export function buildProductWhatsAppMessage(
  product: Product,
  selectedVariant?: string,
  selectedSize?: string
): string {
  const formattedPrice = formatRupiah(product.price);
  const unitInfo = product.unit ? ` / ${product.unit}` : '';
  const isSanggar = product.category.toLowerCase().includes('sanggar');
  const isService =
    isSanggar ||
    product.category.toLowerCase().includes('mua') ||
    product.category.toLowerCase().includes('wo') ||
    product.category.toLowerCase().includes('attire');

  const variantLabel = isSanggar
    ? 'Jenis Pertunjukan'
    : isService
    ? 'Pilihan Paket'
    : 'Varian';
  const sizeLabel = isSanggar
    ? 'Durasi'
    : isService
    ? 'Cakupan Layanan'
    : 'Ukuran';

  const variantLine = selectedVariant ? `\n${variantLabel}: ${selectedVariant}` : '';
  const sizeLine = selectedSize ? `\n${sizeLabel}: ${selectedSize}` : '';
  return `Halo ISTAFA Wedding, saya tertarik dengan layanan/produk:\nNama Layanan/Produk: ${product.name}\nKategori: ${product.category}\nHarga: ${formattedPrice}${unitInfo}${variantLine}${sizeLine}\n\nSaya ingin mengetahui detail dan ketersediaannya.`;
}

/**
 * Builds a WhatsApp consultation message for a wedding package.
 */
export function buildPackageWhatsAppMessage(pkg: WeddingPackage): string {
  const formattedPrice = formatRupiah(pkg.price);
  return `Halo ISTAFA Wedding, saya tertarik dengan Paket Pernikahan:\nNama Paket: ${pkg.name} (${pkg.tier})\nHarga: ${formattedPrice}\nRekomendasi Tamu: ${pkg.guestCapacity}\n\nSaya ingin berkonsultasi mengenai detail paket dan ketersediaan tanggal.`;
}

/**
 * Builds a WhatsApp consultation message for a Promo offer.
 */
export function buildPromoWhatsAppMessage(promo: Promo): string {
  return `Halo ISTAFA Wedding, saya tertarik dengan Promo Spesial:\nNama Promo: ${promo.title}\nHarga Promo: ${formatRupiah(
    promo.promoPrice
  )} (Normal: ${formatRupiah(promo.normalPrice)})\nPeriode: ${promo.startDate} s/d ${
    promo.endDate
  }\n\nMohon informasi detail dan cara klaim promo ini.`;
}

/**
 * Builds the exact WhatsApp message for the Consultation Cart ("Keranjang / Daftar Konsultasi" - Requirement 7).
 */
export function buildCartWhatsAppMessage(
  items: ConsultationCartItem[],
  weddingDate?: string,
  guestCount?: number | string,
  customNote?: string,
  coupleName?: string,
  weddingLocation?: string
): string {
  const lines = items.map((item) => {
    const unit = item.product.unit || 'paket';
    const subtotal = item.product.price * item.quantity;
    const detailParts = [
      item.selectedVariant ? `Varian: ${item.selectedVariant}` : '',
      item.selectedSize ? `Cakupan/Ukuran: ${item.selectedSize}` : '',
    ]
      .filter(Boolean)
      .join(', ');
    const detailSuffix = detailParts ? ` [${detailParts}]` : '';
    return `- ${item.product.name}${detailSuffix} (${item.quantity} ${unit} × ${formatRupiah(
      item.product.price
    )}) = ${formatRupiah(subtotal)}`;
  });

  const totalEstimate = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  const noteLine = customNote?.trim() ? `\nCatatan: ${customNote.trim()}\n` : '';

  return `Halo ISTAFA Wedding.\n\nSaya ingin berkonsultasi mengenai rencana pernikahan saya.\n\nNama: ${
    coupleName?.trim() || '-'
  }\nTanggal: ${
    weddingDate?.trim() || 'Belum ditentukan'
  }\nLokasi: ${
    weddingLocation?.trim() || 'Belum ditentukan'
  }\nJumlah tamu: ${
    guestCount ? `${guestCount} Tamu Undangan` : 'Belum ditentukan'
  }\n\nProduk/Layanan:\n\n${lines.join(
    '\n'
  )}\n\nEstimasi Budget:\n${formatRupiah(
    totalEstimate
  )}${noteLine}\n\nMohon informasi mengenai ketersediaan dan detail layanan.`;
}

/**
 * Builds a WhatsApp message for the Wedding Budget Calculator (Requirement 8).
 */
export function buildBudgetWhatsAppMessage(
  budget: BudgetAllocation,
  total: number,
  selectedProductNames: string[],
  coupleName?: string,
  weddingDate?: string,
  weddingLocation?: string
): string {
  const rows: [string, number][] = [
    ['Catering', budget.catering],
    ['Dekorasi', budget.dekorasi],
    ['Tenda', budget.tenda],
    ['Undangan', budget.undangan],
    ['Souvenir', budget.souvenir],
    ['Dokumentasi', budget.dokumentasi],
    ['MUA — Make Up Artist', budget.makeup],
    ['WO — Wedding Organizer', budget.wo || 0],
    ['Tim Sanggar (Pertunjukan)', budget.sanggar || 0],
    ['Tim Attire (Pendampingan Pakaian)', budget.attire || 0],
    ['Entertainment (Musik & Sound)', budget.entertainment || 0],
    ['MC (Master of Ceremony)', budget.mc || 0],
    ['Parkir & Security Venue', budget.parkir || 0],
    ['Busana Pengantin', budget.busana],
    ['Mahar', budget.mahar],
    ['Seserahan', budget.seserahan],
    ['Lainnya', budget.lainnya],
  ];

  const activeRows = rows
    .filter(([, val]) => val > 0)
    .map(([label, val]) => `- ${label}: ${formatRupiah(val)}`);

  const prodSection =
    selectedProductNames.length > 0
      ? `\nProduk/Layanan Katalog Terpilih:\n${selectedProductNames
          .map((n) => `- ${n}`)
          .join('\n')}\n`
      : '';

  return `Halo ISTAFA Wedding.\n\nSaya ingin berkonsultasi mengenai rencana pernikahan saya.\n\nNama: ${
    coupleName?.trim() || '-'
  }\nTanggal: ${weddingDate?.trim() || 'Belum ditentukan'}\nLokasi: ${
    weddingLocation?.trim() || 'Belum ditentukan'
  }\nJumlah tamu: ${
    budget.guestCount
  } Tamu Undangan\n\nProduk/Layanan (Alokasi Budget):\n${activeRows.join(
    '\n'
  )}${prodSection}\nEstimasi Budget:\n${formatRupiah(
    total
  )}\n\nMohon informasi mengenai ketersediaan dan detail layanan.`;
}

/**
 * Builds a combined WhatsApp consultation message for all products in the user's Wishlist.
 */
export function buildWishlistWhatsAppMessage(
  items: Product[],
  customNote?: string
): string {
  if (!items || items.length === 0) {
    return 'Halo ISTAFA Wedding, saya ingin berkonsultasi mengenai katalog kebutuhan pernikahan.';
  }

  const lines = items.map(
    (item, idx) =>
      `${idx + 1}. ${item.name} (${item.category}) — ${formatRupiah(item.price)}`
  );
  const totalEstimated = items.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
  const noteSection = customNote?.trim()
    ? `\nCatatan Tambahan: ${customNote.trim()}\n`
    : '';

  return `Halo ISTAFA Wedding, saya menyimpan produk berikut di Wishlist Saya dan ingin berkonsultasi:\n\n${lines.join(
    '\n'
  )}\n\nEstimasi Total: ${formatRupiah(
    totalEstimated
  )}${noteSection}\n\nMohon informasi ketersediaan dan detail produk tersebut.`;
}

/**
 * Builds a general WhatsApp consultation URL.
 */
export function buildWhatsAppUrl(whatsappNumber: string, message: string): string {
  const phone = normalizeWhatsAppNumber(whatsappNumber);
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/avif',
];

const MAX_RAW_IMAGE_SIZE_BYTES = 12 * 1024 * 1024; // 12 MB max before compression

export function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'File gambar tidak ditemukan.' };
  }
  const hasValidMime =
    ALLOWED_IMAGE_MIME_TYPES.includes(file.type.toLowerCase()) ||
    file.type.startsWith('image/');
  if (!hasValidMime) {
    return {
      valid: false,
      error: `Format file "${file.name}" tidak didukung. Gunakan format JPG, PNG, atau WEBP.`,
    };
  }
  if (file.size > MAX_RAW_IMAGE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `Ukuran foto "${file.name}" (${sizeMb} MB) melebihi batas maksimal 12 MB.`,
    };
  }
  return { valid: true };
}

/**
 * Deletes Firebase Storage files when a product, package, or gallery item is removed
 * so orphaned files do not accumulate permanently in cloud storage.
 */
export async function deleteStorageUrls(urls: string[]): Promise<void> {
  if (!storage || !auth.currentUser || !urls || urls.length === 0) return;
  for (const url of urls) {
    if (!url || !url.includes('firebasestorage.googleapis.com')) continue;
    try {
      const fileRef = ref(storage, url);
      await deleteObject(fileRef);
    } catch {
      // Ignore if file was already deleted or is an external/preset URL
    }
  }
}

/**
 * Compresses an uploaded image File and uploads to Firebase Storage if available,
 * validating format & size and reporting progress.
 */
export async function compressImageFile(
  file: File,
  maxWidth = 1000,
  quality = 0.74,
  storageFolder = 'wedding-uploads',
  onProgress?: (percent: number, statusText: string) => void
): Promise<string> {
  const validation = validateImageFile(file);
  if (!validation.valid) {
    throw new Error(validation.error || 'File gambar tidak valid.');
  }

  onProgress?.(15, `Memvalidasi & mengoptimalkan "${file.name}"...`);

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxWidth) {
          if (width >= height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxWidth) / height);
            height = maxWidth;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }

        ctx.fillStyle = '#FBF9F5';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        let compressedDataUrl = canvas.toDataURL('image/webp', quality);
        if (!compressedDataUrl.startsWith('data:image/webp')) {
          compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        }

        if (compressedDataUrl.length > 140000) {
          compressedDataUrl = canvas.toDataURL('image/jpeg', 0.62);
        }

        resolve(compressedDataUrl);
      };
      img.onerror = () => reject(new Error(`Gagal memuat gambar "${file.name}".`));
      img.src = event.target?.result as string;
    };
    reader.onerror = () => reject(new Error(`Gagal membaca file "${file.name}" dari perangkat.`));
    reader.readAsDataURL(file);
  });

  onProgress?.(55, `Mengunggah "${file.name}" ke Firebase Storage...`);

  // Attempt upload to Firebase Storage if authenticated with Firebase
  if (auth.currentUser && storage) {
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 50);
      const storageRef = ref(
        storage,
        `${storageFolder}/${Date.now()}_${safeName}.webp`
      );
      await uploadString(storageRef, dataUrl, 'data_url');
      const downloadUrl = await getDownloadURL(storageRef);
      if (downloadUrl) {
        onProgress?.(100, 'Foto berhasil diunggah ke Firebase Storage!');
        return downloadUrl;
      }
    } catch {
      // Gracefully fall back to optimized Data URL if Firebase Storage bucket is not provisioned
    }
  }

  onProgress?.(100, 'Foto berhasil dioptimalkan!');
  return dataUrl;
}
