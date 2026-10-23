/**
 * Vercel Serverless Function: /api/scrape
 *
 * Dedicated server-side website scraper for recipe websites.
 *
 * Security & Hardening:
 * 1. Origin / Referer check: Allowed on localhost, 127.0.0.1 and *.vercel.app.
 * 2. In-memory IP Rate Limiter (max 15 requests / 60s per IP).
 * 3. DNS & IPv4/IPv6 SSRF protection (blocks loopback, private RFC1918, link-local, fc00::/7).
 * 4. Manual redirect loop (max 3) with re-validation on every step.
 * 5. Content-Type check (only text/html, text/plain, application/xhtml+xml).
 * 6. Stream size cap (max 1.5 MB).
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import dns from "node:dns";

// ── In-Memory IP Rate Limiter (unbegrenzt für Localhost, max 120 requests / 60 seconds) ──
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const cleanIp = ip.toLowerCase().trim();
  // Auf localhost / 127.0.0.1 / Dev-Modus: Rate-Limit greift GAR NICHT (unbegrenzt!)
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
    // In production, require valid Origin or Referer for POST requests
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

// ── Private / Loopback IP Validator ───────────────────────────────────────────
function isPrivateOrInternalIp(ip: string): boolean {
  const cleanIp = ip.toLowerCase().trim();

  // IPv4 checks
  const ipv4Match = cleanIp.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const o1 = parseInt(ipv4Match[1], 10);
    const o2 = parseInt(ipv4Match[2], 10);
    if (o1 === 0) return true; // 0.0.0.0/8
    if (o1 === 10) return true; // 10.0.0.0/8
    if (o1 === 127) return true; // 127.0.0.0/8
    if (o1 === 169 && o2 === 254) return true; // 169.254.0.0/16
    if (o1 === 172 && o2 >= 16 && o2 <= 31) return true; // 172.16.0.0/12
    if (o1 === 192 && o2 === 168) return true; // 192.168.0.0/16
    if (o1 === 100 && o2 >= 64 && o2 <= 127) return true; // 100.64.0.0/10
    if (o1 === 255) return true;
    return false;
  }

  // IPv6 checks
  if (
    cleanIp === "::1" ||
    cleanIp === "::" ||
    cleanIp === "0:0:0:0:0:0:0:1" ||
    cleanIp === "0:0:0:0:0:0:0:0"
  ) {
    return true;
  }
  // Unique local addresses (fc00::/7 -> fc or fd)
  if (/^f[cd][0-9a-f]{2}:/i.test(cleanIp)) {
    return true;
  }
  // Link-local (fe80::/10 -> fe8, fe9, fea, feb)
  if (/^fe[89ab][0-9a-f]:/i.test(cleanIp)) {
    return true;
  }
  // IPv4-mapped IPv6 (::ffff:127.x.x.x)
  if (cleanIp.startsWith("::ffff:")) {
    const mapped = cleanIp.slice(7);
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(mapped)) {
      return isPrivateOrInternalIp(mapped);
    }
    return true;
  }

  return false;
}

// ── Asynchronous URL & DNS Validation ──────────────────────────────────────────
async function validateUrlAndDns(rawUrl: string): Promise<{ safe: boolean; url?: URL; error?: string }> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { safe: false, error: "Ungültige URL." };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { safe: false, error: "Nur HTTP und HTTPS Protokolle sind zulässig." };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Block obvious loopback & local domain names
  if (
    hostname === "localhost" ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".lan") ||
    hostname.endsWith(".home")
  ) {
    return { safe: false, error: "Anfragen an lokale Hostnames sind untersagt." };
  }

  // Check literal IP address
  if (isPrivateOrInternalIp(hostname)) {
    return { safe: false, error: "Anfragen an private IP-Adressen sind untersagt." };
  }

  // Resolve DNS to verify all destination IPs
  try {
    const lookups = await dns.promises.lookup(hostname, { all: true });
    if (!lookups || lookups.length === 0) {
      return { safe: false, error: "DNS-Auflösung fehlgeschlagen." };
    }

    for (const record of lookups) {
      if (isPrivateOrInternalIp(record.address)) {
        return {
          safe: false,
          error: `Ziel-Host löst auf private IP-Adresse auf (${record.address}).`,
        };
      }
    }
  } catch (dnsErr: any) {
    return { safe: false, error: `DNS-Fehler: ${dnsErr?.message || "Host nicht erreichbar."}` };
  }

  return { safe: true, url: parsed };
}

// ── HTML Entity Decoder ───────────────────────────────────────────────────────
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

// ── Extract HowToSection & HowToStep Instructions Recursively ─────────────────
export interface ExtractedStep {
  sectionTitle?: string;
  text: string;
}

/**
 * Rekursive Extraktion von Zubereitungsschritten aus Schema.org JSON-LD.
 * Löst den kritischen Bug auf Foodblogs (WP Recipe Maker, Tasty Recipes, Mediavine),
 * bei dem `recipeInstructions` aus `HowToSection`-Objekten mit verschachtelten
 * `itemListElement`-Schritten besteht.
 */
export function extractInstructionsFromJsonLd(
  instructions: any,
  currentSectionTitle?: string
): ExtractedStep[] {
  if (!instructions) return [];

  // Plain Text (ggf. mehrzeilig)
  if (typeof instructions === "string") {
    const clean = decodeHtmlEntities(instructions.trim());
    if (!clean) return [];
    if (clean.includes("\n")) {
      return clean
        .split(/\r?\n+/)
        .map((s) => s.replace(/^\d+[\.\)]\s*/, "").trim())
        .filter((s) => s.length > 5)
        .map((text) => ({ sectionTitle: currentSectionTitle, text }));
    }
    return [{ sectionTitle: currentSectionTitle, text: clean }];
  }

  // Einzelnes Objekt in Array wrappen
  if (!Array.isArray(instructions)) {
    if (typeof instructions === "object") {
      return extractInstructionsFromJsonLd([instructions], currentSectionTitle);
    }
    return [];
  }

  const result: ExtractedStep[] = [];

  for (const step of instructions) {
    if (!step) continue;

    if (typeof step === "string") {
      const clean = decodeHtmlEntities(step.trim());
      if (clean) {
        result.push({ sectionTitle: currentSectionTitle, text: clean });
      }
      continue;
    }

    if (typeof step === "object") {
      const typeStr = Array.isArray(step["@type"])
        ? step["@type"].join(" ")
        : String(step["@type"] || "");

      const isSection =
        /HowToSection/i.test(typeStr) ||
        (Array.isArray(step.itemListElement) && step.itemListElement.length > 0 && !step.text);

      if (isSection) {
        const rawSectionName =
          (typeof step.name === "string" ? step.name.trim() : "") ||
          (typeof step.title === "string" ? step.title.trim() : "");
        const sectionName = rawSectionName ? decodeHtmlEntities(rawSectionName) : currentSectionTitle;

        if (Array.isArray(step.itemListElement)) {
          result.push(...extractInstructionsFromJsonLd(step.itemListElement, sectionName));
        }
        continue;
      }

      // Step object (HowToStep, etc.)
      const rawStepText =
        (typeof step.text === "string" ? step.text.trim() : "") ||
        (typeof step.description === "string" ? step.description.trim() : "") ||
        (typeof step.name === "string" ? step.name.trim() : "");

      const stepText = decodeHtmlEntities(rawStepText);
      const rawStepName = typeof step.name === "string" ? step.name.trim() : "";
      const stepName = decodeHtmlEntities(rawStepName);

      if (stepText) {
        let finalText = stepText;
        if (
          stepName &&
          stepName !== stepText &&
          !stepText.toLowerCase().startsWith(stepName.toLowerCase()) &&
          stepName.length < 60
        ) {
          finalText = `${stepName}: ${stepText}`;
        }
        result.push({
          sectionTitle: currentSectionTitle,
          text: finalText,
        });
      } else if (Array.isArray(step.itemListElement)) {
        result.push(...extractInstructionsFromJsonLd(step.itemListElement, currentSectionTitle));
      }
    }
  }

  return result;
}

// ── Extract Recipe Image Supporting All 4 JSON-LD Formats ───────────────────
/**
 * Unterstützt alle 4 Schema.org JSON-LD Formate für recipe.image:
 * 1. String ("https://...")
 * 2. Array aus Strings (["https://..."]) -> image[0]
 * 3. ImageObject ({ "@type": "ImageObject", "url": "https://..." }) -> image.url
 * 4. Array aus ImageObjects ([{ url: "https://..." }]) -> image[0].url
 */
export function extractRecipeImage(rawImage: any, baseUrl?: URL): string | undefined {
  if (!rawImage) return undefined;
  let candidate: string | undefined;

  if (typeof rawImage === "string") {
    candidate = rawImage.trim();
  } else if (Array.isArray(rawImage) && rawImage.length > 0) {
    const first = rawImage[0];
    if (typeof first === "string") {
      candidate = first.trim();
    } else if (typeof first === "object" && first !== null) {
      candidate = (typeof first.url === "string" ? first.url : typeof first.contentUrl === "string" ? first.contentUrl : "")?.trim();
    }
  } else if (typeof rawImage === "object" && rawImage !== null) {
    candidate = (typeof rawImage.url === "string" ? rawImage.url : typeof rawImage.contentUrl === "string" ? rawImage.contentUrl : "")?.trim();
  }

  if (!candidate) return undefined;

  // Ignoriere Platzhalter wie data:image/, blob: oder blank.
  if (/^(?:data:image|blob:)/i.test(candidate) || candidate.includes("blank.") || candidate.includes("placeholder")) {
    return undefined;
  }

  if (baseUrl) {
    try {
      candidate = new URL(candidate, baseUrl.href).toString();
    } catch {}
  }

  return candidate && /^https?:\/\//i.test(candidate) ? candidate : undefined;
}

/**
 * Liest Bilder aus einem <img>-Tag mit strikter Attribut-Priorität:
 * data-lazy-src -> data-src -> data-pin-media -> data-lazy-srcset / srcset -> src
 */
export function extractImgTagSrc(imgTagHtml: string, baseUrl?: URL): string | undefined {
  if (!imgTagHtml) return undefined;

  const attrRegexes = [
    /data-lazy-src=["']([^"']+)["']/i,
    /data-src=["']([^"']+)["']/i,
    /data-pin-media=["']([^"']+)["']/i,
    /data-lazy-srcset=["']([^"']+)["']/i,
    /srcset=["']([^"']+)["']/i,
    /src=["']([^"']+)["']/i,
  ];

  for (const reg of attrRegexes) {
    const match = imgTagHtml.match(reg);
    if (match && match[1]) {
      let rawVal = match[1].trim();
      if (reg.source.includes("srcset")) {
        const firstCandidate = rawVal.split(",")[0]?.trim().split(/\s+/)[0]?.trim();
        if (firstCandidate) rawVal = firstCandidate;
      }
      if (
        rawVal &&
        !rawVal.startsWith("data:image/") &&
        !rawVal.startsWith("blob:") &&
        !rawVal.includes("blank.") &&
        !rawVal.includes("placeholder")
      ) {
        const extracted = extractRecipeImage(rawVal, baseUrl);
        if (extracted) return extracted;
      }
    }
  }

  return undefined;
}

// ── HTML Instruction Steps Fallback ──────────────────────────────────────────
export function extractHtmlInstructionSteps(html: string): ExtractedStep[] {
  const steps: ExtractedStep[] = [];
  // Match common recipe step containers (wprm, tasty, custom)
  const containerRegex = /<(?:div|section|ol|ul)[^>]*class=["'][^"']*(?:instruction|direction|step|zubereitung)[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|section|ol|ul)>/gi;
  let contMatch;
  while ((contMatch = containerRegex.exec(html)) !== null) {
    const block = contMatch[1];
    const itemRegex = /<(?:li|p|div)[^>]*class=["']?[^"']*(?:instruction|step|direction)?[^"']*["']?[^>]*>([\s\S]*?)<\/(?:li|p|div)>/gi;
    let itemMatch;
    while ((itemMatch = itemRegex.exec(block)) !== null) {
      const clean = decodeHtmlEntities(itemMatch[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
      if (
        clean &&
        clean.length > 15 &&
        !/werbung|newsletter|kommentar|drucken|print/i.test(clean) &&
        !steps.some((s) => s.text === clean)
      ) {
        steps.push({ text: clean });
      }
    }
  }
  return steps;
}

// ── Strict Recipe URL Validator ──────────────────────────────────────────────
function getRootDomain(hostname: string): string {
  const parts = hostname.toLowerCase().split(".");
  if (parts.length <= 2) return hostname.toLowerCase();
  return parts.slice(-2).join(".");
}

export function isValidRecipeUrl(candidateUrl: string, baseHostname: string): boolean {
  if (!candidateUrl || typeof candidateUrl !== "string") return false;
  try {
    const parsed = new URL(candidateUrl);
    const candHost = parsed.hostname.toLowerCase();
    const baseHost = baseHostname.toLowerCase();

    // 1. Same hostname or root domain check
    const baseRoot = getRootDomain(baseHost);
    const candRoot = getRootDomain(candHost);
    if (candHost !== baseHost && candRoot !== baseRoot) {
      return false;
    }

    // Exclude CDNs and social hosters that might slip through
    if (
      candHost.includes("cloudinary.com") ||
      candHost.includes("ctfassets.net") ||
      candHost.includes("wp.com") ||
      candHost.includes("pinimg.com") ||
      candHost.includes("fbcdn.net") ||
      candHost.includes("instagram.com") ||
      candHost.includes("twimg.com")
    ) {
      return false;
    }

    // 2. NEVER end with file extensions (.jpg, .jpeg, .png, .webp, .gif, .svg, .pdf, .css, .js)
    const pathname = parsed.pathname.toLowerCase();
    const cleanPath = pathname.replace(/\/$/, "");
    if (/\.(jpg|jpeg|png|webp|gif|svg|pdf|css|js|ico|woff|woff2|ttf|eot)$/i.test(cleanPath)) {
      return false;
    }

    // 3. Media-, Shop-, Auth- und System-Pfade strikt ausschließen
    const nonRecipePatterns = [
      "/cookbook", "/shop", "/store", "/cart", "/checkout",
      "/about", "/contact", "/privacy", "/terms", "/login",
      "/signup", "/register", "/author/",
      "/ueber-uns", "/kontakt", "/impressum", "/datenschutz", "/agb",
      "/comment", "/comments/", "/feed/",
      "/wp-content/", "/wp-admin/", "/wp-json/", "/wp-includes/",
      "/uploads/", "/assets/", "/static/", "/images/", "/media/"
    ];
    for (const pattern of nonRecipePatterns) {
      if (cleanPath.includes(pattern)) {
        return false;
      }
    }

    // Reine Kategorie- oder Schlagwort-Archivseiten ausschließen (z. B. /category/dinner/ oder /tag/quick/page/2/)
    // Aber echte Rezept-Beiträge (z. B. /category/dinner/pasta/) zulassen!
    if (/\/(?:category|kategorie|tag|schlagwort|meal-type)\/[^/]+(?:\/page\/\d+)?\/?$/i.test(cleanPath)) {
      return false;
    }

    if (parsed.pathname === "/" || parsed.pathname === "") {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Validiert eine Paginierungs-URL (z. B. /recipes/page/2/ oder /category/dinner/page/2/ oder ?page=2).
 * WICHTIG: Blockiert NIEMALS /category/ oder /tag/, wenn eine Kategorieseite gescannt wird!
 */
export function isValidPaginationUrl(candidateUrl: string, baseHostname: string): boolean {
  if (!candidateUrl || typeof candidateUrl !== "string") return false;
  try {
    const parsed = new URL(candidateUrl);
    const candHost = parsed.hostname.toLowerCase();
    const baseHost = baseHostname.toLowerCase();

    // 1. Same hostname or root domain check
    const baseRoot = getRootDomain(baseHost);
    const candRoot = getRootDomain(candHost);
    if (candHost !== baseHost && candRoot !== baseRoot) {
      return false;
    }

    // 2. Keine Bild- oder Download-Dateien
    const cleanPath = parsed.pathname.toLowerCase().replace(/\/$/, "");
    if (/\.(jpg|jpeg|png|webp|gif|svg|pdf|css|js|ico|woff|woff2|ttf|eot)$/i.test(cleanPath)) {
      return false;
    }

    // 3. Niemals Shop, Cart, Login, Assets oder Uploads als Paginierung
    const nonPaginationPatterns = [
      "/cookbook", "/shop", "/store", "/cart", "/checkout",
      "/about", "/contact", "/privacy", "/terms", "/login",
      "/signup", "/register", "/author/",
      "/ueber-uns", "/kontakt", "/impressum", "/datenschutz", "/agb",
      "/comment", "/comments/", "/feed/",
      "/wp-content/", "/wp-admin/", "/wp-json/", "/wp-includes/",
      "/uploads/", "/assets/", "/static/", "/images/", "/media/"
    ];
    for (const pat of nonPaginationPatterns) {
      if (cleanPath.includes(pat)) return false;
    }

    return true;
  } catch {
    return false;
  }
}

// ── Extract Schema.org JSON-LD Recipes & ItemLists ─────────────────────────────
export interface ExtractedJsonLdData {
  recipes: any[];
  itemListCards: Array<{ title: string; url: string; imageUrl?: string }>;
}

function collectJsonLdObjects(obj: any, collector: any[] = []): any[] {
  if (!obj) return collector;
  if (Array.isArray(obj)) {
    for (const item of obj) collectJsonLdObjects(item, collector);
  } else if (typeof obj === "object" && obj !== null) {
    collector.push(obj);
    if (obj["@graph"]) collectJsonLdObjects(obj["@graph"], collector);
    if (obj.itemListElement && Array.isArray(obj.itemListElement)) {
      for (const el of obj.itemListElement) {
        if (el?.item) collectJsonLdObjects(el.item, collector);
      }
    }
  }
  return collector;
}

function extractJsonLdData(html: string, baseUrl?: URL): ExtractedJsonLdData {
  const recipes: any[] = [];
  const itemListCards: Array<{ title: string; url: string; imageUrl?: string }> = [];
  const scriptRegex = /<script\s+[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

  let match;
  while ((match = scriptRegex.exec(html)) !== null) {
    try {
      const rawContent = match[1].trim();
      if (!rawContent) continue;
      const parsed = JSON.parse(rawContent);

      const items = collectJsonLdObjects(parsed);

      // Baue ImageMap für alle ImageObjects (z. B. von Yoast / RankMath)
      const imageMap = new Map<string, string>();
      for (const item of items) {
        if (!item) continue;
        const typeStr = Array.isArray(item["@type"])
          ? item["@type"].join(" ")
          : String(item["@type"] || "");
        if (/ImageObject/i.test(typeStr)) {
          const u = item.url || item.contentUrl;
          if (typeof u === "string") {
            const resolved = baseUrl ? new URL(u, baseUrl.href).toString() : u;
            if (item["@id"]) imageMap.set(item["@id"], resolved);
            if (item.url) imageMap.set(item.url, resolved);
          }
        }
      }

      for (const item of items) {
        if (!item) continue;
        const typeStr = Array.isArray(item["@type"])
          ? item["@type"].join(" ")
          : String(item["@type"] || "");

        // 1. Schema.org Recipe (Detailseite oder eingebettet)
        if (/Recipe/i.test(typeStr)) {
          if (item.recipeInstructions) {
            item.extractedInstructions = extractInstructionsFromJsonLd(item.recipeInstructions);
          }
          let imgCandidate = item.image;
          if (imgCandidate && typeof imgCandidate === "object" && imgCandidate["@id"] && imageMap.has(imgCandidate["@id"])) {
            imgCandidate = imageMap.get(imgCandidate["@id"]);
          }
          item.verifiedImageUrl = extractRecipeImage(imgCandidate, baseUrl);
          recipes.push(item);
        }

        // 2. Stufe 1: ItemList auf Übersichtsseiten (Chefkoch, EatSmarter, Lecker, EDEKA etc.)
        if (/ItemList/i.test(typeStr) && Array.isArray(item.itemListElement)) {
          for (const listEl of item.itemListElement) {
            if (!listEl) continue;
            const target = listEl.item || listEl;
            const cardUrl = target.url || target["@id"] || listEl.url;
            const cardName = target.name || listEl.name;
            let rawImg = target.image || listEl.image;
            if (rawImg && typeof rawImg === "object" && rawImg["@id"] && imageMap.has(rawImg["@id"])) {
              rawImg = imageMap.get(rawImg["@id"]);
            }
            const cardImg = extractRecipeImage(rawImg, baseUrl);

            if (cardUrl && cardName && typeof cardName === "string" && typeof cardUrl === "string") {
              try {
                const fullUrl = baseUrl ? new URL(cardUrl, baseUrl.origin).toString() : cardUrl;
                itemListCards.push({
                  title: decodeHtmlEntities(cardName.trim()),
                  url: fullUrl,
                  imageUrl: cardImg,
                });
              } catch {}
            }
          }
        }
      }
    } catch {
      // Ignore malformed JSON-LD scripts
    }
  }

  return { recipes, itemListCards };
}

// ── Extract Recipe Links & Cards ──────────────────────────────────────────────
export function extractRecipeCardsAndLinks(
  html: string,
  baseUrl: URL,
  jsonLdRecipes?: any[],
  itemListCards?: Array<{ title: string; url: string; imageUrl?: string }>
): Array<{ title: string; url: string; imageUrl?: string }> {
  const discovered: Array<{ title: string; url: string; imageUrl?: string }> = [];
  const seenUrls = new Set<string>();

  const registerCard = (c: { title: string; url: string; imageUrl?: string }) => {
    try {
      const fullUrl = new URL(c.url, baseUrl.origin).toString();
      const normUrl = fullUrl.split("#")[0].replace(/\/$/, "");
      if (seenUrls.has(normUrl)) return;
      if (!isValidRecipeUrl(normUrl, baseUrl.hostname)) return;

      seenUrls.add(normUrl);
      discovered.push({
        title: decodeHtmlEntities(c.title.trim()),
        url: fullUrl,
        imageUrl: c.imageUrl ? extractRecipeImage(c.imageUrl, baseUrl) : undefined,
      });
    } catch {}
  };

  // Stufe 1a: Aus Schema.org ItemList (Chefkoch, EatSmarter, Lecker, EDEKA etc.)
  if (Array.isArray(itemListCards)) {
    for (const card of itemListCards) {
      registerCard(card);
    }
  }

  // Stufe 1b: Aus Schema.org JSON-LD Recipes falls direkt eingebettet
  if (Array.isArray(jsonLdRecipes)) {
    for (const ld of jsonLdRecipes) {
      if (ld?.url && ld?.name && typeof ld.name === "string") {
        const ldImg = extractRecipeImage(ld.image, baseUrl);
        registerCard({
          title: ld.name,
          url: ld.url,
          imageUrl: ldImg,
        });
      }
    }
  }

  // Stufe 2a: Artikel-basierter Scanner (<article>...</article>)
  // Auf Foodblogs (z. B. moribyan.com, WP-Recipe-Maker) ist jede Rezeptkarte ein <article>
  const articleRegex = /<article\b[^>]*>([\s\S]*?)<\/article>/gi;
  let artMatch;
  while ((artMatch = articleRegex.exec(html)) !== null) {
    const block = artMatch[1];

    // Suche nach dem echten Beitrags-Link: Durchsuche ALLE <a>-Tags im Block!
    // (Verhindert den kritischen Bug, dass der erste Link ein /category/- oder /meal-type/-Link ist)
    let recipeUrl: string | undefined;
    let linkTitleCandidate = "";
    const aTagRegex = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let aMatch;

    while ((aMatch = aTagRegex.exec(block)) !== null) {
      const rawHref = aMatch[1].trim();
      if (!rawHref || rawHref.startsWith("#") || rawHref.startsWith("javascript:") || rawHref.startsWith("mailto:")) {
        continue;
      }
      try {
        const full = new URL(rawHref, baseUrl.origin).toString();
        const norm = full.split("#")[0].replace(/\/$/, "");
        if (isValidRecipeUrl(norm, baseUrl.hostname)) {
          recipeUrl = full;
          const innerClean = aMatch[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
          if (
            innerClean &&
            innerClean.length >= 3 &&
            !/weiterlesen|mehr|read more|zum rezept|view recipe/i.test(innerClean)
          ) {
            linkTitleCandidate = innerClean;
          }
          break; // Erster echter Rezept-Link in diesem Article-Block
        }
      } catch {}
    }

    if (!recipeUrl) continue;

    // Bild suchen im selben Article-Block (data-lazy-src -> data-src -> data-pin-media -> srcset -> src)
    let imageUrl: string | undefined;
    const imgTagMatch = block.match(/<img\b[^>]+>/i);
    if (imgTagMatch) {
      imageUrl = extractImgTagSrc(imgTagMatch[0], baseUrl);
    } else {
      const sourceMatch = block.match(/<source\b[^>]+srcset=["']([^"'\s]+)["']/i);
      if (sourceMatch) {
        imageUrl = extractRecipeImage(sourceMatch[1], baseUrl);
      }
    }

    // Titel suchen (h2, h3, h4, aria-label, img alt, oder Link-Text)
    let title = "";
    const headingMatch = block.match(/<(?:h2|h3|h4)\b[^>]*>([\s\S]*?)<\/(?:h2|h3|h4)>/i);
    if (headingMatch) {
      title = headingMatch[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    }
    if (!title || title.length < 3) {
      const ariaMatch = block.match(/aria-label=["'](?:View recipe:\s*)?([^"']{3,})["']/i);
      if (ariaMatch) title = ariaMatch[1].trim();
    }
    if (!title || title.length < 3) {
      const altMatch = block.match(/alt=["']([^"']{3,})["']/i);
      if (altMatch) title = altMatch[1].trim();
    }
    if (!title || title.length < 3) {
      title = linkTitleCandidate;
    }

    if (title && title.length >= 3 && !/weiterlesen|mehr|read more|zum rezept|view recipe/i.test(title)) {
      registerCard({ title, url: recipeUrl, imageUrl });
    }
  }

  // Stufe 2b: Fallback-Container (.recipe-card, .entry, .post, .teaser, etc.) falls < 3 Karten gefunden
  if (discovered.length < 3) {
    const containerRegex = /<(?:div|li|section)[^>]*class=["'][^"']*(?:recipe|card|teaser|entry|post|item)[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|li|section)>/gi;
    let contMatch;
    while ((contMatch = containerRegex.exec(html)) !== null) {
      const block = contMatch[1];
      const aTagRegex = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
      let aMatch;
      let candUrl: string | undefined;
      let candLinkTitle = "";

      while ((aMatch = aTagRegex.exec(block)) !== null) {
        const rawHref = aMatch[1].trim();
        if (!rawHref || rawHref.startsWith("#") || rawHref.startsWith("javascript:")) continue;
        try {
          const full = new URL(rawHref, baseUrl.origin).toString();
          const norm = full.split("#")[0].replace(/\/$/, "");
          if (isValidRecipeUrl(norm, baseUrl.hostname)) {
            candUrl = full;
            const innerClean = aMatch[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
            if (innerClean && innerClean.length >= 3 && !/weiterlesen|mehr|read more|zum rezept/i.test(innerClean)) {
              candLinkTitle = innerClean;
            }
            break;
          }
        } catch {}
      }

      if (!candUrl) continue;

      let imageUrl: string | undefined;
      const imgTagMatch = block.match(/<img\b[^>]+>/i);
      if (imgTagMatch) {
        imageUrl = extractImgTagSrc(imgTagMatch[0], baseUrl);
      }

      let title = "";
      const headingMatch = block.match(/<(?:h2|h3|h4)\b[^>]*>([\s\S]*?)<\/(?:h2|h3|h4)>/i);
      if (headingMatch) {
        title = headingMatch[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      }
      if (!title || title.length < 3) {
        title = candLinkTitle;
      }

      if (title && title.length >= 3 && !/weiterlesen|mehr|read more|zum rezept/i.test(title)) {
        registerCard({ title, url: candUrl, imageUrl });
      }
    }
  }

  // Stufe 2c: Ergänzender Link-Scanner für alle verbleibenden internen Links
  if (discovered.length < 3) {
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
        if (!isValidRecipeUrl(normUrl, baseUrl.hostname)) continue;

        const isExplicitRecipePath =
          /\/(?:rezept|rezepte|recipe|recipes|gerichte)\/[^/?#]{3,}/i.test(normUrl) ||
          /\/[a-z0-9_-]+-rezept\/?/i.test(normUrl) ||
          /\/[a-z0-9_-]+-recipe\/?/i.test(normUrl);

        let title = linkInner.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
        const altMatch = linkInner.match(/alt=["']([^"']{3,})["']/i);
        if ((!title || title.length < 3) && altMatch) {
          title = altMatch[1].trim();
        }

        let imageUrl: string | undefined;
        const imgTagMatch = linkInner.match(/<img\s+[^>]+>/i);
        if (imgTagMatch) {
          imageUrl = extractImgTagSrc(imgTagMatch[0], baseUrl);
        }

        const hasArticleCard = isExplicitRecipePath || Boolean(imageUrl && title.length >= 4);

        if (
          hasArticleCard &&
          title &&
          title.length >= 3 &&
          !/weiterlesen|mehr|zum rezept|kommentar|read more/i.test(title)
        ) {
          registerCard({ title, url: fullUrl, imageUrl });
        }
      } catch {}
    }
  }

  // Bis zu 40 Karten pro Seite zurückgeben
  return discovered.slice(0, 40);
}

// Alias für Abwärtskompatibilität
export const extractRecipeLinks = extractRecipeCardsAndLinks;

export function extractNextPageUrl(html: string, baseUrl: URL): string | undefined {
  // Guard: NEVER append pagination to an image URL or media file!
  const baseCleanPath = baseUrl.pathname.toLowerCase().replace(/\/$/, "");
  if (/\.(jpg|jpeg|png|webp|gif|svg|pdf|css|js)$/i.test(baseCleanPath)) {
    return undefined;
  }
  if (!isValidPaginationUrl(baseUrl.toString(), baseUrl.hostname)) {
    return undefined;
  }

  // Berechne aktuelle Seitenzahl
  let currentPage = 1;
  const matchPagePath = baseUrl.pathname.match(/\/page\/(\d+)\/?/i);
  if (matchPagePath) {
    currentPage = parseInt(matchPagePath[1], 10);
  } else {
    const pageParam = baseUrl.searchParams.get("page") || baseUrl.searchParams.get("paged") || baseUrl.searchParams.get("p") || baseUrl.searchParams.get("seite");
    if (pageParam && /^\d+$/.test(pageParam)) {
      currentPage = parseInt(pageParam, 10);
    }
  }
  const nextPageNum = currentPage + 1;

  const nextPatterns = [
    /<link\s+[^>]*rel=["']next["'][^>]*href=["']([^"']+)["']/i,
    /<a\s+[^>]*rel=["']next["'][^>]*href=["']([^"']+)["']/i,
    /<a\s+[^>]*href=["']([^"']+)["'][^>]*rel=["']next["']/i,
    /<a\s+[^>]*class=["'][^"']*(?:next|pagination__next|page-numbers\s+next|next-page|nav-next)[^"']*["'][^>]*href=["']([^"']+)["']/i,
    /<a\s+[^>]*href=["']([^"']+)["'][^>]*class=["'][^"']*(?:next|pagination__next|page-numbers\s+next|next-page|nav-next)[^"']/i,
    new RegExp(`<a\\s+[^>]*href=["']([^"']*(?:/page/${nextPageNum}/?|[?&](?:page|paged|p|seite)=${nextPageNum}[^"']*))["']`, "i"),
    new RegExp(`<a\\s+[^>]*href=["']([^"']+)["'][^>]*>(?:[^<]*?(?:Weiter|Nächste|Next|»|&raquo;|→|${nextPageNum})[^<]*?)<\\/a>`, "i"),
  ];

  for (const reg of nextPatterns) {
    const m = html.match(reg);
    if (m && m[1]) {
      try {
        const candidate = new URL(m[1].trim(), baseUrl.origin).toString();
        if (candidate !== baseUrl.toString() && isValidPaginationUrl(candidate, baseUrl.hostname)) {
          return candidate;
        }
      } catch {}
    }
  }

  // Fallback: Prüfen ob /page/${nextPageNum}/ etc. im HTML als Link existiert
  try {
    const targetSub = `/page/${nextPageNum}/`;
    if (html.includes(targetSub)) {
      const nextUrl = new URL(baseUrl.toString());
      if (matchPagePath) {
        nextUrl.pathname = baseUrl.pathname.replace(/\/page\/\d+\/?/i, targetSub);
      } else {
        const cleanPath = baseUrl.pathname.replace(/\/$/, "");
        nextUrl.pathname = `${cleanPath}${targetSub}`;
      }
      return nextUrl.toString();
    }
  } catch {}

  return undefined;
}

// ── Main Handler ──────────────────────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Rate-limiting check
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

  // Origin / Referer check
  const origin = req.headers.origin as string | undefined;
  const referer = req.headers.referer as string | undefined;
  if (!isOriginAllowed(origin, referer)) {
    return res.status(403).json({
      error: "Zugriff verweigert (Ungültiger Origin-Header).",
    });
  }

  // Accept GET (?url=...) and POST ({ url: "..." })
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

    // Follow up to 3 redirects manually, validating each destination against SSRF
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

      // Handle Redirects manually
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

    // Content-Type validation
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

    // Stream-size cap: 5 MB (5,242,880 Bytes). KEIN 413-Fehler mehr!
    // Wenn > 5 MB, Stream einfach beenden und die ersten 5 MB ganz normal weiterverarbeiten.
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
              } catch {}
              break; // Truncate and continue without error!
            }
            chunks.push(value);
            receivedBytes += value.length;
          }
        }
      } catch (streamErr: any) {
        // Safe catch: If upstream connection drops during read, proceed with buffered chunks
        try {
          await reader.cancel();
        } catch {}
      }
    } else {
      const text = await finalResponse.text();
      const encoded = new TextEncoder().encode(text);
      if (encoded.length > MAX_BYTES) {
        chunks.push(encoded.slice(0, MAX_BYTES));
        receivedBytes = MAX_BYTES;
      } else {
        chunks.push(encoded);
        receivedBytes = encoded.length;
      }
    }

    const totalBuffer = new Uint8Array(receivedBytes);
    let offset = 0;
    for (const chunk of chunks) {
      totalBuffer.set(chunk, offset);
      offset += chunk.length;
    }
    const html = new TextDecoder("utf-8").decode(totalBuffer);

    // OpenGraph & Meta Extraction
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch ? decodeHtmlEntities(titleMatch[1].replace(/\s+/g, " ").trim()) : "";

    const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
    const ogTitle = ogTitleMatch ? decodeHtmlEntities(ogTitleMatch[1].trim()) : title;

    const ogImgRegexes = [
      /<meta\s+[^>]*property=["']og:image(?::secure_url)?["'][^>]*content=["']([^"']+)["']/i,
      /<meta\s+[^>]*content=["']([^"']+)["'][^>]*property=["']og:image(?::secure_url)?["']/i,
      /<meta\s+[^>]*name=["']og:image(?::secure_url)?["'][^>]*content=["']([^"']+)["']/i,
      /<meta\s+[^>]*content=["']([^"']+)["'][^>]*name=["']og:image(?::secure_url)?["']/i,
      /<link\s+[^>]*rel=["']image_src["'][^>]*href=["']([^"']+)["']/i,
    ];
    let ogImage: string | undefined;
    for (const reg of ogImgRegexes) {
      const m = html.match(reg);
      if (m && m[1]) {
        ogImage = extractRecipeImage(m[1].trim(), finalUrl);
        if (ogImage) break;
      }
    }

    const twitterImgMatch =
      html.match(/<meta[^>]+(?:name|property)=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']twitter:image(?::src)?["']/i);
    let twitterImage: string | undefined;
    if (twitterImgMatch && twitterImgMatch[1]) {
      try {
        twitterImage = extractRecipeImage(twitterImgMatch[1].trim(), finalUrl);
      } catch {}
    }

    const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
    const ogDescription = ogDescMatch ? decodeHtmlEntities(ogDescMatch[1].trim()) : undefined;

    // Schema.org JSON-LD Extraction (Stufe 1: Recipes & ItemList)
    const { recipes: jsonLdRecipes, itemListCards } = extractJsonLdData(html, finalUrl);

    // Link Discovery & Pagination (Stufe 2: ItemList + Container + Links)
    const recipeLinks = extractRecipeLinks(html, finalUrl, jsonLdRecipes, itemListCards);
    const nextPageUrl = extractNextPageUrl(html, finalUrl);

    // Punkt 3: Verified Image aus JSON-LD, og:image oder twitter:image sicher ermitteln
    let verifiedImageUrl: string | undefined;
    if (jsonLdRecipes.length > 0 && jsonLdRecipes[0].verifiedImageUrl) {
      verifiedImageUrl = jsonLdRecipes[0].verifiedImageUrl;
    } else if (ogImage) {
      verifiedImageUrl = ogImage;
    } else if (twitterImage) {
      verifiedImageUrl = twitterImage;
    }

    // Punkt 4: rawSteps unverkürzt aus JSON-LD (HowToSection -> itemListElement) oder HTML-Listen
    let rawSteps: ExtractedStep[] = [];
    if (
      jsonLdRecipes.length > 0 &&
      Array.isArray(jsonLdRecipes[0].extractedInstructions) &&
      jsonLdRecipes[0].extractedInstructions.length > 0
    ) {
      rawSteps = jsonLdRecipes[0].extractedInstructions;
    } else {
      rawSteps = extractHtmlInstructionSteps(html);
    }

    // Cleaned Plain Text
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

    // Stufe 3: Fallback für Rezept-Unterseiten ohne JSON-LD (<main> oder <article>)
    let articleText: string | undefined;
    const articleContainerMatch = html.match(/<(?:main|article)[^>]*>([\s\S]*?)<\/(?:main|article)>/i);
    if (articleContainerMatch) {
      const cleanArticle = articleContainerMatch[1]
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
        .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, "")
        .replace(/<!--[\s\S]*?-->/g, "")
        .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, "")
        .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, "")
        .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, "")
        .replace(/<[^>]+>/g, " ");
      articleText = decodeHtmlEntities(cleanArticle.replace(/\s+/g, " ").trim()).slice(0, 35000);
    }

    // Server-side direkte Recipe-Extraktion für Unterseiten
    let recipe:
      | {
          title: string;
          imageUrl?: string;
          ingredients: string[];
          steps: ExtractedStep[];
          prepTime?: string;
          cookTime?: string;
          totalTime?: string;
          servings?: string;
        }
      | undefined;

    if (jsonLdRecipes.length > 0) {
      const primaryRecipe = jsonLdRecipes[0];
      const recTitle =
        (typeof primaryRecipe.name === "string" ? primaryRecipe.name.trim() : "") ||
        ogTitle ||
        title;
      const recImg = primaryRecipe.verifiedImageUrl || ogImage || twitterImage;
      const recIngs: string[] = Array.isArray(primaryRecipe.recipeIngredient)
        ? primaryRecipe.recipeIngredient
            .map((i: any) => decodeHtmlEntities(String(i).trim()))
            .filter(Boolean)
        : [];
      const recSteps: ExtractedStep[] =
        Array.isArray(primaryRecipe.extractedInstructions) &&
        primaryRecipe.extractedInstructions.length > 0
          ? primaryRecipe.extractedInstructions
          : primaryRecipe.recipeInstructions
          ? extractInstructionsFromJsonLd(primaryRecipe.recipeInstructions)
          : rawSteps;

      const recYield = Array.isArray(primaryRecipe.recipeYield)
        ? String(primaryRecipe.recipeYield[0] || "")
        : primaryRecipe.recipeYield
        ? String(primaryRecipe.recipeYield)
        : undefined;

      recipe = {
        title: recTitle,
        imageUrl: recImg,
        ingredients: recIngs,
        steps: recSteps,
        prepTime: primaryRecipe.prepTime ? String(primaryRecipe.prepTime) : undefined,
        cookTime: primaryRecipe.cookTime ? String(primaryRecipe.cookTime) : undefined,
        totalTime: primaryRecipe.totalTime ? String(primaryRecipe.totalTime) : undefined,
        servings: recYield,
      };
    }

    return res.status(200).json({
      success: true,
      url: finalUrl.toString(),
      title: ogTitle || title,
      ogTitle,
      ogImage,
      twitterImage,
      verifiedImageUrl,
      recipe,
      jsonLdRecipes,
      cards: recipeLinks,
      recipeLinks,
      rawSteps,
      textContent,
      articleText,
      nextPageUrl,
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
