import React, { useState, useEffect } from "react";
import { FULL_RECIPE_CATALOG, type CatalogRecipe } from "../data/recipeCatalog";
import { type PantryItem } from "../App";
import { CookingModal } from "./CookingModal";
import { getSafeIngredientsList, getSafeSteps } from "../utils/recipeHelpers";
import { resolveRecipeFoodImage } from "../utils/geminiRecipes";
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
  const [openAskDirectly, setOpenAskDirectly] = useState<boolean>(false);
  const [cookedRecipeTitles, setCookedRecipeTitles] = useState<Record<string, number>>({});
  const [isDetailsCollapsed, setIsDetailsCollapsed] = useState<boolean>(false);

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

  // Helper to check stock status of ingredients for a recipe
  const checkIngredientStock = (recipe: CatalogRecipe, s: number) => {
    let list: Array<{ name: string; amount: string; optional?: boolean }> = [];
    if (typeof recipe?.ingredientsList === "function") {
      try {
        list = recipe.ingredientsList(s);
      } catch {}
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
          pantryText: "Immer vorrätig",
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
          pantryText: ing.optional ? "Optional" : "Fehlt im Vorrat",
          statusColor: ing.optional ? "#64748b" : "#e11d48",
        };
      }

      if (matchedPantry.isUnlimited || matchedPantry.amount >= 9999) {
        return {
          ...ing,
          inStock: true,
          pantryText: "Vorrätig",
          statusColor: "#059669",
        };
      }

      // Check amount
      const reqAmountMatch = ing.amount.match(/^(\d+)/);
      const reqAmount = reqAmountMatch ? parseInt(reqAmountMatch[1], 10) : 0;
      const isSufficient = matchedPantry.amount >= reqAmount;

      return {
        ...ing,
        inStock: isSufficient,
        pantryText: `${matchedPantry.amount}${matchedPantry.unit} vorrätig`,
        statusColor: isSufficient ? "#059669" : "#d97706",
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
              <div className="saved-hero-meta-top">
                <span className="saved-match-pill">{activeRecipe.matchScore ? `${activeRecipe.matchScore}% Match` : "98% Vorrats-Match"}</span>
                <button
                  type="button"
                  className="saved-unbookmark-btn"
                  title="Aus gemerkten Mahlzeiten entfernen"
                  onClick={() => {
                    onToggleFavorite(activeRecipe.id, activeRecipe.title);
                    setSelectedRecipeId(null);
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#059669" stroke="#059669" strokeWidth="2">
                    <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
                  </svg>
                  <span>Gemerkt</span>
                </button>
              </div>

              <div style={{ width: "100%", height: "175px", borderRadius: "16px", overflow: "hidden", margin: "14px 0 8px", background: "#f1f5f9" }}>
                <img
                  src={activeRecipe.imageUrl || resolveRecipeFoodImage(activeRecipe.title, activeRecipe.subtitle)}
                  alt={activeRecipe.title}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = resolveRecipeFoodImage(activeRecipe.title);
                  }}
                />
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
                            <span className="ing-name" title={ing.name}>{ing.name}</span>
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
                              }}
                              title="Ask about recipe"
                            >
                              <span style={{ color: "#d97706", fontSize: "12px" }}>★</span>
                              <span>Ask about recipe</span>
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

          <div className="saved-meals-grid">
            {savedRecipes.map((recipe) => {
              const timesCooked = cookedRecipeTitles[recipe.id] || 0;
              const imgUrl = recipe.imageUrl || resolveRecipeFoodImage(recipe.title, recipe.subtitle);
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
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = resolveRecipeFoodImage(recipe.title);
                      }}
                    />
                    <span className="saved-grid-match-badge">
                      {recipe.matchScore ? `${recipe.matchScore}% Match` : "98% Match"}
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
        </>
      )}

      {/* Cooking Modal for Interactive Cook with Timers */}
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
    </main>
  );
}
