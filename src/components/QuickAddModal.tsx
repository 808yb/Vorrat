import React, { useState } from 'react';
import { X, Check, Plus, Package } from 'lucide-react';
import { PantryItem, PantryCategory, Unit } from '../types';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Omit<PantryItem, 'id'> & { id?: string }) => void;
  initialItem?: PantryItem | null;
}

export const QuickAddModal: React.FC<QuickAddModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialItem,
}) => {
  const [name, setName] = useState(initialItem?.name || '');
  const [brand, setBrand] = useState(initialItem?.brand || '');
  const [category, setCategory] = useState<PantryCategory>(initialItem?.category || 'Vorratsschrank');
  const [currentQuantity, setCurrentQuantity] = useState<number>(initialItem?.currentQuantity || 500);
  const [unit, setUnit] = useState<Unit>(initialItem?.unit || 'g');
  const [minQuantity, setMinQuantity] = useState<number>(initialItem?.minQuantity || 200);
  const [pricePerUnit, setPricePerUnit] = useState<number>(initialItem?.pricePerUnit || 0.40);
  const [caloriesPer100g, setCaloriesPer100g] = useState<number>(initialItem?.caloriesPer100g || 150);
  const [proteinPer100g, setProteinPer100g] = useState<number>(initialItem?.proteinPer100g || 5);
  const [carbsPer100g, setCarbsPer100g] = useState<number>(initialItem?.carbsPer100g || 20);
  const [fatPer100g, setFatPer100g] = useState<number>(initialItem?.fatPer100g || 2);
  const [barcode, setBarcode] = useState(initialItem?.barcode || '');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      id: initialItem?.id,
      name: name.trim(),
      brand: brand.trim() || undefined,
      category,
      currentQuantity: Number(currentQuantity) || 0,
      unit,
      minQuantity: Number(minQuantity) || 0,
      pricePerUnit: Number(pricePerUnit) || 0.5,
      caloriesPer100g: Number(caloriesPer100g) || 0,
      proteinPer100g: Number(proteinPer100g) || 0,
      carbsPer100g: Number(carbsPer100g) || 0,
      fatPer100g: Number(fatPer100g) || 0,
      barcode: barcode.trim() || undefined,
    });
    onClose();
  };

  const categories: PantryCategory[] = [
    'Vorratsschrank',
    'Kühlschrank',
    'Gewürze & Saucen',
    'Tiefkühl',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <Package className="w-5 h-5" />
            </div>
            <h2 className="font-semibold text-lg text-white">
              {initialItem ? 'Zutat bearbeiten' : 'Zutat zum Vorrat hinzufügen'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto px-5 py-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Bezeichnung der Zutat *
            </label>
            <input
              type="text"
              required
              placeholder="z. B. Basmati Reis, Tofu, Haferflocken"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Marke / Herkunft</label>
              <input
                type="text"
                placeholder="z. B. Ja!, Bio, Demeter"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Barcode (optional)</label>
              <input
                type="text"
                placeholder="EAN-Nummer"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Kategorie</label>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-800/60 rounded-xl border border-slate-700/60">
              {categories.map((cat) => (
                <button
                  type="button"
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`py-1.5 px-2 text-xs rounded-lg transition-colors text-center truncate ${
                    category === cat
                      ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-300 mb-1">Aktuelle Menge</label>
              <input
                type="number"
                min="0"
                step="any"
                value={currentQuantity}
                onChange={(e) => setCurrentQuantity(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Einheit</label>
              <div className="flex bg-slate-800/80 border border-slate-700 rounded-xl p-0.5">
                {(['g', 'ml', 'stk'] as Unit[]).map((u) => (
                  <button
                    type="button"
                    key={u}
                    onClick={() => setUnit(u)}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg uppercase transition-colors ${
                      unit === u
                        ? 'bg-emerald-500 text-slate-950'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Mindestbestand (Alarmwert)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={minQuantity}
                onChange={(e) => setMinQuantity(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-mono"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Warnung bei unter {minQuantity} {unit}
              </span>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Preis ({unit === 'stk' ? 'pro Stk' : `pro 100${unit}`}) in €
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={pricePerUnit}
                onChange={(e) => setPricePerUnit(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-mono"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800">
            <h4 className="text-xs font-semibold text-slate-300 mb-2">
              Nährwerte (pro 100{unit === 'stk' ? 'g Äquiv.' : unit})
            </h4>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Kcal</label>
                <input
                  type="number"
                  min="0"
                  value={caloriesPer100g}
                  onChange={(e) => setCaloriesPer100g(parseFloat(e.target.value) || 0)}
                  className="w-full px-2 py-1.5 bg-slate-800/80 border border-slate-700 rounded-lg text-white text-xs font-mono text-center"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Protein (g)</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={proteinPer100g}
                  onChange={(e) => setProteinPer100g(parseFloat(e.target.value) || 0)}
                  className="w-full px-2 py-1.5 bg-slate-800/80 border border-slate-700 rounded-lg text-white text-xs font-mono text-center"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Carbs (g)</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={carbsPer100g}
                  onChange={(e) => setCarbsPer100g(parseFloat(e.target.value) || 0)}
                  className="w-full px-2 py-1.5 bg-slate-800/80 border border-slate-700 rounded-lg text-white text-xs font-mono text-center"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Fett (g)</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={fatPer100g}
                  onChange={(e) => setFatPer100g(parseFloat(e.target.value) || 0)}
                  className="w-full px-2 py-1.5 bg-slate-800/80 border border-slate-700 rounded-lg text-white text-xs font-mono text-center"
                />
              </div>
            </div>
          </div>

          <div className="pt-3 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl border border-slate-700 text-slate-300 font-medium text-sm hover:bg-slate-800 transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="flex-1 py-3 px-4 rounded-xl bg-emerald-500 text-slate-950 font-bold text-sm hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{initialItem ? 'Speichern' : 'Hinzufügen'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
