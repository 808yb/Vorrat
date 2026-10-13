import React, { useEffect } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'warning' | 'info';
  title: string;
  description?: string;
}

interface ToastProps {
  toast: ToastMessage | null;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onClose();
    }, 3800);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  const isSuccess = toast.type === 'success';
  const isWarning = toast.type === 'warning';

  return (
    <div className="fixed top-16 inset-x-4 max-w-sm mx-auto z-50 pointer-events-auto animate-in slide-in-from-top-3 fade-in duration-200">
      <div
        className={`p-3.5 rounded-2xl border shadow-xl flex items-start justify-between gap-3 backdrop-blur-md ${
          isSuccess
            ? 'bg-slate-900/95 border-emerald-500/50 text-white'
            : isWarning
            ? 'bg-slate-900/95 border-amber-500/50 text-white'
            : 'bg-slate-900/95 border-slate-700 text-white'
        }`}
      >
        <div className="flex items-start gap-2.5">
          {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />}
          {isWarning && <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />}
          {!isSuccess && !isWarning && <Info className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />}

          <div>
            <span className="font-bold text-xs block text-slate-100">{toast.title}</span>
            {toast.description && (
              <span className="text-[11px] text-slate-300 block mt-0.5 leading-snug">
                {toast.description}
              </span>
            )}
          </div>
        </div>

        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded-lg shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
