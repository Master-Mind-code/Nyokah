import React, { useState } from 'react';
import { useApp, formatFCFA } from '../../context/AppContext';
import { AutoPack } from '../../types';
import { 
  Package, 
  Plus, 
  CheckCircle2, 
  Edit3, 
  Trash2, 
  Sparkles, 
  Building2, 
  Users, 
  Calendar,
  X,
  Check
} from 'lucide-react';

export const AdminPacks: React.FC = () => {
  const { packs, addPack, updatePack, deactivatePack, isSyncing, showToast } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPackId, setEditingPackId] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<AutoPack>>({
    name: '',
    description: '',
    targetAudience: 'Direction & VIP',
    features: ['Chauffeur VIP d\'Honneur', 'Véhicule Berline Prestige', 'Carburant inclus'],
    popular: false,
    fixedPrice: 350000,
    highlightDiscount: 'Rabais 15% inclus'
  });

  const handleOpenAdd = () => {
    setEditingPackId(null);
    setFormData({
      name: '',
      description: '',
      targetAudience: 'Entreprises B2B',
      features: ['Véhicule climatisé', 'Chauffeur dédié', 'Assistance 24/7'],
      popular: false,
      fixedPrice: 250000,
      highlightDiscount: '10% de remise incluse'
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.fixedPrice) {
      showToast('Veuillez renseigner le nom et le tarif.', 'error');
      return;
    }

    const saved = editingPackId
      ? await updatePack(editingPackId, formData)
      : await addPack({
        name: formData.name,
        description: formData.description || 'Pack sur-mesure pour entreprises.',
        targetAudience: formData.targetAudience || 'Sociétés B2B',
        includedVehicles: formData.includedVehicles || 'Berlines exécutives et SUV',
        duration: formData.duration || 'Forfait événementiel / mensuel',
        formula: formData.formula || 'Chauffeur dédié + carburant',
        features: formData.features || ['Chauffeur inclus', 'Flotte récente'],
        popular: formData.popular || false,
        fixedPrice: formData.fixedPrice,
          highlightDiscount: formData.highlightDiscount || 'Tarif pack négocié'
        });

    if (saved) setIsModalOpen(false);
  };

  // L'API désactive le pack plutôt que de le supprimer, pour préserver
  // l'historique des réservations qui s'y rattachent.
  const handleDelete = async (packId: string) => {
    await deactivatePack(packId);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-serif text-slate-900">
            Gestion des Packs Auto Forfaitisés
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Configurez les formules groupées destinées aux directions générales, délégations et sommets.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-5 py-2.5 bg-[#795900] text-white hover:bg-[#5c4300] rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Créer un pack</span>
        </button>
      </div>

      {/* Packs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {packs.map((pack) => (
          <div
            key={pack.id}
            className={`p-6 rounded-3xl border transition-all flex flex-col justify-between ${
              pack.popular
                ? 'bg-gradient-to-br from-[#1A1A2E] to-[#2A2A4E] text-white border-[#D4A017]/40 shadow-lg'
                : 'bg-white text-slate-900 border-slate-200 shadow-xs'
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
                  Tarif forfaitaire
                </div>
                <div className={`text-xl font-bold ${pack.popular ? 'text-[#D4A017]' : 'text-[#795900]'}`}>
                  {formatFCFA(pack.fixedPrice)}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setEditingPackId(pack.id);
                    setFormData({ ...pack });
                    setIsModalOpen(true);
                  }}
                  className={`p-2 rounded-xl text-xs font-bold transition-colors ${
                    pack.popular ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(pack.id)}
                  className="p-2 rounded-xl text-xs font-bold bg-red-500/20 hover:bg-red-500/30 text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL EDIT / CREATE PACK */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-serif font-bold text-lg text-slate-900">
                {editingPackId ? 'Modifier le Pack' : 'Créer un Nouveau Pack Auto'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1.5 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nom du Pack *</label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Pack Direction Générale VIP"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Cible</label>
                <input
                  type="text"
                  value={formData.targetAudience || ''}
                  onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                  placeholder="Ex: Direction & VIP, Entreprises B2B..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Prix Forfaitaire (FCFA) *</label>
                  <input
                    type="number"
                    step="5000"
                    required
                    value={formData.fixedPrice || 0}
                    onChange={(e) => setFormData({ ...formData, fixedPrice: Number(e.target.value) })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-[#795900]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Accroche Rabais</label>
                  <input
                    type="text"
                    value={formData.highlightDiscount || ''}
                    onChange={(e) => setFormData({ ...formData, highlightDiscount: e.target.value })}
                    placeholder="Ex: Économie 15%"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.popular || false}
                    onChange={(e) => setFormData({ ...formData, popular: e.target.checked })}
                    className="w-4 h-4 rounded text-[#D4A017]"
                  />
                  <span className="font-semibold text-slate-800">Mettre en avant ce pack (Badge Populaire)</span>
                </label>
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
                  className="px-5 py-2.5 bg-[#795900] text-white text-xs font-bold rounded-xl"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
