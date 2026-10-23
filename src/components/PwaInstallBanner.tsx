import { useState, useEffect } from "react";
import { Download, Share, PlusSquare, X } from "lucide-react";
import { STORAGE_KEYS } from "../constants/storage";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isDismissed, setIsDismissed] = useState(true);

  useEffect(() => {
    // Check if already in standalone mode
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);

    if (standalone) return;

    // Check if user previously dismissed
    const dismissedTime = localStorage.getItem(STORAGE_KEYS.PWA_DISMISSED);
    if (dismissedTime && Date.now() - parseInt(dismissedTime, 10) < 7 * 24 * 60 * 60 * 1000) {
      // Dismissed within last 7 days
      return;
    }

    setIsDismissed(false);

    // Detect iOS
    const ua = window.navigator.userAgent.toLowerCase();
    const isAppleIos = /iphone|ipad|ipod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;
    setIsIos(isAppleIos);

    // Listen for beforeinstallprompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setIsDismissed(true);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem(STORAGE_KEYS.PWA_DISMISSED, Date.now().toString());
  };

  if (isStandalone || isDismissed) {
    return null;
  }

  return (
    <aside
      aria-label="PWA Installation"
      className="fixed bottom-20 left-4 right-4 z-40 max-w-lg mx-auto bg-slate-900/95 backdrop-blur-xl border border-emerald-500/30 rounded-2xl p-4 shadow-2xl text-slate-100 flex items-start gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300"
    >
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20 text-white font-bold text-lg">
        V
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h4 className="font-semibold text-sm text-white">Vorrat als App installieren</h4>
          <button
            onClick={handleDismiss}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
            title="Schließen"
          >
            <X size={16} />
          </button>
        </div>

        <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
          Funktioniert komplett offline im Supermarkt und startet im Vollbild ohne Browser-Leiste.
        </p>

        {isIos ? (
          <div className="mt-2.5 flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 rounded-lg px-2.5 py-1.5 font-medium">
            <span>Tippe auf Teilen</span>
            <Share size={13} className="inline text-emerald-300" />
            <span>&gt; Zum Home-Bildschirm</span>
            <PlusSquare size={13} className="inline text-emerald-300" />
          </div>
        ) : deferredPrompt ? (
          <button
            onClick={handleInstallClick}
            className="mt-2.5 inline-flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 text-xs font-bold px-3 py-1.5 rounded-lg shadow transition-all cursor-pointer"
          >
            <Download size={14} />
            Jetzt installieren
          </button>
        ) : null}
      </div>
    </aside>
  );
}
