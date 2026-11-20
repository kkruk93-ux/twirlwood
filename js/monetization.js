/**
 * Monetization hooks only: no ad SDK, no billing, no network calls, no tracking.
 * Nothing here is active. Wiring a provider needs the owner's explicit OK first.
 */
export const monetization = {
  enabled: false,
  async showRewarded(_placement) { return { rewarded: false, reason: 'not-implemented' }; },
  async showInterstitial(_placement) { return { shown: false, reason: 'not-implemented' }; },
  async purchase(_sku) { return { ok: false, reason: 'not-implemented' }; },
};
