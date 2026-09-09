import React from 'react';
import {
  AlertTriangle,
  Car,
  Lock,
  RotateCcw,
  SearchX,
  ServerCrash,
  ShieldOff,
  WifiOff
} from 'lucide-react';

/**
 * Nature de l'incident. Chaque variante correspond à une famille de codes HTTP
 * renvoyés par l'API, ou à un plantage de l'interface.
 */
export type ErrorKind =
  | 'offline'
  | 'server-error'
  | 'session-expired'
  | 'forbidden'
  | 'not-found'
  | 'crash';

interface ErrorPreset {
  icon: React.ReactNode;
  code: string;
  title: string;
  description: string;
  hint?: string;
  tone: 'danger' | 'warning' | 'neutral';
}

const PRESETS: Record<ErrorKind, ErrorPreset> = {
  offline: {
    icon: <WifiOff className="w-7 h-7" />,
    code: 'Connexion interrompue',
    title: 'Serveur Nyokah injoignable',
    description:
      "L'application n'arrive pas à joindre le serveur. Votre connexion est peut-être coupée, ou l'API n'est pas démarrée.",
    hint: "En développement, lancez l'API depuis le dossier server/ avec « npm run dev ».",
    tone: 'danger'
  },
  'server-error': {
    icon: <ServerCrash className="w-7 h-7" />,
    code: 'Erreur 500',
    title: 'Le serveur a rencontré un problème',
    description:
      "L'incident a été enregistré côté serveur. Vos données n'ont pas été perdues : réessayez dans un instant.",
    hint: 'Si le problème persiste, contactez la conciergerie Nyokah.',
    tone: 'danger'
  },
  'session-expired': {
    icon: <Lock className="w-7 h-7" />,
    code: 'Erreur 401',
    title: 'Votre session a expiré',
    description:
      'Pour votre sécurité, la session se ferme après une période d’inactivité. Reconnectez-vous pour reprendre où vous en étiez.',
    tone: 'warning'
  },
  forbidden: {
    icon: <ShieldOff className="w-7 h-7" />,
    code: 'Erreur 403',
    title: 'Accès non autorisé',
    description:
      "Votre compte n'a pas les droits nécessaires pour consulter cette section. Si vous pensez qu'il s'agit d'une erreur, contactez l'administrateur de la plateforme.",
    tone: 'warning'
  },
  'not-found': {
    icon: <SearchX className="w-7 h-7" />,
    code: 'Erreur 404',
    title: 'Cette ressource est introuvable',
    description:
      "L'élément demandé n'existe plus ou a été retiré. Il a peut-être été supprimé entre-temps.",
    tone: 'neutral'
  },
  crash: {
    icon: <AlertTriangle className="w-7 h-7" />,
    code: 'Erreur inattendue',
    title: 'L’affichage a rencontré un problème',
    description:
      "Une erreur imprévue a interrompu l'affichage de cette page. Recharger l'application résout généralement la situation.",
    tone: 'danger'
  }
};

const TONE_CLASSES: Record<ErrorPreset['tone'], string> = {
  danger: 'bg-red-50 text-[#E94560] border-red-200',
  warning: 'bg-amber-50 text-[#795900] border-amber-200',
  neutral: 'bg-slate-100 text-slate-600 border-slate-200'
};

interface ErrorPageProps {
  kind: ErrorKind;
  /** Message renvoyé par l'API, affiché en complément de la description. */
  detail?: string | null;
  /** Action principale : réessayer, se reconnecter, recharger… */
  primaryAction?: { label: string; onClick: () => void };
  secondaryAction?: { label: string; onClick: () => void };
  /** Identifiant de requête, précieux pour retrouver l'incident dans les journaux. */
  requestId?: string | null;
}

export const ErrorPage: React.FC<ErrorPageProps> = ({
  kind,
  detail,
  primaryAction,
  secondaryAction,
  requestId
}) => {
  const preset = PRESETS[kind];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F9F9FD] px-6 py-16">
      <div className="w-full max-w-lg text-center space-y-6">
        {/* Marque, pour que l'utilisateur sache qu'il est toujours sur Nyokah */}
        <div className="flex items-center justify-center gap-2 text-[#0B132B]">
          <span className="w-9 h-9 rounded-xl bg-[#0B132B] text-[#D4A017] flex items-center justify-center">
            <Car className="w-5 h-5" />
          </span>
          <span className="font-serif font-bold text-lg">Nyokah Mobility</span>
        </div>

        <div
          className={`w-16 h-16 rounded-2xl border flex items-center justify-center mx-auto ${TONE_CLASSES[preset.tone]}`}
        >
          {preset.icon}
        </div>

        <div className="space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            {preset.code}
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold font-serif text-[#1A1C1F]">
            {preset.title}
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">{preset.description}</p>
        </div>

        {detail && (
          <div className="text-xs text-slate-700 bg-white border border-slate-200 rounded-2xl p-4 text-left">
            <span className="block font-bold uppercase tracking-wider text-[10px] text-slate-500 mb-1">
              Détail technique
            </span>
            <span className="break-words">{detail}</span>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
          {primaryAction && (
            <button
              onClick={primaryAction.onClick}
              className="px-6 py-3 bg-[#795900] text-white rounded-xl text-sm font-bold hover:bg-[#5c4300] transition-colors flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{primaryAction.label}</span>
            </button>
          )}

          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              className="px-5 py-3 bg-white border border-slate-300 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors"
            >
              {secondaryAction.label}
            </button>
          )}
        </div>

        {preset.hint && <p className="text-xs text-slate-500">{preset.hint}</p>}

        {requestId && (
          <p className="text-[11px] text-slate-400 font-mono">
            Référence de l'incident : {requestId}
          </p>
        )}
      </div>
    </div>
  );
};
