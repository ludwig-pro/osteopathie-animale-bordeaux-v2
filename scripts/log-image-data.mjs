import { getImage } from 'astro:assets';
import sectionChien from '../src/images/sectionChien.jpeg';

const result = await getImage({
  src: sectionChien,
  widths: [320, 640],
  formats: ['avif', 'webp', 'jpeg'],
});

console.log(JSON.stringify(result, null, 2));
