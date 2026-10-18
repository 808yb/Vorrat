import React, { useState, useEffect } from "react";
import { FULL_RECIPE_CATALOG, type CatalogRecipe } from "../data/recipeCatalog";
import { type PantryItem } from "../App";
import { CookingModal } from "./CookingModal";
import { getSafeIngredientsList, getSafeSteps } from "../utils/recipeHelpers";

import { type WeekdayId, WEEKDAYS } from "./WeeklyMealPlannerScreen";

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
  onNotify,
}: SavedMealsScreenProps) {
  const catalog = recipes || FULL_RECIPE_CATALOG;
  const [servings, setServings] = useState(initialServings || 2);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(initialRecipeId || null);
  const [completedSteps, setCompletedSteps] = useState<Record<string, Record<number, boolean>>>({});
  const [activeModalRecipe, setActiveModalRecipe] = useState<CatalogRecipe | null>(null);
  const [cookedRecipeTitles, setCookedRecipeTitles] = useState<Record<string, number>>({});

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

  // If a selected recipe is no longer in favorites, reset
  const activeRecipe =
    savedRecipes.find((r) => r.id === selectedRecipeId) || savedRecipes[0] || null;

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

  // Helper to check stock status of ingredients for a recipe
  const checkIngredientStock = (recipe: CatalogRecipe, s: number) => {
    const list = typeof recipe?.ingredientsList === "function"
      ? recipe.ingredientsList(s)
      : getSafeIngredientsList(recipe, s);
    return list.map((ing) => {
      const ingLower = ing.name.toLowerCase();

      // Water is always unlimited
      if (ingLower.includes("wasser") || ingLower.includes("water") || ingLower.includes("leitung")) {
        return {
          ...ing,
          inStock: true,
          pantryText: "∞ Immer vorrätig (Leitung)",
          statusColor: "#059669",
        };
      }

      const matchedPantry = pantry.find((p) => {
        const pLower = p.name.toLowerCase();
        return (
          pLower.includes(ingLower) ||
          ingLower.includes(pLower) ||
          (ingLower.includes("reis") && pLower.includes("reis")) ||
          (ingLower.includes("eier") && pLower.includes("ei")) ||
          (ingLower.includes("soja") && pLower.includes("soja")) ||
          (ingLower.includes("erbsen") && pLower.includes("erbse")) ||
          (ingLower.includes("hähnchen") && pLower.includes("hähnchen")) ||
          (ingLower.includes("zwiebel") && pLower.includes("zwiebel"))
        );
      });

      if (!matchedPantry) {
        return {
          ...ing,
          inStock: !ing.optional ? false : true,
          pantryText: ing.optional ? "Optional" : "Nicht im Vorrat",
          statusColor: ing.optional ? "#64748b" : "#e11d48",
        };
      }

      // Check amount
      const reqAmountMatch = ing.amount.match(/^(\d+)/);
      const reqAmount = reqAmountMatch ? parseInt(reqAmountMatch[1], 10) : 0;
      const isSufficient = matchedPantry.amount >= reqAmount;

      return {
        ...ing,
        inStock: isSufficient,
        pantryText: `${matchedPantry.amount}${matchedPantry.unit} vorhanden`,
        statusColor: isSufficient ? "#059669" : "#d97706",
      };
    });
  };

  return (
    <main className="screen saved-meals-screen">
      {/* Title Row */}
      <section className="title-row cook-title">
        <div>
          <p className="eyebrow">Küche & Zubereitung</p>
          <h1>Gemerkte Mahlzeiten</h1>
        </div>
        <div className="favorites-count-badge">
          <span>{savedRecipes.length}</span>
          <small>gemerkt</small>
        </div>
      </section>

      {/* Subtitle / Workflow explanation banner */}
      <div className="saved-workflow-banner">
        <div className="saved-workflow-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.2">
            <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
          </svg>
        </div>
        <div className="saved-workflow-text">
          <strong>Deine gemerkten Gerichte zum Kochen</strong>
          <p>
            Wähle ein Gericht aus, folge der Schritt-für-Schritt Anleitung und koche es. Beim Kochen wird dein Vorrat direkt aktualisiert.
          </p>
        </div>
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

      {/* Main Content: Empty State vs Recipe Cards */}
      {savedRecipes.length === 0 ? (
        <div className="saved-meals-empty-card">
          <div className="empty-icon-circle">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2">
              <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
            </svg>
          </div>
          <h3>Noch keine Mahlzeiten gemerkt</h3>
          <p>
            Wische im Entdecken-Tab nach rechts oder tippe auf Merken, um passende Mahlzeiten zu speichern. Sie erscheinen dann hier mit Anleitung & Zutatenabbuchung.
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
      ) : (
        <>
          {/* Dish Tab Bar if multiple saved meals */}
          {savedRecipes.length > 1 && (
            <div className="saved-meals-tab-bar hide-scrollbar">
              {savedRecipes.map((recipe) => {
                const isSelected = activeRecipe?.id === recipe.id;
                const timesCooked = cookedRecipeTitles[recipe.id] || 0;
                return (
                  <button
                    key={recipe.id}
                    type="button"
                    className={`saved-tab-pill ${isSelected ? "active" : ""}`}
                    onClick={() => setSelectedRecipeId(recipe.id)}
                  >
                    <span>{recipe.title}</span>
                    {timesCooked > 0 && <span className="cooked-pill">Gekocht ✓</span>}
                  </button>
                );
              })}
            </div>
          )}

          {/* Active / Selected Recipe Detail Card */}
          {activeRecipe && (
            <article className="saved-recipe-card">
              {/* Card Header & Visual */}
              <div className={`saved-card-hero ${activeRecipe.tone}`}>
                <div className="saved-hero-meta-top">
                  <span className="saved-match-pill">98% Vorrats-Match</span>
                  <button
                    type="button"
                    className="saved-unbookmark-btn"
                    title="Aus gemerkten Mahlzeiten entfernen"
                    onClick={() => onToggleFavorite(activeRecipe.id, activeRecipe.title)}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="#059669" stroke="#059669" strokeWidth="2">
                      <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
                    </svg>
                    <span>Gemerkt</span>
                  </button>
                </div>

                {activeRecipe.imageUrl ? (
                  <div style={{ width: "100%", height: "160px", borderRadius: "16px", overflow: "hidden", margin: "14px 0 8px" }}>
                    <img
                      src={activeRecipe.imageUrl}
                      alt={activeRecipe.title}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      onError={(e) => { (e.currentTarget as HTMLElement).style.display = "none"; }}
                    />
                  </div>
                ) : (
                  <div className="plate" style={{ margin: "14px auto 8px" }}>
                    <span className="rice-grain one" />
                    <span className="rice-grain two" />
                    <span className="rice-grain three" />
                    <span className="yolk" />
                    <span className="green one" />
                    <span className="green two" />
                  </div>
                )}

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
                {/* Cooked Status notification */}
                {cookedRecipeTitles[activeRecipe.id] ? (
                  <div className="cooked-status-banner">
                    <div>
                      <strong>Dieses Gericht wurde gekocht!</strong>
                      <p>Vorräte für {servings} Pers. wurden erfolgreich abgebucht.</p>
                    </div>
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

                {/* 2. Zutaten & Vorrats-Abgleich */}
                <section className="saved-section-block">
                  <div className="section-block-title">
                    <h3>Zutaten ({servings} {servings === 1 ? "Person" : "Personen"})</h3>
                  </div>

                  <div className="ingredients-check-grid">
                    {checkIngredientStock(activeRecipe, servings).map((ing, idx) => (
                      <div key={idx} className="ing-check-row">
                        <div className="ing-name-wrap">
                          <span
                            className="status-dot"
                            style={{ backgroundColor: ing.statusColor }}
                          />
                          <span className="ing-name">{ing.name}</span>
                          {ing.optional && <span className="optional-badge">opt.</span>}
                        </div>
                        <div className="ing-amounts">
                          <strong className="needed-amount">{ing.amount}</strong>
                          <span className="stock-info" style={{ color: ing.statusColor }}>
                            ({ing.pantryText})
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* 3. Interaktiver Koch-Modus */}
                {(() => {
                  const safeSteps = getSafeSteps(activeRecipe);
                  return (
                    <section className="saved-section-block interactive-cooking-section">
                      <div className="section-block-title">
                        <h3>Interaktiver Koch-Modus</h3>
                        <span className="step-counter-pill">
                          {Object.values(completedSteps[activeRecipe.id] || {}).filter(Boolean).length} / {safeSteps.length} erledigt
                        </span>
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

                      {/* PRIMARY ACTION BAR: Interaktiver Koch-Modus */}
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
                          <span>Interaktiver Koch-Modus</span>
                        </button>
                      </div>
                    </section>
                  );
                })()}
              </div>
            </article>
          )}

          {/* Quick link to discover more */}
          <div className="discover-more-box">
            <span>Möchtest du weitere Vorschläge ansehen?</span>
            <button
              type="button"
              className="text-link-btn"
              onClick={onNavigateToDiscover}
            >
              Mehr Rezepte im Swipe-Deck entdecken →
            </button>
          </div>
        </>
      )}

      {/* Cooking Modal for Interactive Cook with Timers */}
      <CookingModal
        recipe={activeModalRecipe}
        isOpen={Boolean(activeModalRecipe)}
        onClose={() => setActiveModalRecipe(null)}
        onCook={onCook}
        initialServings={servings}
      />
    </main>
  );
}
