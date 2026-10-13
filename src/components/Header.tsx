import React from 'react';
import { ChefHat, AlertTriangle, Sparkles, RefreshCw } from 'lucide-react';
import { PantryItem, ShoppingItem } from '../types';

interface HeaderProps {
  pantryItems: PantryItem[];
  shoppingItems: ShoppingItem[];
  onResetDemo: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  pantryItems,
  shoppingItems,
  onResetDemo,
}) => {
  const lowStockCount = pantryItems.filter(
    (item) => item.currentQuantity < item.minQuantity
  ).length;

  const openShoppingCount = shoppingItems.filter((i) => !i.checked).length;

  return (
    <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-white px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-sm">
            <ChefHat className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-lg tracking-tight text-white">Forret</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Budget Chef
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Vorrat · Kochen · Einkauf</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {lowStockCount > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-medium">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{lowStockCount} knapp</span>
            </div>
          )}

          <button
            onClick={onResetDemo}
            title="Demo-Daten zurücksetzen"
            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
