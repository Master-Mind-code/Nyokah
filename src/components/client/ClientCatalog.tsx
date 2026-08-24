import React, { useState, useMemo } from 'react';
import { useApp, formatFCFA } from '../../context/AppContext';
import { Vehicle, VehicleCategory, RentalFormula } from '../../types';
import { 
  Search, 
  Users, 
  Wind, 
  Luggage, 
  Sparkles, 
  UserCheck, 
  SlidersHorizontal, 
  ChevronRight, 
  Building2, 
  Calendar,
  X,
  Info,
  Check
} from 'lucide-react';

interface ClientCatalogProps {
  onOpenVehicleModal: (vehicle: Vehicle) => void;
}

export const ClientCatalog: React.FC<ClientCatalogProps> = ({ onOpenVehicleModal }) => {
  const { 
    vehicles, 
    startBookingForVehicle, 
    currentCompanyId, 
    companies 
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Tous');
  const [selectedSeats, setSelectedSeats] = useState<string>('Tous');
  const [onlyAvailable, setOnlyAvailable] = useState<boolean>(false);
  const [onlyVip, setOnlyVip] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'price-asc' | 'price-desc' | 'recommended'>('recommended');
  const [selectedFormula, setSelectedFormula] = useState<RentalFormula>('Journée (8h-18h)');

  const activeCompany = companies.find((c) => c.id === currentCompanyId);
  const discountRate = activeCompany?.negotiatedDiscountRate || 0;
  const hasDiscount = discountRate > 0;

  const categories: { label: string; value: string }[] = [
    { label: 'Tous les types', value: 'Tous' },
    { label: 'Berlines', value: 'Berline' },
    { label: 'SUVs & 4x4', value: 'SUV' },
    { label: 'VIP Prestige', value: 'VIP Prestige' },
    { label: 'Minibus & Vans', value: 'Minibus / Van' },
    { label: 'Utilitaires 4x4', value: 'Utilitaire' }
  ];

  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = `${v.brand} ${v.model}`.toLowerCase().includes(q);
        const matchCat = v.category.toLowerCase().includes(q);
        const matchFeature = v.features.some((f) => f.toLowerCase().includes(q));
        if (!matchName && !matchCat && !matchFeature) return false;
      }

      // 2. Category
      if (selectedCategory !== 'Tous' && v.category !== selectedCategory) {
        return false;
      }

      // 3. Seats
      if (selectedSeats === '4' && v.seats !== 4) return false;
      if (selectedSeats === '5' && v.seats !== 5) return false;
      if (selectedSeats === '7' && v.seats < 7) return false;
      if (selectedSeats === '10+' && v.seats < 10) return false;

      // 4. Availability
      if (onlyAvailable && v.status !== 'Disponible') return false;

      // 5. VIP only
      if (onlyVip && !v.isVip) return false;

      return true;
    }).sort((a, b) => {
      if (sortBy === 'price-asc') return a.dailyRate - b.dailyRate;
      if (sortBy === 'price-desc') return b.dailyRate - a.dailyRate;
      // Recommended default
      if (a.isRecommended && !b.isRecommended) return -1;
      if (!a.isRecommended && b.isRecommended) return 1;
      return 0;
    });
  }, [vehicles, searchQuery, selectedCategory, selectedSeats, onlyAvailable, onlyVip, sortBy]);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('Tous');
    setSelectedSeats('Tous');
    setOnlyAvailable(false);
    setOnlyVip(false);
    setSortBy('recommended');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header & Title */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <span className="text-xs uppercase tracking-widest text-[#795900] font-bold">
            Flotte Automobile Nyokah
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold font-serif text-[#1A1C1F] tracking-tight">
            Catalogue des Véhicules avec Chauffeur
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Tous nos véhicules sont loués exclusivement avec un chauffeur professionnel assermenté.
          </p>
        </div>

        {/* Active Company Banner */}
        {hasDiscount && (
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-3">
            <Building2 className="w-5 h-5 text-[#D4A017] shrink-0" />
            <div>
              <span className="font-bold">{activeCompany.name}</span> : Remise négociée de{' '}
              <span className="font-bold text-[#795900]">-{discountRate}%</span> appliquée automatiquement.
            </div>
          </div>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5">
        {/* Top search & sorting bar */}
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          
          {/* Keyword Search Input */}
          <div className="relative w-full lg:max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher par modèle (Toyota, Mercedes, Prado, Hiace...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#D4A017]"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full lg:w-auto pb-1 lg:pb-0">
            {categories.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`px-3.5 py-2 rounded-full text-xs font-bold transition-all shrink-0 ${
                  selectedCategory === cat.value
                    ? 'bg-[#795900] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
            <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Trier par :</span>
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="recommended">Recommandés</option>
              <option value="price-asc">Prix : croissant</option>
              <option value="price-desc">Prix : décroissant</option>
            </select>
          </div>
        </div>

        {/* Secondary filters row (Seats, Status, VIP, Reset) */}
        <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            
            {/* Number of seats */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-semibold">Places :</span>
              {['Tous', '4', '5', '7', '10+'].map((s) => (
                <button
                  key={s}
                  onClick={() => setSelectedSeats(s)}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors ${
                    selectedSeats === s
                      ? 'bg-[#D4A017]/20 border-[#D4A017] text-[#795900] font-bold'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Toggle Only Available */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyAvailable}
                onChange={(e) => setOnlyAvailable(e.target.checked)}
                className="w-4 h-4 rounded text-[#D4A017] focus:ring-[#D4A017] border-slate-300"
              />
              <span className="text-slate-700 font-medium">Véhicules disponibles uniquement</span>
            </label>

            {/* Toggle VIP */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyVip}
                onChange={(e) => setOnlyVip(e.target.checked)}
                className="w-4 h-4 rounded text-[#D4A017] focus:ring-[#D4A017] border-slate-300"
              />
              <span className="text-slate-700 font-medium">Gamme VIP Prestige</span>
            </label>
          </div>

          {/* Active count & Reset */}
          <div className="flex items-center gap-3">
            <span className="text-slate-500">
              <strong className="text-slate-900">{filteredVehicles.length}</strong> véhicule{filteredVehicles.length > 1 ? 's' : ''} trouvé{filteredVehicles.length > 1 ? 's' : ''}
            </span>
            {(searchQuery || selectedCategory !== 'Tous' || selectedSeats !== 'Tous' || onlyAvailable || onlyVip) && (
              <button
                onClick={resetFilters}
                className="text-xs text-[#E94560] hover:underline font-bold"
              >
                Réinitialiser les filtres
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Vehicle Grid */}
      {filteredVehicles.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 max-w-lg mx-auto space-y-4">
          <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Search className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold font-serif text-slate-800">
            Aucun véhicule ne correspond à vos critères
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Essayez d'élargir vos filtres ou contactez directement notre conciergerie pour affréter un véhicule spécifique.
          </p>
          <button
            onClick={resetFilters}
            className="px-6 py-2.5 rounded-full bg-[#1A1A2E] text-white text-xs font-bold hover:bg-[#2A2A4E] transition-colors"
          >
            Afficher toute la flotte
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {filteredVehicles.map((vehicle) => {
            const isAvailable = vehicle.status === 'Disponible';
            const rate = vehicle.dailyRate;
            const discountedPrice = hasDiscount
              ? Math.round(rate * (1 - discountRate / 100))
              : rate;

            return (
              <article
                key={vehicle.id}
                className="group bg-white rounded-3xl border border-[#E2E2E6] overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col relative"
              >
                {/* Recommended Badge */}
                {vehicle.isRecommended && (
                  <div className="absolute top-0 right-0 w-24 h-24 overflow-hidden z-20 pointer-events-none">
                    <div className="absolute transform rotate-45 bg-[#795900] text-white text-[9px] font-bold py-1 right-[-32px] top-[18px] w-[120px] text-center shadow-md uppercase tracking-wider">
                      RECOMMANDÉ
                    </div>
                  </div>
                )}

                {/* Image & Top Badges */}
                <div 
                  className="relative h-56 w-full bg-slate-900 overflow-hidden cursor-pointer"
                  onClick={() => onOpenVehicleModal(vehicle)}
                >
                  <img
                    src={vehicle.imageUrl}
                    alt={`${vehicle.brand} ${vehicle.model}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

                  {/* Chauffeur tag */}
                  <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full border border-slate-200 flex items-center gap-1.5 shadow-sm">
                    <UserCheck className="w-3.5 h-3.5 text-[#795900]" />
                    <span className="text-xs font-semibold text-slate-900">
                      {vehicle.isVip ? 'Chauffeur VIP inclus' : 'Chauffeur inclus'}
                    </span>
                  </div>

                  {/* Status Badge */}
                  <div className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold shadow-sm backdrop-blur-md ${
                    isAvailable
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-[#FFDAD6] text-[#93000A] border border-[#FFDAD6]'
                  }`}>
                    {vehicle.status}
                  </div>
                </div>

                {/* Body details */}
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

                    <p className="text-xs text-slate-500 line-clamp-2 mb-3">
                      {vehicle.description}
                    </p>

                    {/* Features row */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4 text-slate-400" />
                        <span>{vehicle.seats} Places</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Luggage className="w-4 h-4 text-slate-400" />
                        <span>{vehicle.luggage} Bagages</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Wind className="w-4 h-4 text-slate-400" />
                        <span>Climatisation</span>
                      </div>
                      {vehicle.isVip && (
                        <div className="flex items-center gap-1 text-[#795900] font-semibold">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>VIP Lounge</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Price & Actions */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                        Tarif Journée
                      </span>
                      <div className="text-xl font-bold text-[#795900]">
                        {formatFCFA(discountedPrice)}
                        <span className="text-xs font-normal text-slate-500">/j</span>
                      </div>
                      {hasDiscount && (
                        <span className="text-[10px] text-slate-400 line-through">
                          Public : {formatFCFA(vehicle.dailyRate)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onOpenVehicleModal(vehicle)}
                        className="p-2.5 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                        title="Voir la fiche détaillée"
                      >
                        <Info className="w-4 h-4" />
                      </button>

                      {isAvailable ? (
                        <button
                          onClick={() => startBookingForVehicle(vehicle)}
                          className="px-4 py-2.5 rounded-full bg-[#795900] hover:bg-[#5c4300] text-white font-bold text-xs shadow-md transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <span>Réserver</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => onOpenVehicleModal(vehicle)}
                          className="px-3.5 py-2.5 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 font-medium text-xs transition-colors cursor-pointer"
                        >
                          Liste d'attente
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

    </div>
  );
};
