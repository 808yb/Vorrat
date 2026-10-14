import { useState, useMemo, useEffect } from "react";
import { X, Sparkles, Dumbbell, Flame, Wallet, Zap, Apple, Send, Bot, Check, ArrowRight } from "lucide-react";
import { GoogleGenAI } from "@google/genai";
import { getGeminiApiKey } from "../utils/geminiRecipes";
import { type PantryItem } from "../App";

interface NutritionCoachModalProps {
  isOpen: boolean;
  onClose: () => void;
  pantry: PantryItem[];
  onNotify: (msg: string) => void;
  onCookRecipeByTitle?: (title: string) => void;
}

export type FitnessGoal = "protein" | "deficit" | "budget" | "quick";

export function NutritionCoachModal({
  isOpen,
  onClose,
  pantry,
  onNotify,
}: NutritionCoachModalProps) {
  const [goal, setGoal] = useState<FitnessGoal>(() => {
    try {
      const saved = localStorage.getItem("vorrat_fitness_goal");
      return (saved as FitnessGoal) || "protein";
    } catch {
      return "protein";
    }
  });

  const [dietary, setDietary] = useState<string>(() => {
    try {
      return localStorage.getItem("vorrat_dietary_pref") || "Alles";
    } catch {
      return "Alles";
    }
  });

  const [chatMessage, setChatMessage] = useState("");
  const [isConsulting, setIsConsulting] = useState(false);
  const [coachResponse, setCoachResponse] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem("vorrat_fitness_goal", goal);
      localStorage.setItem("vorrat_dietary_pref", dietary);
    } catch {}
  }, [goal, dietary]);

  // Local Macro Calculation (Zero API tokens!)
  const pantryMacros = useMemo(() => {
    let totalProt = 0;
    let totalCarbs = 0;
    let totalFat = 0;
    let totalCals = 0;
    let itemCount = 0;

    for (const item of pantry) {
      if (item.isUnlimited || item.amount <= 0) continue;
      const factor = item.unit === "g" || item.unit === "ml" ? item.amount / 100 : item.amount * 0.5;
      totalProt += (item.proteinPer100g || 0) * factor;
      totalCarbs += (item.carbsPer100g || 0) * factor;
      totalFat += (item.fatPer100g || 0) * factor;
      totalCals += (item.caloriesPer100g || 0) * factor;
      itemCount++;
    }

    return {
      protein: Math.round(totalProt),
      carbs: Math.round(totalCarbs),
      fat: Math.round(totalFat),
      calories: Math.round(totalCals),
      itemCount,
    };
  }, [pantry]);

  if (!isOpen) return null;

  const handleAskCoach = async (queryText?: string) => {
    const textToAsk = queryText || chatMessage.trim();
    if (!textToAsk) return;

    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      setCoachResponse("Bitte hinterlege deinen Google AI Studio API-Schlüssel, um den Coach zu nutzen.");
      return;
    }

    setIsConsulting(true);
    setCoachResponse(null);

    const pantrySummary = pantry
      .filter((p) => p.amount > 0)
      .map((p) => `${p.name} (${p.amount}${p.unit})`)
      .slice(0, 25)
      .join(", ");

    const goalDescriptions: Record<FitnessGoal, string> = {
      protein: "High-Protein & Muskelaufbau (maximiere Eiweiß, sättigend)",
      deficit: "Kaloriendefizit & Gewichtsreduktion (niedrige Kaloriendichte, viel Volumen)",
      budget: "Sparfuchs & Budget (kostengünstig, kein Zukauf)",
      quick: "Schnelle 15-Minuten Küche ohne Aufwand",
    };

    const prompt = `Du bist ein hochqualifizierter, pragmatischer Ernährungs-Coach in der App "Vorrat".
Ziel des Nutzers: ${goalDescriptions[goal]}.
Ernährungsform: ${dietary}.
Aktueller Vorrat des Nutzers: ${pantrySummary || "Reis, Eier, Nudeln, Tomaten"}.

Frage/Anliegen des Nutzers:
"${textToAsk}"

ANWEISUNG:
- Antworte prägnant in 2-4 kurzen Aufzählungspunkten (maximal 120 Wörter).
- Schlage konkrete Kombinationen aus seinem Vorrat vor.
- Halte die Tonalität motivierend, modern und auf den Punkt. Kein langes Vorgeplänkel.`;

    try {
      const ai = new GoogleGenAI({ apiKey });
      const resp = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          temperature: 0.3,
        },
      });

      const responseText = resp.text?.trim() || "Keine Antwort erhalten.";
      setCoachResponse(responseText);
      if (!queryText) setChatMessage("");
      onNotify("Coach-Empfehlung bereit!");
    } catch (err: unknown) {
      console.error(err);
      setCoachResponse("Entschuldigung, der Ernährungs-Coach ist kurz nicht erreichbar. Bitte versuche es gleich erneut.");
    } finally {
      setIsConsulting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-xl bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-300">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <Bot size={18} />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Smart Ernährungs-Coach</h3>
              <p className="text-xs text-slate-400">Vorrat-Makros & sparsame KI-Ernährungstipps</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* Vorrat-Makro Dashboard (0 Token Kosten!) */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Apple size={14} className="text-emerald-400" />
                Vorrat Nährwert-Kapazität
              </span>
              <span className="text-[11px] text-slate-400">{pantryMacros.itemCount} erfasste Zutaten</span>
            </div>

            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                <span className="block text-[10px] text-emerald-400 font-medium">Protein</span>
                <span className="text-sm font-bold text-slate-100">{pantryMacros.protein}g</span>
              </div>
              <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                <span className="block text-[10px] text-amber-400 font-medium">Carbs</span>
                <span className="text-sm font-bold text-slate-100">{pantryMacros.carbs}g</span>
              </div>
              <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                <span className="block text-[10px] text-rose-400 font-medium">Fett</span>
                <span className="text-sm font-bold text-slate-100">{pantryMacros.fat}g</span>
              </div>
              <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                <span className="block text-[10px] text-blue-400 font-medium">Kalorien</span>
                <span className="text-sm font-bold text-slate-100">{pantryMacros.calories}</span>
              </div>
            </div>
          </div>

          {/* Goals Selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 block">Dein aktuelles Ziel</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setGoal("protein")}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                  goal === "protein"
                    ? "bg-emerald-950/40 border-emerald-500/60 text-white shadow-sm"
                    : "bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
              >
                <Dumbbell size={16} className={goal === "protein" ? "text-emerald-400" : "text-slate-500"} />
                <div>
                  <span className="text-xs font-bold block text-slate-200">High Protein</span>
                  <span className="text-[10px] text-slate-400">Muskelaufbau & Sättigung</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setGoal("deficit")}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                  goal === "deficit"
                    ? "bg-emerald-950/40 border-emerald-500/60 text-white shadow-sm"
                    : "bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
              >
                <Flame size={16} className={goal === "deficit" ? "text-emerald-400" : "text-slate-500"} />
                <div>
                  <span className="text-xs font-bold block text-slate-200">Defizit / Abnehmen</span>
                  <span className="text-[10px] text-slate-400">Wenig Kalorien, viel Volumen</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setGoal("budget")}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                  goal === "budget"
                    ? "bg-emerald-950/40 border-emerald-500/60 text-white shadow-sm"
                    : "bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
              >
                <Wallet size={16} className={goal === "budget" ? "text-emerald-400" : "text-slate-500"} />
                <div>
                  <span className="text-xs font-bold block text-slate-200">Sparfuchs / Budget</span>
                  <span className="text-[10px] text-slate-400">&lt; 2,50 € pro Mahlzeit</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setGoal("quick")}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                  goal === "quick"
                    ? "bg-emerald-950/40 border-emerald-500/60 text-white shadow-sm"
                    : "bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
              >
                <Zap size={16} className={goal === "quick" ? "text-emerald-400" : "text-slate-500"} />
                <div>
                  <span className="text-xs font-bold block text-slate-200">Express (&lt; 15 Min)</span>
                  <span className="text-[10px] text-slate-400">Minimaler Kochaufwand</span>
                </div>
              </button>
            </div>
          </div>

          {/* Quick-Consult 1-Tap Buttons */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 block">Schnelle Vorrat-Checks</label>
            <div className="flex flex-col gap-1.5">
              <button
                type="button"
                disabled={isConsulting}
                onClick={() => handleAskCoach("Was ist die proteinreichste Mahlzeit, die ich aus meinem aktuellen Vorrat zaubern kann?")}
                className="text-left text-xs bg-slate-800/70 hover:bg-slate-800 border border-slate-700/60 rounded-xl px-3.5 py-2.5 text-slate-200 flex items-center justify-between group transition-all"
              >
                <span>⚡ Proteinreichste Mahlzeit aus aktuellem Vorrat</span>
                <ArrowRight size={14} className="text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
              </button>

              <button
                type="button"
                disabled={isConsulting}
                onClick={() => handleAskCoach("Schlage einen gesunden Snack aus meinem Vorrat vor, wenn ich Heißhunger habe.")}
                className="text-left text-xs bg-slate-800/70 hover:bg-slate-800 border border-slate-700/60 rounded-xl px-3.5 py-2.5 text-slate-200 flex items-center justify-between group transition-all"
              >
                <span>🥗 Gesunder Snack gegen Heißhunger</span>
                <ArrowRight size={14} className="text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
              </button>

              <button
                type="button"
                disabled={isConsulting}
                onClick={() => handleAskCoach("Was fehlt in meinem Vorrat, um mein Ernährungsziel optimal zu unterstützen?")}
                className="text-left text-xs bg-slate-800/70 hover:bg-slate-800 border border-slate-700/60 rounded-xl px-3.5 py-2.5 text-slate-200 flex items-center justify-between group transition-all"
              >
                <span>🛒 Was sollte ich als Nächstes nachkaufen?</span>
                <ArrowRight size={14} className="text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
              </button>
            </div>
          </div>

          {/* Coach Response Display */}
          {(isConsulting || coachResponse) && (
            <div className="bg-slate-950 border border-emerald-500/30 rounded-2xl p-4 space-y-2 animate-in fade-in duration-300">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                <Sparkles size={14} />
                <span>Coach-Empfehlung</span>
              </div>
              {isConsulting ? (
                <div className="flex items-center gap-2 text-slate-400 text-xs py-2">
                  <span className="w-3.5 h-3.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  <span>Coach berechnet optimale Vorrat-Kombination...</span>
                </div>
              ) : (
                <div className="text-xs text-slate-200 leading-relaxed whitespace-pre-line">
                  {coachResponse}
                </div>
              )}
            </div>
          )}

          {/* Custom Question Field */}
          <div className="space-y-2 pt-1">
            <label className="text-xs font-semibold text-slate-300 block">Individuelle Frage an den Coach</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAskCoach();
                }}
                placeholder="z.B. Kann ich Sahne ersetzen? Wie koche ich leichter?"
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
              <button
                type="button"
                disabled={isConsulting || !chatMessage.trim()}
                onClick={() => handleAskCoach()}
                className="p-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 rounded-xl font-bold transition-all shrink-0 cursor-pointer"
              >
                <Send size={15} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
