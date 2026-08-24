import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Send, 
  Phone, 
  Video, 
  CheckCheck, 
  Sparkles, 
  Car, 
  User, 
  MapPin, 
  Calendar, 
  Clock, 
  ExternalLink,
  ShieldCheck,
  Bell,
  RefreshCw,
  MessageSquare,
  ChevronRight,
  Info
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { WhatsAppNotification } from '../../types';

export const WhatsAppSimulatorModal: React.FC = () => {
  const { 
    isWhatsAppSimulatorOpen, 
    closeWhatsAppSimulator, 
    whatsAppNotifications, 
    activeWhatsAppNotification, 
    openWhatsAppSimulator,
    markWhatsAppNotificationAsRead,
    markAllWhatsAppNotificationsAsRead,
    simulateBookingValidationNotification,
    simulateDriverAssignmentNotification,
    bookings,
    currentUser,
    showToast
  } = useApp();

  const [selectedNotif, setSelectedNotif] = useState<WhatsAppNotification | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replies, setReplies] = useState<{ id: string; notifId: string; text: string; time: string; sender: 'client' | 'nyokah' }[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Sync selected notification
  useEffect(() => {
    if (activeWhatsAppNotification) {
      setSelectedNotif(activeWhatsAppNotification);
    } else if (whatsAppNotifications.length > 0 && !selectedNotif) {
      setSelectedNotif(whatsAppNotifications[0]);
    }
  }, [activeWhatsAppNotification, whatsAppNotifications]);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedNotif, replies, isTyping]);

  if (!isWhatsAppSimulatorOpen) return null;

  const currentItem = selectedNotif || whatsAppNotifications[0];

  const handleSelectNotif = (notif: WhatsAppNotification) => {
    setSelectedNotif(notif);
    markWhatsAppNotificationAsRead(notif.id);
  };

  const handleSendReply = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!replyText.trim() || !currentItem) return;

    const userMessage = replyText.trim();
    const now = new Date();
    const timeFormatted = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const newReply = {
      id: `rep-${Date.now()}`,
      notifId: currentItem.id,
      text: userMessage,
      time: timeFormatted,
      sender: 'client' as const
    };

    setReplies((prev) => [...prev, newReply]);
    setReplyText('');

    // Simulate concierge auto-reply after 1.5s
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      const autoReply = {
        id: `rep-${Date.now() + 1}`,
        notifId: currentItem.id,
        text: `Merci pour votre retour M./Mme ${currentUser?.fullName || 'Client'}. Votre chauffeur et notre équipe de dispatching ont bien pris note. Nous restons à votre entière disposition ! 🚗✨`,
        time: `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`,
        sender: 'nyokah' as const
      };
      setReplies((prev) => [...prev, autoReply]);
      showToast('Nouveau message reçu de la Conciergerie Nyokah', 'info');
    }, 1800);
  };

  const handleOpenExternalWhatsApp = (phone?: string, text?: string) => {
    const targetPhone = (phone || '+2250748123456').replace(/[^0-9]/g, '');
    const encodedText = encodeURIComponent(text || `Bonjour Nyokah Mobility, concernant ma réservation ${currentItem?.bookingId || ''}...`);
    window.open(`https://wa.me/${targetPhone}?text=${encodedText}`, '_blank');
  };

  // Find associated booking for quick tests
  const targetBooking = bookings.find((b) => b.id === currentItem?.bookingId) || bookings[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl h-[92vh] max-h-[780px] rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row text-white">
        
        {/* Left Sidebar: Notification List */}
        <div className="w-full md:w-80 border-r border-slate-800 bg-slate-950 flex flex-col shrink-0 h-48 md:h-full">
          {/* Header */}
          <div className="p-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm">
                💬
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Fils WhatsApp Nyokah</h3>
                <p className="text-xs text-slate-400">{whatsAppNotifications.length} notification(s)</p>
              </div>
            </div>
            <button
              onClick={markAllWhatsAppNotificationsAsRead}
              title="Tout marquer comme lu"
              className="text-xs text-emerald-400 hover:text-emerald-300 p-1 rounded hover:bg-slate-800 transition"
            >
              <CheckCheck className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Simulation Bar */}
          <div className="p-2.5 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Tests en direct :</span>
            <div className="flex gap-1.5">
              <button
                onClick={() => targetBooking && simulateBookingValidationNotification(targetBooking.id)}
                className="px-2 py-1 bg-emerald-700/60 hover:bg-emerald-600 text-emerald-100 rounded text-[11px] font-medium transition flex items-center gap-1"
                title="Déclencher simulation validation de réservation"
              >
                <Sparkles className="w-3 h-3 text-emerald-300" />
                Validation
              </button>
              <button
                onClick={() => targetBooking && simulateDriverAssignmentNotification(targetBooking.id)}
                className="px-2 py-1 bg-blue-700/60 hover:bg-blue-600 text-blue-100 rounded text-[11px] font-medium transition flex items-center gap-1"
                title="Déclencher simulation affectation chauffeur"
              >
                <Car className="w-3 h-3 text-blue-300" />
                Chauffeur
              </button>
            </div>
          </div>

          {/* Threads List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
            {whatsAppNotifications.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs">
                Aucune notification WhatsApp pour le moment.
              </div>
            ) : (
              whatsAppNotifications.map((notif) => {
                const isSelected = currentItem?.id === notif.id;
                return (
                  <button
                    key={notif.id}
                    onClick={() => handleSelectNotif(notif)}
                    className={`w-full text-left p-3 transition flex items-start gap-2.5 ${
                      isSelected 
                        ? 'bg-emerald-950/40 border-l-4 border-emerald-500' 
                        : 'hover:bg-slate-900/60'
                    }`}
                  >
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden">
                        {notif.driverPhoto ? (
                          <img src={notif.driverPhoto} alt="Chauffeur" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-base">⭐</span>
                        )}
                      </div>
                      {!notif.isRead && (
                        <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-950 animate-pulse" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className={`text-xs font-semibold truncate ${isSelected ? 'text-emerald-300' : 'text-slate-200'}`}>
                          {notif.title}
                        </span>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {notif.timeFormatted}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate">
                        {notif.bookingId} • {notif.vehicleName}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                          notif.type === 'driver_assigned'
                            ? 'bg-blue-900/50 text-blue-300 border border-blue-800/40'
                            : notif.type === 'booking_validated'
                            ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-800/40'
                            : 'bg-amber-900/50 text-amber-300 border border-amber-800/40'
                        }`}>
                          {notif.type === 'driver_assigned' ? 'Chauffeur Assigné' : notif.type === 'booking_validated' ? 'Validée' : 'Reçue'}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {notif.recipientName.split(' ')[0]}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Main Screen: WhatsApp Interface Simulator */}
        <div className="flex-1 flex flex-col h-full bg-[#0b141a] relative overflow-hidden">
          
          {/* WhatsApp Brand Header Bar */}
          <div className="px-4 py-3 bg-[#202c33] border-b border-slate-800 flex items-center justify-between shrink-0 shadow-md">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-white shadow">
                  NM
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 rounded-full border-2 border-[#202c33]" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="text-sm font-bold text-white flex items-center gap-1">
                    Nyokah Conciergerie VIP
                    <ShieldCheck className="w-4 h-4 text-emerald-400 fill-emerald-400/20 inline" />
                  </h4>
                  <span className="text-[10px] px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded font-semibold">
                    Compte Officiel
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  En ligne • Service Client & Chauffeurs 24h/7j (+225 27 20 21 00 00)
                </p>
              </div>
            </div>

            {/* Header Right Actions */}
            <div className="flex items-center gap-2">
              <button 
                onClick={() => handleOpenExternalWhatsApp(currentItem?.driverPhone || '+2250748123456')}
                title="Ouvrir dans WhatsApp Web / Mobile"
                className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600/80 hover:bg-emerald-600 text-white rounded-lg text-xs font-medium transition"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Ouvrir sur WhatsApp</span>
              </button>
              <button
                onClick={closeWhatsAppSimulator}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/60 rounded-full transition"
                title="Fermer le simulateur"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Sub-bar showing recipient details */}
          {currentItem && (
            <div className="bg-[#182229] px-4 py-2 border-b border-slate-800/80 flex items-center justify-between text-xs text-slate-300 shrink-0">
              <div className="flex items-center gap-2 truncate">
                <span className="text-slate-400">Destinataire :</span>
                <span className="font-semibold text-emerald-300">{currentItem.recipientName}</span>
                <span className="text-slate-500">({currentItem.recipientPhone})</span>
                <span className="text-slate-500">• Réservation <strong className="text-white">{currentItem.bookingId}</strong></span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] text-emerald-400/90 font-medium flex items-center gap-1">
                  <CheckCheck className="w-3.5 h-3.5 text-cyan-400" />
                  Distribué & Lu
                </span>
              </div>
            </div>
          )}

          {/* WhatsApp Chat Messages Canvas */}
          <div 
            className="flex-1 overflow-y-auto p-4 space-y-4 bg-repeat"
            style={{
              backgroundColor: '#0b141a',
              backgroundImage: `radial-gradient(circle at 50% 50%, rgba(32, 44, 51, 0.4) 0%, rgba(11, 20, 26, 0.9) 100%)`
            }}
          >
            {/* Timestamp pill */}
            <div className="flex justify-center my-1">
              <span className="bg-[#182229] text-slate-400 text-[11px] px-3 py-1 rounded-full border border-slate-800 shadow-sm">
                Aujourd’hui • Messages chiffrés de bout en bout
              </span>
            </div>

            {/* Official Incoming WhatsApp Notification Bubble */}
            {currentItem ? (
              <div className="max-w-[90%] sm:max-w-[80%] bg-[#202c33] rounded-2xl rounded-tl-none p-4 text-slate-100 shadow-lg border border-slate-700/60 relative">
                
                {/* Header inside Bubble */}
                <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-700/50">
                  <div className="flex items-center gap-2">
                    <span className="text-base">
                      {currentItem.type === 'driver_assigned' ? '👔' : currentItem.type === 'booking_validated' ? '✅' : '📱'}
                    </span>
                    <div>
                      <span className="text-xs font-bold text-emerald-400 tracking-wide block uppercase">
                        {currentItem.title}
                      </span>
                      <span className="text-[11px] text-slate-400">Réf. {currentItem.bookingId}</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400">{currentItem.timeFormatted}</span>
                </div>

                {/* Driver / Vehicle Featured Card if available */}
                {currentItem.driverName && (
                  <div className="mb-3 p-3 bg-[#111b21] rounded-xl border border-slate-700/80 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <img 
                        src={currentItem.driverPhoto || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80'} 
                        alt={currentItem.driverName} 
                        className="w-12 h-12 rounded-full object-cover border-2 border-emerald-500 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h5 className="font-bold text-sm text-white truncate">{currentItem.driverName}</h5>
                          <span className="text-xs text-amber-400 font-semibold shrink-0">⭐ {currentItem.driverRating || 4.95}</span>
                        </div>
                        <p className="text-xs text-slate-400 truncate">Chauffeur VIP Privé Nyokah</p>
                        <p className="text-xs text-emerald-400 font-medium truncate">{currentItem.driverPhone}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleOpenExternalWhatsApp(currentItem.driverPhone, `Bonjour ${currentItem.driverName}, je suis votre client pour la réservation ${currentItem.bookingId}.`)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shrink-0 flex items-center gap-1.5 shadow transition"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Appel / Chat</span>
                    </button>
                  </div>
                )}

                {/* Vehicle Specs Badge */}
                <div className="mb-3 p-2.5 bg-[#111b21] rounded-xl border border-slate-700/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-200">
                    <Car className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="font-semibold">{currentItem.vehicleName}</span>
                  </div>
                  {currentItem.plateNumber && (
                    <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 font-mono font-bold rounded text-[11px] border border-amber-500/30">
                      Immat: {currentItem.plateNumber}
                    </span>
                  )}
                </div>

                {/* Pickup Details Pill */}
                <div className="mb-3 p-2.5 bg-[#111b21]/70 rounded-xl border border-slate-700/50 space-y-1 text-xs">
                  <div className="flex items-center gap-2 text-slate-300">
                    <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span className="truncate"><strong className="text-white">Lieu :</strong> {currentItem.pickupLocation}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span><strong className="text-white">Heure :</strong> {currentItem.pickupDate} à {currentItem.pickupTime}</span>
                  </div>
                </div>

                {/* Rich Message Body (Preserving WhatsApp formatting) */}
                <div className="text-xs sm:text-[13px] leading-relaxed text-slate-200 whitespace-pre-line font-sans select-text">
                  {currentItem.messageBody}
                </div>

                {/* Bottom Metadata & Blue Ticks */}
                <div className="flex items-center justify-end gap-1.5 mt-3 pt-2 border-t border-slate-700/40 text-[11px] text-slate-400">
                  <span>{currentItem.timeFormatted}</span>
                  <CheckCheck className="w-4 h-4 text-cyan-400 inline" />
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500">
                Sélectionnez une notification dans le volet de gauche.
              </div>
            )}

            {/* Client Replies & Conversation history */}
            {replies
              .filter((r) => r.notifId === currentItem?.id)
              .map((rep) => {
                const isClient = rep.sender === 'client';
                return (
                  <div
                    key={rep.id}
                    className={`flex ${isClient ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-3 text-xs sm:text-[13px] shadow ${
                        isClient
                          ? 'bg-[#005c4b] text-white rounded-tr-none'
                          : 'bg-[#202c33] text-slate-200 rounded-tl-none border border-slate-700/60'
                      }`}
                    >
                      <p className="whitespace-pre-line">{rep.text}</p>
                      <div className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${isClient ? 'text-emerald-200' : 'text-slate-400'}`}>
                        <span>{rep.time}</span>
                        {isClient && <CheckCheck className="w-3.5 h-3.5 text-cyan-300 inline" />}
                      </div>
                    </div>
                  </div>
                );
              })}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-[#202c33] border border-slate-700/60 rounded-2xl rounded-tl-none px-4 py-2.5 flex items-center gap-1.5 text-slate-400 text-xs shadow">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" />
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                  <span className="ml-1 text-[11px] text-emerald-400">Nyokah Conciergerie écrit...</span>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Quick Predefined Client Answers */}
          <div className="px-3 py-1.5 bg-[#182229] border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto text-xs shrink-0">
            <span className="text-slate-400 text-[11px] shrink-0">Réponses rapides :</span>
            <button
              onClick={() => {
                setReplyText('Bien reçu, merci ! Je serai prêt à l’heure.');
              }}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-full text-[11px] shrink-0 border border-slate-700/60 transition"
            >
              👍 Bien reçu, merci !
            </button>
            <button
              onClick={() => {
                setReplyText('Pouvez-vous m’appeler à l’arrivée à l’aéroport ?');
              }}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-full text-[11px] shrink-0 border border-slate-700/60 transition"
            >
              📞 M’appeler à l’arrivée
            </button>
            <button
              onClick={() => {
                setReplyText('Parfait, j’ai bien noté l’immatriculation du véhicule.');
              }}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-full text-[11px] shrink-0 border border-slate-700/60 transition"
            >
              🚗 Immatriculation notée
            </button>
          </div>

          {/* Interactive Chat Input Bar */}
          <form 
            onSubmit={handleSendReply} 
            className="p-3 bg-[#202c33] border-t border-slate-800 flex items-center gap-2 shrink-0"
          >
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Écrire une réponse sur le fil WhatsApp..."
              className="flex-1 bg-[#2a3942] border-none text-white placeholder-slate-400 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <button
              type="submit"
              disabled={!replyText.trim()}
              className="w-10 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white flex items-center justify-center transition shadow shrink-0"
              title="Envoyer la réponse"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

        </div>
      </div>
    </div>
  );
};
