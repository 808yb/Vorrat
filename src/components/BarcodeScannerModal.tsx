import React, { useState } from 'react';
import { X, Scan, Camera, Sparkles, Check, ArrowRight, RotateCcw } from 'lucide-react';
import { OpenFoodFactsProduct, PantryItem } from '../types';
import { lookupBarcode } from '../utils/helpers';
import { MOCK_OPEN_FOOD_FACTS_DATABASE } from '../data/mockData';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddProduct: (item: Omit<PantryItem, 'id'>) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onAddProduct,
}) => {
  const [scannedCode, setScannedCode] = useState<string>('');
  const [productData, setProductData] = useState<OpenFoodFactsProduct | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(true);
  const [customQuantity, setCustomQuantity] = useState<number>(0);
  const [customMinQty, setCustomMinQty] = useState<number>(0);

  if (!isOpen) return null;

  const handleScanCode = (code: string) => {
    setScannedCode(code);
    setIsScanning(false);
    const result = lookupBarcode(code);
    if (result) {
      setProductData(result);
      setCustomQuantity(result.default_amount);
      setCustomMinQty(result.default_min_qty);
    }
  };

  const handleResetScan = () => {
    setScannedCode('');
    setProductData(null);
    setIsScanning(true);
  };

  const handleConfirmAdd = () => {
    if (!productData) return;

    // Convert estimated price to pricePerUnit
    let pricePerUnit = 0.5;
    if (productData.default_unit === 'g' || productData.default_unit === 'ml') {
      pricePerUnit = (productData.estimated_price / (productData.default_amount / 100));
    } else {
      pricePerUnit = productData.estimated_price / (productData.default_amount || 1);
    }

    onAddProduct({
      name: productData.product_name,
      brand: productData.brands,
      category: productData.default_category,
      currentQuantity: customQuantity,
      unit: productData.default_unit,
      minQuantity: customMinQty,
      pricePerUnit: Math.round(pricePerUnit * 100) / 100,
      caloriesPer100g: productData.nutriments['energy-kcal_100g'] || 0,
      proteinPer100g: productData.nutriments.proteins_100g || 0,
      carbsPer100g: productData.nutriments.carbohydrates_100g || 0,
      fatPer100g: productData.nutriments.fat_100g || 0,
      barcode: productData.code,
      nutriScore: (productData.nutrition_grades?.toUpperCase() as any) || 'A',
    });

    onClose();
  };

  const sampleProducts = Object.values(MOCK_OPEN_FOOD_FACTS_DATABASE);

  const getNutriScoreColor = (grade?: string) => {
    switch (grade?.toLowerCase()) {
      case 'a':
        return 'bg-emerald-600 text-white';
      case 'b':
        return 'bg-lime-600 text-white';
      case 'c':
        return 'bg-amber-500 text-slate-950 font-black';
      case 'd':
        return 'bg-orange-500 text-white';
      case 'e':
        return 'bg-rose-600 text-white';
      default:
        return 'bg-slate-700 text-white';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <Scan className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-semibold text-lg text-white">Barcode-Scanner</h2>
              <p className="text-[11px] text-slate-400">Open Food Facts API Format</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto px-5 py-4 space-y-4">
          {isScanning ? (
            <>
              {/* Camera Simulation Viewfinder */}
              <div className="relative w-full h-48 bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden flex flex-col items-center justify-center shadow-inner">
                {/* Background Camera pattern */}
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#34d399_1px,transparent_1px)] [background-size:16px_16px]" />

                {/* Laser animation line */}
                <div className="absolute inset-x-8 h-0.5 bg-rose-500 shadow-[0_0_12px_#f43f5e] animate-pulse top-1/2 -translate-y-1/2" />

                {/* Target Frame Corners */}
                <div className="relative w-44 h-28 border-2 border-emerald-400/40 rounded-xl flex items-center justify-center">
                  <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-emerald-400 rounded-tl-sm" />
                  <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-emerald-400 rounded-tr-sm" />
                  <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-emerald-400 rounded-bl-sm" />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-emerald-400 rounded-br-sm" />

                  <div className="flex flex-col items-center gap-1 text-slate-400">
                    <Camera className="w-6 h-6 text-emerald-400/80 animate-bounce" />
                    <span className="text-[11px] font-medium tracking-tight">EAN zentrieren</span>
                  </div>
                </div>

                <div className="absolute bottom-2 text-[10px] text-slate-500 font-mono">
                  Camera API: Mock Emulation Aktiv
                </div>
              </div>

              {/* Quick Scan One-Click Chips */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-300">
                    Test-Barcodes scannen (1-Klick)
                  </span>
                  <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Echte OFF-Daten
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {sampleProducts.slice(0, 6).map((item) => (
                    <button
                      key={item.code}
                      onClick={() => handleScanCode(item.code)}
                      className="p-2.5 bg-slate-800/80 hover:bg-slate-800 hover:border-emerald-500/50 border border-slate-700/80 rounded-xl text-left transition-all group flex flex-col justify-between"
                    >
                      <div className="text-xs font-medium text-slate-200 group-hover:text-emerald-300 truncate">
                        {item.product_name}
                      </div>
                      <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400 font-mono">
                        <span>{item.quantity_str}</span>
                        <span className="px-1 py-0.2 rounded bg-slate-700 text-slate-300 font-bold uppercase">
                          Nutri {item.nutrition_grades?.toUpperCase()}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Manual Barcode Input */}
              <div className="pt-2 border-t border-slate-800">
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  EAN / Barcode manuell eingeben
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="z. B. 4008400404127"
                    value={scannedCode}
                    onChange={(e) => setScannedCode(e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    onClick={() => scannedCode.trim() && handleScanCode(scannedCode.trim())}
                    disabled={!scannedCode.trim()}
                    className="px-4 py-2 bg-emerald-500 disabled:opacity-50 text-slate-950 font-bold text-sm rounded-xl hover:bg-emerald-400 transition-colors"
                  >
                    Scannen
                  </button>
                </div>
              </div>
            </>
          ) : productData ? (
            /* Open Food Facts API Result View */
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="p-4 bg-slate-800/90 border border-slate-700 rounded-2xl relative">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[11px] text-emerald-400 font-semibold tracking-wide uppercase">
                      Open Food Facts Treffer
                    </span>
                    <h3 className="text-base font-bold text-white mt-0.5 leading-snug">
                      {productData.product_name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {productData.brands} · {productData.quantity_str}
                    </p>
                  </div>
                  {productData.nutrition_grades && (
                    <div
                      className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider shadow-sm ${getNutriScoreColor(
                        productData.nutrition_grades
                      )}`}
                    >
                      Nutri-Score {productData.nutrition_grades.toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Macro breakdown */}
                <div className="grid grid-cols-4 gap-2 mt-4 pt-3 border-t border-slate-700 text-center">
                  <div className="p-1.5 bg-slate-900/60 rounded-lg">
                    <span className="block text-[10px] text-slate-400">Energie</span>
                    <span className="text-xs font-bold text-white font-mono">
                      {productData.nutriments['energy-kcal_100g']} kcal
                    </span>
                  </div>
                  <div className="p-1.5 bg-slate-900/60 rounded-lg">
                    <span className="block text-[10px] text-slate-400">Protein</span>
                    <span className="text-xs font-bold text-emerald-400 font-mono">
                      {productData.nutriments.proteins_100g} g
                    </span>
                  </div>
                  <div className="p-1.5 bg-slate-900/60 rounded-lg">
                    <span className="block text-[10px] text-slate-400">Carbs</span>
                    <span className="text-xs font-bold text-amber-300 font-mono">
                      {productData.nutriments.carbohydrates_100g} g
                    </span>
                  </div>
                  <div className="p-1.5 bg-slate-900/60 rounded-lg">
                    <span className="block text-[10px] text-slate-400">Fett</span>
                    <span className="text-xs font-bold text-slate-300 font-mono">
                      {productData.nutriments.fat_100g} g
                    </span>
                  </div>
                </div>

                <div className="mt-3 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Barcode: {productData.code}</span>
                  <span>Kategorie: {productData.default_category}</span>
                </div>
              </div>

              {/* Adjust Stock before adding */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-800/40 rounded-xl border border-slate-700/60">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Vorrat Menge ({productData.default_unit})
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={customQuantity}
                    onChange={(e) => setCustomQuantity(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Mindestmenge ({productData.default_unit})
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={customMinQty}
                    onChange={(e) => setCustomMinQty(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono text-sm"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleResetScan}
                  className="px-4 py-3 rounded-xl border border-slate-700 text-slate-300 font-medium text-sm hover:bg-slate-800 transition-colors flex items-center gap-1.5"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Neuer Scan</span>
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAdd}
                  className="flex-1 py-3 px-4 rounded-xl bg-emerald-500 text-slate-950 font-bold text-sm hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>In Vorrat übernehmen</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-sm text-slate-300">Kein Artikel gefunden.</p>
              <button
                onClick={handleResetScan}
                className="mt-3 px-4 py-2 bg-slate-800 rounded-xl text-xs text-white"
              >
                Erneut versuchen
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
