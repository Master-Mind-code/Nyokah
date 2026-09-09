/**
 * Client HTTP de l'API Nyokah.
 *
 * Responsabilites : porter le jeton d'acces, le renouveler automatiquement
 * quand il expire, et transformer les erreurs du serveur en `ApiError`
 * exploitable directement dans l'interface (le message est deja en francais).
 */

const API_BASE = (import.meta.env.VITE_API_URL ?? '') + '/api/v1';

const ACCESS_TOKEN_KEY = 'nyokah.accessToken';
const REFRESH_TOKEN_KEY = 'nyokah.refreshToken';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;
  /** Identifiant de la requete cote serveur, pour retrouver l incident dans les journaux. */
  readonly requestId?: string;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: unknown,
    requestId?: string
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
  }

  /** Liste « champ : message » des erreurs de validation, prete a afficher. */
  get fieldErrors(): string[] {
    if (!Array.isArray(this.details)) return [];
    return (this.details as Array<{ field?: string; message?: string }>)
      .filter((d) => d?.message)
      .map((d) => (d.field && d.field !== '(racine)' ? `${d.field} : ${d.message}` : d.message!));
  }
}

// ---------------------------------------------------------------------------
// Stockage des jetons
// ---------------------------------------------------------------------------

export const tokenStore = {
  get access(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },
  get refresh(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },
  set(accessToken: string, refreshToken: string): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  },
  clear(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
};

/** Notifie l'application qu'une session est definitivement perdue. */
type SessionExpiredHandler = () => void;
let onSessionExpired: SessionExpiredHandler = () => {};

export function setSessionExpiredHandler(handler: SessionExpiredHandler): void {
  onSessionExpired = handler;
}

// ---------------------------------------------------------------------------
// Renouvellement du jeton
// ---------------------------------------------------------------------------

/**
 * Un seul renouvellement a la fois : si plusieurs requetes tombent en 401
 * simultanement, elles attendent toutes la meme promesse au lieu de consommer
 * chacune le refresh token (qui est a usage unique cote serveur).
 */
let refreshInFlight: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  if (!tokenStore.refresh) return false;

  refreshInFlight ??= (async () => {
    // Le jeton est relu au moment de l'exécution, pas à l'appel : un
    // renouvellement concurrent vient peut-être de le faire tourner, et
    // présenter l'ancien ferait échouer la rotation puis déconnecterait
    // l'utilisateur en pleine saisie.
    const refreshToken = tokenStore.refresh;
    if (!refreshToken) return false;

    try {
      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });

      if (!response.ok) {
        // Refus explicite du serveur : la session est réellement perdue.
        tokenStore.clear();
        return false;
      }

      const data = (await response.json()) as { accessToken: string; refreshToken: string };
      tokenStore.set(data.accessToken, data.refreshToken);
      return true;
    } catch {
      // Panne réseau ou API momentanément indisponible : on garde les jetons,
      // sinon un simple redémarrage du serveur déconnecterait l'utilisateur et
      // lui ferait perdre sa saisie en cours.
      return false;
    } finally {
      // Libere le verrou au tour suivant, une fois les attentes resolues.
      queueMicrotask(() => {
        refreshInFlight = null;
      });
    }
  })();

  return refreshInFlight;
}

// ---------------------------------------------------------------------------
// Requetes
// ---------------------------------------------------------------------------

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | null | undefined>;
  /** Requete publique : n'entraine ni envoi de jeton ni tentative de refresh. */
  anonymous?: boolean;
  signal?: AbortSignal;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = `${API_BASE}${path}`;
  if (!query) return url;

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    params.set(key, String(value));
  }

  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

async function toApiError(response: Response): Promise<ApiError> {
  const payload = (await response.json().catch(() => null)) as {
    error?: { code?: string; message?: string; details?: unknown; requestId?: string };
  } | null;

  return new ApiError(
    response.status,
    payload?.error?.code ?? 'HTTP_ERROR',
    payload?.error?.message ?? `Erreur ${response.status}. Réessayez dans un instant.`,
    payload?.error?.details,
    payload?.error?.requestId
  );
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query, anonymous = false, signal } = options;

  const send = async (): Promise<Response> => {
    const token = anonymous ? null : tokenStore.access;
    return fetch(buildUrl(path, query), {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      signal
    });
  };

  let response: Response;
  try {
    response = await send();
  } catch (error) {
    if ((error as Error)?.name === 'AbortError') throw error;

    // Un envoi volumineux refusé par le serveur coupe la connexion avant que la
    // réponse ne soit lisible : `fetch` échoue alors comme une panne réseau.
    // Distinguer les deux cas évite d'accuser à tort un serveur qui fonctionne.
    const payloadSize = body !== undefined ? JSON.stringify(body).length : 0;
    if (payloadSize > 1_000_000) {
      throw new ApiError(
        0,
        'PAYLOAD_TOO_LARGE',
        `L'envoi a été refusé car il est trop volumineux (${Math.round(payloadSize / 1024 / 1024)} Mo). Réduisez la taille de la photo puis réessayez.`
      );
    }

    throw new ApiError(
      0,
      'NETWORK_ERROR',
      "Impossible de joindre le serveur Nyokah. Vérifiez que l'API est démarrée."
    );
  }

  // Jeton expire : on le renouvelle une fois puis on rejoue la requete.
  if (response.status === 401 && !anonymous && tokenStore.refresh) {
    const renewed = await refreshSession();

    if (renewed) {
      response = await send();
    } else if (!tokenStore.refresh) {
      // Les jetons n'ont été effacés que si le serveur a explicitement rejeté le
      // renouvellement. Sur une simple panne réseau ils sont conservés et la
      // requête échouera normalement, sans déconnecter l'utilisateur.
      onSessionExpired();
    }
  }

  if (!response.ok) throw await toApiError(response);

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const api = {
  get: <T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'PATCH', body }),
  put: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'PUT', body }),
  delete: <T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'DELETE' })
};

/** Enveloppe de liste paginee renvoyee par l'API. */
export interface Paginated<T> {
  data: T[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
  };
}

/**
 * Recupere toutes les pages d'une collection.
 * Les volumes de la plateforme (flotte, chauffeurs, societes) tiennent
 * largement dans quelques pages ; la boucle est bornee par securite.
 */
export async function fetchAll<T>(
  path: string,
  query: RequestOptions['query'] = {},
  pageSize = 100,
  maxPages = 20
): Promise<T[]> {
  const results: T[] = [];

  for (let page = 1; page <= maxPages; page++) {
    const response = await api.get<Paginated<T>>(path, { query: { ...query, page, pageSize } });
    results.push(...response.data);
    if (!response.meta.hasNextPage) break;
  }

  return results;
}
