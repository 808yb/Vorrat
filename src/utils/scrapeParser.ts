/**
 * HTML- und Schema.org JSON-LD Parser-Hilfsfunktionen für Web-Scraping.
 * Ausgelagert aus api/scrape.ts für saubere Modularisierung und Wiederverwendbarkeit.
 */

export interface ExtractedStep {
  sectionTitle?: string;
  text: string;
}

export interface ExtractedJsonLdData {
  recipes: any[];
  itemListCards: Array<{ title: string; url: string; imageUrl?: string }>;
}

export function decodeHtmlEntities(str: string): string {
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

export function extractInstructionsFromJsonLd(
  instructions: any,
  currentSectionTitle?: string
): ExtractedStep[] {
  if (!instructions) return [];

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

  if (/^(?:data:image|blob:)/i.test(candidate) || candidate.includes("blank.") || candidate.includes("placeholder")) {
    return undefined;
  }

  if (baseUrl) {
    try {
      candidate = new URL(candidate, baseUrl.href).toString();
    } catch {
      // Ignore invalid URL resolution
    }
  }

  return candidate && /^https?:\/\//i.test(candidate) ? candidate : undefined;
}

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

export function extractHtmlInstructionSteps(html: string): ExtractedStep[] {
  const steps: ExtractedStep[] = [];
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

    const baseRoot = getRootDomain(baseHost);
    const candRoot = getRootDomain(candHost);
    if (candHost !== baseHost && candRoot !== baseRoot) {
      return false;
    }

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

    const pathname = parsed.pathname.toLowerCase();
    const cleanPath = pathname.replace(/\/$/, "");
    if (/\.(jpg|jpeg|png|webp|gif|svg|pdf|css|js|ico|woff|woff2|ttf|eot)$/i.test(cleanPath)) {
      return false;
    }

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

export function isValidPaginationUrl(candidateUrl: string, baseHostname: string): boolean {
  if (!candidateUrl || typeof candidateUrl !== "string") return false;
  try {
    const parsed = new URL(candidateUrl);
    const candHost = parsed.hostname.toLowerCase();
    const baseHost = baseHostname.toLowerCase();

    const baseRoot = getRootDomain(baseHost);
    const candRoot = getRootDomain(candHost);
    if (candHost !== baseHost && candRoot !== baseRoot) {
      return false;
    }

    const cleanPath = parsed.pathname.toLowerCase().replace(/\/$/, "");
    if (/\.(jpg|jpeg|png|webp|gif|svg|pdf|css|js|ico|woff|woff2|ttf|eot)$/i.test(cleanPath)) {
      return false;
    }

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

export function collectJsonLdObjects(obj: any, collector: any[] = []): any[] {
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

export function extractJsonLdData(html: string, baseUrl?: URL): ExtractedJsonLdData {
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
              } catch {
                // Ignore malformed card URLs
              }
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
    } catch {
      // Ignore URL parse error
    }
  };

  if (Array.isArray(itemListCards)) {
    for (const card of itemListCards) {
      registerCard(card);
    }
  }

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

  const articleRegex = /<article\b[^>]*>([\s\S]*?)<\/article>/gi;
  let artMatch;
  while ((artMatch = articleRegex.exec(html)) !== null) {
    const block = artMatch[1];
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
          break;
        }
      } catch {
        // Ignore URL parse error
      }
    }

    if (!recipeUrl) continue;

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
        } catch {
          // Ignore invalid candidate URL
        }
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
      } catch {
        // Ignore parse error
      }
    }
  }

  return discovered.slice(0, 40);
}

export const extractRecipeLinks = extractRecipeCardsAndLinks;

export function extractNextPageUrl(html: string, baseUrl: URL): string | undefined {
  const baseCleanPath = baseUrl.pathname.toLowerCase().replace(/\/$/, "");
  if (/\.(jpg|jpeg|png|webp|gif|svg|pdf|css|js)$/i.test(baseCleanPath)) {
    return undefined;
  }
  if (!isValidPaginationUrl(baseUrl.toString(), baseUrl.hostname)) {
    return undefined;
  }

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
      } catch {
        // Ignore candidate resolution error
      }
    }
  }

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
  } catch {
    // Ignore fallback resolution error
  }

  return undefined;
}

export interface ParsedScrapeResult {
  title: string;
  ogTitle: string;
  ogImage?: string;
  twitterImage?: string;
  verifiedImageUrl?: string;
  recipe?: {
    title: string;
    imageUrl?: string;
    ingredients: string[];
    steps: ExtractedStep[];
    prepTime?: string;
    cookTime?: string;
    totalTime?: string;
    servings?: string;
  };
  jsonLdRecipes: any[];
  cards: Array<{ title: string; url: string; imageUrl?: string }>;
  recipeLinks: Array<{ title: string; url: string; imageUrl?: string }>;
  rawSteps: ExtractedStep[];
  textContent: string;
  articleText?: string;
  nextPageUrl?: string;
}

export function parseScrapedHtml(html: string, finalUrl: URL): ParsedScrapeResult {
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
    const match = html.match(reg);
    if (match && match[1]) {
      ogImage = extractRecipeImage(match[1], finalUrl);
      if (ogImage) break;
    }
  }

  const twitterImgRegexes = [
    /<meta\s+[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i,
    /<meta\s+[^>]*property=["']twitter:image["'][^>]*content=["']([^"']+)["']/i,
  ];
  let twitterImage: string | undefined;
  for (const reg of twitterImgRegexes) {
    const match = html.match(reg);
    if (match && match[1]) {
      twitterImage = extractRecipeImage(match[1], finalUrl);
      if (twitterImage) break;
    }
  }

  const { recipes: jsonLdRecipes, itemListCards } = extractJsonLdData(html, finalUrl);
  const recipeLinks = extractRecipeCardsAndLinks(html, finalUrl, jsonLdRecipes, itemListCards);
  const nextPageUrl = extractNextPageUrl(html, finalUrl);

  let verifiedImageUrl: string | undefined;
  if (jsonLdRecipes.length > 0 && jsonLdRecipes[0].verifiedImageUrl) {
    verifiedImageUrl = jsonLdRecipes[0].verifiedImageUrl;
  } else if (ogImage) {
    verifiedImageUrl = ogImage;
  } else if (twitterImage) {
    verifiedImageUrl = twitterImage;
  }

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

  return {
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
  };
}
