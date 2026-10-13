# Forret — Vorrat, Budget & Smarte KI-Rezepte 🍳

Eine moderne Web-App zur intelligenten Vorratsverwaltung, Budgetplanung und Anti-Food-Waste-Rezeptempfehlung mit Google Gemini AI.

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

## Deployment (Online gehen)

### Option A: Vercel (Empfohlen)
1. Gehe auf [vercel.com](https://vercel.com) und verbinde deinen GitHub-Account.
2. Wähle das Repository `808yb/Vorrat` aus.
3. Füge unter **Environment Variables** folgende Variable hinzu:
   - **Key:** `VITE_GEMINI_API_KEY`
   - **Value:** `[Dein Gemini API Key]`
4. Klicke auf **Deploy**. Vercel baut und hostet die Vite-App automatisch.

### Option B: Netlify
1. Gehe auf [netlify.com](https://netlify.com) und erstelle eine neue Site aus dem GitHub-Repo.
2. Build Command: `npm run build`
3. Publish Directory: `dist`
4. Setze `VITE_GEMINI_API_KEY` in den Environment Variables.
5. Klicke auf **Deploy**.

---

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite
- **Styling:** CSS Design System, TailwindCSS 4, Motion (Framer Motion)
- **KI & Bildgenerierung:** Google Gemini API (`@google/genai`)
- **Scanner:** ZXing Library
