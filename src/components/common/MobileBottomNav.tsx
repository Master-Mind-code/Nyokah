import React from 'react';
import { useApp } from '../../context/AppContext';
import { Home, Compass, Receipt, User, ShieldCheck } from 'lucide-react';

export const MobileBottomNav: React.FC = () => {
  const { role, clientTab, setClientTab, setRole, bookings, currentUser, openAuthModal } = useApp();

  const pendingCount = bookings.filter((b) => b.status === 'En attente').length;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-[#E2E2E6] shadow-xl px-2 py-2 flex items-center justify-around">
      <button
        onClick={() => {
          if (role === 'admin') setRole('client');
          setClientTab('home');
        }}
        className={`flex flex-col items-center justify-center transition-all ${
          role === 'client' && clientTab === 'home'
            ? 'text-[#795900] font-bold scale-105'
            : 'text-slate-500 hover:text-slate-900'
        }`}
      >
        <div className={`p-1 rounded-full ${role === 'client' && clientTab === 'home' ? 'bg-[#D4A017]/20' : ''}`}>
          <Home className="w-5 h-5" />
        </div>
        <span className="text-[10px] mt-0.5">Accueil</span>
      </button>

      <button
        onClick={() => {
          if (role === 'admin') setRole('client');
          setClientTab('catalog');
        }}
        className={`flex flex-col items-center justify-center transition-all ${
          role === 'client' && clientTab === 'catalog'
            ? 'text-[#795900] font-bold scale-105'
            : 'text-slate-500 hover:text-slate-900'
        }`}
      >
        <div className={`p-1 rounded-full ${role === 'client' && clientTab === 'catalog' ? 'bg-[#D4A017]/20' : ''}`}>
          <Compass className="w-5 h-5" />
        </div>
        <span className="text-[10px] mt-0.5">Catalogue</span>
      </button>

      <button
        onClick={() => {
          if (role === 'admin') setRole('client');
          setClientTab('company-space');
        }}
        className={`flex flex-col items-center justify-center relative transition-all ${
          role === 'client' && clientTab === 'company-space'
            ? 'text-[#795900] font-bold scale-105'
            : 'text-slate-500 hover:text-slate-900'
        }`}
      >
        <div className={`p-1 rounded-full ${role === 'client' && clientTab === 'company-space' ? 'bg-[#D4A017]/20' : ''}`}>
          <Receipt className="w-5 h-5" />
        </div>
        <span className="text-[10px] mt-0.5">Société</span>
      </button>

      <button
        onClick={() => {
          if (role === 'admin') setRole('client');
          if (currentUser) {
            setClientTab('user-profile');
          } else {
            openAuthModal('login');
          }
        }}
        className={`flex flex-col items-center justify-center relative transition-all ${
          role === 'client' && clientTab === 'user-profile'
            ? 'text-[#795900] font-bold scale-105'
            : 'text-slate-500 hover:text-slate-900'
        }`}
      >
        <div className={`p-1 rounded-full ${role === 'client' && clientTab === 'user-profile' ? 'bg-[#D4A017]/20' : ''}`}>
          <User className="w-5 h-5" />
        </div>
        <span className="text-[10px] mt-0.5">{currentUser ? 'Mon Compte' : 'Connexion'}</span>
      </button>

      <button
        onClick={() => {
          setRole(role === 'client' ? 'admin' : 'client');
        }}
        className={`flex flex-col items-center justify-center relative transition-all ${
          role === 'admin'
            ? 'text-[#E94560] font-bold scale-105'
            : 'text-slate-500 hover:text-slate-900'
        }`}
      >
        <div className={`p-1 rounded-full ${role === 'admin' ? 'bg-[#E94560]/20 text-[#E94560]' : ''}`}>
          <ShieldCheck className="w-5 h-5" />
        </div>
        <span className="text-[10px] mt-0.5">Admin</span>
        {pendingCount > 0 && (
          <span className="absolute top-0 right-3 w-4 h-4 bg-[#E94560] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {pendingCount}
          </span>
        )}
      </button>
    </nav>
  );
};
