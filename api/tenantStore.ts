type TenantPayload = Record<string, unknown>;

const memoryStore = new Map<string, TenantPayload>();
const kvUrl = process.env.KV_REST_API_URL;
const kvToken = process.env.KV_REST_API_TOKEN;
const keyFor = (storeSlug: string) => `zid:tenant:${storeSlug}`;

async function kv(command: string, ...args: string[]) {
  if (!kvUrl || !kvToken) return null;
  const response = await fetch(`${kvUrl}/${command}/${args.map(encodeURIComponent).join('/')}`, { headers: { Authorization: `Bearer ${kvToken}` } });
  if (!response.ok) throw new Error(`KV ${command} failed`);
  return response.json() as Promise<{ result: unknown }>;
}

export async function getTenant(storeSlug: string): Promise<TenantPayload | null> {
  try {
    const result = await kv('get', keyFor(storeSlug));
    if (typeof result?.result === 'string') return JSON.parse(result.result) as TenantPayload;
  } catch { /* use the development fallback below */ }
  return memoryStore.get(storeSlug) || null;
}

export async function saveTenant(storeSlug: string, payload: TenantPayload) {
  memoryStore.set(storeSlug, payload);
  try { await kv('set', keyFor(storeSlug), JSON.stringify(payload)); } catch { /* local fallback remains available */ }
  return payload;
}

export function publicTenant(tenant: TenantPayload | null) {
  if (!tenant) return null;
  const mobileBanking = Array.isArray(tenant.mobileBanking)
    ? tenant.mobileBanking.map((item) => {
        const { merchantApiKey, ...publicMethod } = item as Record<string, unknown>;
        return publicMethod;
      })
    : [];
  return {
    merchant: tenant.merchant || null,
    products: Array.isArray(tenant.products) ? tenant.products : [],
    categories: Array.isArray(tenant.categories) ? tenant.categories : [],
    themes: Array.isArray(tenant.themes) ? tenant.themes : [],
    themeCustomization: tenant.themeCustomization || {},
    mobileBanking,
    bankAccounts: Array.isArray(tenant.bankAccounts) ? tenant.bankAccounts : [],
    codConfig: tenant.codConfig || null,
  };
}
