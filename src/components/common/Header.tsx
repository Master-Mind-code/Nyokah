import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Car, 
  ArrowLeftRight, 
  Building2, 
  User, 
  ShieldCheck, 
  CalendarDays, 
  Menu, 
  X, 
  Sparkles,
  PhoneCall,
  LogOut,
  ChevronDown,
  Award,
  Lock,
  Plus,
  MessageSquare
} from 'lucide-react';

export const Header: React.FC = () => {
  const { 
    role, 
    setRole, 
    clientTab, 
    setClientTab, 
    companies, 
    currentCompanyId, 
    setCurrentCompanyId,
    bookings,
    currentUser,
    logout,
    openAuthModal,
    unreadWhatsAppCount,
    openWhatsAppSimulator,
    refreshAll,
    isSyncing
  } = useApp();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const activeCompany = companies.find((c) => c.id === currentCompanyId);
  const pendingBookingsCount = bookings.filter((b) => b.status === 'En attente').length;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E2E2E6] shadow-xs">
      {/* Top micro bar with corporate context / contact */}
      <div className="bg-[#0B132B] text-white px-4 py-1.5 text-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-[#D4A017] font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Nyokah Mobility — Abidjan & Côte d'Ivoire</span>
            </span>
            <span className="hidden sm:inline-block text-slate-400">•</span>
            <span className="hidden sm:inline-flex items-center gap-1 text-slate-300">
              <PhoneCall className="w-3 h-3 text-[#D4A017]" />
              +225 27 20 21 00 00 / WhatsApp VIP 24/7
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Auth Status Indicator */}
            {currentUser ? (
              <div className="flex items-center gap-2 text-[11px] text-slate-300">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>
                  {currentUser.type === 'company' 
                    ? `Compte B2B : ${currentUser.companyName} (-${currentUser.negotiatedDiscountRate}%)`
                    : currentUser.type === 'admin'
                    ? 'Admin Nyokah'
                    : `Membre : ${currentUser.fullName} (${currentUser.tier || 'Club'})`}
                </span>
              </div>
            ) : (
              <button
                onClick={() => openAuthModal('login')}
                className="text-[11px] text-[#D4A017] hover:underline font-bold flex items-center gap-1"
              >
                <Lock className="w-3 h-3" />
                <span>Espace Particulier & Entreprise</span>
              </button>
            )}

            <span className="text-slate-600">|</span>

            {/* Rechargement des données depuis l'API */}
            <button
              onClick={() => void refreshAll()}
              disabled={isSyncing}
              className="text-[11px] text-slate-400 hover:text-white underline transition-colors px-1 disabled:opacity-50 disabled:cursor-wait"
              title="Recharger les données depuis le serveur"
            >
              {isSyncing ? 'Synchronisation…' : 'Actualiser'}
            </button>
          </div>
        </div>
      </div>

      {/* Main navigation header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              if (role === 'admin') setRole('client');
              setClientTab('home');
            }}
            className="flex items-center gap-2 group text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0B132B] to-[#1C2541] text-[#D4A017] flex items-center justify-center font-bold text-xl shadow-md border border-[#D4A017]/30 group-hover:scale-105 transition-transform">
              <Car className="w-5 h-5 text-[#D4A017]" />
            </div>
            <div>
              <span className="text-2xl font-bold tracking-tight text-[#0B132B] font-serif group-hover:text-[#795900] transition-colors">
                Nyokah
              </span>
              <span className="block text-[9px] uppercase tracking-widest text-[#795900] font-bold -mt-1">
                Mobilité avec chauffeur
              </span>
            </div>
          </button>

          {role === 'admin' && (
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#E94560]/10 text-[#E94560] border border-[#E94560]/20 text-xs font-bold">
              Back-Office Admin
            </span>
          )}
        </div>

        {/* Client Desktop Navigation Links */}
        {role === 'client' && (
          <nav className="hidden md:flex items-center gap-1">
            <button
              onClick={() => setClientTab('home')}
              className={`px-3.5 py-2 rounded-full text-sm font-medium transition-colors ${
                clientTab === 'home'
                  ? 'bg-[#D4A017] text-[#0B132B] font-bold shadow-xs'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Accueil
            </button>
            <button
              onClick={() => setClientTab('catalog')}
              className={`px-3.5 py-2 rounded-full text-sm font-medium transition-colors ${
                clientTab === 'catalog'
                  ? 'bg-[#D4A017] text-[#0B132B] font-bold shadow-xs'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Catalogue Flotte
            </button>
            <button
              onClick={() => setClientTab('company-space')}
              className={`px-3.5 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 ${
                clientTab === 'company-space'
                  ? 'bg-[#D4A017] text-[#0B132B] font-bold shadow-xs'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Building2 className="w-4 h-4 text-[#795900]" />
              Espace Entreprise
              {activeCompany && (
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              )}
            </button>
            
            {currentUser && (
              <button
                onClick={() => setClientTab('user-profile')}
                className={`px-3.5 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  clientTab === 'user-profile'
                    ? 'bg-[#D4A017] text-[#0B132B] font-bold shadow-xs'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <User className="w-4 h-4 text-[#795900]" />
                Mon Espace
              </button>
            )}
          </nav>
        )}

        {/* Right Actions, Auth Menu & Role Switcher */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* WhatsApp Direct Concierge Alert Button */}
          <button
            onClick={() => openWhatsAppSimulator()}
            className="relative p-2 rounded-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 transition shadow-xs flex items-center gap-1.5"
            title="Ouvrir le simulateur de notifications WhatsApp Nyokah"
          >
            <MessageSquare className="w-4 h-4" />
            <span className="hidden lg:inline text-xs font-bold">WhatsApp</span>
            {unreadWhatsAppCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                {unreadWhatsAppCount}
              </span>
            )}
          </button>

          {/* Auth Button or User Menu Dropdown */}
          {currentUser ? (
            <div className="relative">
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-2 py-1.5 px-3 rounded-full border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-white transition-all shadow-xs"
              >
                <img
                  src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'}
                  alt={currentUser.fullName}
                  className="w-6 h-6 rounded-full object-cover border border-[#D4A017]"
                />
                <span className="text-xs font-bold text-slate-800 max-w-[100px] sm:max-w-[140px] truncate hidden sm:inline-block">
                  {currentUser.fullName}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              </button>

              {showUserDropdown && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowUserDropdown(false)} 
                  />
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-150 text-xs">
                    
                    {/* User Info Header */}
                    <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/70 rounded-t-2xl">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'}
                          alt={currentUser.fullName}
                          className="w-10 h-10 rounded-full object-cover border border-[#D4A017]"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-slate-900 truncate">{currentUser.fullName}</p>
                          <p className="text-[11px] text-slate-500 truncate">{currentUser.email}</p>
                          <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                            currentUser.type === 'company'
                              ? 'bg-blue-100 text-blue-900'
                              : 'bg-amber-100 text-amber-900'
                          }`}>
                            {currentUser.type === 'company'
                              ? `${currentUser.companyName} (-${currentUser.negotiatedDiscountRate}%)`
                              : `Membre ${currentUser.tier || 'Club'}`}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Menu links */}
                    <div className="py-1">
                      <button
                        onClick={() => {
                          if (role === 'admin') setRole('client');
                          setClientTab('user-profile');
                          setShowUserDropdown(false);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-700 font-medium flex items-center gap-2"
                      >
                        <User className="w-4 h-4 text-[#795900]" />
                        <span>Mon Profil & Mes Réservations</span>
                      </button>

                      {currentUser.type === 'company' && (
                        <button
                          onClick={() => {
                            if (role === 'admin') setRole('client');
                            setClientTab('company-space');
                            setShowUserDropdown(false);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-700 font-medium flex items-center gap-2"
                        >
                          <Building2 className="w-4 h-4 text-blue-600" />
                          <span>Espace Facturation Entreprise</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          if (role === 'admin') setRole('client');
                          setClientTab('catalog');
                          setShowUserDropdown(false);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-700 font-medium flex items-center gap-2"
                      >
                        <Car className="w-4 h-4 text-emerald-600" />
                        <span>Réserver un véhicule</span>
                      </button>

                      {currentUser.type === 'admin' && (
                        <button
                          onClick={() => {
                            setRole('admin');
                            setShowUserDropdown(false);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-amber-50 text-[#795900] font-bold flex items-center gap-2 border-t border-slate-100 cursor-pointer"
                        >
                          <ShieldCheck className="w-4 h-4 text-[#795900]" />
                          <span>Accéder au Back-Office Nyokah</span>
                        </button>
                      )}
                    </div>

                    {/* Logout */}
                    <div className="border-t border-slate-100 pt-1">
                      <button
                        onClick={() => {
                          logout();
                          setShowUserDropdown(false);
                        }}
                        className="w-full text-left px-4 py-2 text-rose-600 hover:bg-rose-50 font-bold flex items-center gap-2"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Déconnexion</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                id="header-login-btn"
                onClick={() => openAuthModal('login')}
                className="py-1.5 px-3 rounded-full text-xs font-bold text-[#0B132B] hover:bg-slate-100 transition-all border border-slate-200 shadow-xs"
              >
                Connexion
              </button>
              <button
                id="header-register-btn"
                onClick={() => openAuthModal('register-individual')}
                className="py-1.5 px-3 rounded-full text-xs font-bold bg-[#795900] text-white hover:bg-[#5c4300] transition-all shadow-xs hidden sm:inline-flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>S'inscrire</span>
              </button>
            </div>
          )}

          {/* Role Switcher Button: ONLY visible once authenticated as Super-Admin */}
          {currentUser?.type === 'admin' && (
            <button
              onClick={() => setRole(role === 'client' ? 'admin' : 'client')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border shadow-xs cursor-pointer ${
                role === 'admin'
                  ? 'bg-[#D4A017] text-[#0B132B] border-[#B8860B] hover:bg-[#c49212]'
                  : 'bg-slate-100 text-[#0B132B] border-slate-300 hover:bg-slate-200'
              }`}
              title="Basculer entre la vue Client et le Back-office Administrateur"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{role === 'client' ? 'Back-Office Admin' : 'Vue Client'}</span>
              <span className="sm:hidden">{role === 'client' ? 'Admin' : 'Client'}</span>
              {role === 'client' && pendingBookingsCount > 0 && (
                <span className="bg-[#E94560] text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                  {pendingBookingsCount}
                </span>
              )}
            </button>
          )}

          {/* Mobile hamburger button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Ouvrir le menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-2 shadow-lg">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 mb-1">
            Navigation {role === 'client' ? 'Client' : 'Admin'}
          </div>

          {role === 'client' ? (
            <>
              <button
                onClick={() => {
                  setClientTab('home');
                  setMobileMenuOpen(false);
                }}
                className={`w-full text-left px-3 py-2.5 rounded-xl font-medium text-sm flex items-center justify-between ${
                  clientTab === 'home' ? 'bg-[#D4A017]/20 text-[#795900] font-bold' : 'text-slate-800'
                }`}
              >
                <span>Accueil</span>
              </button>
              <button
                onClick={() => {
                  setClientTab('catalog');
                  setMobileMenuOpen(false);
                }}
                className={`w-full text-left px-3 py-2.5 rounded-xl font-medium text-sm flex items-center justify-between ${
                  clientTab === 'catalog' ? 'bg-[#D4A017]/20 text-[#795900] font-bold' : 'text-slate-800'
                }`}
              >
                <span>Catalogue & Véhicules</span>
              </button>
              <button
                onClick={() => {
                  setClientTab('company-space');
                  setMobileMenuOpen(false);
                }}
                className={`w-full text-left px-3 py-2.5 rounded-xl font-medium text-sm flex items-center justify-between ${
                  clientTab === 'company-space' ? 'bg-[#D4A017]/20 text-[#795900] font-bold' : 'text-slate-800'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#795900]" />
                  Espace Entreprise
                </span>
                {activeCompany && (
                  <span className="text-xs bg-[#D4A017]/20 text-[#795900] px-2 py-0.5 rounded-full font-bold">
                    -{activeCompany.negotiatedDiscountRate}%
                  </span>
                )}
              </button>

              <button
                onClick={() => {
                  setClientTab('user-profile');
                  setMobileMenuOpen(false);
                }}
                className={`w-full text-left px-3 py-2.5 rounded-xl font-medium text-sm flex items-center justify-between ${
                  clientTab === 'user-profile' ? 'bg-[#D4A017]/20 text-[#795900] font-bold' : 'text-slate-800'
                }`}
              >
                <span className="flex items-center gap-2">
                  <User className="w-4 h-4 text-[#795900]" />
                  {currentUser ? `Mon Compte (${currentUser.fullName})` : 'Espace Connexion / Inscription'}
                </span>
              </button>
            </>
          ) : (
            <div className="text-sm text-slate-600 px-2">
              Utilisez la barre latérale pour naviguer dans le back-office admin.
            </div>
          )}

          {currentUser?.type === 'admin' && (
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">Mode actuel :</span>
              <button
                onClick={() => {
                  setRole(role === 'client' ? 'admin' : 'client');
                  setMobileMenuOpen(false);
                }}
                className="text-xs font-bold text-[#795900] underline cursor-pointer"
              >
                Passer en mode {role === 'client' ? 'Admin' : 'Client'}
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
