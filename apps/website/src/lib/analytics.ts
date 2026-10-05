export type AnalyticsPayloadValue =
  string | number | boolean | null | undefined;

export type AnalyticsPayload = Record<string, AnalyticsPayloadValue>;

export const pushDataLayerEvent = (
  event: string,
  payload: AnalyticsPayload = {}
) => {
  if (typeof window === 'undefined') {
    return;
  }

  // Never queue actions taken before consent for later transmission.
  window.trackSiteEvent?.(event, payload);
};
