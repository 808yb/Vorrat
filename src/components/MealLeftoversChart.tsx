import React, { useState } from "react";
import {
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Utensils,
  Sparkles,
  ArrowRight,
  Info,
} from "lucide-react";

export interface DayMealData {
  dayId: string;
  shortLabel: string;
  fullLabel: string;
  freshMeals: number;
  reusedMeals: number;
  leftoverPortions: number; // in portions generated
  leftoverGrams: number;
  mealsDescription: string;
  leftoverDescription: string;
  smartAdvice: string;
  isPeak?: boolean;
}

const WEEK_DATA: DayMealData[] = [
  {
    dayId: "mo",
    shortLabel: "Mo",
    fullLabel: "Montag",
    freshMeals: 1,
    reusedMeals: 1,
    leftoverPortions: 0.5,
    leftoverGrams: 150,
    mealsDescription: "Mittags: Sonntags-Lasagne aufgewärmt · Abends: Schnelle Pasta",
    leftoverDescription: "0,5 Portionen Tomaten-Basilikum-Soße",
    smartAdvice: "Soße im Schraubglas für Dienstag aufbewahren.",
  },
  {
    dayId: "di",
    shortLabel: "Di",
    fullLabel: "Dienstag",
    freshMeals: 2,
    reusedMeals: 0,
    leftoverPortions: 1.4,
    leftoverGrams: 320,
    mealsDescription: "Mittags: Gemüse-Reispfanne · Abends: Ofenkartoffeln & Kräuterquark",
    leftoverDescription: "1,4 Portionen Reispfanne & 1 gebackene Kartoffel",
    smartAdvice: "Perfekt als Meal-Prep: Reis eignet sich ideal zum Anbraten am Mittwoch.",
  },
  {
    dayId: "mi",
    shortLabel: "Mi",
    fullLabel: "Mittwoch",
    freshMeals: 1,
    reusedMeals: 2,
    leftoverPortions: 0.3,
    leftoverGrams: 80,
    mealsDescription: "Mittags: Gebratener Reis (von Di) · Abends: Schnelle Kartoffelsuppe",
    leftoverDescription: "Nur minimale Schnittreste",
    smartAdvice: "Optimaler Verwertungstag: Fast keine Reste weggeworfen!",
  },
  {
    dayId: "do",
    shortLabel: "Do",
    fullLabel: "Donnerstag",
    freshMeals: 2,
    reusedMeals: 0,
    leftoverPortions: 2.1,
    leftoverGrams: 480,
    mealsDescription: "Mittags: Kichererbsen-Kokos-Curry (großer Topf) · Abends: Naan & Salat",
    leftoverDescription: "2,1 Portionen Curry übrig (reicht für Freitagmittag)",
    smartAdvice: "Zweithöchster Resteanfall: Curry zieht über Nacht durch und schmeckt morgen noch besser.",
  },
  {
    dayId: "fr",
    shortLabel: "Fr",
    fullLabel: "Freitag",
    freshMeals: 1,
    reusedMeals: 1,
    leftoverPortions: 0.8,
    leftoverGrams: 190,
    mealsDescription: "Mittags: Curry vom Vortag · Abends: Bunte Vollkorn-Wraps",
    leftoverDescription: "0,8 Portionen Gemüsefüllung",
    smartAdvice: "Gemüsereste am Samstagfrüh ins Rührei geben.",
  },
  {
    dayId: "sa",
    shortLabel: "Sa",
    fullLabel: "Samstag",
    freshMeals: 2,
    reusedMeals: 0,
    leftoverPortions: 1.2,
    leftoverGrams: 280,
    mealsDescription: "Mittags: Ofengemüse & Feta · Abends: Leichte Gemüse-Bowl",
    leftoverDescription: "1,2 Portionen gebackenes Wurzelgemüse",
    smartAdvice: "Kann püriert als Basis für eine Sonntagssuppe genutzt werden.",
  },
  {
    dayId: "so",
    shortLabel: "So",
    fullLabel: "Sonntag",
    freshMeals: 3,
    reusedMeals: 0,
    leftoverPortions: 2.6,
    leftoverGrams: 580,
    isPeak: true,
    mealsDescription: "Frühstück: Pancakes · Mittags: Große Gemüselasagne (Familie) · Abends: Brotzeit",
    leftoverDescription: "2,6 Portionen Lasagne & frisches Brot",
    smartAdvice: "Peak-Tag! 2 Portionen Lasagne direkt einfrieren oder für Mo/Di Mittagessen vormerken (+4,50 € gespart).",
  },
];

interface MealLeftoversChartProps {
  onNotify?: (message: string) => void;
}

export function MealLeftoversChart({ onNotify }: MealLeftoversChartProps) {
  const [selectedDay, setSelectedDay] = useState<DayMealData>(
    () => WEEK_DATA.find((d) => d.isPeak) || WEEK_DATA[6]
  );
  const [activeMetric, setActiveMetric] = useState<"leftovers" | "combined">("leftovers");
  const [hoveredDay, setHoveredDay] = useState<DayMealData | null>(null);

  // Computed summary statistics
  const totalLeftoverPortions = WEEK_DATA.reduce((sum, d) => sum + d.leftoverPortions, 0);
  const totalMeals = WEEK_DATA.reduce((sum, d) => sum + d.freshMeals + d.reusedMeals, 0);
  const totalReused = WEEK_DATA.reduce((sum, d) => sum + d.reusedMeals, 0);
  const reuseQuota = Math.round((totalReused / totalMeals) * 100);
  const peakDay = WEEK_DATA.reduce((max, d) => (d.leftoverPortions > max.leftoverPortions ? d : max), WEEK_DATA[0]);

  // Max value for chart scale (max leftovers is 2.6 -> scale to 3.0)
  const maxLeftoverScale = 3.0;
  const maxMealScale = 3.5;

  const handleBookMealPlan = (day: DayMealData) => {
    if (onNotify) {
      onNotify(`Reste von ${day.fullLabel} (${day.leftoverPortions.toFixed(1)} Port.) für Folgetag vorgemerkt`);
    }
  };

  return (
    <section className="meal-chart-section">
      {/* Header with Title & Context */}
      <div className="meal-chart-header">
        <div className="meal-chart-title-group">
          <div className="meal-chart-icon-badge">
            <TrendingUp size={16} />
          </div>
          <div>
            <div className="meal-chart-title-row">
              <h2>Mahlzeiten- & Reste-Verteilung</h2>
              <span className="meal-peak-pill">
                Peak: {peakDay.shortLabel} ({peakDay.leftoverPortions.toFixed(1)} P.)
              </span>
            </div>
            <p className="meal-chart-subtitle">
              Wochenanalyse: An welchen Tagen fallen die meisten Reste an?
            </p>
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="meal-view-toggle">
          <button
            type="button"
            className={activeMetric === "leftovers" ? "active" : ""}
            onClick={() => setActiveMetric("leftovers")}
          >
            Reste-Anfall
          </button>
          <button
            type="button"
            className={activeMetric === "combined" ? "active" : ""}
            onClick={() => setActiveMetric("combined")}
          >
            Mahlzeiten-Mix
          </button>
        </div>
      </div>

      {/* KPI Overview Pills */}
      <div className="meal-kpi-row">
        <div className="meal-kpi-chip">
          <span className="kpi-label">Wochen-Reste</span>
          <strong className="kpi-value">{totalLeftoverPortions.toFixed(1)} Portionen</strong>
        </div>
        <div className="meal-kpi-chip peak">
          <span className="kpi-label">Höchster Anfall</span>
          <strong className="kpi-value">{peakDay.fullLabel} ({peakDay.leftoverPortions.toFixed(1)} P.)</strong>
        </div>
        <div className="meal-kpi-chip success">
          <span className="kpi-label">Verwertungs-Quote</span>
          <strong className="kpi-value">{reuseQuota}% wiederverwertet</strong>
        </div>
      </div>

      {/* Chart Canvas Card */}
      <div className="meal-chart-card">
        {/* Legend */}
        <div className="chart-legend-row">
          {activeMetric === "leftovers" ? (
            <>
              <div className="legend-item">
                <span className="legend-dot leftover-peak" />
                <span>Peak-Reste (&gt; 2 Portionen)</span>
              </div>
              <div className="legend-item">
                <span className="legend-dot leftover-medium" />
                <span>Moderater Anfall</span>
              </div>
              <div className="legend-item">
                <span className="legend-dot leftover-low" />
                <span>Gering (&le; 0.5 P.)</span>
              </div>
            </>
          ) : (
            <>
              <div className="legend-item">
                <span className="legend-dot fresh-dot" />
                <span>Frisch gekocht</span>
              </div>
              <div className="legend-item">
                <span className="legend-dot reused-dot" />
                <span>Reste verwertet</span>
              </div>
              <div className="legend-item">
                <span className="legend-dot leftover-line-dot" />
                <span>Angefallene Reste</span>
              </div>
            </>
          )}
        </div>

        {/* Bar Visualization Grid */}
        <div className="chart-bars-stage">
          {/* Subtle guide lines */}
          <div className="chart-guide-lines">
            <div className="guide-line"><span>{activeMetric === "leftovers" ? "3.0 P" : "3 M"}</span></div>
            <div className="guide-line"><span>{activeMetric === "leftovers" ? "2.0 P" : "2 M"}</span></div>
            <div className="guide-line"><span>{activeMetric === "leftovers" ? "1.0 P" : "1 M"}</span></div>
            <div className="guide-line bottom"><span>0</span></div>
          </div>

          <div className="bars-flex-container">
            {WEEK_DATA.map((day) => {
              const isSelected = selectedDay.dayId === day.dayId;
              const isHovered = hoveredDay?.dayId === day.dayId;
              const leftoverPct = Math.min(100, (day.leftoverPortions / maxLeftoverScale) * 100);
              const freshPct = (day.freshMeals / maxMealScale) * 100;
              const reusedPct = (day.reusedMeals / maxMealScale) * 100;

              return (
                <div
                  key={day.dayId}
                  className={`bar-column ${isSelected ? "selected" : ""} ${day.isPeak ? "is-peak" : ""}`}
                  onClick={() => setSelectedDay(day)}
                  onMouseEnter={() => setHoveredDay(day)}
                  onMouseLeave={() => setHoveredDay(null)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      setSelectedDay(day);
                    }
                  }}
                  title={`${day.fullLabel}: ${day.leftoverPortions.toFixed(1)} Portionen Reste`}
                >
                  {/* Peak Marker Badge on top */}
                  {day.isPeak && (
                    <div className="bar-peak-badge">
                      <span>MAX</span>
                    </div>
                  )}

                  {/* Top value indicator */}
                  <div className="bar-value-label">
                    {activeMetric === "leftovers" ? (
                      <span>{day.leftoverPortions.toFixed(1)}</span>
                    ) : (
                      <span>{day.freshMeals + day.reusedMeals}M</span>
                    )}
                  </div>

                  {/* Bar fill container */}
                  <div className="bar-track">
                    {activeMetric === "leftovers" ? (
                      <div
                        className={`bar-fill-leftover ${
                          day.leftoverPortions >= 2.0
                            ? "peak-fill"
                            : day.leftoverPortions >= 1.0
                            ? "medium-fill"
                            : "low-fill"
                        }`}
                        style={{ height: `${leftoverPct}%` }}
                      >
                        {/* Glow stripe on peak */}
                        {day.isPeak && <div className="bar-shimmer" />}
                      </div>
                    ) : (
                      /* Stacked bar: Reused on top, Fresh below */
                      <div className="bar-stacked-track">
                        {day.reusedMeals > 0 && (
                          <div
                            className="bar-stack-reused"
                            style={{ height: `${reusedPct}%` }}
                            title={`Reste: ${day.reusedMeals}`}
                          />
                        )}
                        <div
                          className="bar-stack-fresh"
                          style={{ height: `${freshPct}%` }}
                          title={`Frisch: ${day.freshMeals}`}
                        />
                      </div>
                    )}
                  </div>

                  {/* Day Label Bottom */}
                  <div className={`bar-day-label ${isSelected ? "active" : ""}`}>
                    <span>{day.shortLabel}</span>
                    {day.leftoverPortions >= 1.5 && <span className="warning-indicator" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Selected Day Detail Card */}
      <div className="day-detail-card">
        <div className="day-detail-header">
          <div className="day-detail-title-group">
            <span className="day-name">{selectedDay.fullLabel}</span>
            {selectedDay.isPeak ? (
              <span className="day-status-tag alert">
                <AlertCircle size={12} /> Wochen-Peak: {selectedDay.leftoverPortions.toFixed(1)} Portionen
              </span>
            ) : selectedDay.leftoverPortions <= 0.5 ? (
              <span className="day-status-tag optimal">
                <CheckCircle2 size={12} /> Vorbildlich: Kaum Reste
              </span>
            ) : (
              <span className="day-status-tag neutral">
                <Utensils size={12} /> {selectedDay.leftoverPortions.toFixed(1)} Port. Reste
              </span>
            )}
          </div>

          <div className="day-metrics-pills">
            <span className="metric-pill">
              <strong>{selectedDay.freshMeals}</strong> Frisch
            </span>
            <span className="metric-pill">
              <strong>{selectedDay.reusedMeals}</strong> Verwertet
            </span>
            <span className="metric-pill highlight">
              <strong>~{selectedDay.leftoverGrams}g</strong> Reste
            </span>
          </div>
        </div>

        {/* Meals breakdown list */}
        <div className="day-meals-box">
          <div className="meals-desc-row">
            <span className="desc-icon"><Utensils size={13} /></span>
            <div className="desc-text">
              <strong>Geplante Mahlzeiten:</strong>
              <p>{selectedDay.mealsDescription}</p>
            </div>
          </div>

          <div className="meals-desc-row leftover-row">
            <span className="desc-icon alert"><AlertCircle size={13} /></span>
            <div className="desc-text">
              <strong>Anfallende Reste:</strong>
              <p>{selectedDay.leftoverDescription}</p>
            </div>
          </div>
        </div>

        {/* Smart Advice & Action */}
        <div className="day-advice-strip">
          <div className="advice-left">
            <span className="advice-icon"><Sparkles size={14} /></span>
            <p className="advice-text">{selectedDay.smartAdvice}</p>
          </div>
          <button
            type="button"
            className="action-plan-btn"
            onClick={() => handleBookMealPlan(selectedDay)}
            title="Diesen Rest für den Folgetag einplanen"
          >
            <span>Verwerten</span>
            <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </section>
  );
}
