declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
    openAxeptioCookie?: () => void;
    openAxeptioCookies?: () => void;
  }
}

export {};
