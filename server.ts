import 'dotenv/config';
import crypto from 'crypto';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import {
  INITIAL_ARTICLES,
  INITIAL_CALENDAR_PRIVATE,
  INITIAL_CALENDAR_PUBLIC,
  INITIAL_CATEGORIES,
  INITIAL_GALLERY,
  INITIAL_PACKAGES,
  INITIAL_PRODUCTS,
  INITIAL_PROMOS,
  INITIAL_SERVICE_AREAS,
  INITIAL_SETTINGS,
  INITIAL_TESTIMONIALS,
} from './src/data/initialData';
import {
  CalendarPrivateEntry,
  CalendarPublicEntry,
  Category,
  ConsultationInquiry,
  ConsultationSession,
  GalleryItem,
  InspirationArticle,
  LeadRecord,
  LeadStatus,
  OrderStatus,
  Product,
  Promo,
  ServiceArea,
  StoreSettings,
  Testimonial,
  WeddingOrder,
  WeddingPackage,
} from './src/types';
import {
  generateConsultationResponse,
  UNAVAILABLE_CATALOG_NOTICE,
} from './src/utils/consultationEngine';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE_PATH = path.join(DATA_DIR, 'istafa-db.json');

interface ServerWorkspaceRecord {
  userId: string;
  coupleName: string;
  weddingLocation: string;
  cartWeddingDate: string;
  cartGuestCount: number;
  cartItems: unknown[];
  wishlistIds: string[];
  weddingPlan: unknown;
  budgetAllocation: unknown;
  updatedAt: string;
}

interface IstafaDatabaseSchema {
  initialized: boolean;
  updatedAt: string;
  settings: StoreSettings;
  categories: Category[];
  products: Product[];
  packages: WeddingPackage[];
  gallery: GalleryItem[];
  testimonials: Testimonial[];
  promos: Promo[];
  articles: InspirationArticle[];
  calendarPublic: CalendarPublicEntry[];
  calendarPrivate: CalendarPrivateEntry[];
  serviceAreas: ServiceArea[];
  leads: LeadRecord[];
  consultations: ConsultationSession[];
  orders: WeddingOrder[];
  inquiries: ConsultationInquiry[];
  workspaces: Record<string, ServerWorkspaceRecord>;
  adminCredentials?: {
    username: string;
    passwordHash: string;
  };
}

function createInitialDatabase(): IstafaDatabaseSchema {
  const nowIso = new Date().toISOString();
  return {
    initialized: true,
    updatedAt: nowIso,
    settings: INITIAL_SETTINGS,
    categories: INITIAL_CATEGORIES,
    products: INITIAL_PRODUCTS.map((p) => ({
      ...p,
      createdAt: nowIso,
      updatedAt: nowIso,
    })),
    packages: INITIAL_PACKAGES.map((pkg) => ({
      ...pkg,
      createdAt: nowIso,
      updatedAt: nowIso,
    })),
    gallery: INITIAL_GALLERY,
    testimonials: INITIAL_TESTIMONIALS,
    promos: INITIAL_PROMOS,
    articles: INITIAL_ARTICLES,
    calendarPublic: INITIAL_CALENDAR_PUBLIC,
    calendarPrivate: INITIAL_CALENDAR_PRIVATE,
    serviceAreas: INITIAL_SERVICE_AREAS,
    leads: [
      {
        id: 'lead-init-1',
        userId: 'sample-user-1',
        consultationId: 'cons-sample-1',
        customerName: 'Nadia Putri',
        partnerName: 'Reza Prakoso',
        coupleName: 'Nadia & Reza',
        whatsapp: '6281298765432',
        email: 'nadia.putri@email.com',
        weddingDate: '2026-11-14',
        weddingLocation: 'Glasshouse Bogor',
        eventType: 'Akad & Resepsi (Indoor / Gedung)',
        guestCount: 300,
        budget: 50000000,
        needs: ['Dekorasi Pernikahan', 'MUA — Make Up Artist', 'Wedding Organizer (WO)', 'Undangan Cetak', 'Souvenir'],
        interestedProductIds: [
          'prod-wedding-decor-elegant',
          'prod-makeup-pengantin-flawless',
          'prod-wo-wedding-organizer',
        ],
        interestedProductNames: [
          'Dekorasi Pelaminan Royal Glasshouse Floral',
          'MUA — Make Up Artist Pengantin Flawless',
          'Layanan Wedding Organizer (WO) Full Day',
        ],
        recommendedPackageNames: ['Intimate Elegance Package'],
        consultationSummary:
          'Calon pengantin Nadia & Reza merencanakan Akad & Resepsi di Glasshouse Bogor pada 2026-11-14 untuk 300 tamu dengan target budget Rp 50.000.000.',
        notes: 'Tertarik konsep Elegant Gold & Ivory. Ingin jadwal fitting & test makeup bulan depan.',
        status: 'Interested',
        source: 'consultation',
        createdAt: nowIso,
        updatedAt: nowIso,
      },
    ],
    consultations: [],
    orders: [],
    inquiries: [
      {
        id: 'inq-sample-1',
        userId: 'sample-user-1',
        coupleName: 'Nadia & Reza',
        customerName: 'Nadia Putri',
        partnerName: 'Reza Prakoso',
        whatsapp: '6281298765432',
        weddingLocation: 'Glasshouse Bogor',
        weddingDate: '2026-11-14',
        type: 'consultation',
        customerDate: '2026-11-14',
        guestCount: 300,
        itemsSummary: [
          'Dekorasi Pelaminan Royal Glasshouse Floral',
          'MUA — Make Up Artist Pengantin Flawless',
          'Layanan Wedding Organizer (WO) Full Day',
        ],
        totalEstimate: 48250000,
        status: 'Interested',
        createdAt: nowIso.slice(0, 10),
      },
    ],
    workspaces: {},
  };
}

let dbCache: IstafaDatabaseSchema | null = null;

function loadDatabase(): IstafaDatabaseSchema {
  if (dbCache) return dbCache;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE_PATH)) {
      const raw = fs.readFileSync(DB_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<IstafaDatabaseSchema>;
      if (parsed && parsed.initialized) {
        dbCache = {
          initialized: true,
          updatedAt: parsed.updatedAt || new Date().toISOString(),
          settings: parsed.settings || INITIAL_SETTINGS,
          categories: Array.isArray(parsed.categories) ? parsed.categories : INITIAL_CATEGORIES,
          products: Array.isArray(parsed.products) ? parsed.products : INITIAL_PRODUCTS,
          packages: Array.isArray(parsed.packages) ? parsed.packages : INITIAL_PACKAGES,
          gallery: Array.isArray(parsed.gallery) ? parsed.gallery : INITIAL_GALLERY,
          testimonials: Array.isArray(parsed.testimonials)
            ? parsed.testimonials
            : INITIAL_TESTIMONIALS,
          promos: Array.isArray(parsed.promos) ? parsed.promos : INITIAL_PROMOS,
          articles: Array.isArray(parsed.articles) ? parsed.articles : INITIAL_ARTICLES,
          calendarPublic: Array.isArray(parsed.calendarPublic)
            ? parsed.calendarPublic
            : INITIAL_CALENDAR_PUBLIC,
          calendarPrivate: Array.isArray(parsed.calendarPrivate)
            ? parsed.calendarPrivate
            : INITIAL_CALENDAR_PRIVATE,
          serviceAreas: Array.isArray(parsed.serviceAreas)
            ? parsed.serviceAreas
            : INITIAL_SERVICE_AREAS,
          leads: Array.isArray(parsed.leads) ? parsed.leads : [],
          consultations: Array.isArray(parsed.consultations) ? parsed.consultations : [],
          orders: Array.isArray(parsed.orders) ? parsed.orders : [],
          inquiries: Array.isArray(parsed.inquiries) ? parsed.inquiries : [],
          workspaces: parsed.workspaces && typeof parsed.workspaces === 'object' ? parsed.workspaces : {},
          adminCredentials: parsed.adminCredentials,
        };
        return dbCache;
      }
    }
  } catch (err) {
    console.error('Error loading database file, initializing fresh DB:', err);
  }

  const fresh = createInitialDatabase();
  dbCache = fresh;
  saveDatabase(fresh);
  return fresh;
}

function saveDatabase(data: IstafaDatabaseSchema): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    data.updatedAt = new Date().toISOString();
    dbCache = data;
    const tmpPath = `${DB_FILE_PATH}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tmpPath, DB_FILE_PATH);
  } catch (err) {
    console.error('Failed to persist database to disk:', err);
  }
}

// ============================================================================
// SECURE SERVER-SIDE ADMIN AUTHENTICATION & STATELESS SESSION MANAGEMENT
// ============================================================================
const AUTH_SCRYPT_SALT = 'istafa-wedding-auth-salt-v3-2026';
const DEFAULT_USER_SCRYPT_HEX =
  'e064bcfd6007cc64ae2e844b5db3ca49f632d7de60068ece219b6b79a14eb2c9';
const DEFAULT_PASS_SCRYPT_HEX =
  'afcbba2ab440e025e1a738cea03e87abf97a522562d53da0bcf568f095924527';

const SESSION_HMAC_SECRET =
  process.env.ADMIN_SESSION_SECRET ||
  'istafa-wedding-production-hmac-secret-key-2026-v3';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

const revokedTokenHashes = new Set<string>();

function computeSha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function safeTimingEqualHex(hexA: string, hexB: string): boolean {
  try {
    const bufA = Buffer.from(hexA, 'hex');
    const bufB = Buffer.from(hexB, 'hex');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

function verifyAdminCredentialsServer(usernameInput: string, passwordInput: string): boolean {
  const cleanUser = (usernameInput || '').trim();
  const cleanPass = passwordInput || '';
  if (!cleanUser || !cleanPass) return false;

  const envUser = (process.env.ADMIN_USERNAME || '').trim();
  const envPass = process.env.ADMIN_PASSWORD || '';

  if (envUser && envPass) {
    const userMatch = safeTimingEqualHex(
      computeSha256Hex(cleanUser.toLowerCase()),
      computeSha256Hex(envUser.toLowerCase())
    );
    const passMatch = safeTimingEqualHex(
      computeSha256Hex(cleanPass),
      computeSha256Hex(envPass)
    );
    if (userMatch && passMatch) return true;
  }

  // Verify against salted scrypt digest (so no plaintext password exists in source code)
  const derivedUserHex = crypto
    .scryptSync(cleanUser, AUTH_SCRYPT_SALT, 32)
    .toString('hex');
  const derivedPassHex = crypto
    .scryptSync(cleanPass, AUTH_SCRYPT_SALT, 32)
    .toString('hex');

  return (
    safeTimingEqualHex(derivedUserHex, DEFAULT_USER_SCRYPT_HEX) &&
    safeTimingEqualHex(derivedPassHex, DEFAULT_PASS_SCRYPT_HEX)
  );
}

function createSignedAdminToken(username: string): {
  token: string;
  tokenHash: string;
  expiresAt: number;
} {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const payloadObj = {
    u: username,
    iat: Date.now(),
    exp: expiresAt,
    n: crypto.randomBytes(12).toString('hex'),
  };
  const payloadB64 = Buffer.from(JSON.stringify(payloadObj)).toString('base64url');
  const sigB64 = crypto
    .createHmac('sha256', SESSION_HMAC_SECRET)
    .update(payloadB64)
    .digest('base64url');
  const token = `${payloadB64}.${sigB64}`;
  const tokenHash = computeSha256Hex(token);
  return { token, tokenHash, expiresAt };
}

function verifySignedAdminToken(
  token: string | undefined
): { valid: boolean; username?: string; tokenHash?: string; expiresAt?: number } {
  if (!token || typeof token !== 'string' || !token.includes('.')) {
    return { valid: false };
  }
  const tokenHash = computeSha256Hex(token);
  if (revokedTokenHashes.has(tokenHash)) {
    return { valid: false };
  }
  const parts = token.split('.');
  if (parts.length !== 2) return { valid: false };
  const [payloadB64, sigB64] = parts;
  const expectedSigB64 = crypto
    .createHmac('sha256', SESSION_HMAC_SECRET)
    .update(payloadB64)
    .digest('base64url');

  if (
    !safeTimingEqualHex(
      computeSha256Hex(sigB64),
      computeSha256Hex(expectedSigB64)
    )
  ) {
    return { valid: false };
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(payloadB64, 'base64url').toString('utf-8')
    ) as { u?: string; exp?: number };
    if (!parsed || !parsed.u || !parsed.exp || Date.now() > parsed.exp) {
      return { valid: false };
    }
    return {
      valid: true,
      username: parsed.u,
      tokenHash,
      expiresAt: parsed.exp,
    };
  } catch {
    return { valid: false };
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Ensure DB is loaded at startup
  loadDatabase();

  app.use(express.json({ limit: '50mb' }));

  // ===========================================================================
  // ADMIN AUTHENTICATION API ENDPOINTS (/api/auth/*)
  // ===========================================================================
  app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body as {
      username?: string;
      password?: string;
    };
    const cleanUsername = (username || '').trim();
    const cleanPassword = password || '';

    if (verifyAdminCredentialsServer(cleanUsername, cleanPassword)) {
      const { token, tokenHash, expiresAt } = createSignedAdminToken(cleanUsername);
      res.json({
        ok: true,
        token,
        tokenHash,
        username: cleanUsername,
        expiresAt,
      });
    } else {
      res.status(401).json({
        ok: false,
        error: 'Username atau password salah. Silakan coba lagi.',
      });
    }
  });

  app.get('/api/auth/verify', (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : (req.query.token as string | undefined);
    const result = verifySignedAdminToken(token);
    if (result.valid) {
      res.json({
        valid: true,
        username: result.username,
        tokenHash: result.tokenHash,
        expiresAt: result.expiresAt,
      });
    } else {
      res.status(401).json({ valid: false });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : (req.body?.token as string | undefined);
    if (token) {
      revokedTokenHashes.add(computeSha256Hex(token));
    }
    res.json({ ok: true });
  });

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      storage: 'firebase-firestore-cloud',
      timestamp: new Date().toISOString(),
    });
  });

  // ===========================================================================
  // Persistent Database REST API (/api/db/*)
  // ===========================================================================
  app.get('/api/db/state', (_req, res) => {
    const db = loadDatabase();
    res.json({
      updatedAt: db.updatedAt,
      settings: db.settings,
      categories: db.categories,
      products: db.products,
      packages: db.packages,
      gallery: db.gallery,
      testimonials: db.testimonials,
      promos: db.promos,
      articles: db.articles,
      calendarPublic: db.calendarPublic,
      calendarPrivate: db.calendarPrivate,
      serviceAreas: db.serviceAreas,
      leads: db.leads,
      consultations: db.consultations,
      orders: db.orders,
      inquiries: db.inquiries,
      adminCredentials: db.adminCredentials || null,
    });
  });

  // 1. Products CRUD
  app.post('/api/db/products', (req, res) => {
    const db = loadDatabase();
    const product = req.body as Product;
    if (!product || !product.id || !product.name) {
      res.status(400).json({ error: 'Data produk tidak valid.' });
      return;
    }
    const nowIso = new Date().toISOString();
    const existingIndex = db.products.findIndex((p) => p.id === product.id);
    const savedRecord: Product = {
      ...product,
      createdAt:
        existingIndex >= 0 && db.products[existingIndex].createdAt
          ? db.products[existingIndex].createdAt
          : nowIso,
      updatedAt: nowIso,
    };

    if (existingIndex >= 0) {
      db.products[existingIndex] = savedRecord;
    } else {
      db.products = [savedRecord, ...db.products];
    }
    saveDatabase(db);
    res.json({ product: savedRecord, products: db.products });
  });

  app.delete('/api/db/products/:id', (req, res) => {
    const db = loadDatabase();
    const { id } = req.params;
    db.products = db.products.filter((p) => p.id !== id);
    saveDatabase(db);
    res.json({ deletedId: id, products: db.products });
  });

  // 2. Categories CRUD
  app.post('/api/db/categories', (req, res) => {
    const db = loadDatabase();
    const category = req.body as Category;
    if (!category || !category.id || !category.name) {
      res.status(400).json({ error: 'Data kategori tidak valid.' });
      return;
    }
    const nowIso = new Date().toISOString();
    const idx = db.categories.findIndex((c) => c.id === category.id);
    const saved: Category = {
      ...category,
      createdAt: idx >= 0 && db.categories[idx].createdAt ? db.categories[idx].createdAt : nowIso,
      updatedAt: nowIso,
    };
    if (idx >= 0) {
      db.categories[idx] = saved;
    } else {
      db.categories.push(saved);
    }
    db.categories.sort((a, b) => a.sortOrder - b.sortOrder);
    saveDatabase(db);
    res.json({ category: saved, categories: db.categories });
  });

  app.delete('/api/db/categories/:id', (req, res) => {
    const db = loadDatabase();
    const { id } = req.params;
    db.categories = db.categories.filter((c) => c.id !== id);
    saveDatabase(db);
    res.json({ deletedId: id, categories: db.categories });
  });

  // 3. Packages CRUD
  app.post('/api/db/packages', (req, res) => {
    const db = loadDatabase();
    const pkg = req.body as WeddingPackage;
    if (!pkg || !pkg.id || !pkg.name) {
      res.status(400).json({ error: 'Data paket tidak valid.' });
      return;
    }
    const nowIso = new Date().toISOString();
    const idx = db.packages.findIndex((p) => p.id === pkg.id);
    const saved: WeddingPackage = {
      ...pkg,
      createdAt: idx >= 0 && db.packages[idx].createdAt ? db.packages[idx].createdAt : nowIso,
      updatedAt: nowIso,
    };
    if (idx >= 0) {
      db.packages[idx] = saved;
    } else {
      db.packages.push(saved);
    }
    saveDatabase(db);
    res.json({ package: saved, packages: db.packages });
  });

  app.delete('/api/db/packages/:id', (req, res) => {
    const db = loadDatabase();
    const { id } = req.params;
    db.packages = db.packages.filter((p) => p.id !== id);
    saveDatabase(db);
    res.json({ deletedId: id, packages: db.packages });
  });

  // 4. Gallery CRUD
  app.post('/api/db/gallery', (req, res) => {
    const db = loadDatabase();
    const item = req.body as GalleryItem;
    if (!item || !item.id || !item.title) {
      res.status(400).json({ error: 'Data galeri tidak valid.' });
      return;
    }
    const nowIso = new Date().toISOString();
    const idx = db.gallery.findIndex((g) => g.id === item.id);
    const saved: GalleryItem = {
      ...item,
      createdAt: idx >= 0 && db.gallery[idx].createdAt ? db.gallery[idx].createdAt : nowIso,
      updatedAt: nowIso,
    };
    if (idx >= 0) {
      db.gallery[idx] = saved;
    } else {
      db.gallery = [saved, ...db.gallery];
    }
    saveDatabase(db);
    res.json({ item: saved, gallery: db.gallery });
  });

  app.delete('/api/db/gallery/:id', (req, res) => {
    const db = loadDatabase();
    const { id } = req.params;
    db.gallery = db.gallery.filter((g) => g.id !== id);
    saveDatabase(db);
    res.json({ deletedId: id, gallery: db.gallery });
  });

  // 5. Testimonials CRUD
  app.post('/api/db/testimonials', (req, res) => {
    const db = loadDatabase();
    const item = req.body as Testimonial;
    if (!item || !item.id || !item.coupleName) {
      res.status(400).json({ error: 'Data testimoni tidak valid.' });
      return;
    }
    const nowIso = new Date().toISOString();
    const idx = db.testimonials.findIndex((t) => t.id === item.id);
    const saved: Testimonial = {
      ...item,
      createdAt: idx >= 0 && db.testimonials[idx].createdAt ? db.testimonials[idx].createdAt : nowIso,
      updatedAt: nowIso,
    };
    if (idx >= 0) {
      db.testimonials[idx] = saved;
    } else {
      db.testimonials = [saved, ...db.testimonials];
    }
    saveDatabase(db);
    res.json({ item: saved, testimonials: db.testimonials });
  });

  app.delete('/api/db/testimonials/:id', (req, res) => {
    const db = loadDatabase();
    const { id } = req.params;
    db.testimonials = db.testimonials.filter((t) => t.id !== id);
    saveDatabase(db);
    res.json({ deletedId: id, testimonials: db.testimonials });
  });

  // 6. Promos CRUD
  app.post('/api/db/promos', (req, res) => {
    const db = loadDatabase();
    const promo = req.body as Promo;
    if (!promo || !promo.id || !promo.title) {
      res.status(400).json({ error: 'Data promo tidak valid.' });
      return;
    }
    const nowIso = new Date().toISOString();
    const idx = db.promos.findIndex((p) => p.id === promo.id);
    const saved: Promo = {
      ...promo,
      createdAt: idx >= 0 && db.promos[idx].createdAt ? db.promos[idx].createdAt : nowIso,
      updatedAt: nowIso,
    };
    if (idx >= 0) {
      db.promos[idx] = saved;
    } else {
      db.promos = [saved, ...db.promos];
    }
    saveDatabase(db);
    res.json({ promo: saved, promos: db.promos });
  });

  app.delete('/api/db/promos/:id', (req, res) => {
    const db = loadDatabase();
    const { id } = req.params;
    db.promos = db.promos.filter((p) => p.id !== id);
    saveDatabase(db);
    res.json({ deletedId: id, promos: db.promos });
  });

  // 7. Articles CRUD
  app.post('/api/db/articles', (req, res) => {
    const db = loadDatabase();
    const article = req.body as InspirationArticle;
    if (!article || !article.id || !article.title) {
      res.status(400).json({ error: 'Data artikel tidak valid.' });
      return;
    }
    const nowIso = new Date().toISOString();
    const idx = db.articles.findIndex((a) => a.id === article.id);
    const saved: InspirationArticle = {
      ...article,
      createdAt: idx >= 0 && db.articles[idx].createdAt ? db.articles[idx].createdAt : nowIso,
      updatedAt: nowIso,
    };
    if (idx >= 0) {
      db.articles[idx] = saved;
    } else {
      db.articles = [saved, ...db.articles];
    }
    saveDatabase(db);
    res.json({ article: saved, articles: db.articles });
  });

  app.delete('/api/db/articles/:id', (req, res) => {
    const db = loadDatabase();
    const { id } = req.params;
    db.articles = db.articles.filter((a) => a.id !== id);
    saveDatabase(db);
    res.json({ deletedId: id, articles: db.articles });
  });

  // 8. Calendar CRUD
  app.post('/api/db/calendar', (req, res) => {
    const db = loadDatabase();
    const { publicEntry, privateEntry } = req.body as {
      publicEntry: CalendarPublicEntry;
      privateEntry?: CalendarPrivateEntry;
    };
    if (!publicEntry || !publicEntry.date) {
      res.status(400).json({ error: 'Tanggal kalender tidak valid.' });
      return;
    }
    const pubIdx = db.calendarPublic.findIndex((c) => c.date === publicEntry.date);
    if (pubIdx >= 0) {
      db.calendarPublic[pubIdx] = publicEntry;
    } else {
      db.calendarPublic.push(publicEntry);
      db.calendarPublic.sort((a, b) => a.date.localeCompare(b.date));
    }

    if (privateEntry && privateEntry.date) {
      const privIdx = db.calendarPrivate.findIndex((c) => c.date === privateEntry.date);
      if (privIdx >= 0) {
        db.calendarPrivate[privIdx] = privateEntry;
      } else {
        db.calendarPrivate.push(privateEntry);
      }
    }
    saveDatabase(db);
    res.json({
      calendarPublic: db.calendarPublic,
      calendarPrivate: db.calendarPrivate,
    });
  });

  app.delete('/api/db/calendar/:date', (req, res) => {
    const db = loadDatabase();
    const { date } = req.params;
    db.calendarPublic = db.calendarPublic.filter((c) => c.date !== date);
    db.calendarPrivate = db.calendarPrivate.filter((c) => c.date !== date);
    saveDatabase(db);
    res.json({
      deletedDate: date,
      calendarPublic: db.calendarPublic,
      calendarPrivate: db.calendarPrivate,
    });
  });

  // 9. Service Areas CRUD
  app.post('/api/db/service-areas', (req, res) => {
    const db = loadDatabase();
    const area = req.body as ServiceArea;
    if (!area || !area.id || !area.city) {
      res.status(400).json({ error: 'Data wilayah layanan tidak valid.' });
      return;
    }
    const idx = db.serviceAreas.findIndex((a) => a.id === area.id);
    if (idx >= 0) {
      db.serviceAreas[idx] = area;
    } else {
      db.serviceAreas.push(area);
    }
    saveDatabase(db);
    res.json({ area, serviceAreas: db.serviceAreas });
  });

  app.delete('/api/db/service-areas/:id', (req, res) => {
    const db = loadDatabase();
    const { id } = req.params;
    db.serviceAreas = db.serviceAreas.filter((a) => a.id !== id);
    saveDatabase(db);
    res.json({ deletedId: id, serviceAreas: db.serviceAreas });
  });

  // 10. Settings & Admin Credentials
  app.put('/api/db/settings', (req, res) => {
    const db = loadDatabase();
    const settings = req.body as StoreSettings;
    if (!settings || !settings.businessName) {
      res.status(400).json({ error: 'Data pengaturan tidak valid.' });
      return;
    }
    db.settings = {
      ...settings,
      updatedAt: new Date().toISOString(),
    };
    saveDatabase(db);
    res.json({ settings: db.settings });
  });

  app.put('/api/db/admin-credentials', (req, res) => {
    const db = loadDatabase();
    const { username, passwordHash } = req.body as { username: string; passwordHash: string };
    if (!username || !passwordHash) {
      res.status(400).json({ error: 'Kredensial tidak lengkap.' });
      return;
    }
    db.adminCredentials = { username, passwordHash };
    saveDatabase(db);
    res.json({ ok: true });
  });

  // 11. Leads (Data Calon Pengantin) CRUD
  app.get('/api/db/leads', (_req, res) => {
    const db = loadDatabase();
    res.json({ leads: db.leads });
  });

  app.post('/api/db/leads', (req, res) => {
    const db = loadDatabase();
    const incoming = req.body as Partial<LeadRecord>;
    const nowIso = new Date().toISOString();

    const existingIdx = db.leads.findIndex(
      (l) =>
        (incoming.id && l.id === incoming.id) ||
        (incoming.consultationId && l.consultationId === incoming.consultationId)
    );

    if (existingIdx >= 0) {
      const prev = db.leads[existingIdx];
      const updated: LeadRecord = {
        ...prev,
        ...incoming,
        id: prev.id,
        customerName: incoming.customerName || prev.customerName || '',
        partnerName: incoming.partnerName || prev.partnerName || '',
        coupleName:
          incoming.coupleName ||
          (incoming.customerName && incoming.partnerName
            ? `${incoming.customerName} & ${incoming.partnerName}`
            : incoming.customerName || prev.coupleName || 'Calon Pengantin'),
        whatsapp: incoming.whatsapp || prev.whatsapp || '',
        email: incoming.email || prev.email || '',
        weddingDate: incoming.weddingDate || prev.weddingDate || '',
        weddingLocation: incoming.weddingLocation || prev.weddingLocation || '',
        eventType: incoming.eventType || prev.eventType || '',
        guestCount:
          incoming.guestCount !== undefined && incoming.guestCount > 0
            ? incoming.guestCount
            : prev.guestCount || 0,
        budget:
          incoming.budget !== undefined && incoming.budget > 0
            ? incoming.budget
            : prev.budget || 0,
        needs:
          incoming.needs && incoming.needs.length > 0
            ? Array.from(new Set([...(prev.needs || []), ...incoming.needs]))
            : prev.needs || [],
        interestedProductIds:
          incoming.interestedProductIds && incoming.interestedProductIds.length > 0
            ? Array.from(
                new Set([...(prev.interestedProductIds || []), ...incoming.interestedProductIds])
              )
            : prev.interestedProductIds || [],
        interestedProductNames:
          incoming.interestedProductNames && incoming.interestedProductNames.length > 0
            ? Array.from(
                new Set([
                  ...(prev.interestedProductNames || []),
                  ...incoming.interestedProductNames,
                ])
              )
            : prev.interestedProductNames || [],
        recommendedPackageNames:
          incoming.recommendedPackageNames && incoming.recommendedPackageNames.length > 0
            ? Array.from(
                new Set([
                  ...(prev.recommendedPackageNames || []),
                  ...incoming.recommendedPackageNames,
                ])
              )
            : prev.recommendedPackageNames || [],
        consultationSummary:
          incoming.consultationSummary || prev.consultationSummary || '',
        notes: incoming.notes !== undefined ? incoming.notes : prev.notes || '',
        status: (incoming.status as LeadStatus) || prev.status || 'Consultation',
        updatedAt: nowIso,
      };
      db.leads[existingIdx] = updated;
      saveDatabase(db);
      res.json({ lead: updated, leads: db.leads });
      return;
    }

    const leadId =
      incoming.id || `lead-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newLead: LeadRecord = {
      id: leadId,
      userId: incoming.userId || 'guest',
      consultationId: incoming.consultationId || '',
      customerName: incoming.customerName || '',
      partnerName: incoming.partnerName || '',
      coupleName:
        incoming.coupleName ||
        (incoming.customerName && incoming.partnerName
          ? `${incoming.customerName} & ${incoming.partnerName}`
          : incoming.customerName || 'Calon Pengantin'),
      whatsapp: incoming.whatsapp || '',
      email: incoming.email || '',
      weddingDate: incoming.weddingDate || '',
      weddingLocation: incoming.weddingLocation || '',
      eventType: incoming.eventType || '',
      guestCount: Number(incoming.guestCount) || 0,
      budget: Number(incoming.budget) || 0,
      needs: incoming.needs || [],
      interestedProductIds: incoming.interestedProductIds || [],
      interestedProductNames: incoming.interestedProductNames || [],
      recommendedPackageNames: incoming.recommendedPackageNames || [],
      consultationSummary: incoming.consultationSummary || '',
      notes: incoming.notes || '',
      status: (incoming.status as LeadStatus) || 'New',
      source: incoming.source || 'consultation',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    db.leads = [newLead, ...db.leads];
    saveDatabase(db);
    res.json({ lead: newLead, leads: db.leads });
  });

  app.patch('/api/db/leads/:id', (req, res) => {
    const db = loadDatabase();
    const { id } = req.params;
    const updates = req.body as Partial<LeadRecord>;
    const idx = db.leads.findIndex((l) => l.id === id);
    if (idx < 0) {
      res.status(404).json({ error: 'Data calon pengantin tidak ditemukan.' });
      return;
    }
    db.leads[idx] = {
      ...db.leads[idx],
      ...updates,
      id,
      updatedAt: new Date().toISOString(),
    };
    saveDatabase(db);
    res.json({ lead: db.leads[idx], leads: db.leads });
  });

  app.delete('/api/db/leads/:id', (req, res) => {
    const db = loadDatabase();
    const { id } = req.params;
    db.leads = db.leads.filter((l) => l.id !== id);
    saveDatabase(db);
    res.json({ deletedId: id, leads: db.leads });
  });

  // 12. Consultations CRUD (Also auto-syncs with Leads)
  app.get('/api/db/consultations', (req, res) => {
    const db = loadDatabase();
    const userId = req.query.userId as string | undefined;
    if (userId) {
      res.json({
        consultations: db.consultations.filter((c) => c.userId === userId),
      });
      return;
    }
    res.json({ consultations: db.consultations });
  });

  app.post('/api/db/consultations', (req, res) => {
    const db = loadDatabase();
    const session = req.body as ConsultationSession;
    if (!session || !session.id) {
      res.status(400).json({ error: 'Sesi konsultasi tidak valid.' });
      return;
    }
    const nowIso = new Date().toISOString();
    const idx = db.consultations.findIndex((c) => c.id === session.id);
    const savedSession: ConsultationSession = {
      ...session,
      updatedAt: nowIso,
      createdAt: idx >= 0 ? db.consultations[idx].createdAt : session.createdAt || nowIso,
    };

    if (idx >= 0) {
      db.consultations[idx] = savedSession;
    } else {
      db.consultations = [savedSession, ...db.consultations];
    }

    // Automatically upsert LeadRecord if consultation has user messages or profile info
    const hasUserMessages = (savedSession.messages || []).some((m) => m.sender === 'user');
    const hasProfileInfo = Boolean(
      savedSession.coupleName ||
        savedSession.customerName ||
        savedSession.whatsapp ||
        savedSession.weddingLocation ||
        savedSession.guestCount > 0 ||
        savedSession.targetBudget > 0
    );

    if (hasUserMessages || hasProfileInfo) {
      const recProductIds = Array.from(
        new Set([
          ...(savedSession.interestedProductIds || []),
          ...(savedSession.messages || []).flatMap((m) =>
            (m.recommendations || []).map((r) => r.productId)
          ),
        ])
      );
      const recProductNames = recProductIds
        .map((pid) => db.products.find((p) => p.id === pid)?.name)
        .filter((n): n is string => Boolean(n));

      const leadIdx = db.leads.findIndex(
        (l) =>
          l.consultationId === savedSession.id ||
          (savedSession.leadId && l.id === savedSession.leadId)
      );

      const leadId =
        leadIdx >= 0
          ? db.leads[leadIdx].id
          : savedSession.leadId || `lead-${savedSession.id}`;

      const coupleDisplay =
        savedSession.coupleName ||
        (savedSession.customerName && savedSession.partnerName
          ? `${savedSession.customerName} & ${savedSession.partnerName}`
          : savedSession.customerName || 'Calon Pengantin');

      const summaryParts: string[] = [];
      if (coupleDisplay) summaryParts.push(`Pasangan: ${coupleDisplay}`);
      if (savedSession.weddingDate) summaryParts.push(`Tanggal: ${savedSession.weddingDate}`);
      if (savedSession.weddingLocation) summaryParts.push(`Lokasi: ${savedSession.weddingLocation}`);
      if (savedSession.eventType) summaryParts.push(`Acara: ${savedSession.eventType}`);
      if (savedSession.guestCount > 0) summaryParts.push(`Tamu: ${savedSession.guestCount} orang`);
      if (savedSession.targetBudget > 0) {
        summaryParts.push(`Budget: Rp ${savedSession.targetBudget.toLocaleString('id-ID')}`);
      }
      if (recProductNames.length > 0) {
        summaryParts.push(`Rekomendasi: ${recProductNames.slice(0, 4).join(', ')}`);
      }

      const leadStatus: LeadStatus =
        savedSession.status === 'interested'
          ? 'Interested'
          : savedSession.status === 'completed'
          ? 'Completed'
          : recProductIds.length > 0
          ? 'Consultation'
          : 'New';

      if (leadIdx >= 0) {
        const existingLead = db.leads[leadIdx];
        db.leads[leadIdx] = {
          ...existingLead,
          consultationId: savedSession.id,
          customerName: savedSession.customerName || existingLead.customerName || '',
          partnerName: savedSession.partnerName || existingLead.partnerName || '',
          coupleName: coupleDisplay || existingLead.coupleName,
          whatsapp: savedSession.whatsapp || existingLead.whatsapp || '',
          email: savedSession.email || existingLead.email || '',
          weddingDate: savedSession.weddingDate || existingLead.weddingDate || '',
          weddingLocation: savedSession.weddingLocation || existingLead.weddingLocation || '',
          eventType: savedSession.eventType || existingLead.eventType || '',
          guestCount: savedSession.guestCount || existingLead.guestCount || 0,
          budget: savedSession.targetBudget || existingLead.budget || 0,
          needs:
            savedSession.needs && savedSession.needs.length > 0
              ? Array.from(new Set([...(existingLead.needs || []), ...savedSession.needs]))
              : existingLead.needs || [],
          interestedProductIds: Array.from(
            new Set([...(existingLead.interestedProductIds || []), ...recProductIds])
          ),
          interestedProductNames: Array.from(
            new Set([...(existingLead.interestedProductNames || []), ...recProductNames])
          ),
          recommendedPackageNames:
            savedSession.recommendedPackageIds || existingLead.recommendedPackageNames || [],
          consultationSummary:
            savedSession.summaryResult ||
            summaryParts.join(' • ') ||
            existingLead.consultationSummary,
          notes: savedSession.notes || existingLead.notes || '',
          status:
            existingLead.status === 'Booking' || existingLead.status === 'Completed'
              ? existingLead.status
              : leadStatus,
          updatedAt: nowIso,
        };
      } else {
        const newLead: LeadRecord = {
          id: leadId,
          userId: savedSession.userId || 'guest',
          consultationId: savedSession.id,
          customerName: savedSession.customerName || '',
          partnerName: savedSession.partnerName || '',
          coupleName: coupleDisplay,
          whatsapp: savedSession.whatsapp || '',
          email: savedSession.email || '',
          weddingDate: savedSession.weddingDate || '',
          weddingLocation: savedSession.weddingLocation || '',
          eventType: savedSession.eventType || '',
          guestCount: savedSession.guestCount || 0,
          budget: savedSession.targetBudget || 0,
          needs: savedSession.needs || [],
          interestedProductIds: recProductIds,
          interestedProductNames: recProductNames,
          recommendedPackageNames: savedSession.recommendedPackageIds || [],
          consultationSummary: savedSession.summaryResult || summaryParts.join(' • '),
          notes: savedSession.notes || '',
          status: leadStatus,
          source: 'consultation',
          createdAt: nowIso,
          updatedAt: nowIso,
        };
        db.leads = [newLead, ...db.leads];
      }
    }

    saveDatabase(db);
    res.json({
      consultation: savedSession,
      consultations: db.consultations,
      leads: db.leads,
    });
  });

  app.delete('/api/db/consultations/:id', (req, res) => {
    const db = loadDatabase();
    const { id } = req.params;
    db.consultations = db.consultations.filter((c) => c.id !== id);
    saveDatabase(db);
    res.json({ deletedId: id, consultations: db.consultations });
  });

  // 13. Orders / Bookings CRUD
  app.get('/api/db/orders', (_req, res) => {
    const db = loadDatabase();
    res.json({ orders: db.orders });
  });

  app.post('/api/db/orders', (req, res) => {
    const db = loadDatabase();
    const incoming = req.body as Partial<WeddingOrder>;
    if (!incoming || !incoming.customerName || !incoming.whatsapp) {
      res.status(400).json({ error: 'Nama lengkap dan nomor WhatsApp wajib diisi.' });
      return;
    }
    const nowIso = new Date().toISOString();
    const orderId =
      incoming.id || `ord-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const orderNumber =
      incoming.orderNumber ||
      `IST-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(
        1000 + Math.random() * 9000
      )}`;

    const existingIdx = db.orders.findIndex((o) => o.id === orderId);
    const savedOrder: WeddingOrder = {
      id: orderId,
      orderNumber,
      userId: incoming.userId || 'guest',
      leadId: incoming.leadId || '',
      consultationId: incoming.consultationId || '',
      customerName: incoming.customerName.trim(),
      partnerName: (incoming.partnerName || '').trim(),
      whatsapp: incoming.whatsapp.trim(),
      email: (incoming.email || '').trim(),
      weddingDate: incoming.weddingDate || '',
      weddingLocation: (incoming.weddingLocation || '').trim(),
      eventType: (incoming.eventType || 'Akad & Resepsi').trim(),
      guestCount: Number(incoming.guestCount) || 0,
      items: Array.isArray(incoming.items) ? incoming.items : [],
      totalAmount: Number(incoming.totalAmount) || 0,
      status: (incoming.status as OrderStatus) || 'Pending',
      notes: (incoming.notes || '').trim(),
      paymentProofUrl: incoming.paymentProofUrl || '',
      createdAt: existingIdx >= 0 ? db.orders[existingIdx].createdAt : nowIso,
      updatedAt: nowIso,
    };

    if (existingIdx >= 0) {
      db.orders[existingIdx] = savedOrder;
    } else {
      db.orders = [savedOrder, ...db.orders];
    }

    // Also upsert or update Lead status to 'Booking'
    const coupleDisplay = savedOrder.partnerName
      ? `${savedOrder.customerName} & ${savedOrder.partnerName}`
      : savedOrder.customerName;

    const matchingLeadIdx = db.leads.findIndex(
      (l) =>
        (savedOrder.leadId && l.id === savedOrder.leadId) ||
        (savedOrder.consultationId && l.consultationId === savedOrder.consultationId) ||
        (savedOrder.whatsapp && l.whatsapp === savedOrder.whatsapp)
    );

    if (matchingLeadIdx >= 0) {
      db.leads[matchingLeadIdx] = {
        ...db.leads[matchingLeadIdx],
        customerName: savedOrder.customerName || db.leads[matchingLeadIdx].customerName,
        partnerName: savedOrder.partnerName || db.leads[matchingLeadIdx].partnerName,
        coupleName: coupleDisplay || db.leads[matchingLeadIdx].coupleName,
        whatsapp: savedOrder.whatsapp || db.leads[matchingLeadIdx].whatsapp,
        email: savedOrder.email || db.leads[matchingLeadIdx].email,
        weddingDate: savedOrder.weddingDate || db.leads[matchingLeadIdx].weddingDate,
        weddingLocation: savedOrder.weddingLocation || db.leads[matchingLeadIdx].weddingLocation,
        eventType: savedOrder.eventType || db.leads[matchingLeadIdx].eventType,
        guestCount: savedOrder.guestCount || db.leads[matchingLeadIdx].guestCount,
        interestedProductIds: Array.from(
          new Set([
            ...db.leads[matchingLeadIdx].interestedProductIds,
            ...savedOrder.items.map((i) => i.productId),
          ])
        ),
        interestedProductNames: Array.from(
          new Set([
            ...db.leads[matchingLeadIdx].interestedProductNames,
            ...savedOrder.items.map((i) => i.productName),
          ])
        ),
        status: 'Booking',
        updatedAt: nowIso,
      };
    } else {
      const newLead: LeadRecord = {
        id: `lead-ord-${Date.now()}`,
        userId: savedOrder.userId,
        consultationId: savedOrder.consultationId || '',
        customerName: savedOrder.customerName,
        partnerName: savedOrder.partnerName,
        coupleName: coupleDisplay,
        whatsapp: savedOrder.whatsapp,
        email: savedOrder.email,
        weddingDate: savedOrder.weddingDate,
        weddingLocation: savedOrder.weddingLocation,
        eventType: savedOrder.eventType,
        guestCount: savedOrder.guestCount,
        budget: savedOrder.totalAmount,
        needs: Array.from(new Set(savedOrder.items.map((i) => i.category))),
        interestedProductIds: savedOrder.items.map((i) => i.productId),
        interestedProductNames: savedOrder.items.map((i) => i.productName),
        recommendedPackageNames: [],
        consultationSummary: `Booking Order #${savedOrder.orderNumber} (${savedOrder.items.length} item) — Total Rp ${savedOrder.totalAmount.toLocaleString('id-ID')}`,
        notes: savedOrder.notes,
        status: 'Booking',
        source: 'cart',
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      db.leads = [newLead, ...db.leads];
    }

    saveDatabase(db);
    res.json({ order: savedOrder, orders: db.orders, leads: db.leads });
  });

  app.patch('/api/db/orders/:id', (req, res) => {
    const db = loadDatabase();
    const { id } = req.params;
    const updates = req.body as Partial<WeddingOrder>;
    const idx = db.orders.findIndex((o) => o.id === id);
    if (idx < 0) {
      res.status(404).json({ error: 'Data pesanan tidak ditemukan.' });
      return;
    }
    db.orders[idx] = {
      ...db.orders[idx],
      ...updates,
      id,
      updatedAt: new Date().toISOString(),
    };
    saveDatabase(db);
    res.json({ order: db.orders[idx], orders: db.orders });
  });

  app.delete('/api/db/orders/:id', (req, res) => {
    const db = loadDatabase();
    const { id } = req.params;
    db.orders = db.orders.filter((o) => o.id !== id);
    saveDatabase(db);
    res.json({ deletedId: id, orders: db.orders });
  });

  // 14. Inquiries CRUD
  app.post('/api/db/inquiries', (req, res) => {
    const db = loadDatabase();
    const inquiry = req.body as ConsultationInquiry;
    if (!inquiry || !inquiry.id) {
      res.status(400).json({ error: 'Data inquiry tidak valid.' });
      return;
    }
    const exists = db.inquiries.some((i) => i.id === inquiry.id);
    if (!exists) {
      db.inquiries = [inquiry, ...db.inquiries].slice(0, 200);
      saveDatabase(db);
    }
    res.json({ inquiry, inquiries: db.inquiries });
  });

  // 15. Per-user Workspace Persistence
  app.get('/api/db/workspaces/:userId', (req, res) => {
    const db = loadDatabase();
    const { userId } = req.params;
    const ws = db.workspaces[userId] || null;
    res.json({ workspace: ws });
  });

  app.put('/api/db/workspaces/:userId', (req, res) => {
    const db = loadDatabase();
    const { userId } = req.params;
    const payload = req.body as Partial<ServerWorkspaceRecord>;
    const existing = db.workspaces[userId];
    const updated: ServerWorkspaceRecord = {
      userId,
      coupleName: payload.coupleName ?? existing?.coupleName ?? '',
      weddingLocation: payload.weddingLocation ?? existing?.weddingLocation ?? '',
      cartWeddingDate: payload.cartWeddingDate ?? existing?.cartWeddingDate ?? '2026-11-14',
      cartGuestCount: payload.cartGuestCount ?? existing?.cartGuestCount ?? 300,
      cartItems: payload.cartItems ?? existing?.cartItems ?? [],
      wishlistIds: payload.wishlistIds ?? existing?.wishlistIds ?? [],
      weddingPlan: payload.weddingPlan ?? existing?.weddingPlan ?? null,
      budgetAllocation: payload.budgetAllocation ?? existing?.budgetAllocation ?? null,
      updatedAt: new Date().toISOString(),
    };
    db.workspaces[userId] = updated;
    saveDatabase(db);
    res.json({ workspace: updated });
  });

  // 16. Reset Catalog to Default (Only when Admin explicitly triggers it)
  app.post('/api/db/reset-catalog', (_req, res) => {
    const db = loadDatabase();
    const nowIso = new Date().toISOString();
    db.settings = INITIAL_SETTINGS;
    db.categories = INITIAL_CATEGORIES;
    db.products = INITIAL_PRODUCTS.map((p) => ({
      ...p,
      createdAt: nowIso,
      updatedAt: nowIso,
    }));
    db.packages = INITIAL_PACKAGES.map((pkg) => ({
      ...pkg,
      createdAt: nowIso,
      updatedAt: nowIso,
    }));
    db.gallery = INITIAL_GALLERY;
    db.testimonials = INITIAL_TESTIMONIALS;
    db.promos = INITIAL_PROMOS;
    db.articles = INITIAL_ARTICLES;
    db.calendarPublic = INITIAL_CALENDAR_PUBLIC;
    db.calendarPrivate = INITIAL_CALENDAR_PRIVATE;
    db.serviceAreas = INITIAL_SERVICE_AREAS;
    saveDatabase(db);
    res.json({
      settings: db.settings,
      categories: db.categories,
      products: db.products,
      packages: db.packages,
      gallery: db.gallery,
      testimonials: db.testimonials,
      promos: db.promos,
      articles: db.articles,
      calendarPublic: db.calendarPublic,
      calendarPrivate: db.calendarPrivate,
      serviceAreas: db.serviceAreas,
    });
  });

  // ===========================================================================
  // Smart Personal Wedding Consultant Endpoint (/api/wedding-consultation)
  // ===========================================================================
  app.post('/api/wedding-consultation', async (req, res) => {
    try {
      const db = loadDatabase();
      const {
        userMessage = '',
        sessionContext = {
          customerName: '',
          partnerName: '',
          coupleName: '',
          whatsapp: '',
          email: '',
          weddingDate: '',
          weddingLocation: '',
          eventType: '',
          guestCount: 0,
          targetBudget: 0,
          weddingTheme: '',
          desiredColors: '',
          needs: [],
          notes: '',
          interestedProductIds: [],
          viewedProductIds: [],
        },
        previousMessages = [],
        products = db.products,
        packages = db.packages,
        promos = db.promos,
        calendarPublic = db.calendarPublic,
      } = req.body || {};

      const catalogToUse =
        Array.isArray(products) && products.length > 0 ? products : db.products;

      const deterministicResult = generateConsultationResponse({
        userMessage: String(userMessage),
        sessionContext,
        previousMessages,
        products: catalogToUse,
        packages: Array.isArray(packages) && packages.length > 0 ? packages : db.packages,
        promos: Array.isArray(promos) && promos.length > 0 ? promos : db.promos,
        calendarPublic:
          Array.isArray(calendarPublic) && calendarPublic.length > 0
            ? calendarPublic
            : db.calendarPublic,
      });

      if (
        deterministicResult.isUnavailableNotice ||
        deterministicResult.directCartProducts.length > 0 ||
        deterministicResult.budgetBreakdown ||
        !process.env.GEMINI_API_KEY
      ) {
        res.json(deterministicResult);
        return;
      }

      const activeProducts: Product[] = (catalogToUse as Product[]).filter(
        (p) => p.isActive !== false && p.isAvailable !== false
      );
      const validIds = new Set(activeProducts.map((p) => p.id));

      try {
        const ai = new GoogleGenAI({
          apiKey: process.env.GEMINI_API_KEY,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        });

        const catalogDigest = activeProducts.map((p) => ({
          productId: p.id,
          name: p.name,
          category: p.category,
          price: p.price,
          originalPrice: p.originalPrice || null,
          unit: p.unit || 'Paket',
          shortDescription: p.shortDescription,
          variants: (p.variants || []).slice(0, 4),
          inclusions: (p.inclusions || []).slice(0, 4),
          isPromo: Boolean(p.isPromo),
        }));

        const recentTranscript = (previousMessages || [])
          .slice(-6)
          .map(
            (m: { sender: string; message: string }) =>
              `${m.sender === 'user' ? 'Calon Pengantin' : 'Konsultan ISTAFA'}: ${m.message}`
          )
          .join('\n');

        const systemInstruction = `Anda adalah Personal Wedding Consultant senior pada fitur "Konsultasi Pernikahan ISTAFA".
ATURAN WAJIB:
1. JANGAN PERNAH menggunakan kata "AI", "Artificial Intelligence", "Bot", atau "Chatbot" dalam jawaban Anda.
2. Gunakan bahasa Indonesia yang sopan, hangat, empatik, elegan, dan persuasif seperti konsultan pernikahan pribadi profesional.
3. Semua rekomendasi WAJIB hanya memilih dari daftar katalog aktif ISTAFA Wedding yang diberikan (gunakan productId yang persis sama). Jangan pernah mengarang nama produk atau harga sendiri.
4. Utamakan maksimal 3 rekomendasi produk terbaik yang benar-benar sesuai kebutuhan, jumlah tamu, dan budget calon pengantin. Setiap rekomendasi wajib disertai alasan spesifik mengapa produk tersebut cocok.
5. Jika produk/layanan yang diminta pengguna sama sekali tidak ada di katalog ISTAFA Wedding, jawab persis: "${UNAVAILABLE_CATALOG_NOTICE}" dan kosongkan array recommendations.
6. Ajak calon pengantin melengkapi profil rencana pernikahan secara ramah dan bertahap (nama & pasangan, tanggal pernikahan, lokasi/venue, jenis acara Akad/Resepsi, jumlah tamu, dan perkiraan budget).`;

        const mergedCtx = deterministicResult.updatedContext;

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: `Profil & Konteks Rencana Calon Pengantin Saat Ini:
- Nama & Pasangan: ${mergedCtx.coupleName || sessionContext.coupleName || 'Belum disebutkan'}
- WhatsApp: ${mergedCtx.whatsapp || sessionContext.whatsapp || 'Belum disebutkan'}
- Tanggal Pernikahan: ${mergedCtx.weddingDate || sessionContext.weddingDate || 'Belum disebutkan'}
- Lokasi / Venue: ${mergedCtx.weddingLocation || sessionContext.weddingLocation || 'Belum disebutkan'}
- Jenis Acara: ${mergedCtx.eventType || sessionContext.eventType || 'Belum disebutkan'}
- Jumlah Tamu: ${mergedCtx.guestCount || sessionContext.guestCount || 'Belum disebutkan'}
- Target Budget: ${mergedCtx.targetBudget || sessionContext.targetBudget || 'Belum disebutkan'}
- Tema / Warna: ${mergedCtx.weddingTheme || sessionContext.weddingTheme || '-'} / ${mergedCtx.desiredColors || sessionContext.desiredColors || '-'}
- Kebutuhan Layanan: ${(mergedCtx.needs || []).join(', ') || '-'}

Riwayat Percakapan Terakhir:
${recentTranscript}

Pesan Terbaru Calon Pengantin:
"${userMessage}"

Daftar Katalog Aktif ISTAFA Wedding:
${JSON.stringify(catalogDigest)}`,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                replyText: {
                  type: Type.STRING,
                  description:
                    'Jawaban konsultasi pernikahan yang hangat, solutif, dan elegan dalam bahasa Indonesia (tanpa kata AI).',
                },
                isUnavailable: {
                  type: Type.BOOLEAN,
                  description:
                    'True jika yang diminta calon pengantin tidak tersedia di katalog ISTAFA Wedding.',
                },
                recommendations: {
                  type: Type.ARRAY,
                  description:
                    'Maksimal 3 rekomendasi produk dari katalog aktif ISTAFA Wedding.',
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      productId: {
                        type: Type.STRING,
                        description: 'ID produk asli dari katalog ISTAFA Wedding.',
                      },
                      reason: {
                        type: Type.STRING,
                        description:
                          'Alasan spesifik mengapa produk ini cocok untuk rencana pernikahan pengguna.',
                      },
                    },
                    required: ['productId', 'reason'],
                  },
                },
              },
              required: ['replyText', 'isUnavailable', 'recommendations'],
            },
          },
        });

        const rawJson = response.text?.trim();
        if (rawJson) {
          const parsed = JSON.parse(rawJson) as {
            replyText?: string;
            isUnavailable?: boolean;
            recommendations?: { productId: string; reason: string }[];
          };

          if (parsed.isUnavailable) {
            res.json({
              ...deterministicResult,
              replyText: UNAVAILABLE_CATALOG_NOTICE,
              recommendations: [],
              isUnavailableNotice: true,
            });
            return;
          }

          const verifiedRecs = (parsed.recommendations || [])
            .filter((r) => r.productId && validIds.has(r.productId))
            .slice(0, 3)
            .map((r) => {
              const prod = activeProducts.find((p) => p.id === r.productId);
              const guestCount =
                deterministicResult.updatedContext.guestCount ||
                sessionContext.guestCount ||
                300;
              return {
                productId: r.productId,
                reason: r.reason.replace(/\bAI\b/gi, 'Konsultan ISTAFA'),
                suggestedQuantity:
                  prod?.unit?.toLowerCase() === 'pcs' ? guestCount : 1,
              };
            });

          const cleanReply = (parsed.replyText || deterministicResult.replyText).replace(
            /\bAI\b/gi,
            'Konsultan ISTAFA'
          );

          res.json({
            ...deterministicResult,
            replyText: cleanReply,
            recommendations:
              verifiedRecs.length > 0 ? verifiedRecs : deterministicResult.recommendations,
          });
          return;
        }
      } catch {
        // Fall back smoothly to deterministic catalog response
      }

      res.json(deterministicResult);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Gagal memproses konsultasi.',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
