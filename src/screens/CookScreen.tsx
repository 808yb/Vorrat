import { useState, useRef, useMemo, lazy, Suspense } from "react";
import { FULL_RECIPE_CATALOG, type CatalogRecipe } from "../data/recipeCatalog";
import {
  getStoredCustomRecipes,
  generateRecipeWithGemini,
} from "../utils/geminiRecipes";
import {
  getSafeIngredientsList,
  getSafeAvailable,
  getCurrentMealTimeSlot,
  getRecipeCategory,
  type RecipeCategory,
} from "../utils/recipeHelpers";
import { RecipeSwipeDeck } from "../components/RecipeSwipeDeck";
import { getRecipePantryBreakdown } from "../utils/pantryMatching";
import { SurpriseMeModal, type SurpriseFilters } from "../components/SurpriseMeModal";
import { RecipeLibraryScreen } from "../components/RecipeLibraryScreen";
import { Icon, Button, type PantryItem } from "../App";

const CookingModal = lazy(() =>
  import("../components/CookingModal").then((m) => ({ default: m.CookingModal }))
);

export interface CookScreenProps {
  pantry: PantryItem[];
  customRecipes?: CatalogRecipe[];
  onAddCustomRecipe?: (recipe: CatalogRecipe) => void;
  favorites: string[];
  onToggleFavorite: (recipeId: string, recipeTitle: string) => void;
  onBookmark: (recipeId: string, recipeTitle: string) => void;
  onCook: (recipeTitle: string, servings: number) => void;
  onNavigateToCook: () => void;
  onMicTrigger: () => void;
  onNotify?: (message: string) => void;
  onAddMissingToGroceries?: (items: Array<{ name: string; amount?: string }>) => void;
  onOpenImportRecipe?: () => void;
  isSurpriseModalOpen?: boolean;
  onSetIsSurpriseModalOpen?: (open: boolean) => void;
  expiringSearchIngredients?: string[];
  onClearExpiringFilter?: () => void;
  onDeleteRecipe?: (recipe: CatalogRecipe) => void;
}

export function CookScreen({
  pantry,
  customRecipes = [],
  onAddCustomRecipe,
  favorites,
  onToggleFavorite,
  onBookmark,
  onCook,
  onNavigateToCook,
  onMicTrigger,
  onNotify,
  onAddMissingToGroceries,
  onOpenImportRecipe,
  isSurpriseModalOpen: externalSurpriseOpen,
  onSetIsSurpriseModalOpen: setExternalSurpriseOpen,
  expiringSearchIngredients = [],
  onClearExpiringFilter,
  onDeleteRecipe,
}: CookScreenProps) {
  const [servings, setServings] = useState(3);
  const [intent, setIntent] = useState("");
  const [generated, setGenerated] = useState(false);
  const [shuffleIndex, setShuffleIndex] = useState(() => Math.floor(Math.random() * 12));
  const [matchScore, setMatchScore] = useState(98);
  const [isRotating, setIsRotating] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [activeSearchedRecipe, setActiveSearchedRecipe] = useState<CatalogRecipe | null>(null);
  const [deckKey, setDeckKey] = useState(0);

  // Web Speech Recognition
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const hasSpeechRecognition =
    typeof window !== "undefined" &&
    Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  const toggleSpeechInput = () => {
    if (!hasSpeechRecognition) return;

    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch { }
      setIsListening(false);
      return;
    }

    try {
      const SpeechRecognitionClass =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognitionClass();
      recognition.lang = "de-DE";
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
        if (onNotify) onNotify("Spracherkennung aktiv: Sprich jetzt...");
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript;
        if (transcript) {
          setIntent((prev) => (prev ? `${prev.trim()} ${transcript}` : transcript));
          if (onNotify) onNotify(`Erkannt: "${transcript}"`);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        setIsListening(false);
        if (event.error !== "no-speech" && onNotify) {
          onNotify("Spracherkennung abgebrochen oder kein Mikrofon-Zugriff.");
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn("Speech recognition init error:", err);
      setIsListening(false);
    }
  };

  const [activeModalRecipe, setActiveModalRecipe] = useState<CatalogRecipe | null>(null);
  const [localSurpriseModalOpen, setLocalSurpriseModalOpen] = useState(false);
  const [surpriseFilters, setSurpriseFilters] = useState<SurpriseFilters | null>(null);

  const isSurpriseModalOpen = externalSurpriseOpen !== undefined ? externalSurpriseOpen : localSurpriseModalOpen;
  const setSurpriseModalOpen = (open: boolean) => {
    setLocalSurpriseModalOpen(open);
    if (setExternalSurpriseOpen) setExternalSurpriseOpen(open);
  };

  const currentMealSlot = useMemo(() => getCurrentMealTimeSlot(), []);

  // Dynamic curated recipes for Daily Discover:
  // Automatically rotates 3× daily (Morgens, Mittags, Abends) + shifts every day + prioritizes pantry matches
  const catalogShuffleList = useMemo(() => {
    // Strictly include only recipes from authentic cooking websites
    const custom = getStoredCustomRecipes();
    const combined = [...FULL_RECIPE_CATALOG, ...custom].filter((rec) => Boolean(rec.source));

    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 0);
    const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
    // Time slot offset (0 = Morning, 1 = Midday, 2 = Evening) plus shuffleIndex for manual reshuffling
    const timeSlotBonusOffset = dayOfYear * 11 + currentMealSlot.slotId * 17 + shuffleIndex * 19;
    const isPantry100Requested = Boolean(surpriseFilters?.preferences?.includes("pantry100"));

    const scored = combined.map((rec, origIdx) => {
      const breakdown = getRecipePantryBreakdown(rec, pantry, servings);
      const total = breakdown.inStock.length + breakdown.missing.length;
      const matchPct = total > 0 ? breakdown.inStock.length / total : 0;

      // Slot suitability bonus
      const titleLower = rec.title.toLowerCase();
      let slotBonus = 0;
      if (currentMealSlot.slotId === 0) {
        // Morning / Fast lunch
        if (
          titleLower.includes("ei") ||
          titleLower.includes("omelett") ||
          titleLower.includes("shakshuka") ||
          titleLower.includes("bowl") ||
          titleLower.includes("toast") ||
          rec.mealType === "breakfast"
        ) {
          slotBonus = 0.22;
        }
      } else if (currentMealSlot.slotId === 1) {
        // Midday / Lunch
        if (
          titleLower.includes("pasta") ||
          titleLower.includes("penne") ||
          titleLower.includes("reis") ||
          titleLower.includes("wok") ||
          titleLower.includes("bolognese") ||
          titleLower.includes("alfredo") ||
          rec.mealType === "dinner"
        ) {
          slotBonus = 0.22;
        }
      } else {
        // Evening / Dinner
        if (
          titleLower.includes("hähnchen") ||
          titleLower.includes("rind") ||
          titleLower.includes("speck") ||
          titleLower.includes("teriyaki") ||
          titleLower.includes("arrabbiata") ||
          titleLower.includes("geschnetzeltes") ||
          rec.baseProt >= 20 ||
          rec.mealType === "dinner"
        ) {
          slotBonus = 0.22;
        }
      }

      // 70-80% Matching Priority Algorithm:
      // In default/standard mode, prioritize recipes matching 70-85% (needing 1-2 items) for variety and gourmet meals,
      // unless 100% Vorrat (pantry100) is explicitly chosen.
      let pantryScore = 0;
      if (isPantry100Requested) {
        if (breakdown.missing.length === 0 && breakdown.inStock.length > 0) {
          pantryScore = 20; // Maximum boost for 100% match
        } else {
          pantryScore = matchPct * 5 - 12;
        }
      } else {
        if (matchPct >= 0.68 && matchPct <= 0.85) {
          pantryScore = 12; // Top priority recommendation
        } else if (matchPct > 0.85) {
          pantryScore = 6;
        } else if (matchPct >= 0.50) {
          pantryScore = 3;
        } else {
          pantryScore = -2;
        }
      }

      // Bonus points for surpriseFilters
      let preferenceBonus = 0;
      if (surpriseFilters?.mealType && surpriseFilters.mealType !== "all") {
        if (rec.mealType === surpriseFilters.mealType) {
          preferenceBonus += 12;
        }
      }
      if (surpriseFilters?.preferences && surpriseFilters.preferences.length > 0) {
        const timeNum = parseInt(rec.time.replace(/\D/g, "") || "20", 10);
        for (const pref of surpriseFilters.preferences) {
          if (pref === "quick" && timeNum <= 15) preferenceBonus += 4;
          if (pref === "veggie" && !rec.title.toLowerCase().match(/hähnchen|rind|hack|speck|fleisch|wurst/)) preferenceBonus += 4;
          if (pref === "protein" && rec.baseProt >= 15) preferenceBonus += 4;
          if (pref === "lowcarb" && rec.baseCarb <= 18) preferenceBonus += 4;
          if (pref === "budget" && rec.baseCost <= 2.0) preferenceBonus += 4;
          if (pref === "spicy" && rec.title.toLowerCase().match(/chili|scharf|arrabbiata|teriyaki|wok/)) preferenceBonus += 4;
        }
      }
      if (surpriseFilters?.equipment && rec.equipment) {
        if (rec.equipment.some((eq) => surpriseFilters.equipment.includes(eq))) {
          preferenceBonus += 4;
        }
      }

      // Bonus for expiring ingredients: Prioritize recipes containing expiring items to the very top!
      let expiringBonus = 0;
      if (expiringSearchIngredients && expiringSearchIngredients.length > 0) {
        const titleLower = rec.title.toLowerCase();
        const subtitleLower = (rec.subtitle || "").toLowerCase();
        const ingList = typeof rec.ingredientsList === "function"
          ? rec.ingredientsList(servings)
          : getSafeIngredientsList(rec, servings);

        const hasExpiringMatch = expiringSearchIngredients.some((expItem) => {
          const normExp = expItem.toLowerCase().trim();
          if (normExp.length < 2) return false;
          if (titleLower.includes(normExp) || subtitleLower.includes(normExp)) return true;
          return ingList.some((ing) => {
            const ingLower = ing.name.toLowerCase();
            return ingLower.includes(normExp) || normExp.includes(ingLower);
          });
        });

        if (hasExpiringMatch) {
          expiringBonus = 150;
        }
      }

      // Rotational hash with time slot variance to cycle top recipes 3× a day
      const variance = ((origIdx * 23 + timeSlotBonusOffset) % 100) / 350;
      return { rec, score: expiringBonus + pantryScore + preferenceBonus + slotBonus + variance };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.map((s) => s.rec);
  }, [shuffleIndex, pantry, servings, currentMealSlot, surpriseFilters, expiringSearchIngredients]);

  // Pre-calculated list of bookmarked favorite recipes (calories & macros remain constant per portion)
  const favoriteRecipes = useMemo(() => {
    const all = activeSearchedRecipe ? [activeSearchedRecipe, ...FULL_RECIPE_CATALOG] : FULL_RECIPE_CATALOG;
    return all.filter((item) => favorites.includes(item.id)).map((item) => {
      const costNum = typeof item.baseCost === "number" ? item.baseCost : parseFloat(String(item.baseCost || "1.5").replace(",", ".")) || 1.5;
      return {
        ...item,
        calories: `${Math.round(Number(item.baseCal) || 350)}`,
        protein: `${Math.round(Number(item.baseProt) || 15)}g`,
        carbs: `${Math.round(Number(item.baseCarb) || 40)}g`,
        cost: `${costNum.toFixed(2).replace(".", ",")} €`,
        availableFormatted: typeof item.available === "function" ? item.available(servings) : getSafeAvailable(item, servings),
      };
    });
  }, [activeSearchedRecipe, favorites, servings]);

  const [isSwipeExpanded, setIsSwipeExpanded] = useState(true);

  // All catalog recipes formatted for the Daily Discover Deck (calories & macros per portion)
  // When a recipe is searched, it becomes the CURRENT (first) card at index 0!
  const allCatalogRecipesFormatted = useMemo(() => {
    const deckList = activeSearchedRecipe
      ? [activeSearchedRecipe, ...catalogShuffleList.filter((r) => r.id !== activeSearchedRecipe.id)]
      : catalogShuffleList;

    return deckList.map((item) => {
      const breakdown = getRecipePantryBreakdown(item, pantry, servings);
      const costNum = typeof item.baseCost === "number" ? item.baseCost : parseFloat(String(item.baseCost || "1.5").replace(",", ".")) || 1.5;
      return {
        ...item,
        matchScore: breakdown.matchPercentage,
        missingCount: breakdown.missing.length,
        calories: `${Math.round(Number(item.baseCal) || 350)}`,
        protein: `${Math.round(Number(item.baseProt) || 15)}g`,
        carbs: `${Math.round(Number(item.baseCarb) || 40)}g`,
        cost: `${costNum.toFixed(2).replace(".", ",")} €`,
        availableFormatted: typeof item.available === "function" ? item.available(servings) : getSafeAvailable(item, servings),
      };
    });
  }, [activeSearchedRecipe, catalogShuffleList, servings, pantry]);

  const [selectedCategory, setSelectedCategory] = useState<RecipeCategory | "Alle">("Alle");

  const handleSelectCategory = (cat: RecipeCategory | "Alle") => {
    setSelectedCategory(cat);
    setDeckKey((k) => k + 1);
  };

  const filteredDeckRecipes = useMemo(() => {
    let list = allCatalogRecipesFormatted;
    if (selectedCategory !== "Alle") {
      list = list.filter((r) => getRecipeCategory(r) === selectedCategory);
    }
    if (surpriseFilters?.preferences?.includes("pantry100")) {
      const perfectOnly = list.filter((r) => r.missingCount === 0);
      return perfectOnly.length > 0 ? perfectOnly : list;
    }
    return list;
  }, [surpriseFilters, allCatalogRecipesFormatted, selectedCategory]);

  const [isLibraryViewOpen, setIsLibraryViewOpen] = useState(false);

  // Überrasch mich Handler: Open interactive preference dialog
  const handleSurpriseMe = () => {
    setIsRotating(true);
    setSurpriseModalOpen(true);
    setTimeout(() => {
      setIsRotating(false);
    }, 350);
  };

  const handleShuffle = handleSurpriseMe;

  const handleGenerate = async () => {
    const query = intent.trim();
    if (query) {
      const queryLower = query.toLowerCase();
      // 1. Check if user searched for an existing recipe in FULL_RECIPE_CATALOG
      const catalogMatch = FULL_RECIPE_CATALOG.find(
        (r) =>
          r.title.toLowerCase().includes(queryLower) ||
          r.subtitle.toLowerCase().includes(queryLower)
      );
      if (catalogMatch) {
        setActiveSearchedRecipe(catalogMatch);
        setDeckKey((k) => k + 1);
        setIsSwipeExpanded(true);
        setGenerated(true);
        setIntent("");
        if (onNotify) onNotify(`«${catalogMatch.title}» als aktuelle Karte geöffnet`);
        return;
      }

      // 2. Otherwise generate with Gemini AI
      setIsAiGenerating(true);
      if (onNotify) onNotify(`AI sucht und kreiert Rezept für «${query}»...`);
      try {
        const newRecipe = await generateRecipeWithGemini(query, pantry, servings);
        if (onAddCustomRecipe) {
          onAddCustomRecipe(newRecipe);
        }
        // Set search result as current active card and reset deck index to 0
        setActiveSearchedRecipe(newRecipe);
        setDeckKey((k) => k + 1);
        setIsSwipeExpanded(true);
        setGenerated(true);
        setIntent("");
        if (onNotify) {
          onNotify(`«${newRecipe.title}» als aktuelle Karte geöffnet!`);
        }
      } catch (err: any) {
        console.error("AI Generation Error:", err);
        if (onNotify) {
          onNotify(`Fehler bei AI-Generierung: ${err?.message || "Bitte erneut versuchen"}`);
        }
      } finally {
        setIsAiGenerating(false);
      }
    } else {
      handleSurpriseMe();
    }
  };

  if (isLibraryViewOpen) {
    return (
      <>
        <RecipeLibraryScreen
          pantry={pantry}
          servings={servings}
          favorites={favorites}
          onToggleFavorite={onToggleFavorite}
          onSelectRecipe={(rec) => setActiveModalRecipe(rec)}
          onBack={() => setIsLibraryViewOpen(false)}
          onNotify={onNotify}
          onDeleteRecipe={onDeleteRecipe}
        />
        {Boolean(activeModalRecipe) && (
          <Suspense fallback={null}>
            <CookingModal
              recipe={activeModalRecipe}
              isOpen={Boolean(activeModalRecipe)}
              onClose={() => setActiveModalRecipe(null)}
              onCook={onCook}
              pantry={pantry}
              isFavorite={activeModalRecipe ? favorites.includes(activeModalRecipe.id) : false}
              onToggleFavorite={onToggleFavorite}
              onAddMissingToGroceries={onAddMissingToGroceries}
              onDeleteRecipe={onDeleteRecipe}
            />
          </Suspense>
        )}
      </>
    );
  }

  return (
    <main className="screen cook-screen">
      <section className="title-row cook-title">
        <div><p className="eyebrow">Smart & restefreundlich</p><h1>Was kochen wir?</h1></div>
      </section>

      <section className="generator-card">
        <div className="generator-label">
          <span>Für wie viele?</span><strong>{servings} Personen</strong>
        </div>
        <div className="segment-control">
          {[1, 2, 3, 4, 5].map((count) => (
            <Button
              key={count}
              className={servings === count ? "active" : ""}
              onClick={() => setServings(count)}
            >
              {count}
            </Button>
          ))}
        </div>
        <label className="intent-field">
          <textarea
            value={intent}
            onChange={(event) => setIntent(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                handleGenerate();
              }
            }}
            placeholder="Z. B. Ramen mit Ei, Pasta Pesto, schnelles Curry..."
          />
          {hasSpeechRecognition && (
            <Button
              className={`mic-button ${isListening ? "listening" : ""}`}
              title={isListening ? "Aufnahme stoppen" : "Sprachnotiz aufnehmen"}
              onClick={toggleSpeechInput}
              style={
                isListening
                  ? {
                    color: "#dc2626",
                    background: "#fee2e2",
                    borderColor: "#fca5a5",
                    animation: "pulse 1.2s infinite",
                  }
                  : undefined
              }
            >
              <Icon name="mic" size={19} />
            </Button>
          )}
        </label>

        {/* Dual button bar: Generate + Überrasch mich */}
        <div style={{ display: "flex", gap: "8px" }}>
          <Button
            className={`primary-button generate-button ${isAiGenerating ? "loading" : ""}`}
            style={{ flex: 1.6 }}
            icon={isAiGenerating ? "sync" : "wand"}
            disabled={isAiGenerating}
            onClick={handleGenerate}
          >
            {isAiGenerating ? "AI kreiert Rezept..." : "Rezepte generieren"}
          </Button>

          <Button
            className="secondary-button"
            style={{
              flex: 1.4,
              height: "44px",
              background: "#ebf3ee",
              borderColor: "#c6dcce",
              color: "#2d5a3e",
              fontWeight: 750,
              gap: "5px",
              whiteSpace: "nowrap",
            }}
            title="Zufälliges Rezept mit Zutaten aus deinem Vorrat vorschlagen"
            disabled={isAiGenerating}
            onClick={handleSurpriseMe}
          >
            <span style={{ display: "inline-flex", alignItems: "center", transform: isRotating ? "rotate(180deg)" : "none", transition: "transform 350ms ease" }}><Icon name="dice" size={16} /></span>
            Überrasch mich
          </Button>
        </div>

        <p className="generator-hint">
          <Icon name="check" size={13} /> Nutzt bevorzugt, was bald verbraucht werden sollte
        </p>

        {onOpenImportRecipe && (
          <button
            type="button"
            className="recipe-import-trigger-btn"
            onClick={onOpenImportRecipe}
          >
            <Icon name="sparkles" size={15} />
            <span>Rezept importieren</span>
          </button>
        )}
      </section>

      {/* Quick link to dedicated Saved Meals & Cooking screen */}
      {favorites.length > 0 && onNavigateToCook && (
        <div className="saved-meals-quick-banner" onClick={onNavigateToCook}>
          <div className="saved-meals-banner-left">
            <Icon name="bookmarkFilled" size={17} />
            <div>
              <strong>{favorites.length} Mahlzeit{favorites.length > 1 ? "en" : ""} gemerkt</strong>
              <p>Bereit zum Kochen mit Vorratsabbuchung & Anleitung</p>
            </div>
          </div>
          <button type="button" className="saved-meals-banner-btn">
            Zu Kochen →
          </button>
        </div>
      )}

      {/* 2. REZEPT-BIBLIOTHEK (Eigene Seite - Nicht aufklappen, mit kurzer Beschreibung & Button) */}
      <div
        className="library-teaser-card"
        onClick={() => setIsLibraryViewOpen(true)}
        style={{
          background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
          borderRadius: "20px",
          border: "1.5px solid #e2e8f0",
          boxShadow: "0 4px 14px -2px rgba(15, 23, 42, 0.05)",
          padding: "16px 18px",
          margin: "12px 0 16px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "14px",
          transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        role="button"
        tabIndex={0}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px", minWidth: 0 }}>
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "14px",
              background: "#ebf3ee",
              color: "#2d5a3e",
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
              boxShadow: "0 2px 6px rgba(45, 90, 62, 0.12)",
            }}
          >
            <Icon name="book" size={22} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
              <span style={{ fontSize: "15px", fontWeight: 800, color: "#0f172a" }}>
                Rezept-Bibliothek
              </span>
            </div>
            <p style={{ margin: 0, fontSize: "12px", color: "#64748b", lineHeight: 1.45 }}>
              Rezepte aus Webseiten durchstöbern.
            </p>
          </div>
        </div>

        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            background: "#2d5a3e",
            color: "#ffffff",
            padding: "9px 15px",
            borderRadius: "12px",
            fontSize: "12.5px",
            fontWeight: 750,
            whiteSpace: "nowrap",
            flexShrink: 0,
            boxShadow: "0 2px 8px rgba(45, 90, 62, 0.2)",
          }}
        >
          <span>Bibliothek öffnen</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </div>
      </div>

      {/* 3. Daily Discover Collapsible Container (Cards & Action Buttons) */}
      <div
        className="tinderswipe-collapsible-wrapper"
        style={{
          margin: "0 0 16px",
          background: "#ffffff",
          border: "1.5px solid #e2e8f0",
          borderRadius: "16px",
          overflow: "hidden",
          boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
          transition: "border-color 0.2s ease",
        }}
      >
        {/* Accordion / Dropdown Toggle Bar */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setIsSwipeExpanded((prev) => !prev)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setIsSwipeExpanded((prev) => !prev);
            }
          }}
          aria-expanded={isSwipeExpanded}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            background: isSwipeExpanded ? "#f8fafc" : "#ffffff",
            border: "none",
            borderBottom: isSwipeExpanded ? "1px solid #e2e8f0" : "none",
            cursor: "pointer",
            textAlign: "left",
            transition: "background 0.15s ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0, flexShrink: 1 }}>
            <div
              style={{
                width: "30px",
                height: "30px",
                borderRadius: "8px",
                background: isSwipeExpanded ? "#ebf3ee" : "#f1f5f9",
                color: isSwipeExpanded ? "#2d5a3e" : "#64748b",
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <rect x="5" y="4" width="14" height="17" rx="2" />
                <path d="M9 2h6" />
              </svg>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0, flexWrap: "wrap" }}>
              <span style={{ fontSize: "13px", fontWeight: 800, color: "#0f172a", whiteSpace: "nowrap" }}>
                Daily Discover
              </span>
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 750,
                  padding: "2px 7px",
                  borderRadius: "6px",
                  background: isSwipeExpanded ? "#dcfce7" : "#f1f5f9",
                  color: isSwipeExpanded ? "#15803d" : "#64748b",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
                title={`Wechselt 3× täglich (Morgens, Mittags, Abends) · Aktuell: ${currentMealSlot.title}`}
              >
                {currentMealSlot.badge} · {filteredDeckRecipes.length} Rezepte
              </span>
              <select
                value={selectedCategory}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => {
                  e.stopPropagation();
                  handleSelectCategory(e.target.value as any);
                }}
                style={{
                  padding: "3px 8px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  fontSize: "11px",
                  fontWeight: 650,
                  color: "#1e293b",
                  cursor: "pointer",
                  outline: "none",
                }}
              >
                <option value="Alle">Alle Kategorien</option>
                <option value="Hauptgericht">Hauptgericht</option>
                <option value="Frühstück">Frühstück</option>
                <option value="Snack">Snack</option>
                <option value="Dessert">Dessert</option>
                <option value="Backen">Backen</option>
              </select>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShuffleIndex((prev) => prev + 1);
                  setDeckKey((k) => k + 1);
                  if (onNotify) {
                    onNotify(`Vorschläge für ${currentMealSlot.badge} neu gemischt`);
                  }
                }}
                style={{
                  background: "#f1f5f9",
                  border: "1px solid #cbd5e1",
                  borderRadius: "6px",
                  padding: "2px 7px",
                  fontSize: "10.5px",
                  fontWeight: 750,
                  color: "#475569",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  whiteSpace: "nowrap",
                }}
                title="Deck für diesen Slot jetzt neu mischen"
              >
                <Icon name="sync" size={11} />
                <span>Neu mischen</span>
              </button>
            </div>
          </div>

          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              padding: "5px 9px",
              borderRadius: "8px",
              background: isSwipeExpanded ? "#ffffff" : "#ebf3ee",
              border: `1px solid ${isSwipeExpanded ? "#cbd5e1" : "#c6dcce"}`,
              color: isSwipeExpanded ? "#475569" : "#2d5a3e",
              fontSize: "11px",
              fontWeight: 750,
              flexShrink: 0,
              whiteSpace: "nowrap",
            }}
          >
            <span>{isSwipeExpanded ? "Einklappen" : "Aufklappen"}</span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                transform: isSwipeExpanded ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.2s ease",
              }}
            >
              <Icon name="chevron" size={10} />
            </span>
          </div>
        </div>

        {/* Collapsible Swipe Content (Cards + Control Action Buttons) */}
        {isSwipeExpanded && (
          <div style={{ padding: "14px 10px 10px", background: "#f8fafc" }}>
            {/* Reste-Modus Active Banner */}
            {expiringSearchIngredients && expiringSearchIngredients.length > 0 && (
              <div
                style={{
                  background: "#f0fdf4",
                  border: "1.5px solid #86efac",
                  borderRadius: "14px",
                  padding: "10px 14px",
                  marginBottom: "12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "10px",
                  fontSize: "12px",
                  color: "#166534",
                  boxShadow: "0 2px 6px rgba(22, 101, 52, 0.06)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0, flex: 1 }}>
                  <span style={{ display: "inline-flex", color: "#15803d", flexShrink: 0 }}>
                    <Icon name="leaf" size={16} />
                  </span>
                  <span style={{ fontWeight: 650, lineHeight: 1.35 }}>
                    Reste-Modus aktiv: Rezepte mit <strong>{expiringSearchIngredients.slice(0, 3).join(", ")}</strong> werden zuerst gezeigt
                  </span>
                </div>
                {onClearExpiringFilter && (
                  <button
                    type="button"
                    onClick={onClearExpiringFilter}
                    style={{
                      background: "#ffffff",
                      border: "1px solid #86efac",
                      borderRadius: "8px",
                      padding: "5px 10px",
                      fontSize: "11px",
                      fontWeight: 750,
                      color: "#15803d",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                    }}
                  >
                    Filter zurücksetzen
                  </button>
                )}
              </div>
            )}

            <RecipeSwipeDeck
              key={`${deckKey}-${selectedCategory}-${surpriseFilters ? JSON.stringify(surpriseFilters) : "default"}`}
              recipes={filteredDeckRecipes}
              servings={servings}
              pantry={pantry}
              favorites={favorites}
              onToggleFavorite={onToggleFavorite}
              onBookmark={onBookmark}
              onCook={(title, s) => onCook(title, s)}
              onOpenDetails={(rec) => setActiveModalRecipe(rec)}
              onAddMissingToGroceries={onAddMissingToGroceries}
              onNotify={onNotify}
              onShuffle={handleSurpriseMe}
              onNavigateToSaved={onNavigateToCook}
            />
          </div>
        )}
      </div>

      {/* Full-screen / Rich Step-by-Step Cooking Modal */}
      {Boolean(activeModalRecipe) && (
        <Suspense fallback={null}>
          <CookingModal
            recipe={activeModalRecipe}
            isOpen={Boolean(activeModalRecipe)}
            onClose={() => setActiveModalRecipe(null)}
            onCook={onCook}
            pantry={pantry}
            isFavorite={activeModalRecipe ? favorites.includes(activeModalRecipe.id) : false}
            onToggleFavorite={onToggleFavorite}
            onAddMissingToGroceries={onAddMissingToGroceries}
          />
        </Suspense>
      )}

      {/* Surprise Me Preferences Dialog Modal */}
      {isSurpriseModalOpen && (
        <SurpriseMeModal
          isOpen={isSurpriseModalOpen}
          onClose={() => setSurpriseModalOpen(false)}
          recipes={catalogShuffleList}
          pantry={pantry}
          servings={servings}
          onApplyFilters={(filters) => {
            setSurpriseFilters(filters);
            setDeckKey((k) => k + 1);
            setIsSwipeExpanded(true);
          }}
          onSelectRecipe={(rec) => {
            setActiveSearchedRecipe(rec);
            setDeckKey((k) => k + 1);
            setIsSwipeExpanded(true);
            setGenerated(true);
          }}
          onCookRecipe={(rec) => {
            setActiveModalRecipe(rec);
          }}
          onNotify={onNotify}
        />
      )}
    </main>
  );
}
