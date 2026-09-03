import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  X, 
  User, 
  Building2, 
  Lock, 
  Mail, 
  Phone, 
  MapPin, 
  Sparkles, 
  CheckCircle2, 
  ShieldCheck, 
  Briefcase, 
  ArrowRight,
  Award,
  CreditCard,
  FileText
} from 'lucide-react';
import { UserAccount } from '../../types';

export const AuthModal: React.FC = () => {
  const { 
    isAuthModalOpen, 
    closeAuthModal, 
    authModalTab, 
    setAuthModalTab, 
    login, 
    loginAsUser, 
    users, 
    registerIndividual, 
    registerCompany 
  } = useApp();

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  // Individual registration form state
  const [indFullName, setIndFullName] = useState('');
  const [indEmail, setIndEmail] = useState('');
  const [indPhone, setIndPhone] = useState('+225 ');
  const [indDistrict, setIndDistrict] = useState('Cocody');
  const [indPassword, setIndPassword] = useState('');

  // Company registration form state
  const [compName, setCompName] = useState('');
  const [compTradeRegister, setCompTradeRegister] = useState('');
  const [compContactName, setCompContactName] = useState('');
  const [compRole, setCompRole] = useState('Responsable Mobilité & Logistique');
  const [compEmail, setCompEmail] = useState('');
  const [compPhone, setCompPhone] = useState('+225 ');
  const [compAddress, setCompAddress] = useState('');
  const [compCreditLine, setCompCreditLine] = useState(true);
  const [compPassword, setCompPassword] = useState('');

  if (!isAuthModalOpen) return null;

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim()) return;
    login(loginEmail, loginPassword);
  };

  const handleIndRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!indFullName.trim() || !indEmail.trim() || !indPhone.trim()) return;
    registerIndividual({
      fullName: indFullName,
      email: indEmail,
      phone: indPhone,
      district: indDistrict,
      city: 'Abidjan',
      password: indPassword
    });
  };

  const handleCompRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!compName.trim() || !compTradeRegister.trim() || !compContactName.trim() || !compEmail.trim()) return;
    registerCompany({
      companyName: compName,
      tradeRegister: compTradeRegister,
      contactName: compContactName,
      companyRole: compRole,
      contactEmail: compEmail,
      contactPhone: compPhone,
      billingAddress: compAddress,
      creditLineRequested: compCreditLine,
      password: compPassword
    });
  };

  const abidjanDistricts = [
    'Cocody (Riviera, Angré, Deux Plateaux, Golf)',
    'Plateau (Centre des affaires)',
    'Marcory (Zone 4, Biétry, VGE)',
    'Treichville',
    'Yopougon',
    'Port-Bouët (Zone Aéroportuaire)',
    'Koumassi',
    'Autre (Grand Abidjan / Bingerville / Bassam)'
  ];

  return (
    <div 
      id="auth-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto"
    >
      <div 
        id="auth-modal-container"
        className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-xl overflow-hidden my-8 relative animate-in zoom-in-95 duration-200"
      >
        {/* Header Bar */}
        <div className="bg-[#0B132B] text-white p-6 sm:p-7 relative">
          <button
            id="auth-modal-close-button"
            onClick={closeAuthModal}
            className="absolute top-5 right-5 p-2 text-slate-300 hover:text-white rounded-full hover:bg-white/10 transition-all"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#D4A017] to-[#F3E5AB] flex items-center justify-center text-[#0B132B] font-bold shadow-md">
              <Sparkles className="w-5 h-5 text-[#0B132B]" />
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-wider text-[#D4A017] font-bold">
                Espace Membre & Entreprise
              </span>
              <h2 className="text-xl sm:text-2xl font-bold font-serif">
                {authModalTab === 'login' && 'Connexion à votre espace'}
                {authModalTab === 'register-individual' && 'Inscription Particulier — Nyokah Club'}
                {authModalTab === 'register-company' && 'Compte Professionnel Entreprise (B2B)'}
              </h2>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="flex bg-white/10 p-1 rounded-2xl mt-5 gap-1 border border-white/10">
            <button
              id="auth-tab-login"
              onClick={() => setAuthModalTab('login')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                authModalTab === 'login'
                  ? 'bg-white text-[#0B132B] shadow-sm'
                  : 'text-slate-200 hover:bg-white/5'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Connexion</span>
            </button>

            <button
              id="auth-tab-individual"
              onClick={() => setAuthModalTab('register-individual')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                authModalTab === 'register-individual'
                  ? 'bg-[#D4A017] text-[#0B132B] shadow-sm font-extrabold'
                  : 'text-slate-200 hover:bg-white/5'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Particulier</span>
            </button>

            <button
              id="auth-tab-company"
              onClick={() => setAuthModalTab('register-company')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                authModalTab === 'register-company'
                  ? 'bg-[#D4A017] text-[#0B132B] shadow-sm font-extrabold'
                  : 'text-slate-200 hover:bg-white/5'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Entreprise B2B</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 max-h-[75vh] overflow-y-auto">
          
          {/* TAB 1: CONNEXION */}
          {authModalTab === 'login' && (
            <div className="space-y-6">
              
              {/* Quick Demo Switcher with prominent Super-Admin entry */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-[#795900]" />
                    Accès Rapides & Profils de Démonstration :
                  </span>
                </div>

                {/* PROMINENT ADMIN ACCESS BUTTON (Méthode 2) */}
                {users.find((u) => u.type === 'admin') && (
                  <button
                    type="button"
                    id="btn-quick-admin-login"
                    onClick={() => {
                      const admin = users.find((u) => u.type === 'admin');
                      if (admin) loginAsUser(admin);
                    }}
                    className="w-full mb-3.5 p-3.5 bg-gradient-to-r from-[#0B132B] via-[#111C3D] to-[#1E293B] border-2 border-[#D4A017] rounded-2xl text-left text-white flex items-center justify-between shadow-lg transition-all hover:shadow-xl hover:border-amber-300 ring-2 ring-[#D4A017]/20 group cursor-pointer"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#D4A017] to-[#F5D061] text-[#0B132B] flex items-center justify-center shrink-0 shadow-md">
                        <ShieldCheck className="w-6 h-6 text-[#0B132B]" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs sm:text-sm font-extrabold text-white group-hover:text-[#D4A017] transition-colors truncate">
                            Direction Nyokah Mobility (Super-Admin)
                          </span>
                          <span className="text-[10px] bg-[#D4A017] text-[#0B132B] font-extrabold px-2 py-0.5 rounded-full shrink-0 shadow-xs">
                            Super-Admin
                          </span>
                        </div>
                        <p className="text-[11px] text-amber-200/90 font-mono truncate mt-0.5">
                          admin@nyokah.ci
                        </p>
                        <p className="text-[11px] text-slate-300 truncate mt-0.5">
                          Un clic pour vous authentifier et basculer sur le Back-Office
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-[#D4A017] hidden sm:flex items-center gap-1 shrink-0 group-hover:translate-x-1 transition-transform pl-2">
                      Accéder au Back-Office →
                    </span>
                  </button>
                )}

                {/* Client & Company test profiles */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {users
                    .filter((u) => u.type !== 'admin' && u.type !== 'driver')
                    .slice(0, 4)
                    .map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => loginAsUser(u)}
                        className="text-left p-2.5 bg-white border border-slate-200 hover:border-[#795900] hover:bg-[#F9F9FD] rounded-xl transition-all flex items-center gap-2.5 shadow-xs group cursor-pointer"
                      >
                        <img
                          src={u.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'}
                          alt={u.fullName}
                          className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-900 truncate group-hover:text-[#795900]">
                            {u.fullName}
                          </p>
                          <p className="text-[10px] text-slate-500 truncate">
                            {u.type === 'company' 
                              ? `${u.companyName} (-${u.negotiatedDiscountRate}%)`
                              : `Particulier (${u.tier})`}
                          </p>
                        </div>
                      </button>
                    ))}
                </div>
              </div>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink mx-3 text-xs text-slate-400 font-medium uppercase tracking-wider">
                  Ou par vos identifiants
                </span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              {/* Login Form */}
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Adresse Email
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setLoginEmail('admin@nyokah.ci');
                        setLoginPassword('admin2026');
                      }}
                      className="text-[11px] text-[#795900] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <ShieldCheck className="w-3 h-3" />
                      Remplir identifiant Admin
                    </button>
                  </div>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      id="login-email-input"
                      type="email"
                      required
                      placeholder="Ex: admin@nyokah.ci ou client@orange.ci"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#795900]/30 focus:border-[#795900]"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Compte administrateur : <span className="font-mono font-semibold text-slate-700">admin@nyokah.ci</span> (mot de passe libre en démo).
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Mot de passe
                    </label>
                    <button
                      type="button"
                      onClick={() => alert('Un lien de réinitialisation temporaire vous a été envoyé par SMS/Email.')}
                      className="text-xs text-[#795900] font-semibold hover:underline"
                    >
                      Mot de passe oublié ?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      id="login-password-input"
                      type="password"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#795900]/30 focus:border-[#795900]"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Mot de passe démo : <span className="font-mono font-medium text-slate-700">admin2026</span> (ou n'importe quelle valeur en mode démonstration).
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    id="remember-me"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 text-[#795900] border-slate-300 rounded focus:ring-[#795900]"
                  />
                  <label htmlFor="remember-me" className="text-xs text-slate-600 cursor-pointer">
                    Rester connecté sur cet appareil
                  </label>
                </div>

                <button
                  id="submit-login-button"
                  type="submit"
                  className="w-full py-3.5 px-6 rounded-2xl bg-[#0B132B] text-white hover:bg-[#1A264F] text-sm font-bold flex items-center justify-center gap-2 shadow-md transition-all mt-2"
                >
                  <span>Accéder à mon espace</span>
                  <ArrowRight className="w-4 h-4 text-[#D4A017]" />
                </button>
              </form>

              <div className="pt-3 border-t border-slate-100 text-center space-y-2">
                <p className="text-xs text-slate-500">
                  Pas encore de compte ?
                </p>
                <div className="flex justify-center gap-4 text-xs font-bold">
                  <button
                    onClick={() => setAuthModalTab('register-individual')}
                    className="text-[#795900] hover:underline"
                  >
                    Créer un compte Particulier
                  </button>
                  <span className="text-slate-300">•</span>
                  <button
                    onClick={() => setAuthModalTab('register-company')}
                    className="text-[#795900] hover:underline"
                  >
                    Créer un compte Entreprise B2B
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: INSCRIPTION PARTICULIER */}
          {authModalTab === 'register-individual' && (
            <form onSubmit={handleIndRegisterSubmit} className="space-y-4">
              {/* Perks Banner */}
              <div className="bg-[#D4A017]/10 border border-[#D4A017]/30 rounded-2xl p-3.5 flex items-center gap-3">
                <Award className="w-7 h-7 text-[#795900] shrink-0" />
                <div className="text-xs text-[#795900]">
                  <p className="font-bold">Bonus de Bienvenue : +500 points Nyokah Club</p>
                  <p className="text-[11px] opacity-90">Cumulez des remises, profitez de réservations express et d'adresses favorites.</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Nom et Prénom <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    placeholder="Ex: Jean-Marc Kouassi"
                    value={indFullName}
                    onChange={(e) => setIndFullName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#795900]/30 focus:border-[#795900]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Email <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="email"
                      required
                      placeholder="jm.kouassi@gmail.com"
                      value={indEmail}
                      onChange={(e) => setIndEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#795900]/30 focus:border-[#795900]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Téléphone / WhatsApp <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="tel"
                      required
                      placeholder="+225 07 12 34 56 78"
                      value={indPhone}
                      onChange={(e) => setIndPhone(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#795900]/30 focus:border-[#795900]"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Commune / Quartier de résidence à Abidjan
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <select
                    value={indDistrict}
                    onChange={(e) => setIndDistrict(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#795900]/30 focus:border-[#795900] cursor-pointer"
                  >
                    {abidjanDistricts.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Définir un mot de passe
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="password"
                    placeholder="Au moins 6 caractères"
                    value={indPassword}
                    onChange={(e) => setIndPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#795900]/30 focus:border-[#795900]"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3.5 px-6 rounded-2xl bg-[#795900] hover:bg-[#5c4300] text-white text-sm font-bold flex items-center justify-center gap-2 shadow-md transition-all"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#F3E5AB]" />
                  <span>Valider mon inscription Particulier</span>
                </button>
              </div>

              <p className="text-[11px] text-center text-slate-500 pt-1">
                En vous inscrivant, vous acceptez les Conditions Générales de Vente et de Confidentialité Nyokah Mobility.
              </p>
            </form>
          )}

          {/* TAB 3: INSCRIPTION ENTREPRISE B2B */}
          {authModalTab === 'register-company' && (
            <form onSubmit={handleCompRegisterSubmit} className="space-y-4">
              {/* B2B Perks Banner */}
              <div className="bg-[#0B132B] text-white rounded-2xl p-4 space-y-2 border border-slate-800">
                <div className="flex items-center gap-2 text-[#D4A017] font-bold text-xs">
                  <Briefcase className="w-4 h-4" />
                  <span>Avantages Entreprise Contractuelle Nyokah B2B</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#D4A017]" />
                    <span>-15% immédiat sur toute la flotte</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#D4A017]" />
                    <span>Facturation fin de mois (30j)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#D4A017]" />
                    <span>Chauffeurs bilingues VIP</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#D4A017]" />
                    <span>Factures Proforma & Suivi DAF</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Raison Sociale / Entreprise <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      required
                      placeholder="Ex: Société Générale CI"
                      value={compName}
                      onChange={(e) => setCompName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#795900]/30 focus:border-[#795900]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    N° RCCM / Registre Commerce <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <FileText className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      required
                      placeholder="CI-ABJ-2024-B-XXXX"
                      value={compTradeRegister}
                      onChange={(e) => setCompTradeRegister(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#795900]/30 focus:border-[#795900]"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Nom du Contact / DAF <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      required
                      placeholder="M. Ouattara Bakary"
                      value={compContactName}
                      onChange={(e) => setCompContactName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#795900]/30 focus:border-[#795900]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Fonction du Contact
                  </label>
                  <input
                    type="text"
                    placeholder="Directeur Financier / DG / Logistique"
                    value={compRole}
                    onChange={(e) => setCompRole(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#795900]/30 focus:border-[#795900]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Email Professionnel <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="email"
                      required
                      placeholder="direction@societe.ci"
                      value={compEmail}
                      onChange={(e) => setCompEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#795900]/30 focus:border-[#795900]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Téléphone Entreprise <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="tel"
                      required
                      placeholder="+225 27 20 XX XX XX"
                      value={compPhone}
                      onChange={(e) => setCompPhone(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#795900]/30 focus:border-[#795900]"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Adresse du Siège Social à Abidjan
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    placeholder="Ex: Immeuble Jeceda, Boulevard de la République, Plateau, Abidjan"
                    value={compAddress}
                    onChange={(e) => setCompAddress(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#795900]/30 focus:border-[#795900]"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <CreditCard className="w-4 h-4 text-[#795900]" />
                  <div>
                    <p className="text-xs font-bold text-slate-900">Demande de Ligne de Crédit Corporate</p>
                    <p className="text-[10px] text-slate-500">Paiement différé à 30 jours sur bon de commande</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={compCreditLine}
                  onChange={(e) => setCompCreditLine(e.target.checked)}
                  className="w-4 h-4 text-[#795900] border-slate-300 rounded focus:ring-[#795900]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Définir un mot de passe d'accès
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="password"
                    placeholder="Au moins 6 caractères"
                    value={compPassword}
                    onChange={(e) => setCompPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#795900]/30 focus:border-[#795900]"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3.5 px-6 rounded-2xl bg-[#0B132B] hover:bg-[#1A264F] text-white text-sm font-bold flex items-center justify-center gap-2 shadow-md transition-all"
                >
                  <ShieldCheck className="w-4 h-4 text-[#D4A017]" />
                  <span>Activer notre Compte Entreprise B2B</span>
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};
