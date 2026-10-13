import React, { useState } from 'react';
import { X, Receipt, Upload, Check, Sparkles, Plus, CheckSquare, Square, FileText } from 'lucide-react';
import { PantryItem, ReceiptParsedItem } from '../types';
import { SAMPLE_RECEIPTS } from '../data/mockData';
import { parseReceiptText, formatCurrency, formatQuantity } from '../utils/helpers';

interface ReceiptParserModalProps {
  isOpen: boolean;
  onClose: () => void;
  pantryItems: PantryItem[];
  onImportItems: (items: ReceiptParsedItem[]) => void;
}

export const ReceiptParserModal: React.FC<ReceiptParserModalProps> = ({
  isOpen,
  onClose,
  pantryItems,
  onImportItems,
}) => {
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number>(0);
  const [receiptText, setReceiptText] = useState<string>(SAMPLE_RECEIPTS[0].text);
  const [parsedItems, setParsedItems] = useState<ReceiptParsedItem[]>(() =>
    parseReceiptText(SAMPLE_RECEIPTS[0].text, pantryItems)
  );
  const [hasParsed, setHasParsed] = useState<boolean>(true);
  const [isPhotoSimulated, setIsPhotoSimulated] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSelectPreset = (index: number) => {
    setSelectedPresetIndex(index);
    const text = SAMPLE_RECEIPTS[index].text;
    setReceiptText(text);
    const parsed = parseReceiptText(text, pantryItems);
    setParsedItems(parsed);
    setHasParsed(true);
    setIsPhotoSimulated(false);
  };

  const handleParseCustom = () => {
    const parsed = parseReceiptText(receiptText, pantryItems);
    setParsedItems(parsed);
    setHasParsed(true);
  };

  const handleToggleItem = (id: string) => {
    setParsedItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item))
    );
  };

  const handleToggleAll = (selectAll: boolean) => {
    setParsedItems((prev) => prev.map((item) => ({ ...item, selected: selectAll })));
  };

  const handleConfirmImport = () => {
    const selected = parsedItems.filter((i) => i.selected);
    if (selected.length === 0) return;
    onImportItems(selected);
    onClose();
  };

  const selectedCount = parsedItems.filter((i) => i.selected).length;
  const totalSelectedPrice = parsedItems
    .filter((i) => i.selected)
    .reduce((sum, item) => sum + item.price, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl w-full max-w-md max-h-[92vh] flex flex-col shadow-2xl text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-semibold text-lg text-white">Kassenbon-Import</h2>
              <p className="text-[11px] text-slate-400">Automatische OCR & Mengenerkennung</p>
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
          {/* Preset Buttons */}
          <div>
            <span className="block text-xs font-medium text-slate-300 mb-2">
              Beispiel-Kassenbon auswählen:
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              {SAMPLE_RECEIPTS.map((preset, idx) => (
                <button
                  key={preset.title}
                  onClick={() => handleSelectPreset(idx)}
                  className={`py-2 px-2 text-xs rounded-xl font-medium transition-all text-center truncate ${
                    selectedPresetIndex === idx && !isPhotoSimulated
                      ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700/80'
                  }`}
                >
                  {preset.title.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Photo Upload Simulation button */}
          <div className="flex items-center justify-between p-2.5 bg-slate-800/60 rounded-xl border border-slate-700/70 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <FileText className="w-4 h-4 text-emerald-400" />
              <span>Kassenbon Foto OCR-Simulation</span>
            </div>
            <button
              onClick={() => {
                setIsPhotoSimulated(true);
                handleSelectPreset(0);
              }}
              className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 rounded-lg text-emerald-300 font-medium text-[11px] transition-colors"
            >
              Foto simulieren
            </button>
          </div>

          {/* Receipt raw text view / collapsible */}
          <details className="group">
            <summary className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer flex items-center justify-between py-1 select-none font-medium">
              <span>Rohdaten / Bon-Text ansehen oder anpassen</span>
              <span className="text-[10px] text-emerald-400 font-mono">Text bearbeiten</span>
            </summary>
            <div className="mt-2 space-y-2">
              <textarea
                rows={5}
                value={receiptText}
                onChange={(e) => setReceiptText(e.target.value)}
                placeholder="Füge hier Kassenbonzeilen ein (z. B. Ja! Basmati Reis 1kg 1,99 B)..."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <button
                onClick={handleParseCustom}
                className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-medium text-emerald-400"
              >
                Text neu analysieren
              </button>
            </div>
          </details>

          {/* Parsed Items List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-200">
                Erkannte Positionen ({parsedItems.length})
              </span>
              <div className="flex gap-2 text-[11px]">
                <button
                  onClick={() => handleToggleAll(true)}
                  className="text-emerald-400 hover:underline"
                >
                  Alle
                </button>
                <span className="text-slate-600">·</span>
                <button
                  onClick={() => handleToggleAll(false)}
                  className="text-slate-400 hover:underline"
                >
                  Keine
                </button>
              </div>
            </div>

            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {parsedItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleToggleItem(item.id)}
                  className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                    item.selected
                      ? 'bg-slate-800/90 border-emerald-500/40 text-white'
                      : 'bg-slate-900/50 border-slate-800 text-slate-400 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <button
                      type="button"
                      className="text-emerald-400 focus:outline-none shrink-0"
                    >
                      {item.selected ? (
                        <CheckSquare className="w-4 h-4 text-emerald-400 fill-emerald-500/20" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-500" />
                      )}
                    </button>
                    <div className="truncate">
                      <div className="text-xs font-semibold text-slate-100 truncate">
                        {item.name}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <span className="text-emerald-400 font-mono">
                          +{formatQuantity(item.quantity, item.unit)}
                        </span>
                        <span>·</span>
                        <span>{item.category}</span>
                        {item.matchedPantryId && (
                          <>
                            <span>·</span>
                            <span className="text-sky-400 font-medium">Im Vorrat</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold text-slate-200 font-mono">
                      {formatCurrency(item.price)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Summary Bar */}
          <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/80 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Ausgewählt</span>
              <span className="font-bold text-slate-200">
                {selectedCount} von {parsedItems.length} Artikeln
              </span>
            </div>
            <div className="text-right">
              <span className="text-slate-400 block text-[11px]">Summe</span>
              <span className="font-bold text-emerald-400 font-mono text-sm">
                {formatCurrency(totalSelectedPrice)}
              </span>
            </div>
          </div>

          {/* Confirm Button */}
          <button
            onClick={handleConfirmImport}
            disabled={selectedCount === 0}
            className="w-full py-3.5 px-4 rounded-xl bg-emerald-500 disabled:opacity-40 text-slate-950 font-bold text-sm hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            <span>
              {selectedCount} {selectedCount === 1 ? 'Artikel' : 'Artikel'} zum Vorrat addieren
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
