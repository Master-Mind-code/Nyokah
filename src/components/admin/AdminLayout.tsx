import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { AdminTab } from '../../context/AppContext';
import { 
  LayoutDashboard, 
  Car, 
  CalendarDays, 
  Package, 
  Percent, 
  Building2, 
  UserCheck, 
  Navigation, 
  ArrowLeftRight, 
  Menu, 
  X,
  Sparkles,
  ShieldCheck,
  LogOut
} from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const { 
    adminTab, 
    setAdminTab, 
    role, 
    setRole, 
    bookings, 
    vehicles, 
    drivers,
    rides,
    logout
  } = useApp();

  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const pendingBookingsCount = bookings.filter((b) => b.status === 'En attente').length;
  const activeRidesCount = rides.filter((r) => r.status === 'En cours' || r.status === 'En route').length;

  const navItems: { id: AdminTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'dashboard', label: 'Tableau de bord', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'reservations', label: 'Réservations', icon: <CalendarDays className="w-4 h-4" />, badge: pendingBookingsCount },
    { id: 'fleet', label: 'Flotte Automobile', icon: <Car className="w-4 h-4" /> },
    { id: 'pricing-discounts', label: 'Tarifs & Rabais B2B', icon: <Percent className="w-4 h-4" /> },
    { id: 'packs', label: 'Packs Auto', icon: <Package className="w-4 h-4" /> },
    { id: 'companies', label: 'Clients Sociétés', icon: <Building2 className="w-4 h-4" /> },
    { id: 'drivers-partners', label: 'Chauffeurs & Partenaires', icon: <UserCheck className="w-4 h-4" /> },
    { id: 'rides', label: 'Courses du Jour', icon: <Navigation className="w-4 h-4" />, badge: activeRidesCount }
  ];

  return (
    <div className="min-h-screen bg-[#F9F9FD] flex flex-col md:flex-row">
      
      {/* Desktop Fixed Sidebar (NavigationDrawer matching Image 5 & Image 7) */}
      <aside className="hidden md:flex flex-col w-64 bg-[#EDEDF1] border-r border-[#D3C5AE]/60 fixed left-0 top-0 bottom-0 z-40 p-6 overflow-y-auto">
        {/* Brand */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#1A1A2E] text-[#D4A017] flex items-center justify-center font-bold font-serif text-base">
              N
            </div>
            <div>
              <h1 className="text-xl font-bold font-serif text-[#795900] tracking-tight">
                Nyokah
              </h1>
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 block -mt-1">
                Back-Office
              </span>
            </div>
          </div>
        </div>

        {/* Admin Profile Card */}
        <div className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-slate-200/80 shadow-xs mb-6">
          <div className="w-10 h-10 rounded-full bg-[#1A1A2E] text-[#D4A017] flex items-center justify-center font-bold text-sm shrink-0">
            AD
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-bold text-slate-900 truncate">Nyokah Admin</p>
            <p className="text-[11px] text-slate-500 truncate">Fleet Manager Abidjan</p>
            <p className="text-[10px] text-[#795900] font-bold">Flotte & Tarification</p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            const isActive = adminTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setAdminTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-full text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-[#D4A017] text-[#1A1A2E] shadow-sm translate-x-1'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  {item.icon}
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    isActive ? 'bg-[#1A1A2E] text-white' : 'bg-[#E94560] text-white'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom Switch Role & Logout */}
        <div className="pt-4 border-t border-slate-300 mt-auto space-y-2">
          <button
            onClick={() => setRole('client')}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-[#817662] text-[#795900] hover:bg-white text-xs font-bold rounded-full transition-colors bg-transparent shadow-xs cursor-pointer"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>Basculer Vue Client</span>
          </button>
          <button
            onClick={() => logout()}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 text-rose-700 hover:bg-rose-50 text-xs font-bold rounded-full transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Déconnexion Admin</span>
          </button>
        </div>
      </aside>

      {/* Mobile Top AppBar for Admin */}
      <header className="md:hidden flex justify-between items-center px-4 h-16 bg-white border-b border-slate-200 shadow-xs sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
            className="p-2 text-slate-700 hover:bg-slate-100 rounded-lg"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-xl font-bold font-serif text-[#795900]">
            Nyokah Admin
          </span>
        </div>

        <button
          onClick={() => setRole('client')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#817662] text-[#795900] text-xs font-bold"
        >
          <ArrowLeftRight className="w-3.5 h-3.5" />
          <span>Client</span>
        </button>
      </header>

      {/* Mobile Drawer */}
      {mobileDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-xs" 
            onClick={() => setMobileDrawerOpen(false)} 
          />
          <div className="relative w-72 bg-[#EDEDF1] p-6 flex flex-col h-full z-10 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-serif font-bold text-lg text-[#795900]">Nyokah Admin</h2>
              <button 
                onClick={() => setMobileDrawerOpen(false)}
                className="p-1.5 text-slate-500 hover:text-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="space-y-1.5 flex-1 overflow-y-auto">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setAdminTab(item.id);
                    setMobileDrawerOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-full text-xs font-bold ${
                    adminTab === item.id
                      ? 'bg-[#D4A017] text-[#1A1A2E]'
                      : 'text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="bg-[#E94560] text-white px-2 py-0.5 rounded-full text-[10px]">
                      {item.badge}
                    </span>
                  )}
                </button>
              ))}
            </nav>

            <div className="mt-4 space-y-2">
              <button
                onClick={() => {
                  setRole('client');
                  setMobileDrawerOpen(false);
                }}
                className="w-full py-2 border border-[#817662] text-[#795900] text-xs font-bold rounded-full bg-white cursor-pointer"
              >
                Basculer en mode Client
              </button>
              <button
                onClick={() => {
                  logout();
                  setMobileDrawerOpen(false);
                }}
                className="w-full py-2 text-rose-700 hover:bg-rose-50 text-xs font-bold rounded-full cursor-pointer"
              >
                Déconnexion Admin
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Admin Canvas (Offset for fixed desktop sidebar) */}
      <main className="flex-1 md:ml-64 p-4 sm:p-6 lg:p-8 max-w-7xl">
        {children}
      </main>

    </div>
  );
};
