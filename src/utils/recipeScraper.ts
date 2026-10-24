import { callGeminiProxy, extractTextFromGeminiResponse } from "./geminiProxy";
import { type CatalogRecipe } from "../data/recipeCatalog";
import { findMatchingPantryItem } from "./pantryMatching";
import { decomposeCompositeIngredients, getRecipeCategory } from "./recipeHelpers";
import {
  getRootDomain,
  extractInstructionsFromJsonLd,
  type ExtractedStep,
} from "./scrapeParser";
import { reportWarning } from "./logger";
import {
  resolveRecipeFoodImage,
  extractIngredientsFromDishText,
  isTitleSimilar,
  type RawGeminiIngredient,
} from "./geminiRecipes";

export { extractInstructionsFromJsonLd };

export interface DiscoveredRecipeCard {
  title: string;
  imageUrl: string;
  recipeUrl: string;
}

export interface ScrapePageResult {
  recipes: CatalogRecipe[];
  nextPageUrl?: string;
  hasMorePages: boolean;
  pageNumber: number;
}

export interface ScrapeSinglePageOptions {
  onProgress?: (statusText: string) => void;
  onBatchLoaded?: (batchRecipes: CatalogRecipe[], pageNumber: number) => void;
  onBatchRecipesFound?: (batchRecipes: CatalogRecipe[], pageNumber: number) => void;
  shouldStop?: () => boolean;
}

export interface ScrapeWebsiteOptions {
  startPage?: number;
  pagesToScan?: number;
  maxPages?: number;
  autoCrawlAll?: boolean;
  existingTitles?: string[];
  existingUrls?: string[];
  onProgress?: (info: {
    currentPage: number;
    maxPages: number;
    foundRecipesCount: number;
    statusText: string;
  }) => void;
  onPageScraped?: (recipesOnPage: CatalogRecipe[], pageNum: number, hasMorePages: boolean) => void;
  onBatchLoaded?: (batchRecipes: CatalogRecipe[], pageNum: number) => void;
  onBatchRecipesFound?: (batchRecipes: CatalogRecipe[], pageNum: number) => void;
  shouldStop?: () => boolean;
}

export type ExtractedInstructionStep = ExtractedStep;

export interface RecipeSubpageDetails {
  title: string;
  imageUrl: string;
  verifiedImageUrl?: string;
  ogImage?: string;
  jsonLdImage?: string;
  recipeUrl: string;
  recipeIngredient: string[];
  recipeInstructions: ExtractedInstructionStep[];
  rawSteps?: ExtractedInstructionStep[];
  totalTime?: string;
  rawText?: string;
  originalServings?: number;
}

export function extractMeaningfulTextFromHtml(html: string, baseUrl: string): string {
  const parts: string[] = [];

  // 1. JSON-LD scripts (often contain Recipe metadata schema.org/Recipe)
  const jsonLdRegex = /<script\s+[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = jsonLdRegex.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      parts.push("JSON-LD: " + JSON.stringify(parsed));
    } catch (err) {
      reportWarning("extractMeaningfulTextFromHtml.jsonLdParse", err);
      parts.push("JSON-LD (raw): " + match[1].slice(0, 3000));
    }
  }

  // 2. Structured Recipe Cards / Articles / Grid-Items
  const cardRegex = /<(?:article|div|li)[^>]*class=["'][^"']*(?:recipe|card|entry|post|grid-item|item)[^"']*["'][^>]*>([\s\S]*?)<\/(?:article|div|li)>/gi;
  let cardCount = 0;
  while ((match = cardRegex.exec(html)) !== null && cardCount < 30) {
    const cardHtml = match[1];

    // Find title in h1-h4 or link
    const titleMatch = cardHtml.match(/<(?:h[1-4]|a)[^>]*>([\s\S]*?)<\/(?:h[1-4]|a)>/i);
    const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : "";

    // Find link
    const linkMatch = cardHtml.match(/<a\s+[^>]*href=["']([^"']+)["']/i);
    let linkUrl = "";
    if (linkMatch && linkMatch[1] && !linkMatch[1].startsWith("#") && !linkMatch[1].startsWith("javascript:")) {
      try {
        linkUrl = new URL(linkMatch[1], baseUrl).href;
      } catch (err) {
        reportWarning("extractMeaningfulTextFromHtml.linkUrl", err);
      }
    }

    // Find image (src, data-src, data-lazy-src, srcset)
    let imageUrl = "";
    const imgMatch = cardHtml.match(/<img\s+[^>]*?(?:src|data-src|data-lazy-src|srcset)=["']([^"']+)["']/i);
    if (imgMatch && imgMatch[1]) {
      const rawImg = imgMatch[1].split(",")[0].trim().split(" ")[0].trim();
      if (rawImg && !rawImg.startsWith("data:") && !rawImg.endsWith(".svg")) {
        try {
          imageUrl = new URL(rawImg, baseUrl).href;
        } catch (err) {
          reportWarning("extractMeaningfulTextFromHtml.imageUrl", err);
        }
      }
    }

    if (title && (linkUrl || imageUrl)) {
      parts.push(`REZEPT-KARTE:\n- Titel: ${title}\n- Link: ${linkUrl || baseUrl}\n- Bild: ${imageUrl || "kein Bild"}`);
      cardCount++;
    }
  }

  // 3. Standalone Headings
  if (cardCount === 0) {
    const headingRegex = /<(h[1-3])[^>]*>([\s\S]*?)<\/\1>/gi;
    while ((match = headingRegex.exec(html)) !== null) {
      const text = match[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      if (text.length > 3 && text.length < 150) {
        parts.push(`TITEL: ${text}`);
      }
    }
  }

  // 4. Links & Images list
  const linkRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let linkCount = 0;
  while ((match = linkRegex.exec(html)) !== null && linkCount < 50) {
    const href = match[1];
    const text = match[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (text.length > 5 && text.length < 100 && !href.startsWith("#") && !href.startsWith("javascript:")) {
      try {
        const fullUrl = new URL(href, baseUrl).toString();
        parts.push(`LINK: [${text}](${fullUrl})`);
        linkCount++;
      } catch (err) {
        reportWarning("extractMeaningfulTextFromHtml.linkCount", err);
      }
    }
  }

  return parts.join("\n\n");
}

/**
 * 1. ECHTES WEB-FETCHING & PAGINIERUNGS-ERKENNUNG
 * Ruft den Inhalt einer Rezept-Webseite mit Paginierung ab.
 * Primär: Eigener Serverless Endpoint /api/scrape (5 MB Stream, SSRF- & CORS-geschützt)
 * Fallback: r.jina.ai (CORS-frei, sauberes Markdown mit Bildern & Links)
 */
export async function fetchWebsiteContent(
  url: string,
  page: number = 1
): Promise<{ content: string; nextPageUrl?: string; cards?: DiscoveredRecipeCard[]; recipe?: any }> {
  let targetUrl = url.trim();
  if (!/^https?:\/\//i.test(targetUrl)) {
    targetUrl = `https://${targetUrl}`;
  }

  // Guard: NIEMALS Paginierung an eine Bild-URL oder ungültige URL anhängen!
  const cleanTargetLower = targetUrl.split("?")[0].toLowerCase().replace(/\/$/, "");
  if (/\.(jpg|jpeg|png|webp|gif|svg|pdf|css|js)$/i.test(cleanTargetLower)) {
    return { content: "", nextPageUrl: undefined, cards: [] };
  }

  // Intelligenter Aufbau der Paginierungs-URL wenn page > 1
  if (page > 1) {
    if (/\/page\/\d+/i.test(targetUrl)) {
      targetUrl = targetUrl.replace(/\/page\/\d+/i, `/page/${page}`);
    } else if (/[?&](page|p|seite)=\d+/i.test(targetUrl)) {
      targetUrl = targetUrl.replace(/([?&](page|p|seite)=)\d+/i, `$1${page}`);
    } else {
      try {
        const urlObj = new URL(targetUrl);
        if (urlObj.search) {
          urlObj.searchParams.set("page", String(page));
          targetUrl = urlObj.toString();
        } else {
          const cleanPath = urlObj.pathname.replace(/\/$/, "");
          targetUrl = `${urlObj.origin}${cleanPath}/page/${page}/`;
        }
      } catch (err) {
        reportWarning("fetchWebsiteContent.paginationUrl", err);
        targetUrl = targetUrl.includes("?") ? `${targetUrl}&page=${page}` : `${targetUrl}?page=${page}`;
      }
    }
  }

  let textContent = "";

  // 0. Primärer Scraper: Eigener Serverless Endpoint POST /api/scrape (bis zu 5 MB)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9000);
    const res = await fetch("/api/scrape", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: targetUrl }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      if (data && data.success) {
        let assembledText = "";
        if (Array.isArray(data.jsonLdRecipes) && data.jsonLdRecipes.length > 0) {
          assembledText += `=== SCHEMA.ORG REZEPT-DATEN (JSON-LD) ===\n${JSON.stringify(data.jsonLdRecipes, null, 2)}\n\n`;
        }
        if (data.title) {
          assembledText += `Titel: ${data.title}\n`;
        }
        if (data.ogDescription) {
          assembledText += `Beschreibung: ${data.ogDescription}\n\n`;
        }
        if (Array.isArray(data.recipeLinks) && data.recipeLinks.length > 0) {
          assembledText += `\n=== ENTDECKTE REZEPT-LINKS (${data.recipeLinks.length}) ===\n`;
          for (const l of data.recipeLinks) {
            assembledText += `[![${l.title}](${l.imageUrl || ""})](${l.url}) ### [${l.title}](${l.url})\n`;
          }
          assembledText += `\n`;
        }
        if (data.textContent) {
          assembledText += data.textContent;
        }

        const rawCardList = Array.isArray(data.cards) && data.cards.length > 0
          ? data.cards
          : Array.isArray(data.recipeLinks)
          ? data.recipeLinks
          : [];

        const discoveredCards: DiscoveredRecipeCard[] = rawCardList
          .filter((l: any) => l.title && (l.url || l.recipeUrl))
          .map((l: any) => ({
            title: String(l.title).trim(),
            recipeUrl: String(l.url || l.recipeUrl).trim(),
            imageUrl: l.imageUrl ? String(l.imageUrl).trim() : "",
          }));

        if (assembledText.length > 80 || discoveredCards.length > 0 || data.recipe) {
          return {
            content: assembledText.slice(0, 45000),
            nextPageUrl: data.nextPageUrl,
            cards: discoveredCards,
            recipe: data.recipe,
          };
        }
      }
    }
  } catch (err) {
    reportWarning("fetchWebsiteContent.scrapeApiFallback", err);
    // Weiter zum Fallback wenn /api/scrape temporär fehlschlägt
  }

  // 1. Fallback: r.jina.ai (mit X-With-Images-Summary & X-With-Links-Summary)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);
    const jinaUrl = `https://r.jina.ai/${targetUrl}`;
    const res = await fetch(jinaUrl, {
      signal: controller.signal,
      headers: {
        "Accept": "text/markdown, text/plain, */*",
        "X-With-Images-Summary": "true",
        "X-With-Links-Summary": "true",
        "X-No-Cache": "true",
      },
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      const txt = await res.text();
      if (txt && txt.length > 150) {
        textContent = txt;
      }
    }
  } catch (err) {
    reportWarning("fetchWebsiteContent.jinaFallback", err);
  }

  // Falls leer, Basis-String bereitstellen
  if (!textContent) {
    textContent = `Webseite: ${targetUrl}\n(Inhalt konnte nicht direkt geladen werden)`;
  }

  // Suche nach nächster Paginierungs-URL für page + 1
  let nextPageUrl: string | undefined;
  const nextPageNum = page + 1;
  const nextRegexes = [
    new RegExp(`rel=["']next["'][^>]*href=["']([^"']+)["']`, "i"),
    new RegExp(`href=["']([^"']+)["'][^>]*rel=["']next["']`, "i"),
    new RegExp(`href=["']([^"']*(?:/page/${nextPageNum}/?|[?&](?:page|p|seite)=${nextPageNum}[^"']*))["']`, "i"),
    new RegExp(`\\[[^\\]]*(?:Weiter|Nächste|Next|${nextPageNum})[^\\]]*\\]\\(([^)\\s]+)\\)`, "i"),
    new RegExp(`\\[[^\\]]*\\]\\(([^)\\s]*(?:/page/${nextPageNum}/?|[?&](?:page|p|seite)=${nextPageNum}[^)\\s]*))\\)`, "i"),
  ];

  for (const reg of nextRegexes) {
    const m = textContent.match(reg);
    if (m && m[1]) {
      const foundUrl = m[1].trim();
      try {
        const candidateUrl = new URL(foundUrl, targetUrl).toString();
        const candLower = candidateUrl.toLowerCase();
        if (
          !candLower.includes("/wp-content/") &&
          !candLower.includes("/uploads/") &&
          !candLower.includes("/assets/") &&
          !candLower.includes("/static/") &&
          !candLower.includes("/images/") &&
          !candLower.includes("/media/") &&
          !candLower.includes("/feed/") &&
          !candLower.includes("/wp-json/") &&
          !/\.(jpg|jpeg|png|webp|gif|svg|pdf|css|js)$/i.test(candLower.split("?")[0])
        ) {
          nextPageUrl = candidateUrl;
          break;
        }
      } catch (err) {
        reportWarning("fetchWebsiteContent.nextPageUrlValidation", err);
      }
    }
  }

  const content = textContent.slice(0, 45000);
  return { content, nextPageUrl };
}

/**
 * Phase A: Extrahiert alle Rezeptkarten (Titel, Bild-URL, Link) von einer Übersichtsseite
 */
export function extractRecipeCardsFromListing(content: string, _baseUrl: string): DiscoveredRecipeCard[] {
  const cards: DiscoveredRecipeCard[] = [];
  const seenUrls = new Set<string>();

  const isExcluded = (url: string, title: string) => {
    const u = url.toLowerCase();
    const t = title.toLowerCase().trim();
    if (!u.startsWith("http")) return true;

    // Guard: NIEMALS Bild-URLs oder Datei-Downloads als Rezeptkarte erfassen!
    const cleanUrlPath = u.split("?")[0].replace(/\/$/, "");
    if (/\.(jpg|jpeg|png|webp|gif|svg|pdf|css|js|ico|woff|woff2|ttf|eot)$/i.test(cleanUrlPath)) {
      return true;
    }

    if (_baseUrl) {
      try {
        const baseHost = new URL(_baseUrl).hostname.toLowerCase();
        const candHost = new URL(url).hostname.toLowerCase();
        if (candHost !== baseHost && getRootDomain(candHost) !== getRootDomain(baseHost)) {
          return true; // Externe Domain / CDN
        }
        if (
          candHost.includes("cloudinary.com") ||
          candHost.includes("ctfassets.net") ||
          candHost.includes("wp.com") ||
          candHost.includes("pinimg.com")
        ) {
          return true;
        }
      } catch (err) {
        reportWarning("extractRecipeCardsFromListing.isExcluded", err);
        return true;
      }
    }

    // Reine Kategorie- oder Schlagwort-Archivseiten ausschließen (z. B. /category/dinner/ oder /tag/quick/page/2/)
    // Aber echte Rezept-Beiträge (z. B. /category/dinner/pasta/) zulassen!
    if (/\/(?:category|kategorie|tag|schlagwort|meal-type)\/[^/]+(?:\/page\/\d+)?\/?$/i.test(cleanUrlPath)) {
      return true;
    }

    if (
      u.includes("/author/") ||
      u.includes("/about") ||
      u.includes("/ueber-uns") ||
      u.includes("/contact") ||
      u.includes("/kontakt") ||
      u.includes("/privacy") ||
      u.includes("/datenschutz") ||
      u.includes("/terms") ||
      u.includes("/agb") ||
      u.includes("/shop") ||
      u.includes("/store") ||
      u.includes("/cookbook") ||
      u.includes("/wp-content/") ||
      u.includes("/wp-admin/") ||
      u.includes("/wp-json/") ||
      u.includes("/wp-includes/") ||
      u.includes("/uploads/") ||
      u.includes("/assets/") ||
      u.includes("/static/") ||
      u.includes("/images/") ||
      u.includes("/media/") ||
      u.includes("/feed/") ||
      u.includes("/cart") ||
      u.includes("/checkout") ||
      u.includes("/comment") ||
      u.includes("/lifestyle/") ||
      u.includes("what-i-eat") ||
      u.includes("what-i-ate") ||
      u.includes("grocery-haul") ||
      u.includes("vlog")
    ) {
      return true;
    }
    if (u.endsWith("#wp--skip-link--target") || u.endsWith("#content")) return true;
    if (
      t.includes("what i eat") ||
      t.includes("what i ate") ||
      t.includes("was ich esse") ||
      t.includes("was ich gegessen") ||
      t.includes("grocery haul") ||
      t.includes("food haul") ||
      t.includes("day in the life") ||
      t.includes("morning routine") ||
      t.includes("weekly vlog") ||
      t.includes("q&a") ||
      t.includes("favorites of the month") ||
      t.includes("roundup")
    ) {
      return true;
    }
    if (
      [
        "appetizer",
        "breakfast",
        "dessert",
        "dinner",
        "drinks",
        "main course",
        "restaurant remakes",
        "sauce",
        "side dish",
        "snack",
        "soup",
        "recipes",
        "home",
        "search",
        "skip to content",
      ].includes(t)
    ) {
      return true;
    }
    return false;
  };

  // Pattern 1 (z.B. Moribyan / Foodblogs):
  // [![Image N](imgUrl)](recipeUrl) followed by ### [Title](recipeUrl) oder [Title](recipeUrl)
  const regex1 = /\[\!\[[^\]]*\]\((https?:\/\/[^\s\)]+)\)\]\((https?:\/\/[^\s\)]+)\)\s*(?:###|\*\*|##)?\s*\[([^\]]+)\]\(\2\)/gi;
  let m: RegExpExecArray | null;
  while ((m = regex1.exec(content)) !== null) {
    const imageUrl = m[1].trim();
    const recipeUrl = m[2].trim();
    const title = m[3].trim();
    const cleanUrl = recipeUrl.replace(/\/$/, "");
    if (!isExcluded(recipeUrl, title) && !seenUrls.has(cleanUrl)) {
      seenUrls.add(cleanUrl);
      cards.push({ title, imageUrl, recipeUrl });
    }
  }

  // Pattern 2: Category badge followed by image link and recipe title link
  const regex2 = /\[\!\[[^\]]*\]\((https?:\/\/[^\s\)]+)\)\]\((https?:\/\/[^\s\)]+)\)[\s\S]{0,120}?\[([^\]]+)\]\(\2\)/gi;
  while ((m = regex2.exec(content)) !== null) {
    const imageUrl = m[1].trim();
    const recipeUrl = m[2].trim();
    const title = m[3].trim();
    const cleanUrl = recipeUrl.replace(/\/$/, "");
    if (!isExcluded(recipeUrl, title) && !seenUrls.has(cleanUrl)) {
      seenUrls.add(cleanUrl);
      cards.push({ title, imageUrl, recipeUrl });
    }
  }

  // Pattern 3: Standard-Markdown: ### [Title](recipeUrl) gefolgt von ![Title](imgUrl)
  const regex3 = /###\s*\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)[\s\S]{0,180}?\!\[[^\]]*\]\((https?:\/\/[^\s\)]+)\)/gi;
  while ((m = regex3.exec(content)) !== null) {
    const title = m[1].trim();
    const recipeUrl = m[2].trim();
    const imageUrl = m[3].trim();
    const cleanUrl = recipeUrl.replace(/\/$/, "");
    if (!isExcluded(recipeUrl, title) && !seenUrls.has(cleanUrl)) {
      seenUrls.add(cleanUrl);
      cards.push({ title, imageUrl, recipeUrl });
    }
  }

  // Pattern 4: HTML-Tags <a href="recipeUrl">...<img src="imgUrl">...<h3>Title</h3>
  const htmlRegex = /<a\s+[^>]*href=["'](https?:\/\/[^"']+)["'][^>]*>[\s\S]*?<img\s+[^>]*src=["'](https?:\/\/[^"']+)["'][^>]*>[\s\S]*?<(?:h2|h3|h4|span|div)[^>]*>([^<]+)<\/(?:h2|h3|h4|span|div)>/gi;
  while ((m = htmlRegex.exec(content)) !== null) {
    const recipeUrl = m[1].trim();
    const imageUrl = m[2].trim();
    const title = m[3].trim();
    const cleanUrl = recipeUrl.replace(/\/$/, "");
    if (!isExcluded(recipeUrl, title) && !seenUrls.has(cleanUrl)) {
      seenUrls.add(cleanUrl);
      cards.push({ title, imageUrl, recipeUrl });
    }
  }

  // Pattern 5: Markdown-Links zu Rezepten: [Rezepttitel](recipeUrl)
  const regex5 = /\[([^\]]{4,})\]\((https?:\/\/[^\s\)]+)\)/gi;
  while ((m = regex5.exec(content)) !== null) {
    const title = m[1].replace(/<[^>]+>/g, "").trim();
    const recipeUrl = m[2].trim();
    const cleanUrl = recipeUrl.replace(/\/$/, "");
    if (!isExcluded(recipeUrl, title) && !seenUrls.has(cleanUrl)) {
      const isPath =
        /\/(?:rezept|rezepte|recipe|recipes|gerichte)\//i.test(cleanUrl) ||
        /-[a-z0-9]+-(?:rezept|recipe)\/?$/i.test(cleanUrl);
      if (isPath) {
        seenUrls.add(cleanUrl);
        cards.push({ title, imageUrl: "", recipeUrl });
      }
    }
  }

  return cards;
}

export function extractJsonLdFromHtml(html: string): any | null {
  const jsonLdRegex = /<script\s+[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = jsonLdRegex.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      const items = Array.isArray(parsed) ? parsed : (parsed["@graph"] || [parsed]);
      for (const item of items) {
        const type = item["@type"];
        const isRecipe = type === "Recipe" || (Array.isArray(type) && type.includes("Recipe"));
        if (isRecipe) {
          return item;
        }
      }
    } catch (err) {
      reportWarning("extractJsonLdFromHtml", err);
    }
  }
  return null;
}

/**
 * Liest die Original-Portionsangabe (z.B. aus JSON-LD recipeYield oder data.recipe.servings)
 * als Zahl aus (z.B. "4 servings" -> 4, Fallback 2).
 */
export function parseServingsYield(yieldVal: any): number {
  if (typeof yieldVal === "number" && !isNaN(yieldVal) && yieldVal > 0) {
    return Math.round(yieldVal);
  }
  if (Array.isArray(yieldVal) && yieldVal.length > 0) {
    return parseServingsYield(yieldVal[0]);
  }
  if (typeof yieldVal === "string") {
    const match = yieldVal.match(/(\d+)/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > 0 && num <= 50) return num;
    }
  }
  return 2;
}

/**
 * Phase B: Ruft die Unterseite eines Rezepts ab und extrahiert JSON-LD Schema.org / Print / Markdown
 */
export async function fetchRecipeSubpageDetails(
  card: DiscoveredRecipeCard
): Promise<RecipeSubpageDetails> {
  const result: RecipeSubpageDetails = {
    title: card.title,
    imageUrl: card.imageUrl,
    recipeUrl: card.recipeUrl,
    recipeIngredient: [],
    recipeInstructions: [],
    rawSteps: [],
  };

  // 0. Primärer Abruf über unseren eigenen /api/scrape Endpoint (POST, CORS-frei, 5 MB Limit)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9000);
    const res = await fetch("/api/scrape", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: card.recipeUrl }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      if (data?.success) {
        if (data.title && (!result.title || result.title.length < 5)) {
          result.title = data.title;
        }

        if (data.ogImage && !result.imageUrl) {
          result.imageUrl = data.ogImage;
          result.ogImage = data.ogImage;
        }

        // Schema.org Recipe aus /api/scrape auswerten
        const jsonLdRecipe = Array.isArray(data.jsonLdRecipes) && data.jsonLdRecipes.length > 0
          ? data.jsonLdRecipes[0]
          : null;

        if (jsonLdRecipe) {
          if (jsonLdRecipe.name && (!result.title || result.title.length < 5)) {
            result.title = jsonLdRecipe.name;
          }

          if (jsonLdRecipe.image) {
            let img = "";
            if (typeof jsonLdRecipe.image === "string") {
              img = jsonLdRecipe.image;
            } else if (Array.isArray(jsonLdRecipe.image) && typeof jsonLdRecipe.image[0] === "string") {
              img = jsonLdRecipe.image[0];
            } else if (jsonLdRecipe.image.url && typeof jsonLdRecipe.image.url === "string") {
              img = jsonLdRecipe.image.url;
            }
            if (img && !img.includes("example.com")) {
              result.imageUrl = img;
              result.jsonLdImage = img;
              result.verifiedImageUrl = img;
            }
          }

          if (Array.isArray(jsonLdRecipe.recipeIngredient)) {
            result.recipeIngredient = jsonLdRecipe.recipeIngredient
              .map((ing: any) => (typeof ing === "string" ? ing.trim() : ""))
              .filter(Boolean);
          }

          if (jsonLdRecipe.recipeInstructions) {
            const extractedSteps = extractInstructionsFromJsonLd(jsonLdRecipe.recipeInstructions);
            if (extractedSteps.length > 0) {
              result.recipeInstructions = extractedSteps;
              result.rawSteps = extractedSteps;
            }
          }

          if (jsonLdRecipe.totalTime || jsonLdRecipe.cookTime) {
            result.totalTime = String(jsonLdRecipe.totalTime || jsonLdRecipe.cookTime);
          }

          if (jsonLdRecipe.recipeYield) {
            result.originalServings = parseServingsYield(jsonLdRecipe.recipeYield);
          }
        }

        if (!result.originalServings && data.recipe?.servings) {
          result.originalServings = parseServingsYield(data.recipe.servings);
        }

        result.originalServings = result.originalServings || 2;

        if (data.textContent && data.textContent.length > 100) {
          result.rawText = data.textContent.slice(0, 9000);
        }

        if (result.recipeIngredient.length > 0 && result.recipeInstructions.length > 0) {
          return result;
        }
      }
    }
  } catch (err) {
    reportWarning("fetchRecipeSubpageDetails.apiScrapeFallback", err);
  }

  // 1. Fallback: Print-Version abrufen (viele Blogs wie WP Recipe Maker haben /print/)
  try {
    const cleanUrl = card.recipeUrl.replace(/\/$/, "");
    const printUrl = `${cleanUrl}/print/`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);
    const jinaPrintUrl = `https://r.jina.ai/${printUrl}`;
    const res = await fetch(jinaPrintUrl, {
      signal: controller.signal,
      headers: { "Accept": "text/markdown, text/plain, */*" },
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      const txt = await res.text();
      if (txt && txt.length > 200) {
        result.rawText = txt.slice(0, 9000);
      }
    }
  } catch (err) {
    reportWarning("fetchRecipeSubpageDetails.printFallback", err);
  }

  // 2. Fallback: Reguläre Detailseite via r.jina.ai abrufen
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const jinaUrl = `https://r.jina.ai/${card.recipeUrl}`;
    const res = await fetch(jinaUrl, {
      signal: controller.signal,
      headers: { "Accept": "text/markdown, text/plain, */*" },
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      const txt = await res.text();
      if (txt && txt.length > 200) {
        result.rawText = txt.slice(0, 9000);
      }
    }
  } catch (err) {
    reportWarning("fetchRecipeSubpageDetails.jinaDetailFallback", err);
  }

  result.originalServings = result.originalServings || 2;
  return result;
}

// ── Hilfsfunktionen für Sprach- und Zeiterkennung ─────────────────────────────
export function isGermanRecipeText(title: string, steps?: ExtractedInstructionStep[]): boolean {
  const combined = `${title} ${(steps || []).map((s) => s.text).join(" ")}`.toLowerCase();
  const deWords = [" und ", " mit ", " die ", " der ", " das ", " in ", " für ", " bei ", " auf ", " den ", " dem ", " zutat", " schritt", " backen", " kochen", " erhitzen", " schneiden", " pfanne", " ofen", " minuten", " prise", " teig", " soße", " sauce", " servieren", " esslöffel", " teelöffel"];
  const enWords = [" and ", " with ", " the ", " in ", " for ", " at ", " on ", " of ", " to ", " ingredient", " step", " bake", " cook", " heat", " cut", " pan", " oven", " minutes", " dough", " sauce", " serve", " bowl", " skillet", " tablespoon", " teaspoon", " cup"];

  let deScore = 0;
  for (const w of deWords) {
    if (combined.includes(w)) deScore++;
  }
  let enScore = 0;
  for (const w of enWords) {
    if (combined.includes(w)) enScore++;
  }
  return deScore >= enScore;
}

export function extractStepDuration(text: string): string {
  const match = text.match(/(\d+(?:[.,]\d+)?(?:\s*-\s*\d+)?)\s*(?:minuten|minute|min\.?|minutes|mins?|std\.?|stunden|hours?|hrs?)/i);
  return match ? match[0].trim() : "5 Min.";
}

export function isSpiceOrHerbName(name: string): boolean {
  const n = (name || "").toLowerCase();
  return (
    n.includes("salz") ||
    n.includes("salt") ||
    n.includes("pfeffer") ||
    n.includes("pepper") ||
    n.includes("gewürz") ||
    n.includes("spice") ||
    n.includes("paprikapulver") ||
    n.includes("paprika") ||
    n.includes("zimt") ||
    n.includes("cinnamon") ||
    n.includes("muskat") ||
    n.includes("nutmeg") ||
    n.includes("oregano") ||
    n.includes("basilikum") ||
    n.includes("basil") ||
    n.includes("thymian") ||
    n.includes("thyme") ||
    n.includes("rosmarin") ||
    n.includes("rosemary") ||
    n.includes("chili") ||
    n.includes("curry") ||
    n.includes("vanille") ||
    n.includes("vanilla") ||
    n.includes("kreuzkümmel") ||
    n.includes("cumin") ||
    n.includes("kräuter") ||
    n.includes("herb")
  );
}

/**
 * Parst unstrukturierte Zutatentexte aus JSON-LD (z.B. "2 cups flour", "150g Zucker", "1 TL Salz", "Salz nach Geschmack")
 * in strukturierte RawGeminiIngredient-Objekte als sichere Basis für CatalogRecipe.
 * - Konvertiert US-Einheiten (tbsp, tsp, cup, oz, lb) in metrische/deutsche Einheiten.
 * - Setzt unbezifferte Gewürze/Kräuter auf 1 Prise statt 100g.
 * - Teilt Mengenangaben durch originalServings für exakte 1-Portions-Basis.
 */
export function parseRawIngredientStrings(
  lines: string[],
  originalServings: number = 2
): RawGeminiIngredient[] {
  const servings = Math.max(1, originalServings || 2);

  return lines.map((line) => {
    const clean = String(line || "").replace(/^[▢•\-\*\s]+/, "").trim();
    const match = clean.match(
      /^([\d\/\.,\s¼½¾⅓⅔⅛⅜⅝⅞]+)?\s*(tablespoons|tablespoon|teaspoons|teaspoon|tbsp|cups|dosen|dose|stück|prise|zehen|bund|stk\.?|zehe|cup|tsp|kg|ml|el|tl|oz|lb|g|l)\b\s*(?:of\s+)?(.*)$/i
    );

    let amount = 1;
    let unit = "g";
    let name = clean;

    if (match) {
      if (match[3] && match[3].trim()) {
        name = match[3].trim();
      }

      if (match[1] && match[1].trim()) {
        const numStr = match[1].trim();
        if (numStr === "½") amount = 0.5;
        else if (numStr === "¼") amount = 0.25;
        else if (numStr === "¾") amount = 0.75;
        else if (numStr === "⅓") amount = 0.333;
        else if (numStr === "⅔") amount = 0.667;
        else if (numStr === "⅛") amount = 0.125;
        else if (numStr === "⅜") amount = 0.375;
        else if (numStr === "⅝") amount = 0.625;
        else if (numStr === "⅞") amount = 0.875;
        else if (numStr.includes(" ") && numStr.includes("/")) {
          const parts = numStr.split(/\s+/);
          const whole = parseFloat(parts[0]) || 0;
          const [num, den] = parts[1].split("/").map(Number);
          amount = whole + (den ? num / den : 0);
        } else if (numStr.includes("/")) {
          const [num, den] = numStr.split("/").map(Number);
          if (den) amount = num / den;
        } else {
          amount = parseFloat(numStr.replace(",", ".")) || 1;
        }

        const rawUnit = (match[2] || "").toLowerCase().trim();
        if (!rawUnit) {
          unit = isSpiceOrHerbName(name) ? "Prise" : "Stk.";
        } else if (rawUnit === "tbsp" || rawUnit === "tablespoon" || rawUnit === "tablespoons" || rawUnit === "el") {
          unit = "EL";
        } else if (rawUnit === "tsp" || rawUnit === "teaspoon" || rawUnit === "teaspoons" || rawUnit === "tl") {
          unit = "TL";
        } else if (rawUnit === "cup" || rawUnit === "cups") {
          const isDryBaking = /(flour|mehl|sugar|zucker|oats|hafer|cocoa|kakao)/i.test(name);
          if (isDryBaking) {
            amount = Math.round(amount * 125);
            unit = "g";
          } else {
            amount = Math.round(amount * 240);
            unit = "ml";
          }
        } else if (rawUnit === "oz") {
          amount = Math.round(amount * 28);
          unit = "g";
        } else if (rawUnit === "lb") {
          amount = Math.round(amount * 450);
          unit = "g";
        } else {
          unit = match[2];
        }

        // Portions-Skalierung für 1 Portion
        amount = Math.round((amount / servings) * 100) / 100;
      } else {
        // Keine Zahl am Zeilenanfang (!match[1])
        if (isSpiceOrHerbName(clean)) {
          amount = 1;
          unit = "Prise";
        } else {
          amount = 1;
          unit = "Stk.";
        }
      }
    } else {
      if (isSpiceOrHerbName(clean)) {
        amount = 1;
        unit = "Prise";
      } else {
        amount = 1;
        unit = "Stk.";
      }
    }

    return {
      name: name || clean,
      baseAmountPerPortion: amount,
      unit,
      optional: false,
    };
  });
}

/**
 * Robuster JSON-Repair- und Extraktions-Helper:
 * 1. Entfernt Markdown-Backticks und Whitespace
 * 2. Bereinigt Trailing-Commas vor '}' und ']'
 * 3. Falls JSON am Ende abgeschnitten wurde (z.B. SyntaxError bei Position 7802 durch Token-Limit),
 *    rettet er alle bis dahin vollständig geschlossenen { ... } Rezept-Objekte aus dem Array.
 */
export function repairAndExtractJsonRecipes(text: string): any[] {
  if (!text || typeof text !== "string") return [];

  let clean = text.trim();
  // Markdown-Blöcke entfernen
  clean = clean.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

  // Trailing commas vor schließenden Klammern entfernen
  clean = clean.replace(/,\s*([\]}])/g, "$1");

  // Direkter Versuch: Vollständiges JSON
  try {
    const parsed = JSON.parse(clean);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && Array.isArray(parsed.recipes)) return parsed.recipes;
    if (parsed && typeof parsed === "object") return [parsed];
  } catch (err) {
    reportWarning("repairAndExtractJsonRecipes.initialParse", err);
  }

  // Rettungsversuch 1: "recipes": [ ... ] Block suchen und bis zum letzten gültigen '}' retten
  const recipesKeyMatch = clean.match(/"recipes"\s*:\s*\[([\s\S]*)/i);
  const targetSnippet = recipesKeyMatch ? recipesKeyMatch[1] : clean;

  const objectStartIndices: number[] = [];
  const rescuedObjects: any[] = [];
  let depth = 0;
  let inString = false;
  let escape = false;

  try {
    for (let i = 0; i < targetSnippet.length; i++) {
      const char = targetSnippet[i];

      if (escape) {
        escape = false;
        continue;
      }
      if (char === "\\") {
        escape = true;
        continue;
      }
      if (char === '"') {
        inString = !inString;
        continue;
      }
      if (inString) continue;

      if (char === "{") {
        if (depth === 0) {
          objectStartIndices.push(i);
        }
        depth++;
      } else if (char === "}") {
        depth--;
        if (depth === 0 && objectStartIndices.length > 0) {
          const startIndex = objectStartIndices[objectStartIndices.length - 1];
          const rawObj = targetSnippet.slice(startIndex, i + 1);
          try {
            const repairedObj = rawObj.replace(/,\s*([\]}])/g, "$1");
            const parsedObj = JSON.parse(repairedObj);
            if (parsedObj && typeof parsedObj === "object" && parsedObj.title) {
              rescuedObjects.push(parsedObj);
            }
          } catch (objErr) {
            reportWarning("repairAndExtractJsonRecipes.rescueObject", objErr);
          }
        }
      }
    }

    if (rescuedObjects.length > 0) {
      return rescuedObjects;
    }
  } catch (err) {
    reportWarning("repairAndExtractJsonRecipes.rescueLoop", err);
  }

  return [];
}

/**
 * Konvertiert rohe Rezeptdaten von Gemini / Web-Scraper in ein vollständiges CatalogRecipe.
 * Fix Bug A: Wenn verifiedImageUrl oder eine gültige http(s)://-URL da ist, wird diese fest übernommen
 * und niemals durch resolveRecipeFoodImage überschrieben!
 * Fallback: Wenn Gemini fehlschlägt, aber JSON-LD vorliegt, wird das Rezept direkt daraus erzeugt!
 */
export function convertRawToCatalogRecipe(
  item: any,
  originalCard: DiscoveredRecipeCard | { recipeUrl?: string; imageUrl?: string; verifiedImageUrl?: string; title?: string } = {},
  sourceName: string = "Portal",
  pantry: any[] = [],
  context: { timestamp?: number; pageNumber?: number; batchIdx?: number; index?: number } = {}
): CatalogRecipe {
  const origCardAny = originalCard as any;
  const title = (item.title || originalCard.title || "").trim();

  // Punkt 3: Verified Image mit höchster Priorität behandeln (JSON-LD verified, og:image, jsonLdImage, Card Image)
  const verifiedImg =
    (typeof origCardAny.verifiedImageUrl === "string" && origCardAny.verifiedImageUrl.startsWith("http") && !origCardAny.verifiedImageUrl.includes("example.com"))
      ? origCardAny.verifiedImageUrl.trim()
      : (typeof origCardAny.ogImage === "string" && origCardAny.ogImage.startsWith("http") && !origCardAny.ogImage.includes("example.com"))
      ? origCardAny.ogImage.trim()
      : (typeof origCardAny.jsonLdImage === "string" && origCardAny.jsonLdImage.startsWith("http") && !origCardAny.jsonLdImage.includes("example.com"))
      ? origCardAny.jsonLdImage.trim()
      : (typeof item.verifiedImageUrl === "string" && item.verifiedImageUrl.startsWith("http") && !item.verifiedImageUrl.includes("example.com"))
      ? item.verifiedImageUrl.trim()
      : "";

  const itemImg = typeof item.imageUrl === "string" ? item.imageUrl.trim() : "";
  const cardImg = typeof originalCard.imageUrl === "string" ? originalCard.imageUrl.trim() : "";
  const isValidImg = (url: string) => /^(?:https?:\/\/|data:image\/)/i.test(url) && !url.includes("example.com");
  const validCandidate = verifiedImg || (isValidImg(cardImg) ? cardImg : isValidImg(itemImg) ? itemImg : "");

  const imageUrl = validCandidate || resolveRecipeFoodImage(title, item.imageKeywords);

  const sourceUrl =
    item.sourceUrl && typeof item.sourceUrl === "string" && /^https?:\/\//i.test(item.sourceUrl.trim())
      ? item.sourceUrl.trim()
      : originalCard.recipeUrl;

  let ingredientListCandidates = Array.isArray(item.ingredients) && item.ingredients.length > 0
    ? item.ingredients
    : undefined;

  // Fallback auf echte JSON-LD Zutatentexte falls Gemini keine Zutaten geliefert hat
  if (!ingredientListCandidates && Array.isArray(origCardAny.recipeIngredient) && origCardAny.recipeIngredient.length > 0) {
    ingredientListCandidates = parseRawIngredientStrings(origCardAny.recipeIngredient, origCardAny.originalServings || 2);
  }

  const decompIngredients: RawGeminiIngredient[] = decomposeCompositeIngredients(
    ingredientListCandidates && ingredientListCandidates.length > 0
      ? ingredientListCandidates
      : extractIngredientsFromDishText(title, item.subtitle || "")
  ).map((ing: any) => ({
    name: String(ing.name || "").trim(),
    baseAmountPerPortion: Number(ing.baseAmountPerPortion) || 100,
    unit: String(ing.unit || "g"),
    optional: Boolean(ing.optional),
  }));

  const inStock = decompIngredients.filter((ing: any) =>
    findMatchingPantryItem(ing.name, pantry as any) !== null
  );
  const matchScore = Math.round(
    (inStock.length / Math.max(1, decompIngredients.length)) * 100
  );

  const timestamp = context.timestamp || Date.now();
  const pageNumber = context.pageNumber || 1;
  const batchIdx = context.batchIdx || 1;
  const idx = context.index || 1;
  const safeSlug = sourceName.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "portal";
  const recipeId = item.id || `scraped-${safeSlug}-${timestamp}-${pageNumber}-${batchIdx}-${idx}`;

  const cardRawSteps = origCardAny.rawSteps && origCardAny.rawSteps.length > 0
    ? origCardAny.rawSteps
    : origCardAny.recipeInstructions;

  const stepsSource = (Array.isArray(item.steps) && item.steps.length > 0)
    ? item.steps
    : (Array.isArray(cardRawSteps) && cardRawSteps.length > 0)
    ? cardRawSteps.map((st: any, sIdx: number) => ({
        stepNumber: sIdx + 1,
        title: st.sectionTitle || `Schritt ${sIdx + 1}`,
        instruction: st.text || "",
        duration: extractStepDuration(st.text || ""),
        tag: st.sectionTitle || "Zubereitung",
      }))
    : [];

  return {
    id: recipeId,
    title,
    subtitle: item.subtitle || `Rezept von ${sourceName}`,
    category: item.category || getRecipeCategory({ title, subtitle: item.subtitle }),
    source: sourceName,
    sourceUrl,
    time: item.time || origCardAny.totalTime || "25 Min.",
    difficulty: item.difficulty || "Einfach",
    baseCal: Math.round(Number(item.baseCal) || 450),
    baseProt: Math.round(Number(item.baseProt) || 20),
    baseCarb: Math.round(Number(item.baseCarb) || 48),
    baseCost: Number(item.baseCost) || 2.5,
    tone: item.tone || "mint",
    chefTip: item.chefTip || "Frisch zubereitet schmeckt es am besten!",
    imageUrl,
    verifiedImageUrl: verifiedImg || (isValidImg(validCandidate) ? validCandidate : undefined),
    isAiGenerated: true,
    matchScore,
    mealType: item.mealType || "dinner",
    equipment: Array.isArray(item.equipment) ? item.equipment : ["pan"],
    rawIngredients: decompIngredients,
    ingredients: decompIngredients,
    optional: item.optional || "Nach Belieben abschmecken",
    available: (s: number) => {
      if (inStock.length > 0) {
        return inStock
          .slice(0, 3)
          .map((ing: any) => `${Math.round(ing.baseAmountPerPortion * s)} ${ing.unit} ${ing.name}`)
          .join(" · ");
      }
      return decompIngredients
        .slice(0, 3)
        .map((ing: any) => `${Math.round(ing.baseAmountPerPortion * s)} ${ing.unit} ${ing.name}`)
        .join(" · ");
    },
    ingredientsList: (s: number) => {
      return decompIngredients.map((ing: any) => ({
        name: ing.name,
        amount: `${Math.round(ing.baseAmountPerPortion * s)} ${ing.unit}`,
        optional: Boolean(ing.optional),
      }));
    },
    steps: stepsSource.length > 0
      ? stepsSource.map((st: any, sIdx: number) => ({
          stepNumber: st.stepNumber || sIdx + 1,
          title: st.title || `Schritt ${sIdx + 1}`,
          instruction: st.instruction || "",
          duration: st.duration || "4 Min.",
          tag: st.tag || "Kochen",
        }))
      : [
          {
            stepNumber: 1,
            title: "Zutaten vorbereiten",
            instruction: "Alle Zutaten abmessen, waschen und schneiden.",
            duration: "5 Min.",
            tag: "Vorbereitung",
          },
          {
            stepNumber: 2,
            title: "Zubereiten",
            instruction: "Die Zutaten nach Rezept garen und miteinander vermengen.",
            duration: "15 Min.",
            tag: "Kochen",
          },
          {
            stepNumber: 3,
            title: "Abschmecken & Servieren",
            instruction: "Mit Kräutern und Gewürzen abschmecken und warm anrichten.",
            duration: "3 Min.",
            tag: "Finish",
          },
        ],
  };
}

/**
 * Übergibt ein Batch von 2 Unterseiten-Rezeptdaten an Gemini, um echte Zutaten und Schritte zu strukturieren.
 * Enforce Point 4: Keine Zusammenfassungen! 1:1 Erhalt aller Schritte.
 */
export async function processBatchWithGemini(
  batch: RecipeSubpageDetails[],
  sourceName: string,
  pageNumber: number,
  batchIdx: number,
  pantry: any[] = []
): Promise<CatalogRecipe[]> {

  const batchPayload = batch.map((item, idx) => {
    const rawSteps = item.rawSteps && item.rawSteps.length > 0 ? item.rawSteps : item.recipeInstructions;
    return {
      index: idx + 1,
      title: item.title,
      imageUrl: item.verifiedImageUrl || item.imageUrl,
      verifiedImageUrl: item.verifiedImageUrl,
      sourceUrl: item.recipeUrl,
      totalTime: item.totalTime,
      originalServings: item.originalServings || 2,
      recipeIngredient: item.recipeIngredient && item.recipeIngredient.length > 0 ? item.recipeIngredient : undefined,
      rawSteps: rawSteps && rawSteps.length > 0 ? rawSteps : undefined,
      recipeInstructions: rawSteps && rawSteps.length > 0 ? rawSteps : undefined,
      contentSnippet: (!item.recipeIngredient || item.recipeIngredient.length === 0) ? item.rawText?.slice(0, 8000) : undefined,
    };
  });

  const prompt = `Du bist ein erstklassiger Küchenchef und Rezept-Strukturierer für eine moderne Koch-App.
Hier sind ${batch.length} echte Rezepte von «${sourceName}» (Seite ${pageNumber}), deren echte Unterseiten-Daten (Zutaten & Zubereitung) wir gerade abgerufen haben.

Rezept-Rohdaten:
${JSON.stringify(batchPayload, null, 2)}

ANWEISUNGEN:
1. Behalte "sourceUrl" und "imageUrl" von jedem Rezept ZU 100% UNVERÄNDERT bei!
2. Rechne die echten Zutaten ("recipeIngredient" bzw. aus dem Text) exakt in das Format {"name": "...", "baseAmountPerPortion": number, "unit": "g"|"ml"|"Stk."|"TL"|"EL", "optional": boolean} für EINE Basisportion um.
   - WICHTIG: Teile alle Mengenangaben aus "recipeIngredient" durch "originalServings", damit "baseAmountPerPortion" exakt für 1 Portion gilt!
   - WICHTIG: Gewürze NIEMALS zusammenfassen! Jedes Gewürz (z.B. Paprikapulver, Pfeffer, Salz, Knoblauch, Zimt, Vanille) MUSS ein einzelner Zutateneintrag im Array sein!
3. ZUBEREITUNGSSCHRITTE ("steps"):
   STRIKTE REGEL: Fasse NIEMALS mehrere Zubereitungsschritte zu einem Schritt zusammen! Wenn das Original-Rezept 11 Schritte hat, MUSS dein JSON-Array "steps" exakt 11 Schritte enthalten – mit JEDEM Detail, jeder Zeitangabe und jedem Tipp aus dem Originaltext, sauber ins Deutsche übersetzt!
   - Kürze oder vereinfache die Zubereitungsschritte der Webseite NIEMALS! Übernimm ALLE detaillierten Schritte, Garzeiten, Temperaturen und Mengenangaben vollständig und detailliert aus dem Original-Rezept. Wenn das Original auf Englisch ist, übersetze jeden Schritt Detail für Detail ins Deutsche.
   - Übernimm vorhandene "sectionTitle" (z. B. "MAKE THE CINNAMON SUGAR FILLING" -> "Zimt-Zucker-Füllung zubereiten", "MAKE THE ICING" -> "Guss anrühren", "COOK THE PANCAKES" -> "Pancakes backen") als "tag" und/oder im "title" des jeweiligen Schritts.
   - Erstelle für JEDEN einzelnen Schritt des Originals ein eigenes Step-Objekt im Format:
     {"stepNumber": number, "title": string, "instruction": string, "duration": string, "tag": string}.
   - NIEMALS zusammenfassen oder auf 3 Mini-Sätze verkürzen! Alle Detailanweisungen, Minutenangaben, Pfannen-/Ofen-Temperaturen, Konsistenz-Hinweise (z.B. "10 Minuten bei Raumtemperatur ruhen lassen...") und Tipps müssen 1:1 vollständig erhalten bleiben!
4. Falls das Original auf Englisch ist (z. B. "Pumpkin Cinnamon Roll Pancakes"), übersetze Titel, Teaser, Zutaten und Zubereitungsschritte sauber und appetitlich ins Deutsche (z. B. "Kürbis-Zimtschnecken-Pancakes").
5. Berechne realistische Nährwerte pro 1 Portion ("baseCal", "baseProt", "baseCarb", "baseCost").
6. Ordne die passende Kategorie zu ("category": "Hauptgericht" | "Frühstück" | "Snack" | "Dessert" | "Backen").

Antworte AUSSCHLIESSLICH als gültiges JSON:
{
  "recipes": [
    {
      "title": "Deutscher Rezeptname",
      "subtitle": "Appetitliche Kurzbeschreibung",
      "category": "Hauptgericht",
      "time": "25 Min.",
      "difficulty": "Einfach",
      "baseCal": 450,
      "baseProt": 25,
      "baseCarb": 50,
      "baseCost": 2.80,
      "chefTip": "Hilfreicher Profi-Tipp",
      "imageUrl": "echte URL unverändert",
      "sourceUrl": "echte URL unverändert",
      "imageKeywords": "pancakes, cinnamon",
      "tone": "mint",
      "mealType": "dinner",
      "equipment": ["pan"],
      "ingredients": [
        {
          "name": "Zutat",
          "baseAmountPerPortion": 100,
          "unit": "g",
          "optional": false
        }
      ],
      "steps": [
        {
          "stepNumber": 1,
          "title": "Vorbereitung",
          "instruction": "Vollständige, detaillierte Originalanweisung mit allen Mengenangaben...",
          "duration": "5 Min.",
          "tag": "Vorbereitung"
        },
        {
          "stepNumber": 2,
          "title": "Kochen / Backen",
          "instruction": "Exakte Garzeit, Temperaturangabe und detaillierte Vorgehensweise...",
          "duration": "10 Min.",
          "tag": "Kochen"
        }
      ]
    }
  ]
}`;

  let rawList: any[] = [];

  try {
    const data = await callGeminiProxy({
      model: "gemini-3.5-flash-lite",
      contents: prompt,
      config: {
        temperature: 0.2,
        responseMimeType: "application/json",
        maxOutputTokens: 8192,
      },
    });

    const responseText = extractTextFromGeminiResponse(data) ?? "";
    rawList = repairAndExtractJsonRecipes(responseText);
  } catch (err) {
    reportWarning("processBatchWithGemini.kiStructuring", err);
  }

  const timestamp = Date.now();
  const recipes: CatalogRecipe[] = [];

  for (let i = 0; i < batch.length; i++) {
    const originalCard = batch[i];
    const item = rawList[i] || {};
    const title = (item.title || originalCard.title || "").trim();
    if (!title) continue;

    const rawSteps = originalCard.rawSteps && originalCard.rawSteps.length > 0
      ? originalCard.rawSteps
      : originalCard.recipeInstructions;

    // Punkt 4 Umsetzung:
    // A) Wenn das Rezept bereits auf Deutsch ist und rawSteps.length >= 3 hat:
    // 1:1 DIREKTE Übernahme aller Schritte (Gemini nur für Zutaten/Nährwerte verwendet!)
    if (rawSteps && rawSteps.length >= 3 && isGermanRecipeText(originalCard.title, rawSteps)) {
      item.steps = rawSteps.map((s, sIdx) => ({
        stepNumber: sIdx + 1,
        title: s.sectionTitle || `Schritt ${sIdx + 1}`,
        instruction: s.text,
        duration: extractStepDuration(s.text),
        tag: s.sectionTitle || "Zubereitung",
      }));
    } else if (rawSteps && rawSteps.length > 0) {
      // B) Harter Code-Guard für englische / übersetzte Rezepte:
      // Wenn Gemini Schritte zusammengefasst hat (geminiSteps.length < rawSteps.length),
      // rekonstruieren wir GARANTIERT alle rawSteps.length Schritte!
      const geminiSteps = Array.isArray(item.steps) ? item.steps : [];
      if (geminiSteps.length < rawSteps.length) {
        item.steps = rawSteps.map((raw, sIdx) => {
          const gStep = geminiSteps[sIdx];
          const hasMatchingInstruction = geminiSteps.length === rawSteps.length && gStep?.instruction;
          return {
            stepNumber: sIdx + 1,
            title: raw.sectionTitle || gStep?.title || `Schritt ${sIdx + 1}`,
            instruction: hasMatchingInstruction ? gStep.instruction : (gStep?.instruction || raw.text),
            duration: gStep?.duration || extractStepDuration(raw.text),
            tag: raw.sectionTitle || gStep?.tag || "Zubereitung",
          };
        });
      }
    }

    if (originalCard.verifiedImageUrl) {
      item.verifiedImageUrl = originalCard.verifiedImageUrl;
    }

    const recipe = convertRawToCatalogRecipe(
      item,
      originalCard,
      sourceName,
      pantry,
      { timestamp, pageNumber, batchIdx, index: i + 1 }
    );

    // Harte Bild-Zuweisung: Echtes Bild aus Unterseite oder Karte MUSS immer Vorrang haben
    const authenticImg =
      originalCard.verifiedImageUrl ||
      originalCard.ogImage ||
      originalCard.jsonLdImage ||
      (originalCard.imageUrl && !originalCard.imageUrl.includes("example.com") ? originalCard.imageUrl : "");

    if (authenticImg && /^https?:\/\//i.test(authenticImg)) {
      recipe.imageUrl = authenticImg;
      recipe.verifiedImageUrl = authenticImg;
      (recipe as any).image = authenticImg;
    }

    recipes.push(recipe);
  }

  return recipes;
}

/**
 * 2-Phasen-Scanner für eine einzelne Übersichtsseite:
 * Phase A: Rezeptkarten finden
 * Phase B: Unterseiten / JSON-LD / Print abrufen und in 3–4er Batches mit Gemini strukturieren
 */
export async function scrapeSinglePageFromWebsiteWithGemini(
  pageUrl: string,
  sourceName: string,
  pageNumber: number,
  existingTitlesSet: Set<string>,
  existingUrlsSet: Set<string>,
  pantry: any[] = [],
  options?: ScrapeSinglePageOptions
): Promise<ScrapePageResult> {
  const pageData = await fetchWebsiteContent(pageUrl, pageNumber);

  if (!pageData.content || pageData.content.length < 80) {
    return {
      recipes: [],
      nextPageUrl: pageData.nextPageUrl,
      hasMorePages: Boolean(pageData.nextPageUrl),
      pageNumber,
    };
  }

  // Phase A: Alle Rezeptkarten auf der Übersichtsseite finden
  let cards: DiscoveredRecipeCard[] = [];
  if (Array.isArray(pageData.cards) && pageData.cards.length > 0) {
    cards.push(...pageData.cards);
  }
  const extractedFromText = extractRecipeCardsFromListing(pageData.content, pageUrl);
  for (const c of extractedFromText) {
    const clean = c.recipeUrl.toLowerCase().trim().replace(/\/$/, "");
    if (!cards.some((existing) => existing.recipeUrl.toLowerCase().trim().replace(/\/$/, "") === clean)) {
      cards.push(c);
    }
  }

  // Fallback mit Gemini, falls Regex weniger als 2 Karten gefunden hat
  if (cards.length < 2) {
    try {
      const cardPrompt = `Analysiere den folgenden Webseiteninhalt von «${sourceName}» (${pageUrl}, Seite ${pageNumber}).
Extrahiere alle Rezeptkarten als JSON:
{
  "cards": [
    {
      "title": "Originaler Rezepttitel",
      "imageUrl": "echte Bild-URL aus dem Quelltext",
      "recipeUrl": "echte URL zur Rezept-Detailseite"
    }
  ]
}
Webseiteninhalt:
"""
${pageData.content.slice(0, 20000)}
"""`;

      const resp = await callGeminiProxy({
        model: "gemini-3.5-flash-lite",
        contents: cardPrompt,
        config: { temperature: 0.1, responseMimeType: "application/json" },
      });
      const txt = extractTextFromGeminiResponse(resp) ?? "";
      const cleaned = txt.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed?.cards) && parsed.cards.length > 0) {
        cards = parsed.cards.filter((c: any) => c.title && c.recipeUrl && /^https?:\/\//i.test(c.recipeUrl));
      }
    } catch (err) {
      reportWarning("scrapeSinglePageFromWebsiteWithGemini.cardExtractionFallback", err);
    }
  }

  // Filter already existing cards
  const newCards = cards.filter((card) => {
    const lowerTitle = card.title.toLowerCase().trim();
    const cleanUrl = card.recipeUrl.toLowerCase().trim().replace(/\/$/, "");
    if (existingTitlesSet.has(lowerTitle)) return false;
    if (existingUrlsSet.has(cleanUrl)) return false;
    for (const exTitle of existingTitlesSet) {
      if (isTitleSimilar(lowerTitle, exTitle)) return false;
    }
    return true;
  });

  const pageRecipes: CatalogRecipe[] = [];

  if (newCards.length === 0) {
    const hasMore = Boolean(pageData.nextPageUrl) || (cards.length > 0 && pageNumber < 50);
    return {
      recipes: [],
      nextPageUrl: pageData.nextPageUrl,
      hasMorePages: hasMore,
      pageNumber,
    };
  }

  // Phase B: Unterseiten in Batches von max 2 Karten abrufen und verarbeiten (hohe Detailtiefe & schnelle Live-Updates)
  const BATCH_SIZE = 2;
  let processedCount = 0;

  for (let b = 0; b < newCards.length; b += BATCH_SIZE) {
    if (options?.shouldStop?.()) break;

    const currentBatchCards = newCards.slice(b, b + BATCH_SIZE);
    processedCount = Math.min(newCards.length, b + currentBatchCards.length);

    options?.onProgress?.(
      `⏳ Seite ${pageNumber}: ${newCards.length} Rezeptkarten gefunden – lade Rezept-Details (${processedCount}/${newCards.length})...`
    );

    // 1. Echte Unterseiten gedrosselt abrufen (max 2 Karten mit 150ms Pause dazwischen)
    const subpageDetailsList: RecipeSubpageDetails[] = [];
    for (let i = 0; i < currentBatchCards.length; i++) {
      if (options?.shouldStop?.()) break;
      if (i > 0) {
        await new Promise((res) => setTimeout(res, 150));
      }
      subpageDetailsList.push(await fetchRecipeSubpageDetails(currentBatchCards[i]));
    }

    if (options?.shouldStop?.()) break;

    // 2. Batch durch Gemini strukturieren & übersetzen
    const batchRecipes = await processBatchWithGemini(
      subpageDetailsList,
      sourceName,
      pageNumber,
      Math.floor(b / BATCH_SIZE) + 1,
      pantry
    );

    // Filter duplicates and record
    const uniqueBatch: CatalogRecipe[] = [];
    for (const r of batchRecipes) {
      const lower = r.title.toLowerCase().trim();
      const rawU = (r.sourceUrl || "").toLowerCase().trim().replace(/\/$/, "");
      if (existingTitlesSet.has(lower)) continue;
      if (rawU && existingUrlsSet.has(rawU)) continue;

      existingTitlesSet.add(lower);
      if (rawU) existingUrlsSet.add(rawU);
      uniqueBatch.push(r);
    }

    if (uniqueBatch.length > 0) {
      pageRecipes.push(...uniqueBatch);
      // Sofortiges Live-Callback für dieses Batch
      options?.onBatchLoaded?.(uniqueBatch, pageNumber);
      options?.onBatchRecipesFound?.(uniqueBatch, pageNumber);
    }
  }

  const hasMorePages = Boolean(pageData.nextPageUrl) || (cards.length > 0 && pageNumber < 50);

  return {
    recipes: pageRecipes,
    nextPageUrl: pageData.nextPageUrl,
    hasMorePages,
    pageNumber,
  };
}

/**
 * 2. VOLLAUTOMATISCHER REKURSIVER CRAWLER
 * Läuft Seite für Seite durch, feuert onBatchLoaded nach jedem 3-4er Batch und onPageScraped nach jeder Seite.
 * Bricht bei shouldStop() oder Ende der Seiten ab.
 * KEINE Fake-Rezepte!
 */
export async function scrapeRecipesFromWebsiteWithGemini(
  url: string,
  sourceName: string,
  pantry: any[] = [],
  options?: ScrapeWebsiteOptions
): Promise<{ recipes: CatalogRecipe[]; lastPageScanned: number }> {
  const startPage = Math.max(1, options?.startPage ?? 1);
  const autoCrawlAll = options?.autoCrawlAll ?? true;
  const maxPagesToVisit = options?.maxPages != null
    ? Math.max(1, options.maxPages)
    : (autoCrawlAll ? 30 : Math.max(1, options?.pagesToScan ?? 2));

  const existingTitles = (options?.existingTitles ?? []).map((t) => t.toLowerCase().trim());
  const existingTitlesSet = new Set(existingTitles);
  const existingUrls = (options?.existingUrls ?? []).map((u) => u.toLowerCase().trim().replace(/\/$/, ""));
  const existingUrlsSet = new Set(existingUrls);

  const allDiscoveredRecipes: CatalogRecipe[] = [];
  let currentTargetUrl = url.trim();
  let lastPageScanned = startPage - 1;

  for (let pageIdx = 0; pageIdx < maxPagesToVisit; pageIdx++) {
    if (options?.shouldStop?.()) break;

    const currentPageNum = startPage + pageIdx;

    if (options?.onProgress) {
      options.onProgress({
        currentPage: currentPageNum,
        maxPages: maxPagesToVisit,
        foundRecipesCount: allDiscoveredRecipes.length,
        statusText: `🔍 Scanne Seite ${currentPageNum} von bis zu ${maxPagesToVisit}...`,
      });
    }

    try {
      const pageResult = await scrapeSinglePageFromWebsiteWithGemini(
        currentTargetUrl,
        sourceName,
        currentPageNum,
        existingTitlesSet,
        existingUrlsSet,
        pantry,
        {
          onProgress: (statusText) => {
            options?.onProgress?.({
              currentPage: currentPageNum,
              maxPages: maxPagesToVisit,
              foundRecipesCount: allDiscoveredRecipes.length,
              statusText,
            });
          },
          onBatchLoaded: (batch) => {
            allDiscoveredRecipes.push(...batch);
            options?.onBatchLoaded?.(batch, currentPageNum);
            options?.onBatchRecipesFound?.(batch, currentPageNum);
          },
          shouldStop: options?.shouldStop,
        }
      );

      lastPageScanned = currentPageNum;
      options?.onPageScraped?.(pageResult.recipes, currentPageNum, pageResult.hasMorePages);

      if (!pageResult.hasMorePages && !pageResult.nextPageUrl) {
        break;
      }

      if (pageResult.nextPageUrl) {
        currentTargetUrl = pageResult.nextPageUrl;
      } else {
        try {
          const parsed = new URL(currentTargetUrl);
          const cleanPath = parsed.pathname.toLowerCase();
          if (
            cleanPath.includes("/wp-content/") ||
            cleanPath.includes("/uploads/") ||
            cleanPath.includes("/assets/") ||
            cleanPath.includes("/feed/") ||
            cleanPath.includes("/wp-json/")
          ) {
            break; // Stop immediately, niemals /page/2/ an Bild anhängen!
          }
          if (parsed.pathname.match(/\/page\/\d+/)) {
            parsed.pathname = parsed.pathname.replace(/\/page\/\d+/, `/page/${currentPageNum + 1}`);
            currentTargetUrl = parsed.toString();
          } else if (parsed.searchParams.has("page")) {
            parsed.searchParams.set("page", String(currentPageNum + 1));
            currentTargetUrl = parsed.toString();
          } else if (pageResult.recipes.length > 0 && currentPageNum < maxPagesToVisit) {
            currentTargetUrl = `${parsed.origin}${cleanPath}/page/${currentPageNum + 1}/`;
          } else {
            break;
          }
        } catch (urlErr) {
          reportWarning("scrapeRecipesFromWebsiteWithGemini.urlAdvance", urlErr);
          break;
        }
      }
    } catch (err) {
      reportWarning(`Fehler beim Scannen von Seite ${currentPageNum}:`, err);
      break;
    }
  }

  // KEINE Fake-Rezepte! Wenn nichts gefunden wurde, geben wir ehrlich das leere Array zurück.
  return { recipes: allDiscoveredRecipes, lastPageScanned: Math.max(startPage, lastPageScanned) };
}

/** Alias für vollständigen Crawler */
export const crawlRecipeWebsiteWithGemini = scrapeRecipesFromWebsiteWithGemini;

/** Extrahiert ein einzelnes Rezept von einer beliebigen URL */
export async function extractRecipeFromWebsite(
  url: string,
  pantry: any[] = []
): Promise<CatalogRecipe | null> {
  const result = await scrapeSinglePageFromWebsiteWithGemini(
    url,
    "Webseite",
    1,
    new Set(),
    new Set(),
    pantry
  );
  return result.recipes[0] || null;
}
