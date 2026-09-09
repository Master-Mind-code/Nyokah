import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  Building2,
  Check,
  FileClock,
  Loader2,
  Plus,
  RotateCcw,
  Server,
  ShieldCheck,
  SlidersHorizontal,
  Tag,
  Trash2,
  Users,
  Wallet
} from 'lucide-react';
import { useApp, formatFCFA } from '../../context/AppContext';
import { ApiError } from '../../api/client';
import {
  adminUsersApi,
  auditApi,
  invoicesApi,
  settingsApi,
  type AuditEntry,
  type GeneralConfig,
  type PricingConfig,
  type SettingsBundle
} from '../../api/endpoints';
import type { UserAccount } from '../../types';

type SettingsSection = 'general' | 'pricing' | 'promos' | 'users' | 'system' | 'audit';

const SECTIONS: { id: SettingsSection; label: string; icon: React.ReactNode }[] = [
  { id: 'general', label: 'Général & Règles', icon: <SlidersHorizontal className="w-4 h-4" /> },
  { id: 'pricing', label: 'Grille tarifaire', icon: <Wallet className="w-4 h-4" /> },
  { id: 'promos', label: 'Codes promo', icon: <Tag className="w-4 h-4" /> },
  { id: 'users', label: 'Comptes & accès', icon: <Users className="w-4 h-4" /> },
  { id: 'system', label: 'Système', icon: <Server className="w-4 h-4" /> },
  { id: 'audit', label: "Journal d'audit", icon: <FileClock className="w-4 h-4" /> }
];

/** Champ de saisie compact, réutilisé par tous les formulaires de la page. */
const Field: React.FC<{
  label: string;
  hint?: string;
  suffix?: string;
  children: React.ReactNode;
}> = ({ label, hint, suffix, children }) => (
  <label className="block space-y-1.5">
    <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
      {label}
    </span>
    <div className="flex items-center gap-2">
      {children}
      {suffix && <span className="text-xs font-semibold text-slate-500 shrink-0">{suffix}</span>}
    </div>
    {hint && <span className="block text-[11px] text-slate-500 leading-snug">{hint}</span>}
  </label>
);

const inputClass =
  'w-full bg-white px-3 py-2 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#795900] focus:border-[#795900]';

const Card: React.FC<{ title: string; description?: string; children: React.ReactNode }> = ({
  title,
  description,
  children
}) => (
  <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 sm:p-8 space-y-6">
    <div>
      <h2 className="text-lg font-bold font-serif text-slate-900">{title}</h2>
      {description && <p className="text-xs text-slate-500 mt-1 max-w-3xl">{description}</p>}
    </div>
    {children}
  </div>
);

export const AdminSettings: React.FC = () => {
  const {
    promoRules,
    companies,
    addPromoRule,
    togglePromoRule,
    deletePromoRule,
    refreshPromoRules,
    showToast
  } = useApp();

  const [section, setSection] = useState<SettingsSection>('general');
  const [bundle, setBundle] = useState<SettingsBundle | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Brouillons locaux : les formulaires n'écrivent qu'à la validation explicite.
  const [general, setGeneral] = useState<GeneralConfig | null>(null);
  const [pricing, setPricing] = useState<PricingConfig | null>(null);

  const [users, setUsers] = useState<UserAccount[]>([]);
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);

  const loadSettings = useCallback(async () => {
    try {
      const data = await settingsApi.getAll();
      setBundle(data);
      setGeneral(data.general);
      setPricing(data.pricing);
      setLoadError(null);
    } catch (error) {
      setLoadError(
        error instanceof ApiError ? error.message : 'Impossible de charger les paramètres.'
      );
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  // Les listes lourdes ne sont chargées qu'à l'ouverture de leur section.
  useEffect(() => {
    if (section === 'users' && users.length === 0) {
      void adminUsersApi.list().then(setUsers).catch(() => undefined);
    }
    if (section === 'audit' && auditEntries.length === 0) {
      void auditApi.list(80).then(setAuditEntries).catch(() => undefined);
    }
    if (section === 'promos') {
      void refreshPromoRules();
    }
  }, [section, users.length, auditEntries.length, refreshPromoRules]);

  const run = async (action: () => Promise<void>, success: string, failure: string) => {
    setIsSaving(true);
    try {
      await action();
      showToast(success, 'success');
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : failure, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (loadError) {
    return (
      <div className="bg-white rounded-3xl border border-red-200 p-8 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-[#E94560] shrink-0 mt-0.5" />
        <div className="space-y-3">
          <p className="text-sm text-slate-700">{loadError}</p>
          <button
            onClick={() => void loadSettings()}
            className="px-4 py-2 bg-[#795900] text-white rounded-xl text-xs font-bold hover:bg-[#5c4300]"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  if (!bundle || !general || !pricing) {
    return (
      <div className="flex items-center gap-3 text-sm text-slate-500 p-8">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Chargement des paramètres…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* En-tête */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D4A017]/20 text-[#795900] text-xs font-bold mb-2">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Configuration de la plateforme</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold font-serif text-slate-900">Paramètres</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-3xl">
          Tout ce qui pilote le comportement de Nyokah sans passer par un déploiement : règles
          commerciales, grille tarifaire, codes promo, accès et traçabilité.
        </p>
      </div>

      {/* Sélecteur de section */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto">
        {SECTIONS.map((item) => (
          <button
            key={item.id}
            onClick={() => setSection(item.id)}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
              section === item.id
                ? 'bg-[#795900] text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* GÉNÉRAL                                                             */}
      {/* ------------------------------------------------------------------ */}
      {section === 'general' && (
        <div className="space-y-6">
          <Card
            title="Identité & conciergerie"
            description="Ces coordonnées apparaissent en pied de tous les messages WhatsApp et e-mails envoyés aux clients."
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <Field label="Raison sociale">
                <input
                  className={inputClass}
                  value={general.companyName}
                  onChange={(e) => setGeneral({ ...general, companyName: e.target.value })}
                />
              </Field>
              <Field label="Téléphone conciergerie">
                <input
                  className={inputClass}
                  value={general.supportPhone}
                  onChange={(e) => setGeneral({ ...general, supportPhone: e.target.value })}
                />
              </Field>
              <Field label="E-mail conciergerie">
                <input
                  type="email"
                  className={inputClass}
                  value={general.supportEmail}
                  onChange={(e) => setGeneral({ ...general, supportEmail: e.target.value })}
                />
              </Field>
            </div>
          </Card>

          <Card
            title="Règles de réservation"
            description="Appliquées à chaque demande client. Les administrateurs ne sont pas soumis à ces contraintes depuis le back-office."
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <Field
                label="Délai de prévenance"
                suffix="h"
                hint="Temps minimum entre la demande et la prise en charge. 0 pour désactiver."
              >
                <input
                  type="number"
                  min={0}
                  max={720}
                  className={inputClass}
                  value={general.bookingLeadTimeHours}
                  onChange={(e) =>
                    setGeneral({ ...general, bookingLeadTimeHours: Number(e.target.value) })
                  }
                />
              </Field>
              <Field
                label="Préavis d'annulation"
                suffix="h"
                hint="Passé ce délai, l'annulation en ligne est bloquée et doit passer par la conciergerie."
              >
                <input
                  type="number"
                  min={0}
                  max={720}
                  className={inputClass}
                  value={general.cancellationNoticeHours}
                  onChange={(e) =>
                    setGeneral({ ...general, cancellationNoticeHours: Number(e.target.value) })
                  }
                />
              </Field>
              <Field
                label="Échéance de facturation"
                suffix="jours"
                hint="Utilisée quand la fiche société ne fixe pas son propre délai de règlement."
              >
                <input
                  type="number"
                  min={0}
                  max={180}
                  className={inputClass}
                  value={general.invoiceDueDays}
                  onChange={(e) =>
                    setGeneral({ ...general, invoiceDueDays: Number(e.target.value) })
                  }
                />
              </Field>
            </div>
          </Card>

          <Card
            title="Programme de fidélité"
            description="Seuils de passage des paliers, recalculés à chaque mission terminée."
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-2xl">
              <Field label="Palier Silver" suffix="pts">
                <input
                  type="number"
                  min={0}
                  className={inputClass}
                  value={general.loyaltyTiers.silver}
                  onChange={(e) =>
                    setGeneral({
                      ...general,
                      loyaltyTiers: { ...general.loyaltyTiers, silver: Number(e.target.value) }
                    })
                  }
                />
              </Field>
              <Field label="Palier Gold VIP" suffix="pts">
                <input
                  type="number"
                  min={0}
                  className={inputClass}
                  value={general.loyaltyTiers.gold}
                  onChange={(e) =>
                    setGeneral({
                      ...general,
                      loyaltyTiers: { ...general.loyaltyTiers, gold: Number(e.target.value) }
                    })
                  }
                />
              </Field>
            </div>

            {general.loyaltyTiers.gold <= general.loyaltyTiers.silver && (
              <p className="text-xs text-[#E94560] flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                Le seuil Gold VIP doit être supérieur au seuil Silver.
              </p>
            )}
          </Card>

          <div className="flex flex-wrap items-center gap-3">
            <button
              disabled={isSaving || general.loyaltyTiers.gold <= general.loyaltyTiers.silver}
              onClick={() =>
                void run(
                  async () => {
                    const saved = await settingsApi.updateGeneral(general);
                    setGeneral(saved);
                    setBundle({ ...bundle, general: saved });
                  },
                  'Paramètres généraux enregistrés.',
                  "L'enregistrement a échoué."
                )
              }
              className="px-6 py-3 bg-[#795900] text-white rounded-xl text-sm font-bold hover:bg-[#5c4300] transition-colors flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Check className="w-4 h-4" />
              <span>{isSaving ? 'Enregistrement…' : 'Enregistrer'}</span>
            </button>

            <button
              disabled={isSaving}
              onClick={() =>
                void run(
                  async () => {
                    const saved = await settingsApi.resetGeneral();
                    setGeneral(saved);
                    setBundle({ ...bundle, general: saved });
                  },
                  'Paramètres généraux réinitialisés.',
                  'La réinitialisation a échoué.'
                )
              }
              className="px-5 py-3 bg-white border border-slate-300 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors flex items-center gap-2 disabled:opacity-60"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Rétablir les valeurs par défaut</span>
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* TARIFICATION                                                        */}
      {/* ------------------------------------------------------------------ */}
      {section === 'pricing' && (
        <div className="space-y-6">
          <Card
            title="Taxe & fidélité"
            description="La TVA est appliquée après remise sur chaque devis et chaque facture."
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-2xl">
              <Field label="Taux de TVA" suffix="%">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  className={inputClass}
                  value={Math.round(pricing.vatRate * 1000) / 10}
                  onChange={(e) =>
                    setPricing({ ...pricing, vatRate: Number(e.target.value) / 100 })
                  }
                />
              </Field>
              <Field
                label="Points de fidélité"
                suffix="pts / 1 000 FCFA"
                hint="Points crédités au client à la clôture de chaque mission."
              >
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  className={inputClass}
                  value={pricing.loyaltyPointsPer1000}
                  onChange={(e) =>
                    setPricing({ ...pricing, loyaltyPointsPer1000: Number(e.target.value) })
                  }
                />
              </Field>
            </div>
          </Card>

          <Card
            title="Remises volume par durée"
            description="Appliquées automatiquement selon la durée de location. La remise la plus avantageuse pour le client l'emporte : remise société, code promo et remise volume ne se cumulent pas."
          >
            <div className="space-y-3">
              {pricing.volumeDiscountTiers.length === 0 && (
                <p className="text-xs text-slate-500">
                  Aucun palier : les remises volume sont désactivées.
                </p>
              )}

              {pricing.volumeDiscountTiers.map((tier, index) => (
                <div
                  key={index}
                  className="flex flex-wrap items-end gap-3 bg-[#F9F9FD] p-3 rounded-2xl border border-slate-200"
                >
                  <div className="w-32">
                    <Field label="À partir de" suffix="j">
                      <input
                        type="number"
                        min={1}
                        className={inputClass}
                        value={tier.minDays}
                        onChange={(e) => {
                          const tiers = [...pricing.volumeDiscountTiers];
                          tiers[index] = { ...tier, minDays: Number(e.target.value) };
                          setPricing({ ...pricing, volumeDiscountTiers: tiers });
                        }}
                      />
                    </Field>
                  </div>

                  <div className="w-32">
                    <Field label="Remise" suffix="%">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        className={inputClass}
                        value={tier.percentage}
                        onChange={(e) => {
                          const tiers = [...pricing.volumeDiscountTiers];
                          tiers[index] = { ...tier, percentage: Number(e.target.value) };
                          setPricing({ ...pricing, volumeDiscountTiers: tiers });
                        }}
                      />
                    </Field>
                  </div>

                  <button
                    onClick={() =>
                      setPricing({
                        ...pricing,
                        volumeDiscountTiers: pricing.volumeDiscountTiers.filter(
                          (_, i) => i !== index
                        )
                      })
                    }
                    className="p-2.5 rounded-xl text-slate-500 hover:text-[#E94560] hover:bg-red-50 transition-colors"
                    title="Supprimer ce palier"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              <button
                onClick={() =>
                  setPricing({
                    ...pricing,
                    volumeDiscountTiers: [
                      ...pricing.volumeDiscountTiers,
                      { minDays: 1, percentage: 0 }
                    ]
                  })
                }
                className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Ajouter un palier</span>
              </button>
            </div>
          </Card>

          <Card
            title="Coefficients par formule"
            description="Multiplicateurs appliqués au tarif journalier du véhicule. La demi-journée et le transfert aéroport utilisent les tarifs propres à chaque véhicule."
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <Field
                label="Mise à disposition 24 h"
                suffix="×"
                hint="1,5 = tarif journalier majoré de 50 %."
              >
                <input
                  type="number"
                  min={0.1}
                  step={0.05}
                  className={inputClass}
                  value={pricing.continuous24hMultiplier}
                  onChange={(e) =>
                    setPricing({ ...pricing, continuous24hMultiplier: Number(e.target.value) })
                  }
                />
              </Field>
              <Field label="Formule mensuelle" suffix="×" hint="0,75 = remise de 25 %.">
                <input
                  type="number"
                  min={0.1}
                  step={0.05}
                  className={inputClass}
                  value={pricing.monthlyRateMultiplier}
                  onChange={(e) =>
                    setPricing({ ...pricing, monthlyRateMultiplier: Number(e.target.value) })
                  }
                />
              </Field>
              <Field label="Forfait week-end" suffix="×" hint="0,9 = remise de 10 %.">
                <input
                  type="number"
                  min={0.1}
                  step={0.05}
                  className={inputClass}
                  value={pricing.weekendRateMultiplier}
                  onChange={(e) =>
                    setPricing({ ...pricing, weekendRateMultiplier: Number(e.target.value) })
                  }
                />
              </Field>
            </div>
          </Card>

          <Card
            title="Option carburant"
            description="Coût journalier facturé lorsque le client inclut le carburant."
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-2xl">
              <Field label="Tarif standard" suffix="FCFA / jour">
                <input
                  type="number"
                  min={0}
                  step={1000}
                  className={inputClass}
                  value={pricing.fuelOptionDailyCost.default}
                  onChange={(e) =>
                    setPricing({
                      ...pricing,
                      fuelOptionDailyCost: {
                        ...pricing.fuelOptionDailyCost,
                        default: Number(e.target.value)
                      }
                    })
                  }
                />
              </Field>
              <Field label="Véhicules VIP Prestige" suffix="FCFA / jour">
                <input
                  type="number"
                  min={0}
                  step={1000}
                  className={inputClass}
                  value={pricing.fuelOptionDailyCost.VIP_PRESTIGE}
                  onChange={(e) =>
                    setPricing({
                      ...pricing,
                      fuelOptionDailyCost: {
                        ...pricing.fuelOptionDailyCost,
                        VIP_PRESTIGE: Number(e.target.value)
                      }
                    })
                  }
                />
              </Field>
            </div>

            <div className="text-xs text-slate-500 bg-[#F9F9FD] p-3 rounded-xl border border-slate-200">
              Exemple : 3 jours en VIP Prestige avec carburant ={' '}
              <strong className="text-slate-800">
                {formatFCFA(pricing.fuelOptionDailyCost.VIP_PRESTIGE * 3)}
              </strong>{' '}
              d'option, avant remise et TVA.
            </div>
          </Card>

          <div className="flex flex-wrap items-center gap-3">
            <button
              disabled={isSaving}
              onClick={() =>
                void run(
                  async () => {
                    const saved = await settingsApi.updatePricing(pricing);
                    setPricing(saved);
                    setBundle({ ...bundle, pricing: saved });
                  },
                  'Grille tarifaire enregistrée. Les prochains devis l’appliquent.',
                  "L'enregistrement a échoué."
                )
              }
              className="px-6 py-3 bg-[#795900] text-white rounded-xl text-sm font-bold hover:bg-[#5c4300] transition-colors flex items-center gap-2 disabled:opacity-60"
            >
              <Check className="w-4 h-4" />
              <span>{isSaving ? 'Enregistrement…' : 'Enregistrer'}</span>
            </button>

            <button
              disabled={isSaving}
              onClick={() =>
                void run(
                  async () => {
                    const saved = await settingsApi.resetPricing();
                    setPricing(saved);
                    setBundle({ ...bundle, pricing: saved });
                  },
                  'Grille tarifaire réinitialisée.',
                  'La réinitialisation a échoué.'
                )
              }
              className="px-5 py-3 bg-white border border-slate-300 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors flex items-center gap-2 disabled:opacity-60"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Rétablir les valeurs par défaut</span>
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* CODES PROMO                                                         */}
      {/* ------------------------------------------------------------------ */}
      {section === 'promos' && (
        <PromoSection
          promoRules={promoRules}
          companies={companies}
          onCreate={addPromoRule}
          onToggle={togglePromoRule}
          onDelete={deletePromoRule}
        />
      )}

      {/* ------------------------------------------------------------------ */}
      {/* COMPTES                                                             */}
      {/* ------------------------------------------------------------------ */}
      {section === 'users' && (
        <UsersSection
          users={users}
          onChanged={async () => setUsers(await adminUsersApi.list())}
          notify={showToast}
        />
      )}

      {/* ------------------------------------------------------------------ */}
      {/* SYSTÈME                                                             */}
      {/* ------------------------------------------------------------------ */}
      {section === 'system' && (
        <div className="space-y-6">
          <Card
            title="Environnement d'exécution"
            description="Ces valeurs proviennent des variables d'environnement du serveur : elles se modifient dans le fichier .env de l'API, pas depuis cette interface."
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { label: 'Environnement', value: bundle.system.environment },
                { label: 'Devise', value: bundle.system.currency },
                { label: 'URL de l’API', value: bundle.system.apiUrl },
                { label: 'Prestataire de paiement', value: bundle.system.paymentProvider },
                { label: 'Fournisseur de notifications', value: bundle.system.notificationProvider },
                { label: 'Fournisseur d’e-mails', value: bundle.system.emailProvider },
                { label: 'Durée du jeton d’accès', value: bundle.system.accessTokenTtl },
                {
                  label: 'Durée du refresh token',
                  value: `${bundle.system.refreshTokenTtlDays} jours`
                },
                { label: 'Origines CORS', value: bundle.system.corsOrigins.join(', ') || '—' }
              ].map((item) => (
                <div
                  key={item.label}
                  className="bg-[#F9F9FD] rounded-2xl p-4 border border-slate-200 space-y-1"
                >
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    {item.label}
                  </div>
                  <div className="text-sm font-semibold text-slate-900 font-mono break-all">
                    {item.value}
                  </div>
                </div>
              ))}
            </div>

            {bundle.system.paymentProvider === 'mock' && (
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Le prestataire de paiement est le simulateur : aucun encaissement réel n'est
                  effectué. Renseignez <code className="font-mono">PAYMENT_PROVIDER=cinetpay</code> et
                  vos clés marchand pour passer en production.
                </span>
              </p>
            )}
          </Card>

          <Card
            title="Tâches de maintenance"
            description="Opérations à déclencher manuellement ou via une tâche planifiée quotidienne."
          >
            <button
              disabled={isSaving}
              onClick={() =>
                void run(
                  async () => {
                    const result = await invoicesApi.refreshOverdue();
                    showToast(
                      `${result.updated} facture(s) basculée(s) en retard.`,
                      result.updated > 0 ? 'warning' : 'info'
                    );
                  },
                  'Contrôle des échéances terminé.',
                  'Le contrôle des échéances a échoué.'
                )
              }
              className="px-5 py-3 bg-white border border-slate-300 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors flex items-center gap-2 disabled:opacity-60"
            >
              <FileClock className="w-4 h-4 text-[#795900]" />
              <span>Recalculer les factures en retard</span>
            </button>
          </Card>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* AUDIT                                                               */}
      {/* ------------------------------------------------------------------ */}
      {section === 'audit' && (
        <Card
          title="Journal d'audit"
          description="Trace des actions sensibles : créations, modifications de statut, changements tarifaires et accès. Les mots de passe et jetons n'y sont jamais enregistrés."
        >
          {auditEntries.length === 0 ? (
            <p className="text-sm text-slate-500">Aucune entrée pour le moment.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F9F9FD] border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Auteur</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Objet</th>
                    <th className="py-3 px-4">Adresse IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {auditEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4 text-slate-600 whitespace-nowrap">
                        {new Date(entry.createdAt).toLocaleString('fr-FR')}
                      </td>
                      <td className="py-2.5 px-4 text-slate-800">{entry.actorEmail ?? 'Système'}</td>
                      <td className="py-2.5 px-4">
                        <span className="px-2 py-0.5 rounded-lg bg-slate-100 font-mono text-[11px] font-semibold text-slate-800">
                          {entry.action}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-600">{entry.entity}</td>
                      <td className="py-2.5 px-4 text-slate-400 font-mono">{entry.ip ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Codes promo
// ---------------------------------------------------------------------------

const PromoSection: React.FC<{
  promoRules: ReturnType<typeof useApp>['promoRules'];
  companies: ReturnType<typeof useApp>['companies'];
  onCreate: ReturnType<typeof useApp>['addPromoRule'];
  onToggle: ReturnType<typeof useApp>['togglePromoRule'];
  onDelete: ReturnType<typeof useApp>['deletePromoRule'];
}> = ({ promoRules, companies, onCreate, onToggle, onDelete }) => {
  const nextYearEnd = `${new Date().getFullYear() + 1}-12-31`;

  const [form, setForm] = useState({
    code: '',
    description: '',
    discountPercentage: 10,
    applicableToCompanyId: '',
    minDays: '',
    expiresAt: nextYearEnd
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code.trim() || !form.description.trim()) return;

    await onCreate({
      code: form.code.trim().toUpperCase(),
      description: form.description.trim(),
      discountPercentage: form.discountPercentage,
      applicableToCompanyId: form.applicableToCompanyId || null,
      minDays: form.minDays ? Number(form.minDays) : null,
      expiresAt: form.expiresAt,
      active: true
    });

    setForm({
      code: '',
      description: '',
      discountPercentage: 10,
      applicableToCompanyId: '',
      minDays: '',
      expiresAt: nextYearEnd
    });
  };

  return (
    <div className="space-y-6">
      <Card
        title="Créer une règle tarifaire"
        description="Un code rattaché à une entreprise n'est utilisable que par les comptes de cette société."
      >
        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Field label="Code">
            <input
              required
              className={`${inputClass} uppercase font-mono`}
              placeholder="SALON2026"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
            />
          </Field>

          <div className="md:col-span-2">
            <Field label="Description">
              <input
                required
                className={inputClass}
                placeholder="Offre salon Africa CEO Forum"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </Field>
          </div>

          <Field label="Remise" suffix="%">
            <input
              type="number"
              min={0}
              max={100}
              className={inputClass}
              value={form.discountPercentage}
              onChange={(e) => setForm({ ...form, discountPercentage: Number(e.target.value) })}
            />
          </Field>

          <Field label="Durée minimale" suffix="j" hint="Laisser vide pour aucune condition.">
            <input
              type="number"
              min={1}
              className={inputClass}
              value={form.minDays}
              onChange={(e) => setForm({ ...form, minDays: e.target.value })}
            />
          </Field>

          <Field label="Expire le">
            <input
              type="date"
              required
              className={inputClass}
              value={form.expiresAt}
              onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
            />
          </Field>

          <div className="md:col-span-2">
            <Field label="Réservé à une entreprise">
              <select
                className={inputClass}
                value={form.applicableToCompanyId}
                onChange={(e) => setForm({ ...form, applicableToCompanyId: e.target.value })}
              >
                <option value="">Tous les clients</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full px-5 py-2.5 bg-[#795900] text-white rounded-xl text-sm font-bold hover:bg-[#5c4300] transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Créer le code</span>
            </button>
          </div>
        </form>
      </Card>

      <Card title={`Codes existants (${promoRules.length})`}>
        {promoRules.length === 0 ? (
          <p className="text-sm text-slate-500">Aucune règle tarifaire enregistrée.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F9F9FD] border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Remise</th>
                  <th className="py-3 px-4">Conditions</th>
                  <th className="py-3 px-4">Utilisations</th>
                  <th className="py-3 px-4">Expire</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {promoRules.map((rule) => {
                  const company = companies.find((c) => c.id === rule.applicableToCompanyId);
                  const expired = new Date(rule.expiresAt) < new Date();

                  return (
                    <tr key={rule.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 rounded-lg bg-slate-100 font-mono text-[11px] font-bold text-slate-800 border border-slate-200">
                          {rule.code}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-700">{rule.description}</td>
                      <td className="py-3 px-4 font-bold text-[#795900]">
                        -{rule.discountPercentage}%
                      </td>
                      <td className="py-3 px-4 text-slate-600 space-y-0.5">
                        {company && (
                          <div className="flex items-center gap-1 text-[11px]">
                            <Building2 className="w-3 h-3 text-slate-400" />
                            {company.name}
                          </div>
                        )}
                        {rule.minDays && (
                          <div className="text-[11px]">≥ {rule.minDays} jours</div>
                        )}
                        {!company && !rule.minDays && <span className="text-slate-400">—</span>}
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {rule.usedCount ?? 0}
                        {rule.maxUses ? ` / ${rule.maxUses}` : ''}
                      </td>
                      <td className={`py-3 px-4 ${expired ? 'text-[#E94560] font-semibold' : 'text-slate-600'}`}>
                        {rule.expiresAt}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => void onToggle(rule.id)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors ${
                              rule.active
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                            }`}
                          >
                            {rule.active ? 'Actif' : 'Inactif'}
                          </button>
                          <button
                            onClick={() => void onDelete(rule.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-[#E94560] hover:bg-red-50 transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Comptes & accès
// ---------------------------------------------------------------------------

const ROLE_LABELS: Record<string, string> = {
  individual: 'Particulier',
  company: 'Entreprise',
  driver: 'Chauffeur',
  admin: 'Administrateur'
};

const UsersSection: React.FC<{
  users: UserAccount[];
  onChanged: () => Promise<void>;
  notify: (message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}> = ({ users, onChanged, notify }) => {
  const [isBusy, setIsBusy] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '+225 ',
    password: '',
    role: 'admin'
  });

  const act = async (action: () => Promise<void>, success: string) => {
    setIsBusy(true);
    try {
      await action();
      await onChanged();
      notify(success, 'success');
    } catch (error) {
      notify(error instanceof ApiError ? error.message : "L'opération a échoué.", 'error');
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card
        title="Créer un compte"
        description="Réservé à la création de comptes internes (administrateurs, chauffeurs). Les clients s'inscrivent eux-mêmes depuis le site."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void act(async () => {
              await adminUsersApi.create(form);
              setForm({ fullName: '', email: '', phone: '+225 ', password: '', role: 'admin' });
            }, 'Compte créé.');
          }}
          className="grid grid-cols-1 md:grid-cols-5 gap-4"
        >
          <Field label="Nom complet">
            <input
              required
              className={inputClass}
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            />
          </Field>
          <Field label="E-mail">
            <input
              type="email"
              required
              className={inputClass}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Field>
          <Field label="Téléphone">
            <input
              required
              className={inputClass}
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </Field>
          <Field label="Mot de passe" hint="8 caractères minimum.">
            <input
              type="password"
              required
              minLength={8}
              className={inputClass}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </Field>
          <Field label="Rôle">
            <select
              className={inputClass}
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              {Object.entries(ROLE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>

          <div className="md:col-span-5">
            <button
              type="submit"
              disabled={isBusy}
              className="px-5 py-2.5 bg-[#795900] text-white rounded-xl text-sm font-bold hover:bg-[#5c4300] transition-colors flex items-center gap-2 disabled:opacity-60"
            >
              <Plus className="w-4 h-4" />
              <span>Créer le compte</span>
            </button>
          </div>
        </form>
      </Card>

      <Card title={`Comptes existants (${users.length})`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F9F9FD] border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Nom</th>
                <th className="py-3 px-4">E-mail</th>
                <th className="py-3 px-4">Entreprise</th>
                <th className="py-3 px-4">Rôle</th>
                <th className="py-3 px-4">Dernière connexion</th>
                <th className="py-3 px-4 text-right">Accès</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-semibold text-slate-900">{user.fullName}</td>
                  <td className="py-3 px-4 text-slate-600">{user.email}</td>
                  <td className="py-3 px-4 text-slate-600">{user.companyName ?? '—'}</td>
                  <td className="py-3 px-4">
                    <select
                      value={user.type}
                      disabled={isBusy}
                      onChange={(e) =>
                        void act(
                          () => adminUsersApi.update(user.id, { role: e.target.value }).then(() => undefined),
                          'Rôle mis à jour.'
                        )
                      }
                      className="p-1.5 bg-slate-50 border border-slate-300 rounded-lg text-[11px] font-bold text-slate-800 cursor-pointer"
                    >
                      {Object.entries(ROLE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-3 px-4 text-slate-500">
                    {user.lastLoginAt
                      ? new Date(user.lastLoginAt).toLocaleString('fr-FR')
                      : 'Jamais'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      disabled={isBusy}
                      onClick={() =>
                        void act(
                          () =>
                            adminUsersApi
                              .update(user.id, { isActive: !user.isActive })
                              .then(() => undefined),
                          user.isActive ? 'Compte désactivé.' : 'Compte réactivé.'
                        )
                      }
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors disabled:opacity-60 ${
                        user.isActive
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                          : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      {user.isActive ? 'Actif' : 'Désactivé'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
