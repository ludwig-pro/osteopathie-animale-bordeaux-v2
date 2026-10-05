import type { APIRoute } from 'astro';
import { animalPages } from '../lib/content/animal-pages';
import { SITE_CONFIG } from '../lib/constants/site';

export const GET: APIRoute = () => {
  const urls = [
    '/',
    ...animalPages.map((animal) => `/animaux/${animal.slug}/`),
  ];
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((path) => `<url><loc>${SITE_CONFIG.url}${path}</loc></url>`).join('')}</urlset>`,
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } }
  );
};
