import React from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Car, 
  ShieldCheck, 
  Clock, 
  MapPin, 
  Phone, 
  Mail, 
  CreditCard, 
  Building2, 
  Award 
} from 'lucide-react';

export const Footer: React.FC = () => {
  const { setClientTab, setRole } = useApp();

  return (
    <footer className="bg-[#1A1A2E] text-white pt-16 pb-24 md:pb-12 border-t border-[#D4A017]/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-white/10">
          {/* Column 1: Brand & Overview */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-[#D4A017] text-[#1A1A2E] flex items-center justify-center font-bold text-xl shadow-md">
                <Car className="w-5 h-5 text-[#1A1A2E]" />
              </div>
              <span className="text-2xl font-bold font-serif tracking-tight text-white">
                Nyokah
              </span>
            </div>
            <p className="text-slate-300 text-sm leading-relaxed">
              Le standard d'excellence pour la location de véhicules avec chauffeur en Côte d'Ivoire. Dédié aux entreprises, institutions et délégations VIP.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <div className="flex items-center gap-1 text-xs text-[#D4A017] bg-white/5 px-3 py-1.5 rounded-full border border-[#D4A017]/30">
                <Award className="w-3.5 h-3.5" />
                <span>Service B2B & Conciergerie</span>
              </div>
            </div>
          </div>

          {/* Column 2: Our Services */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold uppercase tracking-wider text-[#D4A017] font-serif">
              Nos Prestations
            </h4>
            <ul className="space-y-2 text-sm text-slate-300">
              <li>
                <button 
                  onClick={() => setClientTab('catalog')} 
                  className="hover:text-[#D4A017] transition-colors"
                >
                  Mise à disposition avec chauffeur
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setClientTab('catalog')} 
                  className="hover:text-[#D4A017] transition-colors"
                >
                  Transferts Aéroport Félix-Houphouët-Boigny
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setClientTab('catalog')} 
                  className="hover:text-[#D4A017] transition-colors"
                >
                  Location mensuelle de flotte entreprise
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setClientTab('catalog')} 
                  className="hover:text-[#D4A017] transition-colors"
                >
                  Délégations & Sommets internationaux
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setClientTab('catalog')} 
                  className="hover:text-[#D4A017] transition-colors"
                >
                  Missions vers Yamoussoukro & San Pedro
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Corporate Trust & Guarantees */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold uppercase tracking-wider text-[#D4A017] font-serif">
              Garanties & Engagements
            </h4>
            <div className="space-y-2.5 text-xs text-slate-300">
              <div className="flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-[#D4A017] shrink-0 mt-0.5" />
                <span>Chauffeurs professionnels formés, discrets et bilingues</span>
              </div>
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-[#D4A017] shrink-0 mt-0.5" />
                <span>Ponctualité garantie avec suivi GPS en direct</span>
              </div>
              <div className="flex items-start gap-2">
                <CreditCard className="w-4 h-4 text-[#D4A017] shrink-0 mt-0.5" />
                <span>Facturation transparente en FCFA & TVA légale 18%</span>
              </div>
              <div className="flex items-start gap-2">
                <Building2 className="w-4 h-4 text-[#D4A017] shrink-0 mt-0.5" />
                <span>Accords-cadres avec rabais négociés par société</span>
              </div>
            </div>
          </div>

          {/* Column 4: Contact & Agences Abidjan */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold uppercase tracking-wider text-[#D4A017] font-serif">
              Agences & Contact
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-300">
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-[#D4A017] shrink-0 mt-0.5" />
                <span>Plateau Immeuble CCIA & Zone 4 Marcory, Abidjan</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#D4A017] shrink-0" />
                <span>+225 27 20 21 00 00 / +225 07 08 09 10 11</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#D4A017] shrink-0" />
                <span>contact@nyokah.ci / b2b@nyokah.ci</span>
              </li>
              <li className="pt-2">
                <button
                  onClick={() => setRole('admin')}
                  className="text-xs text-slate-400 hover:text-[#D4A017] underline"
                >
                  Accès réservé : Gestionnaire de Flotte (Admin)
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4">
          <p>© 2026 Nyokah Côte d'Ivoire. Tous droits réservés. RCCM CI-ABJ-2021-B-10928.</p>
          <div className="flex items-center gap-6">
            <span>Conditions Générales de Vente</span>
            <span>Politique de Confidentialité</span>
            <span>Devise : FCFA (XOF)</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
