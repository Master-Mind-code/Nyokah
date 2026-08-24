import React from 'react';
import { useApp } from '../../context/AppContext';
import { Ride, RideStatus } from '../../types';
import { 
  Navigation, 
  MapPin, 
  Car, 
  UserCheck, 
  Clock, 
  Phone, 
  CheckCircle2, 
  Building2, 
  Send,
  Sparkles
} from 'lucide-react';

export const AdminRides: React.FC = () => {
  const { rides, updateRideStatus, drivers, vehicles, showToast } = useApp();

  const handleUpdateRideStatus = (rideId: string, newStatus: RideStatus) => {
    updateRideStatus(rideId, newStatus);
  };

  const handleSendWhatsAppToDriver = (ride: Ride) => {
    const driver = drivers.find((d) => d.id === ride.driverId);
    showToast(`Ordre de mission envoyé par WhatsApp à ${driver?.name || 'Chauffeur'}.`, 'info');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-serif text-slate-900">
            Supervision des Courses en Direct
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Suivez les trajets en temps réel, l'état d'avancement des missions et la ponctualité des chauffeurs à Abidjan.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            {rides.filter((r) => r.status === 'En cours' || r.status === 'En route').length} courses actives
          </span>
        </div>
      </div>

      {/* Rides List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {rides.map((ride) => {
          const driver = drivers.find((d) => d.id === ride.driverId);
          const vehicle = vehicles.find((v) => v.id === ride.vehicleId);

          return (
            <div
              key={ride.id}
              className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow"
            >
              <div>
                {/* Header line with ID and Status */}
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-[#1A1A2E] text-[#D4A017] flex items-center justify-center font-mono font-bold text-xs">
                      <Navigation className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-mono font-bold text-slate-900">{ride.id}</span>
                      <span className="text-[10px] text-slate-500 block">Réf : {ride.bookingId}</span>
                    </div>
                  </div>

                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    ride.status === 'En cours'
                      ? 'bg-emerald-100 text-emerald-800 animate-pulse'
                      : ride.status === 'En route'
                      ? 'bg-blue-100 text-blue-800'
                      : ride.status === 'Planifiée'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-slate-100 text-slate-700'
                  }`}>
                    {ride.status}
                  </span>
                </div>

                {/* Itinerary */}
                <div className="p-3.5 bg-[#F9F9FD] rounded-2xl border border-slate-100 space-y-3 mb-4">
                  <div className="flex items-start gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1 shrink-0" />
                    <div>
                      <div className="text-[10px] font-bold uppercase text-slate-400">Prise en charge ({ride.time})</div>
                      <div className="text-xs font-bold text-slate-800">{ride.pickupLocation}</div>
                    </div>
                  </div>

                  <div className="border-l-2 border-dashed border-slate-300 ml-1 pl-4 my-0.5" />

                  <div className="flex items-start gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#E94560] mt-1 shrink-0" />
                    <div>
                      <div className="text-[10px] font-bold uppercase text-slate-400">Destination</div>
                      <div className="text-xs font-bold text-slate-800">{ride.destinationLocation}</div>
                    </div>
                  </div>
                </div>

                {/* Driver & Passenger details */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Chauffeur</span>
                    <div className="font-bold text-slate-900 flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                      {driver?.name || ride.driverName}
                    </div>
                    <div className="text-[11px] text-slate-500">{driver?.phone}</div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Passager & Véhicule</span>
                    <div className="font-bold text-slate-900 truncate">{ride.clientName}</div>
                    <div className="text-[11px] text-slate-500 truncate">{vehicle?.brand || ride.vehicleName} ({ride.plateNumber})</div>
                  </div>
                </div>
              </div>

              {/* Status Switcher and WhatsApp Dispatch */}
              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-2 justify-between items-center text-xs">
                <div className="flex items-center gap-1.5 w-full sm:w-auto">
                  <span className="text-slate-500 font-semibold">Statut :</span>
                  <select
                    value={ride.status}
                    onChange={(e) => handleUpdateRideStatus(ride.id, e.target.value as RideStatus)}
                    className="p-1.5 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-800 cursor-pointer"
                  >
                    <option value="Planifiée">Planifiée</option>
                    <option value="En route">En route vers client</option>
                    <option value="En cours">En cours (À bord)</option>
                    <option value="Terminée">Terminée</option>
                    <option value="Annulée">Annulée</option>
                  </select>
                </div>

                <button
                  onClick={() => handleSendWhatsAppToDriver(ride)}
                  className="w-full sm:w-auto px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Send className="w-3 h-3" />
                  <span>Ordre WhatsApp</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
