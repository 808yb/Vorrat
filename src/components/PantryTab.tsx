import React, { useState } from 'react';
import {
  Plus,
  Scan,
  Receipt,
  Search,
  AlertTriangle,
  CheckCircle2,
  Minus,
  Edit2,
  Trash2,
  ChevronDown,
  ShoppingBag,
  Info,
} from 'lucide-react';
import { PantryItem, PantryCategory, Unit } from '../types';
import { formatCurrency, formatQuantity, getStockStatus } from '../utils/helpers';

interface PantryTabProps {
  items: PantryItem[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onSetQuantity: (id: string, newQuantity: number) => void;
  onEditItem: (item: PantryItem) => void;
  onDeleteItem: (id: string) => void;
  onOpenQuickAdd: () => void;
  onOpenBarcodeScan: () => void;
  onOpenReceiptImport: () => void;
  onAddToShoppingList: (pantryItem: PantryItem) => void;
}

export const PantryTab: React.FC<PantryTabProps> = ({
  items,
  onUpdateQuantity,
  onEditItem,
  onDeleteItem,
  onOpenQuickAdd,
  onOpenBarcodeScan,
  onOpenReceiptImport,
  onAddToShoppingList,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('Alle');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [onlyLowStock, setOnlyLowStock] = useState<boolean>(false);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  const categories: Array<{ id: string; label: string }> = [
    { id: 'Alle', label: 'Alle' },
    { id: 'Kühlschrank', label: 'Kühlschrank' },
    { id: 'Vorratsschrank', label: 'Vorrat' },
    { id: 'Gewürze & Saucen', label: 'Gewürze/Saucen' },
    { id: 'Tiefkühl', label: 'Tiefkühl' },
  ];

  // Filtering
  const filteredItems = items.filter((item) => {
    const matchesCategory =
      selectedCategory === 'Alle' || item.category === selectedCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.brand && item.brand.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesLowStock = !onlyLowStock || item.currentQuantity < item.minQuantity;

    return matchesCategory && matchesSearch && matchesLowStock;
  });

  const lowStockTotal = items.filter((i) => i.currentQuantity < i.minQuantity).length;

  const getStepSize = (unit: Unit): number => {
    switch (unit) {
      case 'g':
        return 50;
      case 'ml':
        return 25;
      case 'stk':
        return 1;
      default:
        return 10;
    }
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Action Buttons Hub */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={onOpenBarcodeScan}
          className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-800/90 border border-slate-700/80 hover:border-emerald-500/50 hover:bg-slate-800 text-white transition-all active:scale-95 shadow-sm group min-h-[44px]"
        >
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform">
            <Scan className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold mt-1.5 text-slate-200">Barcode</span>
          <span className="text-[10px] text-slate-400">Open Food Facts</span>
        </button>

        <button
          onClick={onOpenReceiptImport}
          className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-800/90 border border-slate-700/80 hover:border-emerald-500/50 hover:bg-slate-800 text-white transition-all active:scale-95 shadow-sm group min-h-[44px]"
        >
          <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 group-hover:scale-110 transition-transform">
            <Receipt className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold mt-1.5 text-slate-200">Kassenbon</span>
          <span className="text-[10px] text-slate-400">Digital OCR</span>
        </button>

        <button
          onClick={onOpenQuickAdd}
          className="flex flex-col items-center justify-center p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 hover:bg-emerald-500/25 text-emerald-300 transition-all active:scale-95 shadow-sm group min-h-[44px]"
        >
          <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 group-hover:scale-110 transition-transform">
            <Plus className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold mt-1.5 text-emerald-300">Quick Add</span>
          <span className="text-[10px] text-emerald-400/80">Manuell</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Vorrat durchsuchen (z. B. Reis, Eier)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
            >
              Löschen
            </button>
          )}
        </div>

        {/* Category Tabs & Low Stock Toggle */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors shrink-0 ${
                selectedCategory === cat.id
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              {cat.label}
            </button>
          ))}

          {lowStockTotal > 0 && (
            <button
              onClick={() => setOnlyLowStock(!onlyLowStock)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors shrink-0 flex items-center gap-1 ${
                onlyLowStock
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-amber-500/15 border border-amber-500/30 text-amber-300'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{lowStockTotal} knapp</span>
            </button>
          )}
        </div>
      </div>

      {/* Item List */}
      <div className="space-y-2.5">
        {filteredItems.length === 0 ? (
          <div className="p-8 text-center bg-slate-800/40 border border-slate-800 rounded-2xl">
            <p className="text-sm text-slate-300 font-medium">Keine Vorratsartikel gefunden</p>
            <p className="text-xs text-slate-500 mt-1">
              Passe den Suchfilter an oder füge eine neue Zutat hinzu.
            </p>
            <button
              onClick={onOpenQuickAdd}
              className="mt-4 px-4 py-2 bg-emerald-500 text-slate-950 text-xs font-bold rounded-xl hover:bg-emerald-400"
            >
              Zutat anlegen
            </button>
          </div>
        ) : (
          filteredItems.map((item) => {
            const status = getStockStatus(item.currentQuantity, item.minQuantity);
            const isExpanded = expandedItemId === item.id;
            const step = getStepSize(item.unit);

            return (
              <div
                key={item.id}
                className="bg-slate-800/80 border border-slate-700/70 rounded-2xl p-3.5 shadow-sm transition-all hover:border-slate-600"
              >
                {/* Main Card Header */}
                <div className="flex items-start justify-between gap-3">
                  <div
                    className="flex-1 cursor-pointer select-none"
                    onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-white">{item.name}</span>
                      {item.brand && (
                        <span className="text-[10px] text-slate-400 bg-slate-900/60 px-1.5 py-0.5 rounded">
                          {item.brand}
                        </span>
                      )}
                    </div>

                    {/* Category & Status Indicator */}
                    <div className="flex items-center gap-2 mt-1 text-xs">
                      <span className="text-slate-400">{item.category}</span>
                      <span className="text-slate-600">·</span>

                      {/* Traffic Light Status with Text */}
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${status.dotClass}`} />
                        <span
                          className={`text-[11px] font-semibold ${
                            status.status === 'sufficient'
                              ? 'text-emerald-400'
                              : status.status === 'low'
                              ? 'text-amber-400'
                              : 'text-rose-400'
                          }`}
                        >
                          {status.status === 'sufficient'
                            ? 'Ausreichend'
                            : `Knapp (Min: ${formatQuantity(item.minQuantity, item.unit)})`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Quantity & Haptic Quick Stepper */}
                  <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-700/80 rounded-xl p-1 shrink-0">
                    <button
                      onClick={() => onUpdateQuantity(item.id, -step)}
                      disabled={item.currentQuantity <= 0}
                      title={`-${step}${item.unit}`}
                      className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 disabled:opacity-30 disabled:pointer-events-none text-slate-200 flex items-center justify-center transition-all"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>

                    <div className="min-w-[70px] text-center px-1">
                      <span className="text-xs font-bold text-white font-mono block">
                        {formatQuantity(item.currentQuantity, item.unit)}
                      </span>
                      <span className="text-[9px] text-slate-400 block -mt-0.5 font-mono">
                        {formatCurrency(
                          item.pricePerUnit *
                            (item.unit === 'stk'
                              ? item.currentQuantity
                              : item.currentQuantity / 100)
                        )}
                      </span>
                    </div>

                    <button
                      onClick={() => onUpdateQuantity(item.id, step)}
                      title={`+${step}${item.unit}`}
                      className="w-8 h-8 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 active:scale-95 flex items-center justify-center transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Warning Alert Banner when low stock */}
                {item.currentQuantity < item.minQuantity && (
                  <div className="mt-3 p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5 text-amber-300">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        Fehlmenge:{' '}
                        <strong>
                          {formatQuantity(item.minQuantity - item.currentQuantity, item.unit)}
                        </strong>
                      </span>
                    </div>
                    <button
                      onClick={() => onAddToShoppingList(item)}
                      className="px-2.5 py-1 bg-amber-500 text-slate-950 font-bold rounded-lg text-[11px] hover:bg-amber-400 flex items-center gap-1 shrink-0"
                    >
                      <ShoppingBag className="w-3 h-3" />
                      <span>Auf Einkaufsliste</span>
                    </button>
                  </div>
                )}

                {/* Expanded Details / Macros / Actions */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-slate-700/60 text-xs space-y-2.5 animate-in fade-in duration-150">
                    <div className="grid grid-cols-4 gap-1.5 text-center bg-slate-900/60 p-2 rounded-xl">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Kcal / 100g</span>
                        <span className="font-mono font-semibold text-white">
                          {item.caloriesPer100g}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Protein</span>
                        <span className="font-mono font-semibold text-emerald-400">
                          {item.proteinPer100g}g
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Carbs</span>
                        <span className="font-mono font-semibold text-amber-300">
                          {item.carbsPer100g}g
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Fett</span>
                        <span className="font-mono font-semibold text-slate-300">
                          {item.fatPer100g}g
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                      <span>
                        Preisbasis:{' '}
                        <strong className="text-slate-300 font-mono">
                          {formatCurrency(item.pricePerUnit)} / {item.unit === 'stk' ? 'Stk' : '100' + item.unit}
                        </strong>
                      </span>
                      {item.barcode && (
                        <span className="font-mono text-slate-500">EAN: {item.barcode}</span>
                      )}
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => onEditItem(item)}
                        className="flex-1 py-1.5 px-3 bg-slate-700/70 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Bearbeiten</span>
                      </button>
                      <button
                        onClick={() => onDeleteItem(item.id)}
                        className="py-1.5 px-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Löschen</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
