/**
 * Vercel Serverless Function: /api/scrape
 *
 * Dedicated server-side website scraper for recipe websites.
 * Replaces direct client-side calls to untrusted third-party proxies (r.jina.ai, allorigins.win).
 *
 * Capabilities:
 * - SSRF protection (blocks localhost, loopback, private RFC1918 IPs).
 * - Full HTML retrieval with authentic browser headers and 8s timeout.
 * - Extracts Schema.org JSON-LD (@type: Recipe) blocks directly on the server.
 * - Extracts OpenGraph metadata (og:title, og:image, og:description).
 * - Discovers recipe card links, recipe images, and pagination (nextPageUrl).
 * - Sanitizes raw HTML into readable text snippet.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";

/** Validates that a URL is safe from SSRF attacks */
function isSafeUrl(rawUrl: string): { safe: boolean; url?: URL; error?: string } {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { safe: false, error: "Only HTTP and HTTPS protocols are allowed." };
    }

    const host = parsed.hostname.toLowerCase();

    // Check localhost & loopback
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "0.0.0.0" ||
      host === "::1" ||
      host.endsWith(".local") ||
      host.endsWith(".internal")
    ) {
      return { safe: false, error: "Requests to localhost or local domains are prohibited." };
    }

    // Check private IPv4 ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 169.254.0.0/16)
    const ipv4Match = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (ipv4Match) {
      const octet1 = parseInt(ipv4Match[1], 10);
      const octet2 = parseInt(ipv4Match[2], 10);

      if (
        octet1 === 10 ||
        (octet1 === 172 && octet2 >= 16 && octet2 <= 31) ||
        (octet1 === 192 && octet2 === 168) ||
        (octet1 === 169 && octet2 === 254) ||
        octet1 === 127 ||
        octet1 === 0
      ) {
        return { safe: false, error: "Requests to private IP addresses are prohibited." };
      }
    }

    return { safe: true, url: parsed };
  } catch {
    return { safe: false, error: "Malformed URL." };
  }
}

/** Decodes common HTML entities into readable characters */
function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&auml;/gi, "ä")
    .replace(/&ouml;/gi, "ö")
    .replace(/&uuml;/gi, "ü")
    .replace(/&szlig;/gi, "ß")
    .replace(/&Auml;/g, "Ä")
    .replace(/&Ouml;/g, "Ö")
    .replace(/&Uuml;/g, "Ü");
}

/** Extracts JSON-LD scripts, specifically recipes */
function extractJsonLdRecipes(html: string): any[] {
  const recipes: any[] = [];
  const scriptRegex = /<script\s+[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

  let match;
  while ((match = scriptRegex.exec(html)) !== null) {
    try {
      const rawContent = match[1].trim();
      if (!rawContent) continue;
      const parsed = JSON.parse(rawContent);

      const items = Array.isArray(parsed)
        ? parsed
        : parsed["@graph"] && Array.isArray(parsed["@graph"])
        ? parsed["@graph"]
        : [parsed];

      for (const item of items) {
        if (!item) continue;
        const typeStr = Array.isArray(item["@type"]) ? item["@type"].join(" ") : String(item["@type"] || "");
        if (/Recipe/i.test(typeStr)) {
          recipes.push(item);
        }
      }
    } catch {
      // Ignore malformed JSON-LD scripts
    }
  }

  return recipes;
}

/** Discovers recipe links inside the page */
function extractRecipeLinks(html: string, baseUrl: URL): Array<{ title: string; url: string; imageUrl?: string }> {
  const discovered: Array<{ title: string; url: string; imageUrl?: string }> = [];
  const seenUrls = new Set<string>();

  const linkRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = linkRegex.exec(html)) !== null) {
    const rawHref = match[1].trim();
    const linkInner = match[2];

    if (
      !rawHref ||
      rawHref.startsWith("#") ||
      rawHref.startsWith("javascript:") ||
      rawHref.startsWith("mailto:")
    ) {
      continue;
    }

    try {
      const fullUrl = new URL(rawHref, baseUrl.origin).toString();
      const normUrl = fullUrl.split("#")[0].replace(/\/$/, "");

      if (seenUrls.has(normUrl)) continue;

      // Filter for likely recipe URLs
      const isRecipePath =
        /\/(?:rezept|rezepte|recipe|recipes|gerichte)\/[^/?#]{3,}/i.test(normUrl) ||
        /\/[a-z0-9_-]+-rezept\/?/i.test(normUrl) ||
        /\/[a-z0-9_-]+-recipe\/?/i.test(normUrl);

      if (isRecipePath) {
        // Extract title from text or img alt
        let title = linkInner.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
        const altMatch = linkInner.match(/alt=["']([^"']{3,})["']/i);
        if ((!title || title.length < 3) && altMatch) {
          title = altMatch[1].trim();
        }

        let imageUrl: string | undefined;
        const imgMatch = linkInner.match(/(?:src|data-src|data-lazy-src)=["']([^"']+)["']/i);
        if (imgMatch) {
          try {
            imageUrl = new URL(imgMatch[1], baseUrl.origin).toString();
          } catch {}
        }

        if (title && title.length >= 3 && !/weiterlesen|mehr|zum rezept|kommentar/i.test(title)) {
          seenUrls.add(normUrl);
          discovered.push({
            title: decodeHtmlEntities(title),
            url: fullUrl,
            imageUrl,
          });
        }
      }
    } catch {}
  }

  return discovered;
}

/** Extracts next pagination page URL */
function extractNextPageUrl(html: string, baseUrl: URL): string | undefined {
  const nextPatterns = [
    /rel=["']next["'][^>]*href=["']([^"']+)["']/i,
    /href=["']([^"']+)["'][^>]*rel=["']next["']/i,
    /<a\s+[^>]*class=["'][^"']*(?:next|pagination__next|page-numbers\s+next)[^"']*["'][^>]*href=["']([^"']+)["']/i,
  ];

  for (const reg of nextPatterns) {
    const m = html.match(reg);
    if (m && m[1]) {
      try {
        return new URL(m[1].trim(), baseUrl.origin).toString();
      } catch {}
    }
  }

  return undefined;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // ── Accept GET (?url=...) and POST ({ url: "..." }) ────────────────────────
  let targetUrl = "";
  if (req.method === "GET") {
    targetUrl = String(req.query.url || "").trim();
  } else if (req.method === "POST") {
    targetUrl = String((req.body as any)?.url || "").trim();
  } else {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  if (!targetUrl) {
    return res.status(400).json({ error: "Missing required 'url' parameter." });
  }

  if (!/^https?:\/\//i.test(targetUrl)) {
    targetUrl = `https://${targetUrl}`;
  }

  const check = isSafeUrl(targetUrl);
  if (!check.safe || !check.url) {
    return res.status(400).json({ error: check.error || "Invalid or unsafe URL." });
  }

  const safeUrl = check.url;

  try {
    const response = await fetch(safeUrl.toString(), {
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
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      return res.status(response.status).json({
        error: `Upstream HTTP ${response.status}: ${response.statusText}`,
        url: safeUrl.toString(),
      });
    }

    const html = await response.text();

    // ── OpenGraph & Meta Extraction ─────────────────────────────────────────
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch ? decodeHtmlEntities(titleMatch[1].replace(/\s+/g, " ").trim()) : "";

    const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
    const ogTitle = ogTitleMatch ? decodeHtmlEntities(ogTitleMatch[1].trim()) : title;

    const ogImgMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
    let ogImage: string | undefined;
    if (ogImgMatch) {
      try {
        ogImage = new URL(ogImgMatch[1].trim(), safeUrl.origin).toString();
      } catch {}
    }

    const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
    const ogDescription = ogDescMatch ? decodeHtmlEntities(ogDescMatch[1].trim()) : undefined;

    // ── Schema.org JSON-LD Extraction ───────────────────────────────────────
    const jsonLdRecipes = extractJsonLdRecipes(html);

    // ── Link Discovery & Pagination ─────────────────────────────────────────
    const recipeLinks = extractRecipeLinks(html, safeUrl);
    const nextPageUrl = extractNextPageUrl(html, safeUrl);

    // ── Cleaned Plain Text (remove script, style, nav, footer) ──────────────
    const cleanedHtml = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
      .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, "")
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, "")
      .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, "")
      .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, "")
      .replace(/<[^>]+>/g, " ");

    const textContent = decodeHtmlEntities(cleanedHtml.replace(/\s+/g, " ").trim()).slice(0, 45000);

    return res.status(200).json({
      success: true,
      url: safeUrl.toString(),
      title: ogTitle || title,
      ogTitle,
      ogImage,
      ogDescription,
      jsonLdRecipes,
      recipeLinks,
      textContent,
      nextPageUrl,
    });
  } catch (err: any) {
    const isTimeout = err?.name === "TimeoutError" || err?.name === "AbortError";
    return res.status(isTimeout ? 504 : 502).json({
      error: isTimeout
        ? "Gateway Timeout: Website took longer than 8 seconds to respond."
        : `Scrape error: ${err?.message || "Unknown network error"}`,
      url: safeUrl.toString(),
    });
  }
}
