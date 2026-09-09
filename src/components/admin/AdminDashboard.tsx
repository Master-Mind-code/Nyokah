import React from 'react';
import { useApp, formatFCFA } from '../../context/AppContext';
import { 
  DollarSign, 
  CalendarDays, 
  Percent, 
  TrendingUp, 
  TrendingDown, 
  Car, 
  UserCheck, 
  Building2, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Plus,
  ArrowUpRight
} from 'lucide-react';
import { AdminPerformanceCharts } from './AdminPerformanceCharts';

interface AdminDashboardProps {
  onOpenAssignModal?: (bookingId: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onOpenAssignModal }) => {
  const {
    bookings,
    vehicles,
    drivers,
    companies,
    dashboardStats,
    setAdminTab,
    updateBookingStatus
  } = useApp();

  // Les agrégats viennent de l'API : ils portent sur l'ensemble des données,
  // pas seulement sur les réservations chargées en mémoire.
  const totalRevenue = dashboardStats?.revenue.period ?? 0;
  const totalDiscounts = bookings.reduce((sum, b) => sum + b.discountAmount, 0);
  const totalBookingsCount = dashboardStats?.bookings.total ?? bookings.length;

  const occupiedVehiclesCount = dashboardStats?.fleet.rented ?? vehicles.filter((v) => v.status === 'Loué').length;
  const occupancyRate = dashboardStats?.fleet.utilizationRate ?? 0;
  const bookingsThisMonth = dashboardStats?.bookings.thisMonth ?? 0;
  const growthRate = dashboardStats?.revenue.growthRate ?? null;

  const ownFleetCount = vehicles.filter((v) => v.ownership === 'Flotte Propre').length;
  const subFleetCount = vehicles.filter((v) => v.ownership === 'Sous-traitant').length;

  const pendingBookings = bookings.filter((b) => b.status === 'En attente');
  const recentBookings = [...bookings]
    .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
    .slice(0, 5);

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      
      {/* Header section matching Image 5.png */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-serif text-slate-900">
            Aperçu de l'Activité
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Bienvenue sur votre tableau de bord Nyokah. Voici les performances récentes de votre régie.
          </p>
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setAdminTab('fleet')}
            className="px-4 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Car className="w-3.5 h-3.5 text-[#795900]" />
            <span>Gérer la flotte</span>
          </button>
          <button
            onClick={() => setAdminTab('reservations')}
            className="px-4 py-2 bg-[#795900] text-white hover:bg-[#5c4300] rounded-xl text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5"
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Toutes les réservations</span>
          </button>
        </div>
      </div>

      {/* 4 Bento KPI Cards matching Image 5.png */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Card 1: Chiffre d'Affaires */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Chiffre d'Affaires
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-serif text-slate-900">
            {formatFCFA(totalRevenue)}
          </div>
          {growthRate === null ? (
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <span>Pas d'historique comparable</span>
            </div>
          ) : (
            <div
              className={`flex items-center gap-1.5 text-xs font-semibold ${
                growthRate >= 0 ? 'text-emerald-600' : 'text-[#E94560]'
              }`}
            >
              {growthRate >= 0 ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5" />
              )}
              <span>
                {growthRate >= 0 ? '+' : ''}
                {growthRate}% vs mois dernier
              </span>
            </div>
          )}
        </div>

        {/* Card 2: Réservations (Mois) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Réservations (Mois)
            </span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <CalendarDays className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-serif text-slate-900">
            {bookingsThisMonth} <span className="text-xs font-normal text-slate-500">missions</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <span>{totalBookingsCount} sur la période analysée</span>
          </div>
        </div>

        {/* Card 3: Taux d'Occupation */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Taux d'Occupation
            </span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Car className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-serif text-slate-900">
            {`${occupancyRate}%`}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <span>
              {occupiedVehiclesCount} véhicule{occupiedVehiclesCount > 1 ? 's' : ''} en location
            </span>
          </div>
        </div>

        {/* Card 4: Remises Accordées */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Remises Accordées
            </span>
            <div className="p-2 rounded-xl bg-[#D4A017]/20 text-[#795900]">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-serif text-[#795900]">
            {formatFCFA(totalDiscounts)}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <span>Accords-cadres B2B</span>
          </div>
        </div>

      </div>

      {/* Performance Charts (Recharts) */}
      <AdminPerformanceCharts />

      {/* Fleet Composition & Subcontractor Share */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-serif font-bold text-base text-slate-900">
                Répartition Opérationnelle du Parc Auto
              </h3>
              <p className="text-xs text-slate-500">Capacités Flotte Propre Nyokah vs Partenaires affiliés</p>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              Total : {vehicles.length} véhicules
            </span>
          </div>

          <div className="space-y-3.5 pt-2">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-800">Flotte Propre ({ownFleetCount} véhicules)</span>
              <span className="text-slate-900 font-bold">
                {vehicles.length > 0 ? Math.round((ownFleetCount / vehicles.length) * 100) : 0}%
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden flex">
              <div 
                className="bg-[#1A1A2E] h-full transition-all" 
                style={{ width: `${vehicles.length > 0 ? Math.round((ownFleetCount / vehicles.length) * 100) : 0}%` }} 
              />
              <div 
                className="bg-[#D4A017] h-full transition-all" 
                style={{ width: `${vehicles.length > 0 ? Math.round((subFleetCount / vehicles.length) * 100) : 0}%` }} 
              />
            </div>
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-[#795900]">Partenaires Sous-traitants ({subFleetCount} véhicules)</span>
              <span className="text-[#795900] font-bold">
                {vehicles.length > 0 ? Math.round((subFleetCount / vehicles.length) * 100) : 0}%
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <h4 className="font-serif font-bold text-base text-slate-900">Disponibilité Régie</h4>
            <p className="text-xs text-slate-500">Chauffeurs et statut technique</p>
          </div>
          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
              <span className="text-slate-600">Chauffeurs en mission :</span>
              <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                {drivers.filter(d => d.status === 'En course').length} / {drivers.length}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
              <span className="text-slate-600">Véhicules en révision :</span>
              <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                {vehicles.filter(v => v.status === 'Entretien').length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Reservations Alert Box if any */}
      {pendingBookings.length > 0 && (
        <div className="bg-amber-50 rounded-3xl p-5 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm">
                {pendingBookings.length} réservation{pendingBookings.length > 1 ? 's' : ''} en attente d'affectation
              </h4>
              <p className="text-xs text-slate-600">
                Des clients ou entreprises attendent la confirmation et l'attribution de leur chauffeur.
              </p>
            </div>
          </div>

          <button
            onClick={() => setAdminTab('reservations')}
            className="px-5 py-2.5 bg-[#795900] text-white hover:bg-[#5c4300] text-xs font-bold rounded-xl shadow-sm shrink-0 flex items-center gap-1.5"
          >
            <span>Traiter les demandes</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Recent Reservations Table (Matching Image 7.png style) */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 className="font-serif font-bold text-lg text-slate-900">
              Dernières Réservations Enregistrées
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Affectez rapidement un chauffeur et un véhicule aux demandes récentes
            </p>
          </div>
          <button
            onClick={() => setAdminTab('reservations')}
            className="text-xs font-bold text-[#795900] hover:underline flex items-center gap-1"
          >
            Voir tout ({bookings.length}) <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-3">Réf</th>
                <th className="py-3 px-3">Client / Société</th>
                <th className="py-3 px-3">Véhicule</th>
                <th className="py-3 px-3">Dates</th>
                <th className="py-3 px-3">Chauffeur</th>
                <th className="py-3 px-3">Montant</th>
                <th className="py-3 px-3">Statut</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentBookings.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-3 font-mono font-bold text-slate-900">{b.reference}</td>
                  <td className="py-3 px-3">
                    <div className="font-bold text-slate-900">{b.clientName}</div>
                    {b.companyId && (
                      <span className="text-[10px] text-[#795900] font-semibold">
                        {companies.find((c) => c.id === b.companyId)?.name || 'Société B2B'}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 font-medium text-slate-800">{b.vehicleName}</td>
                  <td className="py-3 px-3 text-slate-600">
                    <div>{b.startDate}</div>
                    <div className="text-[10px] text-slate-400">{b.formula}</div>
                  </td>
                  <td className="py-3 px-3">
                    {b.assignedDriverName ? (
                      <span className="font-semibold text-slate-800 flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                        {b.assignedDriverName}
                      </span>
                    ) : (
                      <span className="text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded text-[10px]">
                        Non affecté
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 font-bold text-slate-900">
                    {formatFCFA(b.totalAmount)}
                  </td>
                  <td className="py-3 px-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      b.status === 'Confirmée'
                        ? 'bg-blue-100 text-blue-800'
                        : b.status === 'En cours'
                        ? 'bg-emerald-100 text-emerald-800'
                        : b.status === 'En attente'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {b.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => {
                        setAdminTab('reservations');
                      }}
                      className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[11px] rounded-lg transition-colors"
                    >
                      Gérer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
