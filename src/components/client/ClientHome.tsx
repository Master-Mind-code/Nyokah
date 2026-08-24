import React, { useState } from 'react';
import { useApp, formatFCFA } from '../../context/AppContext';
import { Vehicle, RentalFormula, VehicleCategory } from '../../types';
import { 
  Search, 
  Users, 
  Wind, 
  Luggage, 
  Wifi, 
  Sparkles, 
  ShieldCheck, 
  Clock, 
  CreditCard, 
  Award, 
  ArrowRight, 
  Calendar, 
  CheckCircle2, 
  Building2, 
  ChevronRight,
  UserCheck,
  Zap,
  PhoneCall
} from 'lucide-react';

interface ClientHomeProps {
  onOpenVehicleModal: (vehicle: Vehicle) => void;
}

export const ClientHome: React.FC<ClientHomeProps> = ({ onOpenVehicleModal }) => {
  const { 
    vehicles, 
    setClientTab, 
    startBookingForVehicle, 
    setBookingDraft,
    currentCompanyId,
    companies,
    packs,
    openAuthModal,
    currentUser
  } = useApp();

  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('Tous');
  const [searchDates, setSearchDates] = useState<string>('Aujourd\'hui - Demain');
  const [searchType, setSearchType] = useState<string>('Tous les véhicules');
  const [searchFormula, setSearchFormula] = useState<RentalFormula>('Journée (8h-18h)');

  const activeCompany = companies.find((c) => c.id === currentCompanyId);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setClientTab('catalog');
  };

  // Featured vehicles (including the ones from the design prompt: Corolla, Prado, Mercedes E, Range Rover)
  const featuredVehicles = vehicles.filter((v) => {
    if (selectedTypeFilter === 'Tous') return true;
    if (selectedTypeFilter === 'Berlines') return v.category === 'Berline';
    if (selectedTypeFilter === 'SUVs') return v.category === 'SUV';
    if (selectedTypeFilter === 'VIP') return v.category === 'VIP Prestige';
    return true;
  }).slice(0, 6);

  return (
    <div className="space-y-16 pb-16">
      
      {/* 1. Hero Section */}
      <section className="relative px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10">
        {/* Background Banner with Abidjan Skyline Image */}
        <div className="relative mx-auto max-w-7xl rounded-3xl overflow-hidden shadow-2xl min-h-[460px] sm:min-h-[500px] flex items-center justify-center text-center p-6 sm:p-12">
          <div 
            className="absolute inset-0 bg-cover bg-center z-0 scale-105 transition-transform duration-1000"
            style={{
              backgroundImage: `url('https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1800&q=85')`
            }}
          />
          {/* Deep Midnight Blue overlay gradient with subtle gold tone */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A2E]/95 via-[#1A1A2E]/80 to-[#1A1A2E]/65 z-10" />

          {/* Decorative subtle gold circles motif */}
          <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full border border-[#D4A017]/20 pointer-events-none z-10" />
          <div className="absolute -bottom-20 -left-20 w-96 h-96 rounded-full border border-[#D4A017]/15 pointer-events-none z-10" />

          {/* Hero Content */}
          <div className="relative z-20 max-w-3xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#D4A017]/20 border border-[#D4A017]/40 text-[#ffdfa0] text-xs font-semibold backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 text-[#D4A017]" />
              <span>Service B2B & Conciergerie Automobile Abidjan</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold font-serif text-white tracking-tight leading-tight">
              Location de véhicules <br />
              <span className="text-[#D4A017] italic">avec chauffeur</span>
            </h1>

            <p className="text-base sm:text-xl text-slate-200 font-light max-w-2xl mx-auto leading-relaxed">
              L'excellence, la sécurité et la ponctualité pour vos déplacements professionnels et délégations en Côte d'Ivoire.
            </p>

            {/* Quick Search Bar Widget */}
            <form
              onSubmit={handleSearchSubmit}
              className="bg-white p-3 sm:p-4 rounded-2xl sm:rounded-full shadow-2xl flex flex-col sm:flex-row items-center gap-3 border border-slate-200/80 max-w-3xl mx-auto text-left"
            >
              {/* Dates input */}
              <div className="w-full sm:w-1/3 px-3 py-1.5 rounded-xl sm:rounded-l-full bg-slate-50 border border-slate-200">
                <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-500">
                  Dates de mission
                </label>
                <input
                  type="text"
                  value={searchDates}
                  onChange={(e) => setSearchDates(e.target.value)}
                  placeholder="Aujourd'hui - Demain"
                  className="w-full bg-transparent text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none"
                />
              </div>

              {/* Vehicle Type select */}
              <div className="w-full sm:w-1/3 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
                <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-500">
                  Type de véhicule
                </label>
                <select
                  value={searchType}
                  onChange={(e) => setSearchType(e.target.value)}
                  className="w-full bg-transparent text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none cursor-pointer"
                >
                  <option>Tous les véhicules</option>
                  <option>Berline Prestige</option>
                  <option>SUV & 4x4 Tout-Terrain</option>
                  <option>VIP Haut de Gamme</option>
                  <option>Minibus & Van</option>
                </select>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl sm:rounded-full bg-[#795900] hover:bg-[#5c4300] text-white font-bold text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 shrink-0 cursor-pointer"
              >
                <Search className="w-4 h-4" />
                <span>Rechercher</span>
              </button>
            </form>

            {/* Corporate tag if connected */}
            {activeCompany && (
              <div className="inline-flex items-center gap-2 text-xs text-[#ffdfa0] bg-white/10 backdrop-blur-md px-3.5 py-1 rounded-full border border-white/15">
                <Building2 className="w-3.5 h-3.5 text-[#D4A017]" />
                <span>Tarif négocié actif pour <strong>{activeCompany.name}</strong> (-{activeCompany.negotiatedDiscountRate}%)</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 2. Featured Fleet Section (Matching Image 1.png) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <span className="text-xs uppercase tracking-widest text-[#795900] font-bold">
              Mobilité Exécutive
            </span>
            <h2 className="text-2xl sm:text-4xl font-bold font-serif text-[#1A1C1F] tracking-tight">
              Notre Flotte Premium
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Sélectionnez le véhicule adapté à vos exigences de déplacement
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {['Tous', 'Berlines', 'SUVs', 'VIP'].map((tab) => (
              <button
                key={tab}
                onClick={() => setSelectedTypeFilter(tab)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all shrink-0 ${
                  selectedTypeFilter === tab
                    ? 'bg-[#D4A017] text-[#1A1A2E] shadow-sm'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Vehicle Grid (Styled as in Image 1.png) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {featuredVehicles.map((vehicle) => {
            const isAvailable = vehicle.status === 'Disponible';
            const hasCorporateDiscount = activeCompany && activeCompany.negotiatedDiscountRate > 0;
            const discountRate = activeCompany?.negotiatedDiscountRate || 0;
            const effectivePrice = hasCorporateDiscount
              ? Math.round(vehicle.dailyRate * (1 - discountRate / 100))
              : vehicle.dailyRate;

            return (
              <article
                key={vehicle.id}
                className="group bg-white rounded-3xl border border-[#E2E2E6] overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col relative"
              >
                {/* Recommended corner banner if flagged */}
                {vehicle.isRecommended && (
                  <div className="absolute top-0 right-0 w-24 h-24 overflow-hidden z-20 pointer-events-none">
                    <div className="absolute transform rotate-45 bg-[#795900] text-white text-[9px] font-bold py-1 right-[-32px] top-[18px] w-[120px] text-center shadow-md uppercase tracking-wider">
                      RECOMMANDÉ
                    </div>
                  </div>
                )}

                {/* Photo & Top Badges */}
                <div className="relative h-56 w-full bg-slate-900 overflow-hidden cursor-pointer" onClick={() => onOpenVehicleModal(vehicle)}>
                  <img
                    src={vehicle.imageUrl}
                    alt={`${vehicle.brand} ${vehicle.model}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

                  {/* Chauffeur badge */}
                  <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full border border-slate-200 flex items-center gap-1.5 shadow-sm">
                    <UserCheck className="w-3.5 h-3.5 text-[#795900]" />
                    <span className="text-xs font-semibold text-slate-900">
                      {vehicle.isVip ? 'Chauffeur VIP inclus' : 'Chauffeur inclus'}
                    </span>
                  </div>

                  {/* Availability Badge */}
                  <div className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold shadow-sm backdrop-blur-md ${
                    isAvailable
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-[#FFDAD6] text-[#93000A] border border-[#FFDAD6]'
                  }`}>
                    {vehicle.status}
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h3 
                        onClick={() => onOpenVehicleModal(vehicle)}
                        className="text-xl font-bold font-serif text-slate-900 group-hover:text-[#795900] transition-colors cursor-pointer"
                      >
                        {vehicle.brand} {vehicle.model}
                      </h3>
                      <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                        {vehicle.year}
                      </span>
                    </div>

                    {/* Features row */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4 text-slate-400" />
                        <span>{vehicle.seats} Places</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Wind className="w-4 h-4 text-slate-400" />
                        <span>Climatisation</span>
                      </div>
                      {vehicle.isVip && (
                        <div className="flex items-center gap-1 text-[#795900] font-semibold">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Prestige VIP</span>
                        </div>
                      )}
                      {vehicle.category === 'SUV' && (
                        <div className="flex items-center gap-1 text-slate-600">
                          <Luggage className="w-4 h-4 text-slate-400" />
                          <span>Grand Coffre</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Price & Action Bottom Row */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-slate-500 uppercase tracking-wider block">
                        À partir de
                      </span>
                      <div className="text-xl font-bold text-[#795900]">
                        {formatFCFA(effectivePrice)}
                        <span className="text-xs font-normal text-slate-500">/j</span>
                      </div>
                      {hasCorporateDiscount && (
                        <span className="text-[10px] text-slate-400 line-through">
                          Public : {formatFCFA(vehicle.dailyRate)}
                        </span>
                      )}
                    </div>

                    {isAvailable ? (
                      <button
                        onClick={() => startBookingForVehicle(vehicle)}
                        className="px-5 py-2.5 rounded-full bg-[#795900] hover:bg-[#5c4300] text-white font-bold text-xs shadow-md transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <span>Réserver</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        onClick={() => onOpenVehicleModal(vehicle)}
                        className="px-4 py-2.5 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 font-medium text-xs transition-colors cursor-pointer"
                      >
                        Indisponible (Détail)
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {/* View All Button */}
        <div className="text-center mt-10">
          <button
            onClick={() => setClientTab('catalog')}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-[#1A1A2E] text-[#D4A017] hover:bg-[#2A2A4E] text-sm font-bold shadow-md hover:shadow-lg transition-all border border-[#D4A017]/30"
          >
            <span>Explorer les 12 véhicules de la flotte Nyokah</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* 3. Reassurance & B2B Trust Pillars */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 shadow-sm">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs uppercase tracking-widest text-[#795900] font-bold">
              Le Standard Nyokah
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold font-serif text-[#1A1C1F] mt-1">
              Pourquoi les plus grandes entreprises nous confient leurs déplacements
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="p-5 rounded-2xl bg-[#F9F9FD] border border-slate-100 space-y-3">
              <div className="w-12 h-12 rounded-xl bg-[#D4A017]/20 text-[#795900] flex items-center justify-center">
                <UserCheck className="w-6 h-6" />
              </div>
              <h3 className="font-bold font-serif text-base text-slate-900">
                100% Chauffeurs Assermentés
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Chauffeurs professionnels formés à la conduite défensive, discrets, ponctuels et bilingues français/anglais.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#F9F9FD] border border-slate-100 space-y-3">
              <div className="w-12 h-12 rounded-xl bg-[#D4A017]/20 text-[#795900] flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="font-bold font-serif text-base text-slate-900">
                Ponctualité & Télématique
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Flotte suivie par balise GPS en direct. Véhicule sur place 15 minutes avant l'heure convenue, garanti.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#F9F9FD] border border-slate-100 space-y-3">
              <div className="w-12 h-12 rounded-xl bg-[#D4A017]/20 text-[#795900] flex items-center justify-center">
                <CreditCard className="w-6 h-6" />
              </div>
              <h3 className="font-bold font-serif text-base text-slate-900">
                Tarifs Négociés Transparents
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Maîtrise des coûts avec application rigoureuse de vos remises accords-cadres et facturation mensuelle B2B.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#F9F9FD] border border-slate-100 space-y-3">
              <div className="w-12 h-12 rounded-xl bg-[#D4A017]/20 text-[#795900] flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="font-bold font-serif text-base text-slate-900">
                Assistance & Relève 24/7
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Véhicule de remplacement garanti sous 1 heure en cas d'imprévu sur tout le district autonome d'Abidjan.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Corporate Packs Showcase */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <span className="text-xs uppercase tracking-widest text-[#795900] font-bold">
              Formules Entreprises
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold font-serif text-[#1A1C1F]">
              Packs & Offres Groupées
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Des solutions forfaitaires clé en main pour vos besoins récurrents ou événementiels
            </p>
          </div>
          <button 
            onClick={() => setClientTab('company-space')}
            className="text-xs font-bold text-[#795900] hover:underline flex items-center gap-1"
          >
            Voir les conditions contrats-cadres <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {packs.map((pack) => (
            <div
              key={pack.id}
              className={`p-6 sm:p-8 rounded-3xl border transition-all flex flex-col justify-between ${
                pack.popular
                  ? 'bg-gradient-to-br from-[#1A1A2E] to-[#2A2A4E] text-white border-[#D4A017]/40 shadow-xl'
                  : 'bg-white text-slate-900 border-slate-200 shadow-sm'
              }`}
            >
              <div>
                <div className="flex justify-between items-start gap-2 mb-4">
                  <div>
                    <span className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full ${
                      pack.popular ? 'bg-[#D4A017] text-[#1A1A2E]' : 'bg-[#D4A017]/20 text-[#795900]'
                    }`}>
                      {pack.targetAudience}
                    </span>
                    <h3 className="text-xl font-bold font-serif mt-2">{pack.name}</h3>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                    pack.popular ? 'bg-white/10 text-[#D4A017]' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {pack.highlightDiscount}
                  </span>
                </div>

                <p className={`text-xs sm:text-sm leading-relaxed mb-6 ${
                  pack.popular ? 'text-slate-300' : 'text-slate-600'
                }`}>
                  {pack.description}
                </p>

                <div className="space-y-2 mb-6">
                  {pack.features.map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs">
                      <CheckCircle2 className={`w-4 h-4 shrink-0 ${pack.popular ? 'text-[#D4A017]' : 'text-[#795900]'}`} />
                      <span className={pack.popular ? 'text-slate-200' : 'text-slate-700'}>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className={`pt-6 border-t flex items-center justify-between ${
                pack.popular ? 'border-white/10' : 'border-slate-100'
              }`}>
                <div>
                  <div className={`text-[11px] ${pack.popular ? 'text-slate-400' : 'text-slate-500'}`}>
                    Tarif forfaitaire indicatif
                  </div>
                  <div className={`text-xl font-bold ${pack.popular ? 'text-[#D4A017]' : 'text-[#795900]'}`}>
                    {formatFCFA(pack.fixedPrice)}
                  </div>
                </div>

                <button
                  onClick={() => setClientTab('catalog')}
                  className={`px-5 py-2.5 rounded-full text-xs font-bold transition-colors ${
                    pack.popular
                      ? 'bg-[#D4A017] text-[#1A1A2E] hover:bg-[#c49212]'
                      : 'bg-[#1A1A2E] text-white hover:bg-[#2A2A4E]'
                  }`}
                >
                  Demander ce pack
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Member & Corporate Auth Cards */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Particuliers Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col justify-between space-y-6 relative overflow-hidden group hover:border-[#795900]/40 transition-all">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#D4A017]/15 text-[#795900] flex items-center justify-center font-bold">
                <Award className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <span className="text-[11px] uppercase tracking-wider font-extrabold text-[#795900]">
                  Nyokah Club VIP
                </span>
                <h3 className="text-xl sm:text-2xl font-bold font-serif text-slate-900">
                  Espace Particuliers & Voyageurs
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Créez votre compte pour enregistrer vos adresses favorites à Abidjan, cumuler des points fidélité et réserver en 2 clics avec chauffeur attitré.
              </p>
              <div className="space-y-2 pt-2 text-xs text-slate-700">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span><strong>+500 points offerts</strong> dès votre inscription</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Gestion des adresses favorites (Résidence, Bureau, Aéroport)</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
              {currentUser ? (
                <button
                  onClick={() => setClientTab('user-profile')}
                  className="w-full py-3 px-5 rounded-full bg-[#0B132B] text-white hover:bg-[#1A264F] text-xs font-bold transition-all text-center"
                >
                  Accéder à mon Profil ({currentUser.fullName})
                </button>
              ) : (
                <>
                  <button
                    onClick={() => openAuthModal('register-individual')}
                    className="flex-1 py-3 px-4 rounded-full bg-[#795900] hover:bg-[#5c4300] text-white text-xs font-bold transition-all text-center shadow-xs"
                  >
                    Créer mon compte
                  </button>
                  <button
                    onClick={() => openAuthModal('login')}
                    className="py-3 px-4 rounded-full border border-slate-200 hover:bg-slate-50 text-slate-800 text-xs font-bold transition-all text-center"
                  >
                    Se connecter
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Entreprises B2B Card */}
          <div className="bg-[#0B132B] text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl flex flex-col justify-between space-y-6 relative overflow-hidden group">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#D4A017] text-[#0B132B] flex items-center justify-center font-bold shadow-md">
                <Building2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <span className="text-[11px] uppercase tracking-wider font-extrabold text-[#D4A017]">
                  Accords-Cadres & Grands Comptes
                </span>
                <h3 className="text-xl sm:text-2xl font-bold font-serif text-white">
                  Compte Entreprise & DAF (B2B)
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Profitez d'une remise contractuelle immédiate jusqu'à -20%, d'une ligne de crédit fin de mois et de la gestion multi-collaborateurs.
              </p>
              <div className="space-y-2 pt-2 text-xs text-slate-200">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#D4A017] shrink-0" />
                  <span><strong>Remise de -15% à -20%</strong> automatique sur toute la flotte</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#D4A017] shrink-0" />
                  <span>Factures proforma, relevés comptables & ligne de crédit 30j</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-3">
              <button
                onClick={() => openAuthModal('register-company')}
                className="flex-1 py-3 px-4 rounded-full bg-[#D4A017] hover:bg-[#c49212] text-[#0B132B] text-xs font-bold transition-all text-center shadow-md"
              >
                Ouvrir un compte Société
              </button>
              <button
                onClick={() => setClientTab('company-space')}
                className="py-3 px-4 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition-all text-center"
              >
                Portail B2B
              </button>
            </div>
          </div>

        </div>
      </section>

      {/* 6. B2B Corporate CTA Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#1A1A2E] text-white rounded-3xl p-8 sm:p-12 relative overflow-hidden border border-[#D4A017]/30 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-4 max-w-xl">
            <div className="inline-flex items-center gap-2 text-xs text-[#D4A017] bg-white/5 px-3 py-1 rounded-full border border-[#D4A017]/30">
              <Building2 className="w-3.5 h-3.5" />
              <span>Grands Comptes & PME en Côte d'Ivoire</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-bold font-serif text-white">
              Vous représentez une société ? <br />
              <span className="text-[#D4A017]">Négociez votre grille tarifaire</span>
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Bénéficiez de 10% à 20% de remise permanente, d'une facturation mensuelle centralisée et d'un gestionnaire de compte dédié pour tous vos collaborateurs.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <button
              onClick={() => setClientTab('company-space')}
              className="px-6 py-3.5 rounded-full bg-[#D4A017] text-[#1A1A2E] hover:bg-[#c49212] text-xs font-bold shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <Building2 className="w-4 h-4" />
              <span>Accéder à l'Espace Société</span>
            </button>
            <a
              href="tel:+2252720210000"
              className="px-6 py-3.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition-all flex items-center justify-center gap-2"
            >
              <PhoneCall className="w-4 h-4 text-[#D4A017]" />
              <span>Parler à un conseiller</span>
            </a>
          </div>
        </div>
      </section>

    </div>
  );
};
