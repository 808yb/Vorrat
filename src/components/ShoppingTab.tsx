import React, { useState } from 'react';
import {
  ShoppingBag,
  Plus,
  Check,
  CheckSquare,
  Square,
  Trash2,
  Minus,
  Sparkles,
  ArrowRight,
  TrendingDown,
  Tag,
} from 'lucide-react';
import { ShoppingItem, Unit, PantryCategory } from '../types';
import { formatCurrency, formatQuantity } from '../utils/helpers';

interface ShoppingTabProps {
  items: ShoppingItem[];
  onToggleItem: (id: string) => void;
  onUpdateQuantity: (id: string, newQty: number) => void;
  onDeleteItem: (id: string) => void;
  onAddItem: (item: Omit<ShoppingItem, 'id' | 'checked'>) => void;
  onCompleteShopping: () => void;
  onGenerateFromLowStock: () => void;
}

export const ShoppingTab: React.FC<ShoppingTabProps> = ({
  items,
  onToggleItem,
  onUpdateQuantity,
  onDeleteItem,
  onAddItem,
  onCompleteShopping,
  onGenerateFromLowStock,
}) => {
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [filter, setFilter] = useState<'all' | 'open' | 'checked'>('all');

  // New item state
  const [newName, setNewName] = useState('');
  const [newQuantity, setNewQuantity] = useState(500);
  const [newUnit, setNewUnit] = useState<Unit>('g');
  const [newPrice, setNewPrice] = useState(1.99);

  const checkedItems = items.filter((i) => i.checked);
  const openItems = items.filter((i) => !i.checked);

  const totalEstimatedCost = items.reduce((sum, i) => sum + i.estimatedPrice, 0);
  const openEstimatedCost = openItems.reduce((sum, i) => sum + i.estimatedPrice, 0);
  const checkedCost = checkedItems.reduce((sum, i) => sum + i.estimatedPrice, 0);

  const displayedItems = items.filter((item) => {
    if (filter === 'open') return !item.checked;
    if (filter === 'checked') return item.checked;
    return true;
  });

  const handleCreateItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    onAddItem({
      name: newName.trim(),
      quantityToBuy: Number(newQuantity) || 1,
      unit: newUnit,
      estimatedPrice: Number(newPrice) || 1.0,
      reason: 'Manuell hinzugefügt',
    });

    setNewName('');
    setNewQuantity(500);
    setShowAddForm(false);
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Budget & Cost Brake Card */}
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider block">
              Budget & Kostenbremse
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-black text-white font-mono">
                {formatCurrency(totalEstimatedCost)}
              </span>
              <span className="text-xs text-slate-400">geschätzter Einkauf</span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs text-slate-400 block">Offene Posten</span>
            <span className="text-sm font-bold text-slate-200 font-mono">
              {openItems.length} von {items.length} Artikeln
            </span>
          </div>
        </div>

        {/* Progress Bar of Checked Items */}
        <div className="space-y-1">
          <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-700/60">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-300"
              style={{
                width: items.length > 0 ? `${(checkedItems.length / items.length) * 100}%` : '0%',
              }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-slate-400 font-mono">
            <span>Im Korb: {formatCurrency(checkedCost)}</span>
            <span>Noch offen: {formatCurrency(openEstimatedCost)}</span>
          </div>
        </div>

        {/* Auto Sync Low Stock Button if any */}
        <button
          onClick={onGenerateFromLowStock}
          className="w-full py-2 px-3 bg-slate-900/80 hover:bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-300 hover:text-white flex items-center justify-center gap-1.5 transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>Vorratslücken prüfen & synchronisieren</span>
        </button>
      </div>

      {/* Filter Tabs & Add Button */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex bg-slate-800/80 p-1 rounded-xl border border-slate-700/80 text-xs">
          <button
            onClick={() => setFilter('all')}
            className={`px-2.5 py-1 rounded-lg transition-colors font-medium ${
              filter === 'all'
                ? 'bg-emerald-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Alle ({items.length})
          </button>
          <button
            onClick={() => setFilter('open')}
            className={`px-2.5 py-1 rounded-lg transition-colors font-medium ${
              filter === 'open'
                ? 'bg-emerald-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Offen ({openItems.length})
          </button>
          <button
            onClick={() => setFilter('checked')}
            className={`px-2.5 py-1 rounded-lg transition-colors font-medium ${
              filter === 'checked'
                ? 'bg-emerald-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Im Korb ({checkedItems.length})
          </button>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-3 py-1.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors min-h-[36px]"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Artikel</span>
        </button>
      </div>

      {/* Inline Form to Add Item */}
      {showAddForm && (
        <form
          onSubmit={handleCreateItem}
          className="p-3.5 bg-slate-800/90 border border-slate-700 rounded-2xl space-y-3 animate-in fade-in duration-150 text-xs"
        >
          <span className="font-semibold text-white block">Neuen Artikel eintragen</span>

          <div>
            <input
              type="text"
              required
              placeholder="Bezeichnung (z. B. Hafermilch, Gurke)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] text-slate-400 block mb-0.5">Menge</label>
              <input
                type="number"
                min="1"
                value={newQuantity}
                onChange={(e) => setNewQuantity(parseFloat(e.target.value) || 1)}
                className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-center"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-0.5">Einheit</label>
              <select
                value={newUnit}
                onChange={(e) => setNewUnit(e.target.value as Unit)}
                className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white"
              >
                <option value="g">Gramm (g)</option>
                <option value="ml">Milliliter (ml)</option>
                <option value="stk">Stück (Stk)</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-0.5">Geschätzter Preis (€)</label>
              <input
                type="number"
                step="0.05"
                min="0"
                value={newPrice}
                onChange={(e) => setNewPrice(parseFloat(e.target.value) || 0)}
                className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-center"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="flex-1 py-2 bg-slate-700 text-slate-300 rounded-xl font-medium"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="flex-1 py-2 bg-emerald-500 text-slate-950 font-bold rounded-xl"
            >
              Hinzufügen
            </button>
          </div>
        </form>
      )}

      {/* Shopping List Items */}
      <div className="space-y-2">
        {displayedItems.length === 0 ? (
          <div className="p-8 text-center bg-slate-800/40 border border-slate-800 rounded-2xl">
            <ShoppingBag className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-300 font-medium">Keine Artikel in dieser Ansicht</p>
            <p className="text-xs text-slate-500 mt-1">
              Alles erledigt oder Mindestbestände sind ausreichend!
            </p>
          </div>
        ) : (
          displayedItems.map((item) => (
            <div
              key={item.id}
              className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                item.checked
                  ? 'bg-slate-900/40 border-slate-800/70 opacity-60'
                  : 'bg-slate-800/90 border-slate-700/80 shadow-sm'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => onToggleItem(item.id)}
                  className="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-900/80 border border-slate-700 text-slate-400 hover:border-emerald-400 shrink-0 transition-colors"
                >
                  {item.checked ? (
                    <CheckSquare className="w-5 h-5 text-emerald-400 fill-emerald-500/20" />
                  ) : (
                    <Square className="w-5 h-5 text-slate-400" />
                  )}
                </button>

                <div className="min-w-0 truncate">
                  <span
                    className={`font-semibold text-xs text-white block truncate ${
                      item.checked ? 'line-through text-slate-400' : ''
                    }`}
                  >
                    {item.name}
                  </span>
                  <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                    <span className="font-mono text-emerald-400">
                      {formatQuantity(item.quantityToBuy, item.unit)}
                    </span>
                    <span>·</span>
                    <span className="text-[10px] text-slate-400 truncate">{item.reason}</span>
                  </div>
                </div>
              </div>

              {/* Price & Delete */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-bold text-slate-200 font-mono">
                  {formatCurrency(item.estimatedPrice)}
                </span>
                <button
                  onClick={() => onDeleteItem(item.id)}
                  className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-700/50 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Complete Shopping Button */}
      {checkedItems.length > 0 && (
        <div className="pt-2">
          <button
            onClick={onCompleteShopping}
            className="w-full py-3.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-98 transition-all"
          >
            <Check className="w-4 h-4" />
            <span>
              Einkauf abschließen ({checkedItems.length} Artikel in Vorrat buchen)
            </span>
          </button>
        </div>
      )}
    </div>
  );
};
