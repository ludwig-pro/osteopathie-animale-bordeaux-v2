import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  integrations: [react(), tailwind()],
  output: 'static',
  image: {
    responsiveStyles: true,
  },
  // adapter: netlify() retiré pour le mode statique
});
