/**
 * src/utils/geminiProxy.ts
 *
 * Lightweight client-side helper to call the Gemini API securely.
 *
 * On Vercel (production) all requests are routed through the server-side
 * serverless function `/api/gemini`, which reads GEMINI_API_KEY from the
 * process environment – the key is NEVER included in the browser bundle.
 *
 * In local dev mode (import.meta.env.DEV === true) and only when the
 * local serverless function is NOT running, this helper falls back to the
 * `VITE_GEMINI_API_KEY` env var so `npm run dev` still works out of the box
 * without spinning up `vercel dev`.
 */

const PROXY_ENDPOINT = "/api/gemini";

export interface GeminiProxyRequest {
  /** Gemini model name, e.g. "gemini-3.8-flash" */
  model: string;
  /** Prompt string OR Gemini Content[] array */
  contents: string | unknown[];
  /** GenerationConfig: temperature, responseMimeType, … */
  config?: Record<string, unknown>;
  /** For multimodal (image / video) requests */
  inlineData?: { data: string; mimeType: string };
}

export interface GeminiProxyResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  error?: { message: string };
}

/**
 * Extracts the text content from a Gemini REST response object.
 */
export function extractTextFromGeminiResponse(
  data: GeminiProxyResponse
): string | null {
  return (
    data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null
  );
}

/**
 * Sends a POST request to the /api/gemini proxy endpoint.
 */
// Session-level flag: if local /api/gemini proxy is unreachable (e.g. Vite without vercel dev),
// bypass proxy directly for all subsequent calls to prevent console 502/404 spam.
let localProxyUnavailable = false;

async function fetchProxy(request: GeminiProxyRequest): Promise<GeminiProxyResponse> {
  const res = await fetch(PROXY_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    if (res.status === 502 || res.status === 404) {
      localProxyUnavailable = true;
    }
    const err = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }));
    throw new Error(
      `[Gemini Proxy] ${res.status}: ${err?.error?.message || res.statusText}`
    );
  }

  return res.json();
}

/**
 * Calls the Gemini API via the secure server-side proxy.
 *
 * In DEV mode, if the local proxy is not running, falls back to a direct
 * REST call using the VITE_GEMINI_API_KEY local env variable.
 *
 * @throws Error when both proxy and dev-fallback are unavailable.
 */
export async function callGeminiProxy(
  request: GeminiProxyRequest
): Promise<GeminiProxyResponse> {
  // ── Production path: always use the server-side proxy ────────────────────
  if (!import.meta.env?.DEV) {
    return fetchProxy(request);
  }

  // ── Dev path: prefer local proxy only if not previously marked unavailable ─
  if (!localProxyUnavailable) {
    try {
      return await fetchProxy(request);
    } catch {
      localProxyUnavailable = true;
    }
  }

  // ── Dev fallback: direct REST call with VITE_GEMINI_API_KEY ──────────────
  const devKey = (
    import.meta.env?.VITE_GEMINI_API_KEY ||
    (import.meta.env as any)?.GEMINI_API_KEY ||
    ""
  ).trim();
  if (!devKey) {
    throw new Error(
      "Kein Gemini API-Schlüssel gefunden. " +
        "Bitte VITE_GEMINI_API_KEY in .env.local setzen (lokal) " +
        "oder GEMINI_API_KEY als Vercel-Umgebungsvariable hinterlegen (Produktion)."
    );
  }

  const CANDIDATE_MODELS = [
    "gemini-3.5-flash-lite",
    "gemini-3.8-flash",
    "gemini-flash-latest",
  ];

  const primaryModel = CANDIDATE_MODELS.includes(request.model)
    ? request.model
    : "gemini-3.5-flash-lite";

  const modelsToTry = [
    primaryModel,
    ...CANDIDATE_MODELS.filter((m) => m !== primaryModel),
  ].slice(0, 3);

  const { contents, config = {}, inlineData } = request;

  // Build contents array for the REST API
  const parts: unknown[] = [];
  if (inlineData?.data) parts.push({ inlineData });
  if (typeof contents === "string") {
    parts.push({ text: contents });
  }

  const restContents =
    Array.isArray(contents) && !inlineData
      ? contents
      : [{ parts }];

  const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

  let lastErr: Error | null = null;
  for (const m of modelsToTry) {
    const endpoint = `${GEMINI_BASE}/${m}:generateContent?key=${devKey}`;

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: restContents,
          generationConfig: config,
        }),
      });

      if (res.ok) {
        return await res.json();
      }

      const errJson = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }));
      lastErr = new Error(`[Gemini Direct (${m})] ${res.status}: ${errJson?.error?.message || res.statusText}`);

      // If not a model availability error (404/400), don't keep cycling
      if (res.status !== 404 && res.status !== 400) {
        break;
      }
    } catch (e: any) {
      lastErr = e;
    }
  }

  throw lastErr || new Error("[Gemini Direct] API call failed.");
}
