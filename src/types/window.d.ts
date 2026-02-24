declare global {
  type PostHogPayload = Record<string, unknown>;

  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
    __posthog_initialized__?: boolean;
    posthog?: {
      __SV?: number;
      init: (
        apiKey: string,
        options?: Record<string, unknown>,
        name?: string
      ) => void;
      capture: (event: string, properties?: PostHogPayload) => void;
      identify: (distinctId?: string, properties?: PostHogPayload) => void;
      alias: (alias: string, original?: string) => void;
      set_config: (config: Record<string, unknown>) => void;
      people?: {
        set: (properties: PostHogPayload) => void;
      };
      push: (args: unknown[]) => number;
    };
    openAxeptioCookie?: () => void;
    openAxeptioCookies?: () => void;
  }
}

export {};
