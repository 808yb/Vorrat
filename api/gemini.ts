/**
 * Vercel Serverless Function: /api/gemini
 *
 * Secure server-side proxy for the Google Gemini REST API.
 * The GEMINI_API_KEY environment variable is read exclusively here on the
 * server – it is NEVER shipped in the client-side JS bundle.
 *
 * Request body (POST, application/json):
 * {
 *   model: string;            // e.g. "gemini-3.8-flash"
 *   contents: unknown;        // Gemini contents (string or Content[])
 *   config?: {                // GenerationConfig (optional)
 *     temperature?: number;
 *     responseMimeType?: string;
 *     [key: string]: unknown;
 *   };
 *   inlineData?: {            // for multimodal (video/image) requests
 *     data: string;           // base64 payload
 *     mimeType: string;
 *   };
 * }
 *
 * Response: raw Gemini REST response JSON.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";

const GEMINI_BASE =
  "https://generativelanguage.googleapis.com/v1beta/models";

/** Build the Gemini REST `contents` array from various input shapes */
function buildContents(
  contents: unknown,
  inlineData?: { data: string; mimeType: string }
): unknown[] {
  const parts: unknown[] = [];

  // Multimodal binary payload (video / image)
  if (inlineData?.data) {
    parts.push({ inlineData });
  }

  // String prompt
  if (typeof contents === "string") {
    parts.push({ text: contents });
  } else if (Array.isArray(contents)) {
    // Already a Content[] or Part[] array – use as-is
    return contents as unknown[];
  } else if (contents && typeof contents === "object") {
    parts.push(contents);
  }

  return [{ parts }];
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // ── Only allow POST ────────────────────────────────────────────────────────
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // ── API key – server-only, never VITE_ prefixed ───────────────────────────
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    console.error("[/api/gemini] GEMINI_API_KEY is not set in environment.");
    return res
      .status(500)
      .json({ error: "Server configuration error: missing API key." });
  }

  // ── Parse request body ────────────────────────────────────────────────────
  const CANDIDATE_MODELS = [
    "gemini-3.5-flash-lite",
    "gemini-3.8-flash",
    "gemini-flash-latest",
    "gemini-flash-lite-latest",
  ];

  const {
    model: requestedModel,
    contents,
    config = {},
    inlineData,
  } = req.body as {
    model?: string;
    contents?: unknown;
    config?: Record<string, unknown>;
    inlineData?: { data: string; mimeType: string };
  };

  const primaryModel = requestedModel && CANDIDATE_MODELS.includes(requestedModel)
    ? requestedModel
    : CANDIDATE_MODELS[0];

  const modelsToTry = [
    primaryModel,
    ...CANDIDATE_MODELS.filter((m) => m !== primaryModel),
  ];

  if (!contents && !inlineData) {
    return res
      .status(400)
      .json({ error: "Request body must include 'contents' or 'inlineData'." });
  }

  const geminiBody = {
    contents: buildContents(contents, inlineData),
    generationConfig: config,
  };

  // ── Forward to Gemini REST API with model fallback ─────────────────────────
  let lastError: { status: number; body: unknown } | null = null;

  for (const currentModel of modelsToTry) {
    const endpoint = `${GEMINI_BASE}/${currentModel}:generateContent?key=${apiKey}`;

    try {
      const upstream = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(geminiBody),
      });

      const upstreamBody = await upstream.json();

      if (upstream.ok) {
        return res.status(200).json(upstreamBody);
      }

      console.warn(
        `[/api/gemini] Model '${currentModel}' returned status ${upstream.status}. Trying next fallback if available...`,
        upstreamBody
      );
      lastError = { status: upstream.status, body: upstreamBody };

      // If error is not a model availability error (404 / 400), don't keep cycling
      if (upstream.status !== 404 && upstream.status !== 400) {
        break;
      }
    } catch (err) {
      console.warn(`[/api/gemini] Fetch error for model '${currentModel}':`, err);
    }
  }

  if (lastError) {
    return res.status(lastError.status).json(lastError.body);
  }

  return res.status(502).json({ error: "Bad Gateway: Gemini API unreachable." });
}
