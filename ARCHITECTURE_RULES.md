# VORRAT – SYSTEM ARCHITECTURE & UI/UX RULES

> **Verbindliche Architektur- & Design-Vorgaben für die App Vorrat.**  
> Jede zukünftige Code-Änderung MUSS sich strikt an diese Vorgaben halten.

---

## 1. Design System & Styling

### Farbpalette (Calm Nordic Culinary)
- **Primär-Akzent:** Waldgrün (`#2d5a3e` / `#059669`), Soft-Mint Hintergrund (`#ebf3ee` / `#ecfdf5`), Border (`#c6dcce`).
- **Neutrals:** Hintergrund `#f8fafc`, Cards `#ffffff`, Rahmen `#e2e8f0` / `#cbd5e1`, Primärtext `#0f172a`, Sekundärtext `#64748b`.
- **Semantische Warnfarben (SPARSAM einsetzen!):**
  - Amber (`#d97706` / `#fef3c7`) für bald ablaufend oder Teilmenge vorhanden.
  - Rot (`#dc2626` / `#fee2e2`) **NUR** für abgelaufene Lebensmittel, fehlende Pflichtzutaten oder destruktive Aktionen (Löschen).
  - Dezent-Grün (`#059669`) für informative Zähler (z. B. offene Punkte im Einkauf-Tab).

### Keine visuellen Experimente
- **Maximal 2 verschiedene Badge-Farben** pro Card-Header.
- **Konsistente Button-Dimensionen:** Buttons in derselben Zeile MÜSSEN exakt dieselbe Höhe (`height: 32px` oder `36px`), denselben `border-radius` (`8px` oder `10px`) und `display: inline-flex; align-items: center; justify-content: center` haben.
- **Keine gequetschten Layouts:** Niemals lange Texte oder grüne Status-Boxen mitten in eine einzeilige Flexbox quetschen, sodass der Haupttext links abgeschnitten wird (z. B. `Hähnc...` oder `m.`).
  - Text-Container immer mit `min-width: 0` und `overflow: hidden; text-overflow: ellipsis` absichern.
  - Sekundäre Status-Infos (z. B. alternative Zutat oder Verbrauchs-Hinweise) immer in eine ruhige zweite Zeile darunter legen.

---

## 2. Komponenten-Architektur & Dateistruktur

### Single Source of Truth für Berechnungen
- **Vorrats-Abgleich & Synonyme:** AUSSCHLIESSLICH über `src/utils/pantryMatching.ts` (`findMatchingPantryItem`, `getRecipePantryBreakdown`). Niemals eigene Ad-hoc-String-Vergleiche in UI-Komponenten schreiben!
- **Ablauf- & Warn-Status (`expiringPantryCount`):** AUSSCHLIESSLICH über `isItemExpiringSoonOrCritical(item)`. Nur echte ablaufende oder kritische Lebensmittel (`mhdStatus === "soon" | "expired"` bzw. `daysLeft <= 3`) zählen. Gewürze, Saucen, unbegrenzte Artikel und reine Stückzahl-Mengen ohne MHD dürfen niemals als Alarm gewertet werden.
- **Rezept-Hilfsfunktionen & Kategorien:** AUSSCHLIESSLICH über `src/utils/recipeHelpers.ts` (`getRecipeCategory`, `decomposeCompositeIngredients`).
- **Storage-Keys:** AUSSCHLIESSLICH über `src/constants/storage.ts` (`STORAGE_KEYS`). Keine losen `"forret_..."`-Strings in Komponenten verteilen.

### Modals (`*Modal.tsx`)
- Jedes Modal **MUSS** über 3 Wege zuverlässig und sofort schließen:
  1. Klick auf den Backdrop (`e.target === e.currentTarget`)
  2. Den `✕`-Button (`min-width: 36px; min-height: 36px; z-index: 10`)
  3. Die `Escape`-Taste
- **Kein Modal darf beim App-Start automatisch auf `true` initialisiert werden.**

---

## 3. Strikte KI-, API- & Daten-Regeln

### VERBOT von Fake- / Mock-Daten
- **Keine erfundenen Rezepte:** Erfinde NIEMALS statische Dummy-Rezepte (wie „Cremige One-Pot Pasta nach X“) als heimlichen Fallback, wenn ein API- oder Scraper-Call fehlschlägt! Zeige bei Fehlern immer eine ehrliche, saubere Fehlermeldung im UI.
- **Keine Fake-Links:** Erfinde NIEMALS halluzinierte Web- oder Video-URLs (`example.com`, erfundene YouTube-IDs). Nutze stets garantierte Such-URLs oder authentisch importierte Links.

### Gemini API & Proxy (`src/utils/geminiProxy.ts` & `api/gemini.ts`)
- Jeder KI-Aufruf läuft zentral über `callGeminiProxy`.
- **Erlaubte Modell-Kaskade:**
  ```ts
  ["gemini-3.5-flash-lite", "gemini-3.8-flash", "gemini-flash-latest", "gemini-flash-lite-latest"]
  ```
- Verwende **NIEMALS** veraltete oder abgeschaltete Modelle (`gemini-2.0-flash`, `gemini-2.5-flash`).

### Zutaten-Domänenlogik
- **Frisches Gemüse vs. Gewürze:**
  - Frisches Gemüse (`Gemüse`, Einheiten `Stk.`, `g >= 80`, `Bund`, `Zehe`) darf NIEMALS mit Gewürzen (`Gewürz`, `Pulver`, `edelsüß`, `flocken`, `TL`, `Prise`) gematcht werden (insbesondere bei *Paprika*, *Knoblauch*, *Zwiebel*, *Chili*).
- **Zutaten-Granularität:**
  - Gewürze in Rezepten müssen immer als einzelne Einträge im `ingredients`-Array stehen, niemals gebündelt als `"Salz & Pfeffer"`.

---

## 4. Pflicht-Check vor jedem Abschluss (Definition of Done)

Vor dem Beenden JEDER Aufgabe müssen zwingend ausgeführt und bestanden werden:
1. `npx tsc --noEmit` (0 TypeScript-Fehler)
2. `npm test` (Alle Unit-Tests in `tests/suite.test.ts` grün)
3. Keine temporären Test-Skripte (`test_*.js`, `update_*.js`) im Projektverzeichnis hinterlassen.
