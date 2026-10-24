/**
 * Vercel Serverless Function: /api/scrape
 *
 * Dedicated server-side website scraper for recipe websites.
 *
 * Security & Hardening:
 * 1. Origin / Referer check: Allowed on localhost, 127.0.0.1, *.vercel.app, and custom ALLOWED_ORIGINS.
 * 2. In-memory IP Rate Limiter (unbegrenzt für Localhost, max 120 requests / 60s per IP in Production).
 * 3. DNS & IPv4/IPv6 SSRF protection (blocks loopback, private RFC1918, link-local, fc00::/7).
 * 4. Manual redirect loop (max 3) with re-validation on every step.
 * 5. Content-Type check (only text/html, text/plain, application/xhtml+xml).
 * 6. Stream size cap (max 5 MB with stream truncation instead of 413 error).
 * 7. Support for POST with JSON body `{ url }`.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import dns from "node:dns";
import {
  parseScrapedHtml,
  extractInstructionsFromJsonLd,
  extractRecipeImage,
  extractHtmlInstructionSteps,
  isValidRecipeUrl,
  isValidPaginationUrl,
  extractJsonLdData,
  extractRecipeCardsAndLinks,
  extractNextPageUrl,
  getRootDomain,
  type ExtractedStep,
} from "../src/utils/scrapeParser";

export {
  extractInstructionsFromJsonLd,
  extractRecipeImage,
  extractHtmlInstructionSteps,
  isValidRecipeUrl,
  isValidPaginationUrl,
  extractJsonLdData,
  extractRecipeCardsAndLinks,
  extractNextPageUrl,
  getRootDomain,
  type ExtractedStep,
};

// ── In-Memory IP Rate Limiter (unbegrenzt für Localhost, max 120 requests / 60 seconds) ──
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

// ── Strict Origin Hostname Check ──────────────────────────────────────────────
function isOriginAllowed(originHeader?: string, refererHeader?: string): boolean {
  const target = originHeader || refererHeader;
  if (!target) {
    return process.env.NODE_ENV !== "production";
  }
  try {
    const parsed = new URL(target);
    const hostname = parsed.hostname.toLowerCase();
    const originString = parsed.origin.toLowerCase();

    const customAllowed = (process.env.ALLOWED_ORIGINS || "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    for (const allowed of customAllowed) {
      const allowedHost = allowed.replace(/^https?:\/\//, "").split("/")[0].split(":")[0];
      if (originString === allowed || hostname === allowedHost) {
        return true;
      }
    }

    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      (hostname.endsWith(".vercel.app") && hostname.includes("vorrat"))
    );
  } catch {
    return false;
  }
}

// ── Private / Loopback IP Validator ───────────────────────────────────────────
function isPrivateOrInternalIp(ip: string): boolean {
  const c = ip.toLowerCase().trim();
  const m = c.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const [o1, o2] = [parseInt(m[1], 10), parseInt(m[2], 10)];
    return o1 === 0 || o1 === 10 || o1 === 127 || o1 === 255 || (o1 === 169 && o2 === 254) || (o1 === 172 && o2 >= 16 && o2 <= 31) || (o1 === 192 && o2 === 168) || (o1 === 100 && o2 >= 64 && o2 <= 127);
  }
  if (c === "::1" || c === "::" || c === "0:0:0:0:0:0:0:1" || c.startsWith("fe80:") || c.startsWith("fc") || c.startsWith("fd")) return true;
  return c.startsWith("::ffff:") ? isPrivateOrInternalIp(c.replace("::ffff:", "")) : false;
}

async function validateUrlAndDns(candidateUrl: string): Promise<{ safe: boolean; error?: string; url?: URL }> {
  let parsed: URL;
  try {
    parsed = new URL(candidateUrl);
  } catch {
    return { safe: false, error: "Ungültiges URL-Format." };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { safe: false, error: "Nur HTTP und HTTPS-Protokolle sind erlaubt." };
  }
  const host = parsed.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal") || host.endsWith(".lan") || host.endsWith(".home") || isPrivateOrInternalIp(host)) {
    return { safe: false, error: "Anfragen an lokale/private Hostnames oder IPs sind untersagt." };
  }
  try {
    const lookups = await dns.promises.lookup(host, { all: true });
    if (!lookups || lookups.length === 0) return { safe: false, error: "DNS-Auflösung fehlgeschlagen." };
    for (const r of lookups) {
      if (isPrivateOrInternalIp(r.address)) return { safe: false, error: `Ziel-Host löst auf private IP-Adresse auf (${r.address}).` };
    }
  } catch (dnsErr: any) {
    return { safe: false, error: `DNS-Fehler: ${dnsErr?.message || "Host nicht erreichbar."}` };
  }
  return { safe: true, url: parsed };
}

// ── Main Handler ──────────────────────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const ip =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    (req.headers["x-real-ip"] as string) ||
    req.socket?.remoteAddress ||
    "unknown";

  if (!checkRateLimit(ip)) {
    return res.status(429).json({
      error: "Zu viele Anfragen. Bitte warte kurz (Rate Limit: 120 Anfragen / Minute).",
    });
  }

  const origin = req.headers.origin as string | undefined;
  const referer = req.headers.referer as string | undefined;
  if (!isOriginAllowed(origin, referer)) {
    return res.status(403).json({
      error: "Zugriff verweigert (Ungültiger Origin-Header).",
    });
  }

  if (req.method === "OPTIONS") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ error: "Method Not Allowed. Nur POST-Anfragen sind gestattet." });
  }

  let targetUrl = String((req.body as any)?.url || "").trim();

  if (!targetUrl) {
    return res.status(400).json({ error: "Fehlender 'url'-Parameter." });
  }

  if (!/^https?:\/\//i.test(targetUrl)) {
    targetUrl = `https://${targetUrl}`;
  }

  try {
    let currentUrl = targetUrl;
    let finalResponse: Response | null = null;
    let finalUrl = new URL(currentUrl);
    const MAX_REDIRECTS = 3;

    for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount++) {
      const validation = await validateUrlAndDns(currentUrl);
      if (!validation.safe || !validation.url) {
        return res.status(400).json({ error: validation.error || "Ungültige oder unsichere URL." });
      }

      finalUrl = validation.url;

      const response = await fetch(finalUrl.toString(), {
        method: "GET",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "Accept-Language": "de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7",
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "none",
          "Cache-Control": "no-cache",
        },
        redirect: "manual",
        signal: AbortSignal.timeout(8000),
      });

      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get("location");
        if (!location) {
          return res.status(400).json({ error: "Redirect ohne Location-Header erhalten." });
        }
        if (redirectCount === MAX_REDIRECTS) {
          return res.status(400).json({ error: "Zu viele Weiterleitungen (max. 3 erlaubt)." });
        }
        currentUrl = new URL(location, currentUrl).toString();
        continue;
      }

      finalResponse = response;
      break;
    }

    if (!finalResponse) {
      return res.status(502).json({ error: "Keine Antwort von Ziel-Server." });
    }

    if (!finalResponse.ok) {
      return res.status(finalResponse.status).json({
        error: `Upstream HTTP ${finalResponse.status}: ${finalResponse.statusText}`,
        url: finalUrl.toString(),
      });
    }

    const contentType = (finalResponse.headers.get("content-type") || "").toLowerCase();
    const isValidType =
      contentType.includes("text/html") ||
      contentType.includes("text/plain") ||
      contentType.includes("application/xhtml+xml");

    if (!isValidType) {
      return res.status(415).json({
        error: `Ungültiger Content-Type: ${contentType}. Erlaubt sind nur HTML und Plain Text.`,
      });
    }

    // Stream-size cap: 5 MB (5,242,880 Bytes). KEIN unbegrenztes response.text()!
    const MAX_BYTES = 5 * 1024 * 1024;
    let receivedBytes = 0;
    const chunks: Uint8Array[] = [];

    if (finalResponse.body) {
      const reader = finalResponse.body.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            if (receivedBytes + value.length > MAX_BYTES) {
              const allowed = MAX_BYTES - receivedBytes;
              if (allowed > 0) {
                chunks.push(value.slice(0, allowed));
                receivedBytes += allowed;
              }
              try {
                await reader.cancel();
              } catch (cancelErr) {
                console.warn("[api/scrape] reader.cancel() warning:", cancelErr);
              }
              break;
            }
            chunks.push(value);
            receivedBytes += value.length;
          }
        }
      } catch (streamErr) {
        console.warn("[api/scrape] Stream reading interrupted:", streamErr);
        try {
          await reader.cancel();
        } catch (cancelErr) {
          console.warn("[api/scrape] reader.cancel() after error warning:", cancelErr);
        }
      }
    }

    const totalBuffer = new Uint8Array(receivedBytes);
    let offset = 0;
    for (const chunk of chunks) {
      totalBuffer.set(chunk, offset);
      offset += chunk.length;
    }
    const html = new TextDecoder("utf-8").decode(totalBuffer);

    // Parse HTML with modular parser
    const parsedData = parseScrapedHtml(html, finalUrl);

    return res.status(200).json({
      success: true,
      url: finalUrl.toString(),
      ...parsedData,
    });
  } catch (err: any) {
    const isTimeout = err?.name === "TimeoutError" || err?.name === "AbortError";
    return res.status(isTimeout ? 504 : 502).json({
      error: isTimeout
        ? "Gateway Timeout: Website hat innerhalb von 8 Sekunden nicht geantwortet."
        : `Scrape-Fehler: ${err?.message || "Unbekannter Netzwerkfehler"}`,
      url: targetUrl,
    });
  }
}
