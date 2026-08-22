import type { MerchantProfile, Product, ThemeConfig } from '../types';

/** One browser-wide source of truth for the merchant editor and storefront. */
export const ZID_STORE_DATA_KEY = 'zid_store_data';
export const ZID_STORE_DATA_CHANGED = 'zid-store-data-changed';
const LEGACY_STORE_DATA_KEY = 'ZID_MERCHANT_STORE_DATA';

export interface ZidStoreData {
  merchant?: MerchantProfile;
  products?: Product[];
  themes?: ThemeConfig[];
  categories?: unknown[];
  themeCustomization?: Record<string, unknown>;
  [key: string]: unknown;
}

export function readZidStoreData(): ZidStoreData {
  if (typeof window === 'undefined') return {};
  try {
    const shared = JSON.parse(window.localStorage.getItem(ZID_STORE_DATA_KEY) || '{}');
    const legacy = JSON.parse(window.localStorage.getItem(LEGACY_STORE_DATA_KEY) || '{}');
    return { ...legacy, ...shared };
  } catch {
    return {};
  }
}

export function writeZidStoreData(update: Partial<ZidStoreData>): ZidStoreData {
  const next = { ...readZidStoreData(), ...update };
  if (typeof window === 'undefined') return next;
  window.localStorage.setItem(ZID_STORE_DATA_KEY, JSON.stringify(next));
  // CustomEvent notifies the current tab; the storage event handles other tabs.
  window.dispatchEvent(new CustomEvent<ZidStoreData>(ZID_STORE_DATA_CHANGED, { detail: next }));
  return next;
}

export function subscribeToZidStoreData(listener: (data: ZidStoreData) => void) {
  if (typeof window === 'undefined') return () => undefined;
  const onChange = (event: Event) => listener((event as CustomEvent<ZidStoreData>).detail || readZidStoreData());
  const onStorage = (event: StorageEvent) => {
    if (event.key === ZID_STORE_DATA_KEY || event.key === LEGACY_STORE_DATA_KEY) listener(readZidStoreData());
  };
  window.addEventListener(ZID_STORE_DATA_CHANGED, onChange);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(ZID_STORE_DATA_CHANGED, onChange);
    window.removeEventListener('storage', onStorage);
  };
}
