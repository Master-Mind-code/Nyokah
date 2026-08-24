import React from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle } from 'lucide-react';

export const Toast: React.FC = () => {
  const { toasts, removeToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-20 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none md:bottom-6 md:right-6">
      {toasts.map((toast) => {
        const bgColors = {
          success: 'bg-[#1A1A2E] text-white border-[#D4A017]',
          info: 'bg-[#1A1A2E] text-white border-blue-400',
          warning: 'bg-[#1A1A2E] text-white border-amber-400',
          error: 'bg-[#1A1A2E] text-white border-[#E94560]'
        };

        const icons = {
          success: <CheckCircle2 className="w-5 h-5 text-[#D4A017] shrink-0" />,
          info: <Info className="w-5 h-5 text-blue-400 shrink-0" />,
          warning: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
          error: <AlertCircle className="w-5 h-5 text-[#E94560] shrink-0" />
        };

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-2xl transition-all duration-300 transform translate-y-0 opacity-100 ${bgColors[toast.type]}`}
          >
            {icons[toast.type]}
            <p className="text-sm font-medium flex-1 text-slate-100">{toast.message}</p>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-white transition-colors p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export const ToastContainer = Toast;
