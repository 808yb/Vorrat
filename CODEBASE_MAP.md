# VORRAT – CODEBASE MAP & MODUL-INHALTSVERZEICHNIS

> **Zentrales Inhaltsverzeichnis nach Themen & Subthemen mit exakten Dateipfaden.**  
> **PFLICHT VOR JEDER AUFGABE:** Lies zuerst diese Datei, um ohne unnötige Suchschleifen direkt in die zuständige Datei zu springen.

---

## 1. Screens (`src/screens/`)

Die Benutzeroberfläche von Vorrat ist in thematisch getrennte Screens unterteilt:

- **`src/screens/PantryScreen.tsx`**
  - **Thema:** Vorratsverwaltung & Bestandsliste.
  - **Funktionen:** Anzeige & Filterung aller Vorratsartikel (Kühlschrank, Vorrat, Tiefkühler), MHD-Ampel (bald ablaufend, abgelaufen), Bestandsmengen anpassen, Integration von Barcode-Scanner & Kassenbon-OCR, manuelle Schnelleingabe.
- **`src/screens/CookScreen.tsx`**
  - **Thema:** Koch-Tab & Rezeptempfehlungen nach Vorratsbestand.
  - **Funktionen:** Match-Score-Berechnung anhand des Vorrats, KI-Rezept-Generierung über Gemini, Filter nach Kategorien, interaktive Schritt-für-Schritt-Kochanleitung (`ActiveRecipeModal`), portionsweises Kochen und automatischer Zutatenabzug aus dem Vorrat.
- **`src/screens/GroceriesScreen.tsx`**
  - **Thema:** Einkaufsliste & Bedarfsplanung.
  - **Funktionen:** Schnell-Eingabe von Einkäufen, Abhaken und Löschen, Übernahme fehlender Rezept-Zutaten mit einem Klick, automatische Einheiten-Konsolidierung.
- **`src/screens/RecipeLibraryScreen.tsx`**
  - **Thema:** Rezept-Katalog, Quellen-Verwaltung & Web-Scraper.
  - **Funktionen:** Importieren von externen Rezept-Websites (Foodblogs, Portale), 2-Phasen Batch-Scraping, automatisches Folgen von Paginierungslinks (`/page/2/`), Verwalten eigener Rezeptquellen, Volltextsuche & Filter.
- **`src/screens/SavedMealsScreen.tsx`**
  - **Thema:** Gespeicherte Rezepte & Favoriten.
  - **Funktionen:** Eigene Rezeptkreationen, importierte Rezepte, Favoriten-Markierung, Rezept-Editor (`EditRecipeModal`), Nährwert-Übersichten.
- **`src/screens/WeeklyMealPlannerScreen.tsx`**
  - **Thema:** Wochen-Mahlzeitenplaner.
  - **Funktionen:** Zuordnung von Rezepten zu Wochentagen (Frühstück, Mittag, Abendessen), automatische Ermittlung fehlender Zutaten und Transfer in die Einkaufsliste.

---

## 2. Core Domain Utils (`src/utils/`)

Sämtliche Kernlogik ist modularisiert in zuständige Utility-Dateien ausgelagert. UI-Komponenten rufen ausschließlich diese Funktionen auf:

- **`src/utils/scrapeParser.ts`**
  - **Thema:** Ausgelagerte HTML- & JSON-LD Parser-Funktionen für Scraper (`api/scrape.ts` und Dev-Middleware).
  - **Funktionen:**
    - `parseScrapedHtml(...)`: Zentrale Parsing-Pipeline für HTML-Seiten.
    - Schema.org JSON-LD Extraktion (`Recipe`, `ItemList`, verschachtelte `@graph`-Objekte).
    - `extractInstructionsFromJsonLd`: 1:1 Rekursive Extraktion von `HowToSection` und `HowToStep`.
    - `extractRecipeImage`: Sichere Auflösung aller 4 Schema.org Bildformate.
    - `extractRecipeCardsAndLinks`: Erkennt bis zu 40 Rezeptkarten aus `<article>`- und Link-Strukturen.
    - `isValidRecipeUrl` & `extractNextPageUrl`: Domain-Checks und Paginierung.
- **`src/utils/logger.ts`**
  - **Thema:** Zentrales diagnostisches Logging, Warning-Reporting & User-Error-Dispatch.
  - **Funktionen:**
    - `reportWarning(context, error)`: Logging nicht-kritischer Fehler/Warnungen zur Vermeidung unbemerkter leerer `catch {}`-Blöcke.
    - `reportUserError(context, userMessage, error)`: Loggt Fehler via `console.warn` und dispatcht synchron ein `window.dispatchEvent("vorrat:toast")` für 4-Sekunden UI-Error-Toasts.
- **`src/utils/recipeScraper.ts`**
  - **Thema:** Eigenständiges Modul für Web-Scraping, 2-Phasen Batch-Extraktion & Web-Crawler.
  - **Funktionen:**
    - `fetchWebsiteContent(url, page)`: Ruft Webseiteninhalte über serverseitigen Scraper via `POST /api/scrape` oder Jina-Fallback ab.
    - `extractRecipeCardsFromListing(content, baseUrl)`: Erkennt Rezeptkarten mit striktem Domain-Check (Zweiteilige TLDs wie `.co.uk`).
    - `fetchRecipeSubpageDetails(card)`: Extrahiert Schema.org JSON-LD Details via `POST /api/scrape`.
    - `extractInstructionsFromJsonLd(...)`: 1:1 Rekursive Extraktion von `HowToSection` und `HowToStep`.
    - `isGermanRecipeText(title, steps)` & `extractStepDuration(text)`: Intelligente Erkennung deutscher Rezepte für 1:1 direkte Schrittübernahme.
    - `processBatchWithGemini(...)`: Verarbeitet Rezeptkarten in Batches (Größe 2) mit striktem Verbot von Zusammenfassungen sowie hartem Code-Guard für garantierten 1:1-Erhalt aller Originalschritte.
    - `scrapeSinglePageFromWebsiteWithGemini(...)`: 2-Phasen-Scanner für eine einzelne Übersichtsseite mit Live-Progress-Callbacks.
    - `scrapeRecipesFromWebsiteWithGemini(...)` / `crawlRecipeWebsiteWithGemini(...)`: Vollautomatischer rekursiver Crawler über alle Paginierungsseiten.
    - `extractRecipeFromWebsite(url, pantry)`: Direkter Extraktionshelfer für Einzelrezepte.
- **`src/utils/geminiRecipes.ts`**
  - **Thema:** KI-Rezept-Generierung & Rezept-Chat (Scraper-Funktionen werden sauber aus `recipeScraper.ts` re-exportiert).
  - **Funktionen:**
    - `generateRecipeWithGemini(userQuery, pantry)`: Generiert maßgeschneiderte Rezepte passend zum Vorrat.
    - `importRecipeFromTextOrUrlWithGemini(...)`: Importiert Freitext oder URL-Inhalte in strukturierte CatalogRecipes.
    - `importRecipeFromVideoWithGemini(...)`: Video-Rezept-Extraktion via Gemini.
    - `askAboutRecipeWithGemini(...)`: Interaktiver KI-Küchenchef-Assistent während des Kochens.
    - Re-exportiert alle Web-Scraper- und Crawler-Funktionen für rückwärtskompatible Imports.
- **`src/utils/recipeHelpers.ts`**
  - **Thema:** Rezept-Hilfsfunktionen & Zutaten-Dekomposition.
  - **Funktionen:**
    - `decomposeCompositeIngredients(ingredients)`: Zerlegt kombinierte Gewürzzeilen (z. B. "Salz, Pfeffer und Muskat") in separate Zutateneinträge.
    - `getRecipeCategory(recipe)`: Automatische Klassifizierung in Hauptgericht, Frühstück, Snack, Dessert oder Backen.
    - `getSafeSteps(recipe)`: Validiert und normalisiert Zubereitungsschritte.
- **`src/utils/geminiProxy.ts`**
  - **Thema:** Zentraler Proxy-Client für Gemini API-Aufrufe.
  - **Funktionen:**
    - `callGeminiProxy(payload)`: Leitet Anfragen an `/api/gemini` weiter mit automatischem Fallback auf direkte Client-API bei lokaler Entwicklung.
    - `callGeminiCascade(...)`: Modell-Fallback-Kaskade (`gemini-3.5-flash-lite`, `gemini-3.8-flash`, `gemini-flash-latest`).
- **`src/utils/supabaseClient.ts`**
  - **Thema:** Supabase-Backend-Client.
  - **Funktionen:** Initialisierung des Supabase-Clients für Authentifizierung und Cloud-Synchronisation.

---

## 3. Hooks & State (`src/hooks/` & `src/constants/`)

- **`src/hooks/usePantryManager.ts`**
  - **Thema:** Zentrales State-Management & Mutations-Handler für Vorrat, Einkaufsliste und Lebensmittelretter-Statistiken.
  - **Funktionen:**
    - Verwaltet State & Persistierung für `pantry`, `groceries` und `foodWasteSaved`.
    - `handleFullReset()`: Bereinigt die App vollständig auf `[]` (ohne Wiederherstellung von Demo-Daten).
    - Handhabt Bestandsänderungen, Lagerort-Updates, Löschen und Bearbeiten von Vorratsartikeln.
    - Vollautomatische Verbuchung importierter Kassenbons inklusive Ausgaben-Tracking (`processReceiptImport`).
    - Einheiten-sicherer Koch-Abzug (`cookRecipe`) mit automatischem Einkaufslisten-Restock für zuneige gehende Zutaten.
    - Einkaufsabschluss (`completeShopping`) mit intelligenter Übernahme in den Vorrat und automatischer MHD-Setzung.
- **`src/hooks/useRecipeManager.ts`**
  - **Thema:** Zentrales State-Management & Orchestrierung für Rezepte, Favoriten, Wochenplaner und Kochen.
  - **Funktionen:**
    - Verwaltet State & Persistierung für `customRecipes`, `allRecipes` (Katalog + eigene Kreationen), `favorites` und `plannedMeals`.
    - Behandelt Rezept-Aktionen: Hinzufügen, Bearbeiten, Löschen, Merken/Favorisieren.
    - Wochenplan-Aktionen: Hinzufügen, Verschieben, Portionen anpassen, Leeren und Auto-Planen.
    - Kochanweisungs-Routing (`handleStartCookingFromPlanner`) und Reste-Verwertungsfilter (`handleCookFromExpiring`).
    - Vollständiger Rezept-Wipe (`handleWipeRecipes`).
- **`src/hooks/useCloudSync.ts`**
  - **Thema:** Cloud-Synchronisation mit Supabase.
  - **Funktionen:**
    - Bidirektionaler Sync zwischen lokalem `localStorage` und Supabase Cloud Database.
    - Debounced Auto-Save (1,5 Sekunden Verzögerung nach Änderungen).
    - Status-Tracking (`idle`, `saving`, `saved`, `error`, `offline`).
    - Guard `hasCompletedInitialCloudLoad`: Verhindert Überschreiben von Cloud-Daten vor dem ersten vollständigen Laden.
- **`src/constants/storage.ts`**
  - **Thema:** Lokaler Speicher & Daten-Schemas.
  - **Funktionen:**
    - `STORAGE_KEYS`: Zentrale Konstanten für alle `localStorage`-Keys mit einheitlichem `vorrat_`-Präfix.
    - `migrateLegacyStorageKeys()`: Automatische Migration alter `forret_*`-Keys beim App-Start ohne Datenverlust.

---

## 4. Backend / Serverless Functions (`api/`)

- **`api/gemini.ts`**
  - **Thema:** Sichere Serverless-Relay-Funktion für Google Gemini API.
  - **Sicherheit:** Origin/Referer-Check (`localhost`, `127.0.0.1`, `*.vercel.app` sowie konfigurierbares `process.env.ALLOWED_ORIGINS`), IP-basiertes Rate-Limiting (**25 Req/60s pro IP** synchron in Kommentar, Code und HTTP 429), Payload-Größenbegrenzung (120 KB Text / 4 MB Media), serverseitige Modell-Fallback-Kaskade (max. 3 Versuche).
- **`api/scrape.ts`**
  - **Thema:** Universeller, schlanker (<350 Zeilen) serverseitiger Web-Scraper für Rezept-Websites.
  - **Sicherheit & Performance:**
    - Bevorzugt `POST /api/scrape` mit Body `{ url }` (verhindert GET-Image-Tag CSRF).
    - Unterstützt `ALLOWED_ORIGINS`.
    - Schutz vor SSRF mit DNS-Prüfung privater IPs.
    - IP-Rate-Limiting: **120 Req/60s pro IP** (für bis zu 40 Karten-Batch-Lookups).
    - Striktes 5 MB Streaming-Limit ohne unbegrenztes `response.text()`-Fallback.
    - Delegiert HTML- & JSON-LD Parsing an `src/utils/scrapeParser.ts`.

---

## 5. Shared Modals & Components (`src/components/`)

- **`src/components/AppHeader.tsx`**: Schlanker Header mit Brand-Logo, aktiver Tab-Anzeige und Cloud-Sync-Status-Badge (`"Speichert…"`, `"Gespeichert"`, `"Sync-Fehler"`, `"Lokal"`).
- **`src/components/BottomNav.tsx`**: Mobile Bottom-Navigation / Tab-Bar (`Vorrat`, `Entdecken/Kochen`, `Wochenplan`, `Gespeichert`, `Einkaufsliste`) mit dynamischen Badges für ablaufende MHD-Artikel und offene Einkäufe.
- **`src/components/ToastBanner.tsx`**: Globale Toast- & Feedback-Benachrichtigungsleiste.
- **`src/components/AppModals.tsx`**: Zentraler Modal-Orchestrator mit `Suspense`-Boundary. Bündelt alle App-Overlays (`HouseholdSyncModal`, `AccountResetModal`, `UnifiedAddModal`, `EditPantryItemModal`, `PwaInstallBanner`, `RecipeImportModal`).
- **`src/components/UnifiedAddModal.tsx`**: Schlankes Haupt-Modal für Vorrats-Eingaben. Delegiert Kamera/Barcode und Kassenbon-OCR an Subkomponenten:
  - **`src/components/add-modal/BarcodeScanTab.tsx`**: Hardware-beschleunigter EAN-Scanner mit ZXing-Fallback, Multi-Scan-Tray und Open Food Facts Anbindung.
  - **`src/components/add-modal/ReceiptScanTab.tsx`**: Kassenbon-Fotoupload, Gemini Vision OCR, Frische-Klassen-Ampel, automatische MHD-Zuweisung und Einkaufslisten-Abgleich.
- **`src/components/ActiveRecipeModal.tsx`**: Interaktive Vollbild-Kochanleitung mit Portionenrechner, Zutaten-Abhaken, Timer und Schrittnavigation.
- **`src/components/CookingModal.tsx`**: Modales Koch-Erlebnis mit Fokus- & Gesamtschrittansicht, Zutaten-Checkliste und integriertem Küchen-Timer.
  - **`src/components/cooking/RecipeStepsAccordion.tsx`**: Ausklappbares Akkordeon für Zubereitungsschritte mit Checkboxen, Fortschrittszähler und Direkt-Aktionen auf Rezeptkarten.
  - **`src/components/cooking/RecipeChefChatModal.tsx`**: Interaktives Overlay für Fragen an den KI-Küchenchef während des Kochens mit 1-Klick-Schnellfragen und Chatverlauf.
- **`src/components/EditRecipeModal.tsx`**: Modal zur manuellen Bearbeitung von Rezeptdetails, Zutaten und Zubereitungsschritten.
- **`src/components/HouseholdSyncModal.tsx`**: Account-Login & Cloud-Sync-Status-Übersicht.
- **`src/components/AuthModal.tsx`**: Registrierung und Anmeldung mit E-Mail / Passwort.
- **`src/components/UiIcons.tsx`**: Zentrale SVG-Icons für konsistentes UI ohne externe Emojis.

---

## 6. Lokale Entwicklung, PWA & Tooling

- **`public/sw.js`**: PWA Service Worker mit striktem `GET`-Only-Guard, automatischem Ausschluss von `/api/`, `localhost`, `127.0.0.1`, `/@vite` und `/src/` sowie `skipWaiting()` auf `install` zur Vermeidung von Zombie-Workers.
- **`src/main.tsx`**: Aktives Deregistrieren und Bereinigen alter Service Worker und Cache-Instanzen beim Start auf `localhost` / `127.0.0.1`.
- **`vite.config.ts`**: Vite-Konfiguration inklusive lokaler Dev-Server-Middleware (`localScrapeDevPlugin`) für `/api/scrape` und `/api/gemini` (keine externen Proxy-Abhängigkeiten / kein 502 Bad Gateway).
- **`tests/suite.test.ts`**: Test-Suite für Kernfunktionen (Pantry-Matching, OCR-Filter, Migration, Dimension-Checks, Scraper-Integrität, Service Worker Hardening).

