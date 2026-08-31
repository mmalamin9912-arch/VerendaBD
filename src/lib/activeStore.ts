// Resolves the active merchant's store slug dynamically instead of hardcoding it.
// Priority: explicit prop (route param / component) > logged-in merchant session
// (localStorage `zid_auth_session`) > legacy merchant store data > 'bd' fallback.

export function normalizeStoreSlug(raw?: string | null): string {
  return String(raw || '')
    .split(':')[0]
    .trim()
    .toLowerCase();
}

function readSessionStoreSlug(): string {
  if (typeof window === 'undefined') return '';
  try {
    const session = JSON.parse(window.localStorage.getItem('zid_auth_session') || '{}');
    const profile = session?.userProfile || session?.merchant || {};
    return normalizeStoreSlug(profile.storeSlug || profile.store_slug || '');
  } catch {
    return '';
  }
}

function readLegacyMerchantStoreSlug(): string {
  if (typeof window === 'undefined') return '';
  try {
    const keys = Object.keys(window.localStorage).filter((k) =>
      k.startsWith('ZID_MERCHANT_STORE_DATA')
    );
    for (const k of keys) {
      const parsed = JSON.parse(window.localStorage.getItem(k) || '{}');
      const slug = normalizeStoreSlug(parsed?.merchant?.storeSlug || parsed?.merchant?.store_slug || '');
      if (slug) return slug;
    }
  } catch {
    /* ignore */
  }
  return '';
}

/**
 * Returns the active merchant's store slug.
 * @param preferred an explicit slug (e.g. from route params or component props)
 */
export function resolveActiveStoreSlug(preferred?: string | null): string {
  const fromProp = normalizeStoreSlug(preferred);
  if (fromProp) return fromProp;

  const fromSession = readSessionStoreSlug();
  if (fromSession) return fromSession;

  const fromLegacy = readLegacyMerchantStoreSlug();
  if (fromLegacy) return fromLegacy;

  return 'bd';
}
