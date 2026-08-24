import React, { useState } from 'react';
import { useApp, formatFCFA } from '../../context/AppContext';
import { Booking, BookingStatus } from '../../types';
import { 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  UserCheck, 
  Car, 
  MapPin, 
  Calendar, 
  Clock, 
  Building2, 
  Tag, 
  Download, 
  Eye, 
  X,
  AlertCircle,
  Phone,
  Mail,
  Check
} from 'lucide-react';

export const AdminReservations: React.FC = () => {
  const { 
    bookings, 
    vehicles, 
    drivers, 
    companies, 
    assignDriverAndVehicle, 
    updateBookingStatus, 
    showToast 
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Tous');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  
  // Assign Modal state
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [modalBooking, setModalBooking] = useState<Booking | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');

  const filteredBookings = bookings.filter((b) => {
    if (statusFilter !== 'Tous' && b.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchRef = b.id.toLowerCase().includes(q);
      const matchClient = b.clientName.toLowerCase().includes(q);
      const matchVehicle = b.vehicleName.toLowerCase().includes(q);
      const matchDriver = (b.assignedDriverName || '').toLowerCase().includes(q);
      if (!matchRef && !matchClient && !matchVehicle && !matchDriver) return false;
    }
    return true;
  });

  const handleOpenAssignModal = (b: Booking) => {
    setModalBooking(b);
    setSelectedVehicleId(b.vehicleId);
    setSelectedDriverId(b.assignedDriverId || (drivers.find(d => d.status === 'Disponible')?.id || drivers[0].id));
    setIsAssignModalOpen(true);
  };

  const handleSaveAssignment = () => {
    if (!modalBooking || !selectedDriverId || !selectedVehicleId) return;
    assignDriverAndVehicle(modalBooking.id, selectedDriverId, selectedVehicleId);
    setIsAssignModalOpen(false);
    setModalBooking(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Top Title & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-serif text-slate-900">
            Gestion des Réservations
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Traitez les demandes entrantes, affectez chauffeurs et véhicules, et suivez la facturation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs">
            Total : {bookings.length} réservations
          </span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          
          {/* Search Input */}
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher par référence, client, véhicule..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#D4A017]"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            {['Tous', 'En attente', 'Confirmée', 'En cours', 'Terminée', 'Annulée'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 ${
                  statusFilter === st
                    ? 'bg-[#795900] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F9F9FD] border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4">Réf</th>
                <th className="py-3.5 px-4">Client / Société</th>
                <th className="py-3.5 px-4">Véhicule</th>
                <th className="py-3.5 px-4">Dates & Formule</th>
                <th className="py-3.5 px-4">Chauffeur Assigné</th>
                <th className="py-3.5 px-4">Rabais & Total TTC</th>
                <th className="py-3.5 px-4">Statut</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 text-sm">
                    Aucune réservation trouvée pour ce critère de recherche.
                  </td>
                </tr>
              ) : (
                filteredBookings.map((b) => {
                  const comp = companies.find((c) => c.id === b.companyId);
                  return (
                    <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {b.id}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{b.clientName}</div>
                        <div className="text-[10px] text-slate-500">{b.clientPhone}</div>
                        {comp && (
                          <span className="inline-block mt-0.5 text-[10px] font-bold text-[#795900] bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            {comp.name} (-{comp.negotiatedDiscountRate}%)
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">{b.vehicleName}</div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-600">
                        <div className="font-medium text-slate-800">
                          {b.startDate} {b.startTime && `(${b.startTime})`}
                        </div>
                        <div className="text-[10px] text-slate-500">{b.formula}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        {b.assignedDriverName ? (
                          <div className="flex items-center gap-1.5 font-bold text-slate-800">
                            <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{b.assignedDriverName}</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleOpenAssignModal(b)}
                            className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 hover:bg-amber-200 font-bold text-[10px] flex items-center gap-1"
                          >
                            <AlertCircle className="w-3 h-3 text-amber-600" />
                            <span>Affecter maintenant</span>
                          </button>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{formatFCFA(b.totalAmount)}</div>
                        {b.discountAmount > 0 ? (
                          <div className="text-[10px] text-[#795900] font-semibold">
                            - {formatFCFA(b.discountAmount)} ({b.discountReason})
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400">Plein tarif public</div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
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

                      <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => handleOpenAssignModal(b)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs transition-colors"
                          title="Affecter ou changer chauffeur/véhicule"
                        >
                          Affecter
                        </button>

                        <button
                          onClick={() => setSelectedBooking(b)}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors inline-block"
                          title="Voir le détail complet"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ASSIGN DRIVER & VEHICLE MODAL */}
      {isAssignModalOpen && modalBooking && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-200 space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-serif font-bold text-lg text-slate-900">
                  Affectation Chauffeur & Véhicule
                </h3>
                <p className="text-xs text-slate-500">
                  Mission {modalBooking.id} • {modalBooking.clientName}
                </p>
              </div>
              <button 
                onClick={() => setIsAssignModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Select Driver */}
              <div>
                <label className="block text-xs uppercase tracking-wider font-bold text-slate-600 mb-2">
                  Chauffeur Professionnel Dédié
                </label>
                <select
                  value={selectedDriverId}
                  onChange={(e) => setSelectedDriverId(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 cursor-pointer"
                >
                  <option value="">Sélectionner un chauffeur...</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} — {d.status} ({d.languages.join(', ')}) {d.rating}★
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Vehicle */}
              <div>
                <label className="block text-xs uppercase tracking-wider font-bold text-slate-600 mb-2">
                  Véhicule de la flotte
                </label>
                <select
                  value={selectedVehicleId}
                  onChange={(e) => setSelectedVehicleId(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 cursor-pointer"
                >
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.brand} {v.model} ({v.plateNumber}) — {v.status} [{v.ownership}]
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Update */}
              <div>
                <label className="block text-xs uppercase tracking-wider font-bold text-slate-600 mb-2">
                  Passer la réservation au statut
                </label>
                <select
                  defaultValue="Confirmée"
                  onChange={(e) => updateBookingStatus(modalBooking.id, e.target.value as BookingStatus)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 cursor-pointer"
                >
                  <option value="Confirmée">Confirmée (Chauffeur briefé)</option>
                  <option value="En cours">En cours (Mission active)</option>
                  <option value="En attente">En attente de validation</option>
                  <option value="Terminée">Terminée</option>
                  <option value="Annulée">Annulée</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Annuler
              </button>
              <button
                onClick={handleSaveAssignment}
                className="px-6 py-2.5 bg-[#795900] hover:bg-[#5c4300] text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Valider l'affectation</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs uppercase font-bold text-[#795900]">Fiche Réservation</span>
                <h3 className="font-serif font-bold text-xl text-slate-900">
                  {selectedBooking.id}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedBooking(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700">
              <div className="p-3 bg-[#F9F9FD] rounded-xl border border-slate-100 space-y-1">
                <div className="font-bold text-slate-900 text-sm">{selectedBooking.clientName}</div>
                <div>Email : {selectedBooking.clientEmail}</div>
                <div>Téléphone : {selectedBooking.clientPhone}</div>
                {selectedBooking.companyId && (
                  <div className="text-[#795900] font-bold mt-1">
                    Compte B2B : {companies.find(c => c.id === selectedBooking.companyId)?.name}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-slate-50 rounded-xl">
                  <div className="text-slate-500 font-bold">Départ</div>
                  <div className="font-semibold text-slate-900">{selectedBooking.startDate} ({selectedBooking.startTime})</div>
                  <div className="text-[11px]">{selectedBooking.pickupLocation}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <div className="text-slate-500 font-bold">Retour</div>
                  <div className="font-semibold text-slate-900">{selectedBooking.endDate} ({selectedBooking.endTime})</div>
                  <div className="text-[11px]">{selectedBooking.dropoffLocation}</div>
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                <div className="flex justify-between font-bold text-slate-900 text-sm">
                  <span>Total Facturé TTC :</span>
                  <span className="text-[#795900]">{formatFCFA(selectedBooking.totalAmount)}</span>
                </div>
                {selectedBooking.discountAmount > 0 && (
                  <div className="text-[11px] text-[#795900] font-semibold mt-1">
                    Remise accordée : -{formatFCFA(selectedBooking.discountAmount)} ({selectedBooking.discountReason})
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-100">
              <button
                onClick={() => {
                  showToast(`Téléchargement du bordereau de mission ${selectedBooking.id}.pdf`, 'info');
                }}
                className="text-xs font-bold text-slate-700 hover:underline flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" /> Bordereau PDF
              </button>
              <button
                onClick={() => setSelectedBooking(null)}
                className="px-5 py-2 bg-[#1A1A2E] text-white text-xs font-bold rounded-xl"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
