import React, { useState } from 'react';
import { Flower2 } from 'lucide-react';

interface SafeWeddingImageProps {
  src: string;
  alt: string;
  className?: string;
  onClick?: () => void;
}

/**
 * Resilient image component enforcing Zero-Broken-Image Policy.
 * Includes referrerPolicy="no-referrer" and a soft luxury botanical fallback if an external URL fails.
 */
export const SafeWeddingImage: React.FC<SafeWeddingImageProps> = ({
  src,
  alt,
  className = '',
  onClick,
}) => {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div
        onClick={onClick}
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#F5EFE6] via-[#EFE6D5] to-[#E5D8C1] text-[#7C6A56] p-6 text-center select-none ${className}`}
      >
        <Flower2 className="w-8 h-8 stroke-[1.25] text-[#B68D40] mb-2 opacity-80" />
        <span className="font-serif-display italic text-sm line-clamp-2 max-w-[200px]">
          {alt || 'Koleksi Pernikahan Aurelia'}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      onClick={onClick}
      className={className}
      loading="lazy"
    />
  );
};
