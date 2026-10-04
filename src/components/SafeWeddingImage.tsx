import React, { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import {
  DEFAULT_WEDDING_FALLBACK_IMAGE,
  normalizeWeddingImageUrl,
} from '../utils/imageUtils';

interface SafeWeddingImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackSrc?: string;
}

export const SafeWeddingImage: React.FC<SafeWeddingImageProps> = ({
  src,
  alt,
  fallbackSrc = DEFAULT_WEDDING_FALLBACK_IMAGE,
  className = '',
  onError,
  ...rest
}) => {
  const normalizedPrimary = normalizeWeddingImageUrl(
    typeof src === 'string' ? src : undefined
  );
  const normalizedFallback = normalizeWeddingImageUrl(fallbackSrc);

  const [imgSrc, setImgSrc] = useState<string>(normalizedPrimary);
  const [hasFailedAll, setHasFailedAll] = useState<boolean>(false);

  useEffect(() => {
    const nextUrl = normalizeWeddingImageUrl(
      typeof src === 'string' ? src : undefined
    );
    setImgSrc(nextUrl);
    setHasFailedAll(false);
  }, [src, fallbackSrc]);

  if (hasFailedAll) {
    return (
      <div
        className={`bg-gradient-to-br from-[#F4EFE4] via-[#EFE5D2] to-[#E5D7BD] flex flex-col items-center justify-center text-center p-4 select-none ${className}`}
        role="img"
        aria-label={alt || 'ISTAFA Wedding Collection'}
      >
        <div className="w-10 h-10 rounded-full bg-white/80 text-[#9E762C] flex items-center justify-center shadow-xs mb-2">
          <Sparkles className="w-5 h-5" />
        </div>
        <span className="font-serif-display text-xs sm:text-sm font-semibold text-[#26211D] line-clamp-1">
          {alt || 'ISTAFA Wedding'}
        </span>
        <span className="text-[10px] uppercase tracking-widest text-[#7C6A56] mt-0.5">
          Koleksi Eksklusif
        </span>
      </div>
    );
  }

  return (
    <img
      {...rest}
      src={imgSrc}
      alt={alt || 'ISTAFA Wedding'}
      loading={rest.loading || 'lazy'}
      decoding="async"
      className={className}
      onError={(e) => {
        if (imgSrc !== normalizedFallback) {
          setImgSrc(normalizedFallback);
        } else {
          setHasFailedAll(true);
        }
        if (onError) onError(e);
      }}
    />
  );
};
