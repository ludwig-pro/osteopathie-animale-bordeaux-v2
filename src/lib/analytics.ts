export type AnalyticsPayloadValue =
  | string
  | number
  | boolean
  | null
  | undefined;

export type AnalyticsPayload = Record<string, AnalyticsPayloadValue>;

export const pushDataLayerEvent = (
  event: string,
  payload: AnalyticsPayload = {}
) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push({
    event,
    ...payload,
  });
};
