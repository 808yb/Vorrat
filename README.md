# Forret — Vorrat, Budget & Smarte KI-Rezepte 🍳

Eine moderne Web-App zur intelligenten Vorratsverwaltung, Budgetplanung und Anti-Food-Waste-Rezeptempfehlung mit Google Gemini AI.

📖 **Ausführliche Dokumentation zu Stil, Vision & Konzept:** [APP_CONCEPT.md](./APP_CONCEPT.md)

---

## Features

- **Tinder-Style Rezept-Swipe-Deck:** Wische Rezepte nach rechts für Favoriten oder nach links zum Überspringen.
- **Smarter Vorratsabgleich:** Automatische Erkennung, welche Zutaten vorhanden sind und welche fehlen.
- **Kulinarische Äquivalente:** Erkennt Synonyme und Alternativen (z. B. Kirschtomaten $\leftrightarrow$ Cherrytomaten, Olivenöl $\leftrightarrow$ Sonnenblumenöl, Sahne $\leftrightarrow$ Hafercreme).
- **Gemini AI Rezeptsuche:** Generiere Rezepte in Echtzeit direkt passend zu deinem Vorrat oder suche gezielt nach Gerichten.
- **Interaktiver Kochmodus:** Schritt-für-Schritt-Anleitung mit integriertem Timer und Zutaten-Checkliste.
- **Einkaufsliste:** Fehlende Zutaten mit einem Klick auf die Einkaufsliste setzen.
- **Barcode-Scanner:** Schnelles Erfassen von Lebensmitteln.

---

## Lokale Installation

1. **Repository klonen:**
   ```bash
   git clone https://github.com/808yb/Vorrat.git
   cd Vorrat
   ```

2. **Abhängigkeiten installieren:**
   ```bash
   npm install
   ```

3. **Umgebungsvariablen konfigurieren:**
   Kopiere `.env.example` nach `.env.local` und trage deinen Google Gemini API Key ein:
   ```bash
   cp .env.example .env.local
   ```
   Inhalt von `.env.local`:
   ```env
   VITE_GEMINI_API_KEY=dein_gemini_api_key_hier
   ```

4. **Entwicklungsserver starten:**
   ```bash
   npm run dev
   ```
   Die App läuft unter `http://localhost:3000`.

---

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite
- **Styling:** CSS Design System, TailwindCSS 4, Motion (Framer Motion)
- **KI & Bildgenerierung:** Google Gemini API (`@google/genai`)
- **Scanner:** ZXing Library
