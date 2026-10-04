import React, { useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  GripVertical,
  ImagePlus,
  Loader2,
  RefreshCw,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { PRESET_GALLERY_CHOICES } from '../data/initialData';
import { ProductImage } from '../types';
import { compressImageFile, deleteStorageUrls, validateImageFile } from '../utils/imageUtils';
import { SafeWeddingImage } from './SafeWeddingImage';

interface MultiPhotoUploaderProps {
  label?: string;
  images: ProductImage[];
  onChange: (newImages: ProductImage[]) => void;
  storageFolder?: string;
}

export const MultiPhotoUploader: React.FC<MultiPhotoUploaderProps> = ({
  label = 'FOTO PRODUK',
  images,
  onChange,
  storageFolder = 'products',
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const replaceInputRef = useRef<HTMLInputElement | null>(null);
  const [replacingIndex, setReplacingIndex] = useState<number | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStatusText, setUploadStatusText] = useState<string>('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [showUrlHelper, setShowUrlHelper] = useState(false);

  // Handle selecting MULTIPLE photos at once from smartphone gallery or computer
  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    setUploadError(null);
    setIsCompressing(true);
    setUploadProgress(5);
    setUploadStatusText('Memeriksa format & ukuran foto...');

    try {
      const filesArray = Array.from(fileList);
      const uploadedItems: ProductImage[] = [];
      const errors: string[] = [];

      for (let i = 0; i < filesArray.length; i++) {
        const file = filesArray[i];
        const check = validateImageFile(file);
        if (!check.valid) {
          errors.push(check.error || `File ${file.name} tidak valid.`);
          continue;
        }

        try {
          const uploadedUrl = await compressImageFile(
            file,
            1000,
            0.74,
            storageFolder,
            (percent, status) => {
              const overall = Math.round(
                ((i + percent / 100) / filesArray.length) * 100
              );
              setUploadProgress(Math.min(99, Math.max(10, overall)));
              setUploadStatusText(`Foto ${i + 1}/${filesArray.length}: ${status}`);
            }
          );

          if (uploadedUrl && uploadedUrl.trim().length > 0) {
            const cleanFileName = file.name
              .replace(/\.[^/.]+$/, '')
              .replace(/[-_]/g, ' ');
            uploadedItems.push({
              id: `img-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
              url: uploadedUrl,
              isPrimary: images.length === 0 && uploadedItems.length === 0,
              caption:
                cleanFileName || `Foto ${images.length + uploadedItems.length + 1}`,
            });
          }
        } catch (fileErr) {
          errors.push(
            fileErr instanceof Error
              ? fileErr.message
              : `Gagal mengunggah "${file.name}".`
          );
        }
      }

      if (errors.length > 0) {
        setUploadError(errors.join(' · '));
      }

      if (uploadedItems.length > 0) {
        const combined = [...images, ...uploadedItems].slice(0, 20);
        if (combined.length > 0 && !combined.some((img) => img.isPrimary)) {
          combined[0].isPrimary = true;
        }
        onChange(combined);
      }
    } catch (error) {
      console.error('Gagal memproses foto:', error);
      setUploadError(
        error instanceof Error ? error.message : 'Gagal mengunggah foto.'
      );
    } finally {
      setIsCompressing(false);
      setUploadProgress(0);
      setUploadStatusText('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle replacing a single specific photo from gallery
  const handleReplaceFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || replacingIndex === null) return;

    const check = validateImageFile(file);
    if (!check.valid) {
      setUploadError(check.error || 'Format atau ukuran foto tidak valid.');
      setReplacingIndex(null);
      if (replaceInputRef.current) replaceInputRef.current.value = '';
      return;
    }

    setUploadError(null);
    setIsCompressing(true);
    setUploadProgress(15);
    setUploadStatusText('Mengganti & mengunggah foto...');
    try {
      const oldUrl = images[replacingIndex]?.url;
      const uploadedUrl = await compressImageFile(
        file,
        1000,
        0.74,
        storageFolder,
        (percent, status) => {
          setUploadProgress(percent);
          setUploadStatusText(status);
        }
      );
      if (uploadedUrl && uploadedUrl.trim().length > 0) {
        const updated = images.map((img, idx) =>
          idx === replacingIndex
            ? {
                ...img,
                url: uploadedUrl,
              }
            : img
        );
        onChange(updated);
        if (oldUrl && oldUrl !== uploadedUrl) {
          void deleteStorageUrls([oldUrl]);
        }
      }
    } catch (error) {
      console.error('Gagal mengganti foto:', error);
      setUploadError(
        error instanceof Error ? error.message : 'Gagal mengganti foto.'
      );
    } finally {
      setIsCompressing(false);
      setUploadProgress(0);
      setUploadStatusText('');
      setReplacingIndex(null);
      if (replaceInputRef.current) {
        replaceInputRef.current.value = '';
      }
    }
  };

  const triggerReplacePhoto = (index: number) => {
    setReplacingIndex(index);
    replaceInputRef.current?.click();
  };

  const handleSetPrimary = (index: number) => {
    const updated = images.map((img, idx) => ({
      ...img,
      isPrimary: idx === index,
    }));
    onChange(updated);
  };

  const handleRemovePhoto = (index: number) => {
    const removed = images[index];
    const remaining = images.filter((_, idx) => idx !== index);
    if (remaining.length > 0 && !remaining.some((img) => img.isPrimary)) {
      remaining[0].isPrimary = true;
    }
    onChange(remaining);
    if (removed?.url) {
      void deleteStorageUrls([removed.url]);
    }
  };

  const handleCaptionChange = (index: number, caption: string) => {
    const updated = images.map((img, idx) =>
      idx === index ? { ...img, caption } : img
    );
    onChange(updated);
  };

  const handleMovePhoto = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= images.length) return;
    const copy = [...images];
    const [moved] = copy.splice(fromIndex, 1);
    copy.splice(toIndex, 0, moved);
    onChange(copy);
  };

  // Drag & Drop handlers
  const onDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const onDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
  };

  const onDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }
    handleMovePhoto(draggedIndex, dropIndex);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleAddPresetOrUrl = (url: string, defaultCaption: string) => {
    if (!url.trim()) return;
    const newImg: ProductImage = {
      id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      url: url.trim(),
      isPrimary: images.length === 0,
      caption: defaultCaption || `Foto ${images.length + 1}`,
    };
    onChange([...images, newImg].slice(0, 20));
    setCustomUrlInput('');
  };

  const primaryIndex = images.findIndex((img) => img.isPrimary);

  return (
    <div className="rounded-2xl border border-[#DFD3BE] bg-[#FBF9F5] p-4 sm:p-6">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-[#E8DFC8]">
        <div>
          <span className="text-xs font-semibold tracking-wider text-[#7C6A56] uppercase block">
            {label} ({images.length} Foto)
          </span>
          <p className="text-xs text-[#6E6359] mt-0.5">
            Pilih banyak foto sekaligus dari galeri HP/komputer (mendukung Firebase Storage). Klik centang untuk Foto Utama, atau geser untuk urutan.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowUrlHelper((prev) => !prev)}
          className="text-xs font-medium text-[#9E762C] hover:text-[#7A591E] underline underline-offset-4 whitespace-nowrap cursor-pointer"
        >
          {showUrlHelper ? 'Tutup Koleksi Studio' : '+ Pilih dari Koleksi Studio / URL'}
        </button>
      </div>

      {/* Hidden multi-file input & single replace file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFilesSelected}
        className="hidden"
      />
      <input
        ref={replaceInputRef}
        type="file"
        accept="image/*"
        onChange={handleReplaceFileSelected}
        className="hidden"
      />

      {/* Big "+ Tambah Foto" Upload Trigger Box */}
      <div className="mt-4">
        <button
          type="button"
          disabled={isCompressing}
          onClick={() => fileInputRef.current?.click()}
          className="w-full rounded-xl border-2 border-dashed border-[#C9B38B] bg-[#F6F1E7]/70 hover:bg-[#F2E9D8] transition-colors py-6 px-4 flex flex-col items-center justify-center text-center group cursor-pointer"
        >
          {isCompressing ? (
            <div className="w-full max-w-md space-y-2.5">
              <Loader2 className="w-8 h-8 text-[#9E762C] animate-spin mx-auto" />
              <span className="text-sm font-medium text-[#26211D] block">
                {uploadStatusText || 'Mengoptimalkan & Mengunggah Foto ke Cloud Storage...'}
              </span>
              <div className="w-full h-2 rounded-full bg-[#E5DAC5] overflow-hidden">
                <div
                  className="h-full bg-[#9E762C] transition-all duration-300"
                  style={{ width: `${Math.max(10, uploadProgress)}%` }}
                />
              </div>
              <span className="text-[11px] font-tabular text-[#6E6359] block">
                Progress: {Math.max(10, uploadProgress)}%
              </span>
            </div>
          ) : (
            <>
              <div className="w-12 h-12 rounded-full bg-[#EFE5D2] text-[#9E762C] flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                <ImagePlus className="w-6 h-6" />
              </div>
              <span className="text-sm sm:text-base font-semibold text-[#26211D]">
                📷 Ambil Foto dari Galeri HP / Komputer (Bisa Banyak Sekaligus)
              </span>
              <span className="text-xs text-[#6E6359] mt-1">
                Format JPG, PNG, WEBP (Maks. 12MB/foto) · Foto Utama, Foto 2, Foto 3, Foto 4, Foto 5, dst
              </span>
            </>
          )}
        </button>
      </div>

      {uploadError && (
        <div className="mt-3 rounded-xl bg-[#FDF2F2] border border-[#E8B8B8] px-4 py-2.5 text-xs text-[#9E3B3B] flex items-center justify-between gap-2">
          <span>⚠️ {uploadError}</span>
          <button
            type="button"
            onClick={() => setUploadError(null)}
            className="text-[#9E3B3B] underline font-semibold shrink-0 cursor-pointer"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Optional Studio Preset / URL Drawer */}
      {showUrlHelper && (
        <div className="mt-3 p-3.5 rounded-xl bg-[#F4EFE4] border border-[#E2D6C1] space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-medium text-[#5C4E3E]">
            <Sparkles className="w-3.5 h-3.5 text-[#9E762C]" />
            <span>Tambah Cepat dari Foto Kurasi Studio:</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {PRESET_GALLERY_CHOICES.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => handleAddPresetOrUrl(preset.url, preset.label)}
                className="group relative rounded-lg overflow-hidden border border-[#D8C8AE] bg-white text-left hover:border-[#9E762C] transition-colors cursor-pointer"
              >
                <SafeWeddingImage
                  src={preset.url}
                  alt={preset.label}
                  className="w-full h-14 object-cover"
                />
                <span className="block p-1.5 text-[11px] font-medium text-[#26211D] truncate">
                  + {preset.label}
                </span>
              </button>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <input
              type="url"
              value={customUrlInput}
              onChange={(e) => setCustomUrlInput(e.target.value)}
              placeholder="Atau tempel URL foto langsung (https://...)"
              className="flex-1 rounded-lg border border-[#D8C8AE] bg-white px-3 py-1.5 text-xs text-[#26211D] focus:outline-none focus:border-[#9E762C]"
            />
            <button
              type="button"
              onClick={() => handleAddPresetOrUrl(customUrlInput, `Foto ${images.length + 1}`)}
              className="px-3 py-1.5 rounded-lg bg-[#26211D] text-white text-xs font-medium hover:bg-[#3D352E] whitespace-nowrap cursor-pointer"
            >
              Tambahkan URL
            </button>
          </div>
        </div>
      )}

      {/* Multi-Photo Grid Preview */}
      {images.length > 0 ? (
        <div className="mt-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
            {images.map((img, index) => {
              const isPrimary = img.isPrimary || (primaryIndex === -1 && index === 0);
              const isBeingDraggedOver = dragOverIndex === index;

              return (
                <div
                  key={img.id || index}
                  draggable
                  onDragStart={() => onDragStart(index)}
                  onDragOver={(e) => onDragOver(e, index)}
                  onDrop={(e) => onDrop(e, index)}
                  onDragEnd={() => {
                    setDraggedIndex(null);
                    setDragOverIndex(null);
                  }}
                  className={`group relative rounded-xl overflow-hidden border transition-all bg-white flex flex-col ${
                    isPrimary
                      ? 'border-2 border-[#9E762C] shadow-sm'
                      : isBeingDraggedOver
                      ? 'border-2 border-[#5B705E] scale-[0.99]'
                      : 'border-[#E2D8C5]'
                  }`}
                >
                  {/* Thumbnail container */}
                  <div className="relative aspect-[4/3] w-full bg-[#F5EFE6] overflow-hidden">
                    <SafeWeddingImage
                      src={img.url}
                      alt={img.caption || `Foto ${index + 1}`}
                      className="w-full h-full object-cover"
                    />

                    {/* Top bar overlays: Order number + Drag handle + Delete button */}
                    <div className="absolute top-2 inset-x-2 flex items-center justify-between gap-1">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#26211D]/80 text-[#FBF9F5] text-[11px] font-medium backdrop-blur-xs">
                        <GripVertical className="w-3 h-3 opacity-75 cursor-grab" />
                        #{index + 1}
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => triggerReplacePhoto(index)}
                          title="Ganti Foto Ini"
                          className="p-1.5 rounded-md bg-white/90 text-[#26211D] hover:bg-white transition-colors shadow-xs cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(index)}
                          title="Hapus Foto Ini"
                          className="p-1.5 rounded-md bg-[#9E3B3B]/90 text-white hover:bg-[#7D2828] transition-colors shadow-xs cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Bottom overlay: Reorder arrows for mobile & Set Primary button */}
                    <div className="absolute bottom-2 inset-x-2 flex items-center justify-between gap-1">
                      <button
                        type="button"
                        onClick={() => handleSetPrimary(index)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors shadow-xs cursor-pointer ${
                          isPrimary
                            ? 'bg-[#9E762C] text-white'
                            : 'bg-white/90 text-[#26211D] hover:bg-[#9E762C] hover:text-white'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>{isPrimary ? 'Foto Utama ✓' : 'Jadikan Utama'}</span>
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => handleMovePhoto(index, index - 1)}
                          title="Geser ke kiri"
                          className="p-1 rounded-md bg-white/90 text-[#26211D] disabled:opacity-35 hover:bg-white cursor-pointer"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={index === images.length - 1}
                          onClick={() => handleMovePhoto(index, index + 1)}
                          title="Geser ke kanan"
                          className="p-1 rounded-md bg-white/90 text-[#26211D] disabled:opacity-35 hover:bg-white cursor-pointer"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Caption input for each photo */}
                  <div className="p-2 bg-[#FCFBF9] border-t border-[#EFE8D8]">
                    <input
                      type="text"
                      value={img.caption || ''}
                      onChange={(e) => handleCaptionChange(index, e.target.value)}
                      placeholder={`Keterangan foto ${index + 1} (mis: Foto Pelaminan)`}
                      className="w-full text-xs text-[#26211D] bg-transparent border-b border-transparent focus:border-[#9E762C] focus:outline-none py-0.5"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary Footer */}
          <div className="mt-4 pt-3 border-t border-[#E8DFC8] flex flex-wrap items-center justify-between gap-2 text-xs text-[#5C4E3E]">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[#26211D]">
                Foto utama: ✓ (Foto #{primaryIndex >= 0 ? primaryIndex + 1 : 1})
              </span>
              <span aria-hidden="true">·</span>
              <span>Digunakan sebagai sampul katalog</span>
            </div>
            <span className="text-[#6E6359]">
              {images.length > 1
                ? `${images.length - 1} foto lainnya ditampilkan sebagai galeri detail`
                : 'Tambahkan foto lagi untuk galeri detail'}
            </span>
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-xl bg-[#F5EFE4]/60 border border-[#E5DAC5] p-4 flex items-center gap-3 text-xs text-[#6E6359]">
          <Camera className="w-5 h-5 text-[#9E762C] shrink-0" />
          <span>
            Belum ada foto dipilih. Tekan tombol <strong>＋ Upload Banyak Foto Sekaligus</strong> di atas untuk memilih foto dari galeri HP/komputer Anda.
          </span>
        </div>
      )}
    </div>
  );
};
