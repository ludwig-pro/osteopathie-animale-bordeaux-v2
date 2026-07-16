import type { ImageMetadata } from 'astro';
import { getImage } from 'astro:assets';

export type ResponsiveImageData = {
  src: string;
  srcSet: string;
  sizes: string;
  width: number;
  height: number;
};

export async function buildResponsiveImage(
  src: ImageMetadata,
  widths: readonly number[],
  sizes: string
): Promise<ResponsiveImageData> {
  const normalizedSizes = sizes.trim();
  if (!normalizedSizes) {
    throw new Error('Responsive image sizes must not be empty.');
  }

  if (widths.length === 0) {
    throw new Error('Responsive image widths must not be empty.');
  }

  for (const [index, width] of widths.entries()) {
    if (!Number.isFinite(width) || !Number.isInteger(width) || width <= 0) {
      throw new Error(
        `Responsive image width at index ${index} must be a positive finite integer.`
      );
    }

    if (width > src.width) {
      throw new Error(
        `Responsive image width ${width} exceeds source width ${src.width}.`
      );
    }

    if (index > 0 && width <= widths[index - 1]!) {
      throw new Error(
        'Responsive image widths must be in strictly increasing order.'
      );
    }
  }

  const largestWidth = widths[widths.length - 1]!;
  const result = await getImage({
    src,
    width: largestWidth,
    widths: [...widths],
    sizes: normalizedSizes,
    format: 'webp',
    quality: 80,
  });

  const requestedDescriptors = widths.map((width) => `${width}w`);
  const actualDescriptors = result.srcSet.values.map(
    ({ descriptor }) => descriptor
  );
  if (
    actualDescriptors.length !== requestedDescriptors.length ||
    actualDescriptors.some(
      (descriptor, index) => descriptor !== requestedDescriptors[index]
    )
  ) {
    throw new Error(
      `Astro returned unexpected responsive image descriptors: ${actualDescriptors.join(', ')}.`
    );
  }

  const srcSet = result.srcSet.attribute.trim();
  if (!srcSet) {
    throw new Error('Astro returned an empty responsive image srcset.');
  }

  const width = result.attributes['width'];
  const height = result.attributes['height'];
  if (
    typeof width !== 'number' ||
    !Number.isFinite(width) ||
    width <= 0 ||
    typeof height !== 'number' ||
    !Number.isFinite(height) ||
    height <= 0
  ) {
    throw new Error(
      'Astro returned invalid responsive image intrinsic dimensions.'
    );
  }

  if (width !== largestWidth) {
    throw new Error(
      `Astro returned responsive image width ${width}; expected ${largestWidth}.`
    );
  }

  return {
    src: result.src,
    srcSet,
    sizes: normalizedSizes,
    width,
    height,
  };
}
