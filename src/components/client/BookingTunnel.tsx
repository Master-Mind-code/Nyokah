import React, { useState } from 'react';
import { useApp, formatFCFA } from '../../context/AppContext';
import { RentalFormula, Booking } from '../../types';
import { 
  Check, 
  ArrowLeft, 
  ArrowRight, 
  Sparkles, 
  ShieldCheck, 
  MapPin, 
  Calendar, 
  Clock, 
  Users, 
  Luggage, 
  Building2, 
  Tag, 
  CheckCircle2, 
  Car, 
  FileText, 
  Phone, 
  Mail, 
  Plane,
  AlertCircle
} from 'lucide-react';

export const BookingTunnel: React.FC = () => {
  const { 
    vehicles, 
    companies, 
    currentCompanyId, 
    setCurrentCompanyId,
    bookingDraft, 
    setBookingDraft, 
    calculatePrice, 
    submitBooking, 
    setClientTab, 
    setRole,
    showToast 
  } = useApp();

  const [currentStep, setCurrentStep] = useState<number>(4); // Default to Step 4 as in Image 3 mockup for presentation, but user can click any step
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);
  const [promoInput, setPromoInput] = useState<string>(bookingDraft.promoCode || 'CORP15');
  const [promoAppliedMessage, setPromoAppliedMessage] = useState<string>('Code appliqué avec succès.');
  const [promoError, setPromoError] = useState<string>('');

  const selectedVehicle = vehicles.find((v) => v.id === bookingDraft.vehicleId) || vehicles[3] || vehicles[0];
  const price = calculatePrice({ ...bookingDraft, promoCode: promoInput }, selectedVehicle, currentCompanyId);
  const activeCompany = companies.find((c) => c.id === currentCompanyId);

  const formulas: RentalFormula[] = [
    'Journée (8h-18h)',
    'Demi-journée (4h)',
    'Mise à disposition continue (24h)',
    'Transfert Aéroport FHB',
    'Mise à disposition mensuelle'
  ];

  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoInput.trim()) {
      setPromoError('Veuillez saisir un code valide.');
      setPromoAppliedMessage('');
      return;
    }

    setBookingDraft((prev) => ({ ...prev, promoCode: promoInput.trim() }));
    setPromoError('');
    setPromoAppliedMessage(`Code "${promoInput.toUpperCase()}" vérifié et appliqué.`);
    showToast(`Code promo "${promoInput.toUpperCase()}" appliqué au calcul !`, 'success');
  };

  const handleConfirmReservation = () => {
    const booking = submitBooking();
    setConfirmedBooking(booking);
    setCurrentStep(5); // Success confirmation
  };

  // Get initials for avatar
  const getInitials = (name: string) => {
    if (!name) return 'JD';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {/* Header section matching Image 3.png */}
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-4xl font-bold font-serif text-[#1A1C1F] mb-1">
          Finalisation de la réservation
        </h1>
        <p className="text-sm font-medium text-slate-600">
          {selectedVehicle.brand} {selectedVehicle.model} ({selectedVehicle.year})
        </p>
      </div>

      {/* Stepper (Dates -> Lieu -> Client -> Récapitulatif) */}
      {currentStep <= 4 && (
        <div className="max-w-xl mx-auto mb-10">
          <div className="flex justify-between items-center relative">
            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-200 -z-10 -translate-y-1/2" />
            
            {/* Step 1 */}
            <button
              onClick={() => setCurrentStep(1)}
              className="flex flex-col items-center gap-1.5 bg-[#F9F9FD] px-2"
            >
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all ${
                currentStep > 1 
                  ? 'border-[#795900] bg-[#D4A017] text-[#1A1A2E]' 
                  : currentStep === 1
                  ? 'border-[#795900] bg-white text-[#795900]'
                  : 'border-slate-300 bg-white text-slate-400'
              }`}>
                {currentStep > 1 ? <Check className="w-4 h-4" /> : '1'}
              </div>
              <span className={`text-[11px] font-semibold ${currentStep >= 1 ? 'text-[#795900]' : 'text-slate-400'}`}>
                Dates
              </span>
            </button>

            {/* Step 2 */}
            <button
              onClick={() => setCurrentStep(2)}
              className="flex flex-col items-center gap-1.5 bg-[#F9F9FD] px-2"
            >
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all ${
                currentStep > 2 
                  ? 'border-[#795900] bg-[#D4A017] text-[#1A1A2E]' 
                  : currentStep === 2
                  ? 'border-[#795900] bg-white text-[#795900]'
                  : 'border-slate-300 bg-white text-slate-400'
              }`}>
                {currentStep > 2 ? <Check className="w-4 h-4" /> : '2'}
              </div>
              <span className={`text-[11px] font-semibold ${currentStep >= 2 ? 'text-[#795900]' : 'text-slate-400'}`}>
                Lieu
              </span>
            </button>

            {/* Step 3 */}
            <button
              onClick={() => setCurrentStep(3)}
              className="flex flex-col items-center gap-1.5 bg-[#F9F9FD] px-2"
            >
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all ${
                currentStep > 3 
                  ? 'border-[#795900] bg-[#D4A017] text-[#1A1A2E]' 
                  : currentStep === 3
                  ? 'border-[#795900] bg-white text-[#795900]'
                  : 'border-slate-300 bg-white text-slate-400'
              }`}>
                {currentStep > 3 ? <Check className="w-4 h-4" /> : '3'}
              </div>
              <span className={`text-[11px] font-semibold ${currentStep >= 3 ? 'text-[#795900]' : 'text-slate-400'}`}>
                Client
              </span>
            </button>

            {/* Step 4 */}
            <button
              onClick={() => setCurrentStep(4)}
              className="flex flex-col items-center gap-1.5 bg-[#F9F9FD] px-2"
            >
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all ${
                currentStep === 4 
                  ? 'border-[#795900] bg-white text-[#795900] ring-4 ring-[#D4A017]/20' 
                  : currentStep > 4
                  ? 'border-[#795900] bg-[#D4A017] text-[#1A1A2E]'
                  : 'border-slate-300 bg-white text-slate-400'
              }`}>
                4
              </div>
              <span className={`text-[11px] font-bold ${currentStep === 4 ? 'text-[#795900]' : 'text-slate-400'}`}>
                Récapitulatif
              </span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 1: Dates & Formule */}
      {currentStep === 1 && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm max-w-2xl mx-auto space-y-6 animate-in fade-in duration-200">
          <h2 className="text-xl font-bold font-serif text-slate-900 border-b border-slate-100 pb-3">
            Étape 1 : Dates & Formule de prestation
          </h2>

          <div className="space-y-4">
            {/* Formula Selector */}
            <div>
              <label className="block text-xs uppercase tracking-wider font-bold text-slate-600 mb-2">
                Formule choisie
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {formulas.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setBookingDraft((prev) => ({ ...prev, formula: f }))}
                    className={`p-3 rounded-2xl text-left border text-xs font-semibold transition-all ${
                      bookingDraft.formula === f
                        ? 'border-[#795900] bg-[#D4A017]/10 text-[#795900] shadow-xs'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Date Pickers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase tracking-wider font-bold text-slate-600 mb-1">
                  Date de début
                </label>
                <input
                  type="date"
                  value={bookingDraft.startDate}
                  onChange={(e) => setBookingDraft((prev) => ({ ...prev, startDate: e.target.value }))}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider font-bold text-slate-600 mb-1">
                  Date de restitution
                </label>
                <input
                  type="date"
                  value={bookingDraft.endDate}
                  onChange={(e) => setBookingDraft((prev) => ({ ...prev, endDate: e.target.value }))}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800"
                />
              </div>
            </div>

            {/* Time Pickers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase tracking-wider font-bold text-slate-600 mb-1">
                  Heure de prise en charge
                </label>
                <input
                  type="time"
                  value={bookingDraft.startTime}
                  onChange={(e) => setBookingDraft((prev) => ({ ...prev, startTime: e.target.value }))}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider font-bold text-slate-600 mb-1">
                  Heure de fin estimée
                </label>
                <input
                  type="time"
                  value={bookingDraft.endTime}
                  onChange={(e) => setBookingDraft((prev) => ({ ...prev, endTime: e.target.value }))}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-slate-100">
            <button
              onClick={() => setClientTab('catalog')}
              className="text-xs font-semibold text-slate-600 hover:underline"
            >
              Changer de véhicule
            </button>
            <button
              onClick={() => setCurrentStep(2)}
              className="px-6 py-2.5 rounded-full bg-[#795900] text-white hover:bg-[#5c4300] text-xs font-bold flex items-center gap-1.5 shadow-md"
            >
              <span>Continuer vers les Lieux</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Lieux & Options */}
      {currentStep === 2 && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm max-w-2xl mx-auto space-y-6 animate-in fade-in duration-200">
          <h2 className="text-xl font-bold font-serif text-slate-900 border-b border-slate-100 pb-3">
            Étape 2 : Lieux de prise en charge & Options
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-wider font-bold text-slate-600 mb-1">
                Lieu de prise en charge à Abidjan / Intérieur
              </label>
              <input
                type="text"
                placeholder="Ex: Aéroport Félix-Houphouët-Boigny, Sofitel Hôtel Ivoire, Plateau..."
                value={bookingDraft.pickupLocation}
                onChange={(e) => setBookingDraft((prev) => ({ ...prev, pickupLocation: e.target.value }))}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider font-bold text-slate-600 mb-1">
                Lieu de retour / Destination principale
              </label>
              <input
                type="text"
                placeholder="Ex: Siège SIFCA Plateau, Sofitel Ivoire Cocody, Grand-Bassam..."
                value={bookingDraft.dropoffLocation}
                onChange={(e) => setBookingDraft((prev) => ({ ...prev, dropoffLocation: e.target.value }))}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800"
              />
            </div>

            {/* Flight number if airport */}
            <div>
              <label className="block text-xs uppercase tracking-wider font-bold text-slate-600 mb-1">
                Numéro de vol (si accueil aéroport)
              </label>
              <input
                type="text"
                placeholder="Ex: AF 702, Corsair SS 984, Air Côte d'Ivoire HF 501..."
                value={bookingDraft.flightNumber || ''}
                onChange={(e) => setBookingDraft((prev) => ({ ...prev, flightNumber: e.target.value }))}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800"
              />
            </div>

            {/* Fuel Included Option */}
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-900">Option Carburant Forfaitisé Inclus</div>
                <div className="text-[11px] text-slate-600">
                  Plein fait au départ, pas de gestion de tickets essence ni d'attente en station.
                </div>
              </div>
              <input
                type="checkbox"
                checked={bookingDraft.fuelIncluded}
                onChange={(e) => setBookingDraft((prev) => ({ ...prev, fuelIncluded: e.target.checked }))}
                className="w-5 h-5 rounded text-[#D4A017] focus:ring-[#D4A017] border-slate-300"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider font-bold text-slate-600 mb-1">
                Demandes particulières / Protocole
              </label>
              <textarea
                rows={2}
                placeholder="Ex: Chauffeur bilingue anglais, pancarte VIP personnalisée, eau minérale fraîche..."
                value={bookingDraft.specialRequests || ''}
                onChange={(e) => setBookingDraft((prev) => ({ ...prev, specialRequests: e.target.value }))}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
              />
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-slate-100">
            <button
              onClick={() => setCurrentStep(1)}
              className="text-xs font-semibold text-slate-600 hover:underline flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Précédent
            </button>
            <button
              onClick={() => setCurrentStep(3)}
              className="px-6 py-2.5 rounded-full bg-[#795900] text-white hover:bg-[#5c4300] text-xs font-bold flex items-center gap-1.5 shadow-md"
            >
              <span>Continuer vers le Passager</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Coordonnées Client / Société */}
      {currentStep === 3 && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm max-w-2xl mx-auto space-y-6 animate-in fade-in duration-200">
          <h2 className="text-xl font-bold font-serif text-slate-900 border-b border-slate-100 pb-3">
            Étape 3 : Coordonnées du Passager & Société
          </h2>

          <div className="space-y-4">
            {/* Corporate Switcher inside Step */}
            <div>
              <label className="block text-xs uppercase tracking-wider font-bold text-slate-600 mb-2">
                Compte de facturation & Rabais société
              </label>
              <select
                value={currentCompanyId || 'none'}
                onChange={(e) => setCurrentCompanyId(e.target.value === 'none' ? null : e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 cursor-pointer"
              >
                <option value="none">Client Particulier / Invité (Pas de rabais accord-cadre)</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — Rabais contractuel de -{c.negotiatedDiscountRate}% ({c.promoCode})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider font-bold text-slate-600 mb-1">
                Nom complet du passager principal
              </label>
              <input
                type="text"
                value={bookingDraft.clientName}
                onChange={(e) => setBookingDraft((prev) => ({ ...prev, clientName: e.target.value }))}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase tracking-wider font-bold text-slate-600 mb-1">
                  Email professionnel (pour envoi du voucher)
                </label>
                <input
                  type="email"
                  value={bookingDraft.clientEmail}
                  onChange={(e) => setBookingDraft((prev) => ({ ...prev, clientEmail: e.target.value }))}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider font-bold text-slate-600 mb-1">
                  Numéro de téléphone / WhatsApp
                </label>
                <input
                  type="tel"
                  value={bookingDraft.clientPhone}
                  onChange={(e) => setBookingDraft((prev) => ({ ...prev, clientPhone: e.target.value }))}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-slate-100">
            <button
              onClick={() => setCurrentStep(2)}
              className="text-xs font-semibold text-slate-600 hover:underline flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Précédent
            </button>
            <button
              onClick={() => setCurrentStep(4)}
              className="px-6 py-2.5 rounded-full bg-[#795900] text-white hover:bg-[#5c4300] text-xs font-bold flex items-center gap-1.5 shadow-md"
            >
              <span>Voir le Récapitulatif du Tarif</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Récapitulatif (Bento Layout Matching Image 3.png) */}
      {currentStep === 4 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-200">
          
          {/* Left Column: Details (2 Cols) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* 1. Vehicle Card */}
            <div className="bg-white rounded-2xl shadow-xs border border-[#E2E2E6] p-5 flex flex-col sm:flex-row gap-5 items-start sm:items-center">
              <div className="w-full sm:w-1/3 aspect-[4/3] rounded-xl overflow-hidden bg-slate-900 shadow-sm shrink-0">
                <img
                  src={selectedVehicle.imageUrl}
                  alt={selectedVehicle.model}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex-grow space-y-2">
                <h2 className="text-xl sm:text-2xl font-bold font-serif text-slate-900">
                  {selectedVehicle.brand} {selectedVehicle.model}
                </h2>
                <div className="flex items-center gap-3 text-xs text-slate-600">
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4 text-slate-400" /> {selectedVehicle.seats} Places
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Luggage className="w-4 h-4 text-slate-400" /> {selectedVehicle.luggage} Bagages
                  </span>
                </div>

                <div className="inline-flex items-center gap-1.5 bg-[#E2E2E6]/60 px-3 py-1 rounded-full text-xs font-semibold text-slate-800 mt-1">
                  <Sparkles className="w-3.5 h-3.5 text-[#795900]" />
                  <span>{selectedVehicle.isVip ? 'Chauffeur Premium Inclus' : 'Chauffeur Pro Inclus'}</span>
                </div>
              </div>
            </div>

            {/* 2. Détails de la prestation */}
            <div className="bg-white rounded-2xl shadow-xs border border-[#E2E2E6] p-6 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#795900] border-b border-[#E2E2E6] pb-2">
                Détails de la prestation
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Prise en charge</p>
                  <p className="text-sm font-bold text-slate-900">
                    {bookingDraft.startDate}, {bookingDraft.startTime}
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {bookingDraft.pickupLocation}
                  </p>
                  {bookingDraft.flightNumber && (
                    <span className="inline-flex items-center gap-1 mt-1 text-[11px] text-[#795900] font-medium">
                      <Plane className="w-3 h-3" /> Vol : {bookingDraft.flightNumber}
                    </span>
                  )}
                </div>

                <div>
                  <p className="text-xs text-slate-500 mb-1">Retour</p>
                  <p className="text-sm font-bold text-slate-900">
                    {bookingDraft.endDate}, {bookingDraft.endTime}
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {bookingDraft.dropoffLocation}
                  </p>
                  <span className="inline-block mt-1 text-[11px] text-slate-500">
                    Formule : {bookingDraft.formula}
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Coordonnées du Passager */}
            <div className="bg-white rounded-2xl shadow-xs border border-[#E2E2E6] p-6 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#795900] border-b border-[#E2E2E6] pb-2">
                Coordonnées du Passager
              </h3>

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#D4A017] rounded-full flex items-center justify-center text-[#1A1A2E] font-bold font-serif text-lg shrink-0 shadow-sm">
                  {getInitials(bookingDraft.clientName)}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    {bookingDraft.clientName}
                  </p>
                  <p className="text-xs text-slate-600">{bookingDraft.clientEmail}</p>
                  <p className="text-xs text-slate-600">{bookingDraft.clientPhone}</p>
                  {activeCompany && (
                    <span className="inline-flex items-center gap-1 mt-1 text-[11px] text-[#795900] font-semibold">
                      <Building2 className="w-3 h-3" /> Société : {activeCompany.name}
                    </span>
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Price Calculation Card (Sticky) */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-md border border-[#795900] p-6 sticky top-24 space-y-6">
              <h3 className="text-xl font-bold font-serif text-slate-900">
                Résumé du prix
              </h3>

              {/* Breakdown lines */}
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">
                    Prix de base ({price.durationDays} jour{price.durationDays > 1 ? 's' : ''})
                  </span>
                  <span className="font-semibold text-slate-900">
                    {formatFCFA(price.basePrice)}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-600">
                    Formule & Carburant
                  </span>
                  <span className="font-semibold text-slate-900">
                    {price.fuelOptionCost > 0 ? formatFCFA(price.fuelOptionCost) : 'Inclus dans formule'}
                  </span>
                </div>

                {/* Remise Société line in Gold / Green with verified check icon */}
                {price.discountAmount > 0 && (
                  <div className="flex justify-between items-center text-[#795900] bg-amber-50/70 p-2.5 rounded-xl border border-amber-200">
                    <span className="font-semibold text-xs flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-[#D4A017] shrink-0" />
                      <span>{price.discountReason}</span>
                    </span>
                    <span className="font-bold text-xs">
                      - {formatFCFA(price.discountAmount)}
                    </span>
                  </div>
                )}
              </div>

              {/* Total TTC Box */}
              <div className="border-t border-[#E2E2E6] pt-4">
                <div className="flex justify-between items-end">
                  <span className="text-xs uppercase tracking-wider font-bold text-slate-700">
                    TOTAL TTC
                  </span>
                  <div className="text-right">
                    <div className="text-2xl sm:text-3xl font-bold font-serif text-[#795900]">
                      {formatFCFA(price.totalTTC)}
                    </div>
                    <span className="text-[10px] text-slate-500 block">
                      TVA (18%) incluse ({formatFCFA(price.taxAmount)})
                    </span>
                  </div>
                </div>
              </div>

              {/* Promo Code Input & Apply form */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  Code Promo / Société
                </label>
                <form onSubmit={handleApplyPromo} className="flex gap-2">
                  <input
                    type="text"
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value)}
                    placeholder="Saisir un code"
                    className="w-full bg-[#F9F9FD] px-3.5 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 uppercase focus:outline-none focus:ring-1 focus:ring-[#795900]"
                  />
                  <button
                    type="submit"
                    className="bg-[#E2E2E6] hover:bg-slate-300 text-slate-800 px-4 py-2 rounded-xl text-xs font-bold transition-colors shrink-0 cursor-pointer"
                  >
                    Appliquer
                  </button>
                </form>
                {promoAppliedMessage && (
                  <p className="text-[11px] font-semibold text-[#795900] flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    {promoAppliedMessage}
                  </p>
                )}
                {promoError && (
                  <p className="text-[11px] font-semibold text-[#E94560] flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {promoError}
                  </p>
                )}
              </div>

              {/* Action Buttons matching Image 3.png */}
              <div className="space-y-2.5 pt-2">
                <button
                  onClick={handleConfirmReservation}
                  className="w-full bg-[#795900] text-white font-bold text-xs sm:text-sm py-3.5 rounded-xl hover:bg-[#5c4300] transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Confirmer la réservation</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setCurrentStep(3)}
                  className="w-full bg-transparent border border-slate-300 text-slate-700 font-semibold text-xs py-3 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Retour à l'étape précédente
                </button>
              </div>

            </div>
          </div>

        </div>
      )}

      {/* STEP 5: Success & Booking Confirmation Voucher */}
      {currentStep === 5 && confirmedBooking && (
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 shadow-2xl max-w-2xl mx-auto text-center space-y-6 animate-in zoom-in-95 duration-300">
          <div className="w-16 h-16 rounded-full bg-[#D4A017]/20 text-[#795900] flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <span className="text-xs uppercase tracking-widest text-[#795900] font-bold">
              Réservation Enregistrée avec Succès
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold font-serif text-slate-900">
              Merci pour votre confiance, {confirmedBooking.clientName}
            </h2>
            <div className="inline-block bg-[#1A1A2E] text-[#D4A017] px-4 py-1.5 rounded-full font-mono text-sm font-bold shadow-xs">
              Référence : {confirmedBooking.id}
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
            Votre demande a été transmise à notre régie d'Abidjan. Notre gestionnaire de flotte affecte actuellement votre chauffeur dédié et votre véhicule.
          </p>

          {/* Quick Recap Ticket */}
          <div className="bg-[#F9F9FD] rounded-2xl p-5 border border-slate-200 text-left space-y-3 text-xs">
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500">Véhicule</span>
              <span className="font-bold text-slate-900">{confirmedBooking.vehicleName}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500">Dates</span>
              <span className="font-bold text-slate-900">
                {confirmedBooking.startDate} au {confirmedBooking.endDate} ({confirmedBooking.durationDays} j)
              </span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500">Prise en charge</span>
              <span className="font-bold text-slate-900">{confirmedBooking.pickupLocation}</span>
            </div>
            {confirmedBooking.discountAmount > 0 && (
              <div className="flex justify-between border-b border-slate-200 pb-2 text-[#795900]">
                <span>Remise appliquée</span>
                <span className="font-bold">- {formatFCFA(confirmedBooking.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between pt-1 text-sm font-bold text-slate-900">
              <span>Total TTC</span>
              <span className="text-[#795900]">{formatFCFA(confirmedBooking.totalAmount)}</span>
            </div>
          </div>

          {/* Action options */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 justify-center">
            <button
              onClick={() => setClientTab('company-space')}
              className="px-6 py-3 rounded-full bg-[#1A1A2E] text-[#D4A017] hover:bg-[#2A2A4E] text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2"
            >
              <FileText className="w-4 h-4" />
              <span>Voir dans l'Espace Entreprise</span>
            </button>

            <button
              onClick={() => {
                setRole('admin');
              }}
              className="px-6 py-3 rounded-full bg-[#D4A017] text-[#1A1A2E] hover:bg-[#c49212] text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2"
            >
              <Car className="w-4 h-4" />
              <span>Voir en Back-Office Admin (Affecter un chauffeur)</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
