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

- **`src/utils/pantryMatching.ts`**
  - **Thema:** Intelligentes Zutaten-Matching & kulinarische Domänenlogik.
  - **Funktionen:**
    - `findMatchingPantryItem(name, pantry)`: Findet Vorratsartikel via Synonym-Wörterbuch, Lemmatisierung und Substring-Matching.
    - `getRecipePantryBreakdown(recipe, pantry)`: Detaillierte Analyse vorhandener vs. fehlender Zutaten, Trennung von Hauptzutaten und Gewürzen.
    - `deductIngredientFromPantryAmount(...)`: Subtrahiert benötigte Mengen sicher unter Berücksichtigung von Einheiten & physikalischen Dimensionen (z. B. Schutz vor Abzug von Gramm aus Millilitern).
    - `isItemExpiringSoonOrCritical(item)`: Prüft Haltbarkeit anhand echter MHDs unter Ausschluss langlebiger Gewürze und Saucen.
- **`src/utils/receiptOcr.ts`**
  - **Thema:** Kassenbon-Erkennung & Vorrats-Import.
  - **Funktionen:**
    - `scanReceiptWithGemini(base64Image, mimeType)`: Extrahiert Einkaufsartikel via Gemini Multimodal Vision API.
    - Non-Food-Filter (Ausschluss von Drogerieartikeln, Kosmetik, Tabak, etc.).
    - MHD-Schätzungs-Matrix für frische Produkte (Obst, Gemüse, Fleisch, Molkerei).
    - Mengen- und Preis-Normalisierung.
- **`src/utils/geminiRecipes.ts`**
  - **Thema:** KI-Rezept-Generierung & 2-Phasen Web-Scraper.
  - **Funktionen:**
    - `generateRecipeWithGemini(userQuery, pantry)`: Generiert maßgeschneiderte Rezepte passend zum Vorrat.
    - `fetchWebsiteContent(url, page)`: Ruft Webseiteninhalte über serverseitigen Scraper `/api/scrape` oder Jina-Fallback ab (kein `allorigins.win` mehr) mit strikter Blacklist für Upload- und Asset-URLs.
    - `fetchRecipeSubpageDetails(card)`: Extrahiert JSON-LD Schema.org (`@type: "Recipe"`), Print-Versionen und Unterseiten-Inhalte inklusive rekursiver Auflösung von `HowToSection` / `itemListElement`, `verifiedImageUrl` und `rawSteps`.
    - `extractInstructionsFromJsonLd(instructions)`: Rekursiver Parser zur 1:1-Erhaltung aller verschachtelten Rezept-Abschnitte und -Schritte.
    - `parseRawIngredientStrings(lines)`: Parst unstrukturierte JSON-LD Zutatentexte in strukturierte Zutateneinträge als sichere Basis für `CatalogRecipe`.
    - `repairAndExtractJsonRecipes(text)`: Robuster JSON-Repair-Parser, der Trailing Commas bereinigt und bei abgeschnittenem JSON (z.B. Token-Limit) alle intakten `{ ... }`-Objekte rettet.
    - `isGermanRecipeText(title, steps)` & `extractStepDuration(text)`: Intelligente Erkennung deutscher Rezepte für 1:1 direkte Schrittübernahme ohne Umformulierung.
    - `processBatchWithGemini(...)`: Verarbeitet Rezeptkarten in Batches (Größe 2) mit striktem Verbot von Zusammenfassungen sowie hartem Code-Guard für garantierten 1:1-Erhalt aller Originalschritte und JSON-LD Direktübernahme als Fallback.
    - `scrapeRecipesFromWebsiteWithGemini(...)`: Vollautomatischer Crawler über alle Seiten hinweg entlang von `nextPageUrl` mit striktem Domain- und Asset-Filter.
    - `resolveRecipeFoodImage(title, keywords)`: Fallback-Bilderauflösung bei Rezepten ohne authentisches Webseiten-Bild.
    - `convertRawToCatalogRecipe(...)` & `rehydrateCustomRecipe(...)`: Sichere Konvertierung und strikte Beibehaltung authentischer `verifiedImageUrl`-Werte sowie sicherer Fallback auf JSON-LD Zutaten und Schritte.
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
  - **Sicherheit:** Origin/Referer-Check (`localhost`, `127.0.0.1`, `*.vercel.app`), IP-basiertes Rate-Limiting (30 Req/Min), Payload-Größenbegrenzung (120 KB Text / 4 MB Media), serverseitige Modell-Fallback-Kaskade (max. 3 Versuche).
- **`api/scrape.ts`**
  - **Thema:** Universeller serverseitiger Web-Scraper für Rezept-Websites & Portale (Chefkoch, EatSmarter, Lecker, WordPress-Foodblogs wie Moribyan).
  - **Architektur:**
    - **Stufe 1:** Rekursive Extraktion von `Recipe` & `ItemList` aus allen `<script type="application/ld+json">` (`collectJsonLdObjects` durchsucht auch tief verschachtelte `@graph`-Arrays).
    - **Stufe 2:** Universeller Card-Scanner (`extractRecipeCardsAndLinks`) über `<article>`-Blöcke (sucht gezielt nach dem ersten echten Beitragslink und überspringt vorgelagerte Kategorie- und Tag-Links) mit Fallback auf Container (`.recipe-card`, `.entry`, `.post`) und Links. Liefert bis zu 40 Karten als `cards: Array<{ url, title, imageUrl }>`.
    - **Stufe 3:** Direkte Server-Extraktion des Hauptrezepts (`recipe: { title, imageUrl, ingredients, steps, prepTime, cookTime, totalTime, servings }`) für maximale Ausfallsicherheit.
    - Rekursives Parsen von `HowToSection` & `HowToStep` mit Erhaltung von `sectionTitle` sowie HTML-Listen-Fallback (`extractHtmlInstructionSteps`).
    - `isValidPaginationUrl(url, hostname)` & `extractNextPageUrl(html, baseUrl)`: Paginierungs-Erkennung mit Unterstützung für Kategorie-Seiten und ohne Blockade durch Filter.
    - `extractRecipeImage`: Sichere Extraktion aller 4 Schema.org Bildformate (String, String-Array, ImageObject, ImageObject-Array) + OpenGraph- & Twitter-Image.
    - `isValidRecipeUrl`: Strikter Hostname-, Domain- und Dateiendungsfilter (Schutz vor CDN-Bild-URLs wie `cloudinary` und Non-Recipe-Pfaden wie `/cookbook`).
  - **Sicherheit & Performance:** Schutz vor SSRF mit DNS-Prüfung privater IPs, IP-Rate-Limiting (unbegrenzt auf localhost/dev, 120 Req/60s in Production), 5 MB Stream-Größe mit Truncation statt 413-Fehler, automatisches Folgen von Weiterleitungen (max. 3) und Paginierung (`nextPageUrl`).

---

## 5. Shared Modals & Components (`src/components/`)

- **`src/components/UnifiedAddModal.tsx`**: Universelles Hinzufügen-Modal für den Vorrat. Vereint kontinuierlichen Kamera-Mehrfach-Barcodescan (mit Open Food Facts), Kassenbon-Fotoanalyse via Gemini Vision und manuelle Schnelleingabe in einer einzigen aufgeräumten Oberfläche.
- **`src/components/ActiveRecipeModal.tsx`**: Interaktive Vollbild-Kochanleitung mit Portionenrechner, Zutaten-Abhaken, Timer und Schrittnavigation.
- **`src/components/BarcodeScannerModal.tsx`**: Standalone Kamera-Barcodescanner mit Anbindung an Open Food Facts.
- **`src/components/ReceiptScannerModal.tsx`**: Standalone Kassenbon-Fotoanalyse via Gemini Vision.
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
