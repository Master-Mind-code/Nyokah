import React, { useState, useMemo, useRef } from 'react';
import { useApp, formatFCFA } from '../../context/AppContext';
import { Vehicle, VehicleCategory, VehicleStatus, OwnershipType } from '../../types';
import { 
  Car, 
  Plus, 
  Search, 
  Filter, 
  Edit3, 
  Trash2, 
  Sparkles, 
  Users, 
  Luggage, 
  Check, 
  X,
  Fuel,
  ShieldCheck,
  Wrench,
  AlertTriangle,
  Calendar,
  Clock,
  CheckCircle2,
  HelpCircle,
  TrendingUp,
  RotateCcw,
  Upload,
  Image as ImageIcon,
  Link2
} from 'lucide-react';

// Reference date for date calculations (consistent with app timeline)
// Date du jour réelle : une date figée ferait dériver les alertes d'entretien
// (échéances jamais atteintes, ou toujours en retard) au fil du temps.
const CURRENT_DATE_STR = new Date().toISOString().slice(0, 10);
const CURRENT_DATE = new Date(CURRENT_DATE_STR);

export interface MaintenanceInfo {
  isApproaching: boolean;
  isOverdue: boolean;
  isToday: boolean;
  daysRemaining: number;
  formattedDate: string;
}

export function getVehicleMaintenanceInfo(vehicle: Vehicle): MaintenanceInfo | null {
  if (!vehicle.nextMaintenanceDate) return null;
  
  const nextDate = new Date(vehicle.nextMaintenanceDate);
  if (isNaN(nextDate.getTime())) return null;

  // Calculate difference in days
  const diffTime = nextDate.getTime() - CURRENT_DATE.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const isOverdue = daysRemaining < 0;
  const isToday = daysRemaining === 0;
  const isApproaching = daysRemaining <= 15; // 15 days threshold requested by user

  const formattedDate = nextDate.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  return {
    isApproaching,
    isOverdue,
    isToday,
    daysRemaining,
    formattedDate
  };
}

/** Largeur maximale conservée : au-delà, une photo de catalogue n'apporte rien. */
const MAX_IMAGE_WIDTH = 1600;
const IMAGE_QUALITY = 0.82;

/**
 * Redimensionne et recompresse une photo dans le navigateur avant de l'encoder
 * en base64. Une photo de téléphone (3 à 8 Mo) descend ainsi sous les 400 Ko :
 * sans cela le corps de la requête dépasse la limite du serveur, qui coupe la
 * connexion — le navigateur signale alors une erreur réseau trompeuse.
 */
async function compressImage(file: File): Promise<{ dataUrl: string; bytes: number }> {
  const bitmap = await createImageBitmap(file);

  const scale = Math.min(1, MAX_IMAGE_WIDTH / bitmap.width);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);

  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas indisponible');

  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const dataUrl = canvas.toDataURL('image/jpeg', IMAGE_QUALITY);
  // La charge utile base64 pèse environ 4/3 des octets encodés.
  const bytes = Math.round((dataUrl.length - dataUrl.indexOf(',') - 1) * 0.75);

  return { dataUrl, bytes };
}

export const AdminFleet: React.FC = () => {
  const {
    vehicles,
    subcontractors,
    addVehicle,
    updateVehicle,
    deleteVehicle,
    updateVehicleStatus,
    sendVehicleToMaintenance,
    completeVehicleMaintenance,
    lastError,
    clearLastError,
    showToast
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('Tous');
  const [ownershipFilter, setOwnershipFilter] = useState<string>('Tous');
  const [statusFilter, setStatusFilter] = useState<string>('Tous');
  const [onlyMaintenanceAlerts, setOnlyMaintenanceAlerts] = useState<boolean>(false);

  // Modal State for Adding/Editing Vehicle
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<Vehicle>>({
    brand: '',
    model: '',
    year: 2024,
    category: 'Berline',
    plateNumber: '',
    dailyRate: 45000,
    halfDayRate: 30000,
    airportTransferRate: 25000,
    seats: 5,
    luggage: 3,
    transmission: 'Automatique',
    fuel: 'Essence',
    status: 'Disponible',
    ownership: 'Flotte Propre',
    partnerName: '',
    isVip: false,
    isRecommended: false,
    description: 'Véhicule exécutif avec chauffeur dédié à Abidjan.',
    features: ['Climatisation régulée', 'Chauffeur assermenté', 'WiFi 4G à bord'],
    imageUrl: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1000&q=80',
    mileageLimit: '250 km / jour inclus',
    nextMaintenanceDate: '2026-09-15',
    lastMaintenanceDate: '2026-03-10',
    maintenanceNotes: 'Entretien périodique standard'
  });

  // Image Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadTab, setUploadTab] = useState<'upload' | 'preset' | 'url'>('upload');

  const VEHICLE_PRESET_IMAGES = [
    { label: 'Toyota Land Cruiser Prado V8', url: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1000&q=80', cat: 'SUV Prestige' },
    { label: 'Mercedes-Benz Classe E Berline VIP', url: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=1000&q=80', cat: 'VIP Prestige' },
    { label: 'Toyota Corolla Berline Affaires', url: 'https://images.unsplash.com/photo-1550355291-bbee04a92027?auto=format&fit=crop&w=1000&q=80', cat: 'Berline' },
    { label: 'Hyundai Staria / Hiace Minibus VIP', url: 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=1000&q=80', cat: 'Van / Minibus' },
    { label: 'Range Rover Sport Luxe', url: 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?auto=format&fit=crop&w=1000&q=80', cat: 'SUV VIP' }
  ];

  const handleImageFileUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast('Format non supporté. Veuillez sélectionner une image (PNG, JPG, JPEG, WEBP).', 'error');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      showToast('Image trop volumineuse. La taille maximale est de 15 Mo.', 'error');
      return;
    }

    try {
      const optimized = await compressImage(file);
      setFormData((prev) => ({ ...prev, imageUrl: optimized.dataUrl }));
      setFormError(null);

      const original = Math.round(file.size / 1024);
      const compressed = Math.round(optimized.bytes / 1024);
      showToast(
        `Photo « ${file.name} » importée (${original} Ko → ${compressed} Ko).`,
        'success'
      );
    } catch {
      showToast("Impossible de traiter cette image. Essayez un autre fichier.", 'error');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      void handleImageFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Calculate maintenance summary statistics
  const maintenanceStats = useMemo(() => {
    let alertCount = 0;
    let overdueCount = 0;
    let inMaintenanceCount = 0;

    vehicles.forEach((v) => {
      if (v.status === 'Entretien') {
        inMaintenanceCount++;
      }
      const info = getVehicleMaintenanceInfo(v);
      if (info && info.isApproaching) {
        alertCount++;
        if (info.isOverdue) overdueCount++;
      }
    });

    return { alertCount, overdueCount, inMaintenanceCount };
  }, [vehicles]);

  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      if (categoryFilter !== 'Tous' && v.category !== categoryFilter) return false;
      if (ownershipFilter !== 'Tous' && v.ownership !== ownershipFilter) return false;
      if (statusFilter !== 'Tous' && v.status !== statusFilter) return false;
      
      if (onlyMaintenanceAlerts) {
        const info = getVehicleMaintenanceInfo(v);
        if (!info || !info.isApproaching) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = `${v.brand} ${v.model}`.toLowerCase().includes(q);
        const matchPlate = v.plateNumber.toLowerCase().includes(q);
        const matchPartner = v.partnerName ? v.partnerName.toLowerCase().includes(q) : false;
        const matchNotes = v.maintenanceNotes ? v.maintenanceNotes.toLowerCase().includes(q) : false;
        if (!matchName && !matchPlate && !matchPartner && !matchNotes) return false;
      }
      return true;
    });
  }, [vehicles, categoryFilter, ownershipFilter, statusFilter, onlyMaintenanceAlerts, searchQuery]);

  const handleOpenAddModal = () => {
    setEditingVehicleId(null);
    setFormData({
      brand: '',
      model: '',
      year: 2024,
      category: 'Berline',
      plateNumber: `${Math.floor(1000 + Math.random() * 9000)} HX 01`,
      dailyRate: 45000,
      halfDayRate: 30000,
      airportTransferRate: 25000,
      seats: 5,
      luggage: 3,
      transmission: 'Automatique',
      fuel: 'Essence',
      status: 'Disponible',
      ownership: 'Flotte Propre',
      partnerName: '',
      isVip: false,
      isRecommended: false,
      description: 'Véhicule d\'entreprise tout confort avec chauffeur assermenté.',
      features: ['Climatisation', 'Chauffeur dédié', 'Suivi GPS'],
      imageUrl: 'https://images.unsplash.com/photo-1550355291-bbee04a92027?auto=format&fit=crop&w=1000&q=80',
      mileageLimit: '250 km / jour inclus',
      nextMaintenanceDate: '2026-10-15',
      lastMaintenanceDate: '2026-04-01',
      maintenanceNotes: 'Vidange moteur & contrôle système de freinage'
    });
    setFormError(null);
    clearLastError();
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (v: Vehicle) => {
    setEditingVehicleId(v.id);
    setFormData({ 
      ...v,
      nextMaintenanceDate: v.nextMaintenanceDate || '2026-09-15',
      lastMaintenanceDate: v.lastMaintenanceDate || '2026-03-01',
      maintenanceNotes: v.maintenanceNotes || ''
    });
    setFormError(null);
    clearLastError();
    setIsModalOpen(true);
  };

  /**
   * Contrôle local reprenant les contraintes de l'API, pour signaler l'erreur
   * dans le formulaire plutôt que de faire un aller-retour réseau inutile.
   * Retourne le premier problème rencontré, ou `null` si la saisie est valide.
   */
  const validateVehicleForm = (data: Partial<Vehicle>): string | null => {
    if (!data.brand?.trim()) return 'La marque est obligatoire.';
    if (!data.model?.trim()) return 'Le modèle est obligatoire.';

    if ((data.plateNumber?.trim().length ?? 0) < 3) {
      return "L'immatriculation est obligatoire (3 caractères minimum).";
    }

    const maxYear = new Date().getFullYear() + 2;
    if (!data.year || data.year < 1990 || data.year > maxYear) {
      return `L'année doit être comprise entre 1990 et ${maxYear}.`;
    }

    if (!data.seats || data.seats < 1) return 'Le nombre de places doit être au moins 1.';
    if (data.luggage === undefined || data.luggage < 0) {
      return 'Le nombre de bagages ne peut pas être négatif.';
    }

    if (!data.dailyRate || data.dailyRate <= 0) {
      return 'Le tarif journalier est obligatoire et doit être positif.';
    }
    if ((data.halfDayRate ?? 0) < 0 || (data.airportTransferRate ?? 0) < 0) {
      return 'Les tarifs ne peuvent pas être négatifs.';
    }

    // L'API exige une URL exploitable (lien distant ou image importée en base64).
    try {
      new URL(data.imageUrl ?? '');
    } catch {
      return "La photo doit être un lien valide (https://…) ou une image importée.";
    }

    if (data.ownership === 'Sous-traitant' && !data.subcontractorId) {
      return 'Sélectionnez le partenaire sous-traitant propriétaire du véhicule.';
    }

    return null;
  };

  const handleSaveVehicle = async (e: React.FormEvent) => {
    e.preventDefault();

    const problem = validateVehicleForm(formData);
    if (problem) {
      setFormError(problem);
      showToast(problem, 'error');
      return;
    }

    setFormError(null);
    clearLastError();

    const saved = editingVehicleId
      ? await updateVehicle(editingVehicleId, formData)
      : await addVehicle(formData as Omit<Vehicle, 'id'>);

    // La fenêtre ne se ferme qu'en cas de succès : sinon la saisie serait perdue
    // alors que le message d'erreur explique quoi corriger.
    if (saved) setIsModalOpen(false);
  };

  const handleQuickStatusChange = (vehicleId: string, newStatus: VehicleStatus) => {
    updateVehicleStatus(vehicleId, newStatus);
  };

  const handleConfirmDelete = () => {
    if (vehicleToDelete) {
      deleteVehicle(vehicleToDelete.id);
      setVehicleToDelete(null);
    }
  };

  // Clôture les interventions ouvertes et planifie la révision semestrielle.
  // Les dates d'entretien sont dérivées côté API des interventions réelles :
  // elles ne peuvent pas être écrites directement sur le véhicule.
  const handleMarkMaintenanceDone = (vehicle: Vehicle) => {
    void completeVehicleMaintenance(
      vehicle.id,
      `Entretien validé le ${new Date().toLocaleDateString('fr-FR')}`
    );
  };

  const handleSendToMaintenance = (vehicle: Vehicle) => {
    void sendVehicleToMaintenance(vehicle.id, 'Envoi en révision technique depuis le back-office');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-serif text-slate-900 flex items-center gap-3">
            <span>Gestion de la Flotte Automobile</span>
            <span className="text-xs font-sans font-semibold px-2.5 py-0.5 rounded-full bg-[#1A1A2E] text-[#D4A017] border border-[#D4A017]/30">
              {vehicles.length} véhicules
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Supervision du parc, alertes de maintenance sous 15 jours, grilles tarifaires et disponibilité à Abidjan.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          id="btn-add-vehicle-top"
          className="px-5 py-2.5 bg-[#795900] text-white hover:bg-[#5c4300] active:scale-95 rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Ajouter un véhicule</span>
        </button>
      </div>

      {/* KPI & Alert Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Fleet */}
        <div 
          onClick={() => { setOnlyMaintenanceAlerts(false); setStatusFilter('Tous'); }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            !onlyMaintenanceAlerts && statusFilter === 'Tous' 
              ? 'bg-white border-[#795900] shadow-sm' 
              : 'bg-white/80 border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Parc Total</span>
            <Car className="w-4 h-4 text-[#795900]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{vehicles.length}</span>
            <span className="text-[11px] text-slate-500">véhicules</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500 flex gap-2">
            <span>Propre : <strong>{vehicles.filter(v => v.ownership === 'Flotte Propre').length}</strong></span>
            <span>•</span>
            <span>Partenaires : <strong>{vehicles.filter(v => v.ownership === 'Sous-traitant').length}</strong></span>
          </div>
        </div>

        {/* Available Vehicles */}
        <div 
          onClick={() => { setOnlyMaintenanceAlerts(false); setStatusFilter('Disponible'); }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'Disponible' && !onlyMaintenanceAlerts
              ? 'bg-emerald-50/70 border-emerald-500 shadow-sm' 
              : 'bg-white/80 border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Disponibles</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-800">
              {vehicles.filter(v => v.status === 'Disponible').length}
            </span>
            <span className="text-[11px] text-emerald-600 font-semibold">prêts pour mission</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Loués en cours : <strong>{vehicles.filter(v => v.status === 'Loué').length}</strong>
          </div>
        </div>

        {/* Vehicles in Maintenance */}
        <div 
          onClick={() => { setOnlyMaintenanceAlerts(false); setStatusFilter('Entretien'); }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'Entretien' && !onlyMaintenanceAlerts
              ? 'bg-amber-50/70 border-amber-500 shadow-sm' 
              : 'bg-white/80 border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">En Entretien</span>
            <Wrench className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-800">{maintenanceStats.inMaintenanceCount}</span>
            <span className="text-[11px] text-amber-700">au garage</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Hors service temporaire
          </div>
        </div>

        {/* ⚠️ RED ALERT: Maintenance <= 15 Days */}
        <div 
          onClick={() => { setOnlyMaintenanceAlerts(!onlyMaintenanceAlerts); setStatusFilter('Tous'); }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
            onlyMaintenanceAlerts 
              ? 'bg-red-500 text-white border-red-600 shadow-lg ring-2 ring-red-400' 
              : maintenanceStats.alertCount > 0
              ? 'bg-red-50/90 border-red-300 text-red-950 hover:bg-red-100/80 shadow-xs'
              : 'bg-white/80 border-slate-200 text-slate-800'
          }`}
        >
          {maintenanceStats.alertCount > 0 && !onlyMaintenanceAlerts && (
            <span className="absolute top-2 right-2 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
            </span>
          )}
          
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
              onlyMaintenanceAlerts ? 'text-white' : 'text-red-700'
            }`}>
              <AlertTriangle className={`w-4 h-4 ${onlyMaintenanceAlerts ? 'text-white' : 'text-red-600'}`} />
              Alertes Révision &lt; 15j
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold">{maintenanceStats.alertCount}</span>
            <span className={`text-[11px] font-semibold ${onlyMaintenanceAlerts ? 'text-red-100' : 'text-red-700'}`}>
              véhicules concernés
            </span>
          </div>
          <div className={`mt-1 text-[11px] font-medium ${onlyMaintenanceAlerts ? 'text-red-100' : 'text-red-600'}`}>
            {onlyMaintenanceAlerts 
              ? '✓ Filtre d\'alerte actif (cliquer pour tout voir)' 
              : maintenanceStats.overdueCount > 0 
                ? `Dont ${maintenanceStats.overdueCount} en retard ! Cliquer pour filtrer.`
                : 'Cliquer pour filtrer les révisions proches.'
            }
          </div>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row gap-4 justify-between items-center">
        
        {/* Search by name, plate, partner, or maintenance notes */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            id="fleet-search-input"
            placeholder="Rechercher par modèle, immatriculation, notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#D4A017]"
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

        {/* Filters Group */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end text-xs">
          
          {/* Quick Toggle for Maintenance Alert Filter */}
          <button
            onClick={() => setOnlyMaintenanceAlerts(!onlyMaintenanceAlerts)}
            className={`px-3 py-2 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
              onlyMaintenanceAlerts 
                ? 'bg-red-600 text-white border-red-600 shadow-xs' 
                : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Alertes Maintenance ({maintenanceStats.alertCount})</span>
          </button>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 cursor-pointer"
          >
            <option value="Tous">Tous les statuts</option>
            <option value="Disponible">Disponible</option>
            <option value="Loué">Loué (En mission)</option>
            <option value="Entretien">En Entretien</option>
            <option value="Indisponible">Indisponible</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 cursor-pointer"
          >
            <option value="Tous">Toutes les catégories</option>
            <option value="Berline">Berlines</option>
            <option value="SUV">SUVs</option>
            <option value="VIP Prestige">VIP Prestige</option>
            <option value="Minibus / Van">Minibus / Vans</option>
            <option value="Utilitaire">Utilitaires</option>
          </select>

          {/* Ownership Filter */}
          <select
            value={ownershipFilter}
            onChange={(e) => setOwnershipFilter(e.target.value)}
            className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 cursor-pointer"
          >
            <option value="Tous">Tout le parc</option>
            <option value="Flotte Propre">Flotte Propre Nyokah</option>
            <option value="Sous-traitant">Partenaires Sous-traitants</option>
          </select>

          <span className="text-slate-500 font-semibold pl-2">
            {filteredVehicles.length} / {vehicles.length} véhicules
          </span>
        </div>
      </div>

      {/* Vehicles Grid */}
      {filteredVehicles.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4">
          <Car className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-700">Aucun véhicule ne correspond aux critères</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Vérifiez les filtres de recherche ou réinitialisez les critères pour voir l'ensemble de la flotte.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setCategoryFilter('Tous');
              setOwnershipFilter('Tous');
              setStatusFilter('Tous');
              setOnlyMaintenanceAlerts(false);
            }}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold"
          >
            Réinitialiser les filtres
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVehicles.map((v) => {
            const maintInfo = getVehicleMaintenanceInfo(v);
            const hasAlert = maintInfo?.isApproaching;

            return (
              <div
                key={v.id}
                id={`vehicle-card-${v.id}`}
                className={`bg-white rounded-3xl border shadow-xs overflow-hidden flex flex-col justify-between hover:shadow-md transition-all relative ${
                  hasAlert 
                    ? maintInfo?.isOverdue 
                      ? 'border-red-400 ring-2 ring-red-400/40' 
                      : 'border-red-300 ring-1 ring-red-300/40'
                    : 'border-slate-200'
                }`}
              >
                <div>
                  {/* Photo & Badges */}
                  <div className="relative h-48 w-full bg-slate-900 overflow-hidden">
                    <img
                      src={v.imageUrl}
                      alt={`${v.brand} ${v.model}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

                    {/* Top Left Badges: Ownership & VIP */}
                    <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold shadow-xs ${
                        v.ownership === 'Flotte Propre'
                          ? 'bg-[#1A1A2E] text-white border border-white/20'
                          : 'bg-blue-600 text-white'
                      }`}>
                        {v.ownership}
                      </span>
                      {v.isVip && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#D4A017] text-[#1A1A2E] shadow-xs flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5" />
                          VIP
                        </span>
                      )}
                    </div>

                    {/* ⚠️ RED ALERT PILL (Pastille d'alerte rouge sur maintenance < 15j) */}
                    {hasAlert && (
                      <div className="absolute top-3 right-3 z-10 animate-bounce">
                        <div className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold flex items-center gap-1.5 shadow-lg border ${
                          maintInfo.isOverdue
                            ? 'bg-red-600 text-white border-red-300 animate-pulse'
                            : maintInfo.isToday
                            ? 'bg-red-600 text-white border-red-200'
                            : 'bg-red-500 text-white border-red-200'
                        }`}>
                          <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                          <span>
                            {maintInfo.isOverdue
                              ? `🚨 Retard ${Math.abs(maintInfo.daysRemaining)}j`
                              : maintInfo.isToday
                              ? '⚠️ Révision aujourd\'hui'
                              : `⚠️ Entretien dans ${maintInfo.daysRemaining}j`}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Bottom Title & Plate Number */}
                    <div className="absolute bottom-2.5 left-3 right-3 text-white flex justify-between items-end">
                      <div>
                        <span className="text-[10px] text-[#D4A017] font-bold uppercase tracking-wider">{v.category}</span>
                        <h3 className="text-base font-bold font-serif leading-snug">{v.brand} {v.model} ({v.year})</h3>
                      </div>
                      <span className="text-[11px] font-mono bg-black/60 px-2 py-0.5 rounded-md border border-white/20 font-bold">
                        {v.plateNumber}
                      </span>
                    </div>
                  </div>

                  {/* Specs & Pricing Details */}
                  <div className="p-5 space-y-3.5">
                    
                    {/* Rate Bar */}
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-medium">Tarif Journée Référence :</span>
                      <span className="font-extrabold text-base text-[#795900]">{formatFCFA(v.dailyRate)}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 border-t border-slate-100 pt-2.5">
                      <div>Demi-journée : <strong className="text-slate-800">{formatFCFA(v.halfDayRate)}</strong></div>
                      <div>Aéroport FHB : <strong className="text-slate-800">{formatFCFA(v.airportTransferRate)}</strong></div>
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3 text-slate-400" />
                        <span>Places : <strong className="text-slate-800">{v.seats}</strong></span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Fuel className="w-3 h-3 text-slate-400" />
                        <span>{v.fuel} ({v.transmission})</span>
                      </div>
                    </div>

                    {/* 🔧 MAINTENANCE SECTION with Red Alert Details */}
                    <div className={`p-3 rounded-2xl border text-xs space-y-1.5 transition-colors ${
                      hasAlert
                        ? maintInfo?.isOverdue
                          ? 'bg-red-50 border-red-200 text-red-900'
                          : 'bg-red-50/70 border-red-200 text-red-900'
                        : v.status === 'Entretien'
                        ? 'bg-amber-50 border-amber-200 text-amber-900'
                        : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}>
                      <div className="flex items-center justify-between font-bold">
                        <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                          <Wrench className={`w-3.5 h-3.5 ${hasAlert ? 'text-red-600' : 'text-slate-500'}`} />
                          Suivi Maintenance
                        </span>
                        
                        {hasAlert ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-red-600 text-white">
                            {maintInfo.isOverdue 
                              ? `Échue depuis ${Math.abs(maintInfo.daysRemaining)}j` 
                              : `J-${maintInfo.daysRemaining}`
                            }
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-normal">
                            Prochaine : {maintInfo?.formattedDate || 'Non planifiée'}
                          </span>
                        )}
                      </div>

                      {/* Date & Alert Details */}
                      <div className="text-[11px] flex justify-between items-center">
                        <span className="text-slate-500">Prochaine révision :</span>
                        <span className={`font-semibold ${hasAlert ? 'text-red-700 font-bold' : 'text-slate-800'}`}>
                          {maintInfo?.formattedDate || v.nextMaintenanceDate || 'À définir'}
                        </span>
                      </div>

                      {v.maintenanceNotes && (
                        <div className="text-[10px] text-slate-600 italic bg-white/70 p-1.5 rounded-lg border border-slate-200/50">
                          {v.maintenanceNotes}
                        </div>
                      )}

                      {/* Quick Maintenance Resolution Buttons */}
                      {hasAlert && (
                        <div className="pt-1 flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleMarkMaintenanceDone(v)}
                            className="flex-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                            title="Enregistrer la révision faite et reporter de 6 mois"
                          >
                            <Check className="w-3 h-3" />
                            <span>Révision effectuée</span>
                          </button>
                          
                          {v.status !== 'Entretien' && (
                            <button
                              type="button"
                              onClick={() => handleSendToMaintenance(v)}
                              className="py-1.5 px-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                              title="Mettre le statut en entretien technique"
                            >
                              <Wrench className="w-3 h-3" />
                              <span>Au garage</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Status Switcher dropdown inside card */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs text-slate-500 font-semibold">Statut parc :</span>
                      <select
                        value={v.status}
                        onChange={(e) => handleQuickStatusChange(v.id, e.target.value as VehicleStatus)}
                        className={`text-xs font-bold px-2.5 py-1.5 rounded-xl cursor-pointer border transition-all ${
                          v.status === 'Disponible'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                            : v.status === 'Loué'
                            ? 'bg-blue-50 text-blue-800 border-blue-300 hover:bg-blue-100'
                            : v.status === 'Entretien'
                            ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                            : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        <option value="Disponible">Disponible</option>
                        <option value="Loué">Loué (En mission)</option>
                        <option value="Entretien">En Entretien / Révision</option>
                        <option value="Indisponible">Indisponible</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions (Edit & Delete buttons) */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(v)}
                    className="text-xs font-bold text-[#795900] hover:text-[#5c4300] hover:underline flex items-center gap-1.5 py-1 px-2 rounded-lg hover:bg-amber-50/50 transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Modifier les paramètres</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setVehicleToDelete(v)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                    title="Supprimer définitivement du parc"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT VEHICLE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
            
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-serif font-bold text-xl text-slate-900">
                  {editingVehicleId ? 'Modifier le Véhicule' : 'Ajouter un Nouveau Véhicule'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Mettez à jour les caractéristiques, tarifs et dates d'entretien technique.
                </p>
              </div>
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveVehicle} className="space-y-4 text-xs">

              {/* Motif du refus, conservé tant que la saisie n'est pas corrigée */}
              {(formError ?? lastError) && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-[11px] text-[#B3253F]">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="font-semibold">{formError ?? lastError}</span>
                </div>
              )}

              
              {/* Brand & Model */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block uppercase font-bold text-slate-600 mb-1">Marque *</label>
                  <input
                    type="text"
                    required
                    value={formData.brand || ''}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    placeholder="Ex: Toyota, Mercedes-Benz, Hyundai..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:bg-white focus:ring-1 focus:ring-[#795900]"
                  />
                </div>
                <div>
                  <label className="block uppercase font-bold text-slate-600 mb-1">Modèle *</label>
                  <input
                    type="text"
                    required
                    value={formData.model || ''}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    placeholder="Ex: Land Cruiser Prado, Classe E, Hiace..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:bg-white focus:ring-1 focus:ring-[#795900]"
                  />
                </div>
              </div>

              {/* Year, Plate, Category, Ownership */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block uppercase font-bold text-slate-600 mb-1">Année</label>
                  <input
                    type="number"
                    min="2018"
                    max="2027"
                    value={formData.year || 2024}
                    onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block uppercase font-bold text-slate-600 mb-1">Immatriculation (CI) *</label>
                  <input
                    type="text"
                    required
                    value={formData.plateNumber || ''}
                    onChange={(e) => setFormData({ ...formData, plateNumber: e.target.value })}
                    placeholder="Ex: 5824 HX 01"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block uppercase font-bold text-slate-600 mb-1">Catégorie</label>
                  <select
                    value={formData.category || 'Berline'}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as VehicleCategory })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900"
                  >
                    <option value="Berline">Berline</option>
                    <option value="SUV">SUV</option>
                    <option value="VIP Prestige">VIP Prestige</option>
                    <option value="Minibus / Van">Minibus / Van</option>
                    <option value="Utilitaire">Utilitaire</option>
                  </select>
                </div>
                <div>
                  <label className="block uppercase font-bold text-slate-600 mb-1">Propriété</label>
                  <select
                    value={formData.ownership || 'Flotte Propre'}
                    onChange={(e) => setFormData({ ...formData, ownership: e.target.value as OwnershipType })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900"
                  >
                    <option value="Flotte Propre">Flotte Propre Nyokah</option>
                    <option value="Sous-traitant">Partenaire Sous-traitant</option>
                  </select>
                </div>
              </div>

              {/* Partenaire propriétaire, choisi parmi les sous-traitants enregistrés :
                  le véhicule est rattaché à sa fiche, ce qui alimente le calcul de
                  commission. Un nom saisi librement ne serait rattaché à rien. */}
              {formData.ownership === 'Sous-traitant' && (
                <div>
                  <label className="block uppercase font-bold text-slate-600 mb-1">
                    Partenaire Sous-traitant *
                  </label>
                  {subcontractors.length === 0 ? (
                    <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-2.5">
                      Aucun partenaire enregistré. Créez-le d'abord dans « Chauffeurs &
                      Partenaires ».
                    </p>
                  ) : (
                    <select
                      value={formData.subcontractorId || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, subcontractorId: e.target.value || null })
                      }
                      className="w-full p-2.5 bg-blue-50/60 border border-blue-200 rounded-xl font-semibold text-slate-900"
                    >
                      <option value="">Sélectionner un partenaire…</option>
                      {subcontractors.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} — commission {s.commissionRate} %
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Pricing grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-amber-50/70 p-4 rounded-2xl border border-amber-200">
                <div>
                  <label className="block uppercase font-bold text-slate-700 mb-1">Tarif Journée (FCFA) *</label>
                  <input
                    type="number"
                    step="1000"
                    required
                    value={formData.dailyRate || 0}
                    onChange={(e) => setFormData({ ...formData, dailyRate: Number(e.target.value) })}
                    className="w-full p-2.5 bg-white border border-amber-300 rounded-xl font-bold text-[#795900]"
                  />
                </div>
                <div>
                  <label className="block uppercase font-bold text-slate-700 mb-1">Demi-journée (FCFA)</label>
                  <input
                    type="number"
                    step="1000"
                    value={formData.halfDayRate || 0}
                    onChange={(e) => setFormData({ ...formData, halfDayRate: Number(e.target.value) })}
                    className="w-full p-2.5 bg-white border border-amber-300 rounded-xl font-bold text-[#795900]"
                  />
                </div>
                <div>
                  <label className="block uppercase font-bold text-slate-700 mb-1">Aéroport FHB (FCFA)</label>
                  <input
                    type="number"
                    step="1000"
                    value={formData.airportTransferRate || 0}
                    onChange={(e) => setFormData({ ...formData, airportTransferRate: Number(e.target.value) })}
                    className="w-full p-2.5 bg-white border border-amber-300 rounded-xl font-bold text-[#795900]"
                  />
                </div>
              </div>

              {/* 🔧 MAINTENANCE SECTION IN MODAL */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center gap-2 text-slate-800 font-bold uppercase text-[11px] tracking-wider">
                  <Wrench className="w-4 h-4 text-[#795900]" />
                  <span>Gestion des Révisions & Maintenance Technique</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block uppercase font-bold text-slate-600 mb-1">
                      Prochaine Révision Prévue (Date) *
                    </label>
                    <input
                      type="date"
                      value={formData.nextMaintenanceDate || ''}
                      onChange={(e) => setFormData({ ...formData, nextMaintenanceDate: e.target.value })}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-semibold text-slate-900"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Une pastille rouge s'affiche automatiquement si la date est dans les 15 jours.
                    </p>
                  </div>

                  <div>
                    <label className="block uppercase font-bold text-slate-600 mb-1">
                      Dernière Révision Effectuée
                    </label>
                    <input
                      type="date"
                      value={formData.lastMaintenanceDate || ''}
                      onChange={(e) => setFormData({ ...formData, lastMaintenanceDate: e.target.value })}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-semibold text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block uppercase font-bold text-slate-600 mb-1">
                    Notes d'entretien / Opérations à prévoir
                  </label>
                  <input
                    type="text"
                    value={formData.maintenanceNotes || ''}
                    onChange={(e) => setFormData({ ...formData, maintenanceNotes: e.target.value })}
                    placeholder="Ex: Vidange moteur 10 000 km, contrôle plaquettes, climatisation..."
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900"
                  />
                </div>
              </div>

              {/* Seats, Luggage, Fuel, Status */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block uppercase font-bold text-slate-600 mb-1">Places assises</label>
                  <input
                    type="number"
                    min="2"
                    max="30"
                    value={formData.seats || 5}
                    onChange={(e) => setFormData({ ...formData, seats: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block uppercase font-bold text-slate-600 mb-1">Bagages</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={formData.luggage || 3}
                    onChange={(e) => setFormData({ ...formData, luggage: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block uppercase font-bold text-slate-600 mb-1">Carburant</label>
                  <select
                    value={formData.fuel || 'Essence'}
                    onChange={(e) => setFormData({ ...formData, fuel: e.target.value as 'Essence' | 'Diesel' | 'Hybride' })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900"
                  >
                    <option value="Diesel">Diesel</option>
                    <option value="Essence">Essence</option>
                    <option value="Hybride">Hybride</option>
                  </select>
                </div>
                <div>
                  <label className="block uppercase font-bold text-slate-600 mb-1">Statut Initial</label>
                  <select
                    value={formData.status || 'Disponible'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as VehicleStatus })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900"
                  >
                    <option value="Disponible">Disponible</option>
                    <option value="Loué">Loué</option>
                    <option value="Entretien">Entretien</option>
                    <option value="Indisponible">Indisponible</option>
                  </select>
                </div>
              </div>

              {/* Vehicle Photo Upload & Management */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <label className="block uppercase font-bold text-slate-700 text-xs flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-[#795900]" />
                    <span>Photo Principale du Véhicule (Catalogue & Fiche) *</span>
                  </label>

                  {/* Mode switcher tabs */}
                  <div className="flex items-center bg-white border border-slate-200 rounded-xl p-0.5 text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setUploadTab('upload')}
                      className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                        uploadTab === 'upload' ? 'bg-[#795900] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Upload className="w-3 h-3" />
                      <span>Uploader un fichier</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setUploadTab('preset')}
                      className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                        uploadTab === 'preset' ? 'bg-[#795900] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Bibliothèque VIP</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setUploadTab('url')}
                      className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                        uploadTab === 'url' ? 'bg-[#795900] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Link2 className="w-3 h-3" />
                      <span>Lien URL</span>
                    </button>
                  </div>
                </div>

                {/* TAB 1: FILE UPLOAD (DRAG & DROP + CLICK) */}
                {uploadTab === 'upload' && (
                  <div>
                    {/* Hidden Native File Input */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      id="vehicle-image-file-input"
                      accept="image/png, image/jpeg, image/jpg, image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void handleImageFileUpload(file);
                      }}
                    />

                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer select-none ${
                        isDragging
                          ? 'border-[#795900] bg-amber-50/70 ring-4 ring-[#795900]/20'
                          : 'border-slate-300 hover:border-[#795900] bg-white hover:bg-slate-50/80'
                      }`}
                    >
                      <div className="w-12 h-12 rounded-full bg-amber-100 text-[#795900] flex items-center justify-center mx-auto mb-3">
                        <Upload className="w-6 h-6 animate-bounce" />
                      </div>
                      <p className="text-sm font-bold text-slate-800">
                        {isDragging ? 'Déposez la photo ici...' : 'Glissez-déposez la photo du véhicule ici'}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        ou <span className="text-[#795900] font-bold underline">cliquez pour parcourir vos fichiers</span>
                      </p>
                      <p className="text-[11px] text-slate-400 mt-2">
                        Formats acceptés : PNG, JPG, JPEG, WEBP • Taille max : 8 Mo
                      </p>
                    </div>
                  </div>
                )}

                {/* TAB 2: PRESET LIBRARY */}
                {uploadTab === 'preset' && (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-600 font-medium">
                      Sélectionnez une photo haute résolution parmi nos modèles exécutifs types :
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                      {VEHICLE_PRESET_IMAGES.map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setFormData((prev) => ({ ...prev, imageUrl: preset.url }));
                            showToast(`Photo "${preset.label}" sélectionnée.`, 'success');
                          }}
                          className={`flex items-center gap-3 p-2 rounded-xl border text-left transition-all cursor-pointer ${
                            formData.imageUrl === preset.url
                              ? 'border-[#795900] bg-amber-50/60 ring-2 ring-[#795900]/20'
                              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <img
                            src={preset.url}
                            alt={preset.label}
                            className="w-12 h-10 object-cover rounded-lg shrink-0 border border-slate-200"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-slate-900 truncate">{preset.label}</p>
                            <span className="text-[10px] text-slate-500">{preset.cat}</span>
                          </div>
                          {formData.imageUrl === preset.url && (
                            <CheckCircle2 className="w-4 h-4 text-[#795900] shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* TAB 3: URL MANUELLE */}
                {uploadTab === 'url' && (
                  <div>
                    <label className="block uppercase font-bold text-slate-600 text-[11px] mb-1">
                      Lien direct vers l'image web
                    </label>
                    <input
                      type="url"
                      value={formData.imageUrl || ''}
                      onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                      placeholder="https://images.unsplash.com/..."
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono text-[11px] text-slate-900"
                    />
                  </div>
                )}

                {/* ACTIVE PHOTO PREVIEW CARD */}
                {formData.imageUrl && (
                  <div className="mt-3 bg-white border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row items-center gap-4">
                    <div className="relative w-full sm:w-36 h-24 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 shrink-0">
                      <img
                        src={formData.imageUrl}
                        alt="Aperçu véhicule"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Fallback on error
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=600&q=80';
                        }}
                      />
                      <span className="absolute bottom-1 right-1 bg-black/70 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                        Aperçu
                      </span>
                    </div>

                    <div className="min-w-0 flex-1 w-full space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          Photo prête pour le catalogue
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 font-medium truncate">
                        {formData.brand || 'Marque'} {formData.model || 'Modèle'} ({formData.year || 2024})
                      </p>
                      <p className="text-[11px] text-slate-400 truncate max-w-xs font-mono">
                        {formData.imageUrl.startsWith('data:image') ? 'Fichier importé localement (Base64)' : formData.imageUrl}
                      </p>
                    </div>

                    <div className="flex sm:flex-col gap-2 w-full sm:w-auto shrink-0">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-1 sm:flex-none px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Remplacer</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, imageUrl: '' }))}
                        className="flex-1 sm:flex-none px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Supprimer</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Checkboxes */}
              <div className="flex flex-wrap gap-6 pt-2">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isVip || false}
                    onChange={(e) => setFormData({ ...formData, isVip: e.target.checked })}
                    className="w-4 h-4 rounded text-[#D4A017] accent-[#795900]"
                  />
                  <span className="font-semibold text-slate-800">Véhicule VIP Haut de Gamme</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isRecommended || false}
                    onChange={(e) => setFormData({ ...formData, isRecommended: e.target.checked })}
                    className="w-4 h-4 rounded text-[#D4A017] accent-[#795900]"
                  />
                  <span className="font-semibold text-slate-800">Badge "Recommandé" en vitrine</span>
                </label>
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end gap-3 pt-5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  id="btn-save-vehicle-modal"
                  className="px-6 py-2.5 bg-[#795900] hover:bg-[#5c4300] text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingVehicleId ? 'Mettre à jour le véhicule' : 'Enregistrer le véhicule'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE DIALOG */}
      {vehicleToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            
            <div className="text-center space-y-1">
              <h3 className="font-bold text-lg text-slate-900">Confirmer la suppression</h3>
              <p className="text-xs text-slate-500">
                Êtes-vous sûr de vouloir retirer le véhicule <strong className="text-slate-800">{vehicleToDelete.brand} {vehicleToDelete.model} ({vehicleToDelete.plateNumber})</strong> de la flotte ?
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setVehicleToDelete(null)}
                className="flex-1 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-sm transition-colors"
              >
                Supprimer du parc
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
