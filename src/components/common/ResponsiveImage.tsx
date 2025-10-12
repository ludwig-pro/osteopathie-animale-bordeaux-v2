import React from 'react';

const DEFAULT_WIDTHS = [320, 480, 640, 768, 1024, 1280];

type ResponsiveImageProps = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  image: string | any; // Peut être une string ou un objet Astro
  alt?: string;
  className?: string;
  widths?: number[];
  sizes?: string;
  loading?: 'lazy' | 'eager';
  decoding?: 'async' | 'sync';
  quality?: number;
  priority?: boolean;
} & React.ImgHTMLAttributes<HTMLImageElement>;

export default function ResponsiveImage({
  image,
  alt,
  className,
  widths = DEFAULT_WIDTHS,
  sizes = '100vw',
  loading = 'lazy',
  decoding = 'async',
  quality: _quality = 80,
  priority = false,
  ...imgProps
}: ResponsiveImageProps) {
  if (!image) {
    return null;
  }

  // Si c'est une string (URL externe), retourner un img simple
  if (typeof image === 'string') {
    return (
      <img
        className={className}
        src={image}
        alt={alt ?? ''}
        loading={priority ? 'eager' : loading}
        decoding={priority ? 'sync' : decoding}
        sizes={sizes}
        {...imgProps}
      />
    );
  }

  // Pour les images importées avec astro:assets
  const baseSrc = image.src ?? image;
  const maxWidth = Math.max(...widths);

  // Dans Astro moderne, on utilise directement l'URL de l'image
  // L'optimisation est gérée automatiquement par Astro/Vite
  return (
    <img
      className={className}
      src={baseSrc}
      alt={alt ?? ''}
      loading={priority ? 'eager' : loading}
      decoding={priority ? 'sync' : decoding}
      sizes={sizes}
      width={maxWidth}
      style={{
        width: '100%',
        height: 'auto',
        objectFit: 'cover',
        ...imgProps.style,
      }}
      {...imgProps}
    />
  );
}
