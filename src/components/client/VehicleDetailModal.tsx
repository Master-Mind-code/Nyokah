import React, { useState } from 'react';
import { useApp, formatFCFA } from '../../context/AppContext';
import { Vehicle, RentalFormula } from '../../types';
import { 
  X, 
  Users, 
  Luggage, 
  Fuel, 
  Gauge, 
  CheckCircle2, 
  ShieldCheck, 
  Sparkles, 
  Calendar, 
  Clock, 
  Car, 
  Send,
  Building2,
  Tag
} from 'lucide-react';

interface VehicleDetailModalProps {
  vehicle: Vehicle | null;
  onClose: () => void;
  onBook: (vehicle: Vehicle) => void;
}

export const VehicleDetailModal: React.FC<VehicleDetailModalProps> = ({
  vehicle,
  onClose,
  onBook
}) => {
  const { currentCompanyId, companies, showToast } = useApp();
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [waitlistSuccess, setWaitlistSuccess] = useState(false);

  if (!vehicle) return null;

  const activeCompany = companies.find((c) => c.id === currentCompanyId);
  const hasDiscount = activeCompany && activeCompany.negotiatedDiscountRate > 0;
  const discountRate = activeCompany?.negotiatedDiscountRate || 0;

  const discountedDailyRate = hasDiscount
    ? Math.round(vehicle.dailyRate * (1 - discountRate / 100))
    : vehicle.dailyRate;

  const handleWaitlistSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!waitlistEmail) return;
    setWaitlistSuccess(true);
    showToast(`Vous êtes inscrit sur la liste d'attente pour la ${vehicle.brand} ${vehicle.model}. Vous serez notifié dès libération.`, 'info');
  };

  const images = vehicle.galleryUrls && vehicle.galleryUrls.length > 0 ? vehicle.galleryUrls : [vehicle.imageUrl];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6">
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/90 text-slate-700 hover:bg-slate-100 flex items-center justify-center shadow-md transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Gallery & Header */}
        <div className="relative h-72 sm:h-96 w-full bg-slate-900 rounded-t-3xl overflow-hidden">
          <img
            src={images[activeImageIndex] || vehicle.imageUrl}
            alt={`${vehicle.brand} ${vehicle.model}`}
            className="w-full h-full object-cover transition-opacity duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>

          {/* Badges overlay */}
          <div className="absolute top-4 left-4 flex flex-wrap gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#1A1A2E]/90 text-[#D4A017] backdrop-blur-md border border-[#D4A017]/40 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              {vehicle.isVip ? 'Chauffeur VIP d’Honneur' : 'Chauffeur Pro Inclus'}
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-bold backdrop-blur-md ${
              vehicle.status === 'Disponible' 
                ? 'bg-emerald-500/90 text-white' 
                : vehicle.status === 'Loué'
                ? 'bg-[#E94560]/90 text-white'
                : 'bg-amber-500/90 text-white'
            }`}>
              {vehicle.status}
            </span>
            {vehicle.ownership === 'Sous-traitant' && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-600/90 text-white backdrop-blur-md">
                Partenaire certifié Nyokah
              </span>
            )}
          </div>

          {/* Title & Category on Image bottom */}
          <div className="absolute bottom-4 left-4 right-4 text-white">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <span className="text-xs uppercase tracking-widest text-[#D4A017] font-semibold">
                  {vehicle.category} • Immatriculation CI : {vehicle.plateNumber}
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold font-serif">
                  {vehicle.brand} {vehicle.model}
                </h2>
              </div>
              <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-lg text-sm font-semibold">
                Millésime {vehicle.year}
              </span>
            </div>
          </div>
        </div>

        {/* Gallery Thumbnails if multiple */}
        {images.length > 1 && (
          <div className="flex gap-2 p-3 bg-slate-50 border-b border-slate-200">
            {images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setActiveImageIndex(idx)}
                className={`relative w-20 h-14 rounded-lg overflow-hidden border-2 transition-all ${
                  activeImageIndex === idx ? 'border-[#D4A017] scale-105 shadow-sm' : 'border-transparent opacity-70 hover:opacity-100'
                }`}
              >
                <img src={img} alt="Aperçu" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-8">
          
          {/* Key Specs Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-[#F9F9FD] rounded-2xl border border-slate-200 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-white text-[#795900] shadow-xs">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-slate-500">Capacité</div>
                <div className="text-sm font-bold text-slate-800">{vehicle.seats} Passagers</div>
              </div>
            </div>

            <div className="p-3.5 bg-[#F9F9FD] rounded-2xl border border-slate-200 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-white text-[#795900] shadow-xs">
                <Luggage className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-slate-500">Bagages</div>
                <div className="text-sm font-bold text-slate-800">{vehicle.luggage} Valises max</div>
              </div>
            </div>

            <div className="p-3.5 bg-[#F9F9FD] rounded-2xl border border-slate-200 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-white text-[#795900] shadow-xs">
                <Gauge className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-slate-500">Boîte de vitesse</div>
                <div className="text-sm font-bold text-slate-800">{vehicle.transmission}</div>
              </div>
            </div>

            <div className="p-3.5 bg-[#F9F9FD] rounded-2xl border border-slate-200 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-white text-[#795900] shadow-xs">
                <Fuel className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-slate-500">Carburant</div>
                <div className="text-sm font-bold text-slate-800">{vehicle.fuel}</div>
              </div>
            </div>
          </div>

          {/* Description & Features */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-bold text-[#1A1A2E] font-serif mb-3">
                Présentation du véhicule
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                {vehicle.description}
              </p>

              <div className="mt-4 p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#D4A017]" />
                  Garanties Nyokah incluses :
                </div>
                <div>• Chauffeur dédié en tenue soignée, ponctuel et assermenté</div>
                <div>• Véhicule désinfecté et climatisé avant chaque mission</div>
                <div>• Forfait kilométrique : <span className="font-semibold">{vehicle.mileageLimit}</span></div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-[#1A1A2E] font-serif mb-3">
                Équipements & Prestations à bord
              </h3>
              <ul className="space-y-2.5">
                {vehicle.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-sm text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-[#D4A017] shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Pricing Grid by Formula */}
          <div className="border-t border-slate-200 pt-6">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <h3 className="text-lg font-bold text-[#1A1A2E] font-serif">
                Grille des tarifs officiels (avec chauffeur)
              </h3>
              {hasDiscount && (
                <span className="px-3 py-1 rounded-full bg-[#D4A017]/20 text-[#795900] font-bold text-xs flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5" />
                  Tarif Société {activeCompany.name} appliqué (-{discountRate}%)
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-[#F9F9FD] border border-slate-200">
                <div className="text-xs text-slate-500 font-medium">Journée Complète (8h-18h)</div>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-xl font-bold text-[#795900]">
                    {formatFCFA(discountedDailyRate)}
                  </span>
                  <span className="text-xs text-slate-500">/jour</span>
                </div>
                {hasDiscount && (
                  <div className="text-[11px] text-slate-400 line-through">
                    Public : {formatFCFA(vehicle.dailyRate)}
                  </div>
                )}
              </div>

              <div className="p-4 rounded-2xl bg-[#F9F9FD] border border-slate-200">
                <div className="text-xs text-slate-500 font-medium">Demi-Journée (4h)</div>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-xl font-bold text-[#795900]">
                    {formatFCFA(hasDiscount ? Math.round(vehicle.halfDayRate * (1 - discountRate/100)) : vehicle.halfDayRate)}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500">Idéal réunions express Plateau</div>
              </div>

              <div className="p-4 rounded-2xl bg-[#F9F9FD] border border-slate-200">
                <div className="text-xs text-slate-500 font-medium">Transfert Aéroport FHB</div>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-xl font-bold text-[#795900]">
                    {formatFCFA(hasDiscount ? Math.round(vehicle.airportTransferRate * (1 - discountRate/100)) : vehicle.airportTransferRate)}
                  </span>
                  <span className="text-xs text-slate-500">/trajet</span>
                </div>
                <div className="text-[11px] text-slate-500">Accueil pancarte & attente 1h</div>
              </div>
            </div>
          </div>

          {/* Action Zone (Book or Waitlist) */}
          <div className="border-t border-slate-200 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <div className="text-xs text-slate-500">Tarif journalier de référence</div>
              <div className="text-2xl font-bold text-[#1A1A2E]">
                {formatFCFA(discountedDailyRate)} <span className="text-sm font-normal text-slate-500">TTC/jour</span>
              </div>
            </div>

            {vehicle.status === 'Disponible' ? (
              <button
                onClick={() => {
                  onClose();
                  onBook(vehicle);
                }}
                className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-[#1A1A2E] text-[#D4A017] hover:bg-[#2A2A4E] font-bold text-sm shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 border border-[#D4A017]/40"
              >
                <Calendar className="w-4 h-4" />
                <span>Réserver ce véhicule maintenant</span>
              </button>
            ) : (
              <div className="w-full sm:w-auto">
                {waitlistSuccess ? (
                  <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Inscrit sur la liste d'attente avec succès !
                  </div>
                ) : (
                  <form onSubmit={handleWaitlistSubmit} className="flex gap-2">
                    <input
                      type="email"
                      required
                      placeholder="Votre email professionnel"
                      value={waitlistEmail}
                      onChange={(e) => setWaitlistEmail(e.target.value)}
                      className="px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-1 focus:ring-[#D4A017] outline-none"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-[#E94560] text-white hover:bg-[#d43751] text-xs font-bold rounded-xl transition-colors shrink-0 flex items-center gap-1"
                    >
                      <Send className="w-3.5 h-3.5" />
                      M'inscrire sur la liste d'attente
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
