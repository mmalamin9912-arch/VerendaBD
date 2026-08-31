// Client-side AI service. Talks to the /api/ai/generate-text serverless
// function — the GEMINI_API_KEY itself lives ONLY on the server (env vars),
// never in the browser bundle.

export type AiTextError =
  | 'missing_api_key'
  | 'invalid_api_key'
  | 'rate_limited'
  | 'network_error'
  | 'server_error'
  | 'bad_request';

export interface AiTextResult {
  ok: boolean;
  text?: string;
  error?: AiTextError;
  message?: string;
}

const AI_ENDPOINT = '/api/ai/generate-text';

export async function generateAiText(
  prompt: string,
  systemInstruction?: string
): Promise<AiTextResult> {
  try {
    const res = await fetch(AI_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, systemInstruction, model: 'gemini-1.5-flash' })
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return {
        ok: false,
        error: (data?.error as AiTextError) || 'server_error',
        message:
          data?.message ||
          (res.status === 404
            ? 'The AI service endpoint was not found. Please redeploy the app so /api/ai/generate-text is available.'
            : 'AI request failed. Please try again later.')
      };
    }

    if (!data?.text) {
      return { ok: false, error: 'server_error', message: 'The AI returned an empty response. Please try again.' };
    }

    return { ok: true, text: data.text };
  } catch (err: any) {
    return {
      ok: false,
      error: 'network_error',
      message: 'Could not reach the AI service. Check your internet connection and try again.'
    };
  }
}

/** Maps an AI error to a short, user-facing alert message (English + Bangla). */
export function aiErrorMessage(result: AiTextResult): string {
  switch (result.error) {
    case 'missing_api_key':
      return 'AI is not configured: the GEMINI_API_KEY is missing on the server.\n\nAI is not configured: the GEMINI_API_KEY is missing on the server (Vercel > Settings > Environment Variables).';
    case 'invalid_api_key':
      return 'The AI API key is invalid or rejected.\n\nThe configured AI API key is invalid — verify GEMINI_API_KEY on the server.';
    case 'rate_limited':
      return 'AI usage limit reached. Please try again in a minute.\n\nAI usage limit reached — please try again in a while.';
    case 'network_error':
      return 'Network error: could not reach the AI service. Check your connection.';
    default:
      return result.message || 'AI request failed. Please try again.';
  }
}
