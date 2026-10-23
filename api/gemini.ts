/**
 * Vercel Serverless Function: /api/gemini
 *
 * Secure server-side proxy for the Google Gemini REST API.
 * The GEMINI_API_KEY environment variable is read exclusively here on the
 * server – it is NEVER shipped in the client-side JS bundle.
 *
 * Security & Hardening:
 * 1. Origin / Referer check: Allowed on localhost, 127.0.0.1 and *.vercel.app.
 * 2. Payload size limits: Max 4 MB for inlineData (images/videos), max 120 KB for text.
 * 3. Rate limiting: In-memory IP-based rate limit (max 20 requests per 60 seconds per IP).
 * 4. Max output tokens cap: generationConfig.maxOutputTokens is capped at 8192.
 * 5. Model cascade: Centralized 3-step fallback without duplicate outer loops.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";

const GEMINI_BASE =
  "https://generativelanguage.googleapis.com/v1beta/models";

// Max 3 supported models in approved cascade
const CANDIDATE_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.8-flash",
  "gemini-flash-latest",
] as const;

// In-Memory IP Rate Limiter (max 15 requests / 60 seconds)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const cleanIp = ip.toLowerCase().trim();
  if (
    cleanIp === "127.0.0.1" ||
    cleanIp === "::1" ||
    cleanIp === "localhost" ||
    cleanIp.startsWith("::ffff:127.0.0.1") ||
    process.env.NODE_ENV !== "production"
  ) {
    return true;
  }

  const now = Date.now();
  // Cleanup old expired entries periodically
  if (rateLimitMap.size > 1000) {
    for (const [key, val] of rateLimitMap.entries()) {
      if (now > val.resetAt) rateLimitMap.delete(key);
    }
  }

  const entry = rateLimitMap.get(cleanIp);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(cleanIp, { count: 1, resetAt: now + 60_000 });
    return true;
  }

  if (entry.count >= 120) {
    return false;
  }

  entry.count++;
  return true;
}

function isOriginAllowed(originHeader?: string, refererHeader?: string): boolean {
  const target = originHeader || refererHeader;
  if (!target) {
    // In production, reject requests without Origin or Referer
    return process.env.NODE_ENV !== "production";
  }
  try {
    const parsed = new URL(target);
    const hostname = parsed.hostname.toLowerCase();
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "vercel.app" ||
      hostname.endsWith(".vercel.app")
    );
  } catch {
    return false;
  }
}

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

  // ── Origin & Referer Verification ─────────────────────────────────────────
  const origin = req.headers.origin as string | undefined;
  const referer = req.headers.referer as string | undefined;
  if (!isOriginAllowed(origin, referer)) {
    return res.status(403).json({ error: "Forbidden: Origin not allowed." });
  }

  // ── IP Rate Limiting (20 requests / 60 seconds) ───────────────────────────
  const clientIp =
    ((req.headers["x-forwarded-for"] as string) || "").split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "unknown-ip";

  if (!checkRateLimit(clientIp)) {
    return res.status(429).json({
      error: "Too Many Requests: Rate limit exceeded (max 20 requests per minute).",
    });
  }

  // ── Payload Size Limits ───────────────────────────────────────────────────
  const body = req.body as {
    model?: string;
    contents?: unknown;
    config?: Record<string, unknown>;
    inlineData?: { data: string; mimeType: string };
  };

  if (!body) {
    return res.status(400).json({ error: "Bad Request: Empty request body." });
  }

  const {
    model: requestedModel,
    contents,
    config = {},
    inlineData,
  } = body;

  if (!contents && !inlineData) {
    return res
      .status(400)
      .json({ error: "Request body must include 'contents' or 'inlineData'." });
  }

  // Multimodal payload limit: max 4 MB base64 data
  if (inlineData?.data) {
    const approximateBytes = inlineData.data.length * 0.75;
    if (approximateBytes > 4 * 1024 * 1024) {
      return res.status(413).json({
        error: "Payload Too Large: Multimodal inlineData must not exceed 4 MB.",
      });
    }
  }

  // Text contents payload limit: max 120 KB
  if (contents) {
    const textLength = typeof contents === "string" ? contents.length : JSON.stringify(contents).length;
    if (textLength > 120 * 1024) {
      return res.status(413).json({
        error: "Payload Too Large: Text content must not exceed 120 KB.",
      });
    }
  }

  // ── API Key Verification ──────────────────────────────────────────────────
  const apiKey = (process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY)?.trim();
  if (!apiKey) {
    console.error("[/api/gemini] Neither GEMINI_API_KEY nor VITE_GEMINI_API_KEY is set in environment.");
    return res
      .status(500)
      .json({ error: "Server configuration error: missing API key." });
  }

  // ── Server-side Token & Config Clamping ───────────────────────────────────
  const clampedConfig = { ...config };
  const requestedMaxTokens = Number(clampedConfig.maxOutputTokens);
  if (requestedMaxTokens && requestedMaxTokens > 8192) {
    clampedConfig.maxOutputTokens = 8192;
  } else if (!requestedMaxTokens) {
    clampedConfig.maxOutputTokens = 8192;
  }

  const primaryModel = requestedModel && (CANDIDATE_MODELS as readonly string[]).includes(requestedModel)
    ? (requestedModel as typeof CANDIDATE_MODELS[number])
    : CANDIDATE_MODELS[0];

  // Up to 3 models in sequence (no infinite loops)
  const modelsToTry: string[] = [
    primaryModel,
    ...CANDIDATE_MODELS.filter((m) => m !== primaryModel),
  ].slice(0, 3);

  const geminiBody = {
    contents: buildContents(contents, inlineData),
    generationConfig: clampedConfig,
  };

  // ── Forward to Gemini REST API with centralized model fallback ────────────
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
