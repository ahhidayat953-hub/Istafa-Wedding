import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from '../firebase';
import { BudgetAllocation, ConsultationCartItem, Product, ProductImage, Promo } from '../types';

export const DEFAULT_WEDDING_FALLBACK_IMAGE =
  '/images/wedding_hero_pelaminan_1791077458144.jpg';

const MAX_UPLOAD_SIZE_BYTES = 12 * 1024 * 1024; // 12 MB max per photo
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
];

/**
 * Normalizes any stored or legacy image URL so that:
 * 1. Legacy `/src/assets/images/<file>` paths (which only worked on Vite dev server)
 *    are automatically rewritten to `/images/<file>` served from `public/images/` on Vercel.
 * 2. Ephemeral/local URLs (`blob:`, `file:`, `localhost`, `127.0.0.1`, `/uploads/`, `/tmp/`, `/temp/`)
 *    are rejected and replaced with the production fallback image.
 * 3. Valid Firebase Cloud Storage URLs, HTTPS CDN URLs, `/images/...` static assets,
 *    and persistent `data:image/...` payloads are preserved intact.
 */
export function normalizeWeddingImageUrl(rawUrl?: string | null): string {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return DEFAULT_WEDDING_FALLBACK_IMAGE;
  }

  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return DEFAULT_WEDDING_FALLBACK_IMAGE;
  }

  // Rewrite legacy Vite dev-only asset paths to production public `/images/` path
  if (trimmed.includes('/src/assets/images/')) {
    const fileName = trimmed.split('/src/assets/images/').pop()?.split('?')[0];
    if (fileName) {
      return `/images/${fileName}`;
    }
  }
  if (trimmed.startsWith('src/assets/images/')) {
    const fileName = trimmed.replace('src/assets/images/', '').split('?')[0];
    if (fileName) {
      return `/images/${fileName}`;
    }
  }

  // Reject temporary/ephemeral or localhost-only URLs
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('blob:') ||
    lower.startsWith('file:') ||
    lower.includes('://localhost') ||
    lower.includes('://127.0.0.1') ||
    lower.startsWith('/uploads/') ||
    lower.startsWith('uploads/') ||
    lower.startsWith('/tmp/') ||
    lower.startsWith('/temp/')
  ) {
    return DEFAULT_WEDDING_FALLBACK_IMAGE;
  }

  // Preserve valid persistent data URLs, HTTPS URLs, and `/images/` static paths
  if (
    trimmed.startsWith('data:image/') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('/images/')
  ) {
    return trimmed;
  }

  if (trimmed.startsWith('/')) {
    return trimmed;
  }

  return DEFAULT_WEDDING_FALLBACK_IMAGE;
}

/**
 * Checks whether an image URL is safe and persistent for production database storage.
 * Rejects blob:, file:, localhost, 127.0.0.1, /uploads, /tmp, /temp.
 */
export function isValidPersistentImageUrl(rawUrl?: string | null): boolean {
  if (!rawUrl || typeof rawUrl !== 'string') return false;
  const trimmed = rawUrl.trim();
  if (!trimmed) return false;
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('blob:') ||
    lower.startsWith('file:') ||
    lower.includes('://localhost') ||
    lower.includes('://127.0.0.1') ||
    lower.startsWith('/uploads/') ||
    lower.startsWith('uploads/') ||
    lower.startsWith('/tmp/') ||
    lower.startsWith('/temp/')
  ) {
    return false;
  }
  return (
    trimmed.startsWith('https://') ||
    trimmed.startsWith('/images/') ||
    trimmed.startsWith('/src/assets/images/') ||
    trimmed.startsWith('data:image/')
  );
}

/**
 * Extracts a clean storage path from a Firebase Storage URL or generates a deterministic
 * persistent storage path for database relational tracking (`Product -> Product Images -> Persistent Storage`).
 */
export function resolveImageStoragePath(
  url: string,
  productId: string,
  imageId: string,
  existingStoragePath?: string
): string {
  if (existingStoragePath && existingStoragePath.trim().length > 0) {
    return existingStoragePath.trim();
  }
  if (url.includes('firebasestorage.googleapis.com') && url.includes('/o/')) {
    try {
      const encodedPath = url.split('/o/')[1]?.split('?')[0];
      if (encodedPath) {
        return decodeURIComponent(encodedPath);
      }
    } catch {
      // ignore decode error
    }
  }
  if (url.startsWith('/images/')) {
    return `public${url}`;
  }
  return `cloud-storage/products/${productId}/${imageId}.webp`;
}

/**
 * Enriches an array of ProductImage items with complete relational metadata:
 * product_id, image_id, image_url, storage_path, is_primary, sort_order, created_at
 */
export function enrichProductImagesForDatabase(
  productId: string,
  images: ProductImage[]
): ProductImage[] {
  const nowIso = new Date().toISOString();
  const safeList = Array.isArray(images) ? images : [];

  // Ensure exactly one primary image exists
  const hasPrimary = safeList.some((img) => Boolean(img.isPrimary || img.is_primary));

  const safeProdId = (productId || 'prod')
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .slice(0, 60);

  return safeList.map((img, idx) => {
    const rawId = (img.image_id || img.id || '')
      .trim()
      .replace(/[^a-zA-Z0-9_-]/g, '-');
    const baseId = rawId || `img-${idx + 1}-${Date.now().toString(36)}`;
    const cleanId = (
      baseId.startsWith(safeProdId) ? baseId : `${safeProdId}_${baseId}`
    ).slice(0, 120);
    const rawUrl = img.image_url || img.url || DEFAULT_WEDDING_FALLBACK_IMAGE;
    const normalizedUrl = normalizeWeddingImageUrl(rawUrl);
    const isPrim = hasPrimary ? Boolean(img.isPrimary || img.is_primary) : idx === 0;
    const sortOrder = typeof img.sort_order === 'number' ? img.sort_order : idx;
    const storagePath = resolveImageStoragePath(
      normalizedUrl,
      productId,
      cleanId,
      img.storage_path
    );
    const createdAt = img.created_at || nowIso;

    return {
      id: cleanId,
      image_id: cleanId,
      product_id: productId,
      url: normalizedUrl,
      image_url: normalizedUrl,
      storage_path: storagePath,
      isPrimary: isPrim,
      is_primary: isPrim,
      sort_order: sortOrder,
      caption: (img.caption || `Foto ${idx + 1}`).slice(0, 300),
      created_at: createdAt,
    };
  });
}

export function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'File tidak ditemukan.' };
  }
  if (
    !file.type.startsWith('image/') &&
    !ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())
  ) {
    return {
      valid: false,
      error: `Format file "${file.name}" tidak didukung. Gunakan foto JPG, PNG, atau WEBP.`,
    };
  }
  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `Ukuran foto "${file.name}" (${sizeMb} MB) melebihi batas maksimal 12 MB.`,
    };
  }
  return { valid: true };
}

/**
 * Deletes an uploaded image from Firebase Cloud Storage when a photo or product is removed.
 * Silently ignores non-Storage URLs (e.g. static assets or persistent data URLs).
 */
export async function deleteStorageUrl(url: string): Promise<void> {
  if (!url || typeof url !== 'string') return;
  if (!url.includes('firebasestorage.googleapis.com')) return;
  try {
    const fileRef = ref(storage, url);
    await deleteObject(fileRef);
  } catch {
    // Ignore if already deleted or permission restricted
  }
}

export async function deleteStorageUrls(urls: string[]): Promise<void> {
  await Promise.all(urls.map((u) => deleteStorageUrl(u)));
}

/**
 * Optimizes an image file using HTML5 Canvas (preserving crisp wedding photo details in WebP)
 * and uploads it to persistent cloud storage:
 *  1) Firebase Cloud Storage (`products/...`), returning a permanent public download URL.
 *  2) If Firebase Storage bucket is unavailable, encodes a high-clarity WebP persistent payload
 *     that is stored in Firestore `product_images/{image_id}` (never on Vercel's ephemeral filesystem!).
 *  3) If optimization/upload fails, throws a clear error ("Foto belum berhasil diupload. Silakan coba lagi.").
 */
export async function compressImageFile(
  file: File,
  maxWidth = 1080,
  quality = 0.78,
  folder = 'products',
  onProgress?: (percent: number, statusText: string) => void
): Promise<string> {
  const validation = validateImageFile(file);
  if (!validation.valid) {
    throw new Error(validation.error || 'Foto belum berhasil diupload. Silakan coba lagi.');
  }

  onProgress?.(15, 'Mengoptimalkan resolusi & kualitas foto wedding...');

  const { blob, dataUrl } = await new Promise<{ blob: Blob; dataUrl: string }>(
    (resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () =>
        reject(new Error('Foto belum berhasil diupload. Silakan coba lagi.'));
      reader.onload = (event) => {
        const img = new Image();
        img.onerror = () =>
          reject(new Error('Foto belum berhasil diupload. Silakan coba lagi.'));
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Foto belum berhasil diupload. Silakan coba lagi.'));
            return;
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          // Produce a crisp WebP image suitable for both Cloud Storage and Firestore `product_images`
          let compressedDataUrl = canvas.toDataURL('image/webp', quality);
          if (compressedDataUrl.length > 135_000) {
            const tighterWidth = Math.min(width, 840);
            const tighterHeight = Math.round((img.height * tighterWidth) / img.width);
            canvas.width = tighterWidth;
            canvas.height = tighterHeight;
            const ctx2 = canvas.getContext('2d');
            if (ctx2) {
              ctx2.imageSmoothingEnabled = true;
              ctx2.imageSmoothingQuality = 'high';
              ctx2.drawImage(img, 0, 0, tighterWidth, tighterHeight);
              compressedDataUrl = canvas.toDataURL('image/webp', 0.72);
            }
          }
          if (compressedDataUrl.length > 135_000) {
            const compactWidth = Math.min(width, 680);
            const compactHeight = Math.round((img.height * compactWidth) / img.width);
            canvas.width = compactWidth;
            canvas.height = compactHeight;
            const ctx3 = canvas.getContext('2d');
            if (ctx3) {
              ctx3.imageSmoothingEnabled = true;
              ctx3.imageSmoothingQuality = 'high';
              ctx3.drawImage(img, 0, 0, compactWidth, compactHeight);
              compressedDataUrl = canvas.toDataURL('image/webp', 0.66);
            }
          }

          canvas.toBlob(
            (b) => {
              if (b) {
                resolve({ blob: b, dataUrl: compressedDataUrl });
              } else {
                reject(new Error('Foto belum berhasil diupload. Silakan coba lagi.'));
              }
            },
            'image/webp',
            quality
          );
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  );

  onProgress?.(55, 'Menyimpan foto ke Persistent Cloud Storage...');

  const safeName = file.name
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 40);
  const storagePath = `${folder}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 7)}-${safeName || 'wedding'}.webp`;

  // Tier 1: Try Firebase Cloud Storage (with fast 4s timeout so UI never hangs if bucket is unprovisioned)
  try {
    const storageRef = ref(storage, storagePath);
    const uploadTask = uploadBytes(storageRef, blob, {
      contentType: 'image/webp',
      cacheControl: 'public, max-age=31536000, immutable',
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Firebase Storage timeout')), 4000)
    );

    const snapshot = await Promise.race([uploadTask, timeoutPromise]);
    onProgress?.(88, 'Mengambil URL publik Cloud Storage...');
    const downloadUrl = await getDownloadURL(snapshot.ref);
    if (downloadUrl && isValidPersistentImageUrl(downloadUrl)) {
      onProgress?.(100, 'Foto berhasil disimpan di Cloud Storage!');
      return downloadUrl;
    }
  } catch {
    // Proceed to Tier 2 persistent cloud database image storage (never local filesystem!)
  }

  // Tier 2: Verify optimized WebP payload for persistent Firestore `product_images` storage
  if (!dataUrl || !dataUrl.startsWith('data:image/')) {
    throw new Error('Foto belum berhasil diupload. Silakan coba lagi.');
  }

  onProgress?.(100, 'Foto siap disimpan ke Persistent Cloud Database!');
  return dataUrl;
}

/**
 * Returns the primary image of a product (or first image by sort_order if none marked primary),
 * always normalizing the URL so it works on both localhost and Vercel production.
 */
export function getPrimaryImage(images?: ProductImage[]): ProductImage {
  if (!images || !Array.isArray(images) || images.length === 0) {
    return {
      id: 'fallback',
      image_id: 'fallback',
      url: DEFAULT_WEDDING_FALLBACK_IMAGE,
      image_url: DEFAULT_WEDDING_FALLBACK_IMAGE,
      isPrimary: true,
      is_primary: true,
      sort_order: 0,
      caption: 'ISTAFA Wedding Collection',
    };
  }

  const sorted = [...images].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
  );
  const chosen =
    sorted.find((img) => Boolean(img.isPrimary || img.is_primary)) || sorted[0];
  const normalizedUrl = normalizeWeddingImageUrl(chosen.image_url || chosen.url);

  return {
    ...chosen,
    id: chosen.id || chosen.image_id || 'img-primary',
    image_id: chosen.image_id || chosen.id || 'img-primary',
    url: normalizedUrl,
    image_url: normalizedUrl,
    isPrimary: true,
    is_primary: true,
  };
}

/**
 * Computes a SHA-256 hex digest using Web Crypto API (never stores plaintext passwords or tokens).
 */
export async function hashPasswordHex(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

const PBKDF2_AUTH_SALT = 'istafa-wedding-auth-v2-salt-9f8e7d6c';
const DEFAULT_ADMIN_USER_PBKDF2 =
  'a5f62f81a193989765dd3066272ce568f71c1b57dc87e2a7091e23115009867a';
const DEFAULT_ADMIN_PASS_PBKDF2 =
  '1cdc64309426d70851430d497dfe43fb0d8f7b6c6229f08f57d00e949e0863ad';

export async function derivePbkdf2Hex(
  secret: string,
  saltSuffix: string
): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: enc.encode(`${PBKDF2_AUTH_SALT}:${saltSuffix}`),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );
  return Array.from(new Uint8Array(derivedBits))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Verifies admin username & password against 100,000-iteration PBKDF2-SHA256 digests
 * without ever exposing plaintext credentials in frontend code or storage.
 */
export async function verifyAdminCredentialsPBKDF2(
  usernameInput: string,
  passwordInput: string,
  customUserDigest?: string,
  customPassDigest?: string
): Promise<boolean> {
  const cleanUser = usernameInput.trim();
  const cleanPass = passwordInput;
  if (!cleanUser || !cleanPass) return false;

  const [uDigest, pDigest] = await Promise.all([
    derivePbkdf2Hex(cleanUser, 'user'),
    derivePbkdf2Hex(cleanPass, 'pass'),
  ]);

  const targetUserDigest = customUserDigest || DEFAULT_ADMIN_USER_PBKDF2;
  const targetPassDigest = customPassDigest || DEFAULT_ADMIN_PASS_PBKDF2;

  return uDigest === targetUserDigest && pDigest === targetPassDigest;
}

/**
 * Formats number into Indonesian Rupiah (e.g., Rp 18.500.000)
 */
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Generates a direct WhatsApp click-to-chat URL with pre-filled Indonesian message
 */
export function buildWhatsAppUrl(phoneNumber: string, message: string): string {
  const cleanPhone = (phoneNumber || '6282123376933').replace(/\D/g, '');
  const normalizedPhone = cleanPhone.startsWith('0')
    ? `62${cleanPhone.slice(1)}`
    : cleanPhone;
  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Builds consultation message for a single product
 */
export function buildProductWhatsAppMessage(
  product: Product,
  selectedVariant?: string,
  selectedSize?: string,
  customNote?: string
): string {
  const variantLine = selectedVariant ? `\n- Pilihan Varian: ${selectedVariant}` : '';
  const sizeLine = selectedSize ? `\n- Ukuran / Kapasitas: ${selectedSize}` : '';
  const noteLine = customNote?.trim() ? `\n- Catatan Acara: ${customNote.trim()}` : '';

  return `Halo Admin ISTAFA Wedding, saya tertarik untuk berkonsultasi mengenai produk pernikahan berikut:\n\n*${product.name}*\n- Kategori: ${product.category}\n- Estimasi Harga: ${formatRupiah(product.price)} (${product.priceLabel || 'Paket'})${variantLine}${sizeLine}${noteLine}\n\nMohon informasi ketersediaan tanggal dan detail paketnya. Terima kasih!`;
}

/**
 * Builds consultation message for a Wedding Package
 */
export function buildPackageWhatsAppMessage(pkg: {
  name: string;
  tier: string;
  price: number;
  guestCapacity: string;
}): string {
  return `Halo Admin ISTAFA Wedding, saya ingin berkonsultasi mengenai *${pkg.name}* (${pkg.tier}):\n\n- Estimasi Paket: ${formatRupiah(pkg.price)}\n- Kapasitas Tamu: ${pkg.guestCapacity}\n\nMohon informasi jadwal yang tersedia dan rincian lengkap paket ini. Terima kasih!`;
}

/**
 * Builds consultation message for multiple wishlist products
 */
export function buildWishlistWhatsAppMessage(
  products: Product[],
  customNote?: string
): string {
  if (products.length === 0) {
    return 'Halo Admin ISTAFA Wedding, saya ingin berkonsultasi mengenai paket dan dekorasi pernikahan.';
  }

  const listText = products
    .map(
      (p, idx) =>
        `${idx + 1}. *${p.name}* (${p.category}) — ${formatRupiah(p.price)}`
    )
    .join('\n');

  const totalEstimate = products.reduce((sum, p) => sum + p.price, 0);
  const notePart = customNote?.trim()
    ? `\n\n*Catatan Tambahan:*\n${customNote.trim()}`
    : '';

  return `Halo Admin ISTAFA Wedding, saya telah memilih beberapa produk favorit di *Wedding Wishlist* dan ingin berkonsultasi lebih lanjut:\n\n${listText}\n\n*Total Estimasi Awal:* ${formatRupiah(
    totalEstimate
  )}${notePart}\n\nMohon bantuannya untuk informasi ketersediaan jadwal dan penyesuaian paket. Terima kasih!`;
}

export function buildPromoWhatsAppMessage(promo: Promo): string {
  return `Halo Admin ISTAFA Wedding, saya ingin mengklaim promo spesial berikut:\n\n*${promo.title}*\n- Harga Promo: ${formatRupiah(promo.promoPrice)} (Normal: ${formatRupiah(promo.normalPrice)})\n- Berlaku s/d: ${promo.endDate}\n\nMohon informasi syarat dan ketersediaan tanggal acara saya. Terima kasih!`;
}

/**
 * Builds consultation message for Wedding Cart / Consultation List
 */
export function buildCartWhatsAppMessage(
  items: ConsultationCartItem[],
  weddingDate?: string,
  guestCount?: number,
  customNote?: string,
  coupleName?: string,
  weddingLocation?: string
): string {
  if (items.length === 0) {
    return 'Halo ISTAFA Wedding.\n\nSaya ingin berkonsultasi mengenai rencana pernikahan saya.';
  }

  const lines = items
    .map((item) => {
      const subtotal = item.product.price * item.quantity;
      const details = [item.selectedVariant, item.selectedSize]
        .filter(Boolean)
        .join(', ');
      return `- ${item.product.name} (${item.quantity} ${
        item.product.unit || 'Paket'
      }${details ? ` - ${details}` : ''}) = ${formatRupiah(subtotal)}`;
    })
    .join('\n');

  const total = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  const namePart = coupleName?.trim() || 'Calon Pengantin';
  const datePart = weddingDate?.trim() || 'Menyesuaikan / Belum ditentukan';
  const locPart = weddingLocation?.trim() || 'Menyesuaikan lokasi acara';
  const guestPart = guestCount && guestCount > 0 ? `${guestCount} Tamu` : '-';
  const notePart = customNote?.trim() ? `\n\nCatatan: ${customNote.trim()}` : '';

  return `Halo ISTAFA Wedding.\n\nSaya ingin berkonsultasi mengenai rencana pernikahan saya.\n\nNama: ${namePart}\nTanggal: ${datePart}\nLokasi: ${locPart}\nJumlah tamu: ${guestPart}\n\nProduk/Layanan:\n${lines}\n\nEstimasi Budget:\n${formatRupiah(
    total
  )}${notePart}\n\nMohon informasi mengenai ketersediaan dan detail layanan.`;
}

/**
 * Builds consultation message for the Wedding Budget Calculator
 */
export function buildBudgetWhatsAppMessage(
  allocation: BudgetAllocation,
  totalBudget: number,
  selectedItemNames?: string[],
  coupleName?: string,
  weddingDate?: string,
  weddingLocation?: string
): string {
  const breakdown: string[] = [];
  if (allocation.catering > 0)
    breakdown.push(`- Catering: ${formatRupiah(allocation.catering)}`);
  if (allocation.dekorasi > 0)
    breakdown.push(`- Dekorasi Pernikahan: ${formatRupiah(allocation.dekorasi)}`);
  if (allocation.tenda > 0)
    breakdown.push(`- Tenda & Flooring: ${formatRupiah(allocation.tenda)}`);
  if (allocation.undangan > 0)
    breakdown.push(`- Undangan: ${formatRupiah(allocation.undangan)}`);
  if (allocation.souvenir > 0)
    breakdown.push(`- Souvenir: ${formatRupiah(allocation.souvenir)}`);
  if (allocation.dokumentasi > 0)
    breakdown.push(`- Dokumentasi Foto/Video: ${formatRupiah(allocation.dokumentasi)}`);
  if (allocation.makeup > 0)
    breakdown.push(`- MUA (Make Up Artist): ${formatRupiah(allocation.makeup)}`);
  if (allocation.wo > 0)
    breakdown.push(`- WO (Wedding Organizer): ${formatRupiah(allocation.wo)}`);
  if (allocation.sanggar > 0)
    breakdown.push(`- Tim Sanggar (Pertunjukan): ${formatRupiah(allocation.sanggar)}`);
  if (allocation.attire > 0)
    breakdown.push(`- Tim Attire (Pendampingan Pakaian): ${formatRupiah(allocation.attire)}`);
  if ((allocation.entertainment || 0) > 0)
    breakdown.push(`- Entertainment (Musik & Sound): ${formatRupiah(allocation.entertainment || 0)}`);
  if ((allocation.mc || 0) > 0)
    breakdown.push(`- MC (Master of Ceremony): ${formatRupiah(allocation.mc || 0)}`);
  if ((allocation.parkir || 0) > 0)
    breakdown.push(`- Parkir & Security Venue: ${formatRupiah(allocation.parkir || 0)}`);
  if (allocation.busana > 0)
    breakdown.push(`- Busana Pengantin: ${formatRupiah(allocation.busana)}`);
  if (allocation.mahar > 0)
    breakdown.push(`- Mahar / Tempat Mahar: ${formatRupiah(allocation.mahar)}`);
  if (allocation.seserahan > 0)
    breakdown.push(`- Seserahan: ${formatRupiah(allocation.seserahan)}`);
  if (allocation.lainnya > 0)
    breakdown.push(`- Kebutuhan Lainnya: ${formatRupiah(allocation.lainnya)}`);

  const itemsPart =
    selectedItemNames && selectedItemNames.length > 0
      ? `\n\nProduk Katalog Terkait:\n${selectedItemNames
          .map((n) => `- ${n}`)
          .join('\n')}`
      : '';

  const notePart = allocation.notes?.trim()
    ? `\n\nCatatan: ${allocation.notes.trim()}`
    : '';

  return `Halo ISTAFA Wedding.\n\nSaya ingin berkonsultasi mengenai rencana pernikahan saya.\n\nNama: ${
    coupleName?.trim() || 'Calon Pengantin'
  }\nTanggal: ${weddingDate?.trim() || 'Menyesuaikan'}\nLokasi: ${
    weddingLocation?.trim() || 'Menyesuaikan lokasi'
  }\nJumlah tamu: ${allocation.guestCount} Tamu\n\nProduk/Layanan:\n${breakdown.join(
    '\n'
  )}${itemsPart}\n\nEstimasi Budget:\n${formatRupiah(
    totalBudget
  )}${notePart}\n\nMohon informasi mengenai ketersediaan dan detail layanan.`;
}
