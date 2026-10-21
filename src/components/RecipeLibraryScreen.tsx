import React, { useState, useMemo, useEffect } from "react";
import type { CatalogRecipe } from "../data/recipeCatalog";
import { FULL_RECIPE_CATALOG } from "../data/recipeCatalog";
import {
  getStoredCustomRecipes,
  resolveRecipeFoodImage,
  scrapeRecipesFromWebsiteWithGemini,
  scrapeSinglePageFromWebsiteWithGemini,
  isTitleSimilar,
  deleteStoredCustomRecipe,
  getDeletedRecipeIds,
  markRecipeAsDeleted,
} from "../utils/geminiRecipes";
import { getRecipeCategory, type RecipeCategory } from "../utils/recipeHelpers";
import { getRecipePantryBreakdown } from "../utils/pantryMatching";
import { STORAGE_KEYS } from "../constants/storage";

export interface RecipeSourceItem {
  id: string;
  name: string;
  url: string;
  isCustom?: boolean;
  lastScrapedPage?: number;
}

export const DEFAULT_RECIPE_SOURCES: RecipeSourceItem[] = [
  { id: "chefkoch", name: "Chefkoch", url: "https://www.chefkoch.de/rezepte/" },
  { id: "emmi", name: "Emmi kocht einfach", url: "https://emmikochteinfach.de/rezepte/" },
  { id: "edeka", name: "EDEKA", url: "https://www.edeka.de/rezeptwelt/rezepte/" },
  { id: "kitchenstories", name: "Kitchen Stories", url: "https://www.kitchenstories.com/de/rezepte" },
  { id: "eatsmarter", name: "EatSmarter", url: "https://eatsmarter.de/rezepte" },
  { id: "rewe", name: "Rewe Deine Küche", url: "https://www.rewe.de/rezepte/" },
  { id: "sally", name: "Sallys Welt", url: "https://sallys-blog.de/rezepte" },
  { id: "lecker", name: "Lecker.de", url: "https://www.lecker.de/rezepte" },
  { id: "essenundtrinken", name: "Essen & Trinken", url: "https://www.essen-und-trinken.de/rezepte" },
];

export function getStoredRecipeSources(): RecipeSourceItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.RECIPE_SOURCES);
    if (!raw) return DEFAULT_RECIPE_SOURCES;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Remove any hardcoded 0-recipe default sources (vorwerk, guteskochen)
      const cleaned = parsed.filter(
        (s: RecipeSourceItem) => s.isCustom || (s.id !== "vorwerk" && s.id !== "guteskochen")
      );
      // Ensure Essen & Trinken is present
      if (!cleaned.some((s: RecipeSourceItem) => s.name === "Essen & Trinken")) {
        cleaned.push({ id: "essenundtrinken", name: "Essen & Trinken", url: "https://www.essen-und-trinken.de/rezepte" });
      }
      return cleaned;
    }
  } catch {}
  return DEFAULT_RECIPE_SOURCES;
}

export function extractDomainAndName(input: string): { domain: string; name: string; url: string } {
  const clean = input.trim();
  if (!clean) return { domain: "", name: "", url: "" };

  let validUrl = clean;
  if (!/^https?:\/\//i.test(validUrl)) {
    validUrl = `https://${validUrl}`;
  }

  let hostname = "";
  try {
    const urlObj = new URL(validUrl);
    hostname = urlObj.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    hostname = clean.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
  }

  const knownPortals: Record<string, string> = {
    "chefkoch.de": "Chefkoch",
    "chefkoch.at": "Chefkoch",
    "lecker.de": "Lecker.de",
    "eatsmarter.de": "EatSmarter",
    "emmikochteinfach.de": "Emmi kocht einfach",
    "essen-und-trinken.de": "Essen & Trinken",
    "essenundtrinken.de": "Essen & Trinken",
    "edeka.de": "EDEKA",
    "rewe.de": "Rewe Deine Küche",
    "kitchenstories.com": "Kitchen Stories",
    "kitchenstories.de": "Kitchen Stories",
    "sallys-blog.de": "Sallys Welt",
    "sallys.de": "Sallys Welt",
    "gutekueche.at": "GuteKüche",
    "gutekueche.de": "GuteKüche",
    "gutekueche.ch": "GuteKüche",
    "kochbar.de": "Kochbar",
    "springlane.de": "Springlane",
    "kuechengoetter.de": "Küchengötter",
    "hellofresh.de": "HelloFresh",
    "brigitte.de": "Brigitte",
    "fitforfun.de": "Fit For Fun",
    "daskochrezept.de": "DasKochrezept",
    "koch-mit.de": "Koch-Mit",
    "einfachbacken.de": "Einfach Backen",
    "einfachkochen.de": "Einfach Kochen",
    "fooby.ch": "Fooby",
    "bettybossi.ch": "Betty Bossi",
    "allrecipes.com": "Allrecipes",
    "bbcgoodfood.com": "BBC Good Food",
  };

  let name = "";
  for (const [portalKey, portalName] of Object.entries(knownPortals)) {
    if (hostname === portalKey || hostname.endsWith(`.${portalKey}`)) {
      name = portalName;
      break;
    }
  }

  if (!name) {
    const mainPart = hostname.split(".")[0] || hostname;
    name = mainPart
      .split(/[-_]/)
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
  }

  return {
    domain: hostname,
    name: name || "Rezept-Webseite",
    url: validUrl,
  };
}

interface RecipeLibraryScreenProps {
  pantry?: Array<{ name: string; amount?: number; unit?: string; isUnlimited?: boolean }>;
  servings?: number;
  favorites: string[];
  onToggleFavorite: (id: string, title: string) => void;
  onSelectRecipe: (recipe: CatalogRecipe) => void;
  onBack: () => void;
  onNotify?: (message: string) => void;
  onDeleteRecipe?: (recipe: CatalogRecipe) => void;
}

export function RecipeLibraryScreen({
  pantry = [],
  servings = 3,
  favorites,
  onToggleFavorite,
  onSelectRecipe,
  onBack,
  onNotify,
  onDeleteRecipe,
}: RecipeLibraryScreenProps) {
  // Sources management state
  const [sources, setSources] = useState<RecipeSourceItem[]>(() => getStoredRecipeSources());
  const [isManagingSources, setIsManagingSources] = useState(false);
  const [newSourceName, setNewSourceName] = useState("");
  const [newSourceUrl, setNewSourceUrl] = useState("");
  const [userEditedName, setUserEditedName] = useState(false);

  // Scanning / Scraping progress state
  const [isScanningSourceId, setIsScanningSourceId] = useState<string | null>(null);
  const [scanProgressMessage, setScanProgressMessage] = useState<string>("");
  const [autoCrawlAll, setAutoCrawlAll] = useState(true);
  const stopScanRef = React.useRef(false);

  const handleStopScan = () => {
    stopScanRef.current = true;
    setScanProgressMessage("⏹ Scan wird angehalten...");
  };

  // Custom recipes state & deleted IDs tracking
  const [customRecipes, setCustomRecipes] = useState<CatalogRecipe[]>(() => getStoredCustomRecipes());
  const [deletedIds, setDeletedIds] = useState<string[]>(() => getDeletedRecipeIds());
  const [recipeToDelete, setRecipeToDelete] = useState<CatalogRecipe | null>(null);

  const handleConfirmDelete = () => {
    if (!recipeToDelete) return;
    const id = recipeToDelete.id;
    const title = recipeToDelete.title;

    setCustomRecipes((prev) => prev.filter((r) => r.id !== id));
    deleteStoredCustomRecipe(id);
    markRecipeAsDeleted(id);
    setDeletedIds((prev) => Array.from(new Set([...prev, id])));

    if (onDeleteRecipe) {
      onDeleteRecipe(recipeToDelete);
    }
    setRecipeToDelete(null);
    if (onNotify) {
      onNotify(`🗑️ «${title}» wurde gelöscht.`);
    }
  };

  // Filters state
  const [selectedSource, setSelectedSource] = useState<string>("Alle");
  const [selectedCategory, setSelectedCategory] = useState<RecipeCategory | "Alle">("Alle");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  // Persist sources
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.RECIPE_SOURCES, JSON.stringify(sources));
    } catch {}
  }, [sources]);

  // Combine full recipe catalog + user custom recipes minus deleted recipes
  const allLibraryRecipes = useMemo(() => {
    const deletedSet = new Set(deletedIds);
    const customIds = new Set(customRecipes.map((r) => r.id));
    const combined = [...customRecipes, ...FULL_RECIPE_CATALOG.filter((r) => !customIds.has(r.id))];
    return combined.filter((r) => !deletedSet.has(r.id));
  }, [customRecipes, deletedIds]);

  // Filtered recipes
  const filteredRecipes = useMemo(() => {
    let list = allLibraryRecipes;

    // Filter by Category
    if (selectedCategory !== "Alle") {
      list = list.filter((r) => getRecipeCategory(r) === selectedCategory);
    }

    // Filter by Source
    if (selectedSource !== "Alle") {
      const sourceNorm = selectedSource.toLowerCase();
      list = list.filter((r) => {
        const rSource = (r.source || "").toLowerCase();
        return rSource.includes(sourceNorm) || sourceNorm.includes(rSource);
      });
    }

    // Filter by Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          (r.subtitle || "").toLowerCase().includes(q) ||
          (r.source || "").toLowerCase().includes(q)
      );
    }

    return list;
  }, [allLibraryRecipes, selectedCategory, selectedSource, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredRecipes.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedRecipes = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredRecipes.slice(start, start + PAGE_SIZE);
  }, [filteredRecipes, safePage]);

  // Add a new recipe website source & crawl page-by-page with Gemini
  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault();
    const urlInput = newSourceUrl.trim();
    if (!urlInput || isScanningSourceId) return;

    const extracted = extractDomainAndName(urlInput);
    const name = (newSourceName.trim() || extracted.name || "Rezept-Webseite").trim();
    const url = extracted.url;
    const maxPagesToScan = autoCrawlAll ? 30 : 2;

    stopScanRef.current = false;
    setIsScanningSourceId("new");
    setScanProgressMessage(`Starte Web-Scan für «${name}»...`);

    const existingTitlesSet = new Set(allLibraryRecipes.map((r) => r.title.toLowerCase().trim()));
    const existingUrlsSet = new Set(
      allLibraryRecipes.map((r) => (r.sourceUrl || "").toLowerCase().trim().replace(/\/$/, ""))
    );

    let totalImported = 0;
    let lastScannedPage = 1;
    let currentUrl = url;

    try {
      for (let page = 1; page <= maxPagesToScan; page++) {
        if (stopScanRef.current) break;

        setScanProgressMessage(
          `⏳ Scanne Seite ${page}... (${totalImported} Rezepte geladen)`
        );

        const pageResult = await scrapeSinglePageFromWebsiteWithGemini(
          currentUrl,
          name,
          page,
          existingTitlesSet,
          existingUrlsSet,
          pantry,
          {
            onProgress: (statusText) => setScanProgressMessage(statusText),
            onBatchLoaded: (batch) => {
              totalImported += batch.length;
              // Sofortiges Live-Rendern jedes 3-4er Batches im State
              setCustomRecipes((prev) => [
                ...batch,
                ...prev.filter((r) => !batch.some((nr) => nr.id === r.id)),
              ]);
              // Sofortiges Live-Persistieren im localStorage
              try {
                const stored = getStoredCustomRecipes();
                const nextStored = [
                  ...batch,
                  ...stored.filter((r) => !batch.some((nr) => nr.id === r.id)),
                ];
                localStorage.setItem(STORAGE_KEYS.CUSTOM_RECIPES, JSON.stringify(nextStored));
              } catch {}
            },
            shouldStop: () => stopScanRef.current,
          }
        );

        if (stopScanRef.current) break;

        lastScannedPage = page;

        if (pageResult.recipes.length > 0) {
          // Add or update source with lastScrapedPage
          setSources((prev) => {
            const existing = prev.find((s) => s.name.toLowerCase() === name.toLowerCase());
            if (!existing) {
              return [
                ...prev,
                {
                  id: `source-${Date.now()}`,
                  name,
                  url,
                  isCustom: true,
                  lastScrapedPage: page,
                },
              ];
            }
            return prev.map((s) =>
              s.name.toLowerCase() === name.toLowerCase() ? { ...s, lastScrapedPage: page } : s
            );
          });
        }

        if (!pageResult.hasMorePages || pageResult.recipes.length === 0) {
          break;
        }

        if (pageResult.nextPageUrl) {
          currentUrl = pageResult.nextPageUrl;
        } else {
          break;
        }
      }

      setSelectedSource(name);
      setCurrentPage(1);
      setNewSourceUrl("");
      setNewSourceName("");
      setUserEditedName(false);

      if (onNotify) {
        if (totalImported > 0) {
          onNotify(`🎉 Webseite «${name}» mit ${totalImported} echten Rezepten erfolgreich importiert!`);
        } else {
          onNotify(`Keine Rezepte auf «${name}» gefunden. Bitte prüfe die URL.`);
        }
      }
    } catch (err) {
      console.error("Fehler beim Scannen der neuen Quelle:", err);
      if (onNotify) {
        onNotify(`Fehler beim Scannen von «${name}».`);
      }
    } finally {
      setIsScanningSourceId(null);
      setScanProgressMessage("");
      stopScanRef.current = false;
    }
  };

  // Crawl next pages for an existing source (page-by-page with live updates and stop button)
  const handleScanNextPages = async (src: RecipeSourceItem) => {
    if (isScanningSourceId) return;

    stopScanRef.current = false;
    setIsScanningSourceId(src.id);
    const startPage = (src.lastScrapedPage || 1) + 1;
    const maxPagesToScan = 30;
    setScanProgressMessage(`Starte Scan für «${src.name}» (ab Seite ${startPage})...`);

    const existingTitlesSet = new Set(allLibraryRecipes.map((r) => r.title.toLowerCase().trim()));
    const existingUrlsSet = new Set(
      allLibraryRecipes.map((r) => (r.sourceUrl || "").toLowerCase().trim().replace(/\/$/, ""))
    );

    let totalImported = 0;
    let lastScannedPage = startPage - 1;
    let currentUrl = src.url;

    try {
      for (let page = startPage; page < startPage + maxPagesToScan; page++) {
        if (stopScanRef.current) break;

        const pageResult = await scrapeSinglePageFromWebsiteWithGemini(
          currentUrl,
          src.name,
          page,
          existingTitlesSet,
          existingUrlsSet,
          pantry,
          {
            onProgress: (statusText) => setScanProgressMessage(statusText),
            onBatchLoaded: (batch) => {
              totalImported += batch.length;
              // Sofortiger Live-Update in den React State
              setCustomRecipes((prev) => [
                ...batch,
                ...prev.filter((r) => !batch.some((nr) => nr.id === r.id)),
              ]);
              // Sofortiges Live-Persistieren im localStorage
              try {
                const stored = getStoredCustomRecipes();
                const nextStored = [
                  ...batch,
                  ...stored.filter((r) => !batch.some((nr) => nr.id === r.id)),
                ];
                localStorage.setItem(STORAGE_KEYS.CUSTOM_RECIPES, JSON.stringify(nextStored));
              } catch {}
            },
            shouldStop: () => stopScanRef.current,
          }
        );

        if (stopScanRef.current) break;

        lastScannedPage = page;

        if (pageResult.recipes.length > 0) {
          // Update lastScrapedPage for source
          setSources((prev) =>
            prev.map((s) => (s.id === src.id ? { ...s, lastScrapedPage: page } : s))
          );
        }

        if (!pageResult.hasMorePages || pageResult.recipes.length === 0) {
          break;
        }

        if (pageResult.nextPageUrl) {
          currentUrl = pageResult.nextPageUrl;
        } else {
          break;
        }
      }

      setSelectedSource(src.name);
      if (onNotify) {
        if (totalImported > 0) {
          onNotify(`🎉 ${totalImported} neue Rezepte von ${src.name} importiert!`);
        } else {
          onNotify(`Keine weiteren Rezepte auf ${src.name} gefunden.`);
        }
      }
    } catch (err) {
      console.error("Fehler beim Scannen weiterer Seiten:", err);
      if (onNotify) {
        onNotify(`Fehler beim Scannen weiterer Seiten von ${src.name}.`);
      }
    } finally {
      setIsScanningSourceId(null);
      setScanProgressMessage("");
      stopScanRef.current = false;
    }
  };

  const handleRemoveSource = (id: string, name: string) => {
    setSources((prev) => prev.filter((s) => s.id !== id));
    if (selectedSource === name) {
      setSelectedSource("Alle");
    }

    // Also remove custom-generated recipes for this removed source
    try {
      const existing = getStoredCustomRecipes();
      const filtered = existing.filter((r) => (r.source || "").toLowerCase() !== name.toLowerCase());
      localStorage.setItem(STORAGE_KEYS.CUSTOM_RECIPES, JSON.stringify(filtered));
      setCustomRecipes(filtered);
    } catch {}

    if (onNotify) {
      onNotify(`Quelle «${name}» entfernt.`);
    }
  };

  const handleResetSources = () => {
    setSources(DEFAULT_RECIPE_SOURCES);
    setSelectedSource("Alle");
    if (onNotify) {
      onNotify("Standard Rezept-Quellen wiederhergestellt.");
    }
  };

  return (
    <main className="screen recipe-library-screen" style={{ paddingBottom: "100px" }}>
      {/* Top Header Row with Back Button */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", gap: "10px" }}>
        <button
          type="button"
          onClick={onBack}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            background: "#ffffff",
            border: "1px solid #cbd5e1",
            borderRadius: "10px",
            padding: "8px 14px",
            fontSize: "12px",
            fontWeight: 700,
            color: "#334155",
            cursor: "pointer",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          <span>Zurück zu Entdecken</span>
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 750,
              background: "#ebf3ee",
              color: "#2d5a3e",
              padding: "4px 10px",
              borderRadius: "8px",
              border: "1px solid #c6dcce",
            }}
          >
            {sources.length} Web-Quellen · {allLibraryRecipes.length} Rezepte
          </span>
        </div>
      </div>

      {/* Screen Title & Info */}
      <section className="title-row cook-title" style={{ marginBottom: "16px" }}>
        <div>
          <p className="eyebrow">Webseiten & Rezept-Pool</p>
          <h1 style={{ fontSize: "22px", margin: "2px 0 0" }}>Rezept-Bibliothek</h1>
        </div>
      </section>

      {/* Sources Management Accordion / Card */}
      <div
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "16px",
          padding: "14px 16px",
          marginBottom: "16px",
          boxShadow: "0 2px 6px rgba(15, 23, 42, 0.04)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
          <div>
            <strong style={{ fontSize: "13px", color: "#0f172a", display: "block" }}>
              Verknüpfte Rezept-Quellen
            </strong>
          </div>
          <button
            type="button"
            onClick={() => setIsManagingSources(!isManagingSources)}
            style={{
              padding: "6px 12px",
              borderRadius: "8px",
              background: isManagingSources ? "#0f172a" : "#f1f5f9",
              color: isManagingSources ? "#ffffff" : "#334155",
              border: "1px solid #cbd5e1",
              fontSize: "11.5px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {isManagingSources ? "Verwaltung schließen" : "⚙ Quellen verwalten"}
          </button>
        </div>

        {/* Live scanning progress banner when accordion is collapsed */}
        {!isManagingSources && Boolean(isScanningSourceId) && (
          <div
            style={{
              marginTop: "12px",
              padding: "10px 14px",
              borderRadius: "10px",
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              color: "#1e40af",
              fontSize: "12px",
              fontWeight: 650,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "8px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "14px" }}>🔄</span>
              <span>{scanProgressMessage || "Scanne Webseite & extrahiere Rezepte..."}</span>
            </div>
            <button
              type="button"
              onClick={handleStopScan}
              style={{
                background: "#fee2e2",
                border: "1px solid #fca5a5",
                color: "#dc2626",
                borderRadius: "6px",
                padding: "4px 10px",
                fontSize: "11px",
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                flexShrink: 0,
              }}
            >
              ⏹ Scan stoppen
            </button>
          </div>
        )}

        {/* Sources Management Expanded Panel */}
        {isManagingSources && (
          <div style={{ marginTop: "14px", paddingTop: "14px", borderTop: "1px solid #f1f5f9" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <span style={{ fontSize: "11.5px", fontWeight: 700, color: "#334155" }}>
                Aktive Webseiten & Rezept-Links:
              </span>
              <button
                type="button"
                onClick={handleResetSources}
                style={{
                  fontSize: "10.5px",
                  color: "#64748b",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                Standard wiederherstellen
              </button>
            </div>

            {/* Scanning Progress Banner */}
            {Boolean(isScanningSourceId) && (
              <div style={{ marginBottom: "12px" }}>
                <div
            style={{
              marginTop: "12px",
              padding: "10px 14px",
              borderRadius: "10px",
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              color: "#1e40af",
              fontSize: "12px",
              fontWeight: 650,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "8px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "14px" }}>🔄</span>
              <span>{scanProgressMessage || "Scanne Webseite & extrahiere Rezepte..."}</span>
            </div>
            <button
              type="button"
              onClick={handleStopScan}
              style={{
                background: "#fee2e2",
                border: "1px solid #fca5a5",
                color: "#dc2626",
                borderRadius: "6px",
                padding: "4px 10px",
                fontSize: "11px",
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                flexShrink: 0,
              }}
            >
              ⏹ Scan stoppen
            </button>
          </div>
              </div>
            )}

            {/* Source items list */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "10px", marginBottom: "14px" }}>
              {sources
                .filter((src) => {
                  if (src.isCustom) return true;
                  const count = allLibraryRecipes.filter((r) =>
                    (r.source || "").toLowerCase().includes(src.name.toLowerCase())
                  ).length;
                  return count > 0;
                })
                .map((src) => {
                  const count = allLibraryRecipes.filter((r) =>
                    (r.source || "").toLowerCase().includes(src.name.toLowerCase())
                  ).length;
                  const isScanningThis = isScanningSourceId === src.id;
                  const nextScanPage = (src.lastScrapedPage || 1) + 1;

                  return (
                    <div
                      key={src.id}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                        padding: "10px 12px",
                        background: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        borderRadius: "10px",
                        fontSize: "11px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                        <div style={{ minWidth: 0, paddingRight: "6px" }}>
                          <strong style={{ color: "#0f172a", display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {src.name} {count > 0 && <span style={{ fontWeight: 600, color: "#059669" }}>({count} Rezepte)</span>}
                          </strong>
                          <a
                            href={src.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              color: "#059669",
                              textDecoration: "none",
                              fontSize: "10px",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              display: "block",
                            }}
                          >
                            {src.url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")} ↗
                          </a>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveSource(src.id, src.name)}
                          title={`Quelle «${src.name}» entfernen`}
                          disabled={Boolean(isScanningSourceId)}
                          style={{
                            width: "24px",
                            height: "24px",
                            borderRadius: "6px",
                            background: "#fee2e2",
                            border: "1px solid #fecaca",
                            color: "#dc2626",
                            cursor: isScanningSourceId ? "not-allowed" : "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            transition: "all 0.15s ease",
                          }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </div>

                      {/* Multi-Page Scrape Button */}
                      {isScanningThis ? (
                        <button
                          type="button"
                          onClick={handleStopScan}
                          style={{
                            marginTop: "2px",
                            width: "100%",
                            padding: "6px 8px",
                            borderRadius: "6px",
                            border: "1px solid #fca5a5",
                            background: "#fee2e2",
                            color: "#dc2626",
                            fontSize: "10.5px",
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "5px",
                          }}
                        >
                          <span>⏹ Scan stoppen</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={Boolean(isScanningSourceId)}
                          onClick={() => handleScanNextPages(src)}
                          style={{
                            marginTop: "2px",
                            width: "100%",
                            padding: "6px 8px",
                            borderRadius: "6px",
                            border: "1px solid #cbd5e1",
                            background: "#ffffff",
                            color: "#1e293b",
                            fontSize: "10.5px",
                            fontWeight: 650,
                            cursor: isScanningSourceId ? "not-allowed" : "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "5px",
                            transition: "all 0.15s ease",
                          }}
                        >
                          <span>🔄 Komplett scannen (ab S. {nextScanPage})</span>
                        </button>
                      )}
                    </div>
                  );
                })}
            </div>

            {/* Add new Source Form */}
            <form
              onSubmit={handleAddSource}
              style={{
                background: "#f8fafc",
                padding: "14px",
                borderRadius: "14px",
                border: "1.5px solid #e2e8f0",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                width: "100%",
                boxSizing: "border-box",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", flexWrap: "wrap" }}>
                <strong style={{ fontSize: "12px", color: "#0f172a", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <span>+ Neue Rezept-Webseite hinzufügen</span>
                </strong>
                <span style={{ fontSize: "10.5px", color: "#64748b" }}>
                  * Name wird automatisch aus der Domain erkannt
                </span>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
                  gap: "8px",
                  width: "100%",
                }}
              >
                <div>
                  <label style={{ display: "block", fontSize: "10.5px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
                    Webseite URL oder Domain *
                  </label>
                  <input
                    type="text"
                    placeholder="z.B. lecker.de oder https://..."
                    value={newSourceUrl}
                    disabled={Boolean(isScanningSourceId)}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewSourceUrl(val);
                      if (!userEditedName) {
                        const extracted = extractDomainAndName(val);
                        if (extracted.name && extracted.name !== "Rezept-Webseite") {
                          setNewSourceName(extracted.name);
                        } else if (!val.trim()) {
                          setNewSourceName("");
                        }
                      }
                    }}
                    style={{
                      height: "38px",
                      padding: "0 10px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "12px",
                      background: "#ffffff",
                      outline: "none",
                      width: "100%",
                      minWidth: 0,
                      boxSizing: "border-box",
                    }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "10.5px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
                    Name der Quelle (automatisch)
                  </label>
                  <input
                    type="text"
                    placeholder="Wird aus Domain erkannt..."
                    value={newSourceName}
                    disabled={Boolean(isScanningSourceId)}
                    onChange={(e) => {
                      setNewSourceName(e.target.value);
                      setUserEditedName(true);
                    }}
                    style={{
                      height: "38px",
                      padding: "0 10px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "12px",
                      background: "#ffffff",
                      outline: "none",
                      width: "100%",
                      minWidth: 0,
                      boxSizing: "border-box",
                      fontWeight: 600,
                      color: "#0f172a",
                    }}
                  />
                </div>
              </div>

              {/* Auto Crawl Checkbox */}
              <label
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "11.5px",
                  fontWeight: 650,
                  color: "#334155",
                  cursor: isScanningSourceId ? "not-allowed" : "pointer",
                  userSelect: "none",
                  padding: "2px 0",
                }}
              >
                <input
                  type="checkbox"
                  checked={autoCrawlAll}
                  disabled={Boolean(isScanningSourceId)}
                  onChange={(e) => setAutoCrawlAll(e.target.checked)}
                  style={{
                    width: "16px",
                    height: "16px",
                    accentColor: "#059669",
                    cursor: isScanningSourceId ? "not-allowed" : "pointer",
                  }}
                />
                <span>Alle Unterseiten automatisch durchsuchen (Voll-Scan)</span>
              </label>

              <button
                type="submit"
                disabled={!newSourceUrl.trim() || Boolean(isScanningSourceId)}
                style={{
                  height: "38px",
                  padding: "0 16px",
                  borderRadius: "8px",
                  background: !newSourceUrl.trim() || isScanningSourceId ? "#94a3b8" : "#059669",
                  color: "#ffffff",
                  border: "none",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: !newSourceUrl.trim() || isScanningSourceId ? "not-allowed" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  width: "100%",
                  boxSizing: "border-box",
                  boxShadow: !newSourceUrl.trim() || isScanningSourceId ? "none" : "0 2px 6px rgba(5, 150, 105, 0.2)",
                  transition: "background 0.15s ease",
                }}
              >
                {isScanningSourceId === "new" ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                    <span>{scanProgressMessage || "⏳ Scanne Webseite..."}</span>
                    <span
                      onClick={(ev) => { ev.stopPropagation(); handleStopScan(); }}
                      style={{
                        marginLeft: "8px",
                        background: "#dc2626",
                        color: "#fff",
                        padding: "2px 8px",
                        borderRadius: "4px",
                        fontSize: "11px",
                      }}
                    >
                      ⏹ Stopp
                    </span>
                  </span>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                    <span>Webseite scannen & Rezepte importieren</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

      </div>

      {/* Recipe Count Info & Reset */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "8px",
          gap: "8px",
        }}
      >
        <span style={{ fontSize: "12.5px", color: "#64748b", fontWeight: 650 }}>
          {filteredRecipes.length} Rezepte {totalPages > 1 ? `· Seite ${safePage} von ${totalPages}` : ""}
        </span>
        {Boolean(searchQuery || selectedCategory !== "Alle" || selectedSource !== "Alle") && (
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory("Alle");
              setSelectedSource("Alle");
              setCurrentPage(1);
            }}
            style={{
              fontSize: "11px",
              color: "#059669",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontWeight: 700,
              padding: 0,
            }}
          >
            Filter zurücksetzen
          </button>
        )}
      </div>

      {/* Filter and Search Bar: 100% single line without wrapping */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.1fr 1fr 1fr",
          gap: "6px",
          marginBottom: "14px",
          width: "100%",
        }}
      >
        {/* Search Input */}
        <input
          type="text"
          placeholder="Suchen..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setCurrentPage(1);
          }}
          style={{
            height: "36px",
            padding: "0 8px 0 10px",
            borderRadius: "8px",
            border: "1px solid #cbd5e1",
            background: "#ffffff",
            fontSize: "12px",
            fontWeight: 500,
            color: "#1e293b",
            outline: "none",
            width: "100%",
            minWidth: 0,
            boxSizing: "border-box",
          }}
        />

        {/* Category Dropdown */}
        <select
          value={selectedCategory}
          onChange={(e) => {
            setSelectedCategory(e.target.value as any);
            setCurrentPage(1);
          }}
          style={{
            height: "36px",
            padding: "0 6px",
            borderRadius: "8px",
            border: "1px solid #cbd5e1",
            background: "#ffffff",
            fontSize: "12px",
            fontWeight: 600,
            color: "#1e293b",
            cursor: "pointer",
            outline: "none",
            width: "100%",
            minWidth: 0,
            boxSizing: "border-box",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            overflow: "hidden",
          }}
        >
          <option value="Alle">Kategorie: Alle</option>
          <option value="Hauptgericht">Hauptgericht</option>
          <option value="Frühstück">Frühstück</option>
          <option value="Snack">Snack</option>
          <option value="Dessert">Dessert</option>
          <option value="Backen">Backen</option>
        </select>

        {/* Source Dropdown */}
        <select
          value={selectedSource}
          onChange={(e) => {
            setSelectedSource(e.target.value);
            setCurrentPage(1);
          }}
          style={{
            height: "36px",
            padding: "0 6px",
            borderRadius: "8px",
            border: "1px solid #cbd5e1",
            background: "#ffffff",
            fontSize: "12px",
            fontWeight: 600,
            color: "#1e293b",
            cursor: "pointer",
            outline: "none",
            width: "100%",
            minWidth: 0,
            boxSizing: "border-box",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            overflow: "hidden",
          }}
        >
          <option value="Alle">Quelle: Alle</option>
          {sources
            .filter((src) => {
              if (src.isCustom) return true;
              const count = allLibraryRecipes.filter((r) =>
                (r.source || "").toLowerCase().includes(src.name.toLowerCase())
              ).length;
              return count > 0;
            })
            .map((src) => {
              const count = allLibraryRecipes.filter((r) =>
                (r.source || "").toLowerCase().includes(src.name.toLowerCase())
              ).length;
              return (
                <option key={src.id} value={src.name}>
                  {src.name} {count > 0 ? `(${count})` : ""}
                </option>
              );
            })}
        </select>
      </div>

      {/* Empty State */}
      {filteredRecipes.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "40px 16px",
            background: "#ffffff",
            borderRadius: "16px",
            border: "1px dashed #cbd5e1",
          }}
        >
          <p style={{ margin: 0, fontSize: "13px", color: "#64748b", fontWeight: 600 }}>
            Keine Rezepte für die aktuelle Filterung gefunden.
          </p>
          <button
            type="button"
            onClick={() => {
              setSelectedCategory("Alle");
              setSelectedSource("Alle");
              setSearchQuery("");
            }}
            style={{
              marginTop: "10px",
              padding: "8px 16px",
              borderRadius: "8px",
              border: "1px solid #059669",
              background: "#ecfdf5",
              color: "#059669",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Filter zurücksetzen
          </button>
        </div>
      ) : (
        /* 2-COLUMN GRID RASTER (Exakt genau wie bei gemerkte Rezepte) */
        <>
          <div className="saved-meals-grid" style={{ margin: 0 }}>
            {paginatedRecipes.map((recipe) => {
              const imgUrl = recipe.imageUrl || resolveRecipeFoodImage(recipe.title, recipe.subtitle);
              const recipeCategory = getRecipeCategory(recipe);
              const isFav = favorites.includes(recipe.id);
              const cardBreakdown = getRecipePantryBreakdown(recipe, pantry || [], servings);
              const matchText =
                cardBreakdown.matchPercentage === 100
                  ? "100% Vorrat"
                  : `${cardBreakdown.matchPercentage}% Match`;

              return (
                <div
                  key={recipe.id}
                  className="saved-grid-card"
                  onClick={() => onSelectRecipe(recipe)}
                >
                  <div className="saved-grid-thumb-wrap">
                    <img
                      src={imgUrl}
                      alt={recipe.title}
                      className="saved-grid-thumb-img"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = resolveRecipeFoodImage(recipe.title);
                      }}
                    />
                    <span className="saved-grid-match-badge">{matchText}</span>
                    {recipe.source && (
                      <span
                        style={{
                          position: "absolute",
                          bottom: "6px",
                          left: "6px",
                          fontSize: "9.5px",
                          fontWeight: 750,
                          color: "#ffffff",
                          background: "rgba(15, 23, 42, 0.78)",
                          backdropFilter: "blur(4px)",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          maxWidth: "85%",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {recipe.source}
                      </span>
                    )}
                    <button
                      type="button"
                      className="saved-grid-delete-btn"
                      title="Rezept löschen"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRecipeToDelete(recipe);
                      }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className="saved-grid-unbookmark-btn"
                      title={isFav ? "Aus Gemerkt entfernen" : "Zu Gemerkt hinzufügen"}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(recipe.id, recipe.title);
                      }}
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill={isFav ? "#059669" : "none"}
                        stroke="#059669"
                        strokeWidth="2"
                      >
                        <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
                      </svg>
                    </button>
                  </div>
                  <div className="saved-grid-info">
                    <div style={{ marginBottom: "4px" }}>
                      <span
                        className="saved-grid-cat-pill"
                        style={{
                          fontSize: "10px",
                          fontWeight: 700,
                          color: "#047857",
                          background: "#ecfdf5",
                          border: "1px solid #a7f3d0",
                          padding: "2px 7px",
                          borderRadius: "6px",
                          display: "inline-block",
                        }}
                      >
                        {recipeCategory}
                      </span>
                    </div>
                    <h3 className="saved-grid-title">{recipe.title}</h3>
                    <p className="saved-grid-sub">{recipe.subtitle}</p>
                    <div className="saved-grid-meta-row">
                      <span className="saved-grid-meta-item">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                        {recipe.time}
                      </span>
                      <span className="saved-grid-meta-item">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                          <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
                        </svg>
                        {Math.round(recipe.baseCal)} kcal
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls (max 10 cards per page) */}
          {totalPages > 1 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "12px",
                marginTop: "20px",
                padding: "8px 0",
              }}
            >
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => {
                  setCurrentPage((p) => Math.max(1, p - 1));
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 14px",
                  borderRadius: "10px",
                  border: "1px solid #cbd5e1",
                  background: safePage <= 1 ? "#f1f5f9" : "#ffffff",
                  color: safePage <= 1 ? "#94a3b8" : "#1e293b",
                  fontSize: "12px",
                  fontWeight: 750,
                  cursor: safePage <= 1 ? "not-allowed" : "pointer",
                  boxShadow: safePage <= 1 ? "none" : "0 1px 3px rgba(0,0,0,0.04)",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
                <span>Vorherige</span>
              </button>

              <span
                style={{
                  fontSize: "12.5px",
                  fontWeight: 750,
                  color: "#475569",
                  padding: "6px 14px",
                  background: "#ffffff",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                }}
              >
                Seite {safePage} von {totalPages}
              </span>

              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => {
                  setCurrentPage((p) => Math.min(totalPages, p + 1));
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 14px",
                  borderRadius: "10px",
                  border: safePage >= totalPages ? "1px solid #cbd5e1" : "1px solid #2d5a3e",
                  background: safePage >= totalPages ? "#f1f5f9" : "#2d5a3e",
                  color: safePage >= totalPages ? "#94a3b8" : "#ffffff",
                  fontSize: "12px",
                  fontWeight: 750,
                  cursor: safePage >= totalPages ? "not-allowed" : "pointer",
                  boxShadow: safePage >= totalPages ? "none" : "0 2px 6px rgba(45, 90, 62, 0.2)",
                }}
              >
                <span>Nächste</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </div>
          )}
        </>
      )}

      {/* Mobile-Friendly Delete Confirmation Modal */}
      {recipeToDelete && (
        <div
          className="modal-overlay"
          onClick={() => setRecipeToDelete(null)}
          style={{ zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#ffffff",
              borderRadius: "18px",
              padding: "20px",
              maxWidth: "360px",
              width: "100%",
              boxShadow: "0 20px 40px rgba(15, 23, 42, 0.2)",
              border: "1px solid #e2e8f0",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: "#fee2e2",
                color: "#dc2626",
                display: "grid",
                placeItems: "center",
                margin: "0 auto 12px",
                fontSize: "22px",
              }}
            >
              🗑️
            </div>
            <h3 style={{ margin: "0 0 6px", fontSize: "16px", fontWeight: 750, color: "#0f172a" }}>
              Rezept löschen?
            </h3>
            <p style={{ margin: "0 0 18px", fontSize: "12.5px", color: "#64748b", lineHeight: 1.4 }}>
              Möchtest du <strong>«{recipeToDelete.title}»</strong> wirklich dauerhaft aus deiner Rezept-Bibliothek löschen?
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <button
                type="button"
                onClick={() => setRecipeToDelete(null)}
                style={{
                  padding: "10px 14px",
                  borderRadius: "10px",
                  background: "#f1f5f9",
                  color: "#475569",
                  border: "1px solid #cbd5e1",
                  fontSize: "13px",
                  fontWeight: 650,
                  cursor: "pointer",
                }}
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                style={{
                  padding: "10px 14px",
                  borderRadius: "10px",
                  background: "#dc2626",
                  color: "#ffffff",
                  border: "none",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 2px 6px rgba(220, 38, 38, 0.3)",
                }}
              >
                Löschen
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
