import React from 'react';

const DEFAULT_WIDTHS = [320, 480, 640, 768, 1024, 1280];

export default function ResponsiveImage({
  image,
  alt,
  className,
  widths = DEFAULT_WIDTHS,
  sizes = '100vw',
  loading = 'lazy',
  decoding = 'async',
  quality = 80,
  priority = false,
  ...imgProps
}) {
  if (!image) {
    return null;
  }

  // Si c'est une string (URL externe), retourner un img simple
  if (typeof image === 'string') {
    return (
      <img
        className={className}
        src={image}
        alt={alt || ''}
        loading={priority ? 'eager' : loading}
        decoding={priority ? 'sync' : decoding}
        sizes={sizes}
        {...imgProps}
      />
    );
  }

  // Pour les images importées avec astro:assets
  const baseSrc = image.src || image;
  const maxWidth = Math.max(...widths);

  // Dans Astro moderne, on utilise directement l'URL de l'image
  // L'optimisation est gérée automatiquement par Astro/Vite
  return (
    <img
      className={className}
      src={baseSrc}
      alt={alt || ''}
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
