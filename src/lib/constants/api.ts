// API Keys et configuration externe
// Les clés sont maintenant chargées depuis les variables d'environnement
export const API_CONFIG = {
  recaptcha: {
    siteKey: import.meta.env['PUBLIC_RECAPTCHA_KEY'],
  },
  mapbox: {
    token: import.meta.env['PUBLIC_MAPBOX_TOKEN'],
  },
  gtm: {
    id: import.meta.env['PUBLIC_GTM_ID'],
  },
} as const;
