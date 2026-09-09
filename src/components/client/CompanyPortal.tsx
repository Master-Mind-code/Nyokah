import React, { useState } from 'react';
import { useApp, formatFCFA } from '../../context/AppContext';
import { 
  Building2, 
  Tag, 
  Calendar, 
  FileText, 
  Download, 
  UserCheck, 
  ShieldCheck, 
  Phone, 
  Mail, 
  ArrowUpRight, 
  CheckCircle2, 
  Clock, 
  Car,
  Receipt,
  Plus
} from 'lucide-react';

export const CompanyPortal: React.FC = () => {
  const { 
    companies, 
    currentCompanyId, 
    setCurrentCompanyId, 
    bookings, 
    setClientTab,
    showToast 
  } = useApp();

  const [bookingFilter, setBookingFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);

  const activeCompany = companies.find((c) => c.id === currentCompanyId) || companies[0];

  const companyBookings = bookings.filter((b) => {
    if (b.companyId === activeCompany.id || b.clientName.toLowerCase().includes(activeCompany.contactName.toLowerCase())) {
      return true;
    }
    return false;
  });

  const filteredBookings = companyBookings.filter((b) => {
    if (bookingFilter === 'active') return b.status === 'En attente' || b.status === 'Confirmée' || b.status === 'En cours';
    if (bookingFilter === 'completed') return b.status === 'Terminée';
    return true;
  });

  // Les dépenses totales viennent de l'API (calculées sur tout l'historique) ;
  // les économies sont sommées sur les réservations chargées.
  const totalSaved = companyBookings.reduce((sum, b) => sum + b.discountAmount, 0);

  const handleDownloadInvoice = (reference: string) => {
    showToast(`Facture de la réservation ${reference} : export PDF à venir.`, 'info');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header & Company Switcher */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1A1A2E] to-[#2A2A4E] text-[#D4A017] flex items-center justify-center font-serif font-bold text-2xl shadow-md border border-[#D4A017]/30 shrink-0">
            {activeCompany.name.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold font-serif text-slate-900">
                {activeCompany.name}
              </h1>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#D4A017]/20 text-[#795900] border border-[#D4A017]/30">
                {activeCompany.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              RCCM : {activeCompany.tradeRegister} • Contact : {activeCompany.contactName} ({activeCompany.contactPhone})
            </p>
          </div>
        </div>

        {/* Company Quick Selector Dropdown */}
        <div className="w-full md:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="text-xs text-slate-500 font-semibold">Changer d'entreprise :</div>
          <select
            value={activeCompany.id}
            onChange={(e) => setCurrentCompanyId(e.target.value)}
            className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 cursor-pointer focus:ring-1 focus:ring-[#D4A017]"
          >
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} (-{c.negotiatedDiscountRate}%)
              </option>
            ))}
          </select>

          <button
            onClick={() => setClientTab('catalog')}
            className="px-5 py-2.5 rounded-xl bg-[#795900] text-white hover:bg-[#5c4300] text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Nouvelle réservation</span>
          </button>
        </div>
      </div>

      {/* Corporate KPIs and Account Manager Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        
        {/* KPI 1: Negotiated Discount */}
        <div className="bg-white rounded-2xl p-6 border border-[#795900]/40 shadow-sm relative overflow-hidden">
          <div className="text-xs uppercase font-bold text-slate-500 tracking-wider mb-2">
            Rabais Négocié Contractuel
          </div>
          <div className="text-3xl font-bold font-serif text-[#795900]">
            -{activeCompany.negotiatedDiscountRate}%
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Code accord : <strong className="text-slate-800">{activeCompany.promoCode}</strong>
          </p>
        </div>

        {/* KPI 2: Total Spent */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="text-xs uppercase font-bold text-slate-500 tracking-wider mb-2">
            Dépenses Totales Année
          </div>
          <div className="text-2xl font-bold font-serif text-slate-900">
            {formatFCFA(activeCompany.totalSpent)}
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Facturation centralisée consolidée
          </p>
        </div>

        {/* KPI 3: Savings generated */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="text-xs uppercase font-bold text-slate-500 tracking-wider mb-2">
            Économies Réalisées
          </div>
          <div className="text-2xl font-bold font-serif text-emerald-600">
            {formatFCFA(totalSaved)}
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Grâce aux remises accords-cadres
          </p>
        </div>

        {/* Account Manager Box */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-3">
          <div className="text-xs uppercase font-bold text-slate-500 tracking-wider">
            Votre Chargé de Compte
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900">{activeCompany.accountManager}</div>
            <div className="text-[11px] text-slate-500">Responsable Grands Comptes Nyokah</div>
          </div>
          {/* Ligne de la conciergerie : la fiche société ne porte pas de
              numéro direct pour le chargé de compte. */}
          <div className="text-xs text-[#795900] flex items-center gap-1.5 font-semibold">
            <Phone className="w-3.5 h-3.5" />
            <span>+225 27 20 21 00 00</span>
          </div>
        </div>

      </div>

      {/* Bookings Table for this company */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-xl font-bold font-serif text-slate-900">
              Historique des Réservations Entreprise
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Suivez l'état de vos réservations, chauffeurs affectés et téléchargez vos factures
            </p>
          </div>

          {/* Filter pills */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setBookingFilter('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                bookingFilter === 'all' ? 'bg-[#D4A017] text-[#1A1A2E]' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Toutes ({companyBookings.length})
            </button>
            <button
              onClick={() => setBookingFilter('active')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                bookingFilter === 'active' ? 'bg-[#D4A017] text-[#1A1A2E]' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              En cours / À venir
            </button>
            <button
              onClick={() => setBookingFilter('completed')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                bookingFilter === 'completed' ? 'bg-[#D4A017] text-[#1A1A2E]' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Terminées
            </button>
          </div>
        </div>

        {/* Table list */}
        {filteredBookings.length === 0 ? (
          <div className="text-center py-12 text-slate-500 space-y-3">
            <Calendar className="w-10 h-10 mx-auto text-slate-300" />
            <p className="text-sm">Aucune réservation pour ce filtre.</p>
            <button
              onClick={() => setClientTab('catalog')}
              className="px-5 py-2 rounded-full bg-[#795900] text-white text-xs font-bold"
            >
              Réserver un véhicule pour {activeCompany.name}
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-3">Réf / Date</th>
                  <th className="py-3 px-3">Véhicule</th>
                  <th className="py-3 px-3">Passager</th>
                  <th className="py-3 px-3">Chauffeur Affecté</th>
                  <th className="py-3 px-3">Rabais Appliqué</th>
                  <th className="py-3 px-3">Total TTC</th>
                  <th className="py-3 px-3">Statut</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3 font-semibold text-slate-900">
                      <div>{b.reference}</div>
                      <div className="text-[10px] text-slate-500">{b.startDate}</div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-800">{b.vehicleName}</div>
                      <div className="text-[10px] text-slate-500">{b.formula}</div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-medium text-slate-800">{b.clientName}</div>
                      <div className="text-[10px] text-slate-500">{b.clientPhone}</div>
                    </td>
                    <td className="py-3 px-3">
                      {b.assignedDriverName ? (
                        <div className="flex items-center gap-1.5 text-slate-800 font-semibold">
                          <UserCheck className="w-3.5 h-3.5 text-[#795900]" />
                          <span>{b.assignedDriverName}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">En cours d'affectation</span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-semibold text-[#795900]">
                      {b.discountAmount > 0 ? (
                        <div>
                          <div>- {formatFCFA(b.discountAmount)}</div>
                          <div className="text-[10px] text-slate-500">(-{b.discountPercentage}%)</div>
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-900">
                      {formatFCFA(b.totalAmount)}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        b.status === 'Confirmée'
                          ? 'bg-blue-100 text-blue-800'
                          : b.status === 'En cours'
                          ? 'bg-emerald-100 text-emerald-800'
                          : b.status === 'En attente'
                          ? 'bg-amber-100 text-amber-800'
                          : b.status === 'Terminée'
                          ? 'bg-slate-100 text-slate-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => handleDownloadInvoice(b.reference)}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors inline-flex items-center gap-1"
                        title="Télécharger la facture pro-forma"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Facture</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Contract terms card */}
      <div className="bg-slate-50 rounded-3xl p-6 border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs text-slate-600">
        <div>
          <h4 className="font-bold text-slate-900 text-sm mb-1">
            Accord-Cadre Entreprise 2026
          </h4>
          <p>
            Toutes les réservations effectuées sous le compte <strong>{activeCompany.name}</strong> bénéficient d'un règlement à 30 jours fin de mois et du tarif dégressif garanti.
          </p>
        </div>
        <button
          onClick={() => showToast('Contrat-cadre en cours de validité jusqu’au 31/12/2026.', 'info')}
          className="px-4 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-700 hover:bg-slate-100 shrink-0"
        >
          Consulter le contrat PDF
        </button>
      </div>

    </div>
  );
};
