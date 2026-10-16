import React, { useState, useMemo, useEffect, useRef } from "react";
import { X, Sparkles, Dumbbell, Flame, Wallet, Zap, Apple, Send, Bot, Trash2, User, ArrowRight } from "lucide-react";
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

export interface CoachChatMessage {
  id: string;
  role: "user" | "coach";
  text: string;
  timestamp: string;
}

const DEFAULT_WELCOME_MESSAGE: CoachChatMessage = {
  id: "welcome-1",
  role: "coach",
  text: "Hallo! Ich bin dein Vorrat-Ernährungscoach. Ich kenne deine aktuellen Vorräte und helfe dir beim gesunden Kochen, optimalen Makros (High-Protein, Kaloriendefizit) und Rezept-Ideen ohne Reste. Was möchtest du heute kochen oder wissen?",
  timestamp: "Gerade eben",
};

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
  const [showGoalSelector, setShowGoalSelector] = useState(false);

  // Persistent Chat History
  const [messages, setMessages] = useState<CoachChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem("vorrat_coach_chat_history");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [DEFAULT_WELCOME_MESSAGE];
  });

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem("vorrat_fitness_goal", goal);
      localStorage.setItem("vorrat_dietary_pref", dietary);
    } catch {}
  }, [goal, dietary]);

  useEffect(() => {
    try {
      localStorage.setItem("vorrat_coach_chat_history", JSON.stringify(messages));
    } catch {}
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

  const handleClearChatHistory = () => {
    const fresh: CoachChatMessage[] = [
      {
        id: `welcome-${Date.now()}`,
        role: "coach",
        text: "Verlauf geleert! Wie kann ich dir heute mit deinen Vorräten helfen?",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ];
    setMessages(fresh);
    try {
      localStorage.setItem("vorrat_coach_chat_history", JSON.stringify(fresh));
    } catch {}
    onNotify("Coach-Chatverlauf geleert");
  };

  const handleAskCoach = async (queryText?: string) => {
    const textToAsk = queryText || chatMessage.trim();
    if (!textToAsk || isConsulting) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // 1. Add user message
    const userMsg: CoachChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: textToAsk,
      timestamp: timeStr,
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!queryText) setChatMessage("");
    setIsConsulting(true);

    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      const errReply: CoachChatMessage = {
        id: `coach-err-${Date.now()}`,
        role: "coach",
        text: "Bitte hinterlege deinen Google AI Studio API-Schlüssel in der App, um den Ernährungs-Coach zu nutzen.",
        timestamp: timeStr,
      };
      setMessages((prev) => [...prev, errReply]);
      setIsConsulting(false);
      return;
    }

    const pantrySummary = pantry
      .filter((p) => p.amount > 0)
      .map((p) => `${p.name} (${p.amount}${p.unit})`)
      .slice(0, 30)
      .join(", ");

    const goalDescriptions: Record<FitnessGoal, string> = {
      protein: "High-Protein & Muskelaufbau (maximiere Eiweiß, sättigend)",
      deficit: "Kaloriendefizit & Gewichtsreduktion (niedrige Kaloriendichte, viel Volumen)",
      budget: "Sparfuchs & Budget (kostengünstig, kein Zukauf)",
      quick: "Schnelle 15-Minuten Küche ohne Aufwand",
    };

    // Include last 3 conversation turns for context
    const recentHistory = messages
      .slice(-6)
      .map((m) => `${m.role === "user" ? "Nutzer" : "Coach"}: ${m.text}`)
      .join("\n");

    const prompt = `Du bist ein hochqualifizierter, pragmatischer Ernährungs-Coach in der App "Vorrat".
Ziel des Nutzers: ${goalDescriptions[goal]}.
Ernährungsform: ${dietary}.
Aktueller Vorrat des Nutzers: ${pantrySummary || "Reis, Eier, Nudeln, Tomaten"}.

Bisheriger Gesprächsverlauf:
${recentHistory}

Neue Frage des Nutzers:
"${textToAsk}"

ANWEISUNG:
- Antworte prägnant in 2-4 kurzen Aufzählungspunkten (maximal 120 Wörter).
- Schlage konkrete Kombinationen aus seinem Vorrat vor.
- Halte die Tonalität motivierend, modern und auf den Punkt. Kein langes Vorgeplänkel.`;

    try {
      const ai = new GoogleGenAI({ apiKey });
      const resp = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          temperature: 0.3,
        },
      });

      const responseText = resp.text?.trim() || "Keine Antwort erhalten.";
      const coachReply: CoachChatMessage = {
        id: `coach-${Date.now()}`,
        role: "coach",
        text: responseText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, coachReply]);
      onNotify("Coach-Antwort erhalten!");
    } catch (err: unknown) {
      console.error(err);
      const coachErr: CoachChatMessage = {
        id: `coach-err-${Date.now()}`,
        role: "coach",
        text: "Entschuldigung, der Ernährungs-Coach ist kurz nicht erreichbar. Bitte versuche es gleich erneut.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, coachErr]);
    } finally {
      setIsConsulting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-xl bg-white border border-slate-200 rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-300">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <Sparkles size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-slate-900">Smart Ernährungs-Coach</h3>
                <span className="text-[10px] font-bold bg-emerald-50 border border-emerald-200 text-emerald-700 px-2 py-0.5 rounded-full">
                  Gemini KI
                </span>
              </div>
              <p className="text-xs text-slate-500">Vorrat-Analyst & Makro-Optimierer</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleClearChatHistory}
              title="Chat-Verlauf leeren"
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
            >
              <Trash2 size={16} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
          
          {/* Collapsible Macro Summary Strip */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                <Dumbbell size={14} className="text-emerald-600" />
                Vorrat-Nährwerte ({pantryMacros.itemCount} erfasste Lebensmittel)
              </span>
              <button
                type="button"
                onClick={() => setShowGoalSelector((prev) => !prev)}
                className="text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer"
              >
                {showGoalSelector ? "Ziel einklappen ▲" : `Ziel: ${goal} ▼`}
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2 text-center pt-1">
              <div className="bg-white rounded-xl p-2 border border-slate-200 shadow-xs">
                <span className="text-[10px] text-slate-500 block">Protein</span>
                <strong className="text-xs text-emerald-600 font-extrabold">{pantryMacros.protein} g</strong>
              </div>
              <div className="bg-white rounded-xl p-2 border border-slate-200 shadow-xs">
                <span className="text-[10px] text-slate-500 block">Carbs</span>
                <strong className="text-xs text-sky-600 font-extrabold">{pantryMacros.carbs} g</strong>
              </div>
              <div className="bg-white rounded-xl p-2 border border-slate-200 shadow-xs">
                <span className="text-[10px] text-slate-500 block">Fett</span>
                <strong className="text-xs text-amber-600 font-extrabold">{pantryMacros.fat} g</strong>
              </div>
              <div className="bg-white rounded-xl p-2 border border-slate-200 shadow-xs">
                <span className="text-[10px] text-slate-500 block">Kalorien</span>
                <strong className="text-xs text-rose-600 font-extrabold">{pantryMacros.calories} kcal</strong>
              </div>
            </div>

            {/* Expandable Goals Selection */}
            {showGoalSelector && (
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 animate-in fade-in duration-200">
                <button
                  type="button"
                  onClick={() => setGoal("protein")}
                  className={`p-2 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                    goal === "protein"
                      ? "bg-emerald-50 border-emerald-500 text-emerald-950 shadow-xs"
                      : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <span className="font-bold block text-slate-900">💪 High Protein</span>
                  <span className="text-[10px] text-slate-500">Muskelaufbau & Sättigung</span>
                </button>
                <button
                  type="button"
                  onClick={() => setGoal("deficit")}
                  className={`p-2 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                    goal === "deficit"
                      ? "bg-emerald-50 border-emerald-500 text-emerald-950 shadow-xs"
                      : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <span className="font-bold block text-slate-900">🔥 Kaloriendefizit</span>
                  <span className="text-[10px] text-slate-500">Viel Volumen, wenig Kcal</span>
                </button>
                <button
                  type="button"
                  onClick={() => setGoal("budget")}
                  className={`p-2 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                    goal === "budget"
                      ? "bg-emerald-50 border-emerald-500 text-emerald-950 shadow-xs"
                      : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <span className="font-bold block text-slate-900">💰 Sparfuchs</span>
                  <span className="text-[10px] text-slate-500">Kein Zukauf nötig</span>
                </button>
                <button
                  type="button"
                  onClick={() => setGoal("quick")}
                  className={`p-2 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                    goal === "quick"
                      ? "bg-emerald-50 border-emerald-500 text-emerald-950 shadow-xs"
                      : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <span className="font-bold block text-slate-900">⚡ Express (&lt; 15m)</span>
                  <span className="text-[10px] text-slate-500">Minimaler Aufwand</span>
                </button>
              </div>
            )}
          </div>

          {/* Quick-Prompt Suggestions */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 hide-scrollbar">
            <button
              type="button"
              disabled={isConsulting}
              onClick={() => handleAskCoach("Was ist die proteinreichste Mahlzeit, die ich aus meinem Vorrat machen kann?")}
              className="text-[11px] whitespace-nowrap bg-slate-100 hover:bg-slate-200 border border-slate-200/80 rounded-full px-3 py-1.5 text-slate-700 font-medium transition-all cursor-pointer shrink-0"
            >
              💪 Protein-Boost
            </button>
            <button
              type="button"
              disabled={isConsulting}
              onClick={() => handleAskCoach("Schlage einen gesunden Snack aus meinem Vorrat gegen Heißhunger vor.")}
              className="text-[11px] whitespace-nowrap bg-slate-100 hover:bg-slate-200 border border-slate-200/80 rounded-full px-3 py-1.5 text-slate-700 font-medium transition-all cursor-pointer shrink-0"
            >
              🥗 Snack gegen Heißhunger
            </button>
            <button
              type="button"
              disabled={isConsulting}
              onClick={() => handleAskCoach("Was fehlt in meinem Vorrat, um mein Ernährungsziel optimal zu unterstützen?")}
              className="text-[11px] whitespace-nowrap bg-slate-100 hover:bg-slate-200 border border-slate-200/80 rounded-full px-3 py-1.5 text-slate-700 font-medium transition-all cursor-pointer shrink-0"
            >
              🛒 Was nachkaufen?
            </button>
          </div>

          {/* Chat Messages History */}
          <div className="space-y-3 pt-1">
            {messages.map((msg) => {
              const isCoach = msg.role === "coach";
              return (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 ${isCoach ? "justify-start" : "justify-end"}`}
                >
                  {isCoach && (
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot size={15} />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                      isCoach
                        ? "bg-slate-50 border border-slate-200 text-slate-800 shadow-xs"
                        : "bg-emerald-600 text-white font-medium shadow-sm"
                    }`}
                  >
                    <div className="whitespace-pre-line">{msg.text}</div>
                    <span
                      className={`text-[9px] block text-right mt-1.5 ${
                        isCoach ? "text-slate-400" : "text-emerald-100"
                      }`}
                    >
                      {msg.timestamp}
                    </span>
                  </div>

                  {!isCoach && (
                    <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                      <User size={15} />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Consulting / Typing Indicator */}
            {isConsulting && (
              <div className="flex gap-2.5 justify-start">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
                  <Bot size={15} />
                </div>
                <div className="bg-slate-50 border border-emerald-200 rounded-2xl px-4 py-3 text-xs text-slate-600 flex items-center gap-2 shadow-xs">
                  <span className="w-3.5 h-3.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                  <span>Coach analysiert deinen Vorrat...</span>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>
        </div>

        {/* Input Bar */}
        <div className="p-3 sm:p-4 border-t border-slate-100 bg-white sticky bottom-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAskCoach();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              placeholder="Frage an den Coach (z.B. Was koche ich heute?)"
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:bg-white transition-colors"
            />
            <button
              type="submit"
              disabled={isConsulting || !chatMessage.trim()}
              className="p-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl font-bold shadow-md shadow-emerald-600/20 transition-all shrink-0 cursor-pointer"
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
