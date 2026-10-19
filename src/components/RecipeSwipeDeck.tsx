import React, { useState, useMemo } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "motion/react";
import type { CatalogRecipe } from "../data/recipeCatalog";
import { RecipeStepsAccordion } from "./CookingModal";
import { getRecipePantryBreakdown } from "../utils/pantryMatching";

interface RecipeSwipeDeckProps {
  recipes: Array<
    CatalogRecipe & {
      calories: string;
      protein: string;
      carbs: string;
      cost: string;
      availableFormatted: string;
    }
  >;
  servings: number;
  pantry?: Array<{ name: string; amount?: number; unit?: string; isUnlimited?: boolean }>;
  favorites: string[];
  onToggleFavorite: (id: string, title: string) => void;
  onBookmark?: (id: string, title: string) => void;
  onCook: (recipeTitle: string, servings: number) => void;
  onOpenDetails: (recipe: CatalogRecipe) => void;
  onAddMissingToGroceries?: (items: Array<{ name: string; amount?: string }>) => void;
  onNotify?: (message: string) => void;
  onShuffle?: () => void;
  onNavigateToSaved?: () => void;
}

function SwipeCardContent({
  recipe,
  recipeIndex,
  isTopCard,
  isFav,
  servings,
  pantry,
  isAccordionOpen,
  onToggleFavorite,
  onToggleAccordion,
  onOpenDetails,
  onBookmark,
  onAddMissingToGroceries,
}: {
  recipe: CatalogRecipe & {
    calories: string;
    protein: string;
    carbs: string;
    cost: string;
    availableFormatted: string;
  };
  recipeIndex: number;
  isTopCard: boolean;
  isFav: boolean;
  servings: number;
  pantry?: Array<{ name: string; amount?: number; unit?: string; isUnlimited?: boolean }>;
  isAccordionOpen: boolean;
  onToggleFavorite: (id: string, title: string) => void;
  onToggleAccordion: () => void;
  onOpenDetails: (recipe: CatalogRecipe) => void;
  onBookmark?: (id: string, title: string) => void;
  onAddMissingToGroceries?: (items: Array<{ name: string; amount?: string }>) => void;
}) {
  const breakdown = useMemo(() => {
    return getRecipePantryBreakdown(recipe, pantry || [], servings);
  }, [recipe, pantry, servings]);
  return (
    <>
      {/* Card Hero Visual */}
      <div className={`swipe-card-visual ${recipe.tone}`}>
        <div className="swipe-card-badges">
          {recipe.isAiGenerated && (
            <span
              className="swipe-match-badge"
              style={{
                background: "#ecfdf5",
                color: "#065f46",
                border: "1px solid #a7f3d0",
                fontWeight: 700,
              }}
            >
              Suchergebnis
            </span>
          )}
          {/* Vorrats-Match Badge directly reflecting real pantry state */}
          {(() => {
            const actualScore = breakdown.matchPercentage;
            if (actualScore === 100) {
              return (
                <span
                  className="swipe-match-badge"
                  style={{
                    background: "#ecfdf5",
                    color: "#065f46",
                    borderColor: "#a7f3d0",
                    fontWeight: 750,
                  }}
                >
                  100% Vorrat da
                </span>
              );
            }
            if (actualScore >= 60) {
              return (
                <span className="swipe-match-badge">
                  {actualScore}% Vorrats-Match
                </span>
              );
            }
            if (actualScore > 0) {
              return (
                <span
                  className="swipe-match-badge"
                  style={{
                    background: "#fffbeb",
                    color: "#b45309",
                    borderColor: "#fde68a",
                  }}
                >
                  {actualScore}% Match · {breakdown.missing.length} fehlt
                </span>
              );
            }
            return (
              <span
                className="swipe-match-badge"
                style={{
                  background: "#fef2f2",
                  color: "#b91c1c",
                  borderColor: "#fecaca",
                }}
              >
                Zutaten fehlen ({breakdown.missing.length})
              </span>
            );
          })()}
          <span className="swipe-time-badge">{recipe.time}</span>
        </div>

        {/* Bookmark button */}
        <button
          type="button"
          className={`recipe-bookmark-button ${isFav ? "active" : ""}`}
          style={{ top: "12px", right: "12px", left: "auto" }}
          title={isFav ? "Aus Favoriten entfernen" : "Zu Favoriten hinzufügen"}
          tabIndex={isTopCard ? 0 : -1}
          onClick={(e) => {
            e.stopPropagation();
            if (isTopCard) {
              onToggleFavorite(recipe.id, recipe.title);
            }
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill={isFav ? "#059669" : "none"}
            stroke={isFav ? "#059669" : "currentColor"}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
          </svg>
        </button>

        {recipe.imageUrl ? (
          <img
            src={recipe.imageUrl}
            alt={recipe.title}
            className="swipe-card-img"
            loading="lazy"
          />
        ) : (
          <div className="plate">
            <span className="rice-grain one" />
            <span className="rice-grain two" />
            <span className="rice-grain three" />
            <span className="yolk" />
            <span className="green one" />
            <span className="green two" />
          </div>
        )}
        <span className="recipe-number">0{recipeIndex + 1}</span>
      </div>

      {/* Card Content & Details */}
      <div className="swipe-card-content">
        <div className="swipe-card-title-row">
          <div>
            <h3 className="swipe-card-title">{recipe.title}</h3>
            <p className="swipe-card-sub">{recipe.subtitle}</p>
          </div>
          <span className="swipe-card-diff">{recipe.difficulty}</span>
        </div>

        {/* Nutrition & Cost Metrics */}
        <div className="swipe-metrics-row">
          <div className="swipe-metric">
            <span>Energie</span>
            <strong>{recipe.calories} kcal</strong>
          </div>
          <div className="swipe-metric">
            <span>Protein</span>
            <strong>{recipe.protein}</strong>
          </div>
          <div className="swipe-metric">
            <span>Carbs</span>
            <strong>{recipe.carbs}</strong>
          </div>
          <div className="swipe-metric highlight">
            <span>Kosten/Portion</span>
            <strong>{recipe.cost}</strong>
          </div>
        </div>

        {/* Clear Pantry & Missing Ingredients Breakdown */}
        <div className="swipe-pantry-breakdown" onClick={(e) => e.stopPropagation()}>
          {breakdown.missing.length > 0 ? (
            <>
              {/* Missing Ingredients Box */}
              <div className="pantry-status-box missing">
                <div className="pantry-status-header">
                  <div className="pantry-status-title missing">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#be123c" strokeWidth="2.5">
                      <circle cx="9" cy="21" r="1" />
                      <circle cx="20" cy="21" r="1" />
                      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                    </svg>
                    <span>Fehlt im Vorrat ({breakdown.missing.length})</span>
                  </div>
                  {onAddMissingToGroceries && (
                    <button
                      type="button"
                      className="add-to-groceries-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddMissingToGroceries(breakdown.missing);
                      }}
                      title="Alle fehlenden Zutaten zur Einkaufsliste hinzufügen"
                    >
                      + Auf Einkaufsliste
                    </button>
                  )}
                </div>
                <div className="pantry-chips-wrap">
                  {breakdown.missing.map((item, idx) => (
                    <span key={idx} className="pantry-chip missing">
                      <span className="chip-bullet">•</span>
                      <strong className="chip-name">{item.name}</strong>
                      <span className="chip-amount">{item.amount}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* In-Stock Ingredients Box */}
              {breakdown.inStock.length > 0 && (
                <div className="pantry-status-box instock">
                  <div className="pantry-status-header">
                    <div className="pantry-status-title instock">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>Im Vorrat ({breakdown.inStock.length})</span>
                    </div>
                  </div>
                  <div className="pantry-chips-wrap">
                    {breakdown.inStock.map((item, idx) => (
                      <span key={idx} className="pantry-chip instock">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ marginRight: "3px", flexShrink: 0 }}>
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span className="chip-name">
                          {item.name}
                          {item.matchedByAlternative && (
                            <small style={{ opacity: 0.85, marginLeft: "4px", fontSize: "9px", color: "#047857" }}>
                              (Vorrat: {item.matchedByAlternative})
                            </small>
                          )}
                        </span>
                        <span className="chip-amount">{item.amount}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            /* 100% In Stock */
            <div className="pantry-status-box all-matched">
              <div className="pantry-status-header">
                <div className="pantry-status-title instock">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Alle {breakdown.all.length} Zutaten im Vorrat vorhanden (100% Match)</span>
                </div>
              </div>
              <div className="pantry-chips-wrap">
                {breakdown.all.map((item, idx) => (
                  <span key={idx} className="pantry-chip instock">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ marginRight: "3px", flexShrink: 0 }}>
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span className="chip-name">
                      {item.name}
                      {item.matchedByAlternative && (
                        <small style={{ opacity: 0.85, marginLeft: "4px", fontSize: "9px", color: "#047857" }}>
                          (Vorrat: {item.matchedByAlternative})
                        </small>
                      )}
                    </span>
                    <span className="chip-amount">{item.amount}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Inline Accordion for Steps or Quick Action */}
        <div className="swipe-accordion-wrapper" onClick={(e) => e.stopPropagation()}>
          <RecipeStepsAccordion
            recipe={recipe}
            servings={servings}
            isOpen={isTopCard && isAccordionOpen}
            onToggle={isTopCard ? onToggleAccordion : () => {}}
            onOpenModal={() => onOpenDetails(recipe)}
            onBookmark={(id, title) =>
              onBookmark ? onBookmark(id, title) : onToggleFavorite(id, title)
            }
            isBookmarked={isFav}
          />
        </div>
      </div>
    </>
  );
}

export function RecipeSwipeDeck({
  recipes,
  servings,
  pantry,
  favorites,
  onToggleFavorite,
  onBookmark,
  onCook,
  onOpenDetails,
  onAddMissingToGroceries,
  onNotify,
  onShuffle,
  onNavigateToSaved,
}: RecipeSwipeDeckProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | null>(null);
  const [isDragSwipe, setIsDragSwipe] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [expandedInCard, setExpandedInCard] = useState<string | null>(null);

  const currentRecipe = recipes[currentIndex];
  const nextRecipe = recipes[currentIndex + 1];
  const thirdRecipe = recipes[currentIndex + 2];

  // Motion values for swipe gesture
  const x = useMotionValue(0);

  // Tilt mirrored outward up to 12 degrees (Figma tiltDegrees: 12)
  const rotate = useTransform(x, [-260, 0, 260], [-12, 0, 12]);

  // Subtle vertical drag lift
  const dragY = useTransform(x, [-300, 0, 300], [-18, 0, -18]);

  // Responsive promotion scaling & translation during interactive drag
  const dragNextScale = useTransform(x, [-260, 0, 260], [1, 0.96, 1]);
  const dragNextY = useTransform(x, [-260, 0, 260], [0, 7.2, 0]);

  const dragThirdScale = useTransform(x, [-260, 0, 260], [0.96, 0.92, 0.96]);
  const dragThirdY = useTransform(x, [-260, 0, 260], [7.2, 14.4, 7.2]);

  // Stamp opacity
  const opacityRight = useTransform(x, [20, 90], [0, 1]); // Like / Cook
  const opacityLeft = useTransform(x, [-20, -90], [0, 1]); // Pass / Skip

  const handleSwipe = (direction: "left" | "right", fromDrag = false) => {
    if (!currentRecipe || isAnimating) return;

    setIsAnimating(true);
    setIsDragSwipe(fromDrag);
    setSwipeDirection(direction);

    if (direction === "right") {
      // Swipe Right = In Gemerkte Rezepte (Tab Kochen) speichern
      if (onBookmark) {
        onBookmark(currentRecipe.id, currentRecipe.title);
      } else {
        if (!isFav) {
          onToggleFavorite(currentRecipe.id, currentRecipe.title);
        }
      }
      if (onNotify) {
        onNotify(`«${currentRecipe.title}» in Gemerkte Rezepte (Tab "Kochen") gespeichert!`);
      }
    } else {
      // Swipe Left = PASS / Überspringen
      if (onNotify) {
        onNotify(`«${currentRecipe.title}» übersprungen`);
      }
    }

    // Figma animation specs:
    // Swipe duration: 420ms (easing: [0.4, 0, 0.8, 0.6])
    // Promotion: duration 420ms (easing: [0.22, 1, 0.36, 1])
    // For button clicks: promotion starts at 220ms with overlap -> finishes at 640ms. Wait: 660ms.
    // For drag releases: gesture is already in motion -> promotion starts immediately (0ms) -> finishes at 420ms. Wait: 440ms.
    const waitMs = fromDrag ? 440 : 660;

    setTimeout(() => {
      setCurrentIndex((prev) => prev + 1);
      setSwipeDirection(null);
      setIsAnimating(false);
      setIsDragSwipe(false);
      x.set(0);
      setExpandedInCard(null);
    }, waitMs);
  };

  const handleDragEnd = (_: any, info: { offset: { x: number }; velocity: { x: number } }) => {
    setIsDragging(false);
    const threshold = 95;
    const velocityThreshold = 450;

    if (info.offset.x > threshold || info.velocity.x > velocityThreshold) {
      handleSwipe("right", true);
    } else if (info.offset.x < -threshold || info.velocity.x < -velocityThreshold) {
      handleSwipe("left", true);
    } else {
      x.set(0);
    }
  };

  const handleReset = () => {
    setCurrentIndex(0);
    setSwipeDirection(null);
    setIsAnimating(false);
    setIsDragging(false);
    setIsDragSwipe(false);
    x.set(0);
    if (onShuffle) onShuffle();
    if (onNotify) onNotify("Rezeptvorschläge zurückgesetzt & neu gemischt");
  };

  const isFav = currentRecipe ? favorites.includes(currentRecipe.id) : false;

  return (
    <div className="swipe-deck-container">
      {/* Quick link to Saved Meals page if items exist */}
      {favorites.length > 0 && onNavigateToSaved && (
        <button
          type="button"
          className="swipe-saved-banner-link"
          onClick={onNavigateToSaved}
          title="Zu deinen gemerkten Mahlzeiten wechseln"
        >
          <div className="swipe-saved-banner-left">
            <span>
              <strong>{favorites.length} Mahlzeit{favorites.length > 1 ? "en" : ""} gemerkt</strong> · Bereit zum Kochen
            </span>
          </div>
          <span className="swipe-saved-banner-arrow">Zu Kochen →</span>
        </button>
      )}

      {/* Deck progress indicator */}
      <div className="swipe-deck-header">
        <div className="swipe-progress-pill">
          {currentRecipe ? (
            <>
              <span className="dot active" />
              <span>
                {currentRecipe.isAiGenerated ? (
                  <>Suchergebnis: <strong>{currentRecipe.title}</strong></>
                ) : (
                  <>Vorschlag <strong>{currentIndex + 1}</strong> von <strong>{recipes.length}</strong></>
                )}
              </span>
            </>
          ) : (
            <span>Alle Vorschläge durchgeschaut</span>
          )}
        </div>
      </div>

      {/* Cards Area */}
      <div className="swipe-card-stage">
        {currentRecipe ? (
          <div className="swipe-cards-wrapper">
            {/* Card 3 (Bottom) - Figma: thirdScale: 0.92, y: 14.4 -> promoted to 0.96, y: 7.2 */}
            {thirdRecipe && (
              <motion.div
                key={thirdRecipe.id}
                className="swipe-card swipe-card-underneath third"
                style={{
                  zIndex: 1,
                  transformOrigin: "50% 50%",
                  scale: isDragging ? dragThirdScale : undefined,
                  y: isDragging ? dragThirdY : undefined,
                }}
                initial={{ scale: 0.92, y: 14.4 }}
                animate={
                  swipeDirection
                    ? { scale: 0.96, y: 7.2 }
                    : { scale: 0.92, y: 14.4 }
                }
                transition={
                  swipeDirection
                    ? {
                        duration: 0.42,
                        delay: isDragSwipe ? 0 : 0.22, // Figma promotion begins with overlap
                        ease: [0.22, 1, 0.36, 1], // Figma easing
                      }
                    : {
                        duration: 0.22,
                        ease: [0.22, 1, 0.36, 1],
                      }
                }
              >
                <SwipeCardContent
                  recipe={thirdRecipe}
                  recipeIndex={currentIndex + 2}
                  isTopCard={false}
                  isFav={favorites.includes(thirdRecipe.id)}
                  servings={servings}
                  pantry={pantry}
                  isAccordionOpen={false}
                  onToggleFavorite={onToggleFavorite}
                  onToggleAccordion={() => {}}
                  onOpenDetails={onOpenDetails}
                  onBookmark={onBookmark}
                  onAddMissingToGroceries={onAddMissingToGroceries}
                />
              </motion.div>
            )}

            {/* Card 2 (Middle) - Figma: nextScale: 0.96, y: 7.2 -> promoted to 1.0, y: 0 */}
            {nextRecipe && (
              <motion.div
                key={nextRecipe.id}
                className="swipe-card swipe-card-underneath second"
                style={{
                  zIndex: 2,
                  transformOrigin: "50% 50%",
                  scale: isDragging ? dragNextScale : undefined,
                  y: isDragging ? dragNextY : undefined,
                }}
                initial={{ scale: 0.96, y: 7.2 }}
                animate={
                  swipeDirection
                    ? { scale: 1, y: 0 }
                    : { scale: 0.96, y: 7.2 }
                }
                transition={
                  swipeDirection
                    ? {
                        duration: 0.42,
                        delay: isDragSwipe ? 0 : 0.22, // Figma promotion begins with overlap
                        ease: [0.22, 1, 0.36, 1], // Figma easing
                      }
                    : {
                        duration: 0.22,
                        ease: [0.22, 1, 0.36, 1],
                      }
                }
              >
                <SwipeCardContent
                  recipe={nextRecipe}
                  recipeIndex={currentIndex + 1}
                  isTopCard={false}
                  isFav={favorites.includes(nextRecipe.id)}
                  servings={servings}
                  pantry={pantry}
                  isAccordionOpen={false}
                  onToggleFavorite={onToggleFavorite}
                  onToggleAccordion={() => {}}
                  onOpenDetails={onOpenDetails}
                  onBookmark={onBookmark}
                  onAddMissingToGroceries={onAddMissingToGroceries}
                />
              </motion.div>
            )}

            {/* Top Interactive Draggable Card - Figma Swipe Outward Tilt & Easing */}
            <motion.div
              key={currentRecipe.id}
              className="swipe-card active-card"
              style={{
                x,
                y: swipeDirection ? undefined : dragY,
                rotate,
                zIndex: 10,
                transformOrigin: "50% 50%",
              }}
              drag={!isAnimating ? "x" : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.65}
              onDragStart={() => setIsDragging(true)}
              onDragEnd={handleDragEnd}
              animate={
                swipeDirection === "right"
                  ? {
                      x: 760, // Figma translateX.right: 760
                      y: -35, // Figma translateY: -35
                      rotate: 12, // Figma tiltDegrees: 12 (outward)
                      opacity: [1, 1, 0], // Figma fadeOutDuringFinalMs: 50
                    }
                  : swipeDirection === "left"
                  ? {
                      x: -760, // Figma translateX.left: -760
                      y: -35, // Figma translateY: -35
                      rotate: -12, // Figma tiltDegrees: -12 (outward mirrored)
                      opacity: [1, 1, 0], // Figma fadeOutDuringFinalMs: 50
                    }
                  : {
                      x: 0,
                      y: 0,
                      rotate: 0,
                      opacity: 1,
                    }
              }
              transition={
                swipeDirection
                  ? {
                      x: { duration: 0.42, ease: [0.4, 0, 0.8, 0.6] },
                      y: { duration: 0.42, ease: [0.4, 0, 0.8, 0.6] },
                      rotate: { duration: 0.42, ease: [0.4, 0, 0.8, 0.6] },
                      opacity: { duration: 0.42, times: [0, 0.88, 1], ease: "linear" },
                    }
                  : {
                      type: "spring",
                      stiffness: 400,
                      damping: 30,
                    }
              }
            >
              {/* Swipe Stamp Indicators */}
              <motion.div
                className="swipe-stamp stamp-like"
                style={{ opacity: opacityRight }}
              >
                <span>ZU GEMERKT (KOCHEN)</span>
              </motion.div>

              <motion.div
                className="swipe-stamp stamp-pass"
                style={{ opacity: opacityLeft }}
              >
                <span>PASS</span>
              </motion.div>

              <SwipeCardContent
                recipe={currentRecipe}
                recipeIndex={currentIndex}
                isTopCard={true}
                isFav={isFav}
                servings={servings}
                pantry={pantry}
                isAccordionOpen={expandedInCard === currentRecipe.id}
                onToggleFavorite={onToggleFavorite}
                onToggleAccordion={() =>
                  setExpandedInCard(
                    expandedInCard === currentRecipe.id ? null : currentRecipe.id
                  )
                }
                onOpenDetails={onOpenDetails}
                onBookmark={onBookmark}
                onAddMissingToGroceries={onAddMissingToGroceries}
              />
            </motion.div>
          </div>
        ) : (
          /* Empty Deck State */
          <div className="swipe-deck-empty">
            <div className="empty-icon-wrap">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h3>Alle {recipes.length} Rezepte durchgeschaut!</h3>
            <p>
              Du hast alle Vorschläge dieser Runde geprüft. Du kannst das Deck von vorne
              beginnen oder neue Kombinationen mischen.
            </p>

            <div className="empty-actions">
              <button type="button" onClick={handleReset} className="empty-btn primary">
                Deck neu starten & mischen
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Iconic Tinder Control Button Bar */}
      {currentRecipe && (
        <div className="swipe-actions-bar">
          {/* Rewind / Reset Button */}
          <button
            type="button"
            className="swipe-action-btn rewind"
            title="Zurück zum ersten Rezept"
            onClick={handleReset}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
          </button>

          {/* Swipe Left (Pass) Button */}
          <button
            type="button"
            className="swipe-action-btn pass"
            title="Überspringen (Nach links swipen)"
            onClick={() => handleSwipe("left")}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          {/* Details / Instructions Modal Button */}
          <button
            type="button"
            className="swipe-action-btn info"
            title="Schritt-für-Schritt Koch-Modus öffnen"
            onClick={() => onOpenDetails(currentRecipe)}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
              <path d="M6 6h10" />
              <path d="M6 10h10" />
            </svg>
          </button>

          {/* Swipe Right (Match / Merken) Button */}
          <button
            type="button"
            className="swipe-action-btn like"
            title="Zu Gemerkte Rezepte (In Tab 'Kochen' speichern)"
            onClick={() => handleSwipe("right")}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill={isFav ? "#10b981" : "none"}
              stroke="#10b981"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
            </svg>
          </button>
        </div>
      )}

      {/* Swipe Gesture Hint */}
      {currentRecipe && (
        <p className="swipe-gesture-hint">
          <span>Wische links: Überspringen</span> · <span>Wische rechts: Zu Gemerkte Rezepte (Kochen)</span>
        </p>
      )}
    </div>
  );
}
