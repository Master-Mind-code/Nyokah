import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  User, 
  Building2, 
  Award, 
  MapPin, 
  Calendar, 
  Phone, 
  Mail, 
  CreditCard, 
  FileText, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  LogOut, 
  ShieldCheck, 
  Sparkles, 
  Car, 
  ExternalLink,
  Receipt,
  Users,
  MessageSquare,
  CheckCheck,
  Send,
  Info
} from 'lucide-react';

export const UserProfileView: React.FC = () => {
  const { 
    currentUser, 
    logout, 
    openAuthModal, 
    updateUserProfile, 
    addFavoriteAddress, 
    removeFavoriteAddress, 
    bookings, 
    setClientTab, 
    formatFCFA,
    whatsAppNotifications,
    openWhatsAppSimulator,
    simulateBookingValidationNotification,
    simulateDriverAssignmentNotification,
    unreadWhatsAppCount
  } = useApp();

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editedName, setEditedName] = useState(currentUser?.fullName || '');
  const [editedPhone, setEditedPhone] = useState(currentUser?.phone || '');
  const [editedDistrict, setEditedDistrict] = useState(currentUser?.district || 'Cocody');
  
  const [newAddressInput, setNewAddressInput] = useState('');
  const [newAuthorizedUser, setNewAuthorizedUser] = useState('');

  if (!currentUser) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-20 h-20 rounded-3xl bg-[#0B132B] text-[#D4A017] mx-auto flex items-center justify-center shadow-lg">
          <User className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold font-serif text-slate-900">
            Espace Membre & Entreprise
          </h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            Connectez-vous ou créez votre compte pour gérer vos réservations, adresses favorites et tarifs préférentiels.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <button
            onClick={() => openAuthModal('login')}
            className="px-6 py-3 rounded-full bg-[#0B132B] text-white hover:bg-[#1A264F] text-sm font-bold shadow-md"
          >
            Se connecter
          </button>
          <button
            onClick={() => openAuthModal('register-individual')}
            className="px-6 py-3 rounded-full bg-[#795900] text-white hover:bg-[#5c4300] text-sm font-bold shadow-md"
          >
            Créer un compte Particulier
          </button>
          <button
            onClick={() => openAuthModal('register-company')}
            className="px-6 py-3 rounded-full border border-[#0B132B] text-[#0B132B] hover:bg-slate-50 text-sm font-bold"
          >
            Compte Entreprise B2B
          </button>
        </div>
      </div>
    );
  }

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateUserProfile({
      fullName: editedName,
      phone: editedPhone,
      district: editedDistrict
    });
    setIsEditingProfile(false);
  };

  const handleAddAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddressInput.trim()) return;
    addFavoriteAddress(newAddressInput.trim());
    setNewAddressInput('');
  };

  const handleAddAuthorizedBooker = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAuthorizedUser.trim()) return;
    const currentList = currentUser.authorizedBookers || [];
    updateUserProfile({
      authorizedBookers: [...currentList, newAuthorizedUser.trim()]
    });
    setNewAuthorizedUser('');
  };

  // Filter bookings for this user / company
  const userBookings = bookings.filter((b) => {
    if (currentUser.type === 'company' && currentUser.companyId) {
      return b.companyId === currentUser.companyId || b.clientEmail.toLowerCase() === currentUser.email.toLowerCase();
    }
    return b.clientEmail.toLowerCase() === currentUser.email.toLowerCase() || b.clientName.toLowerCase() === currentUser.fullName.toLowerCase();
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 animate-in fade-in duration-300">
      
      {/* Top Banner Profile Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="relative">
            <img
              src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}
              alt={currentUser.fullName}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl object-cover border-2 border-[#D4A017] shadow-md"
            />
            <div className="absolute -bottom-2 -right-2 bg-[#0B132B] text-[#D4A017] p-1.5 rounded-xl border border-white shadow-xs">
              {currentUser.type === 'company' ? (
                <Building2 className="w-4 h-4" />
              ) : currentUser.type === 'admin' ? (
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              ) : (
                <Award className="w-4 h-4 text-[#D4A017]" />
              )}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold font-serif text-slate-900">
                {currentUser.fullName}
              </h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase tracking-wider ${
                currentUser.type === 'company'
                  ? 'bg-blue-100 text-blue-900 border border-blue-200'
                  : currentUser.type === 'admin'
                  ? 'bg-purple-100 text-purple-900 border border-purple-200'
                  : 'bg-amber-100 text-amber-900 border border-amber-200'
              }`}>
                {currentUser.type === 'company'
                  ? `Entreprise B2B (${currentUser.companyName})`
                  : currentUser.type === 'admin'
                  ? 'Super-Admin'
                  : `Membre ${currentUser.tier || 'Club'}`}
              </span>
            </div>

            <p className="text-xs text-slate-500 flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-slate-400" /> {currentUser.email}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-slate-400" /> {currentUser.phone}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end border-t md:border-t-0 pt-4 md:pt-0 border-slate-100">
          <button
            onClick={() => setClientTab('catalog')}
            className="px-4 py-2.5 rounded-full bg-[#795900] text-white hover:bg-[#5c4300] text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Car className="w-3.5 h-3.5" />
            <span>Réserver un véhicule</span>
          </button>
          
          <button
            onClick={logout}
            className="px-4 py-2.5 rounded-full border border-slate-200 text-slate-700 hover:text-rose-600 hover:bg-rose-50 text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Déconnexion</span>
          </button>
        </div>
      </div>

      {/* Main Grid Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Account Specs & Addresses (1 Col) */}
        <div className="space-y-6">
          
          {/* Card 1: Status & Privileges */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#795900]" />
              Avantages & Contrat
            </h3>

            {currentUser.type === 'company' ? (
              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-100 text-xs space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-600">Remise Négociée :</span>
                    <span className="font-bold text-blue-900 bg-blue-100 px-2 py-0.5 rounded-md">
                      -{currentUser.negotiatedDiscountRate || 15}% sur le catalogue
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-600">Ligne de crédit autorisée :</span>
                    <span className="font-bold text-emerald-800">
                      {currentUser.creditLimit ? formatFCFA(currentUser.creditLimit) : '5 000 000 FCFA'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-600">N° RCCM :</span>
                    <span className="font-mono text-slate-800 font-bold">{currentUser.tradeRegister || 'CI-ABJ-XXXX'}</span>
                  </div>
                </div>

                <div className="text-xs text-slate-600 space-y-1">
                  <p><strong className="text-slate-800">Fonction :</strong> {currentUser.companyRole || 'Responsable Logistique'}</p>
                  <p><strong className="text-slate-800">Facturation :</strong> {currentUser.billingAddress || 'Siège Abidjan'}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/60 text-xs space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-700">Points Nyokah Club :</span>
                    <span className="font-bold text-[#795900] text-sm">
                      {currentUser.loyaltyPoints || 500} pts
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-700">Statut du Membre :</span>
                    <span className="font-bold text-amber-900 bg-amber-200/60 px-2 py-0.5 rounded-md">
                      {currentUser.tier || 'Gold VIP'}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-500">
                  Cumulez 10 points par tranche de 10 000 FCFA dépensée et débloquez des surclassements et chauffeurs VIP offerts.
                </p>
              </div>
            )}
          </div>

          {/* Card 2: Saved Favorite Addresses */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#795900]" />
                Adresses Favorites (Abidjan)
              </h3>
            </div>

            <div className="space-y-2">
              {(currentUser.savedAddresses && currentUser.savedAddresses.length > 0) ? (
                currentUser.savedAddresses.map((addr, idx) => (
                  <div 
                    key={idx}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <MapPin className="w-3.5 h-3.5 text-[#795900] shrink-0" />
                      <span className="text-slate-800 font-medium truncate">{addr}</span>
                    </div>
                    <button
                      onClick={() => removeFavoriteAddress(addr)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-all"
                      title="Supprimer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 italic">Aucune adresse favorite enregistrée pour le moment.</p>
              )}
            </div>

            {/* Add Address Form */}
            <form onSubmit={handleAddAddress} className="flex gap-2 pt-2">
              <input
                type="text"
                placeholder="Ex: Sofitel Ivoire, Cocody..."
                value={newAddressInput}
                onChange={(e) => setNewAddressInput(e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#795900]"
              />
              <button
                type="submit"
                className="px-3 py-2 bg-[#0B132B] text-white rounded-xl text-xs font-bold hover:bg-[#1A264F] flex items-center gap-1 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Ajouter</span>
              </button>
            </form>
          </div>

          {/* Card 3 (B2B Only): Authorized Bookers */}
          {currentUser.type === 'company' && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Users className="w-4 h-4 text-[#795900]" />
                Collaborateurs Autorisés (B2B)
              </h3>

              <div className="space-y-2">
                {(currentUser.authorizedBookers || []).map((booker, idx) => (
                  <div 
                    key={idx}
                    className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 flex items-center justify-between"
                  >
                    <span>{booker}</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-md">
                      Autorisé
                    </span>
                  </div>
                ))}
              </div>

              <form onSubmit={handleAddAuthorizedBooker} className="flex gap-2 pt-1">
                <input
                  type="text"
                  placeholder="Nom & Fonction (Ex: Marie K. - Assistante DG)"
                  value={newAuthorizedUser}
                  onChange={(e) => setNewAuthorizedUser(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#795900]"
                />
                <button
                  type="submit"
                  className="px-3 py-2 bg-[#795900] text-white rounded-xl text-xs font-bold hover:bg-[#5c4300] shrink-0"
                >
                  Ajouter
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Right Column: Bookings History & Live Tracking (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* VIP WhatsApp Notification Hub Banner */}
          <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-[#0B132B] rounded-3xl p-6 border border-emerald-500/40 shadow-lg text-white space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center shrink-0 shadow-inner">
                  <svg className="w-6 h-6 fill-emerald-400" viewBox="0 0 24 24">
                    <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.669-.7c.969.54 2.083.824 3.228.824 3.181 0 5.767-2.586 5.768-5.766.001-3.18-2.585-5.767-5.767-5.767zm7.531 5.767c0 4.14-3.37 7.51-7.51 7.51-1.309 0-2.548-.337-3.633-.928l-4.045 1.06 1.079-3.943c-.662-1.127-1.045-2.439-1.045-3.837 0-4.14 3.37-7.51 7.51-7.51 4.14 0 7.51 3.37 7.51 7.51z" />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                      Notifications WhatsApp Conciergerie VIP
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    </h3>
                    <span className="px-2 py-0.5 bg-emerald-500/30 text-emerald-300 text-[10px] font-bold rounded-full border border-emerald-400/30">
                      Actif 24/7
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 max-w-xl">
                    Recevez automatiquement sur votre mobile la validation de vos réservations, la fiche d'identité de votre chauffeur privé et le numéro direct de prise en charge.
                  </p>
                </div>
              </div>

              <button
                onClick={() => openWhatsAppSimulator()}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-emerald-500/30 flex items-center gap-2 shrink-0 transition-all"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Ouvrir WhatsApp ({unreadWhatsAppCount} non lue{unreadWhatsAppCount > 1 ? 's' : ''})</span>
              </button>
            </div>

            {/* Quick overview of latest notification */}
            {whatsAppNotifications.length > 0 && (
              <div className="bg-slate-950/60 rounded-2xl p-3.5 border border-emerald-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                  <span className="text-slate-400 shrink-0">Dernier message :</span>
                  <span className="font-semibold text-emerald-300 truncate">
                    {whatsAppNotifications[0].title}
                  </span>
                  <span className="text-slate-500 truncate hidden md:inline">
                    ({whatsAppNotifications[0].bookingId} • {whatsAppNotifications[0].vehicleName})
                  </span>
                </div>

                <button
                  onClick={() => openWhatsAppSimulator(whatsAppNotifications[0])}
                  className="text-emerald-400 hover:text-emerald-300 font-bold text-xs flex items-center gap-1 shrink-0"
                >
                  <span>Lire le message</span>
                  <CheckCheck className="w-3.5 h-3.5 text-cyan-400" />
                </button>
              </div>
            )}
          </div>
          
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-xl font-bold font-serif text-slate-900">
                  Historique de vos Réservations & Missions
                </h2>
                <p className="text-xs text-slate-500">
                  Consultez vos locations en direct, chauffeurs assignés et notifications WhatsApp associées.
                </p>
              </div>

              <span className="px-3 py-1 bg-slate-100 rounded-full text-xs font-bold text-slate-700">
                {userBookings.length} {userBookings.length > 1 ? 'réservations' : 'réservation'}
              </span>
            </div>

            {userBookings.length > 0 ? (
              <div className="space-y-4">
                {userBookings.map((b) => {
                  const matchingNotif = whatsAppNotifications.find((n) => n.bookingId === b.id);
                  return (
                    <div
                      key={b.id}
                      className="p-5 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-2xl space-y-4 transition-all"
                    >
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-slate-900">
                              {b.id}
                            </span>
                            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              b.status === 'Confirmée'
                                ? 'bg-emerald-100 text-emerald-800'
                                : b.status === 'En attente'
                                ? 'bg-amber-100 text-amber-800'
                                : b.status === 'En cours'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-slate-200 text-slate-700'
                            }`}>
                              {b.status}
                            </span>
                          </div>
                          <h4 className="text-base font-bold text-slate-900 mt-1">
                            {b.vehicleName}
                          </h4>
                        </div>

                        <div className="text-left sm:text-right">
                          <p className="text-base font-extrabold text-[#795900]">
                            {formatFCFA(b.totalAmount)}
                          </p>
                          {b.discountPercentage > 0 && (
                            <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              Remise: -{b.discountPercentage}% appliquée
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600 bg-white p-3.5 rounded-xl border border-slate-100">
                        <div>
                          <p className="text-slate-400 uppercase text-[10px] font-bold">Période & Formule</p>
                          <p className="font-semibold text-slate-800">
                            Du {b.startDate} au {b.endDate} ({b.durationDays}j)
                          </p>
                          <p className="text-slate-500 text-[11px]">{b.formula}</p>
                        </div>

                        <div>
                          <p className="text-slate-400 uppercase text-[10px] font-bold">Prise en charge</p>
                          <p className="font-semibold text-slate-800 truncate">
                            {b.pickupLocation}
                          </p>
                          <p className="text-slate-500 text-[11px]">
                            Destination: {b.dropoffLocation}
                          </p>
                        </div>

                        {b.assignedDriverName && (
                          <div className="sm:col-span-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                            <span className="text-slate-600 flex items-center gap-1.5">
                              <ShieldCheck className="w-4 h-4 text-emerald-600" />
                              <strong>Chauffeur attitré :</strong> {b.assignedDriverName}
                            </span>
                            <span className="text-emerald-700 font-bold text-[11px]">
                              Véhicule briefé
                            </span>
                          </div>
                        )}
                      </div>

                      {/* WhatsApp Simulation Bar for This Booking */}
                      <div className="p-3 bg-emerald-950/20 border border-emerald-500/30 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2 text-emerald-900">
                          <svg className="w-4 h-4 fill-emerald-600 shrink-0" viewBox="0 0 24 24">
                            <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.669-.7c.969.54 2.083.824 3.228.824 3.181 0 5.767-2.586 5.768-5.766.001-3.18-2.585-5.767-5.767-5.767zm7.531 5.767c0 4.14-3.37 7.51-7.51 7.51-1.309 0-2.548-.337-3.633-.928l-4.045 1.06 1.079-3.943c-.662-1.127-1.045-2.439-1.045-3.837 0-4.14 3.37-7.51 7.51-7.51 4.14 0 7.51 3.37 7.51 7.51z" />
                          </svg>
                          <span className="font-semibold text-slate-800">
                            {matchingNotif ? (
                              <span>Statut WhatsApp : <strong className="text-emerald-700">{matchingNotif.title}</strong></span>
                            ) : (
                              <span>Notifications WhatsApp automatiques actives</span>
                            )}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openWhatsAppSimulator(matchingNotif)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-sm transition"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Voir sur WhatsApp</span>
                          </button>

                          {/* Trigger test simulations */}
                          <button
                            onClick={() => simulateBookingValidationNotification(b.id)}
                            title="Simuler la validation par WhatsApp"
                            className="px-2.5 py-1.5 bg-white border border-slate-300 hover:border-emerald-500 text-slate-700 hover:text-emerald-700 rounded-lg text-xs font-semibold transition"
                          >
                            ⚡ Valider
                          </button>
                          <button
                            onClick={() => simulateDriverAssignmentNotification(b.id)}
                            title="Simuler l'affectation de chauffeur par WhatsApp"
                            className="px-2.5 py-1.5 bg-white border border-slate-300 hover:border-blue-500 text-slate-700 hover:text-blue-700 rounded-lg text-xs font-semibold transition"
                          >
                            ⚡ Chauffeur
                          </button>
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-2">
                        <span className="text-[11px] text-slate-400">
                          Créée le {b.createdAt}
                        </span>

                        <button
                          onClick={() => alert(`Téléchargement de la facture proforma pour la réservation ${b.id}...`)}
                          className="text-xs text-[#795900] font-bold hover:underline flex items-center gap-1"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                          <span>Télécharger la Facture / Reçu</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 space-y-3 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <Car className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-sm font-semibold text-slate-700">Aucune réservation pour le moment</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Découvrez notre flotte d'exception à Abidjan et réservez votre berline ou SUV avec chauffeur VIP.
                </p>
                <button
                  onClick={() => setClientTab('catalog')}
                  className="mt-2 px-5 py-2.5 rounded-full bg-[#795900] text-white hover:bg-[#5c4300] text-xs font-bold inline-flex items-center gap-1.5 shadow-sm"
                >
                  <span>Explorer le Catalogue</span>
                </button>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
