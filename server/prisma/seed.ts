/**
 * Jeu de donnees de demarrage Nyokah Mobility.
 * Reprend la flotte, les partenaires, les comptes B2B et la grille tarifaire
 * utilises par la maquette frontend, avec des comptes de connexion reels.
 *
 *   npm run db:seed
 *
 * Le script est idempotent : il peut etre relance sans dupliquer les donnees.
 */
import { PrismaClient, type Prisma } from '@prisma/client';
import { env } from '../src/config/env.js';
import { hashPassword } from '../src/lib/password.js';
import { addDays, toUtcDay } from '../src/lib/dates.js';
import { DEFAULT_PRICING_CONFIG, PRICING_SETTINGS_KEY } from '../src/services/pricing.service.js';

const prisma = new PrismaClient();

const DEMO_PASSWORD = 'Nyokah@2026';

// ---------------------------------------------------------------------------
// Partenaires sous-traitants
// ---------------------------------------------------------------------------

const SUBCONTRACTORS = [
  {
    key: 'ivoire-prestige',
    name: 'Transport Ivoire Prestige',
    contactPerson: 'M. Daniel Ackah',
    phone: '+225 07 12 34 89 00',
    email: 'contact@ivoireprestige.ci',
    commissionRate: 15,
    status: 'ACTIF' as const
  },
  {
    key: 'autorent-abj',
    name: 'AutoRent Abidjan Express',
    contactPerson: 'Mme Chantal Djédjé',
    phone: '+225 05 90 80 70 60',
    email: 'info@autorent-abj.ci',
    commissionRate: 12,
    status: 'ACTIF' as const
  }
];

// ---------------------------------------------------------------------------
// Flotte
// ---------------------------------------------------------------------------

type SeedVehicle = Omit<Prisma.VehicleCreateInput, 'subcontractor'> & {
  subcontractorKey?: string;
};

const VEHICLES: SeedVehicle[] = [
  {
    brand: 'Toyota',
    model: 'Corolla',
    year: 2022,
    category: 'BERLINE',
    seats: 4,
    luggage: 2,
    transmission: 'AUTOMATIQUE',
    fuel: 'ESSENCE',
    plateNumber: '3412 JJ 01',
    dailyRate: 35_000,
    halfDayRate: 22_000,
    airportTransferRate: 20_000,
    status: 'DISPONIBLE',
    ownership: 'FLOTTE_PROPRE',
    isVip: false,
    isRecommended: false,
    imageUrl: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?auto=format&fit=crop&w=1000&q=80',
    galleryUrls: [
      'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1590362891991-f776e747a588?auto=format&fit=crop&w=1000&q=80'
    ],
    features: [
      'Climatisation bi-zone',
      'Bluetooth audio',
      'Chauffeur courtois',
      'Carburant optimisé',
      'Assurance tous risques'
    ],
    description:
      'Berline compacte polyvalente et très économique pour tous vos déplacements professionnels urbains à Abidjan (Plateau, Cocody, Marcory).',
    mileageLimit: '200 km / jour',
    currentMileage: 48_500
  },
  {
    brand: 'Toyota',
    model: 'Prado TX-L',
    year: 2023,
    category: 'SUV',
    seats: 7,
    luggage: 4,
    transmission: 'AUTOMATIQUE',
    fuel: 'DIESEL',
    plateNumber: '8945 KK 01',
    dailyRate: 55_000,
    halfDayRate: 35_000,
    airportTransferRate: 30_000,
    status: 'DISPONIBLE',
    ownership: 'FLOTTE_PROPRE',
    isVip: false,
    isRecommended: true,
    imageUrl: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1000&q=80',
    galleryUrls: [
      'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1000&q=80'
    ],
    features: [
      '7 Places modulables',
      'Grand coffre',
      'WiFi 4G à bord',
      'Frigo embarqué',
      'Chauffeur expérimenté',
      'Climatisation tropicalisée'
    ],
    description:
      'Le SUV de référence en Côte d’Ivoire. Robustesse, grand confort et parfaite maîtrise aussi bien en ville que pour les missions vers Yamoussoukro ou San Pedro.',
    mileageLimit: 'Illimité (District Abidjan)',
    currentMileage: 32_100
  },
  {
    brand: 'Mercedes-Benz',
    model: 'Classe E 300',
    year: 2024,
    category: 'VIP_PRESTIGE',
    seats: 4,
    luggage: 3,
    transmission: 'AUTOMATIQUE',
    fuel: 'ESSENCE',
    plateNumber: '1102 LM 01',
    dailyRate: 90_000,
    halfDayRate: 55_000,
    airportTransferRate: 45_000,
    status: 'DISPONIBLE',
    ownership: 'FLOTTE_PROPRE',
    isVip: true,
    isRecommended: true,
    imageUrl: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=1000&q=80',
    galleryUrls: [
      'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=1000&q=80'
    ],
    features: [
      'Intérieur cuir Nappa',
      'Rafraîchissements offerts',
      'WiFi haute vitesse',
      'Chauffeur VIP costume & bilingue',
      'Vitres teintées sécurité'
    ],
    description:
      'L’incarnation de l’élégance exécutive. Idéale pour les délégations internationales, comités de direction et rendez-vous d’affaires de haut rang.',
    mileageLimit: '250 km / jour',
    currentMileage: 12_400
  },
  {
    brand: 'Range Rover',
    model: 'Autobiography',
    year: 2024,
    category: 'VIP_PRESTIGE',
    seats: 4,
    luggage: 3,
    transmission: 'AUTOMATIQUE',
    fuel: 'ESSENCE',
    plateNumber: '7721 LL 01',
    dailyRate: 150_000,
    halfDayRate: 90_000,
    airportTransferRate: 75_000,
    status: 'DISPONIBLE',
    ownership: 'FLOTTE_PROPRE',
    isVip: true,
    isRecommended: true,
    imageUrl: 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?auto=format&fit=crop&w=1000&q=80',
    galleryUrls: [
      'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1000&q=80'
    ],
    features: [
      'Sièges massants & ventilés',
      'Chauffeur VIP dédié',
      'Écran multimédia arrière',
      'Eaux minérales & serviettes rafraîchissantes',
      'Suspension pneumatique adaptative'
    ],
    description:
      'Le summum du luxe automobile à Abidjan. Prestation d’élite avec chauffeur dédié pour chefs d’entreprises et personnalités.',
    mileageLimit: 'Illimité (District Abidjan)',
    currentMileage: 9_800
  },
  {
    brand: 'Hyundai',
    model: 'Tucson Executive',
    year: 2023,
    category: 'SUV',
    seats: 5,
    luggage: 3,
    transmission: 'AUTOMATIQUE',
    fuel: 'DIESEL',
    plateNumber: '5420 JK 01',
    dailyRate: 48_000,
    halfDayRate: 30_000,
    airportTransferRate: 25_000,
    status: 'DISPONIBLE',
    ownership: 'FLOTTE_PROPRE',
    isVip: false,
    isRecommended: false,
    imageUrl: 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=1000&q=80',
    galleryUrls: [
      'https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=1000&q=80'
    ],
    features: [
      'Design moderne',
      'Climatisation intégrale',
      'Chauffeur expérimenté',
      'Connectivité Apple CarPlay / Android Auto'
    ],
    description:
      'SUV compact moderne, spacieux et très confortable pour les cadres et équipes d’audit en mission à Abidjan.',
    mileageLimit: '200 km / jour',
    currentMileage: 41_300
  },
  {
    brand: 'Mercedes-Benz',
    model: 'Classe S 500',
    year: 2023,
    category: 'VIP_PRESTIGE',
    seats: 4,
    luggage: 3,
    transmission: 'AUTOMATIQUE',
    fuel: 'HYBRIDE',
    plateNumber: '9901 LK 01',
    dailyRate: 180_000,
    halfDayRate: 110_000,
    airportTransferRate: 85_000,
    status: 'DISPONIBLE',
    ownership: 'FLOTTE_PROPRE',
    isVip: true,
    isRecommended: true,
    imageUrl: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1000&q=80',
    galleryUrls: [
      'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1000&q=80'
    ],
    features: [
      'First Class arrière',
      'Chauffeur d’honneur en livrée',
      'Insonorisation acoustique absolue',
      'Champagne & rafraîchissements sur demande'
    ],
    description:
      'Le fleuron de l’industrie automobile mondiale pour réceptions de chefs d’États, ministres et PDG de multinationales.',
    mileageLimit: 'Illimité (Abidjan)',
    currentMileage: 15_600
  },
  {
    brand: 'Toyota',
    model: 'Hiace Super Custom VIP',
    year: 2023,
    category: 'MINIBUS_VAN',
    seats: 12,
    luggage: 8,
    transmission: 'AUTOMATIQUE',
    fuel: 'DIESEL',
    plateNumber: '4488 JL 01',
    dailyRate: 75_000,
    halfDayRate: 45_000,
    airportTransferRate: 40_000,
    status: 'DISPONIBLE',
    ownership: 'FLOTTE_PROPRE',
    isVip: false,
    isRecommended: false,
    imageUrl: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1000&q=80',
    galleryUrls: [
      'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1000&q=80'
    ],
    features: [
      '12 fauteuils capitonnés',
      'Climatisation passagers individuelle',
      'Microphone de bord',
      'Chauffeur professionnel'
    ],
    description:
      'Minibus haut de gamme adapté aux séminaires d’entreprises, délégations sportives et transferts de groupes vers les hôtels d’Abidjan.',
    mileageLimit: '250 km / jour',
    currentMileage: 55_200
  },
  {
    brand: 'Toyota',
    model: 'Land Cruiser V8 VX-R',
    year: 2023,
    category: 'SUV',
    seats: 7,
    luggage: 5,
    transmission: 'AUTOMATIQUE',
    fuel: 'DIESEL',
    plateNumber: '6523 KK 01',
    dailyRate: 85_000,
    halfDayRate: 50_000,
    airportTransferRate: 45_000,
    status: 'DISPONIBLE',
    ownership: 'FLOTTE_PROPRE',
    isVip: true,
    isRecommended: false,
    imageUrl: 'https://images.unsplash.com/photo-1594502184342-2e12f877aa73?auto=format&fit=crop&w=1000&q=80',
    galleryUrls: [
      'https://images.unsplash.com/photo-1594502184342-2e12f877aa73?auto=format&fit=crop&w=1000&q=80'
    ],
    features: [
      'Blindage léger possible',
      'Motorisation V8 biturbo',
      'Chauffeur sécurité défensive',
      'Pneumatiques tout-terrain'
    ],
    description:
      'Puissance et stature impériale. Parfait pour les déplacements sécurisés des ambassades, directeurs généraux et missions hors d’Abidjan.',
    mileageLimit: 'Illimité (Côte d’Ivoire)',
    currentMileage: 28_900
  },
  {
    brand: 'Hyundai',
    model: 'Elantra GLS',
    year: 2022,
    category: 'BERLINE',
    seats: 4,
    luggage: 2,
    transmission: 'AUTOMATIQUE',
    fuel: 'ESSENCE',
    plateNumber: '2109 JJ 01',
    dailyRate: 35_000,
    halfDayRate: 22_000,
    airportTransferRate: 20_000,
    status: 'DISPONIBLE',
    ownership: 'SOUS_TRAITANT',
    subcontractorKey: 'ivoire-prestige',
    isVip: false,
    isRecommended: false,
    imageUrl: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1000&q=80',
    galleryUrls: [
      'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1000&q=80'
    ],
    features: ['Confort feutré', 'Climatisation puissante', 'Chauffeur ponctuel certifié'],
    description:
      'Véhicule sous-traité certifié qualité Nyokah pour répondre aux pics de demandes des flottes d’entreprises.',
    mileageLimit: '200 km / jour',
    currentMileage: 61_000
  },
  {
    brand: 'Toyota',
    model: 'RAV4 Hybrid AWD',
    year: 2023,
    category: 'SUV',
    seats: 5,
    luggage: 3,
    transmission: 'AUTOMATIQUE',
    fuel: 'HYBRIDE',
    plateNumber: '7341 KK 01',
    dailyRate: 50_000,
    halfDayRate: 32_000,
    airportTransferRate: 28_000,
    status: 'ENTRETIEN',
    ownership: 'FLOTTE_PROPRE',
    isVip: false,
    isRecommended: false,
    imageUrl: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=1000&q=80',
    galleryUrls: [
      'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=1000&q=80'
    ],
    features: ['Technologie Hybride sobre', 'Toit panoramique', 'Chauffeur formé'],
    description: 'SUV moderne et écologique, révisé rigoureusement selon les normes constructeur.',
    mileageLimit: '200 km / jour',
    currentMileage: 37_400
  },
  {
    brand: 'Mercedes-Benz',
    model: 'V-Class VIP Lounge',
    year: 2023,
    category: 'MINIBUS_VAN',
    seats: 7,
    luggage: 6,
    transmission: 'AUTOMATIQUE',
    fuel: 'DIESEL',
    plateNumber: '8812 LK 01',
    dailyRate: 110_000,
    halfDayRate: 70_000,
    airportTransferRate: 60_000,
    status: 'DISPONIBLE',
    ownership: 'SOUS_TRAITANT',
    subcontractorKey: 'autorent-abj',
    isVip: true,
    isRecommended: false,
    imageUrl: 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=1000&q=80',
    galleryUrls: [
      'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=1000&q=80'
    ],
    features: [
      'Configuration salon face-à-face',
      'Tablettes de travail intégrées',
      'Prises 220V',
      'Chauffeur bilingue'
    ],
    description:
      'Bureau mobile d’exception. Permet de tenir des réunions de travail en toute confidentialité pendant les trajets urbains.',
    mileageLimit: '250 km / jour',
    currentMileage: 21_700
  },
  {
    brand: 'Toyota',
    model: 'Hilux Double Cabine 4x4',
    year: 2023,
    category: 'UTILITAIRE',
    seats: 5,
    luggage: 6,
    transmission: 'MANUELLE',
    fuel: 'DIESEL',
    plateNumber: '1904 KK 01',
    dailyRate: 45_000,
    halfDayRate: 28_000,
    airportTransferRate: 25_000,
    status: 'DISPONIBLE',
    ownership: 'FLOTTE_PROPRE',
    isVip: false,
    isRecommended: false,
    imageUrl: 'https://images.unsplash.com/photo-1559416523-140ddc3d238c?auto=format&fit=crop&w=1000&q=80',
    galleryUrls: [
      'https://images.unsplash.com/photo-1559416523-140ddc3d238c?auto=format&fit=crop&w=1000&q=80'
    ],
    features: [
      'Benne sécurisée avec bâche étanche',
      'Transmission 4x4 tout-terrain',
      'Chauffeur expérimenté pistes'
    ],
    description:
      'Véhicule tout-terrain renforcé pour missions techniques, ingénieurs et supervision de chantiers à l’intérieur du pays.',
    mileageLimit: '300 km / jour',
    currentMileage: 72_300
  }
];

// ---------------------------------------------------------------------------
// Chauffeurs
// ---------------------------------------------------------------------------

const DRIVERS = [
  {
    name: 'Ibrahim Koné',
    phone: '+225 07 48 12 34 56',
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
    experienceYears: 8,
    rating: 4.95,
    languages: ['Français', 'Anglais'],
    status: 'DISPONIBLE' as const,
    completedRides: 420,
    licenseNumber: 'CI-PC-2016-8942',
    email: 'ibrahim.kone@nyokah.ci'
  },
  {
    name: 'Jean-Marc Kouadio',
    phone: '+225 05 66 78 90 12',
    photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
    experienceYears: 12,
    rating: 4.98,
    languages: ['Français', 'Anglais', 'Baoulé'],
    status: 'DISPONIBLE' as const,
    completedRides: 680,
    licenseNumber: 'CI-PC-2012-4411',
    email: 'jm.kouadio@nyokah.ci'
  },
  {
    name: 'Bakary Traoré',
    phone: '+225 01 23 45 67 89',
    photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    experienceYears: 6,
    rating: 4.9,
    languages: ['Français', 'Dioula'],
    status: 'DISPONIBLE' as const,
    completedRides: 310,
    licenseNumber: 'CI-PC-2018-9902',
    email: 'bakary.traore@nyokah.ci'
  },
  {
    name: 'Constant Séka',
    phone: '+225 07 89 01 23 45',
    photoUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=300&q=80',
    experienceYears: 10,
    rating: 4.92,
    languages: ['Français', 'Attié'],
    status: 'DISPONIBLE' as const,
    completedRides: 540,
    licenseNumber: 'CI-PC-2014-3319',
    email: 'constant.seka@nyokah.ci'
  },
  {
    name: 'Koffi Yao',
    phone: '+225 05 11 22 33 44',
    photoUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=300&q=80',
    experienceYears: 5,
    rating: 4.88,
    languages: ['Français'],
    status: 'EN_REPOS' as const,
    completedRides: 215,
    licenseNumber: 'CI-PC-2019-7714',
    email: 'koffi.yao@nyokah.ci'
  }
];

// ---------------------------------------------------------------------------
// Comptes entreprise
// ---------------------------------------------------------------------------

const COMPANIES = [
  {
    name: 'Groupe SIFCA',
    tradeRegister: 'CI-ABJ-1964-B-432',
    contactName: 'M. Jean Dupont',
    contactEmail: 'jean.dupont@sifca-ci.com',
    contactPhone: '+225 07 08 09 10 11',
    billingAddress: 'Siège SIFCA, Abidjan Plateau, Côte d’Ivoire',
    negotiatedDiscountRate: 15,
    promoCode: 'CORP15',
    monthlyVolumeTarget: 10,
    status: 'VIP_CONTRACTUEL' as const,
    accountManager: 'Kouamé N’Guessan',
    creditLineApproved: true,
    creditLimit: 10_000_000,
    authorizedBookers: ['M. Jean Dupont', 'Assistante Direction Générale']
  },
  {
    name: 'Orange Côte d’Ivoire',
    tradeRegister: 'CI-ABJ-1996-B-129',
    contactName: 'Mme Aminata Touré',
    contactEmail: 'a.toure@orange.ci',
    contactPhone: '+225 07 44 55 66 77',
    billingAddress:
      'Siège Orange CI, Riviera Golf, Boulevard François Mitterrand, Abidjan',
    negotiatedDiscountRate: 20,
    promoCode: 'ORANGE20',
    monthlyVolumeTarget: 15,
    status: 'VIP_CONTRACTUEL' as const,
    accountManager: 'Kouamé N’Guessan',
    creditLineApproved: true,
    creditLimit: 15_000_000,
    authorizedBookers: [
      'Aminata Touré (Resp. Flotte)',
      'Marie Koné (Assistante DG)',
      'Cabinet Direction Générale'
    ]
  },
  {
    name: 'PME Locale SARL',
    tradeRegister: 'CI-ABJ-2018-B-871',
    contactName: 'M. Marc Yao',
    contactEmail: 'm.yao@pmelocale.ci',
    contactPhone: '+225 01 99 88 77 66',
    billingAddress: 'Marcory Zone 4, Abidjan',
    negotiatedDiscountRate: 10,
    promoCode: 'PME10',
    monthlyVolumeTarget: 4,
    status: 'STANDARD_B2B' as const,
    accountManager: 'Sylvie Bamba',
    creditLineApproved: false,
    creditLimit: 0,
    authorizedBookers: ['M. Marc Yao']
  },
  {
    name: 'Banque Atlantique CI',
    tradeRegister: 'CI-ABJ-1978-B-990',
    contactName: 'M. Franck Kassi',
    contactEmail: 'f.kassi@banqueatlantique.net',
    contactPhone: '+225 05 33 22 11 00',
    billingAddress: 'Avenue Noguès, Abidjan Plateau',
    negotiatedDiscountRate: 15,
    promoCode: 'BACI15',
    monthlyVolumeTarget: 8,
    status: 'VIP_CONTRACTUEL' as const,
    accountManager: 'Kouamé N’Guessan',
    creditLineApproved: true,
    creditLimit: 8_000_000,
    authorizedBookers: ['M. Franck Kassi']
  }
];

// ---------------------------------------------------------------------------
// Packs
// ---------------------------------------------------------------------------

const PACKS = [
  {
    name: 'Pack Direction Générale (Mise à disposition Mensuelle)',
    slug: 'pack-direction-generale',
    targetAudience: 'Comités de direction & Directeurs Généraux',
    description:
      'Berline VIP ou SUV Premium avec chauffeur bilingue attitré 22 jours/mois (lundi au vendredi de 7h à 19h). Carburant en option ou forfaitisé.',
    includedVehicles: 'Mercedes Classe E ou Toyota Prado TX-L',
    duration: '1 Mois (Renouvelable)',
    formula: 'Mise à disposition continue 12h/jour',
    fixedPrice: 1_250_000,
    highlightDiscount: '-25% vs tarif journalier',
    popular: true,
    companyRegisters: ['CI-ABJ-1964-B-432', 'CI-ABJ-1996-B-129'],
    features: [
      'Chauffeur VIP dédié en tenue',
      'Assurance tous risques et véhicule de remplacement sous 1h',
      'Entretien, lavage quotidien et suivi télématique GPS',
      'Facturation mensuelle consolidée à 30 jours'
    ]
  },
  {
    name: 'Pack Événementiel Sommet & Séminaire B2B',
    slug: 'pack-evenementiel-sommet',
    targetAudience: 'Organisateurs de conférences internationales & Hôtels',
    description:
      'Flotte coordonnée de 3 Berlines Affaires + 2 Minibus VIP avec régisseur de flotte sur place pour la logistique transport.',
    includedVehicles: '3x Toyota Corolla / Elantra + 2x Toyota Hiace VIP',
    duration: '3 à 7 jours',
    formula: 'Journée complète avec transferts aéroports',
    fixedPrice: 980_000,
    highlightDiscount: '-20% sur la flotte combinée',
    popular: false,
    companyRegisters: [],
    features: [
      'Coordination logistique avec superviseur dédié sur WhatsApp',
      'Accueil personnalisé avec pancartes siglées à l’Aéroport FHB',
      'Briefing de sécurité et ponctualité garantie',
      'Flexibilité horaire des navettes'
    ]
  },
  {
    name: 'Pack Navette Collaborateurs & Audit',
    slug: 'pack-navette-collaborateurs',
    targetAudience: 'Cabinets d’audit, banques & missions industrielles',
    description:
      'Minibus Toyota Hiace climatisé avec chauffeur pour acheminer vos collaborateurs de l’hôtel aux sites industriels (Vridi, Yopougon, San Pedro).',
    includedVehicles: 'Toyota Hiace Super Custom (12 places)',
    duration: '2 semaines ou 1 mois',
    formula: 'Forfait déplacements inter-sites',
    fixedPrice: 750_000,
    highlightDiscount: '-15% forfait équipe',
    popular: false,
    companyRegisters: ['CI-ABJ-1978-B-990'],
    features: [
      'Chauffeur ponctuel et respect strict des horaires de prise en charge',
      'Capacité bagages et matériels de travail',
      'Climatisation continue adaptée aux fortes chaleurs',
      'Rapport hebdomadaire des trajets et kilométrages'
    ]
  },
  {
    name: 'Pack Délégation VIP Haute Sécurité',
    slug: 'pack-delegation-vip',
    targetAudience: 'Ambassades, investisseurs et personnalités',
    description:
      '2 Véhicules de prestige (Range Rover Autobiography + Land Cruiser V8) avec chauffeurs formés à la conduite défensive.',
    includedVehicles: 'Range Rover Autobiography + Land Cruiser V8',
    duration: 'Sur mesure (1 à 15 jours)',
    formula: 'Mise à disposition VIP 24h/24',
    fixedPrice: 1_850_000,
    highlightDiscount: 'Service Concierge Prestige',
    popular: true,
    companyRegisters: [],
    features: [
      'Chauffeurs formés aux protocoles diplomatiques',
      'Liaison radio directe & suivi géolocalisé temps réel',
      'Accès salon VIP aéroport négociable',
      'Discrétion totale garantie par accord de confidentialité'
    ]
  }
];

// ---------------------------------------------------------------------------
// Codes promo generiques (les codes societe sont crees avec les entreprises)
// ---------------------------------------------------------------------------

const GENERIC_PROMOS = [
  {
    code: 'NYOKAH5',
    description: 'Remise bienvenue nouveau client B2B / Particulier',
    discountPercentage: 5
  },
  {
    code: 'VOLUME7',
    description: 'Remise volume longue durée (+ de 5 jours de location)',
    discountPercentage: 7,
    minDays: 5
  }
];

// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log('Initialisation des données Nyokah Mobility...\n');

  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const adminHash = await hashPassword(env.SEED_ADMIN_PASSWORD);
  const endOfNextYear = new Date(Date.UTC(new Date().getUTCFullYear() + 1, 11, 31));

  // --- Grille tarifaire ---------------------------------------------------
  await prisma.setting.upsert({
    where: { key: PRICING_SETTINGS_KEY },
    create: { key: PRICING_SETTINGS_KEY, value: DEFAULT_PRICING_CONFIG },
    update: { value: DEFAULT_PRICING_CONFIG }
  });
  console.log('  Grille tarifaire enregistrée (TVA 18 %, remises volume 3j/-5 %, 7j/-12 %)');

  // --- Partenaires --------------------------------------------------------
  const partnerIds = new Map<string, string>();
  for (const { key, ...data } of SUBCONTRACTORS) {
    // Pas de contrainte d'unicite metier sur les partenaires : on rapproche par nom.
    const existing = await prisma.subcontractor.findFirst({ where: { name: data.name } });
    const partner = existing
      ? await prisma.subcontractor.update({ where: { id: existing.id }, data })
      : await prisma.subcontractor.create({ data });
    partnerIds.set(key, partner.id);
  }
  console.log(`  ${SUBCONTRACTORS.length} partenaires sous-traitants`);

  // --- Flotte -------------------------------------------------------------
  for (const { subcontractorKey, ...vehicle } of VEHICLES) {
    const data = {
      ...vehicle,
      subcontractorId: subcontractorKey ? (partnerIds.get(subcontractorKey) ?? null) : null,
      insuranceExpiry: addDays(new Date(), 200),
      technicalControlExpiry: addDays(new Date(), 120)
    };

    await prisma.vehicle.upsert({
      where: { plateNumber: vehicle.plateNumber },
      create: data,
      update: data
    });
  }
  console.log(`  ${VEHICLES.length} véhicules dans la flotte`);

  // --- Entretiens ---------------------------------------------------------
  const rav4 = await prisma.vehicle.findUnique({ where: { plateNumber: '7341 KK 01' } });
  if (rav4) {
    const existing = await prisma.maintenanceRecord.findFirst({ where: { vehicleId: rav4.id } });
    if (!existing) {
      await prisma.maintenanceRecord.create({
        data: {
          vehicleId: rav4.id,
          type: 'REVISION',
          status: 'EN_COURS',
          scheduledDate: toUtcDay(new Date()),
          mileage: rav4.currentMileage,
          garage: 'Toyota CFAO Motors Abidjan',
          notes: 'Diagnostic batterie hybride & vidange synthèse'
        }
      });
    }
  }

  const tucson = await prisma.vehicle.findUnique({ where: { plateNumber: '5420 JK 01' } });
  if (tucson) {
    const existing = await prisma.maintenanceRecord.findFirst({ where: { vehicleId: tucson.id } });
    if (!existing) {
      await prisma.maintenanceRecord.create({
        data: {
          vehicleId: tucson.id,
          type: 'REPARATION',
          status: 'PLANIFIEE',
          scheduledDate: addDays(toUtcDay(new Date()), 12),
          garage: 'Hyundai Abidjan',
          notes: 'Purge freinage & géométrie complète'
        }
      });
    }
  }
  console.log('  Entretiens planifiés');

  // --- Chauffeurs ---------------------------------------------------------
  const vehicleByPlate = new Map(
    (await prisma.vehicle.findMany({ select: { id: true, plateNumber: true } })).map((v) => [
      v.plateNumber,
      v.id
    ])
  );

  for (const driver of DRIVERS) {
    await prisma.driver.upsert({
      where: { licenseNumber: driver.licenseNumber },
      create: { ...driver, hireDate: addDays(new Date(), -driver.experienceYears * 365) },
      update: driver
    });
  }

  // Un chauffeur dispose aussi d'un compte pour l'application mobile.
  const ibrahim = await prisma.driver.findUnique({ where: { licenseNumber: 'CI-PC-2016-8942' } });
  if (ibrahim && !ibrahim.userId) {
    const driverUser = await prisma.user.upsert({
      where: { email: 'ibrahim.kone@nyokah.ci' },
      create: {
        email: 'ibrahim.kone@nyokah.ci',
        phone: ibrahim.phone,
        passwordHash,
        fullName: ibrahim.name,
        role: 'DRIVER',
        avatarUrl: ibrahim.photoUrl
      },
      update: { role: 'DRIVER' }
    });

    await prisma.driver.update({
      where: { id: ibrahim.id },
      data: { userId: driverUser.id, assignedVehicleId: vehicleByPlate.get('1102 LM 01') ?? null }
    });
  }
  console.log(`  ${DRIVERS.length} chauffeurs`);

  // --- Entreprises + codes promo dédiés -----------------------------------
  const companyByRegister = new Map<string, string>();

  for (const company of COMPANIES) {
    const saved = await prisma.company.upsert({
      where: { tradeRegister: company.tradeRegister },
      create: company,
      update: company
    });
    companyByRegister.set(company.tradeRegister, saved.id);

    await prisma.promoRule.upsert({
      where: { code: company.promoCode },
      create: {
        code: company.promoCode,
        description: `Tarif entreprise ${company.name} (-${company.negotiatedDiscountRate}%)`,
        discountPercentage: company.negotiatedDiscountRate,
        applicableToCompanyId: saved.id,
        expiresAt: endOfNextYear,
        active: true
      },
      update: {
        discountPercentage: company.negotiatedDiscountRate,
        applicableToCompanyId: saved.id,
        expiresAt: endOfNextYear
      }
    });
  }
  console.log(`  ${COMPANIES.length} comptes entreprise et leurs codes dédiés`);

  // --- Codes promo génériques ---------------------------------------------
  for (const promo of GENERIC_PROMOS) {
    await prisma.promoRule.upsert({
      where: { code: promo.code },
      create: { ...promo, expiresAt: endOfNextYear, active: true },
      update: { ...promo, expiresAt: endOfNextYear }
    });
  }
  console.log(`  ${GENERIC_PROMOS.length} codes promo génériques`);

  // --- Packs ---------------------------------------------------------------
  for (const { companyRegisters, ...pack } of PACKS) {
    const saved = await prisma.autoPack.upsert({
      where: { slug: pack.slug },
      create: pack,
      update: pack
    });

    for (const register of companyRegisters) {
      const companyId = companyByRegister.get(register);
      if (!companyId) continue;
      await prisma.packCompany.upsert({
        where: { packId_companyId: { packId: saved.id, companyId } },
        create: { packId: saved.id, companyId },
        update: {}
      });
    }
  }
  console.log(`  ${PACKS.length} packs commerciaux`);

  // --- Comptes utilisateurs -----------------------------------------------
  await prisma.user.upsert({
    where: { email: env.SEED_ADMIN_EMAIL },
    create: {
      email: env.SEED_ADMIN_EMAIL,
      phone: '+225 27 20 21 00 00',
      passwordHash: adminHash,
      fullName: 'Administration Nyokah',
      role: 'ADMIN',
      city: 'Abidjan'
    },
    update: { role: 'ADMIN', passwordHash: adminHash }
  });

  await prisma.user.upsert({
    where: { email: 'jm.kouassi@gmail.com' },
    create: {
      email: 'jm.kouassi@gmail.com',
      phone: '+225 07 12 34 56 78',
      passwordHash,
      fullName: 'Jean-Marc Kouassi',
      role: 'INDIVIDUAL',
      avatarUrl:
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
      city: 'Abidjan',
      district: 'Cocody Riviera Golf',
      loyaltyPoints: 1250,
      tier: 'GOLD_VIP',
      savedAddresses: {
        create: [
          { label: 'Résidence', address: 'Cocody Riviera Golf (Résidence)', isDefault: true },
          { label: 'Bureau', address: 'Plateau Immeuble CCIA (Bureau)' },
          { label: 'Aéroport', address: 'Aéroport Félix-Houphouët-Boigny (FHB)' }
        ]
      }
    },
    update: {}
  });

  await prisma.user.upsert({
    where: { email: 'aicha.diabate@yahoo.fr' },
    create: {
      email: 'aicha.diabate@yahoo.fr',
      phone: '+225 05 98 76 54 32',
      passwordHash,
      fullName: 'Aïcha Diabaté',
      role: 'INDIVIDUAL',
      avatarUrl:
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      city: 'Abidjan',
      district: 'Marcory Zone 4',
      loyaltyPoints: 600,
      tier: 'SILVER'
    },
    update: {}
  });

  const orangeId = companyByRegister.get('CI-ABJ-1996-B-129');
  if (orangeId) {
    await prisma.user.upsert({
      where: { email: 'a.toure@orange.ci' },
      create: {
        email: 'a.toure@orange.ci',
        phone: '+225 07 44 55 66 77',
        passwordHash,
        fullName: 'Aminata Touré',
        role: 'COMPANY',
        avatarUrl:
          'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
        companyId: orangeId,
        companyRole: 'Responsable Flotte & Mobilité Exécutive'
      },
      update: { companyId: orangeId }
    });
  }

  const sifcaId = companyByRegister.get('CI-ABJ-1964-B-432');
  if (sifcaId) {
    await prisma.user.upsert({
      where: { email: 'jean.dupont@sifca-ci.com' },
      create: {
        email: 'jean.dupont@sifca-ci.com',
        phone: '+225 07 08 09 10 11',
        passwordHash,
        fullName: 'M. Jean Dupont',
        role: 'COMPANY',
        companyId: sifcaId,
        companyRole: 'Directeur Administratif et Financier'
      },
      update: { companyId: sifcaId }
    });
  }
  console.log('  Comptes utilisateurs créés');

  console.log('\nDonnées initialisées avec succès.\n');
  console.log('Comptes de connexion :');
  console.log(`  Administrateur  ${env.SEED_ADMIN_EMAIL} / ${env.SEED_ADMIN_PASSWORD}`);
  console.log(`  Particulier     jm.kouassi@gmail.com / ${DEMO_PASSWORD}`);
  console.log(`  Entreprise B2B  a.toure@orange.ci / ${DEMO_PASSWORD}`);
  console.log(`  Chauffeur       ibrahim.kone@nyokah.ci / ${DEMO_PASSWORD}\n`);
}

main()
  .catch((error) => {
    console.error("Echec de l'initialisation :", error);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
