# API Nyokah Mobility

Backend de la plateforme de location de véhicules avec chauffeur **Nyokah Mobility** (Abidjan, Côte d'Ivoire).

Node.js · TypeScript · Fastify · Prisma · PostgreSQL · JWT · OpenAPI

Montants en francs CFA (XOF), TVA ivoirienne de 18 %.

---

## Démarrage rapide

```bash
cd server
npm install
cp .env.example .env
docker compose up -d
npx prisma migrate dev
npm run db:seed
npm run dev
```

L'API écoute sur `http://localhost:4000`, la documentation interactive sur `http://localhost:4000/docs`.

> **Secrets JWT** — remplacez les valeurs de `.env` avant tout déploiement :
> ```bash
> node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
> ```

### Comptes créés par le seed

| Rôle | Identifiant | Mot de passe |
|---|---|---|
| Administrateur | `admin@nyokah.ci` | `Nyokah@2026` |
| Client particulier | `jm.kouassi@gmail.com` | `Nyokah@2026` |
| Compte entreprise (Orange CI, −20 %) | `a.toure@orange.ci` | `Nyokah@2026` |
| Chauffeur | `ibrahim.kone@nyokah.ci` | `Nyokah@2026` |

Le seed installe 12 véhicules, 5 chauffeurs, 2 partenaires sous-traitants, 4 comptes entreprise, 4 packs et 6 codes promo.

---

## Test de bout en bout

Avec l'API démarrée et la base seedée :

```bash
node test/smoke.mjs
```

88 vérifications parcourent l'intégralité du cycle métier : inscription, devis, réservation, conflit de disponibilité, dispatch, paiement, exécution de la course, facturation, fidélité, avis, notifications, statistiques, annulation, cloisonnement des données et effet réel des paramètres modifiables.

---

## Fonctionnalités

**Comptes et sécurité**
Inscription particulier et entreprise, connexion, JWT d'accès courts + refresh tokens à rotation (seule l'empreinte SHA-256 est stockée), réinitialisation de mot de passe, révocation de toutes les sessions, quatre rôles (`individual`, `company`, `driver`, `admin`), mots de passe hachés en scrypt (paramètres OWASP), limitation de débit, CORS restreint, en-têtes Helmet, journal d'audit.

**Flotte**
Catalogue public filtrable (catégorie, statut, motorisation, places, prix, disponibilité réelle sur une période), fiche détaillée avec avis, CRUD administrateur, statuts, suppression logique refusée tant que des réservations sont actives, planning d'occupation par véhicule.

**Entretien**
Planification et suivi des interventions, immobilisation et remise en service automatiques du véhicule, relevé kilométrique, alertes à 30 jours sur entretiens, assurances et contrôles techniques.

**Chauffeurs et partenaires**
Effectif, langues, permis, notation recalculée à partir des avis publiés, disponibilité sur période, espace chauffeur (`/drivers/me/rides`), sous-traitants avec chiffre d'affaires généré et commission due.

**Clients entreprise (B2B)**
Remise contractuelle négociée, code promo dédié synchronisé avec la remise, ligne de crédit, délai de paiement, réservateurs autorisés, objectif de volume mensuel, encours de facturation.

**Tarification**
Moteur de devis entièrement côté serveur : tarif par formule (journée, demi-journée, transfert aéroport FHB, mise à disposition 24 h, forfait week-end, mensuel), option carburant selon la catégorie, remises société / code promo / volume — **non cumulables, la plus avantageuse pour le client l'emporte** — puis TVA. Grille modifiable à chaud depuis l'onglet Paramètres du back-office, sans redéploiement.

**Réservations**
Création avec verrouillage transactionnel de la disponibilité, machine à états stricte, affectation chauffeur + véhicule avec double contrôle de disponibilité, création automatique de la course, re-tarification, annulation qui libère véhicule, chauffeur et quota de code promo, historique complet des changements de statut.

**Courses et dispatch**
Planning du jour, cycle Planifiée → En route → En cours → Terminée, relevés kilométriques contrôlés, réassignation, synchronisation automatique avec la réservation.

**Paiements**
Intention de paiement, encaissement partiel (acompte), webhook signé et **idempotent** avec revérification serveur à serveur avant encaissement, réconciliation manuelle, remboursement.

**Facturation**
Émission automatique à la clôture de la mission, numérotation `FAC-AAAA-XXXX`, lignes détaillées reconstruites depuis la réservation, suivi des encours et bascule des factures échues.

**Notifications**
Gabarits WhatsApp repris de la maquette (accusé de réception, validation, affectation chauffeur, chauffeur en approche, fin de mission, paiement, facture, bienvenue), persistance de chaque envoi, relecture, rejeu des échecs, message manuel de la conciergerie.

**Avis clients**
Un avis par réservation terminée, modération, recalcul de la note du chauffeur.

**Paramètres**
Tout ce qui pilote le métier sans redéploiement, exposé sous `/settings` et dans l'onglet **Paramètres** du back-office : identité et coordonnées de la conciergerie (reprises dans tous les messages sortants), délai de prévenance des réservations, préavis d'annulation client, échéance de facturation par défaut, seuils des paliers de fidélité, grille tarifaire complète (TVA, paliers volume, coefficients de formule, option carburant, points de fidélité), codes promo, comptes et rôles, journal d'audit. Les informations d'environnement (prestataires, devise, durées de jeton) y sont affichées en lecture seule : elles se modifient dans le `.env` de l'API.

**Pilotage**
Tableau de bord (chiffre d'affaires réalisé et carnet de commandes, croissance mensuelle, taux d'occupation, missions du jour, encours), série temporelle mensuelle ou journalière, performance par véhicule et catégorie, par chauffeur, classement des comptes B2B, véhicules les plus demandés, journal d'audit.

---

## Contrat d'API

Base : `/api/v1` — documentation complète et testable sur `/docs`.

L'API expose les **libellés français** utilisés par le frontend (`src/types.ts`) : `"VIP Prestige"`, `"En attente"`, `"Journée (8h-18h)"`… Les identifiants ASCII (`VIP_PRESTIGE`) restent internes à PostgreSQL, la traduction se fait dans [`src/lib/enums.ts`](src/lib/enums.ts). Les listes déroulantes peuvent être alimentées par `GET /api/v1/meta/enums`.

Les dates sont au format `YYYY-MM-DD`, les horaires en `HH:MM`.

### Format des erreurs

```json
{
  "error": {
    "code": "CONFLICT",
    "message": "Ce véhicule est déjà réservé sur la période demandée (1 réservation(s) en conflit).",
    "requestId": "req-42",
    "details": { "conflicts": [{ "reference": "RES-0001", "startDate": "2026-09-19", "endDate": "2026-09-22" }] }
  }
}
```

`VALIDATION_ERROR` (422), `UNAUTHORIZED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404), `CONFLICT` / `DUPLICATE` (409), `RATE_LIMIT_EXCEEDED` (429).

### Listes paginées

```json
{ "data": [], "meta": { "page": 1, "pageSize": 20, "total": 0, "totalPages": 1, "hasNextPage": false } }
```

### Différences avec les types du frontend

- `Booking.id` est un identifiant technique ; la référence lisible `RES-0942` est dans `booking.reference`.
- `Ride.id` de même, avec `ride.reference` (`RIDE-0101`).
- `Company.totalBookings` / `totalSpent` sont **calculés** à la lecture, jamais stockés : ils ne peuvent pas dériver.

---

## Intégrations externes

Deux contrats, plusieurs implémentations. Le domaine ne connaît que l'interface.

| Variable | Valeurs | Effet |
|---|---|---|
| `NOTIFICATION_PROVIDER` | `mock` (défaut), `whatsapp_cloud` | Simulateur inspectable via `GET /notifications/outbox`, ou WhatsApp Business Cloud API |
| `PAYMENT_PROVIDER` | `mock` (défaut), `cinetpay` | Simulateur (`POST /payments/:reference/simulate`), ou CinetPay — Wave, Orange Money, MTN, Moov, carte |

Brancher un vrai prestataire ne demande aucune modification du métier :

```env
PAYMENT_PROVIDER=cinetpay
CINETPAY_API_KEY=...
CINETPAY_SITE_ID=...
CINETPAY_SECRET_KEY=...
```

Ajouter un nouvel encaisseur (Wave en direct, par exemple) revient à écrire une classe implémentant `PaymentAdapter` ([`src/providers/payments/types.ts`](src/providers/payments/types.ts)) et à l'enregistrer dans la fabrique.

> L'adaptateur CinetPay est écrit d'après la documentation de l'opérateur (création de transaction, vérification `payment/check`, HMAC `x-token` sur la notification) mais **n'a pas pu être testé contre un compte marchand réel** : il faut vos clés API pour le valider de bout en bout. Le parcours de paiement complet est en revanche vérifié avec l'adaptateur simulé.

---

## Architecture

```
server/
├── prisma/
│   ├── schema.prisma        22 modèles, 21 énumérations
│   ├── migrations/
│   └── seed.ts              jeu de données Nyokah
├── src/
│   ├── config/env.ts        configuration validée par zod, échec au démarrage si invalide
│   ├── lib/                 erreurs, prisma, enums, sérialiseurs, mots de passe, jetons, dates, références
│   ├── plugins/             authentification, gestion d'erreurs
│   ├── providers/           adaptateurs paiement et notification
│   ├── services/            règles métier : tarification, disponibilité, réservation, facturation, notifications, audit
│   ├── modules/             18 modules de routes
│   ├── app.ts
│   └── index.ts
└── test/smoke.mjs
```

**Principes appliqués**

- *Le client ne fixe jamais un prix.* Il envoie des paramètres de location, le serveur recalcule tout à la création comme à la modification.
- *La disponibilité est vérifiée dans la transaction d'écriture*, pas avant : deux réservations simultanées du même véhicule ne peuvent pas passer.
- *Les transitions de statut sont explicites.* Une réservation annulée ne redevient pas active, une mission ne se clôture pas sans avoir démarré.
- *Le cloisonnement est imposé par le rôle*, jamais par un paramètre de requête : un client voit ses réservations, une entreprise celles de sa société, un chauffeur ses missions.
- *Les échecs de notification ne cassent pas le métier* : la trace reste en base au statut `failed` et peut être rejouée.
- *Les règles commerciales sont des données* (`settings.pricing`), pas du code.

---

## Scripts

| Commande | Rôle |
|---|---|
| `npm run dev` | Serveur de développement avec rechargement |
| `npm run build` / `npm start` | Compilation puis exécution en production |
| `npm run lint` | Vérification TypeScript stricte |
| `npm run db:migrate` | Créer et appliquer une migration |
| `npm run db:deploy` | Appliquer les migrations en production |
| `npm run db:seed` | Charger le jeu de données |
| `npm run db:studio` | Explorateur de base Prisma |
| `npm run db:reset` | Réinitialiser la base (destructif) |

---

## Déploiement

1. Provisionner PostgreSQL 14+ et renseigner `DATABASE_URL`.
2. Générer `JWT_ACCESS_SECRET` et `JWT_REFRESH_SECRET`.
3. `NODE_ENV=production`, `API_URL` sur le domaine public, `CORS_ORIGINS` sur celui du frontend.
4. `npm ci && npm run build && npm run db:deploy && npm start`.
5. Sondes : `GET /api/v1/health` (vivacité) et `GET /api/v1/ready` (base de données).

Swagger est désactivé en production ; forcez-le au besoin avec `ENABLE_SWAGGER=true`.

Tâches planifiées recommandées : `POST /api/v1/invoices/refresh-overdue` chaque nuit, et une revue quotidienne de `GET /api/v1/maintenance/alerts`.

---

## Note sur PostgreSQL en local

Le `docker-compose.yml` publie la base sur le **port hôte 5442** et non 5432, pour éviter le conflit avec un PostgreSQL déjà installé sur la machine. Si vous utilisez une autre base, ajustez seulement `DATABASE_URL`.

---

## Frontend

Le frontend React consomme cette API : les données mockées ont été supprimées.

```bash
# terminal 1
cd server && npm run dev

# terminal 2 (à la racine du projet)
npm run dev
```

Le serveur Vite relaie `/api` vers `http://localhost:4000` (voir `vite.config.ts`), il n'y a donc aucune question de CORS en développement. Côté client, la couche d'appel se trouve dans `src/api/` et l'état applicatif dans `src/context/AppContext.tsx`.
