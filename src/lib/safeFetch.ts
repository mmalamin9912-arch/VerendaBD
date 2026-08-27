/**
 * Safe Fetch Utilities for Production (Vercel & Supabase):
 * Prevents "Unexpected end of JSON input" and "Unexpected token < in JSON at position 0"
 * by safely inspecting HTTP response status, headers, and text before attempting JSON parsing.
 */

export interface SafeFetchResult<T = any> {
  ok: boolean;
  status: number;
  data: T | null;
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Safely parses any response into JSON, returning a fallback object if empty, HTML, or malformed.
 */
export async function safeParseJson<T = any>(
  response: Response,
  fallback: T | null = null
): Promise<T | null> {
  try {
    const contentType = response.headers.get('content-type') || '';
    
    // If response body is empty or 204 No Content
    if (response.status === 204 || response.status === 205) {
      return fallback;
    }

    const text = await response.text();
    if (!text || text.trim().length === 0) {
      return fallback;
    }

    // Check if the response returned an HTML error page (e.g., 404/500 from Vercel / Nginx)
    const trimmed = text.trim();
    if (trimmed.startsWith('<') && !trimmed.startsWith('<?xml')) {
      console.warn(`[safeFetch] Received HTML response instead of JSON (Status ${response.status}):`, trimmed.slice(0, 80));
      return fallback;
    }

    return JSON.parse(trimmed) as T;
  } catch (err: any) {
    console.warn(`[safeFetch] JSON parse suppressed error:`, err?.message);
    return fallback;
  }
}

/**
 * Robust universal fetch wrapper that never throws on JSON parse errors.
 */
export async function safeFetch<T = any>(
  input: string | URL | Request,
  init?: RequestInit,
  fallbackData: T | null = null
): Promise<SafeFetchResult<T>> {
  try {
    const response = await fetch(input, {
      ...init,
      headers: {
        'Accept': 'application/json',
        ...(init?.headers || {})
      }
    });

    const data = await safeParseJson<T>(response, fallbackData);

    const isOk = response.ok && (data as any)?.ok !== false && (data as any)?.success !== false;
    const msg = (data as any)?.message || (data as any)?.error || (!response.ok ? `Server responded with status ${response.status}` : 'Success');

    return {
      ok: response.ok,
      status: response.status,
      data: data ?? fallbackData,
      success: isOk,
      message: msg,
      error: !response.ok ? msg : undefined
    };
  } catch (networkError: any) {
    console.warn('[safeFetch] Network/fetch error:', networkError?.message);
    return {
      ok: false,
      status: 0,
      data: fallbackData,
      success: false,
      message: networkError?.message || 'Server response error / Network error',
      error: networkError?.message || 'Network request failed'
    };
  }
}

/**
 * Convenient helper to fetch and directly receive parsed JSON with safe fallback.
 */
export async function safeFetchJson<T = any>(
  input: string | URL | Request,
  init?: RequestInit,
  fallback: T = {} as T
): Promise<T> {
  const result = await safeFetch<T>(input, init, fallback);
  return (result.data !== null && result.data !== undefined) ? result.data : fallback;
}
