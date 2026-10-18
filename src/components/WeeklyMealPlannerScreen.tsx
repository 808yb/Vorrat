import React, { useState, useMemo } from "react";
import { FULL_RECIPE_CATALOG, type CatalogRecipe } from "../data/recipeCatalog";
import { type PantryItem, type GroceryItem } from "../App";
import { ProductMark, getFoodTone } from "./FoodIcons";
import { getSafeIngredientsList } from "../utils/recipeHelpers";

export type WeekdayId = "mo" | "di" | "mi" | "do" | "fr" | "sa" | "so";

export interface PlannedMeal {
  id: string;
  recipeId: string;
  recipeTitle: string;
  dayId: WeekdayId;
  mealSlot?: "lunch" | "dinner" | "any";
  servings: number;
}

export const WEEKDAYS: { id: WeekdayId; name: string; short: string; note: string }[] = [
  { id: "mo", name: "Montag", short: "Mo", note: "Start in die Woche" },
  { id: "di", name: "Dienstag", short: "Di", note: "Meal-Prep & Quick" },
  { id: "mi", name: "Mittwoch", short: "Mi", note: "Wochenmitte" },
  { id: "do", name: "Donnerstag", short: "Do", note: "Vorrat aufbrauchen" },
  { id: "fr", name: "Freitag", short: "Fr", note: "Wochenend-Start" },
  { id: "sa", name: "Samstag", short: "Sa", note: "Genuss & Kochen" },
  { id: "so", name: "Sonntag", short: "So", note: "Familie & Vorbereitung" },
];

export interface AggregatedIngredient {
  name: string;
  cleanName: string;
  totalNeeded: number;
  unit: string;
  category: string;
  isOptional: boolean;
  recipes: string[];
  days: WeekdayId[];
  inStock: number;
  missingAmount: number;
  isCovered: boolean;
  estimatedPrice: number;
}

export interface WeeklyMealPlannerScreenProps {
  pantry: PantryItem[];
  favorites: string[];
  plannedMeals: PlannedMeal[];
  recipes?: CatalogRecipe[];
  onAddPlannedMeal: (meal: Omit<PlannedMeal, "id">) => void;
  onRemovePlannedMeal: (id: string) => void;
  onUpdateMealServings: (id: string, servings: number) => void;
  onMovePlannedMeal: (id: string, newDay: WeekdayId) => void;
  onClearPlan: () => void;
  onAutoPlanWeek: () => void;
  onCookMeal: (recipeTitle: string, servings: number) => void;
  onStartCookingMeal?: (recipeId: string, servings: number) => void;
  onSyncWeeklyShopping: (missingIngredients: GroceryItem[]) => void;
  onNavigateToShopping: () => void;
  onNavigateToSavedMeals: () => void;
  onNavigateToDiscover: () => void;
  onNotify?: (message: string) => void;
}

function DayMealThumb({ recipe }: { recipe: CatalogRecipe }) {
  const [imgError, setImgError] = useState(false);

  if (recipe.imageUrl && !imgError) {
    return (
      <img
        src={recipe.imageUrl}
        alt={recipe.title}
        className="day-col-img"
        loading="lazy"
        onError={() => setImgError(true)}
      />
    );
  }

  return <ProductMark tone={getFoodTone(recipe.title)} name={recipe.title} compact />;
}

export function WeeklyMealPlannerScreen({
  pantry,
  favorites,
  plannedMeals,
  recipes,
  onAddPlannedMeal,
  onRemovePlannedMeal,
  onUpdateMealServings,
  onMovePlannedMeal,
  onClearPlan,
  onAutoPlanWeek,
  onCookMeal,
  onStartCookingMeal,
  onSyncWeeklyShopping,
  onNavigateToShopping,
  onNavigateToSavedMeals,
  onNavigateToDiscover,
  onNotify,
}: WeeklyMealPlannerScreenProps) {
  const catalog = recipes || FULL_RECIPE_CATALOG;
  const [selectedDayFilter, setSelectedDayFilter] = useState<WeekdayId | "all">("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalTargetDay, setModalTargetDay] = useState<WeekdayId>("mo");
  const [modalSelectedRecipeId, setModalSelectedRecipeId] = useState<string>("");
  const [modalServings, setModalServings] = useState<number>(2);
  const [modalSlot, setModalSlot] = useState<"lunch" | "dinner" | "any">("dinner");
  const [ingredientFilter, setIngredientFilter] = useState<"all" | "missing" | "inStock">("all");
  const [syncedRecently, setSyncedRecently] = useState(false);
  const [isSavedRecipesDistributorOpen, setIsSavedRecipesDistributorOpen] = useState(false);

  // Dynamic calendar dates for the current week (Monday - Sunday)
  const weekDates = useMemo(() => {
    const now = new Date();
    const currentDay = now.getDay(); // 0 is Sunday, 1 is Monday...
    const distToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(now);
    monday.setDate(now.getDate() + distToMonday);

    const dates: Record<WeekdayId, number> = {
      mo: 0,
      di: 0,
      mi: 0,
      do: 0,
      fr: 0,
      sa: 0,
      so: 0,
    };

    WEEKDAYS.forEach((w, idx) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + idx);
      dates[w.id] = d.getDate();
    });

    return dates;
  }, []);

  // Saved / Favorited recipes from catalog
  const savedRecipes = useMemo(
    () => catalog.filter((r) => favorites.includes(r.id)),
    [catalog, favorites]
  );

  const isRecipePlannedOnDay = (recipeId: string, dayId: WeekdayId) => {
    return plannedMeals.some((m) => m.recipeId === recipeId && m.dayId === dayId);
  };

  const toggleRecipeOnDay = (recipe: CatalogRecipe, dayId: WeekdayId, defaultServings = 2) => {
    const existing = plannedMeals.find((m) => m.recipeId === recipe.id && m.dayId === dayId);
    if (existing) {
      onRemovePlannedMeal(existing.id);
      const dayName = WEEKDAYS.find((w) => w.id === dayId)?.name;
      onNotify?.(`«${recipe.title}» von ${dayName} entfernt`);
    } else {
      onAddPlannedMeal({
        recipeId: recipe.id,
        recipeTitle: recipe.title,
        dayId,
        servings: defaultServings,
        mealSlot: "dinner",
      });
      const dayName = WEEKDAYS.find((w) => w.id === dayId)?.name;
      onNotify?.(`«${recipe.title}» für ${dayName} eingeplant`);
    }
  };

  // Compute all ingredients needed across the planned meals and compare against pantry
  const aggregatedIngredients = useMemo<AggregatedIngredient[]>(() => {
    const map = new Map<string, {
      name: string;
      cleanName: string;
      totalNeeded: number;
      unit: string;
      category: string;
      isOptional: boolean;
      recipes: Set<string>;
      days: Set<WeekdayId>;
    }>();

    plannedMeals.forEach((planned) => {
      const recipe = catalog.find((r) => r.id === planned.recipeId);
      if (!recipe) return;

      const ingList = typeof recipe.ingredientsList === "function"
        ? recipe.ingredientsList(planned.servings)
        : getSafeIngredientsList(recipe, planned.servings);
      ingList.forEach((ing) => {
        // Clean name for grouping
        let cleanName = ing.name
          .replace(/\s*\([^)]*\)/g, "")
          .replace(/Bio\s+/i, "")
          .replace(/Kikkoman\s+/i, "")
          .trim();
        const lowerClean = cleanName.toLowerCase();

        // Standardize keys
        let groupKey = lowerClean;
        if (lowerClean.includes("reis")) groupKey = "reis";
        else if (lowerClean.includes("ei") || lowerClean.includes("eier")) groupKey = "eier";
        else if (lowerClean.includes("soja")) groupKey = "sojasauce";
        else if (lowerClean.includes("erbse")) groupKey = "erbsen";
        else if (lowerClean.includes("hähnchen")) groupKey = "hähnchenbrust";
        else if (lowerClean.includes("zwiebel")) groupKey = "frühlingszwiebeln";
        else if (lowerClean.includes("öl")) groupKey = "öl";
        else if (lowerClean.includes("ingwer")) groupKey = "ingwer";
        else if (lowerClean.includes("knoblauch")) groupKey = "knoblauch";

        // Parse amount and unit
        const match = ing.amount.match(/^(\d+(?:[.,]\d+)?)\s*(g|kg|ml|l|stk\.?|bund|el|tl)?/i);
        let amount = match ? parseFloat(match[1].replace(",", ".")) : 1;
        let unit = match && match[2] ? match[2].toLowerCase() : "g";
        if (unit.startsWith("stk")) unit = "Stk.";

        // Determine category
        let category = "Trockenvorrat";
        if (lowerClean.includes("ei") || lowerClean.includes("hähnchen") || lowerClean.includes("fleisch")) {
          category = "Kühl & Tiefkühl";
        } else if (lowerClean.includes("erbse") || lowerClean.includes("spinat")) {
          category = "Kühl & Tiefkühl";
        } else if (lowerClean.includes("zwiebel") || lowerClean.includes("ingwer") || lowerClean.includes("knoblauch") || lowerClean.includes("limette") || lowerClean.includes("gemüse")) {
          category = "Obst & Gemüse";
        } else if (lowerClean.includes("soja") || lowerClean.includes("sauce") || lowerClean.includes("öl") || lowerClean.includes("gewürz")) {
          category = "Saucen & Gewürze";
        }

        const existing = map.get(groupKey);
        if (existing) {
          existing.totalNeeded += amount;
          existing.recipes.add(recipe.title);
          existing.days.add(planned.dayId);
          if (!ing.optional) existing.isOptional = false;
        } else {
          map.set(groupKey, {
            name: ing.name,
            cleanName,
            totalNeeded: amount,
            unit,
            category,
            isOptional: !!ing.optional,
            recipes: new Set([recipe.title]),
            days: new Set([planned.dayId]),
          });
        }
      });
    });

    const result: AggregatedIngredient[] = [];
    map.forEach((item, key) => {
      // Find matching item in user's pantry
      const pantryMatch = pantry.find((p) => {
        const pLower = p.name.toLowerCase();
        return (
          pLower.includes(key) ||
          key.includes(pLower) ||
          (key === "reis" && pLower.includes("reis")) ||
          (key === "eier" && pLower.includes("ei")) ||
          (key === "sojasauce" && pLower.includes("soja")) ||
          (key === "erbsen" && pLower.includes("erbse")) ||
          (key === "hähnchenbrust" && pLower.includes("hähnchen")) ||
          (key === "frühlingszwiebeln" && pLower.includes("zwiebel"))
        );
      });

      const isWater = key.includes("wasser") || key.includes("water") || key.includes("leitung");
      const isUnlimited = isWater || Boolean(pantryMatch?.isUnlimited) || (pantryMatch ? pantryMatch.amount >= 99999 : false);
      const inStock = isUnlimited ? 999999 : (pantryMatch ? pantryMatch.amount : 0);
      const missingAmount = isUnlimited ? 0 : Math.max(0, item.totalNeeded - inStock);
      const isCovered = isUnlimited || missingAmount <= 0;

      // Estimate price for missing portion
      let price = 0;
      if (missingAmount > 0 && !isUnlimited) {
        if (key === "eier") price = Math.ceil(missingAmount / 10) * 3.29;
        else if (key === "reis") price = 2.49;
        else if (key === "hähnchenbrust") price = Math.max(3.99, (missingAmount / 1000) * 12.5);
        else if (key === "erbsen") price = 2.19;
        else if (key === "frühlingszwiebeln") price = 1.19;
        else if (key === "sojasauce") price = 2.49;
        else price = 1.99;
      }

      result.push({
        name: item.name,
        cleanName: item.cleanName,
        totalNeeded: item.totalNeeded,
        unit: item.unit,
        category: item.category,
        isOptional: item.isOptional,
        recipes: Array.from(item.recipes),
        days: Array.from(item.days),
        inStock,
        missingAmount,
        isCovered,
        estimatedPrice: Math.round(price * 100) / 100,
      });
    });

    // Sort: missing first, then covered
    return result.sort((a, b) => (a.isCovered === b.isCovered ? 0 : a.isCovered ? 1 : -1));
  }, [plannedMeals, pantry]);

  // Overall weekly metrics
  const totalMealsCount = plannedMeals.length;
  const missingIngredientsCount = aggregatedIngredients.filter((i) => !i.isCovered && !i.isOptional).length;
  const totalWeeklyEstimatedCost = aggregatedIngredients.reduce(
    (sum, i) => sum + (!i.isCovered ? i.estimatedPrice : 0),
    0
  );
  const totalPortionsPlanned = plannedMeals.reduce((sum, m) => sum + m.servings, 0);

  // Sync missing ingredients to Grocery list
  const handleSyncToGroceries = () => {
    const missing = aggregatedIngredients.filter((i) => !i.isCovered && !i.isOptional);
    if (missing.length === 0) {
      if (onNotify) onNotify("Alles bereits im Vorrat vorhanden! Kein Einkauf nötig");
      return;
    }

    const newGroceries: GroceryItem[] = missing.map((ing) => {
      const dayLabels = ing.days.map((d) => WEEKDAYS.find((w) => w.id === d)?.short).join(", ");
      return {
        id: Date.now() + Math.random(),
        name: ing.cleanName,
        quantity: `${ing.missingAmount} ${ing.unit}`,
        price: `${ing.estimatedPrice.toFixed(2).replace(".", ",")} €`,
        category: ing.category,
        reason: `Bedarf Wochenplaner (${dayLabels})`,
      };
    });

    onSyncWeeklyShopping(newGroceries);
    setSyncedRecently(true);
    setTimeout(() => setSyncedRecently(false), 4000);

    if (onNotify) {
      onNotify(`${newGroceries.length} Artikel für den Wocheneinkauf übernommen`);
    }
  };

  const openAddModalForDay = (day: WeekdayId) => {
    setModalTargetDay(day);
    // Pick first favorite or first catalog recipe as default
    setModalSelectedRecipeId(favorites[0] || (catalog[0] ? catalog[0].id : ""));
    setModalServings(2);
    setModalSlot("dinner");
    setIsAddModalOpen(true);
  };

  const handleConfirmAddMeal = () => {
    if (!modalSelectedRecipeId) return;
    const recipe = catalog.find((r) => r.id === modalSelectedRecipeId);
    if (!recipe) return;

    onAddPlannedMeal({
      recipeId: recipe.id,
      recipeTitle: recipe.title,
      dayId: modalTargetDay,
      mealSlot: modalSlot,
      servings: modalServings,
    });

    setIsAddModalOpen(false);
    if (onNotify) {
      const dayName = WEEKDAYS.find((w) => w.id === modalTargetDay)?.name;
      onNotify(`«${recipe.title}» für ${dayName} eingeplant`);
    }
  };

  const filteredDays = selectedDayFilter === "all"
    ? WEEKDAYS
    : WEEKDAYS.filter((d) => d.id === selectedDayFilter);

  return (
    <main className="screen weekly-planner-screen">
      {/* Title Row */}
      <section className="title-row planner-title-row">
        <div>
          <p className="eyebrow">Wochenplanung & Vorrat</p>
          <h1>Wochen-Planer</h1>
        </div>
        <div className="planner-badge-wrap">
          <span className="planned-count-badge">
            <b>{totalMealsCount}</b>
            <small>Mahlzeiten</small>
          </span>
        </div>
      </section>

      {/* Hero Overview Card: Plan Summary & Gemerkte Rezepte Verteiler */}
      <section className="planner-hero-card">
        <div className="planner-hero-top">
          <div className="planner-hero-stats">
            <span className="hero-tag">Wochenübersicht</span>
            <div className="hero-stat-main">
              <strong>{totalMealsCount} {totalMealsCount === 1 ? "Mahlzeit" : "Mahlzeiten"}</strong>
              <small>{totalPortionsPlanned} Portionen geplant</small>
            </div>
            <p className="hero-stat-sub">
              {missingIngredientsCount > 0
                ? `${missingIngredientsCount} Zutaten fehlen im Vorrat · ${totalWeeklyEstimatedCost.toFixed(2).replace(".", ",")} € geschätzt`
                : "Vorrat deckt alle geplanten Mahlzeiten ab"}
            </p>
          </div>

          <div className="planner-hero-actions">
            <button
              type="button"
              className="primary-button open-distributor-btn"
              onClick={() => setIsSavedRecipesDistributorOpen(true)}
              title="Gemerkte Rezepte flexibel den Wochentagen zuweisen"
            >
              <span className="distributor-btn-title">Gemerkte Rezepte →</span>
              <small className="distributor-btn-sub">
                {savedRecipes.length} gemerkt · Auf Wochentage aufteilen
              </small>
            </button>
          </div>
        </div>

        {/* Quick Toolbar: Auto-Plan, Einkauf sync & Clear */}
        <div className="planner-quick-toolbar">
          <button
            type="button"
            className="planner-tool-btn"
            onClick={onAutoPlanWeek}
            title="Verteilt deine gemerkten Mahlzeiten automatisch auf die Woche"
          >
            <span>Auto-Plan</span>
          </button>

          <button
            type="button"
            className={`planner-tool-btn ${syncedRecently ? "synced-success" : ""}`}
            onClick={handleSyncToGroceries}
            title="Fehlende Zutaten auf die Einkaufsliste übertragen"
          >
            <span>{syncedRecently ? "Übertragen" : `${missingIngredientsCount} Zutaten zum Einkauf`}</span>
          </button>

          {totalMealsCount > 0 && (
            <button
              type="button"
              className="planner-tool-btn secondary"
              onClick={onClearPlan}
              title="Alle Tage zurücksetzen"
            >
              <span>Plan leeren</span>
            </button>
          )}

          <button
            type="button"
            className="planner-tool-btn link-style"
            onClick={onNavigateToShopping}
          >
            <span>Zur Einkaufsliste →</span>
          </button>
        </div>
      </section>

      {/* Meal Plan Strip Card (Reference Layout with Photos & Names per Day) */}
      <section className="meal-plan-card">
        <div className="meal-plan-card-header">
          <div className="meal-plan-header-left">
            <div className="meal-plan-calendar-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <div>
              <div className="meal-plan-title-line">
                <h3>Wochenplan</h3>
                <span className="meal-plan-count-tag">{totalMealsCount} geplant</span>
              </div>
              <p>Geplante Mahlzeiten dieser Woche</p>
            </div>
          </div>

          <button
            type="button"
            className="meal-plan-view-toggle"
            onClick={() => setSelectedDayFilter((prev) => (prev === "all" ? "mo" : "all"))}
            title={selectedDayFilter === "all" ? "Tagesansicht fokussieren" : "Alle Tage anzeigen"}
          >
            <span>{selectedDayFilter === "all" ? "Alle 7 Tage" : "Alle Tage anzeigen →"}</span>
          </button>
        </div>

        {/* 7 Days Row: Mon - Sun with Day, Date, Food Thumbnail & Meal Name */}
        <div className="meal-plan-days-row hide-scrollbar">
          {WEEKDAYS.map((day) => {
            const dayMeals = plannedMeals.filter((m) => m.dayId === day.id);
            const hasMeals = dayMeals.length > 0;
            const primaryMeal = dayMeals[0];
            const recipe = primaryMeal ? catalog.find((r) => r.id === primaryMeal.recipeId) : null;
            const isSelected = selectedDayFilter === day.id;
            const dateNum = weekDates[day.id];

            return (
              <button
                key={day.id}
                type="button"
                className={`meal-plan-day-col ${isSelected ? "active" : ""} ${hasMeals ? "has-meal" : "empty"}`}
                onClick={() => {
                  if (isSelected) {
                    setSelectedDayFilter("all");
                  } else {
                    setSelectedDayFilter(day.id);
                  }
                }}
                title={
                  hasMeals
                    ? `${day.name}: ${dayMeals.map((m) => m.recipeTitle).join(", ")}`
                    : `${day.name}: Noch kein Gericht geplant (+ Tippen zum Planen)`
                }
              >
                <span className="day-col-short">{day.short}</span>
                <span className="day-col-date">{dateNum}</span>

                <div className="day-col-thumb-wrap">
                  {recipe ? (
                    <DayMealThumb recipe={recipe} />
                  ) : (
                    <div
                      className="day-col-empty-thumb"
                      onClick={(e) => {
                        e.stopPropagation();
                        openAddModalForDay(day.id);
                      }}
                      title={`Gericht für ${day.name} hinzufügen`}
                    >
                      <span>+</span>
                    </div>
                  )}

                  {dayMeals.length > 1 && (
                    <span className="day-col-extra-badge">+{dayMeals.length - 1}</span>
                  )}
                </div>

                <div className="day-col-name-wrap">
                  {recipe ? (
                    <span className="day-col-recipe-name" title={recipe.title}>
                      {recipe.title.replace(/\s*Deluxe\b/gi, "").trim()}
                    </span>
                  ) : (
                    <span
                      className="day-col-empty-label"
                      onClick={(e) => {
                        e.stopPropagation();
                        openAddModalForDay(day.id);
                      }}
                    >
                      + Planen
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Main Days Grid */}
      <section className="planner-days-list">
        {filteredDays.map((day) => {
          const dayMeals = plannedMeals.filter((m) => m.dayId === day.id);

          return (
            <article key={day.id} className="planner-day-card">
              {/* Day Header */}
              <div className="planner-day-header">
                <div className="day-title-wrap">
                  <div className="day-name-row">
                    <h3>{day.name}</h3>
                    <span className="day-short-badge">{day.short}</span>
                  </div>
                  <small className="day-note">{day.note}</small>
                </div>

                <div className="day-actions">
                  <span className="day-meals-count">
                    {dayMeals.length === 0 ? "Keine Mahlzeit" : `${dayMeals.length} ${dayMeals.length === 1 ? "Gericht" : "Gerichte"}`}
                  </span>
                  <button
                    type="button"
                    className="add-meal-to-day-btn"
                    onClick={() => openAddModalForDay(day.id)}
                    title={`Mahlzeit für ${day.name} hinzufügen`}
                  >
                    <span>+ Hinzufügen</span>
                  </button>
                </div>
              </div>

              {/* Planned Meals for this Day */}
              {dayMeals.length === 0 ? (
                <div className="day-empty-placeholder" onClick={() => openAddModalForDay(day.id)}>
                  <span className="placeholder-icon">+</span>
                  <p>Kein Gericht für {day.name} eingetragen</p>
                  <small>Tippe hier, um eine gemerkte Mahlzeit zuzuweisen</small>
                </div>
              ) : (
                <div className="day-meals-container">
                  {dayMeals.map((planned) => {
                    const recipe = catalog.find((r) => r.id === planned.recipeId);
                    if (!recipe) return null;

                    // Check stock for this specific planned dish
                    const ingList = typeof recipe.ingredientsList === "function"
                      ? recipe.ingredientsList(planned.servings)
                      : getSafeIngredientsList(recipe, planned.servings);
                    const missingForMeal = ingList.filter((ing) => {
                      if (ing.optional) return false;
                      const lower = ing.name.toLowerCase();
                      const match = pantry.find((p) => {
                        const pLower = p.name.toLowerCase();
                        return pLower.includes(lower) || lower.includes(pLower);
                      });
                      if (!match) return true;
                      const reqMatch = ing.amount.match(/^(\d+)/);
                      const req = reqMatch ? parseInt(reqMatch[1], 10) : 0;
                      return match.amount < req;
                    });

                    const isAllInStock = missingForMeal.length === 0;

                    return (
                      <div key={planned.id} className="planned-meal-item">
                        {/* Main Row: Food Tone Visual, Info, Stock Pill, Remove */}
                        <div className="planned-meal-main-row">
                          <div className="planned-meal-icon-wrap">
                            <ProductMark tone={getFoodTone(recipe.title)} name={recipe.title} compact />
                          </div>

                          <div className="planned-meal-details">
                            <div className="meal-title-line">
                              <h4>{recipe.title}</h4>
                              <span className={`stock-check-pill ${isAllInStock ? "ok" : "missing"}`}>
                                {isAllInStock ? "Im Vorrat" : `${missingForMeal.length} fehlt`}
                              </span>
                            </div>

                            <p className="meal-subtitle-line">
                              {recipe.time} · {recipe.difficulty} · ca. {(recipe.baseCost * planned.servings).toFixed(2).replace(".", ",")} €
                            </p>
                          </div>

                          <button
                            type="button"
                            className="remove-meal-btn"
                            onClick={() => onRemovePlannedMeal(planned.id)}
                            title="Aus Tagesplan entfernen"
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                              <path d="M18 6 6 18M6 6l12 12" />
                            </svg>
                          </button>
                        </div>

                        {/* Bottom Controls Bar: Servings Stepper, Move Day Select, and Cook Button */}
                        <div className="planned-meal-controls-bar">
                          <div className="meal-servings-stepper">
                            <span className="servings-label">Portionen:</span>
                            <div className="stepper-controls">
                              <button
                                type="button"
                                className="stepper-btn"
                                onClick={() => onUpdateMealServings(planned.id, Math.max(1, planned.servings - 1))}
                                disabled={planned.servings <= 1}
                              >
                                −
                              </button>
                              <strong className="stepper-val">{planned.servings}</strong>
                              <button
                                type="button"
                                className="stepper-btn"
                                onClick={() => onUpdateMealServings(planned.id, Math.min(6, planned.servings + 1))}
                                disabled={planned.servings >= 6}
                              >
                                +
                              </button>
                            </div>

                            <select
                              className="move-day-select"
                              value={planned.dayId}
                              onChange={(e) => onMovePlannedMeal(planned.id, e.target.value as WeekdayId)}
                              title="Auf anderen Wochentag verschieben"
                            >
                              {WEEKDAYS.map((w) => (
                                <option key={w.id} value={w.id}>
                                  → {w.short} ({w.name})
                                </option>
                              ))}
                            </select>
                          </div>

                          <button
                            type="button"
                            className="cook-now-btn"
                            onClick={() => {
                              if (onStartCookingMeal) {
                                onStartCookingMeal(recipe.id, planned.servings);
                              } else {
                                onCookMeal(recipe.title, planned.servings);
                              }
                            }}
                            title="Rezept mit Portionen im Kochen-Tab öffnen"
                          >
                            <span>Zum Kochen →</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </article>
          );
        })}
      </section>

      {/* SECTION: Zutatenbedarf & Vorrats-Abgleich (Detailed Aggregation) */}
      <section className="planner-shopping-section">
        <div className="shopping-section-header">
          <div className="shopping-section-title-wrap">
            <div>
              <h2>Zutatenbedarf & Vorrats-Abgleich</h2>
              <p>Fehlende Zutaten der geplanten Mahlzeiten ermitteln & auf Einkaufsliste setzen</p>
            </div>
          </div>

          <div className="sync-button-wrap">
            <button
              type="button"
              className="primary-button compact-sync-btn"
              onClick={handleSyncToGroceries}
            >
              <span>{missingIngredientsCount} Artikel auf Einkaufsliste</span>
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="ingredient-filter-pills">
          <button
            type="button"
            className={`filter-pill ${ingredientFilter === "all" ? "active" : ""}`}
            onClick={() => setIngredientFilter("all")}
          >
            Alle Zutaten ({aggregatedIngredients.length})
          </button>
          <button
            type="button"
            className={`filter-pill ${ingredientFilter === "missing" ? "active" : ""}`}
            onClick={() => setIngredientFilter("missing")}
          >
            Einkaufsbedarf ({missingIngredientsCount})
          </button>
          <button
            type="button"
            className={`filter-pill ${ingredientFilter === "inStock" ? "active" : ""}`}
            onClick={() => setIngredientFilter("inStock")}
          >
            Im Vorrat ({aggregatedIngredients.filter((i) => i.isCovered).length})
          </button>
        </div>

        {/* Ingredients Breakdown Table / List */}
        {aggregatedIngredients.length === 0 ? (
          <div className="planner-empty-ingredients">
            <p>Plane Mahlzeiten ein, um den gesamten Wocheneinkauf automatisch zu strukturieren.</p>
          </div>
        ) : (
          <div className="aggregated-ingredients-list">
            {aggregatedIngredients
              .filter((ing) => {
                if (ingredientFilter === "missing") return !ing.isCovered;
                if (ingredientFilter === "inStock") return ing.isCovered;
                return true;
              })
              .map((ing, idx) => (
                <div key={idx} className={`agg-ingredient-row ${ing.isCovered ? "covered" : "missing"}`}>
                  <div className="agg-left">
                    <span className={`agg-status-dot ${ing.isCovered ? "ok" : "missing"}`} />
                    <div className="agg-text">
                      <div className="agg-name-line">
                        <strong>{ing.cleanName}</strong>
                        <span className="agg-category-tag">{ing.category}</span>
                        {ing.isOptional && <span className="agg-opt-tag">opt.</span>}
                      </div>
                      <small className="agg-recipes-line">
                        Für: {ing.days.map((d) => WEEKDAYS.find((w) => w.id === d)?.short).join(", ")} ({ing.recipes.join(", ")})
                      </small>
                    </div>
                  </div>

                  <div className="agg-right">
                    <div className="agg-quantities">
                      <strong className="agg-needed">{ing.totalNeeded} {ing.unit}</strong>
                      <span className="agg-stock-info">
                        {ing.inStock >= 99999 ? "(Vorrat: unbegrenzt)" : `(Vorrat: ${ing.inStock} ${ing.unit})`}
                      </span>
                    </div>

                    <div className="agg-status-badge">
                      {ing.isCovered ? (
                        <span className="covered-pill">Gedeckt</span>
                      ) : (
                        <span className="missing-pill">
                          Fehlt: {ing.missingAmount} {ing.unit} · ca. {ing.estimatedPrice.toFixed(2).replace(".", ",")} €
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </section>

      {/* Bottom Floating Navigation Helpers */}
      <div className="planner-bottom-hints">
        <button
          type="button"
          className="hint-btn"
          onClick={onNavigateToSavedMeals}
        >
          <span>Zu gemerkten Mahlzeiten</span>
        </button>
        <button
          type="button"
          className="hint-btn"
          onClick={onNavigateToDiscover}
        >
          <span>Neue Rezepte entdecken</span>
        </button>
      </div>

      {/* Modal: Mahlzeit einem Tag zuweisen */}
      {isAddModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsAddModalOpen(false)}>
          <div className="planner-modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-sheet-header">
              <div className="modal-title-wrap">
                <div>
                  <h3>Mahlzeit einplanen</h3>
                  <p>Wähle eine gemerkte Mahlzeit für {WEEKDAYS.find((w) => w.id === modalTargetDay)?.name}</p>
                </div>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsAddModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="modal-sheet-body">
              {/* Day Selector */}
              <div className="modal-field-group">
                <label className="modal-label">Wochentag:</label>
                <div className="modal-day-chips">
                  {WEEKDAYS.map((w) => (
                    <button
                      key={w.id}
                      type="button"
                      className={`day-chip-btn ${modalTargetDay === w.id ? "active" : ""}`}
                      onClick={() => setModalTargetDay(w.id)}
                    >
                      {w.short}
                    </button>
                  ))}
                </div>
              </div>

              {/* Recipe Selector (Saved favorites shown with prominence) */}
              <div className="modal-field-group">
                <div className="recipe-select-header">
                  <label className="modal-label">Gericht auswählen:</label>
                  <span className="saved-recipes-note">{savedRecipes.length} gemerkt</span>
                </div>

                <div className="modal-recipes-list hide-scrollbar">
                  {savedRecipes.length > 0 ? (
                    <div className="recipes-group-block">
                      <small className="recipe-group-title">Deine gemerkten Mahlzeiten</small>
                      {savedRecipes.map((recipe) => (
                        <div
                          key={recipe.id}
                          className={`recipe-pick-card ${modalSelectedRecipeId === recipe.id ? "selected" : ""}`}
                          onClick={() => setModalSelectedRecipeId(recipe.id)}
                        >
                          <ProductMark tone={getFoodTone(recipe.title)} name={recipe.title} compact />
                          <div className="pick-card-info">
                            <strong>{recipe.title}</strong>
                            <p>{recipe.time} · {recipe.difficulty} · {(recipe.baseCost * modalServings).toFixed(2).replace(".", ",")} €</p>
                          </div>
                          <div className="pick-radio">
                            {modalSelectedRecipeId === recipe.id ? "✓" : ""}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {/* Other Catalog Recipes */}
                  <div className="recipes-group-block">
                    <small className="recipe-group-title">Weiteres Rezept aus dem Katalog wählen</small>
                    {catalog.filter((r) => !favorites.includes(r.id)).map((recipe) => (
                      <div
                        key={recipe.id}
                        className={`recipe-pick-card ${modalSelectedRecipeId === recipe.id ? "selected" : ""}`}
                        onClick={() => setModalSelectedRecipeId(recipe.id)}
                      >
                        <ProductMark tone={getFoodTone(recipe.title)} name={recipe.title} compact />
                        <div className="pick-card-info">
                          <strong>{recipe.title}</strong>
                          <p>{recipe.time} · {recipe.difficulty} · {(recipe.baseCost * modalServings).toFixed(2).replace(".", ",")} €</p>
                        </div>
                        <div className="pick-radio">
                          {modalSelectedRecipeId === recipe.id ? "✓" : ""}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Portion Selector */}
              <div className="modal-field-group">
                <div className="portion-row-header">
                  <label className="modal-label">Portionen:</label>
                  <strong>{modalServings} {modalServings === 1 ? "Person" : "Personen"}</strong>
                </div>
                <div className="segment-control" style={{ width: "100%" }}>
                  {[1, 2, 3, 4, 5].map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      className={`segment-btn ${modalServings === cnt ? "active" : ""}`}
                      onClick={() => setModalServings(cnt)}
                    >
                      {cnt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Confirm CTA */}
              <div className="modal-sheet-footer">
                <button
                  type="button"
                  className="primary-button confirm-plan-btn"
                  onClick={handleConfirmAddMeal}
                  disabled={!modalSelectedRecipeId}
                >
                  <span>Mahlzeit einplanen</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Gemerkte Rezepte auf Wochentage aufteilen */}
      {isSavedRecipesDistributorOpen && (
        <div
          className="modal-backdrop"
          onClick={() => setIsSavedRecipesDistributorOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="planner-distributor-sheet"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-sheet-header">
              <div className="modal-title-wrap">
                <div>
                  <h3>Gemerkte Rezepte aufteilen</h3>
                  <p>Rezepte flexibel auf Wochentage (Mo–So) verteilen</p>
                </div>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsSavedRecipesDistributorOpen(false)}
                aria-label="Schließen"
              >
                ✕
              </button>
            </div>

            <div className="distributor-modal-body hide-scrollbar">
              {savedRecipes.length === 0 ? (
                <div className="distributor-empty-state">
                  <h4>Noch keine Rezepte gemerkt</h4>
                  <p>
                    Markiere im Rezepte- oder Kochen-Tab deine Lieblingsrezepte, um sie hier bequem auf die Wochentage zu verteilen.
                  </p>
                </div>
              ) : (
                <>
                  <div className="distributor-info-banner">
                    <span>Tipp:</span> Klicke auf Wochentage (Mo–So), um das Gericht für den jeweiligen Tag einzuplanen oder wieder zu entfernen.
                  </div>

                  <div className="distributor-recipes-list">
                    {savedRecipes.map((recipe) => {
                      const plannedDaysForRecipe = WEEKDAYS.filter((w) =>
                        isRecipePlannedOnDay(recipe.id, w.id)
                      );
                      const isPlannedAnywhere = plannedDaysForRecipe.length > 0;

                      return (
                        <div
                          key={recipe.id}
                          className={`distributor-recipe-card ${isPlannedAnywhere ? "has-plan" : ""}`}
                        >
                          <div className="distributor-card-top">
                            <ProductMark tone={getFoodTone(recipe.title)} name={recipe.title} compact />
                            <div className="distributor-card-info">
                              <h4>{recipe.title}</h4>
                              <p>
                                {recipe.time} · {recipe.difficulty} · {recipe.baseCost.toFixed(2).replace(".", ",")} €/Portion
                              </p>
                            </div>
                            {isPlannedAnywhere && (
                              <span className="distributor-assigned-badge">
                                {plannedDaysForRecipe.length}x geplant
                              </span>
                            )}
                          </div>

                          <div className="distributor-day-selector">
                            <span className="distributor-day-label">Tage zuweisen:</span>
                            <div className="distributor-day-pills">
                              {WEEKDAYS.map((day) => {
                                const isAssigned = isRecipePlannedOnDay(recipe.id, day.id);
                                return (
                                  <button
                                    key={day.id}
                                    type="button"
                                    className={`distributor-day-btn ${isAssigned ? "active" : ""}`}
                                    onClick={() => toggleRecipeOnDay(recipe, day.id, 2)}
                                    title={`${day.name}: ${isAssigned ? "Entfernen" : "Einplanen"}`}
                                  >
                                    <span>{day.short}</span>
                                    {isAssigned && <span className="btn-check">✓</span>}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div className="distributor-status-line">
                            {isPlannedAnywhere ? (
                              <span className="status-text active">
                                Geplant für: {plannedDaysForRecipe.map((d) => d.name).join(", ")}
                              </span>
                            ) : (
                              <span className="status-text muted">
                                Noch keinem Tag zugewiesen
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            <div className="modal-sheet-footer">
              <button
                type="button"
                className="primary-button finish-distribute-btn"
                onClick={() => setIsSavedRecipesDistributorOpen(false)}
              >
                <span>Fertig & Plan ansehen ({totalMealsCount} Mahlzeiten)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
