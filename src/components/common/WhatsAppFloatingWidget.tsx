import React, { useState } from 'react';
import { MessageSquare, Bell, X, CheckCheck, Sparkles } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const WhatsAppFloatingWidget: React.FC = () => {
  const { 
    whatsAppNotifications, 
    unreadWhatsAppCount, 
    openWhatsAppSimulator,
    role
  } = useApp();

  const [isTooltipDismissed, setIsTooltipDismissed] = useState(false);

  const latestNotif = whatsAppNotifications[0];
  const hasUnread = unreadWhatsAppCount > 0;

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2 select-none">
      
      {/* Floating Notification Teaser Card (if has unread & not dismissed) */}
      {hasUnread && latestNotif && !isTooltipDismissed && (
        <div className="animate-in slide-in-from-bottom-3 fade-in duration-300 bg-slate-900 border border-emerald-500/50 shadow-2xl rounded-2xl p-3.5 max-w-xs text-white relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsTooltipDismissed(true);
            }}
            className="absolute top-2 right-2 text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition"
            title="Ignorer l'aperçu"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          
          <div 
            onClick={() => openWhatsAppSimulator(latestNotif)}
            className="cursor-pointer group"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wide">
                Alerte WhatsApp Nyokah
              </span>
              <span className="text-[10px] text-slate-400 ml-auto mr-4">{latestNotif.timeFormatted}</span>
            </div>

            <h4 className="text-xs font-semibold text-white group-hover:text-emerald-300 transition line-clamp-1">
              {latestNotif.title}
            </h4>

            <p className="text-[11px] text-slate-300 mt-1 line-clamp-2">
              {latestNotif.driverName ? `Chauffeur : ${latestNotif.driverName} • ${latestNotif.vehicleName}` : latestNotif.vehicleName}
            </p>

            <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-emerald-400 font-medium">
              <span>Cliquer pour ouvrir le fil WhatsApp</span>
              <span className="bg-emerald-500/20 px-2 py-0.5 rounded text-emerald-300 font-semibold">Ouvrir</span>
            </div>
          </div>
        </div>
      )}

      {/* Main WhatsApp Floating Action Button */}
      <button
        onClick={() => openWhatsAppSimulator()}
        id="btn-whatsapp-simulator"
        className="group relative flex items-center gap-2.5 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full shadow-2xl hover:shadow-emerald-500/30 transition-all duration-200 transform hover:scale-105 active:scale-95 border-2 border-emerald-400/40"
        title="Ouvrir le simulateur de notifications WhatsApp"
      >
        {/* WhatsApp Icon */}
        <div className="relative">
          <svg 
            className="w-6 h-6 fill-current" 
            viewBox="0 0 24 24"
          >
            <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.669-.7c.969.54 2.083.824 3.228.824 3.181 0 5.767-2.586 5.768-5.766.001-3.18-2.585-5.767-5.767-5.767zm7.531 5.767c0 4.14-3.37 7.51-7.51 7.51-1.309 0-2.548-.337-3.633-.928l-4.045 1.06 1.079-3.943c-.662-1.127-1.045-2.439-1.045-3.837 0-4.14 3.37-7.51 7.51-7.51 4.14 0 7.51 3.37 7.51 7.51z" />
          </svg>
          
          {/* Badge Counter */}
          {unreadWhatsAppCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-rose-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-slate-900 animate-pulse">
              {unreadWhatsAppCount}
            </span>
          )}
        </div>

        {/* Text on Desktop */}
        <span className="hidden sm:inline text-xs font-bold tracking-wide">
          WhatsApp Conciergerie
        </span>

        {/* Pulsing Ring Effect */}
        {hasUnread && (
          <span className="absolute -inset-1 rounded-full border-2 border-emerald-400 opacity-60 animate-ping pointer-events-none" />
        )}
      </button>
    </div>
  );
};
