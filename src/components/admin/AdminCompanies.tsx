import React, { useState } from 'react';
import { useApp, formatFCFA } from '../../context/AppContext';
import { Company } from '../../types';
import { 
  Building2, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Phone, 
  Mail, 
  ShieldCheck, 
  Tag, 
  X,
  Check,
  Percent
} from 'lucide-react';

export const AdminCompanies: React.FC = () => {
  const { companies, addCompany, updateCompany, deleteCompany, isSyncing, showToast } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<Company>>({
    name: '',
    tradeRegister: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    negotiatedDiscountRate: 15,
    promoCode: 'CORP15',
    status: 'VIP Contractuel',
    accountManager: 'Kouamé N\'Guessan'
  });

  const filteredCompanies = companies.filter((c) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = c.name.toLowerCase().includes(q);
      const matchContact = c.contactName.toLowerCase().includes(q);
      const matchCode = (c.promoCode ?? '').toLowerCase().includes(q);
      if (!matchName && !matchContact && !matchCode) return false;
    }
    return true;
  });

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({
      name: '',
      tradeRegister: `CI-ABJ-${new Date().getFullYear()}-B-${Math.floor(1000 + Math.random() * 9000)}`,
      contactName: '',
      contactEmail: '',
      contactPhone: '+225 07 ',
      negotiatedDiscountRate: 12,
      promoCode: `B2B${Math.floor(10 + Math.random() * 90)}`,
      status: 'Standard B2B',
      accountManager: 'Kouamé N\'Guessan'
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c: Company) => {
    setEditingId(c.id);
    setFormData({ ...c });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.contactName) {
      showToast('Veuillez remplir les champs obligatoires.', 'error');
      return;
    }

    const saved = editingId
      ? await updateCompany(editingId, formData)
      : await addCompany({
        name: formData.name,
        tradeRegister: formData.tradeRegister || `CI-ABJ-${new Date().getFullYear()}-B-9999`,
        contactName: formData.contactName,
        contactEmail: formData.contactEmail || 'contact@societe.ci',
        contactPhone: formData.contactPhone || '+225 07 00 00 00 00',
        negotiatedDiscountRate: formData.negotiatedDiscountRate ?? 10,
        promoCode: formData.promoCode || null,
        monthlyVolumeTarget: formData.monthlyVolumeTarget ?? 5,
        status: formData.status ?? 'Standard B2B',
          accountManager: formData.accountManager || 'Kouamé N\'Guessan'
        });

    // Formulaire conservé si l'API refuse (RCCM ou code promo déjà pris).
    if (saved) setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    await deleteCompany(id);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-serif text-slate-900">
            Clients Sociétés & Accords-Cadres
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Gérez votre portefeuille de comptes professionnels, interlocuteurs et remises négociées.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-5 py-2.5 bg-[#795900] text-white hover:bg-[#5c4300] rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Ajouter une société</span>
        </button>
      </div>

      {/* Search & Stats Bar */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher une société, contact, code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#D4A017]"
          />
        </div>

        <div className="text-xs text-slate-500 font-semibold">
          <strong className="text-slate-900">{companies.length}</strong> comptes partenaires sous contrat
        </div>
      </div>

      {/* Companies Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCompanies.map((c) => (
          <div
            key={c.id}
            className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow"
          >
            <div>
              <div className="flex justify-between items-start gap-2 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#1A1A2E] text-[#D4A017] font-serif font-bold text-lg flex items-center justify-center shadow-xs">
                    {c.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-base text-slate-900">{c.name}</h3>
                    <span className="text-[10px] text-slate-500 font-mono">RCCM : {c.tradeRegister}</span>
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#D4A017]/20 text-[#795900]">
                  {c.status}
                </span>
              </div>

              {/* Contact Info */}
              <div className="space-y-1.5 py-3 border-t border-slate-100 text-xs text-slate-600">
                <div className="flex items-center gap-2 font-semibold text-slate-800">
                  <span>{c.contactName}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-500">
                  <Phone className="w-3.5 h-3.5" />
                  <span>{c.contactPhone}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-500">
                  <Mail className="w-3.5 h-3.5" />
                  <span>{c.contactEmail}</span>
                </div>
              </div>

              {/* Discount Box */}
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 flex justify-between items-center text-xs">
                <div>
                  <span className="text-slate-600 font-medium">Remise négociée :</span>
                  <div className="font-mono text-[10px] text-slate-500">Code : {c.promoCode}</div>
                </div>
                <span className="text-base font-bold text-[#795900]">
                  -{c.negotiatedDiscountRate}%
                </span>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
              <div className="text-[11px] text-slate-500">
                CA : <strong className="text-slate-900">{formatFCFA(c.totalSpent)}</strong> ({c.totalBookings} rés.)
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleOpenEdit(c)}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(c.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL EDIT / CREATE COMPANY */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-serif font-bold text-lg text-slate-900">
                {editingId ? 'Modifier la Société' : 'Créer un Compte Société'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1.5 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Raison Sociale *</label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: SIFCA Group, Orange CI, Deloitte..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">N° RCCM</label>
                  <input
                    type="text"
                    value={formData.tradeRegister || ''}
                    onChange={(e) => setFormData({ ...formData, tradeRegister: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-[11px]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Typologie</label>
                  <select
                    value={formData.status || 'Grand Compte'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="Grand Compte">Grand Compte</option>
                    <option value="PME Privée">PME Privée</option>
                    <option value="Institution">Institution & Ambassade</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nom Interlocuteur *</label>
                  <input
                    type="text"
                    required
                    value={formData.contactName || ''}
                    onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Téléphone / WhatsApp *</label>
                  <input
                    type="tel"
                    required
                    value={formData.contactPhone || ''}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Email Facturation B2B</label>
                <input
                  type="email"
                  value={formData.contactEmail || ''}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              {/* Discount settings */}
              <div className="grid grid-cols-2 gap-3 bg-amber-50 p-3 rounded-2xl border border-amber-200">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Remise Négociée (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={formData.negotiatedDiscountRate || 0}
                    onChange={(e) => setFormData({ ...formData, negotiatedDiscountRate: Number(e.target.value) })}
                    className="w-full p-2 bg-white border border-amber-300 rounded-xl font-bold text-[#795900]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Code Promo Accord</label>
                  <input
                    type="text"
                    value={formData.promoCode || ''}
                    onChange={(e) => setFormData({ ...formData, promoCode: e.target.value.toUpperCase() })}
                    className="w-full p-2 bg-white border border-amber-300 rounded-xl font-mono font-bold uppercase"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#795900] text-white text-xs font-bold rounded-xl shadow-sm"
                >
                  Enregistrer la société
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
