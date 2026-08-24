import React, { useState } from 'react';
import { useApp, formatFCFA } from '../../context/AppContext';
import { 
  Percent, 
  Tag, 
  Building2, 
  ShieldCheck, 
  Plus, 
  Edit3, 
  Check, 
  Sparkles, 
  Clock, 
  Layers, 
  TrendingUp, 
  Receipt,
  FileSpreadsheet
} from 'lucide-react';

export const AdminPricingDiscounts: React.FC = () => {
  const { 
    companies, 
    updateCompanyDiscount, 
    bookings, 
    showToast 
  } = useApp();

  const [activeTab, setActiveTab] = useState<'corporate' | 'rules' | 'audit'>('corporate');

  // Simulation of corporate discount edits
  const handleDiscountChange = (companyId: string, newDiscount: number) => {
    updateCompanyDiscount(companyId, newDiscount);
    showToast(`Nouveau taux de remise appliqué à ${companies.find(c => c.id === companyId)?.name} : -${newDiscount}%`, 'success');
  };

  const discountedBookings = bookings.filter((b) => b.discountAmount > 0);
  const totalDiscountsGranted = bookings.reduce((sum, b) => sum + b.discountAmount, 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      
      {/* Header & Mission statement */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D4A017]/20 text-[#795900] text-xs font-bold mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Moteur de Tarification & Accords-Cadres B2B</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-serif text-slate-900">
            Tarifs & Gestion des Remises Négociées
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Garantissez la stricte application des remises contractuelles par entreprise et évitez les erreurs de facturation.
          </p>
        </div>

        {/* Global Summary Badge */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-[#D4A017]/20 rounded-xl text-[#795900]">
            <Percent className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] text-slate-500 uppercase font-bold">Total Remises Accordées</div>
            <div className="text-xl font-bold font-serif text-[#795900]">
              {formatFCFA(totalDiscountsGranted)}
            </div>
            <div className="text-[10px] text-slate-400">{discountedBookings.length} réservations avec rabais B2B</div>
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab('corporate')}
          className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
            activeTab === 'corporate'
              ? 'bg-[#795900] text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          Grille Remises Entreprises ({companies.length})
        </button>

        <button
          onClick={() => setActiveTab('rules')}
          className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
            activeTab === 'rules'
              ? 'bg-[#795900] text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          Règles de Dégressivité Volume
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
            activeTab === 'audit'
              ? 'bg-[#795900] text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          Journal d'Audit des Remises ({discountedBookings.length})
        </button>
      </div>

      {/* TAB 1: Corporate Negotiated Discounts */}
      {activeTab === 'corporate' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold font-serif text-slate-900">
                Accords-Cadres par Société Cliente
              </h2>
              <p className="text-xs text-slate-500">
                Le rabais défini s'applique automatiquement lors de la réservation dès la sélection de la société ou saisie de son code.
              </p>
            </div>
            <button
              onClick={() => showToast('Ajout de nouvelle société disponible dans l\'onglet "Clients Sociétés".', 'info')}
              className="text-xs font-bold text-[#795900] hover:underline"
            >
              + Gérer les comptes entreprises
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F9F9FD] border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">Entreprise</th>
                  <th className="py-3.5 px-4">Contact Référent</th>
                  <th className="py-3.5 px-4">Code Contrat</th>
                  <th className="py-3.5 px-4">Remise Négociée (%)</th>
                  <th className="py-3.5 px-4">Volume Réservations</th>
                  <th className="py-3.5 px-4">Total Économies</th>
                  <th className="py-3.5 px-4 text-right">Ajuster Taux</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {companies.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-4">
                      <div className="font-bold text-slate-900 text-sm">{c.name}</div>
                      <div className="text-[10px] text-slate-500">RCCM : {c.tradeRegister}</div>
                    </td>

                    <td className="py-4 px-4 text-slate-700">
                      <div className="font-semibold">{c.contactName}</div>
                      <div className="text-[10px] text-slate-500">{c.contactPhone}</div>
                    </td>

                    <td className="py-4 px-4">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 font-mono text-[11px] font-bold text-slate-800 border border-slate-200">
                        {c.promoCode}
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-[#795900]">
                          -{c.negotiatedDiscountRate}%
                        </span>
                        <span className="text-[10px] text-slate-400">garanti</span>
                      </div>
                    </td>

                    <td className="py-4 px-4 font-semibold text-slate-800">
                      {c.activeBookingsCount} missions
                    </td>

                    <td className="py-4 px-4 font-bold text-emerald-600">
                      {formatFCFA(Math.round(c.totalSpent * (c.negotiatedDiscountRate / 100)))}
                    </td>

                    <td className="py-4 px-4 text-right">
                      {/* Quick Discount Adjustment Slider/Selector */}
                      <select
                        value={c.negotiatedDiscountRate}
                        onChange={(e) => handleDiscountChange(c.id, Number(e.target.value))}
                        className="p-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-[#795900] cursor-pointer"
                      >
                        <option value="5">-5% (Tarif Standard)</option>
                        <option value="10">-10% (PME Partenaire)</option>
                        <option value="12">-12% (Accord Moyen)</option>
                        <option value="15">-15% (Grand Compte)</option>
                        <option value="20">-20% (VIP Institutionnel)</option>
                        <option value="25">-25% (Contrat Annuel)</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Volume & Duration Rules */}
      {activeTab === 'rules' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-serif font-bold text-base text-slate-900">
              Règles de Dégressivité par Durée de Mission
            </h3>
            <p className="text-xs text-slate-500">
              Ces remises s'appliquent automatiquement pour les longues durées lorsqu'aucune remise société supérieure n'est active.
            </p>

            <div className="space-y-3 pt-2">
              <div className="p-3.5 rounded-2xl bg-[#F9F9FD] border border-slate-200 flex justify-between items-center">
                <div>
                  <div className="font-bold text-slate-900 text-xs">Mission 3 à 6 jours consécutifs</div>
                  <div className="text-[10px] text-slate-500">Ex: Séminaires, missions Yamoussoukro</div>
                </div>
                <span className="px-3 py-1 rounded-full bg-[#D4A017]/20 text-[#795900] font-bold text-xs">
                  -5% automatique
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#F9F9FD] border border-slate-200 flex justify-between items-center">
                <div>
                  <div className="font-bold text-slate-900 text-xs">Mission 7 à 14 jours consécutifs</div>
                  <div className="text-[10px] text-slate-500">Ex: Audits, missions intérieures du pays</div>
                </div>
                <span className="px-3 py-1 rounded-full bg-[#D4A017]/20 text-[#795900] font-bold text-xs">
                  -10% automatique
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#F9F9FD] border border-slate-200 flex justify-between items-center">
                <div>
                  <div className="font-bold text-slate-900 text-xs">Location Mensuelle (30 jours+)</div>
                  <div className="text-[10px] text-slate-500">Flotte dédiée avec chauffeur titulaire</div>
                </div>
                <span className="px-3 py-1 rounded-full bg-[#D4A017]/20 text-[#795900] font-bold text-xs">
                  -20% forfaitisé
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-serif font-bold text-base text-slate-900">
              Codes Promotionnels & Campagnes Événementielles
            </h3>
            <p className="text-xs text-slate-500">
              Codes activables lors de sommets ou salons professionnels à Abidjan (ex: FICAD, Africa CEO Forum).
            </p>

            <div className="space-y-3 pt-2">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex justify-between items-center">
                <div>
                  <span className="font-mono font-bold text-slate-900 text-xs">CORP15</span>
                  <div className="text-[10px] text-slate-500">Grand Compte Standard (-15%)</div>
                </div>
                <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full text-[10px] font-bold">
                  Actif (14 utilisations)
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex justify-between items-center">
                <div>
                  <span className="font-mono font-bold text-slate-900 text-xs">SUMMIT20</span>
                  <div className="text-[10px] text-slate-500">Sommets Internationaux (-20%)</div>
                </div>
                <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full text-[10px] font-bold">
                  Actif (6 utilisations)
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex justify-between items-center">
                <div>
                  <span className="font-mono font-bold text-slate-900 text-xs">WELCOME10</span>
                  <div className="text-[10px] text-slate-500">Première réservation entreprise (-10%)</div>
                </div>
                <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full text-[10px] font-bold">
                  Actif (28 utilisations)
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Audit Log of Applied Discounts */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 sm:p-8 space-y-4">
          <div>
            <h2 className="text-lg font-bold font-serif text-slate-900">
              Journal de Traçabilité des Remises Appliquées
            </h2>
            <p className="text-xs text-slate-500">
              Chaque réduction accordée est justifiée par un contrat-cadre ou un code vérifié.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F9F9FD] border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-3">Réf Réservation</th>
                  <th className="py-3 px-3">Client / Société</th>
                  <th className="py-3 px-3">Véhicule</th>
                  <th className="py-3 px-3">Motif du Rabais</th>
                  <th className="py-3 px-3">Taux (%)</th>
                  <th className="py-3 px-3">Montant Économisé</th>
                  <th className="py-3 px-3">Montant Final TTC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {discountedBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">{b.id}</td>
                    <td className="py-3 px-3 font-semibold text-slate-800">{b.clientName}</td>
                    <td className="py-3 px-3 text-slate-600">{b.vehicleName}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded bg-amber-50 text-[#795900] font-bold text-[10px] border border-amber-200">
                        {b.discountReason}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-bold text-[#795900]">
                      -{b.discountPercentage}%
                    </td>
                    <td className="py-3 px-3 font-bold text-emerald-600">
                      - {formatFCFA(b.discountAmount)}
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-900">
                      {formatFCFA(b.totalAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
