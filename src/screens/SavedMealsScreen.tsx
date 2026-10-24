import React, { useState, useEffect, lazy, Suspense } from "react";
import { FULL_RECIPE_CATALOG, type CatalogRecipe } from "../data/recipeCatalog";
import { type PantryItem } from "../App";
import { EditRecipeModal } from "../components/EditRecipeModal";
import { AlternativeManageModal } from "../components/AlternativeManageModal";

import { CookingModal } from "../components/CookingModal";
import {
  getRecipePantryBreakdown,
  findMatchingPantryItem,
  cleanAlternativeText,
  normalizeIngredientName,
  shouldShowAlternativeHint,
  getAmbiguousIngredientTag,
} from "../utils/pantryMatching";
import { getSafeIngredientsList, getSafeSteps, getRecipeCategory, type RecipeCategory } from "../utils/recipeHelpers";
import { resolveRecipeFoodImage } from "../utils/geminiRecipes";
import { compressImageFile } from "../utils/imageUtils";
import { type WeekdayId } from "./WeeklyMealPlannerScreen";

export interface SavedMealsScreenProps {
  pantry: PantryItem[];
  favorites: string[];
  recipes?: CatalogRecipe[];
  initialRecipeId?: string | null;
  initialServings?: number;
  onToggleFavorite: (recipeId: string, recipeTitle: string) => void;
  onCook: (recipeTitle: string, servings: number) => void;
  onNavigateToDiscover: () => void;
  onNavigateToPlanner?: () => void;
  onPlanMeal?: (recipeId: string, recipeTitle: string, dayId: WeekdayId, servings: number) => void;
  onUpdateRecipe?: (updatedRecipe: CatalogRecipe) => void;
  onNotify?: (message: string) => void;
}

export function SavedMealsScreen({
  pantry,
  favorites,
  recipes,
  initialRecipeId,
  initialServings,
  onToggleFavorite,
  onCook,
  onNavigateToDiscover,
  onNavigateToPlanner,
  onPlanMeal,
  onUpdateRecipe,
  onNotify,
}: SavedMealsScreenProps) {
  const catalog = recipes || FULL_RECIPE_CATALOG;
  const [servings, setServings] = useState(initialServings || 2);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(initialRecipeId || null);
  const [completedSteps, setCompletedSteps] = useState<Record<string, Record<number, boolean>>>({});
  const [activeModalRecipe, setActiveModalRecipe] = useState<CatalogRecipe | null>(null);
  const [openAskDirectly, setOpenAskDirectly] = useState<boolean>(false);
  const [cookedRecipeTitles, setCookedRecipeTitles] = useState<Record<string, number>>({});
  const [isDetailsCollapsed, setIsDetailsCollapsed] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [selectedAltIng, setSelectedAltIng] = useState<{
    name: string;
    amount?: string;
    currentMatch?: string;
  } | null>(null);
  const [, setRefreshKey] = useState<number>(0);

  useEffect(() => {
    const handleOverrideChanged = () => setRefreshKey((k) => k + 1);
    window.addEventListener("vorrat_alternative_override_changed", handleOverrideChanged);
    return () => window.removeEventListener("vorrat_alternative_override_changed", handleOverrideChanged);
  }, []);

  // Sync when coming from planner with specific recipe and portions
  useEffect(() => {
    if (initialRecipeId) {
      setSelectedRecipeId(initialRecipeId);
    }
  }, [initialRecipeId]);

  useEffect(() => {
    if (initialServings && initialServings > 0) {
      setServings(initialServings);
    }
  }, [initialServings]);

  // Filter full catalog for saved/favorited recipe objects
  const savedRecipes = catalog.filter((recipe) =>
    favorites.includes(recipe.id)
  );

  const [selectedCategory, setSelectedCategory] = useState<RecipeCategory | "Alle">("Alle");

  const categoryCounts = React.useMemo(() => {
    const counts: Record<string, number> = { Alle: savedRecipes.length };
    savedRecipes.forEach((recipe) => {
      const cat = getRecipeCategory(recipe);
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [savedRecipes]);

  const displayedSavedRecipes = React.useMemo(() => {
    if (selectedCategory === "Alle") return savedRecipes;
    return savedRecipes.filter((r) => getRecipeCategory(r) === selectedCategory);
  }, [savedRecipes, selectedCategory]);

  // Active recipe when selected
  const activeRecipe = selectedRecipeId
    ? savedRecipes.find((r) => r.id === selectedRecipeId) || null
    : null;

  const toggleStep = (recipeId: string, stepNumber: number) => {
    setCompletedSteps((prev) => {
      const current = prev[recipeId] || {};
      return {
        ...prev,
        [recipeId]: {
          ...current,
          [stepNumber]: !current[stepNumber],
        },
      };
    });
  };

  const handleCookMeal = (recipe: CatalogRecipe) => {
    onCook(recipe.title, servings);
    setCookedRecipeTitles((prev) => ({
      ...prev,
      [recipe.id]: (prev[recipe.id] || 0) + 1,
    }));
    if (onNotify) {
      onNotify(`«${recipe.title}» gekocht! Vorräte wurden aktualisiert`);
    }
  };

  const handleCoverPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeRecipe) return;

    try {
      const compressedDataUrl = await compressImageFile(file, 1200, 900, 0.82);
      const updated: CatalogRecipe = {
        ...activeRecipe,
        imageUrl: compressedDataUrl,
      };
      if (onUpdateRecipe) {
        onUpdateRecipe(updated);
      }
      if (onNotify) {
        onNotify("Eigenes Foto erfolgreich als Rezept-Cover gespeichert!");
      }
    } catch (err) {
      console.error(err);
      if (onNotify) {
        onNotify("Fehler beim Verarbeiten des Fotos.");
      }
    }
  };

  // Helper to check stock status of ingredients for a recipe
  const checkIngredientStock = (recipe: CatalogRecipe, s: number) => {
    let list: Array<{ name: string; amount: string; optional?: boolean }> = [];
    if (typeof recipe?.ingredientsList === "function") {
      try {
        list = recipe.ingredientsList(s);
      } catch (err) {
        console.warn("[SavedMealsScreen] Error computing ingredientsList:", err);
      }
    }
    if (!Array.isArray(list) || list.length === 0) {
      list = getSafeIngredientsList(recipe, s);
    }

    return list.map((ing) => {
      const ingLower = ing.name.toLowerCase();

      // Water is always unlimited
      if (ingLower.includes("wasser") || ingLower.includes("water") || ingLower.includes("leitung")) {
        return {
          ...ing,
          inStock: true,
          isAlternative: false,
          matchedPantryName: undefined,
          matchedPantryItemName: undefined,
          ambiguousTag: undefined,
          pantryText: "Vorhanden",
          statusColor: "#059669",
        };
      }

      const ambTag = getAmbiguousIngredientTag(ing.name, undefined, undefined);
      const match = findMatchingPantryItem(ing.name, pantry, recipe?.id, ing.amount, recipe);
      if (!match) {
        return {
          ...ing,
          inStock: !ing.optional ? false : true,
          isAlternative: false,
          matchedPantryName: undefined as string | undefined,
          matchedPantryItemName: undefined as string | undefined,
          ambiguousTag: ambTag,
          pantryText: ing.optional ? "Optional" : "Fehlt",
          statusColor: ing.optional ? "#64748b" : "#e11d48",
        };
      }

      const matchedPantry = match.pantryItem;
      const isAlt = Boolean(
        match.isAlternative ||
        (match.matchedByAlternative && normalizeIngredientName(match.matchedByAlternative) !== normalizeIngredientName(ing.name))
      );
      const cleanAltName = isAlt ? cleanAlternativeText(match.matchedByAlternative || matchedPantry.name) : undefined;

      if (matchedPantry.isUnlimited || (matchedPantry.amount ?? 0) >= 9999) {
        return {
          ...ing,
          inStock: true,
          isAlternative: isAlt,
          matchedPantryName: cleanAltName,
          matchedPantryItemName: matchedPantry.name,
          ambiguousTag: ambTag,
          pantryText: "Vorhanden",
          statusColor: "#059669",
        };
      }

      // Check amount
      const reqAmountMatch = ing.amount.match(/^(\d+(?:[.,]\d+)?)/);
      const reqAmount = reqAmountMatch ? parseFloat(reqAmountMatch[1].replace(",", ".")) : 0;
      const currentStock = matchedPantry.amount ?? 0;
      const isSufficient = currentStock >= reqAmount || reqAmount === 0;

      const displayAmount = `${currentStock}${matchedPantry.unit || ""}`;

      return {
        ...ing,
        inStock: isSufficient,
        isAlternative: isAlt,
        matchedPantryName: cleanAltName,
        matchedPantryItemName: matchedPantry.name,
        ambiguousTag: ambTag,
        pantryText: isSufficient
          ? "Vorhanden"
          : currentStock > 0
            ? `${displayAmount} da`
            : "Fehlt",
        statusColor: isSufficient ? "#059669" : currentStock > 0 ? "#d97706" : "#e11d48",
      };
    });
  };

  return (
    <main className="screen saved-meals-screen">
      {/* Title Row */}
      <section className="title-row cook-title">
        <div>
          <p className="eyebrow">Kochbuch & Rezepte</p>
          <h1>{activeRecipe ? activeRecipe.title : "Dein Kochbuch"}</h1>
        </div>
        <div className="favorites-count-badge">
          <span>{savedRecipes.length}</span>
          <small>gemerkt</small>
        </div>
      </section>

      {/* Main Content: Empty State vs Master-Detail */}
      {savedRecipes.length === 0 ? (
        <div className="saved-meals-empty-card">
          <div className="empty-icon-circle">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
            </svg>
          </div>
          <h3>Noch keine Rezepte im Kochbuch</h3>
          <p>
            Wische im Entdecken-Tab nach rechts oder tippe auf Gemerkt, um Rezepte in deinem Kochbuch zu sammeln. Hier kannst du sie im 2-Spalten-Raster überblicken und kochen.
          </p>
          <button
            type="button"
            className="primary-button"
            onClick={onNavigateToDiscover}
            style={{ marginTop: "12px", width: "auto", padding: "0 22px", height: "42px" }}
          >
            <span>Rezepte im Swipe-Deck entdecken</span>
          </button>
        </div>
      ) : activeRecipe ? (
        /* DETAILANSICHT (Detail page with back button) */
        <>
          <div className="saved-detail-top-nav">
            <button
              type="button"
              className="saved-back-btn"
              onClick={() => setSelectedRecipeId(null)}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                <path d="M15 18l-6-6 6-6" />
              </svg>
              <span>Zurück zur Übersicht ({savedRecipes.length} Rezepte)</span>
            </button>
          </div>

          {/* Portion Selector */}
          <div className="saved-servings-bar">
            <div className="saved-servings-header">
              <div className="saved-servings-label">
                <span>Portionen für Kochen:</span>
                <strong>{servings} {servings === 1 ? "Person" : "Personen"}</strong>
              </div>
              <span className="saved-servings-badge">
                {servings}× Mengen skaliert
              </span>
            </div>
            <div className="saved-servings-control">
              {[1, 2, 3, 4, 5].map((count) => (
                <button
                  key={count}
                  type="button"
                  className={`segment-btn ${servings === count ? "active" : ""}`}
                  onClick={() => setServings(count)}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>

          <article className="saved-recipe-card">
            {/* Card Header & Visual */}
            <div className={`saved-card-hero ${activeRecipe.tone}`}>
              <div className="recipe-header-row saved-hero-meta-top">
                <div className="recipe-header-left">
                  {(() => {
                    const activeBreakdown = getRecipePantryBreakdown(activeRecipe, pantry || [], servings);
                    const category = getRecipeCategory(activeRecipe);
                    const matchText = activeBreakdown.matchPercentage === 100
                      ? "100% Vorrat da"
                      : `${activeBreakdown.matchPercentage}% Match`;
                    return (
                      <span
                        className="saved-match-pill"
                        style={{
                          fontSize: "11.5px",
                          fontWeight: 700,
                          background: "#ebf3ee",
                          color: "#2d5a3e",
                          border: "1px solid #c6dcce",
                          padding: "5px 11px",
                          borderRadius: "8px",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "5px",
                        }}
                      >
                        {category} {matchText}
                      </span>
                    );
                  })()}
                </div>
                <div className="recipe-header-right">
                  <button
                    type="button"
                    className="action-btn saved-edit-btn"
                    title="Rezept & Zutaten anpassen"
                    onClick={() => setIsEditModalOpen(true)}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                    </svg>
                    <span>Anpassen</span>
                  </button>
                  <button
                    type="button"
                    className="action-btn saved-unbookmark-btn"
                    title="Aus gemerkten Mahlzeiten entfernen"
                    onClick={() => {
                      onToggleFavorite(activeRecipe.id, activeRecipe.title);
                      setSelectedRecipeId(null);
                    }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="#059669" stroke="#059669" strokeWidth="2">
                      <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
                    </svg>
                    <span>Gemerkt</span>
                  </button>
                </div>
              </div>

              <div style={{ width: "100%", height: "185px", borderRadius: "16px", overflow: "hidden", margin: "14px 0 8px", background: "#f1f5f9", position: "relative" }}>
                <img
                  src={activeRecipe.imageUrl || resolveRecipeFoodImage(activeRecipe.title, activeRecipe.subtitle)}
                  alt={activeRecipe.title}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = resolveRecipeFoodImage(activeRecipe.title);
                  }}
                />
                <label
                  style={{
                    position: "absolute",
                    bottom: "10px",
                    right: "10px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "6px 12px",
                    background: "rgba(15, 23, 42, 0.78)",
                    backdropFilter: "blur(6px)",
                    color: "#ffffff",
                    borderRadius: "10px",
                    fontSize: "11px",
                    fontWeight: 700,
                    cursor: "pointer",
                    border: "1px solid rgba(255, 255, 255, 0.25)",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
                    transition: "all 150ms ease",
                  }}
                  title="Eigenes Foto aufnehmen oder hochladen"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                  <span>Foto wählen / aufnehmen</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCoverPhotoUpload}
                    style={{ display: "none" }}
                  />
                </label>
              </div>

              <div className="saved-hero-title-group">
                <h2>{activeRecipe.title}</h2>
                <p>{activeRecipe.subtitle}</p>
              </div>

              {/* Key stats */}
              <div className="saved-hero-stats-row">
                <div className="stat-box">
                  <small>Dauer</small>
                  <strong>{activeRecipe.time}</strong>
                </div>
                <div className="stat-box">
                  <small>Kalorien</small>
                  <strong>{Math.round(activeRecipe.baseCal)} kcal</strong>
                </div>
                <div className="stat-box">
                  <small>Kosten ca.</small>
                  <strong>{(activeRecipe.baseCost * servings).toFixed(2).replace(".", ",")} €</strong>
                </div>
                <div className="stat-box">
                  <small>Schwierigkeit</small>
                  <strong>{activeRecipe.difficulty}</strong>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="saved-card-body">
              {cookedRecipeTitles[activeRecipe.id] ? (
                <div
                  className="cooked-status-banner"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <strong>Dieses Gericht wurde gekocht!</strong>
                    <p>Vorräte für {servings} Pers. wurden erfolgreich abgebucht.</p>
                  </div>
                  <label
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      background: "#059669",
                      color: "#ffffff",
                      padding: "8px 14px",
                      borderRadius: "10px",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                      boxShadow: "0 2px 8px rgba(5, 150, 105, 0.3)",
                      whiteSpace: "nowrap",
                    }}
                    title="Foto von deinem gekochten Gericht als Cover speichern"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                    <span>Foto vom Essen als Cover</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleCoverPhotoUpload}
                      style={{ display: "none" }}
                    />
                  </label>
                </div>
              ) : null}

              {/* 1. Beschreibung: Was es ist */}
              <section className="saved-section-block recipe-desc-block">
                <div className="section-block-title">
                  <h3>Beschreibung</h3>
                </div>
                <div className="recipe-desc-content">
                  <p className="recipe-desc-text" style={{ fontSize: "13px", lineHeight: "1.5", color: "#334155", margin: "0 0 6px" }}>
                    <strong>{activeRecipe.title}</strong> – {activeRecipe.subtitle}.
                  </p>
                  {activeRecipe.chefTip && (
                    <div className="chef-tip-box" style={{ marginTop: "10px" }}>
                      <div>
                        <strong>Zubereitungs-Tipp</strong>
                        <p>{activeRecipe.chefTip}</p>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* Toggle to collapse/expand everything after description */}
              <div className="recipe-details-toggle-bar">
                <button
                  type="button"
                  className="recipe-details-toggle-btn"
                  onClick={() => setIsDetailsCollapsed(!isDetailsCollapsed)}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.2">
                      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                    </svg>
                    <strong>
                      {isDetailsCollapsed
                        ? "Zutaten & Koch-Modus einblenden"
                        : "Zutaten & Koch-Modus einklappen"}
                    </strong>
                    <small style={{ color: "#64748b", marginLeft: "4px" }}>
                      ({checkIngredientStock(activeRecipe, servings).length} Zutaten · {getSafeSteps(activeRecipe).length} Schritte)
                    </small>
                  </div>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    style={{
                      transform: isDetailsCollapsed ? "rotate(0deg)" : "rotate(180deg)",
                      transition: "transform 180ms ease",
                    }}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
              </div>

              {/* Collapsible Content: Ingredients + Interactive Cooking */}
              {!isDetailsCollapsed && (
                <>
                  {/* 2. Zutaten & Vorrats-Abgleich */}
                  <section className="saved-section-block">
                    <div className="section-block-title" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <h3>Zutaten ({servings} {servings === 1 ? "Person" : "Personen"})</h3>
                      <button
                        type="button"
                        onClick={() => setIsEditModalOpen(true)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          fontSize: "11px",
                          fontWeight: 600,
                          color: "#059669",
                          background: "#ecfdf5",
                          border: "1px solid #a7f3d0",
                          borderRadius: "8px",
                          padding: "3px 8px",
                          cursor: "pointer",
                        }}
                        title="Zutaten hinzufügen oder Mengen anpassen"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                        </svg>
                        <span>Zutat hinzufügen / bearbeiten</span>
                      </button>
                    </div>

                    <div className="ingredients-check-grid">
                      {checkIngredientStock(activeRecipe, servings).map((ing, idx) => {
                        const showAltSubline = shouldShowAlternativeHint(ing.name, ing.matchedPantryName);
                        return (
                          <div key={idx} className="ing-check-row" style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px", width: "100%" }}>
                              <div className="ing-name-wrap" style={{ display: "flex", alignItems: "center", gap: "6px", flex: 1, minWidth: 0, flexWrap: "wrap" }}>
                                <span
                                  className="status-dot"
                                  style={{ backgroundColor: ing.statusColor, flexShrink: 0 }}
                                />
                                <span className="ing-name" style={{ whiteSpace: "normal", wordBreak: "break-word" }} title={ing.name}>
                                  {ing.name}
                                </span>
                                {ing.ambiguousTag && (
                                  <span
                                    style={{
                                      fontSize: "9px",
                                      fontWeight: 750,
                                      padding: "1px 5px",
                                      borderRadius: "4px",
                                      background: ing.ambiguousTag === "Gemüse" ? "#ecfdf5" : "#fef3c7",
                                      color: ing.ambiguousTag === "Gemüse" ? "#065f46" : "#92400e",
                                      border: `1px solid ${ing.ambiguousTag === "Gemüse" ? "#a7f3d0" : "#fde68a"}`,
                                    }}
                                  >
                                    {ing.ambiguousTag}
                                  </span>
                                )}
                                {ing.optional && <span className="optional-badge">opt.</span>}
                              </div>

                              <div className="ing-amounts" style={{ flexShrink: 0, textAlign: "right" }}>
                                <strong className="needed-amount">{ing.amount}</strong>
                                <span className="stock-info" style={{ color: ing.statusColor, marginLeft: "6px" }}>
                                  {ing.pantryText}
                                </span>
                              </div>
                            </div>

                            {/* Clickable Alternative Pill / Choose from pantry button */}
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", paddingLeft: "14px" }}>
                              {ing.matchedPantryName ? (
                                <button
                                  type="button"
                                  onClick={() => setSelectedAltIng({ name: ing.name, amount: ing.amount, currentMatch: ing.matchedPantryName })}
                                  style={{
                                    background: "#ecfdf5",
                                    border: "1px solid #a7f3d0",
                                    color: "#047857",
                                    borderRadius: "6px",
                                    padding: "2px 8px",
                                    fontSize: "10.5px",
                                    fontWeight: 700,
                                    cursor: "pointer",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "4px",
                                  }}
                                  title="Alternative ändern oder verwalten"
                                >
                                  <span>⇄ Aus Vorrat: {ing.matchedPantryName} ✎</span>
                                </button>
                              ) : !ing.inStock ? (
                                <button
                                  type="button"
                                  onClick={() => setSelectedAltIng({ name: ing.name, amount: ing.amount, currentMatch: undefined })}
                                  style={{
                                    background: "#ffffff",
                                    border: "1px dashed #f43f5e",
                                    color: "#e11d48",
                                    borderRadius: "6px",
                                    padding: "2px 8px",
                                    fontSize: "10px",
                                    fontWeight: 700,
                                    cursor: "pointer",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "4px",
                                  }}
                                  title="Aus eigenem Vorrat wählen"
                                >
                                  <span>⇄ Aus Vorrat wählen</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setSelectedAltIng({ name: ing.name, amount: ing.amount, currentMatch: ing.matchedPantryItemName || ing.name })}
                                  style={{
                                    background: "#f8fafc",
                                    border: "1px dashed #cbd5e1",
                                    color: "#64748b",
                                    borderRadius: "6px",
                                    padding: "2px 6px",
                                    fontSize: "9.5px",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "3px",
                                  }}
                                  title="Andere Zutat aus Vorrat zuweisen"
                                >
                                  <span>⇄ Alternative wählen</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>

                  {/* 3. Interaktiver Koch-Modus */}
                  {(() => {
                    const safeSteps = getSafeSteps(activeRecipe);
                    return (
                      <section className="saved-section-block interactive-cooking-section">
                        <div className="section-block-title">
                          <h3>Interaktiver Koch-Modus</h3>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveModalRecipe(activeRecipe);
                                setOpenAskDirectly(true);
                              }}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                background: "#fffbeb",
                                border: "1px solid #fde68a",
                                color: "#b45309",
                                padding: "3px 9px",
                                borderRadius: "99px",
                                fontSize: "11px",
                                fontWeight: 750,
                                cursor: "pointer",
                                transition: "all 150ms ease",
                                whiteSpace: "nowrap",
                                flexShrink: 0,
                              }}
                              title="KI-Küchenchef fragen"
                            >
                              <span style={{ color: "#d97706", fontSize: "12px" }}>★</span>
                              <span>Frage zum Rezept</span>
                            </button>
                            <span className="step-counter-pill">
                              {Object.values(completedSteps[activeRecipe.id] || {}).filter(Boolean).length} / {safeSteps.length} erledigt
                            </span>
                          </div>
                        </div>

                        <div className="saved-steps-list">
                          {safeSteps.map((step) => {
                            const isDone = !!completedSteps[activeRecipe.id]?.[step.stepNumber];
                            return (
                              <div
                                key={step.stepNumber}
                                className={`step-item ${isDone ? "done" : ""}`}
                                onClick={() => toggleStep(activeRecipe.id, step.stepNumber)}
                              >
                                <div className={`step-check-circle ${isDone ? "checked" : ""}`}>
                                  <span>{isDone ? "✓" : step.stepNumber}</span>
                                </div>
                                <div className="step-text-wrap">
                                  <div className="step-header-line">
                                    <strong>{step.title}</strong>
                                    {step.duration && (
                                      <span className="step-time-pill">{step.duration}</span>
                                    )}
                                  </div>
                                  <p>{step.instruction}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* PRIMARY ACTION BAR: Interaktiver Koch-Modus Modal */}
                        <div className="saved-actions-footer" style={{ marginTop: "14px" }}>
                          <button
                            type="button"
                            className="primary-button cook-cta-button"
                            onClick={() => setActiveModalRecipe(activeRecipe)}
                            style={{ width: "100%", justifyContent: "center", gap: "8px" }}
                          >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
                              <circle cx="12" cy="12" r="10" />
                              <polyline points="12 6 12 12 16 14" />
                            </svg>
                            <span>Interaktiver Koch-Modus starten</span>
                          </button>
                          {Boolean(activeRecipe.sourceUrl) && (
                            <div style={{ marginTop: "14px", textAlign: "center" }}>
                              <a
                                href={activeRecipe.sourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  fontSize: "12px",
                                  color: "#64748b",
                                  textDecoration: "none",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  padding: "4px 8px",
                                }}
                              >
                                <span>Original-Quelle öffnen ↗</span>
                              </a>
                            </div>
                          )}
                        </div>
                      </section>
                    );
                  })()}
                </>
              )}
            </div>
          </article>
        </>
      ) : (
        /* MASTER VIEW: 2-SPALTIGES GRID ALLER GEMERKTEN REZEPTE */
        <>
          <div className="saved-workflow-banner">
            <div className="saved-workflow-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.2">
                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
              </svg>
            </div>
            <div className="saved-workflow-text">
              <strong>Deine Rezept-Sammlung</strong>
              <p>
                Wähle ein Gericht aus deinem 2-Spalten-Raster aus, um die Details, Zutaten und den Koch-Modus zu öffnen.
              </p>
            </div>
          </div>

          {/* Category Filter Dropdown */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "14px",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontSize: "13px", color: "#64748b", fontWeight: 600 }}>
              {displayedSavedRecipes.length} von {savedRecipes.length} Rezepten
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <label htmlFor="saved-category-select" style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>
                Kategorie:
              </label>
              <select
                id="saved-category-select"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as any)}
                style={{
                  padding: "6px 12px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  fontSize: "13px",
                  fontWeight: 600,
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
            </div>
          </div>

          {displayedSavedRecipes.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "36px 20px",
                background: "#f8fafc",
                borderRadius: "16px",
                border: "1.5px dashed #cbd5e1",
                margin: "8px 0 24px",
              }}
            >
              <p style={{ fontSize: "14px", fontWeight: 650, color: "#334155", marginBottom: "6px" }}>
                Keine Rezepte in der Kategorie «{selectedCategory}» gefunden
              </p>
              <p style={{ fontSize: "12px", color: "#64748b", marginBottom: "14px" }}>
                Wähle eine andere Kategorie oder setze den Filter zurück.
              </p>
              <button
                type="button"
                onClick={() => setSelectedCategory("Alle")}
                style={{
                  padding: "8px 18px",
                  borderRadius: "10px",
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
            <div className="saved-meals-grid">
              {displayedSavedRecipes.map((recipe) => {
                const timesCooked = cookedRecipeTitles[recipe.id] || 0;
                const imgUrl = recipe.imageUrl || resolveRecipeFoodImage(recipe.title, recipe.subtitle);
                const recipeCategory = getRecipeCategory(recipe);
                return (
                  <div
                    key={recipe.id}
                    className="saved-grid-card"
                    onClick={() => setSelectedRecipeId(recipe.id)}
                  >
                    <div className="saved-grid-thumb-wrap">
                      <img
                        src={imgUrl}
                        alt={recipe.title}
                        className="saved-grid-thumb-img"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = resolveRecipeFoodImage(recipe.title);
                        }}
                      />
                      <span className="saved-grid-match-badge">
                        {(() => {
                          const cardBreakdown = getRecipePantryBreakdown(recipe, pantry || [], servings);
                          return cardBreakdown.matchPercentage === 100
                            ? "100% Vorrat"
                            : `${cardBreakdown.matchPercentage}% Match`;
                        })()}
                      </span>
                      {timesCooked > 0 && (
                        <span className="saved-grid-cooked-badge">Gekocht ✓</span>
                      )}
                      <button
                        type="button"
                        className="saved-grid-unbookmark-btn"
                        title="Aus Kochbuch entfernen"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavorite(recipe.id, recipe.title);
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="#059669" stroke="#059669" strokeWidth="2">
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
          )}
        </>
      )}

      {/* Cooking Modal for Interactive Cook with Timers */}
      {Boolean(activeModalRecipe) && (
        <Suspense fallback={null}>
          <CookingModal
            recipe={activeModalRecipe}
            isOpen={Boolean(activeModalRecipe)}
            onClose={() => {
              setActiveModalRecipe(null);
              setOpenAskDirectly(false);
            }}
            onCook={onCook}
            initialServings={servings}
            pantry={pantry}
            initialOpenAsk={openAskDirectly}
          />
        </Suspense>
      )}

      {/* Edit Recipe Modal */}
      <EditRecipeModal
        isOpen={isEditModalOpen}
        recipe={activeRecipe}
        onClose={() => setIsEditModalOpen(false)}
        onSave={(updated: CatalogRecipe) => {
          if (onUpdateRecipe) {
            onUpdateRecipe(updated);
          }
          if (onNotify) {
            onNotify(`«${updated.title}» erfolgreich aktualisiert!`);
          }
        }}
      />

      {/* Alternative Ingredient Manager Modal */}
      <AlternativeManageModal
        isOpen={Boolean(selectedAltIng)}
        onClose={() => setSelectedAltIng(null)}
        recipe={activeRecipe || undefined}
        recipeId={activeRecipe?.id}
        recipeTitle={activeRecipe?.title}
        ingredientName={selectedAltIng?.name || ""}
        amount={selectedAltIng?.amount}
        currentMatchedPantryName={selectedAltIng?.currentMatch}
        pantryItems={pantry || []}
        onChanged={() => {
          if (onNotify && selectedAltIng?.name) {
            onNotify(`Alternative für «${selectedAltIng.name}» aktualisiert!`);
          }
        }}
      />
    </main>
  );
}
