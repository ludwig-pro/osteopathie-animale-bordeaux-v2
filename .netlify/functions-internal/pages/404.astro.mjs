/* empty css                                 */
import { c as createComponent, b as addAttribute, d as renderHead, r as renderTemplate } from '../chunks/astro/server_DqeAK1Mz.mjs';
import 'kleur/colors';
import 'html-escaper';
import 'clsx';
export { renderers } from '../renderers.mjs';

const $$404 = createComponent(($$result, $$props, $$slots) => {
  const title = "404: Page non trouv\xE9e";
  const description = "La page que vous recherchez n'existe pas.";
  return renderTemplate`<html lang="fr"> <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title><meta name="description"${addAttribute(description, "content")}>${renderHead()}</head> <body class="min-h-screen bg-canard flex items-center justify-center"> <main class="text-center text-white px-6"> <h1 class="text-5xl font-extrabold">404</h1> <p class="mt-4 text-xl">Désolé, cette page est introuvable.</p> <a class="mt-6 inline-flex items-center justify-center px-6 py-3 rounded-md bg-gold-500 text-canard font-semibold" href="/">
Retour à l'accueil
</a> </main> </body></html>`;
}, "/Users/ludwig/local_sources/osteopathie-animale-bordeaux-v2/src/pages/404.astro", void 0);

const $$file = "/Users/ludwig/local_sources/osteopathie-animale-bordeaux-v2/src/pages/404.astro";
const $$url = "/404";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$404,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
