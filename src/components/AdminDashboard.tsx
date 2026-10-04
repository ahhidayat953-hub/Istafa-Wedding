import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Calendar,
  Camera,
  Check,
  Copy,
  Edit3,
  Eye,
  EyeOff,
  FileCheck,
  FolderKanban,
  KeyRound,
  LayoutDashboard,
  Layers,
  Loader2,
  Lock,
  LogIn,
  LogOut,
  MapPin,
  MessageCircle,
  MessageSquareQuote,
  Package,
  Phone,
  Plus,
  RotateCcw,
  Save,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Tag,
  Trash2,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { useWedding } from '../context/WeddingContext';
import { GALLERY_CATEGORIES, PRESET_GALLERY_CHOICES } from '../data/initialData';
import {
  CalendarDateStatus,
  Category,
  ConsultationSession,
  GalleryItem,
  InspirationArticle,
  LeadRecord,
  LeadStatus,
  OrderStatus,
  Product,
  ProductImage,
  Promo,
  ServiceArea,
  Testimonial,
  WeddingOrder,
  WeddingPackage,
} from '../types';
import {
  buildWhatsAppUrl,
  compressImageFile,
  enrichProductImagesForDatabase,
  formatRupiah,
  getPrimaryImage,
  isValidPersistentImageUrl,
} from '../utils/imageUtils';
import { MultiPhotoUploader } from './MultiPhotoUploader';
import { SafeWeddingImage } from './SafeWeddingImage';

interface AdminDashboardProps {
  onBackToCatalog: () => void;
}

type AdminTab =
  | 'overview'
  | 'products'
  | 'leads_consultations'
  | 'orders'
  | 'categories'
  | 'packages'
  | 'promos'
  | 'calendar'
  | 'gallery_articles'
  | 'testimonials'
  | 'settings_areas';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onBackToCatalog,
}) => {
  const {
    products,
    categories,
    packages,
    gallery,
    testimonials,
    promos,
    articles,
    calendarPublic,
    calendarPrivate,
    serviceAreas,
    inquiries,
    leads,
    allConsultations,
    orders,
    settings,
    isCloudAdmin,
    isPreviewAdminUnlocked,
    adminUsername,
    loginWithCredentials,
    updateAdminCredentials,
    logoutAdmin,
    saveProduct,
    deleteProduct,
    toggleProductActive,
    saveCategory,
    deleteCategory,
    savePackage,
    deletePackage,
    saveGalleryItem,
    deleteGalleryItem,
    saveTestimonial,
    deleteTestimonial,
    savePromo,
    deletePromo,
    saveArticle,
    deleteArticle,
    saveCalendarDate,
    deleteCalendarDate,
    saveServiceArea,
    deleteServiceArea,
    saveLead,
    updateLeadStatus,
    deleteLead,
    createOrder,
    updateOrderStatus,
    deleteOrder,
    updateStoreSettings,
    seedInitialDataToCloud,
  } = useWedding();

  const isAdminAuthenticated = isCloudAdmin || isPreviewAdminUnlocked;
  const calendarEntries = calendarPublic;
  const calendarPrivateNotes = calendarPrivate;

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [saveBanner, setSaveBanner] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    confirmLabel?: string;
    onConfirm: () => Promise<void> | void;
  } | null>(null);

  // Leads & Consultations State
  const [leadFilterStatus, setLeadFilterStatus] = useState<LeadStatus | 'All'>('All');
  const [leadSearchQuery, setLeadSearchQuery] = useState('');
  const [selectedConsultationDetail, setSelectedConsultationDetail] =
    useState<ConsultationSession | null>(null);
  const [showAddLeadForm, setShowAddLeadForm] = useState(false);
  const [newLeadName, setNewLeadName] = useState('');
  const [newLeadPartner, setNewLeadPartner] = useState('');
  const [newLeadWa, setNewLeadWa] = useState('');
  const [newLeadEmail, setNewLeadEmail] = useState('');
  const [newLeadDate, setNewLeadDate] = useState('');
  const [newLeadLocation, setNewLeadLocation] = useState('');
  const [newLeadGuests, setNewLeadGuests] = useState<number>(300);
  const [newLeadBudget, setNewLeadBudget] = useState<number>(15000000);
  const [newLeadNeeds, setNewLeadNeeds] = useState('Dekorasi, Undangan, Souvenir');
  const [newLeadNotes, setNewLeadNotes] = useState('');

  // Orders & Bookings State
  const [orderFilterStatus, setOrderFilterStatus] = useState<OrderStatus | 'All'>('All');
  const [showAddOrderForm, setShowAddOrderForm] = useState(false);
  const [newOrderCustomer, setNewOrderCustomer] = useState('');
  const [newOrderPartner, setNewOrderPartner] = useState('');
  const [newOrderWa, setNewOrderWa] = useState('');
  const [newOrderDate, setNewOrderDate] = useState('');
  const [newOrderLocation, setNewOrderLocation] = useState('');
  const [newOrderProductId, setNewOrderProductId] = useState('');
  const [newOrderQty, setNewOrderQty] = useState<number>(1);
  const [newOrderStatus, setNewOrderStatus] = useState<OrderStatus>('Confirmed');
  const [newOrderNotes, setNewOrderNotes] = useState('');

  // Admin Login Form State
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Product Form State
  const [isEditingProduct, setIsEditingProduct] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [prodName, setProdName] = useState('');
  const [prodCategory, setProdCategory] = useState('Dekorasi Pernikahan');
  const [prodPrice, setProdPrice] = useState<number>(3500000);
  const [prodOriginalPrice, setProdOriginalPrice] = useState<number>(0);
  const [prodPriceLabel, setProdPriceLabel] = useState('Mulai dari');
  const [prodShortDesc, setProdShortDesc] = useState('');
  const [prodDescription, setProdDescription] = useState('');
  const [prodSpecsText, setProdSpecsText] = useState('');
  const [prodVariantsText, setProdVariantsText] = useState('');
  const [prodSizesText, setProdSizesText] = useState('');
  const [prodUnit, setProdUnit] = useState('Paket');
  const [prodStockStatus, setProdStockStatus] = useState<
    'Tersedia' | 'Terbatas' | 'Pre-Order' | 'Habis'
  >('Tersedia');
  const [prodPromoLabel, setProdPromoLabel] = useState('');
  const [prodIsPromo, setProdIsPromo] = useState(false);
  const [prodFeatured, setProdFeatured] = useState(true);
  const [prodIsNew, setProdIsNew] = useState(false);
  const [prodIsActive, setProdIsActive] = useState(true);
  const [prodImages, setProdImages] = useState<ProductImage[]>([]);
  const [isSavingProduct, setIsSavingProduct] = useState(false);

  // Category Form State
  const [catId, setCatId] = useState<string | null>(null);
  const [catName, setCatName] = useState('');
  const [catSubtitle, setCatSubtitle] = useState('');
  const [catImageUrl, setCatImageUrl] = useState(PRESET_GALLERY_CHOICES[0].url);
  const [catIconName, setCatIconName] = useState('Flower2');
  const [isUploadingCategoryFile, setIsUploadingCategoryFile] = useState(false);

  // Package Form State
  const [isEditingPackage, setIsEditingPackage] = useState(false);
  const [pkgId, setPkgId] = useState<string | null>(null);
  const [pkgName, setPkgName] = useState('');
  const [pkgTier, setPkgTier] = useState('Paket Elegant');
  const [pkgPrice, setPkgPrice] = useState<number>(15000000);
  const [pkgOriginalPrice, setPkgOriginalPrice] = useState<number>(0);
  const [pkgCapacity, setPkgCapacity] = useState('250 - 400 Tamu');
  const [pkgDescription, setPkgDescription] = useState('');
  const [pkgInclusionsText, setPkgInclusionsText] = useState('');
  const [pkgPopular, setPkgPopular] = useState(false);
  const [pkgIsPromo, setPkgIsPromo] = useState(false);
  const [pkgPromoLabel, setPkgPromoLabel] = useState('');
  const [pkgIsActive, setPkgIsActive] = useState(true);
  const [pkgImages, setPkgImages] = useState<ProductImage[]>([]);

  // Promo Form State
  const [promoId, setPromoId] = useState<string | null>(null);
  const [promoTitle, setPromoTitle] = useState('');
  const [promoSub, setPromoSub] = useState('');
  const [promoDiscount, setPromoDiscount] = useState('Hemat Rp 3.500.000');
  const [promoCode, setPromoCode] = useState('');
  const [promoValidUntil, setPromoValidUntil] = useState('31 Desember 2025');
  const [promoDesc, setPromoDesc] = useState('');
  const [promoImg, setPromoImg] = useState(PRESET_GALLERY_CHOICES[0].url);
  const [promoActive, setPromoActive] = useState(true);
  const [isUploadingPromoFile, setIsUploadingPromoFile] = useState(false);

  // Calendar Form State
  const [calDate, setCalDate] = useState('');
  const [calStatus, setCalStatus] = useState<CalendarDateStatus>('reserved');
  const [calLabel, setCalLabel] = useState('Sudah Ada Reservasi (Sisa 1 Slot)');
  const [calClientName, setCalClientName] = useState('');
  const [calClientPhone, setCalClientPhone] = useState('');
  const [calNotes, setCalNotes] = useState('');

  // Gallery & Article Form State
  const [galTitle, setGalTitle] = useState('');
  const [galCategory, setGalCategory] = useState('Pelaminan');
  const [galCaption, setGalCaption] = useState('');
  const [galImageUrl, setGalImageUrl] = useState(PRESET_GALLERY_CHOICES[0].url);
  const [galAspect, setGalAspect] = useState<'landscape' | 'portrait' | 'square'>('landscape');
  const [isUploadingGalleryFile, setIsUploadingGalleryFile] = useState(false);

  const [artId, setArtId] = useState<string | null>(null);
  const [artTitle, setArtTitle] = useState('');
  const [artCat, setArtCat] = useState('Tips Dekorasi');
  const [artReadTime, setArtReadTime] = useState('4 Menit Baca');
  const [artExcerpt, setArtExcerpt] = useState('');
  const [artContent, setArtContent] = useState('');
  const [artImg, setArtImg] = useState(PRESET_GALLERY_CHOICES[0].url);
  const [isUploadingArticleFile, setIsUploadingArticleFile] = useState(false);

  // Testimonial Form State
  const [isEditingTestimonial, setIsEditingTestimonial] = useState(false);
  const [testiId, setTestiId] = useState<string | null>(null);
  const [testiCoupleName, setTestiCoupleName] = useState('');
  const [testiEventDate, setTestiEventDate] = useState('');
  const [testiVenue, setTestiVenue] = useState('');
  const [testiPackageTaken, setTestiPackageTaken] = useState('');
  const [testiRating, setTestiRating] = useState<number>(5);
  const [testiReview, setTestiReview] = useState('');
  const [testiImages, setTestiImages] = useState<ProductImage[]>([]);

  // Settings & Area Form State
  const [bizName, setBizName] = useState(settings.businessName);
  const [bizTagline, setBizTagline] = useState(settings.tagline);
  const [bizWhatsapp, setBizWhatsapp] = useState(settings.whatsappNumber);
  const [bizInstagram, setBizInstagram] = useState(settings.instagram);
  const [bizAddress, setBizAddress] = useState(settings.address);
  const [bizHours, setBizHours] = useState(settings.email);
  const [bizUsername, setBizUsername] = useState(adminUsername || '');
  const [bizPassword, setBizPassword] = useState('');

  const [areaId, setAreaId] = useState<string | null>(null);
  const [areaCity, setAreaCity] = useState('');
  const [areaCoverage, setAreaCoverage] = useState('');
  const [areaShipping, setAreaShipping] = useState('Gratis Ongkir & Pasang');
  const [areaMinOrder, setAreaMinOrder] = useState('Tanpa Minimal Order');
  const [areaFeatured, setAreaFeatured] = useState(true);

  const showSuccessBanner = (msg: string) => {
    setErrorBanner(null);
    setSaveBanner(msg);
    setTimeout(() => {
      setSaveBanner(null);
    }, 3800);
  };

  const showErrorBanner = (msg: string) => {
    setSaveBanner(null);
    setErrorBanner(msg);
  };

  // Duplicate an existing product with all its photos & specs (Requirement 7)
  const handleDuplicateProduct = async (product: Product) => {
    const duplicatedImages: ProductImage[] = (product.images || []).map((img, idx) => ({
      ...img,
      id: `img-dup-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 5)}`,
    }));
    await saveProduct({
      name: `${product.name} (Salinan)`,
      category: product.category,
      price: product.price,
      originalPrice: product.originalPrice,
      priceLabel: product.priceLabel,
      shortDescription: product.shortDescription,
      description: product.description,
      inclusions: product.inclusions || [],
      variants: product.variants || [],
      sizes: product.sizes || [],
      unit: product.unit || 'Paket',
      stockStatus: product.stockStatus || 'Tersedia',
      promoLabel: product.promoLabel,
      isPromo: Boolean(product.isPromo),
      isAvailable: product.isAvailable !== false,
      isFeatured: product.isFeatured,
      isNew: true,
      isActive: product.isActive !== false,
      images: duplicatedImages,
    });
    showSuccessBanner(`Produk "${product.name}" berhasil diduplikasi secara permanen.`);
  };

  const handleCreateManualLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadName.trim()) return;
    await saveLead({
      customerName: newLeadName.trim(),
      partnerName: newLeadPartner.trim(),
      coupleName: newLeadPartner.trim()
        ? `${newLeadName.trim()} & ${newLeadPartner.trim()}`
        : newLeadName.trim(),
      whatsapp: newLeadWa.trim(),
      email: newLeadEmail.trim(),
      weddingDate: newLeadDate,
      weddingLocation: newLeadLocation.trim(),
      guestCount: Number(newLeadGuests) || 300,
      budget: Number(newLeadBudget) || 0,
      needs: newLeadNeeds
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      notes: newLeadNotes.trim(),
      status: 'New',
      source: 'manual',
    });
    setNewLeadName('');
    setNewLeadPartner('');
    setNewLeadWa('');
    setNewLeadEmail('');
    setNewLeadDate('');
    setNewLeadLocation('');
    setNewLeadNotes('');
    setShowAddLeadForm(false);
    showSuccessBanner('Lead calon pengantin baru berhasil ditambahkan ke database.');
  };

  const handleCreateManualOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrderCustomer.trim() || !newOrderWa.trim()) return;
    const selectedProd =
      products.find((p) => p.id === newOrderProductId) || products[0];
    if (!selectedProd) return;
    const qty = Math.max(1, Number(newOrderQty) || 1);
    const primaryImg = getPrimaryImage(selectedProd.images);

    await createOrder({
      customerName: newOrderCustomer.trim(),
      partnerName: newOrderPartner.trim(),
      whatsapp: newOrderWa.trim(),
      email: '',
      weddingDate: newOrderDate || 'Belum ditentukan',
      weddingLocation: newOrderLocation.trim() || '-',
      eventType: 'Akad & Resepsi',
      guestCount: 300,
      items: [
        {
          productId: selectedProd.id,
          productName: selectedProd.name,
          category: selectedProd.category,
          quantity: qty,
          unit: selectedProd.unit || 'Paket',
          unitPrice: selectedProd.price,
          subtotal: selectedProd.price * qty,
          photoUrl: primaryImg?.url || '',
        },
      ],
      totalAmount: selectedProd.price * qty,
      status: newOrderStatus,
      notes: newOrderNotes.trim(),
    });
    setNewOrderCustomer('');
    setNewOrderPartner('');
    setNewOrderWa('');
    setNewOrderDate('');
    setNewOrderLocation('');
    setNewOrderNotes('');
    setShowAddOrderForm(false);
    showSuccessBanner('Order / Booking berhasil dibuat dan disimpan ke database.');
  };

  // Start Adding New Product
  const handleStartNewProduct = () => {
    setEditingProductId(null);
    setProdName('');
    setProdCategory(categories[0]?.name || 'Dekorasi Pernikahan');
    setProdPrice(5000000);
    setProdOriginalPrice(0);
    setProdPriceLabel('Mulai dari');
    setProdShortDesc('');
    setProdDescription('');
    setProdSpecsText(
      'Rangkaian bunga segar & artifisial premium\nTermasuk instalasi & pembongkaran di lokasi\nBebas penyesuaian palet warna'
    );
    setProdVariantsText('Champagne Gold\nIvory Sage\nDusty Rose');
    setProdSizesText('Standar (6 Meter)\nMedium (8 Meter)\nGrand (10-12 Meter)');
    setProdUnit('Paket');
    setProdStockStatus('Tersedia');
    setProdPromoLabel('');
    setProdIsPromo(false);
    setProdFeatured(true);
    setProdIsNew(true);
    setProdIsActive(true);
    setProdImages([]);
    setIsEditingProduct(true);
  };

  // Start Editing Existing Product
  const handleStartEditProduct = (product: Product) => {
    setEditingProductId(product.id);
    setProdName(product.name);
    setProdCategory(product.category);
    setProdPrice(product.price);
    setProdOriginalPrice(product.originalPrice || 0);
    setProdPriceLabel(product.priceLabel || 'Mulai dari');
    setProdShortDesc(product.shortDescription);
    setProdDescription(product.description);
    setProdSpecsText((product.inclusions || []).join('\n'));
    setProdVariantsText((product.variants || []).join('\n'));
    setProdSizesText((product.sizes || []).join('\n'));
    setProdUnit(product.unit || 'Paket');
    setProdStockStatus((product.stockStatus as any) || 'Tersedia');
    setProdPromoLabel(product.promoLabel || '');
    setProdIsPromo(Boolean(product.isPromo));
    setProdFeatured(product.isFeatured);
    setProdIsNew(Boolean(product.isNew));
    setProdIsActive(product.isActive !== false);
    setProdImages(product.images || []);
    setIsEditingProduct(true);
  };

  const handleSaveProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName.trim()) return;

    setIsSavingProduct(true);
    setErrorBanner(null);
    try {
      const targetProdId =
        editingProductId ||
        `prod-${prodName
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          .slice(0, 32)}-${Date.now().toString(36)}`;

      const rawImages: ProductImage[] =
        prodImages.length > 0
          ? prodImages
          : [
              {
                id: `img-default-${Date.now()}`,
                url: PRESET_GALLERY_CHOICES[0].url,
                isPrimary: true,
                caption: `${prodName.trim()} - Foto Utama`,
              },
            ];

      // Validate that all photos have valid persistent storage URLs
      const hasInvalidPhoto = rawImages.some(
        (img) => !isValidPersistentImageUrl(img.image_url || img.url)
      );
      if (hasInvalidPhoto) {
        showErrorBanner('Foto belum berhasil diupload. Silakan coba lagi.');
        return;
      }

      const finalImages = enrichProductImagesForDatabase(targetProdId, rawImages);

      await saveProduct({
        id: targetProdId,
        name: prodName.trim(),
        category: prodCategory,
        price: Number(prodPrice) || 0,
        originalPrice: Number(prodOriginalPrice) > 0 ? Number(prodOriginalPrice) : undefined,
        priceLabel: prodPriceLabel.trim() || 'Mulai dari',
        shortDescription: prodShortDesc.trim() || prodDescription.slice(0, 120),
        description: prodDescription.trim() || prodShortDesc.trim(),
        inclusions: prodSpecsText
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
        variants: prodVariantsText
          .split('\n')
          .map((v) => v.trim())
          .filter(Boolean),
        sizes: prodSizesText
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
        unit: prodUnit.trim() || 'Paket',
        stockStatus: prodStockStatus,
        promoLabel: prodPromoLabel.trim() || undefined,
        isPromo: prodIsPromo,
        isAvailable: prodStockStatus !== 'Habis',
        isFeatured: prodFeatured,
        isNew: prodIsNew,
        isActive: prodIsActive,
        images: finalImages,
      });
      setIsEditingProduct(false);
      showSuccessBanner(
        `Produk "${prodName.trim()}" berhasil disimpan ke database dengan ${finalImages.length} foto.`
      );
    } catch (err) {
      showErrorBanner(
        err instanceof Error && err.message
          ? err.message
          : 'Foto belum berhasil diupload. Silakan coba lagi.'
      );
    } finally {
      setIsSavingProduct(false);
    }
  };

  const handleSaveCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;
    const slug = catName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    await saveCategory({
      id: catId || undefined,
      name: catName.trim(),
      slug,
      description: catSubtitle.trim() || 'Koleksi pernikahan eksklusif',
      coverImageUrl: catImageUrl.trim() || PRESET_GALLERY_CHOICES[0].url,
      iconName: catIconName,
      sortOrder: categories.length + 1,
    });
    setCatId(null);
    setCatName('');
    setCatSubtitle('');
    showSuccessBanner(`Kategori "${catName.trim()}" berhasil disimpan.`);
  };

  const handleStartNewPackage = () => {
    setPkgId(null);
    setPkgName('');
    setPkgTier('Paket Elegant');
    setPkgPrice(32500000);
    setPkgOriginalPrice(36000000);
    setPkgCapacity('300 - 500 Tamu');
    setPkgDescription('');
    setPkgInclusionsText(
      'Dekorasi Pelaminan 8 Meter Full Fresh Flower\nTenda Serut Champagne 150m²\nUndangan 300 pcs + Souvenir 300 pcs\nDokumentasi Foto & Video Cinematic'
    );
    setPkgPopular(true);
    setPkgIsPromo(true);
    setPkgPromoLabel('Hemat Paket Lengkap');
    setPkgIsActive(true);
    setPkgImages([]);
    setIsEditingPackage(true);
  };

  const handleStartEditPackage = (pkg: WeddingPackage) => {
    setPkgId(pkg.id);
    setPkgName(pkg.name);
    setPkgTier(pkg.tier);
    setPkgPrice(pkg.price);
    setPkgOriginalPrice(pkg.originalPrice || 0);
    setPkgCapacity(pkg.guestCapacity);
    setPkgDescription(pkg.description);
    setPkgInclusionsText(pkg.inclusions.join('\n'));
    setPkgPopular(pkg.isPopular);
    setPkgIsPromo(Boolean(pkg.isPromo));
    setPkgPromoLabel(pkg.promoLabel || '');
    setPkgIsActive(pkg.isActive !== false);
    setPkgImages(pkg.images || []);
    setIsEditingPackage(true);
  };

  const handleSavePackageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pkgName.trim()) return;

    const finalPkgImages =
      pkgImages.length > 0
        ? pkgImages
        : [
            {
              id: `pkg-img-${Date.now()}`,
              url: PRESET_GALLERY_CHOICES[0].url,
              isPrimary: true,
              caption: pkgName.trim(),
            },
          ];

    await savePackage({
      id: pkgId || undefined,
      name: pkgName.trim(),
      tier: pkgTier.trim() || 'Paket Elegant',
      price: Number(pkgPrice) || 0,
      originalPrice: Number(pkgOriginalPrice) > 0 ? Number(pkgOriginalPrice) : undefined,
      guestCapacity: pkgCapacity.trim() || '200 - 400 Tamu',
      description: pkgDescription.trim(),
      inclusions: pkgInclusionsText
        .split('\n')
        .map((i) => i.trim())
        .filter(Boolean),
      isPopular: pkgPopular,
      isPromo: pkgIsPromo,
      promoLabel: pkgPromoLabel.trim() || undefined,
      isActive: pkgIsActive,
      images: finalPkgImages,
    });
    setIsEditingPackage(false);
    showSuccessBanner(`Paket "${pkgName.trim()}" berhasil disimpan.`);
  };

  const handleSavePromoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoTitle.trim()) return;

    await savePromo({
      id: promoId || undefined,
      title: promoTitle.trim(),
      description: promoDesc.trim(),
      promoPrice: 15000000,
      normalPrice: 18500000,
      imageUrl: promoImg.trim() || PRESET_GALLERY_CHOICES[0].url,
      startDate: '2025-01-01',
      endDate: promoValidUntil.trim() || '2026-12-31',
      badgeText: promoDiscount.trim() || 'Promo Spesial',
      isActive: promoActive,
    });
    setPromoId(null);
    setPromoTitle('');
    setPromoSub('');
    setPromoCode('');
    setPromoDesc('');
    showSuccessBanner(`Promo "${promoTitle.trim()}" berhasil disimpan.`);
  };

  const handleSaveCalendarSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!calDate) return;

    await saveCalendarDate(
      calDate,
      calStatus,
      calLabel.trim() ||
        (calStatus === 'unavailable'
          ? 'Tidak Tersedia (Full Booked)'
          : calStatus === 'reserved'
          ? 'Sudah Ada Reservasi'
          : 'Tersedia untuk Booking'),
      calClientName.trim() || undefined,
      calNotes.trim() || undefined
    );

    setCalDate('');
    setCalClientName('');
    setCalClientPhone('');
    setCalNotes('');
    showSuccessBanner(`Status tanggal ${calDate} berhasil diperbarui.`);
  };

  const handleCategoryFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingCategoryFile(true);
    try {
      const uploaded = await compressImageFile(file, 1080, 0.78, 'categories');
      setCatImageUrl(uploaded);
    } catch {
      showErrorBanner('Foto belum berhasil diupload. Silakan coba lagi.');
    } finally {
      setIsUploadingCategoryFile(false);
      e.target.value = '';
    }
  };

  const handlePromoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingPromoFile(true);
    try {
      const uploaded = await compressImageFile(file, 1080, 0.78, 'promos');
      setPromoImg(uploaded);
    } catch {
      showErrorBanner('Foto belum berhasil diupload. Silakan coba lagi.');
    } finally {
      setIsUploadingPromoFile(false);
      e.target.value = '';
    }
  };

  const handleArticleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingArticleFile(true);
    try {
      const uploaded = await compressImageFile(file, 1080, 0.78, 'articles');
      setArtImg(uploaded);
    } catch {
      showErrorBanner('Foto belum berhasil diupload. Silakan coba lagi.');
    } finally {
      setIsUploadingArticleFile(false);
      e.target.value = '';
    }
  };

  const handleGalleryFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingGalleryFile(true);
    try {
      const uploaded = await compressImageFile(file, 1080, 0.78, 'gallery');
      setGalImageUrl(uploaded);
    } catch {
      showErrorBanner('Foto belum berhasil diupload. Silakan coba lagi.');
    } finally {
      setIsUploadingGalleryFile(false);
    }
  };

  const handleSaveGallerySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!galTitle.trim() || !galImageUrl.trim()) return;

    await saveGalleryItem({
      title: galTitle.trim(),
      category: galCategory,
      imageUrl: galImageUrl.trim(),
      caption: galCaption.trim() || galTitle.trim(),
      aspectType: galAspect,
    });
    setGalTitle('');
    setGalCaption('');
    showSuccessBanner(`Foto inspirasi "${galTitle.trim()}" berhasil ditambahkan.`);
  };

  const handleSaveArticleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!artTitle.trim()) return;

    await saveArticle({
      id: artId || undefined,
      title: artTitle.trim(),
      category: artCat.trim() || 'Tips Pernikahan',
      readTime: artReadTime.trim() || '4 Menit Baca',
      excerpt: artExcerpt.trim() || artContent.slice(0, 140),
      content: artContent.trim() || artExcerpt.trim(),
      imageUrl: artImg.trim() || PRESET_GALLERY_CHOICES[0].url,
      publishedDate: 'Terbaru',
    });
    setArtId(null);
    setArtTitle('');
    setArtExcerpt('');
    setArtContent('');
    showSuccessBanner(`Artikel "${artTitle.trim()}" berhasil disimpan.`);
  };

  const handleStartNewTestimonial = () => {
    setTestiId(null);
    setTestiCoupleName('');
    setTestiEventDate('');
    setTestiVenue('');
    setTestiPackageTaken('Paket Gold');
    setTestiRating(5);
    setTestiReview('');
    setTestiImages([]);
    setIsEditingTestimonial(true);
  };

  const handleStartEditTestimonial = (testi: Testimonial) => {
    setTestiId(testi.id);
    setTestiCoupleName(testi.coupleName);
    setTestiEventDate(testi.eventDate);
    setTestiVenue(testi.venue);
    setTestiPackageTaken(testi.packageTaken);
    setTestiRating(testi.rating);
    setTestiReview(testi.review);
    setTestiImages(testi.images || []);
    setIsEditingTestimonial(true);
  };

  const handleSaveTestimonialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testiCoupleName.trim() || !testiReview.trim()) return;

    const finalDocImages: ProductImage[] =
      testiImages.length > 0
        ? testiImages
        : [
            {
              id: `testi-img-${Date.now()}`,
              url: PRESET_GALLERY_CHOICES[0].url,
              isPrimary: true,
              caption: `Dokumentasi Pernikahan ${testiCoupleName.trim()}`,
            },
          ];

    await saveTestimonial({
      id: testiId || undefined,
      coupleName: testiCoupleName.trim(),
      eventDate: testiEventDate.trim() || 'Tahun Ini',
      venue: testiVenue.trim() || 'Venue Pernikahan',
      packageTaken: testiPackageTaken.trim() || 'Paket Pernikahan Istafa',
      rating: Math.min(5, Math.max(1, Number(testiRating) || 5)),
      review: testiReview.trim(),
      images: finalDocImages,
    });
    setIsEditingTestimonial(false);
    showSuccessBanner(
      `Testimoni & dokumentasi "${testiCoupleName.trim()}" berhasil disimpan.`
    );
  };

  const handleSaveSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateStoreSettings({
      businessName: bizName.trim() || 'ISTAFA Wedding',
      tagline: bizTagline.trim(),
      whatsappNumber: bizWhatsapp.trim(),
      email: bizHours.trim() || settings.email,
      instagram: bizInstagram.trim(),
      address: bizAddress.trim(),
      heroTitle: settings.heroTitle,
      heroSubtitle: settings.heroSubtitle,
      heroImageUrl: settings.heroImageUrl,
      logoText: settings.logoText,
    });
    if (bizUsername.trim()) {
      await updateAdminCredentials(bizUsername.trim(), bizPassword.trim() || undefined);
    }
    showSuccessBanner('Pengaturan toko, nomor WhatsApp & akun login berhasil diperbarui.');
  };

  const handleSaveAreaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!areaCity.trim()) return;

    await saveServiceArea({
      id: areaId || undefined,
      city: areaCity.trim(),
      province: areaShipping.trim() || 'DKI Jakarta & Sekitarnya',
      description: areaCoverage.trim() || 'Gratis Ongkir & Instalasi di Lokasi Acara',
      isPrimary: areaFeatured,
    });
    setAreaId(null);
    setAreaCity('');
    setAreaCoverage('');
    showSuccessBanner(`Area layanan "${areaCity.trim()}" berhasil disimpan.`);
  };

  const handleLoginFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoggingIn(true);
    try {
      const ok = await loginWithCredentials(usernameInput, passwordInput);
      if (!ok) {
        setLoginError('Username atau password salah.');
      } else {
        setUsernameInput('');
        setPasswordInput('');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Dedicated Admin Login Screen if not authenticated
  if (!isAdminAuthenticated) {
    return (
      <section className="min-h-screen bg-[#FBF9F5] py-12 px-4 sm:px-8 flex flex-col items-center justify-center">
        <div className="w-full max-w-md rounded-3xl border border-[#E2D6C1] bg-white p-6 sm:p-9 shadow-xl">
          <div className="flex items-center justify-between pb-5 border-b border-[#EFE7D6]">
            <button
              type="button"
              onClick={onBackToCatalog}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#5C4E3E] hover:text-[#26211D] cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali ke Beranda</span>
            </button>
            <span className="text-[11px] uppercase tracking-widest text-[#9E762C] font-semibold">
              Panel Pengelola Toko
            </span>
          </div>

          <div className="mt-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#F6EFE2] border border-[#E4D5B7] text-[#9E762C] flex items-center justify-center mx-auto mb-3">
              <Lock className="w-6 h-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif-display font-semibold text-[#26211D]">
              Login Admin {settings.businessName}
            </h1>
            <p className="text-xs sm:text-sm text-[#6E6359] mt-1.5 leading-relaxed">
              Masukkan Username dan Password pengelola untuk mengakses Dashboard Admin lengkap.
            </p>
          </div>

          {loginError && (
            <div className="mt-4 rounded-xl bg-[#FDF2F2] border border-[#E8B8B8] px-4 py-3 text-xs text-[#9E3B3B] font-medium">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLoginFormSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#5C4E3E] mb-1.5">
                Username Admin
              </label>
              <div className="relative">
                <UserCheck className="w-4 h-4 text-[#8C7A65] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder="Masukkan username admin"
                  className="w-full rounded-xl border border-[#D8C8AE] bg-[#FCFBF9] pl-10 pr-4 py-2.5 text-sm text-[#26211D] focus:outline-none focus:border-[#9E762C]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#5C4E3E] mb-1.5">
                Password
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-[#8C7A65] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Masukkan password"
                  className="w-full rounded-xl border border-[#D8C8AE] bg-[#FCFBF9] pl-10 pr-4 py-2.5 text-sm text-[#26211D] focus:outline-none focus:border-[#9E762C]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3 px-5 rounded-xl bg-[#26211D] hover:bg-[#3A322C] text-white text-xs sm:text-sm font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              {isLoggingIn ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <LogIn className="w-4 h-4 text-[#D9C296]" />
              )}
              <span>Masuk ke Dashboard Toko</span>
            </button>
          </form>
        </div>
      </section>
    );
  }

  const activeProductsCount = products.filter((p) => p.isActive !== false).length;
  const promoProductsCount = products.filter(
    (p) => p.isPromo || (p.originalPrice && p.originalPrice > p.price)
  ).length;

  return (
    <section className="min-h-screen bg-[#F7F3EB] py-8 sm:py-12 px-4 sm:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Top Admin Bar */}
        <div className="rounded-2xl border border-[#DFD3BE] bg-white p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-start sm:items-center gap-4">
            <button
              type="button"
              onClick={onBackToCatalog}
              className="p-2.5 rounded-xl border border-[#E2D6C1] bg-[#FAF6EE] hover:bg-[#EFE6D5] text-[#26211D] transition-colors shrink-0 cursor-pointer"
              title="Kembali ke Tampilan Pengunjung"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-widest text-[#9E762C]">
                  CMS Studio Pernikahan
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#EEF5F0] text-[#3B5942] text-[11px] font-medium">
                  <ShieldCheck className="w-3 h-3" /> Admin Aktif
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-serif-display font-semibold text-[#26211D]">
                Dashboard Kelola {settings.businessName}
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={logoutAdmin}
              className="px-3.5 py-2 rounded-xl border border-[#E5C5C5] bg-[#FDF7F7] hover:bg-[#F9EBEB] text-xs font-medium text-[#9E3B3B] flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar (Logout)</span>
            </button>

            <button
              type="button"
              onClick={async () => {
                await seedInitialDataToCloud();
                showSuccessBanner('Katalog berhasil dikembalikan ke koleksi contoh awal.');
              }}
              className="px-3.5 py-2 rounded-xl border border-[#DFD3BE] bg-[#FAF6EE] hover:bg-[#F0E6D2] text-xs font-medium text-[#5C4E3E] flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Contoh</span>
            </button>
          </div>
        </div>

        {/* Save confirmation banner */}
        {saveBanner && (
          <div className="mt-4 rounded-xl bg-[#3F5543] text-white px-4 py-3 text-xs sm:text-sm font-medium flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-[#D4E7D7]" />
              <span>{saveBanner}</span>
            </div>
            <button
              type="button"
              onClick={() => setSaveBanner(null)}
              className="text-white/80 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Error banner */}
        {errorBanner && (
          <div className="mt-4 rounded-xl bg-[#9E3B3B] text-white px-4 py-3 text-xs sm:text-sm font-medium flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#FADBD8]" />
              <span>{errorBanner}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorBanner(null)}
              className="text-white/80 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="mt-6 flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-[#26211D] text-white'
                : 'bg-white text-[#5C4E3E] border border-[#E2D6C1] hover:bg-[#FAF6EE]'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Ringkasan & Statistik</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('products')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'products'
                ? 'bg-[#26211D] text-white'
                : 'bg-white text-[#5C4E3E] border border-[#E2D6C1] hover:bg-[#FAF6EE]'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Produk & Layanan ({products.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('categories')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'categories'
                ? 'bg-[#26211D] text-white'
                : 'bg-white text-[#5C4E3E] border border-[#E2D6C1] hover:bg-[#FAF6EE]'
            }`}
          >
            <FolderKanban className="w-4 h-4" />
            <span>Kategori ({categories.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('packages')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'packages'
                ? 'bg-[#26211D] text-white'
                : 'bg-white text-[#5C4E3E] border border-[#E2D6C1] hover:bg-[#FAF6EE]'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Paket ({packages.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('promos')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'promos'
                ? 'bg-[#26211D] text-white'
                : 'bg-white text-[#5C4E3E] border border-[#E2D6C1] hover:bg-[#FAF6EE]'
            }`}
          >
            <Tag className="w-4 h-4" />
            <span>Promo ({promos.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('calendar')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'calendar'
                ? 'bg-[#26211D] text-white'
                : 'bg-white text-[#5C4E3E] border border-[#E2D6C1] hover:bg-[#FAF6EE]'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Kalender Tanggal ({calendarEntries.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('gallery_articles')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'gallery_articles'
                ? 'bg-[#26211D] text-white'
                : 'bg-white text-[#5C4E3E] border border-[#E2D6C1] hover:bg-[#FAF6EE]'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Galeri & Artikel</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('testimonials')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'testimonials'
                ? 'bg-[#26211D] text-white'
                : 'bg-white text-[#5C4E3E] border border-[#E2D6C1] hover:bg-[#FAF6EE]'
            }`}
          >
            <MessageSquareQuote className="w-4 h-4" />
            <span>Testimoni ({testimonials.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('settings_areas')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'settings_areas'
                ? 'bg-[#26211D] text-white'
                : 'bg-white text-[#5C4E3E] border border-[#E2D6C1] hover:bg-[#FAF6EE]'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Pengaturan & Area</span>
          </button>
        </div>

        {/* TAB 0: OVERVIEW & STATISTICS */}
        {activeTab === 'overview' && (
          <div className="mt-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-[#DFD3BE] bg-white p-5">
                <span className="text-xs uppercase tracking-wider text-[#7C6A56]">
                  Total Produk
                </span>
                <p className="text-3xl font-serif-display font-semibold text-[#26211D] font-tabular mt-1">
                  {products.length}
                </p>
                <span className="text-xs text-[#4E6752] mt-1 block">
                  {activeProductsCount} produk aktif ditampilkan
                </span>
              </div>

              <div className="rounded-2xl border border-[#DFD3BE] bg-white p-5">
                <span className="text-xs uppercase tracking-wider text-[#7C6A56]">
                  Total Kategori
                </span>
                <p className="text-3xl font-serif-display font-semibold text-[#26211D] font-tabular mt-1">
                  {categories.length}
                </p>
                <span className="text-xs text-[#6E6359] mt-1 block">
                  Katalog terstruktur
                </span>
              </div>

              <div className="rounded-2xl border border-[#DFD3BE] bg-white p-5">
                <span className="text-xs uppercase tracking-wider text-[#7C6A56]">
                  Produk & Paket Promo
                </span>
                <p className="text-3xl font-serif-display font-semibold text-[#9E762C] font-tabular mt-1">
                  {promoProductsCount + promos.filter((p) => p.isActive).length}
                </p>
                <span className="text-xs text-[#6E6359] mt-1 block">
                  {promoProductsCount} produk diskon · {promos.length} voucher
                </span>
              </div>

              <div className="rounded-2xl border border-[#DFD3BE] bg-white p-5">
                <span className="text-xs uppercase tracking-wider text-[#7C6A56]">
                  Jadwal & Testimoni
                </span>
                <p className="text-3xl font-serif-display font-semibold text-[#26211D] font-tabular mt-1">
                  {calendarEntries.length} / {testimonials.length}
                </p>
                <span className="text-xs text-[#6E6359] mt-1 block">
                  Tanggal diatur & ulasan klien
                </span>
              </div>
            </div>

            {/* Quick Action Cards */}
            <div className="rounded-2xl border border-[#DFD3BE] bg-white p-6">
              <h2 className="text-xl font-serif-display font-semibold text-[#26211D]">
                Aksi Cepat Pengelolaan Website
              </h2>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('products');
                    handleStartNewProduct();
                  }}
                  className="p-4 rounded-xl border border-[#E2D6C1] bg-[#FAF6EE] hover:bg-[#EFE5D2] text-left transition-colors cursor-pointer"
                >
                  <Plus className="w-5 h-5 text-[#9E762C] mb-1.5" />
                  <p className="font-semibold text-sm text-[#26211D]">+ Tambah Produk Baru</p>
                  <p className="text-xs text-[#6E6359] mt-0.5">
                    Upload banyak foto sekaligus, harga promo & varian
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('calendar')}
                  className="p-4 rounded-xl border border-[#E2D6C1] bg-[#FAF6EE] hover:bg-[#EFE5D2] text-left transition-colors cursor-pointer"
                >
                  <Calendar className="w-5 h-5 text-[#9E762C] mb-1.5" />
                  <p className="font-semibold text-sm text-[#26211D]">Atur Kalender Tanggal</p>
                  <p className="text-xs text-[#6E6359] mt-0.5">
                    Tandai tanggal penuh (🔴) atau reservasi (🟡)
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('promos')}
                  className="p-4 rounded-xl border border-[#E2D6C1] bg-[#FAF6EE] hover:bg-[#EFE5D2] text-left transition-colors cursor-pointer"
                >
                  <Tag className="w-5 h-5 text-[#9E762C] mb-1.5" />
                  <p className="font-semibold text-sm text-[#26211D]">Kelola Promo Pernikahan</p>
                  <p className="text-xs text-[#6E6359] mt-0.5">
                    Tambah promo early bird, bonus souvenir & diskon
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('settings_areas')}
                  className="p-4 rounded-xl border border-[#E2D6C1] bg-[#FAF6EE] hover:bg-[#EFE5D2] text-left transition-colors cursor-pointer"
                >
                  <MapPin className="w-5 h-5 text-[#9E762C] mb-1.5" />
                  <p className="font-semibold text-sm text-[#26211D]">Area Layanan & WhatsApp</p>
                  <p className="text-xs text-[#6E6359] mt-0.5">
                    Atur nomor WA ({settings.whatsappNumber}) & ongkir kota
                  </p>
                </button>
              </div>
            </div>

            {/* Recent Consultation Inquiries if any */}
            {inquiries.length > 0 && (
              <div className="rounded-2xl border border-[#DFD3BE] bg-white p-6">
                <h3 className="text-lg font-serif-display font-semibold text-[#26211D] mb-3">
                  Riwayat Permintaan Konsultasi Masuk ({inquiries.length})
                </h3>
                <div className="space-y-2.5">
                  {inquiries.slice(0, 10).map((inq) => (
                    <div
                      key={inq.id}
                      className="rounded-xl border border-[#E6DAC6] bg-[#FCFBF9] p-3.5 flex flex-wrap items-center justify-between gap-2 text-xs"
                    >
                      <div>
                        <span className="font-semibold text-[#26211D] uppercase">
                          [{inq.type}] {inq.coupleName || 'Calon Pengantin'}
                        </span>
                        <span className="text-[#6E6359] ml-2">
                          · Acara: {inq.customerDate || inq.weddingDate || '-'} ·{' '}
                          {inq.guestCount || inq.guestScale || '-'} Tamu
                          {inq.weddingLocation ? ` · Lokasi: ${inq.weddingLocation}` : ''}
                        </span>
                        <p className="text-[#5C4E3E] mt-0.5">
                          {(inq.itemsSummary || []).join(', ')}
                        </p>
                      </div>
                      <span className="font-semibold text-[#9E762C] font-tabular">
                        {formatRupiah(inq.totalEstimate || inq.estimatedTotal || 0)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 1: PRODUCTS MANAGEMENT */}
        {activeTab === 'products' && (
          <div className="mt-6">
            {isEditingProduct ? (
              <form
                onSubmit={handleSaveProductSubmit}
                className="rounded-3xl border border-[#DFD3BE] bg-white p-6 sm:p-8 shadow-xs space-y-6"
              >
                <div className="flex items-center justify-between pb-4 border-b border-[#EAE0CE]">
                  <div>
                    <span className="text-xs uppercase tracking-widest text-[#9E762C] font-semibold">
                      {editingProductId
                        ? 'Edit Produk / Layanan Wedding'
                        : 'Tambah Produk / Layanan Wedding Baru'}
                    </span>
                    <h2 className="text-2xl font-serif-display font-semibold text-[#26211D]">
                      Formulir Produk, Layanan Wedding & Multi-Foto
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditingProduct(false)}
                    className="px-3.5 py-2 rounded-xl border border-[#E2D6C1] text-xs font-medium text-[#5C4E3E] hover:bg-[#FAF6EE] cursor-pointer"
                  >
                    Batal
                  </button>
                </div>

                {/* Basic fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#5C4E3E] mb-1.5">
                      Nama Layanan / Produk *
                    </label>
                    <input
                      type="text"
                      required
                      value={prodName}
                      onChange={(e) => setProdName(e.target.value)}
                      placeholder="Contoh: MUA — Make Up Artist Profesional / Dekorasi Pelaminan"
                      className="w-full rounded-xl border border-[#D8C8AE] bg-[#FCFBF9] px-3.5 py-2.5 text-sm text-[#26211D] focus:outline-none focus:border-[#9E762C]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#5C4E3E] mb-1.5">
                      Kategori *
                    </label>
                    <select
                      value={prodCategory}
                      onChange={(e) => setProdCategory(e.target.value)}
                      className="w-full rounded-xl border border-[#D8C8AE] bg-[#FCFBF9] px-3.5 py-2.5 text-sm text-[#26211D] focus:outline-none focus:border-[#9E762C]"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#5C4E3E] mb-1.5">
                      Stok / Ketersediaan
                    </label>
                    <select
                      value={prodStockStatus}
                      onChange={(e) => setProdStockStatus(e.target.value as any)}
                      className="w-full rounded-xl border border-[#D8C8AE] bg-[#FCFBF9] px-3.5 py-2.5 text-sm text-[#26211D] focus:outline-none focus:border-[#9E762C]"
                    >
                      <option value="Tersedia">Tersedia</option>
                      <option value="Terbatas">Slot Terbatas</option>
                      <option value="Pre-Order">Pre-Order</option>
                      <option value="Habis">Habis / Penuh</option>
                    </select>
                  </div>
                </div>

                {/* Pricing & Promo fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#5C4E3E] mb-1.5">
                      Harga Jual (Rp) *
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={prodPrice}
                      onChange={(e) => setProdPrice(Number(e.target.value))}
                      className="w-full rounded-xl border border-[#D8C8AE] bg-[#FCFBF9] px-3.5 py-2.5 text-sm text-[#26211D] font-tabular focus:outline-none focus:border-[#9E762C]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#5C4E3E] mb-1.5">
                      Harga Coret / Normal (Opsional)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={prodOriginalPrice}
                      onChange={(e) => setProdOriginalPrice(Number(e.target.value))}
                      placeholder="0 jika tidak promo"
                      className="w-full rounded-xl border border-[#D8C8AE] bg-[#FCFBF9] px-3.5 py-2.5 text-sm text-[#26211D] font-tabular focus:outline-none focus:border-[#9E762C]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#5C4E3E] mb-1.5">
                      Satuan & Label Harga
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={prodUnit}
                        onChange={(e) => setProdUnit(e.target.value)}
                        placeholder="Paket / Pcs / Box"
                        className="w-full rounded-xl border border-[#D8C8AE] bg-[#FCFBF9] px-3 py-2.5 text-xs text-[#26211D]"
                      />
                      <input
                        type="text"
                        value={prodPriceLabel}
                        onChange={(e) => setProdPriceLabel(e.target.value)}
                        placeholder="Mulai dari"
                        className="w-full rounded-xl border border-[#D8C8AE] bg-[#FCFBF9] px-3 py-2.5 text-xs text-[#26211D]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#5C4E3E] mb-1.5">
                      Label Promo (Badge)
                    </label>
                    <input
                      type="text"
                      value={prodPromoLabel}
                      onChange={(e) => setProdPromoLabel(e.target.value)}
                      placeholder="Misal: Hemat Rp 2,5 Juta"
                      className="w-full rounded-xl border border-[#D8C8AE] bg-[#FCFBF9] px-3.5 py-2.5 text-sm text-[#26211D]"
                    />
                  </div>
                </div>

                {/* Status checkboxes */}
                <div className="flex flex-wrap items-center gap-5 pt-1">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={prodIsActive}
                      onChange={(e) => setProdIsActive(e.target.checked)}
                      className="w-4 h-4 accent-[#4E6752]"
                    />
                    <span className="text-xs sm:text-sm font-medium text-[#26211D]">
                      Status Aktif (Tampil di Katalog)
                    </span>
                  </label>

                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={prodFeatured}
                      onChange={(e) => setProdFeatured(e.target.checked)}
                      className="w-4 h-4 accent-[#9E762C]"
                    />
                    <span className="text-xs sm:text-sm font-medium text-[#26211D]">
                      Produk Unggulan
                    </span>
                  </label>

                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={prodIsPromo}
                      onChange={(e) => setProdIsPromo(e.target.checked)}
                      className="w-4 h-4 accent-[#9E3B3B]"
                    />
                    <span className="text-xs sm:text-sm font-medium text-[#26211D]">
                      Sedang Promo
                    </span>
                  </label>

                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={prodIsNew}
                      onChange={(e) => setProdIsNew(e.target.checked)}
                      className="w-4 h-4 accent-[#3B5942]"
                    />
                    <span className="text-xs sm:text-sm font-medium text-[#26211D]">
                      Label "Produk Baru"
                    </span>
                  </label>
                </div>

                {/* Short & Full Description */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#5C4E3E] mb-1.5">
                      Deskripsi Singkat (Tampil di Kartu Katalog)
                    </label>
                    <textarea
                      rows={3}
                      value={prodShortDesc}
                      onChange={(e) => setProdShortDesc(e.target.value)}
                      placeholder="Ringkasan daya tarik utama produk dalam 1-2 kalimat..."
                      className="w-full rounded-xl border border-[#D8C8AE] bg-[#FCFBF9] px-3.5 py-2.5 text-sm text-[#26211D] focus:outline-none focus:border-[#9E762C]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#5C4E3E] mb-1.5">
                      Deskripsi Lengkap (Tampil di Halaman Detail)
                    </label>
                    <textarea
                      rows={3}
                      value={prodDescription}
                      onChange={(e) => setProdDescription(e.target.value)}
                      placeholder="Penjelasan menyeluruh tentang konsep, material, ukuran, dan layanan..."
                      className="w-full rounded-xl border border-[#D8C8AE] bg-[#FCFBF9] px-3.5 py-2.5 text-sm text-[#26211D] focus:outline-none focus:border-[#9E762C]"
                    />
                  </div>
                </div>

                {/* Multi-Photo Uploader Section */}
                <MultiPhotoUploader
                  label="GALERI MULTI-FOTO PRODUK (WAJIB BISA BANYAK FOTO)"
                  images={prodImages}
                  onChange={setProdImages}
                  storageFolder="products"
                  productId={editingProductId || 'new-product'}
                />

                {/* Specs, Variants & Sizes */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#5C4E3E] mb-1.5">
                      Fasilitas yang Didapat / Spesifikasi (1 per baris)
                    </label>
                    <textarea
                      rows={4}
                      value={prodSpecsText}
                      onChange={(e) => setProdSpecsText(e.target.value)}
                      placeholder="Makeup pengantin&#10;Hairdo&#10;Touch up&#10;Makeup keluarga&#10;Pendampingan pengantin"
                      className="w-full rounded-xl border border-[#D8C8AE] bg-[#FCFBF9] px-3.5 py-2.5 text-xs sm:text-sm text-[#26211D]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#5C4E3E] mb-1.5">
                      Jenis Pertunjukan / Pilihan Paket / Varian (1 per baris)
                    </label>
                    <textarea
                      rows={4}
                      value={prodVariantsText}
                      onChange={(e) => setProdVariantsText(e.target.value)}
                      placeholder="Tari Penyambutan Pengantin & Prosesi Kirab Adat&#10;Paket Full Wedding Organizer"
                      className="w-full rounded-xl border border-[#D8C8AE] bg-[#FCFBF9] px-3.5 py-2.5 text-xs sm:text-sm text-[#26211D]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#5C4E3E] mb-1.5">
                      Durasi Pertunjukan / Cakupan Layanan / Ukuran (1 per baris)
                    </label>
                    <textarea
                      rows={4}
                      value={prodSizesText}
                      onChange={(e) => setProdSizesText(e.target.value)}
                      placeholder="Durasi Sesi Penuh Prosesi Adat & Resepsi&#10;Pendampingan Penuh Selama Acara"
                      className="w-full rounded-xl border border-[#D8C8AE] bg-[#FCFBF9] px-3.5 py-2.5 text-xs sm:text-sm text-[#26211D]"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-[#EAE0CE] flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsEditingProduct(false)}
                    className="px-5 py-2.5 rounded-xl border border-[#D8C8AE] text-xs sm:text-sm font-medium text-[#5C4E3E] hover:bg-[#FAF6EE] cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingProduct}
                    className="px-6 py-2.5 rounded-xl bg-[#26211D] hover:bg-[#3B332C] text-white text-xs sm:text-sm font-medium flex items-center gap-2 shadow-sm cursor-pointer"
                  >
                    {isSavingProduct ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    <span>Simpan Produk ({prodImages.length || 1} Foto)</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs sm:text-sm text-[#5C4E3E]">
                    Kelola semua produk katalog & 4 Layanan Wedding (MUA, WO, Tim Sanggar, Tim Attire), harga/paket, fasilitas, durasi, promo, dan galeri multi-foto.
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        handleStartNewProduct();
                        setProdCategory('MUA — Make Up Artist');
                        setProdUnit('Paket');
                        setProdPriceLabel('Mulai dari');
                      }}
                      className="px-4 py-2.5 rounded-xl border border-[#C8B282] bg-[#FAF6EE] hover:bg-[#EFE6D5] text-[#26211D] text-xs sm:text-sm font-medium flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-4 h-4 text-[#9E762C]" />
                      <span>Tambah Layanan Wedding</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleStartNewProduct}
                      className="px-5 py-2.5 rounded-xl bg-[#26211D] hover:bg-[#3D352E] text-white text-xs sm:text-sm font-medium flex items-center gap-2 shadow-xs cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Tambah Produk Baru</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {products.map((prod) => {
                    const primary = getPrimaryImage(prod.images);
                    const isActive = prod.isActive !== false;
                    return (
                      <div
                        key={prod.id}
                        className={`rounded-2xl border bg-white overflow-hidden flex flex-col justify-between transition-opacity ${
                          isActive
                            ? 'border-[#DFD3BE]'
                            : 'border-[#D8D0C5] opacity-65'
                        }`}
                      >
                        <div>
                          <div className="relative aspect-[16/10] bg-[#F2ECE1]">
                            <SafeWeddingImage
                              src={primary.url}
                              alt={prod.name}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1">
                              <span className="px-2.5 py-1 rounded-md bg-white/90 text-[#26211D] text-[11px] font-medium">
                                {prod.category}
                              </span>
                              {!isActive && (
                                <span className="px-2 py-1 rounded-md bg-[#26211D]/90 text-white text-[10px] font-semibold">
                                  NONAKTIF
                                </span>
                              )}
                              {prod.isPromo && (
                                <span className="px-2 py-1 rounded-md bg-[#9E3B3B]/90 text-white text-[10px] font-semibold">
                                  PROMO
                                </span>
                              )}
                            </div>
                            <span className="absolute bottom-2.5 right-2.5 px-2.5 py-1 rounded-md bg-[#26211D]/80 text-white text-[11px] font-tabular">
                              {prod.images.length} Foto
                            </span>
                          </div>

                          <div className="p-4">
                            <h3 className="font-serif-display font-semibold text-lg text-[#26211D] line-clamp-1">
                              {prod.name}
                            </h3>
                            <div className="flex items-baseline gap-2 mt-0.5">
                              {prod.originalPrice && prod.originalPrice > prod.price && (
                                <span className="text-xs text-[#8E8071] line-through font-tabular">
                                  {formatRupiah(prod.originalPrice)}
                                </span>
                              )}
                              <p className="text-sm font-semibold text-[#9E762C] font-tabular">
                                {formatRupiah(prod.price)}
                              </p>
                              <span className="text-[11px] text-[#6E6359]">
                                / {prod.unit || 'Paket'}
                              </span>
                            </div>
                            <p className="text-xs text-[#6E6359] mt-2 line-clamp-2">
                              {prod.shortDescription}
                            </p>
                          </div>
                        </div>

                        <div className="p-4 pt-2 border-t border-[#F0E9DA] flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleStartEditProduct(prod)}
                              className="px-3 py-1.5 rounded-lg bg-[#FAF6EE] hover:bg-[#EFE5D2] text-[#26211D] text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-[#9E762C]" />
                              <span>Edit ({prod.images.length} Foto)</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => toggleProductActive(prod.id)}
                              title={isActive ? 'Nonaktifkan Produk' : 'Aktifkan Produk'}
                              className={`p-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                                isActive
                                  ? 'bg-[#EEF5F0] text-[#35543D]'
                                  : 'bg-[#F4EFE6] text-[#6E6359]'
                              }`}
                            >
                              {isActive ? (
                                <Eye className="w-3.5 h-3.5" />
                              ) : (
                                <EyeOff className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => deleteProduct(prod.id)}
                            className="p-1.5 rounded-lg text-[#9E3B3B] hover:bg-[#FDF2F2] transition-colors cursor-pointer"
                            title="Hapus Produk"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: CATEGORIES MANAGEMENT */}
        {activeTab === 'categories' && (
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
            <form
              onSubmit={handleSaveCategorySubmit}
              className="lg:col-span-5 rounded-3xl border border-[#DFD3BE] bg-white p-6 space-y-4 h-fit"
            >
              <h2 className="text-xl font-serif-display font-semibold text-[#26211D]">
                {catId ? 'Edit Kategori' : 'Tambah Kategori Baru'}
              </h2>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#5C4E3E] mb-1">
                  Nama Kategori *
                </label>
                <input
                  type="text"
                  required
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="Contoh: Seserahan / Makeup / Busana"
                  className="w-full rounded-xl border border-[#D8C8AE] bg-[#FCFBF9] px-3.5 py-2 text-sm text-[#26211D]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#5C4E3E] mb-1">
                  Sub-judul Singkat
                </label>
                <input
                  type="text"
                  value={catSubtitle}
                  onChange={(e) => setCatSubtitle(e.target.value)}
                  placeholder="Contoh: Hantaran Akrilik & Box Beludru"
                  className="w-full rounded-xl border border-[#D8C8AE] bg-[#FCFBF9] px-3.5 py-2 text-sm text-[#26211D]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#5C4E3E] mb-1">
                  Ikon Kategori
                </label>
                <select
                  value={catIconName}
                  onChange={(e) => setCatIconName(e.target.value)}
                  className="w-full rounded-xl border border-[#D8C8AE] bg-[#FCFBF9] px-3.5 py-2 text-sm text-[#26211D]"
                >
                  <option value="Flower2">Bunga / Dekorasi (Flower2)</option>
                  <option value="Tent">Tenda (Tent)</option>
                  <option value="MailOpen">Undangan (MailOpen)</option>
                  <option value="Gift">Souvenir & Seserahan (Gift)</option>
                  <option value="Gem">Mahar / Cincin (Gem)</option>
                  <option value="Camera">Dokumentasi Foto/Video (Camera)</option>
                  <option value="Sparkles">Paket Wedding / Makeup (Sparkles)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#5C4E3E] mb-1.5">
                  Foto Sampul Kategori
                </label>
                <div className="rounded-2xl border border-[#D8C8AE] bg-[#FAF6EE] p-3 space-y-3">
                  <div className="relative aspect-[16/9] w-full rounded-xl overflow-hidden bg-[#EFE6D5] border border-[#E2D6C1]">
                    <SafeWeddingImage
                      src={catImageUrl}
                      alt={catName || 'Foto Sampul Kategori'}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <label className="w-full py-2.5 px-4 rounded-xl border-2 border-dashed border-[#C8B282] bg-white hover:bg-[#F6EFE2] text-[#26211D] text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer">
                    {isUploadingCategoryFile ? (
                      <>
                        <Loader2 className="w-4 h-4 text-[#9E762C] animate-spin" />
                        <span>Mengunggah Foto dari Galeri...</span>
                      </>
                    ) : (
                      <>
                        <Camera className="w-4 h-4 text-[#9E762C]" />
                        <span>Ambil Foto dari Galeri HP / Komputer</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleCategoryFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
              <div className="flex gap-2">
                {catId && (
                  <button
                    type="button"
                    onClick={() => {
                      setCatId(null);
                      setCatName('');
                      setCatSubtitle('');
                    }}
                    className="px-4 py-2.5 rounded-xl border border-[#D8C8AE] text-xs font-medium text-[#5C4E3E] cursor-pointer"
                  >
                    Batal
                  </button>
                )}
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#26211D] hover:bg-[#3A322C] text-white text-xs sm:text-sm font-medium cursor-pointer"
                >
                  {catId ? 'Simpan Perubahan' : '+ Simpan Kategori'}
                </button>
              </div>
            </form>

            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="rounded-2xl border border-[#DFD3BE] bg-white p-4 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <SafeWeddingImage
                      src={cat.coverImageUrl}
                      alt={cat.name}
                      className="w-14 h-14 rounded-xl object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <h3 className="font-serif-display font-semibold text-base text-[#26211D] truncate">
                        {cat.name}
                      </h3>
                      <p className="text-xs text-[#6E6359] truncate">{cat.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setCatId(cat.id);
                        setCatName(cat.name);
                        setCatSubtitle(cat.description);
                        setCatImageUrl(cat.coverImageUrl);
                        setCatIconName(cat.iconName);
                      }}
                      className="p-2 rounded-lg text-[#5C4E3E] hover:bg-[#FAF6EE] cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteCategory(cat.id)}
                      className="p-2 rounded-lg text-[#9E3B3B] hover:bg-[#FDF2F2] cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: PACKAGES MANAGEMENT */}
        {activeTab === 'packages' && (
          <div className="mt-6">
            {isEditingPackage ? (
              <form
                onSubmit={handleSavePackageSubmit}
                className="rounded-3xl border border-[#DFD3BE] bg-white p-6 sm:p-8 space-y-5"
              >
                <div className="flex items-center justify-between pb-4 border-b border-[#EAE0CE]">
                  <h2 className="text-2xl font-serif-display font-semibold text-[#26211D]">
                    {pkgId ? 'Edit Paket Pernikahan' : 'Tambah Paket Pernikahan'}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setIsEditingPackage(false)}
                    className="px-3.5 py-1.5 rounded-xl border border-[#D8C8AE] text-xs font-medium cursor-pointer"
                  >
                    Batal
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="lg:col-span-2">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#5C4E3E] mb-1">
                      Nama Paket *
                    </label>
                    <input
                      type="text"
                      required
                      value={pkgName}
                      onChange={(e) => setPkgName(e.target.value)}
                      placeholder="Contoh: Paket Gold — Royal Champagne"
                      className="w-full rounded-xl border border-[#D8C8AE] bg-[#FCFBF9] px-3.5 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#5C4E3E] mb-1">
                      Tier Paket
                    </label>
                    <select
                      value={pkgTier}
                      onChange={(e) => setPkgTier(e.target.value)}
                      className="w-full rounded-xl border border-[#D8C8AE] bg-[#FCFBF9] px-3.5 py-2 text-sm"
                    >
                      <option value="Paket Hemat">Paket Hemat</option>
                      <option value="Paket Elegant">Paket Elegant</option>
                      <option value="Paket Premium">Paket Premium</option>
                      <option value="Paket Custom">Paket Custom</option>
                      <option value="Paket Silver">Paket Silver</option>
                      <option value="Paket Gold">Paket Gold</option>
                      <option value="Paket Exclusive">Paket Exclusive</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#5C4E3E] mb-1">
                      Harga Paket (Rp)
                    </label>
                    <input
                      type="number"
                      value={pkgPrice}
                      onChange={(e) => setPkgPrice(Number(e.target.value))}
                      className="w-full rounded-xl border border-[#D8C8AE] bg-[#FCFBF9] px-3.5 py-2 text-sm font-tabular"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#5C4E3E] mb-1">
                      Harga Coret (Rp)
                    </label>
                    <input
                      type="number"
                      value={pkgOriginalPrice}
                      onChange={(e) => setPkgOriginalPrice(Number(e.target.value))}
                      className="w-full rounded-xl border border-[#D8C8AE] bg-[#FCFBF9] px-3.5 py-2 text-sm font-tabular"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#5C4E3E] mb-1">
                      Kapasitas Tamu
                    </label>
                    <input
                      type="text"
                      value={pkgCapacity}
                      onChange={(e) => setPkgCapacity(e.target.value)}
                      placeholder="Contoh: 300 - 500 Tamu"
                      className="w-full rounded-xl border border-[#D8C8AE] bg-[#FCFBF9] px-3.5 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#5C4E3E] mb-1">
                      Label Promo Paket (Opsional)
                    </label>
                    <input
                      type="text"
                      value={pkgPromoLabel}
                      onChange={(e) => setPkgPromoLabel(e.target.value)}
                      placeholder="Contoh: Hemat Rp 4 Juta"
                      className="w-full rounded-xl border border-[#D8C8AE] bg-[#FCFBF9] px-3.5 py-2 text-sm"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-4 pt-5">
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pkgIsActive}
                        onChange={(e) => setPkgIsActive(e.target.checked)}
                        className="w-4 h-4 accent-[#4E6752]"
                      />
                      <span className="text-xs sm:text-sm font-medium text-[#26211D]">
                        Status Aktif
                      </span>
                    </label>
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pkgPopular}
                        onChange={(e) => setPkgPopular(e.target.checked)}
                        className="w-4 h-4 accent-[#9E762C]"
                      />
                      <span className="text-xs sm:text-sm font-medium text-[#26211D]">
                        Terfavorit
                      </span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#5C4E3E] mb-1">
                    Deskripsi Paket
                  </label>
                  <textarea
                    rows={2}
                    value={pkgDescription}
                    onChange={(e) => setPkgDescription(e.target.value)}
                    className="w-full rounded-xl border border-[#D8C8AE] bg-[#FCFBF9] px-3.5 py-2 text-sm"
                  />
                </div>

                <MultiPhotoUploader
                  label="GALERI FOTO PAKET PERNIKAHAN"
                  images={pkgImages}
                  onChange={setPkgImages}
                  storageFolder="packages"
                />

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#5C4E3E] mb-1">
                    Daftar Rincian Item Paket (1 item per baris)
                  </label>
                  <textarea
                    rows={5}
                    value={pkgInclusionsText}
                    onChange={(e) => setPkgInclusionsText(e.target.value)}
                    className="w-full rounded-xl border border-[#D8C8AE] bg-[#FCFBF9] px-3.5 py-2 text-sm"
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-[#26211D] text-white text-xs sm:text-sm font-medium cursor-pointer"
                  >
                    Simpan Paket Wedding
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-xs sm:text-sm text-[#5C4E3E]">
                    Kelola Paket Hemat, Paket Silver, Paket Gold, dan Paket Exclusive.
                  </p>
                  <button
                    type="button"
                    onClick={handleStartNewPackage}
                    className="px-4 py-2.5 rounded-xl bg-[#26211D] text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tambah Paket Baru</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {packages.map((pkg) => (
                    <div
                      key={pkg.id}
                      className="rounded-2xl border border-[#DFD3BE] bg-white p-5 flex flex-col justify-between gap-4"
                    >
                      <div>
                        <div className="flex items-center justify-between text-xs text-[#9E762C] font-semibold uppercase">
                          <span>{pkg.tier}</span>
                          <span>{pkg.images.length} Foto</span>
                        </div>
                        <h3 className="text-xl font-serif-display font-semibold text-[#26211D] mt-1">
                          {pkg.name}
                        </h3>
                        <p className="text-lg font-semibold text-[#9E762C] font-tabular">
                          {formatRupiah(pkg.price)}
                        </p>
                        <p className="text-xs text-[#6E6359] mt-2 line-clamp-2">
                          {pkg.description}
                        </p>
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-[#F0E9DA]">
                        <button
                          type="button"
                          onClick={() => handleStartEditPackage(pkg)}
                          className="px-3.5 py-1.5 rounded-lg bg-[#FAF6EE] hover:bg-[#EFE5D2] text-xs font-medium text-[#26211D] flex items-center gap-1.5 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-[#9E762C]" />
                          <span>Edit Paket & Foto</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => deletePackage(pkg.id)}
                          className="p-1.5 rounded-lg text-[#9E3B3B] hover:bg-[#FDF2F2] cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: PROMOS MANAGEMENT */}
        {activeTab === 'promos' && (
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
            <form
              onSubmit={handleSavePromoSubmit}
              className="lg:col-span-5 rounded-3xl border border-[#DFD3BE] bg-white p-6 space-y-4 h-fit"
            >
              <h2 className="text-xl font-serif-display font-semibold text-[#26211D]">
                {promoId ? 'Edit Promo Pernikahan' : 'Tambah Promo Baru'}
              </h2>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#5C4E3E] mb-1">
                  Judul Promo *
                </label>
                <input
                  type="text"
                  required
                  value={promoTitle}
                  onChange={(e) => setPromoTitle(e.target.value)}
                  placeholder="Contoh: Promo Early Bird Booking 2025"
                  className="w-full rounded-xl border border-[#D8C8AE] bg-[#FCFBF9] px-3.5 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#5C4E3E] mb-1">
                    Label Diskon / Bonus *
                  </label>
                  <input
                    type="text"
                    required
                    value={promoDiscount}
                    onChange={(e) => setPromoDiscount(e.target.value)}
                    placeholder="Hemat Rp 3.500.000"
                    className="w-full rounded-xl border border-[#D8C8AE] bg-[#FCFBF9] px-3.5 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#5C4E3E] mb-1">
                    Kode Promo (Opsional)
                  </label>
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    placeholder="ISTAFABRIDE25"
                    className="w-full rounded-xl border border-[#D8C8AE] bg-[#FCFBF9] px-3.5 py-2 text-xs font-tabular"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#5C4E3E] mb-1">
                  Berlaku Hingga
                </label>
                <input
                  type="text"
                  value={promoValidUntil}
                  onChange={(e) => setPromoValidUntil(e.target.value)}
                  placeholder="31 Desember 2025"
                  className="w-full rounded-xl border border-[#D8C8AE] bg-[#FCFBF9] px-3.5 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#5C4E3E] mb-1">
                  Deskripsi Ketentuan Promo
                </label>
                <textarea
                  rows={3}
                  value={promoDesc}
                  onChange={(e) => setPromoDesc(e.target.value)}
                  className="w-full rounded-xl border border-[#D8C8AE] bg-[#FCFBF9] px-3.5 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#5C4E3E] mb-1.5">
                  Foto / Banner Promo
                </label>
                <div className="rounded-2xl border border-[#D8C8AE] bg-[#FAF6EE] p-3 space-y-2.5">
                  <div className="relative aspect-[16/9] w-full rounded-xl overflow-hidden bg-[#EFE6D5] border border-[#E2D6C1]">
                    <SafeWeddingImage
                      src={promoImg}
                      alt={promoTitle || 'Banner Promo'}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <label className="w-full py-2.5 px-4 rounded-xl border-2 border-dashed border-[#C8B282] bg-white hover:bg-[#F6EFE2] text-[#26211D] text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer">
                    {isUploadingPromoFile ? (
                      <>
                        <Loader2 className="w-4 h-4 text-[#9E762C] animate-spin" />
                        <span>Mengunggah Foto dari Galeri...</span>
                      </>
                    ) : (
                      <>
                        <Camera className="w-4 h-4 text-[#9E762C]" />
                        <span>Ambil Foto dari Galeri HP / Komputer</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePromoFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[#26211D] text-white text-xs sm:text-sm font-medium cursor-pointer"
              >
                {promoId ? 'Simpan Perubahan Promo' : '+ Tambah Promo'}
              </button>
            </form>

            <div className="lg:col-span-7 space-y-3.5">
              {promos.map((pr) => (
                <div
                  key={pr.id}
                  className="rounded-2xl border border-[#DFD3BE] bg-white p-4 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <SafeWeddingImage
                      src={pr.imageUrl}
                      alt={pr.title}
                      className="w-16 h-16 rounded-xl object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <span className="text-[11px] font-semibold text-[#9E3B3B] uppercase">
                        {pr.badgeText || 'Promo'} · {formatRupiah(pr.promoPrice)}
                      </span>
                      <h3 className="font-serif-display font-semibold text-base text-[#26211D] truncate">
                        {pr.title}
                      </h3>
                      <p className="text-xs text-[#6E6359] truncate">{pr.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setPromoId(pr.id);
                        setPromoTitle(pr.title);
                        setPromoSub('');
                        setPromoDiscount(pr.badgeText || 'Promo Spesial');
                        setPromoCode('');
                        setPromoValidUntil(pr.endDate);
                        setPromoDesc(pr.description);
                        setPromoImg(pr.imageUrl);
                        setPromoActive(pr.isActive);
                      }}
                      className="p-2 rounded-lg text-[#5C4E3E] hover:bg-[#FAF6EE] cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deletePromo(pr.id)}
                      className="p-2 rounded-lg text-[#9E3B3B] hover:bg-[#FDF2F2] cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: CALENDAR AVAILABILITY MANAGEMENT */}
        {activeTab === 'calendar' && (
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
            <form
              onSubmit={handleSaveCalendarSubmit}
              className="lg:col-span-5 rounded-3xl border border-[#DFD3BE] bg-white p-6 space-y-4 h-fit"
            >
              <h2 className="text-xl font-serif-display font-semibold text-[#26211D]">
                Atur Ketersediaan Tanggal Acara
              </h2>
              <p className="text-xs text-[#6E6359]">
                Tandai tanggal 🟢 Tersedia, 🟡 Sudah ada reservasi, atau 🔴 Tidak tersedia (Full Booked).
              </p>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#5C4E3E] mb-1">
                  Pilih Tanggal *
                </label>
                <input
                  type="date"
                  required
                  value={calDate}
                  onChange={(e) => setCalDate(e.target.value)}
                  className="w-full rounded-xl border border-[#D8C8AE] bg-[#FCFBF9] px-3.5 py-2 text-sm font-tabular"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#5C4E3E] mb-1">
                  Status Ketersediaan *
                </label>
                <select
                  value={calStatus}
                  onChange={(e) => {
                    const s = e.target.value as CalendarDateStatus;
                    setCalStatus(s);
                    setCalLabel(
                      s === 'unavailable'
                        ? 'Tidak Tersedia (Full Booked)'
                        : s === 'reserved'
                        ? 'Sudah Ada Reservasi (Sisa 1 Slot)'
                        : 'Tersedia untuk Booking'
                    );
                  }}
                  className="w-full rounded-xl border border-[#D8C8AE] bg-[#FCFBF9] px-3.5 py-2 text-sm"
                >
                  <option value="available">🟢 Tersedia</option>
                  <option value="reserved">🟡 Sudah Ada Reservasi (Terbatas)</option>
                  <option value="unavailable">🔴 Tidak Tersedia (Full Booked)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#5C4E3E] mb-1">
                  Keterangan Publik (Tampil ke Pengunjung)
                </label>
                <input
                  type="text"
                  value={calLabel}
                  onChange={(e) => setCalLabel(e.target.value)}
                  placeholder="Misal: Sisa 1 Slot Dekorasi Malam"
                  className="w-full rounded-xl border border-[#D8C8AE] bg-[#FCFBF9] px-3.5 py-2 text-xs"
                />
              </div>

              <div className="pt-2 border-t border-[#EFE7D6] space-y-3">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#9E762C] block">
                  Catatan Internal Admin (Rahasia / Tidak Tampil ke Publik)
                </span>
                <input
                  type="text"
                  value={calClientName}
                  onChange={(e) => setCalClientName(e.target.value)}
                  placeholder="Nama Klien Booking (Opsional)"
                  className="w-full rounded-xl border border-[#D8C8AE] bg-[#FCFBF9] px-3.5 py-2 text-xs"
                />
                <input
                  type="text"
                  value={calNotes}
                  onChange={(e) => setCalNotes(e.target.value)}
                  placeholder="Catatan Gedung / Paket Klien"
                  className="w-full rounded-xl border border-[#D8C8AE] bg-[#FCFBF9] px-3.5 py-2 text-xs"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[#26211D] text-white text-xs sm:text-sm font-medium cursor-pointer"
              >
                Simpan Status Tanggal
              </button>
            </form>

            <div className="lg:col-span-7 space-y-3">
              {calendarEntries.map((entry) => {
                const priv = calendarPrivateNotes.find((p) => p.date === entry.date);
                return (
                  <div
                    key={entry.date}
                    className="rounded-2xl border border-[#DFD3BE] bg-white p-4 flex items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-tabular font-semibold text-sm text-[#26211D]">
                          {entry.date}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                            entry.status === 'unavailable'
                              ? 'bg-[#FDF2F2] text-[#9E3B3B]'
                              : entry.status === 'reserved'
                              ? 'bg-[#FFF9EB] text-[#9E762C]'
                              : 'bg-[#EEF5F0] text-[#35543D]'
                          }`}
                        >
                          {entry.status === 'unavailable'
                            ? '🔴 Tidak Tersedia'
                            : entry.status === 'reserved'
                            ? '🟡 Reservasi'
                            : '🟢 Tersedia'}
                        </span>
                      </div>
                      <p className="text-xs text-[#5C4E3E] mt-1">{entry.publicNote}</p>
                      {priv && (priv.clientName || priv.privateNote) && (
                        <p className="text-[11px] text-[#9E762C] mt-1">
                          🔒 Internal: {priv.clientName} — {priv.privateNote}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteCalendarDate(entry.date)}
                      className="p-2 rounded-lg text-[#9E3B3B] hover:bg-[#FDF2F2] cursor-pointer"
                      title="Kembalikan ke Tersedia Normal"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 6: GALLERY & ARTICLES MANAGEMENT */}
        {activeTab === 'gallery_articles' && (
          <div className="mt-6 space-y-10">
            {/* Gallery Section */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <form
                onSubmit={handleSaveGallerySubmit}
                className="lg:col-span-5 rounded-3xl border border-[#DFD3BE] bg-white p-6 space-y-4 h-fit"
              >
                <h2 className="text-xl font-serif-display font-semibold text-[#26211D]">
                  Tambah Foto Galeri Inspirasi
                </h2>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#5C4E3E] mb-1">
                    Judul Foto *
                  </label>
                  <input
                    type="text"
                    required
                    value={galTitle}
                    onChange={(e) => setGalTitle(e.target.value)}
                    placeholder="Contoh: Pelaminan Royal Champagne"
                    className="w-full rounded-xl border border-[#D8C8AE] bg-[#FCFBF9] px-3.5 py-2 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#5C4E3E] mb-1">
                      Kategori Galeri
                    </label>
                    <select
                      value={galCategory}
                      onChange={(e) => setGalCategory(e.target.value)}
                      className="w-full rounded-xl border border-[#D8C8AE] bg-[#FCFBF9] px-3.5 py-2 text-sm"
                    >
                      {GALLERY_CATEGORIES.filter((c) => c !== 'Semua').map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#5C4E3E] mb-1">
                      Orientasi
                    </label>
                    <select
                      value={galAspect}
                      onChange={(e) => setGalAspect(e.target.value as any)}
                      className="w-full rounded-xl border border-[#D8C8AE] bg-[#FCFBF9] px-3.5 py-2 text-sm"
                    >
                      <option value="landscape">Mendatar</option>
                      <option value="portrait">Tegak</option>
                      <option value="square">Persegi</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#5C4E3E] mb-1.5">
                    Foto Dokumentasi / Galeri
                  </label>
                  <div className="rounded-2xl border border-[#D8C8AE] bg-[#FAF6EE] p-3 space-y-2.5">
                    <div className="relative aspect-[16/9] w-full rounded-xl overflow-hidden bg-[#EFE6D5] border border-[#E2D6C1]">
                      <SafeWeddingImage
                        src={galImageUrl}
                        alt={galTitle || 'Preview Foto Galeri'}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <label className="w-full py-2.5 px-4 rounded-xl border-2 border-dashed border-[#C8B282] bg-white hover:bg-[#F6EFE2] text-[#26211D] text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer">
                      {isUploadingGalleryFile ? (
                        <>
                          <Loader2 className="w-4 h-4 text-[#9E762C] animate-spin" />
                          <span>Mengoptimalkan & Mengunggah Foto...</span>
                        </>
                      ) : (
                        <>
                          <Camera className="w-4 h-4 text-[#9E762C]" />
                          <span>Ambil Foto dari Galeri HP / Komputer</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleGalleryFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#5C4E3E] mb-1">
                    Keterangan Singkat
                  </label>
                  <textarea
                    rows={2}
                    value={galCaption}
                    onChange={(e) => setGalCaption(e.target.value)}
                    className="w-full rounded-xl border border-[#D8C8AE] bg-[#FCFBF9] px-3.5 py-2 text-xs"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-[#26211D] text-white text-xs sm:text-sm font-medium cursor-pointer"
                >
                  + Tambahkan ke Galeri
                </button>
              </form>

              <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-4">
                {gallery.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-[#DFD3BE] bg-white overflow-hidden flex flex-col justify-between"
                  >
                    <div className="aspect-[4/3] bg-[#F2ECE1]">
                      <SafeWeddingImage
                        src={item.imageUrl}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-3 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-[10px] uppercase text-[#9E762C] font-semibold block">
                          {item.category}
                        </span>
                        <h4 className="text-xs font-semibold text-[#26211D] truncate">
                          {item.title}
                        </h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteGalleryItem(item.id)}
                        className="p-1.5 rounded-lg text-[#9E3B3B] hover:bg-[#FDF2F2] shrink-0 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Inspiration Articles Section */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-6 border-t border-[#DFD3BE]">
              <form
                onSubmit={handleSaveArticleSubmit}
                className="lg:col-span-5 rounded-3xl border border-[#DFD3BE] bg-white p-6 space-y-4 h-fit"
              >
                <h2 className="text-xl font-serif-display font-semibold text-[#26211D]">
                  {artId ? 'Edit Artikel Inspirasi' : 'Tulis Artikel Inspirasi Baru'}
                </h2>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#5C4E3E] mb-1">
                    Judul Artikel *
                  </label>
                  <input
                    type="text"
                    required
                    value={artTitle}
                    onChange={(e) => setArtTitle(e.target.value)}
                    placeholder="Contoh: Tips Memilih Dekorasi Pelaminan..."
                    className="w-full rounded-xl border border-[#D8C8AE] bg-[#FCFBF9] px-3.5 py-2 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={artCat}
                    onChange={(e) => setArtCat(e.target.value)}
                    placeholder="Kategori (Tips Dekorasi)"
                    className="w-full rounded-xl border border-[#D8C8AE] bg-[#FCFBF9] px-3.5 py-2 text-xs"
                  />
                  <input
                    type="text"
                    value={artReadTime}
                    onChange={(e) => setArtReadTime(e.target.value)}
                    placeholder="4 Menit Baca"
                    className="w-full rounded-xl border border-[#D8C8AE] bg-[#FCFBF9] px-3.5 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#5C4E3E] mb-1">
                    Isi Artikel Lengkap (Pisahkan paragraf dengan baris baru)
                  </label>
                  <textarea
                    rows={4}
                    value={artContent}
                    onChange={(e) => setArtContent(e.target.value)}
                    className="w-full rounded-xl border border-[#D8C8AE] bg-[#FCFBF9] px-3.5 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#5C4E3E] mb-1.5">
                    Foto Sampul Artikel
                  </label>
                  <div className="rounded-2xl border border-[#D8C8AE] bg-[#FAF6EE] p-3 space-y-2.5">
                    <div className="relative aspect-[16/9] w-full rounded-xl overflow-hidden bg-[#EFE6D5] border border-[#E2D6C1]">
                      <SafeWeddingImage
                        src={artImg}
                        alt={artTitle || 'Foto Sampul Artikel'}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <label className="w-full py-2.5 px-4 rounded-xl border-2 border-dashed border-[#C8B282] bg-white hover:bg-[#F6EFE2] text-[#26211D] text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer">
                      {isUploadingArticleFile ? (
                        <>
                          <Loader2 className="w-4 h-4 text-[#9E762C] animate-spin" />
                          <span>Mengunggah Foto dari Galeri...</span>
                        </>
                      ) : (
                        <>
                          <Camera className="w-4 h-4 text-[#9E762C]" />
                          <span>Ambil Foto dari Galeri HP / Komputer</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleArticleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-[#26211D] text-white text-xs sm:text-sm font-medium cursor-pointer"
                >
                  Simpan Artikel Inspirasi
                </button>
              </form>

              <div className="lg:col-span-7 space-y-3">
                {articles.map((art) => (
                  <div
                    key={art.id}
                    className="rounded-2xl border border-[#DFD3BE] bg-white p-4 flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <span className="text-[11px] font-semibold text-[#9E762C] uppercase">
                        {art.category} · {art.readTime}
                      </span>
                      <h4 className="font-serif-display font-semibold text-base text-[#26211D] truncate">
                        {art.title}
                      </h4>
                      <p className="text-xs text-[#6E6359] truncate">{art.excerpt}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setArtId(art.id);
                          setArtTitle(art.title);
                          setArtCat(art.category);
                          setArtReadTime(art.readTime);
                          setArtExcerpt(art.excerpt);
                          setArtContent(art.content);
                          setArtImg(art.imageUrl);
                        }}
                        className="p-2 rounded-lg text-[#5C4E3E] hover:bg-[#FAF6EE] cursor-pointer"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteArticle(art.id)}
                        className="p-2 rounded-lg text-[#9E3B3B] hover:bg-[#FDF2F2] cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: TESTIMONIALS & DOCUMENTATION MANAGEMENT */}
        {activeTab === 'testimonials' && (
          <div className="mt-6">
            {isEditingTestimonial ? (
              <form
                onSubmit={handleSaveTestimonialSubmit}
                className="rounded-3xl border border-[#DFD3BE] bg-white p-6 sm:p-8 space-y-5"
              >
                <div className="flex items-center justify-between pb-4 border-b border-[#EAE0CE]">
                  <h2 className="text-2xl font-serif-display font-semibold text-[#26211D]">
                    {testiId ? 'Edit Testimoni & Dokumentasi' : 'Tambah Testimoni Klien'}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setIsEditingTestimonial(false)}
                    className="px-3.5 py-1.5 rounded-xl border border-[#D8C8AE] text-xs font-medium cursor-pointer"
                  >
                    Batal
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#5C4E3E] mb-1">
                      Nama Pasangan *
                    </label>
                    <input
                      type="text"
                      required
                      value={testiCoupleName}
                      onChange={(e) => setTestiCoupleName(e.target.value)}
                      placeholder="Nabila & Reza"
                      className="w-full rounded-xl border border-[#D8C8AE] bg-[#FCFBF9] px-3.5 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#5C4E3E] mb-1">
                      Bulan / Tanggal Acara
                    </label>
                    <input
                      type="text"
                      value={testiEventDate}
                      onChange={(e) => setTestiEventDate(e.target.value)}
                      placeholder="Januari 2025"
                      className="w-full rounded-xl border border-[#D8C8AE] bg-[#FCFBF9] px-3.5 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#5C4E3E] mb-1">
                      Lokasi / Venue
                    </label>
                    <input
                      type="text"
                      value={testiVenue}
                      onChange={(e) => setTestiVenue(e.target.value)}
                      placeholder="Grand Ballroom Jakarta"
                      className="w-full rounded-xl border border-[#D8C8AE] bg-[#FCFBF9] px-3.5 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#5C4E3E] mb-1">
                      Rating Bintang (1 - 5)
                    </label>
                    <select
                      value={testiRating}
                      onChange={(e) => setTestiRating(Number(e.target.value))}
                      className="w-full rounded-xl border border-[#D8C8AE] bg-[#FCFBF9] px-3.5 py-2 text-sm"
                    >
                      <option value={5}>★★★★★ (5.0 Sempurna)</option>
                      <option value={4}>★★★★☆ (4.0 Sangat Puas)</option>
                      <option value={3}>★★★☆☆ (3.0 Baik)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#5C4E3E] mb-1">
                    Ulasan / Testimoni Pengantin *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={testiReview}
                    onChange={(e) => setTestiReview(e.target.value)}
                    className="w-full rounded-xl border border-[#D8C8AE] bg-[#FCFBF9] px-3.5 py-2 text-sm"
                  />
                </div>

                <MultiPhotoUploader
                  label="ALBUM FOTO DOKUMENTASI ACARA KLIEN"
                  images={testiImages}
                  onChange={setTestiImages}
                  storageFolder="testimonials"
                />

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-[#26211D] text-white text-xs sm:text-sm font-medium cursor-pointer"
                  >
                    Simpan Testimoni & Dokumentasi
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-xs sm:text-sm text-[#5C4E3E]">
                    Kelola ulasan klien, rating bintang, dan album dokumentasi.
                  </p>
                  <button
                    type="button"
                    onClick={handleStartNewTestimonial}
                    className="px-4 py-2.5 rounded-xl bg-[#26211D] text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tambah Testimoni Klien</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {testimonials.map((item) => {
                    const cover = getPrimaryImage(item.images);
                    return (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-[#DFD3BE] bg-white overflow-hidden flex flex-col justify-between"
                      >
                        <div>
                          <div className="relative aspect-[16/10] bg-[#F2ECE1]">
                            <SafeWeddingImage
                              src={cover.url}
                              alt={item.coupleName}
                              className="w-full h-full object-cover"
                            />
                            <span className="absolute bottom-2.5 right-2.5 px-2.5 py-1 rounded-md bg-[#26211D]/80 text-white text-[11px] font-tabular">
                              {item.images?.length || 1} Foto
                            </span>
                          </div>
                          <div className="p-4">
                            <div className="flex items-center gap-0.5 text-[#C69320] mb-1">
                              {Array.from({ length: item.rating }).map((_, idx) => (
                                <Star key={idx} className="w-3.5 h-3.5 fill-[#C69320]" />
                              ))}
                            </div>
                            <h3 className="font-serif-display font-semibold text-xl text-[#26211D]">
                              {item.coupleName}
                            </h3>
                            <p className="text-xs text-[#6E6359] mt-2 line-clamp-3 italic">
                              “{item.review}”
                            </p>
                          </div>
                        </div>
                        <div className="p-4 pt-2 border-t border-[#F0E9DA] flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => handleStartEditTestimonial(item)}
                            className="px-3 py-1.5 rounded-lg bg-[#FAF6EE] text-xs font-medium text-[#26211D] flex items-center gap-1.5 cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-[#9E762C]" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteTestimonial(item.id)}
                            className="p-1.5 rounded-lg text-[#9E3B3B] hover:bg-[#FDF2F2] cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 8: STORE SETTINGS & SERVICE AREAS */}
        {activeTab === 'settings_areas' && (
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Store Settings Form */}
            <form
              onSubmit={handleSaveSettingsSubmit}
              className="lg:col-span-6 rounded-3xl border border-[#DFD3BE] bg-white p-6 sm:p-8 space-y-5 h-fit"
            >
              <h2 className="text-2xl font-serif-display font-semibold text-[#26211D]">
                Pengaturan Website & WhatsApp
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#5C4E3E] mb-1">
                    Nama Brand Wedding
                  </label>
                  <input
                    type="text"
                    value={bizName}
                    onChange={(e) => setBizName(e.target.value)}
                    className="w-full rounded-xl border border-[#D8C8AE] bg-[#FCFBF9] px-3.5 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#5C4E3E] mb-1">
                    Nomor WhatsApp Konsultasi *
                  </label>
                  <input
                    type="text"
                    value={bizWhatsapp}
                    onChange={(e) => setBizWhatsapp(e.target.value)}
                    placeholder="082123376933"
                    className="w-full rounded-xl border border-[#D8C8AE] bg-[#FCFBF9] px-3.5 py-2 text-sm font-tabular"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#5C4E3E] mb-1">
                    Instagram Handle
                  </label>
                  <input
                    type="text"
                    value={bizInstagram}
                    onChange={(e) => setBizInstagram(e.target.value)}
                    className="w-full rounded-xl border border-[#D8C8AE] bg-[#FCFBF9] px-3.5 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#5C4E3E] mb-1">
                    Jam Operasional
                  </label>
                  <input
                    type="text"
                    value={bizHours}
                    onChange={(e) => setBizHours(e.target.value)}
                    className="w-full rounded-xl border border-[#D8C8AE] bg-[#FCFBF9] px-3.5 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#5C4E3E] mb-1">
                  Alamat Galeri & Studio
                </label>
                <input
                  type="text"
                  value={bizAddress}
                  onChange={(e) => setBizAddress(e.target.value)}
                  className="w-full rounded-xl border border-[#D8C8AE] bg-[#FCFBF9] px-3.5 py-2 text-sm"
                />
              </div>

              <div className="pt-3 border-t border-[#EAE0CE] grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#5C4E3E] mb-1">
                    Username Admin
                  </label>
                  <input
                    type="text"
                    value={bizUsername}
                    onChange={(e) => setBizUsername(e.target.value)}
                    className="w-full rounded-xl border border-[#D8C8AE] bg-[#FCFBF9] px-3.5 py-2 text-sm font-tabular"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#5C4E3E] mb-1">
                    Password Baru Admin (Opsional)
                  </label>
                  <input
                    type="password"
                    value={bizPassword}
                    onChange={(e) => setBizPassword(e.target.value)}
                    placeholder="Kosongkan jika tidak diganti"
                    className="w-full rounded-xl border border-[#D8C8AE] bg-[#FCFBF9] px-3.5 py-2 text-sm font-tabular"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-[#26211D] text-white text-xs sm:text-sm font-medium flex items-center justify-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Pengaturan Toko</span>
              </button>
            </form>

            {/* Service Areas Management */}
            <div className="lg:col-span-6 space-y-5">
              <form
                onSubmit={handleSaveAreaSubmit}
                className="rounded-3xl border border-[#DFD3BE] bg-white p-6 space-y-4"
              >
                <h2 className="text-xl font-serif-display font-semibold text-[#26211D]">
                  {areaId ? 'Edit Area Layanan' : 'Tambah Area Layanan & Ongkir'}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    required
                    value={areaCity}
                    onChange={(e) => setAreaCity(e.target.value)}
                    placeholder="Kota / Kabupaten (Misal: Bekasi)"
                    className="w-full rounded-xl border border-[#D8C8AE] bg-[#FCFBF9] px-3.5 py-2 text-xs"
                  />
                  <input
                    type="text"
                    value={areaShipping}
                    onChange={(e) => setAreaShipping(e.target.value)}
                    placeholder="Biaya Pengiriman (Gratis Ongkir)"
                    className="w-full rounded-xl border border-[#D8C8AE] bg-[#FCFBF9] px-3.5 py-2 text-xs"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={areaCoverage}
                    onChange={(e) => setAreaCoverage(e.target.value)}
                    placeholder="Cakupan Kecamatan / Gedung"
                    className="w-full rounded-xl border border-[#D8C8AE] bg-[#FCFBF9] px-3.5 py-2 text-xs"
                  />
                  <input
                    type="text"
                    value={areaMinOrder}
                    onChange={(e) => setAreaMinOrder(e.target.value)}
                    placeholder="Minimal Order (Misal: Rp 10 Juta)"
                    className="w-full rounded-xl border border-[#D8C8AE] bg-[#FCFBF9] px-3.5 py-2 text-xs"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-[#26211D] text-white text-xs font-medium cursor-pointer"
                >
                  {areaId ? 'Simpan Perubahan Area' : '+ Tambah Area Layanan'}
                </button>
              </form>

              <div className="space-y-3">
                {serviceAreas.map((ar) => (
                  <div
                    key={ar.id}
                    className="rounded-2xl border border-[#DFD3BE] bg-white p-4 flex items-center justify-between gap-3"
                  >
                    <div>
                      <h4 className="font-serif-display font-semibold text-base text-[#26211D]">
                        {ar.city} ({ar.province})
                      </h4>
                      <p className="text-xs text-[#6E6359]">
                        {ar.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setAreaId(ar.id);
                          setAreaCity(ar.city);
                          setAreaCoverage(ar.description);
                          setAreaShipping(ar.province);
                          setAreaMinOrder('Tanpa Minimal Order');
                          setAreaFeatured(ar.isPrimary);
                        }}
                        className="p-2 rounded-lg text-[#5C4E3E] hover:bg-[#FAF6EE] cursor-pointer"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteServiceArea(ar.id)}
                        className="p-2 rounded-lg text-[#9E3B3B] hover:bg-[#FDF2F2] cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
