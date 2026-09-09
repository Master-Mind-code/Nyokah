import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Driver, Subcontractor } from '../../types';
import { 
  UserCheck, 
  Plus, 
  Star, 
  Phone, 
  ShieldCheck, 
  Car, 
  Award, 
  X, 
  Check,
  Building2,
  Trash2,
  Edit3
} from 'lucide-react';

export const AdminDriversPartners: React.FC = () => {
  const { drivers, subcontractors, addDriver, updateDriverStatus, isSyncing } = useApp();

  const [activeTab, setActiveTab] = useState<'drivers' | 'partners'>('drivers');
  const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);
  const [driverFormData, setDriverFormData] = useState<Partial<Driver>>({
    name: '',
    phone: '+225 07 ',
    photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    status: 'Disponible',
    experienceYears: 7,
    languages: ['Français', 'Anglais'],
    licenseNumber: ''
  });

  const handleQuickDriverStatus = async (driverId: string, newStatus: Driver['status']) => {
    await updateDriverStatus(driverId, newStatus);
  };

  const handleSaveDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverFormData.name) return;

    // Le numéro de permis est unique côté API : on en propose un par défaut
    // uniquement s'il n'a pas été saisi, pour éviter les collisions.
    await addDriver({
      name: driverFormData.name,
      phone: driverFormData.phone || '+225 07 00 00 00 00',
      photoUrl: driverFormData.photoUrl || null,
      status: driverFormData.status || 'Disponible',
      experienceYears: driverFormData.experienceYears || 5,
      languages: driverFormData.languages || ['Français'],
      licenseNumber:
        driverFormData.licenseNumber?.trim() ||
        `CI-PC-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 89999)}`
    });

    setIsDriverModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-serif text-slate-900">
            Chauffeurs Titulaires & Partenaires
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Supervisez votre brigade de chauffeurs assermentés et le réseau de sous-traitants affiliés.
          </p>
        </div>

        <button
          onClick={() => setIsDriverModalOpen(true)}
          className="px-5 py-2.5 bg-[#795900] text-white hover:bg-[#5c4300] rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Ajouter un chauffeur</span>
        </button>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab('drivers')}
          className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
            activeTab === 'drivers'
              ? 'bg-[#795900] text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          Chauffeurs Salariés Nyokah ({drivers.length})
        </button>

        <button
          onClick={() => setActiveTab('partners')}
          className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
            activeTab === 'partners'
              ? 'bg-[#795900] text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          Partenaires Sous-traitants ({subcontractors.length})
        </button>
      </div>

      {/* TAB 1: Drivers List */}
      {activeTab === 'drivers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {drivers.map((d) => (
            <div
              key={d.id}
              className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow"
            >
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="relative w-14 h-14 rounded-2xl overflow-hidden bg-slate-200 shrink-0">
                    <img src={d.photoUrl} alt={d.name} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-base text-slate-900">{d.name}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-amber-600 font-bold">
                      <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                      <span>{d.rating}</span>
                      <span className="text-slate-400 font-normal">({d.completedRides} courses)</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 py-2 text-xs text-slate-600 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-semibold text-slate-800">{d.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Award className="w-3.5 h-3.5 text-slate-400" />
                    <span>Langues : <strong>{d.languages.join(', ')}</strong></span>
                  </div>
                  <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#D4A017]/20 text-[#795900] font-bold text-[10px]">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Permis : {d.licenseNumber} ({d.experienceYears} ans exp.)</span>
                  </div>
                </div>
              </div>

              {/* Status Switcher */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-semibold">Disponibilité :</span>
                <select
                  value={d.status}
                  onChange={(e) => handleQuickDriverStatus(d.id, e.target.value as Driver['status'])}
                  className={`text-xs font-bold px-2.5 py-1 rounded-full cursor-pointer border ${
                    d.status === 'Disponible'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : d.status === 'En course'
                      ? 'bg-blue-50 text-blue-800 border-blue-300'
                      : 'bg-slate-100 text-slate-700 border-slate-300'
                  }`}
                >
                  <option value="Disponible">Disponible</option>
                  <option value="En course">En course (Actif)</option>
                  <option value="En repos">En repos</option>
                  <option value="Congé">En congé</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: Subcontractors List */}
      {activeTab === 'partners' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {subcontractors.map((sub) => (
            <div
              key={sub.id}
              className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-800 font-serif font-bold text-lg flex items-center justify-center">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-base text-slate-900">{sub.name}</h3>
                    <span className="text-[10px] text-slate-500">Contact : {sub.contactPerson} ({sub.phone})</span>
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold">
                  {sub.status}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-2xl text-xs text-slate-700 text-center">
                <div>
                  <div className="text-[10px] text-slate-500">Flotte affiliée</div>
                  <div className="font-bold text-base text-slate-900">{sub.vehicleCount} véh.</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500">Taux Commission</div>
                  <div className="font-bold text-base text-[#795900]">{sub.commissionRate}%</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500">Email</div>
                  <div className="font-bold text-xs text-slate-600 truncate">{sub.email}</div>
                </div>
              </div>

              <div className="text-xs text-slate-600">
                Véhicules mis à disposition : <span className="font-semibold text-slate-800">{sub.fleetProvided.join(', ')}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE DRIVER MODAL */}
      {isDriverModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-serif font-bold text-lg text-slate-900">
                Nouveau Chauffeur Nyokah
              </h3>
              <button onClick={() => setIsDriverModalOpen(false)} className="p-1.5 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDriver} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nom Complet *</label>
                <input
                  type="text"
                  required
                  value={driverFormData.name || ''}
                  onChange={(e) => setDriverFormData({ ...driverFormData, name: e.target.value })}
                  placeholder="Ex: Bakary Coulibaly"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Numéro de Téléphone *</label>
                <input
                  type="tel"
                  required
                  value={driverFormData.phone || ''}
                  onChange={(e) => setDriverFormData({ ...driverFormData, phone: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">N° Permis de Conduire</label>
                <input
                  type="text"
                  value={driverFormData.licenseNumber || ''}
                  onChange={(e) => setDriverFormData({ ...driverFormData, licenseNumber: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Photo URL</label>
                <input
                  type="url"
                  value={driverFormData.photoUrl || ''}
                  onChange={(e) => setDriverFormData({ ...driverFormData, photoUrl: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-[11px]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsDriverModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#795900] text-white text-xs font-bold rounded-xl shadow-sm"
                >
                  Ajouter à la brigade
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
