import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Car, 
  ArrowLeftRight, 
  Building2, 
  User, 
  ShieldCheck, 
  CalendarDays, 
  FileText, 
  Menu, 
  X, 
  Sparkles,
  PhoneCall
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
    resetDemoData
  } = useApp();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showCompanyMenu, setShowCompanyMenu] = useState(false);

  const activeCompany = companies.find((c) => c.id === currentCompanyId);
  const pendingBookingsCount = bookings.filter((b) => b.status === 'En attente').length;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E2E2E6] shadow-xs">
      {/* Top micro bar with corporate context / demo controls */}
      <div className="bg-[#1A1A2E] text-white px-4 py-1.5 text-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-[#D4A017] font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Nyokah CI — Abidjan & Intérieur</span>
            </span>
            <span className="hidden sm:inline-block text-slate-400">•</span>
            <span className="hidden sm:inline-flex items-center gap-1 text-slate-300">
              <PhoneCall className="w-3 h-3 text-[#D4A017]" />
              +225 27 20 21 00 00 / WhatsApp 24/7
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Company Simulator Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowCompanyMenu(!showCompanyMenu)}
                className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-slate-200 text-xs border border-white/15"
                title="Simuler une société connectée avec tarif négocié"
              >
                <Building2 className="w-3 h-3 text-[#D4A017]" />
                <span className="truncate max-w-[130px] sm:max-w-[180px]">
                  {activeCompany ? `${activeCompany.name} (-${activeCompany.negotiatedDiscountRate}%)` : 'Client Invité / Particulier'}
                </span>
                <span className="text-[10px] text-slate-400">▼</span>
              </button>

              {showCompanyMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowCompanyMenu(false)} 
                  />
                  <div className="absolute right-0 mt-1 w-64 bg-white text-[#1A1C1F] rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 text-xs">
                    <div className="px-3 py-1.5 border-b border-slate-100 font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
                      Simuler un compte société (Tarifs négociés)
                    </div>
                    {companies.map((comp) => (
                      <button
                        key={comp.id}
                        onClick={() => {
                          setCurrentCompanyId(comp.id);
                          setShowCompanyMenu(false);
                        }}
                        className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-50 transition-colors ${
                          currentCompanyId === comp.id ? 'bg-[#D4A017]/10 font-bold text-[#795900]' : ''
                        }`}
                      >
                        <div>
                          <div className="font-medium text-slate-900">{comp.name}</div>
                          <div className="text-[11px] text-slate-500">{comp.contactName}</div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-[#D4A017]/20 text-[#795900] font-bold text-[10px]">
                          -{comp.negotiatedDiscountRate}%
                        </span>
                      </button>
                    ))}
                    <button
                      onClick={() => {
                        setCurrentCompanyId(null);
                        setShowCompanyMenu(false);
                      }}
                      className={`w-full text-left px-3 py-2 hover:bg-slate-50 border-t border-slate-100 text-slate-700 ${
                        currentCompanyId === null ? 'bg-slate-100 font-bold' : ''
                      }`}
                    >
                      👤 Client Particulier (Tarif public standard)
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Reset Demo Button */}
            <button
              onClick={resetDemoData}
              className="text-[11px] text-slate-400 hover:text-white underline transition-colors px-1"
              title="Réinitialiser toutes les données"
            >
              Reset Démo
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
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1A1A2E] to-[#2A2A4E] text-[#D4A017] flex items-center justify-center font-bold text-xl shadow-md border border-[#D4A017]/30 group-hover:scale-105 transition-transform">
              <Car className="w-5 h-5 text-[#D4A017]" />
            </div>
            <div>
              <span className="text-2xl font-bold tracking-tight text-[#1A1A2E] font-serif group-hover:text-[#795900] transition-colors">
                Nyokah
              </span>
              <span className="block text-[9px] uppercase tracking-widest text-[#795900] font-semibold -mt-1">
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
                  ? 'bg-[#D4A017] text-[#1A1A2E] font-bold shadow-xs'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Accueil
            </button>
            <button
              onClick={() => setClientTab('catalog')}
              className={`px-3.5 py-2 rounded-full text-sm font-medium transition-colors ${
                clientTab === 'catalog'
                  ? 'bg-[#D4A017] text-[#1A1A2E] font-bold shadow-xs'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Catalogue Flotte
            </button>
            <button
              onClick={() => setClientTab('company-space')}
              className={`px-3.5 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 ${
                clientTab === 'company-space'
                  ? 'bg-[#D4A017] text-[#1A1A2E] font-bold shadow-xs'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Building2 className="w-4 h-4 text-[#795900]" />
              Espace Société
              {activeCompany && (
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              )}
            </button>
          </nav>
        )}

        {/* Right Actions & Role Switcher */}
        <div className="flex items-center gap-3">
          {role === 'client' && (
            <button
              onClick={() => setClientTab('catalog')}
              className="hidden lg:flex items-center gap-2 bg-[#1A1A2E] text-[#D4A017] hover:bg-[#2A2A4E] text-xs font-bold py-2.5 px-4 rounded-full transition-all border border-[#D4A017]/30 shadow-sm"
            >
              <CalendarDays className="w-4 h-4" />
              Réserver un véhicule
            </button>
          )}

          {/* Prominent Role Switcher Button */}
          <button
            onClick={() => setRole(role === 'client' ? 'admin' : 'client')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border shadow-xs ${
              role === 'admin'
                ? 'bg-[#D4A017] text-[#1A1A2E] border-[#B8860B] hover:bg-[#c49212]'
                : 'bg-slate-100 text-[#1A1A2E] border-slate-300 hover:bg-slate-200'
            }`}
            title="Basculer entre la vue Client et le Back-office Administrateur"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>{role === 'client' ? 'Basculer Admin' : 'Vue Client'}</span>
            {role === 'client' && pendingBookingsCount > 0 && (
              <span className="bg-[#E94560] text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {pendingBookingsCount}
              </span>
            )}
          </button>

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
                  <Building2 className="w-4 h-4 text-[#D4A017]" />
                  Espace Entreprise
                </span>
                {activeCompany && (
                  <span className="text-xs bg-[#D4A017]/20 text-[#795900] px-2 py-0.5 rounded-full font-bold">
                    -{activeCompany.negotiatedDiscountRate}%
                  </span>
                )}
              </button>
            </>
          ) : (
            <div className="text-sm text-slate-600 px-2">
              Utilisez la barre latérale pour naviguer dans le back-office admin.
            </div>
          )}

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">Mode actuel :</span>
            <button
              onClick={() => {
                setRole(role === 'client' ? 'admin' : 'client');
                setMobileMenuOpen(false);
              }}
              className="text-xs font-bold text-[#795900] underline"
            >
              Passer en mode {role === 'client' ? 'Admin' : 'Client'}
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
