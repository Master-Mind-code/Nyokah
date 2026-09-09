/**
 * Test de bout en bout du parcours metier Nyokah.
 * Prerequis : base migree + seedee, API demarree (npm run dev).
 *
 *   node test/smoke.mjs [http://localhost:4000]
 */
const BASE = (process.argv[2] ?? 'http://localhost:4000') + '/api/v1';

let passed = 0;
let failed = 0;

function check(label, condition, detail) {
  if (condition) {
    passed++;
    console.log(`  OK   ${label}`);
  } else {
    failed++;
    console.log(`  ECHEC ${label}${detail ? ` -> ${JSON.stringify(detail).slice(0, 300)}` : ''}`);
  }
}

async function api(method, path, { token, body } = {}) {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  const json = await response.json().catch(() => null);
  return { status: response.status, json };
}

function isoDay(offsetDays) {
  const d = new Date(Date.now() + offsetDays * 86_400_000);
  return d.toISOString().slice(0, 10);
}

async function main() {
  console.log(`\nParcours de bout en bout sur ${BASE}\n`);

  // --- Authentification ---------------------------------------------------
  console.log('Authentification');
  const admin = await api('POST', '/auth/login', {
    body: { email: 'admin@nyokah.ci', password: 'Nyokah@2026' }
  });
  check('connexion administrateur', admin.status === 200 && !!admin.json?.accessToken, admin.json);
  const adminToken = admin.json?.accessToken;

  const badLogin = await api('POST', '/auth/login', {
    body: { email: 'admin@nyokah.ci', password: 'mauvais-mot-de-passe' }
  });
  check('mot de passe invalide rejete', badLogin.status === 401);

  const uniqueEmail = `client.test.${Date.now()}@nyokah.ci`;
  const register = await api('POST', '/auth/register/individual', {
    body: {
      fullName: 'Client de Test',
      email: uniqueEmail,
      phone: '+225 07 00 00 00 01',
      password: 'MotDePasse@2026',
      district: 'Cocody'
    }
  });
  check('inscription particulier', register.status === 201, register.json);
  check('points de bienvenue credites', register.json?.user?.loyaltyPoints === 500, register.json?.user);
  const clientToken = register.json?.accessToken;

  const noAuth = await api('GET', '/bookings');
  check('acces sans jeton refuse', noAuth.status === 401);

  const forbidden = await api('GET', '/users', { token: clientToken });
  check('acces admin refuse a un client', forbidden.status === 403, forbidden.json);

  // --- Catalogue ----------------------------------------------------------
  console.log('\nCatalogue');
  const catalog = await api('GET', '/vehicles?pageSize=50');
  check('catalogue public accessible', catalog.status === 200 && catalog.json.data.length >= 12, {
    count: catalog.json?.data?.length
  });

  const berlines = await api('GET', '/vehicles?category=Berline');
  check(
    'filtre par categorie (libelle francais)',
    berlines.status === 200 && berlines.json.data.every((v) => v.category === 'Berline'),
    berlines.json?.data?.map((v) => v.category)
  );

  const inMaintenance = catalog.json.data.find((v) => v.status === 'Entretien');
  check('vehicule en entretien expose son statut', !!inMaintenance);

  const vehicle = catalog.json.data.find((v) => v.plateNumber === '8945 KK 01');
  check('vehicule Prado present', !!vehicle);

  // --- Devis --------------------------------------------------------------
  console.log('\nMoteur tarifaire');
  const start = isoDay(10);
  const end = isoDay(13); // 3 jours -> palier volume -5 %

  const quote = await api('POST', '/pricing/quote', {
    body: {
      vehicleId: vehicle.id,
      startDate: start,
      endDate: end,
      formula: 'Journée (8h-18h)',
      fuelIncluded: true
    }
  });

  const q = quote.json?.quote;
  check('devis calcule', quote.status === 200 && !!q, quote.json);
  check('duree = 3 jours', q?.durationDays === 3, q?.durationDays);
  check('tarif de base = 55 000 FCFA', q?.baseRate === 55_000, q?.baseRate);
  check('prix de base = 165 000 FCFA', q?.basePrice === 165_000, q?.basePrice);
  check('option carburant = 75 000 FCFA (3 x 25 000)', q?.fuelOptionCost === 75_000, q?.fuelOptionCost);
  check('remise volume 3 jours = 5 %', q?.discountPercentage === 5, q?.discountReason);
  check('TVA 18 % appliquee', q?.taxRate === 0.18, q?.taxRate);

  const expectedGross = 165_000 + 75_000;
  const expectedDiscount = Math.round((expectedGross * 5) / 100);
  const expectedSubtotal = expectedGross - expectedDiscount;
  const expectedTotal = expectedSubtotal + Math.round(expectedSubtotal * 0.18);
  check(`total TTC coherent (${expectedTotal})`, q?.totalAmount === expectedTotal, {
    recu: q?.totalAmount,
    attendu: expectedTotal
  });

  // Le code entreprise -20 % doit primer sur la remise volume -5 %.
  const b2bQuote = await api('POST', '/pricing/quote', {
    body: {
      vehicleId: vehicle.id,
      startDate: start,
      endDate: end,
      formula: 'Journée (8h-18h)',
      fuelIncluded: true,
      promoCode: 'ORANGE20'
    }
  });
  check(
    'code promo non attribuable rejete pour un client hors entreprise',
    b2bQuote.json?.quote?.discountPercentage === 5,
    b2bQuote.json?.quote?.discountReason
  );

  const genericPromo = await api('POST', '/promos/validate', {
    body: {
      code: 'VOLUME7',
      vehicleId: vehicle.id,
      startDate: start,
      endDate: end,
      formula: 'Journée (8h-18h)',
      fuelIncluded: false
    }
  });
  check(
    'code VOLUME7 refuse en dessous de 5 jours',
    genericPromo.json?.valid === false,
    genericPromo.json
  );

  // --- Reservation --------------------------------------------------------
  console.log('\nReservation');
  const booking = await api('POST', '/bookings', {
    token: clientToken,
    body: {
      vehicleId: vehicle.id,
      startDate: start,
      endDate: end,
      startTime: '08:00',
      endTime: '18:00',
      pickupLocation: 'Aéroport Félix-Houphouët-Boigny (FHB), Abidjan',
      dropoffLocation: 'Sofitel Abidjan Hôtel Ivoire, Cocody',
      formula: 'Journée (8h-18h)',
      fuelIncluded: true,
      flightNumber: 'AF 702'
    }
  });

  check('reservation creee', booking.status === 201, booking.json);
  const b = booking.json?.booking;
  check('reference RES-XXXX generee', /^RES-\d{4}$/.test(b?.reference ?? ''), b?.reference);
  check('statut initial "En attente"', b?.status === 'En attente', b?.status);
  check('montant recalcule cote serveur', b?.totalAmount === expectedTotal, b?.totalAmount);

  const conflict = await api('POST', '/bookings', {
    token: clientToken,
    body: {
      vehicleId: vehicle.id,
      startDate: isoDay(11),
      endDate: isoDay(12),
      startTime: '08:00',
      endTime: '18:00',
      pickupLocation: 'Plateau, Abidjan',
      dropoffLocation: 'Cocody, Abidjan',
      formula: 'Journée (8h-18h)',
      fuelIncluded: false
    }
  });
  check('double reservation du meme vehicule refusee (409)', conflict.status === 409, conflict.json);

  const availability = await api(
    'GET',
    `/vehicles/${vehicle.id}/availability?startDate=${isoDay(11)}&endDate=${isoDay(12)}`
  );
  check('disponibilite signale le conflit', availability.json?.available === false, availability.json);

  const filtered = await api('GET', `/vehicles?availableFrom=${isoDay(11)}&availableTo=${isoDay(12)}`);
  check(
    'catalogue filtre exclut le vehicule reserve',
    !filtered.json?.data?.some((v) => v.id === vehicle.id)
  );

  // --- Affectation --------------------------------------------------------
  console.log('\nDispatch');
  const drivers = await api('GET', `/bookings/${b.id}/available-drivers`, { token: adminToken });
  check('chauffeurs disponibles proposes', (drivers.json?.data?.length ?? 0) > 0, drivers.json);
  const driverId = drivers.json.data[0].id;

  const assign = await api('POST', `/bookings/${b.id}/assign`, {
    token: adminToken,
    body: { driverId }
  });
  check('chauffeur affecte', assign.status === 200, assign.json);
  check('reservation confirmee automatiquement', assign.json?.booking?.status === 'Confirmée');
  check('course creee', /^RIDE-\d{4}$/.test(assign.json?.ride?.reference ?? ''), assign.json?.ride);
  const rideId = assign.json?.ride?.id;

  const doubleAssign = await api('POST', `/bookings/${b.id}/assign`, {
    token: adminToken,
    body: { driverId }
  });
  check('reaffectation du meme chauffeur toleree', doubleAssign.status === 200, doubleAssign.json);

  const illegalTransition = await api('PATCH', `/bookings/${b.id}/status`, {
    token: adminToken,
    body: { status: 'Terminée' }
  });
  check(
    'transition Confirmée -> Terminée refusee (409)',
    illegalTransition.status === 409,
    illegalTransition.json
  );

  // --- Paiement -----------------------------------------------------------
  console.log('\nPaiement');
  const payment = await api('POST', '/payments', {
    token: clientToken,
    body: { bookingId: b.id }
  });
  check('paiement initie', payment.status === 201, payment.json);
  check('lien de paiement fourni', !!payment.json?.checkoutUrl, payment.json);
  const paymentRef = payment.json?.payment?.reference;

  const simulate = await api('POST', `/payments/${paymentRef}/simulate`, {
    body: { outcome: 'success' }
  });
  check('paiement confirme', simulate.json?.payment?.status === 'Réussi', simulate.json);

  const replay = await api('POST', `/payments/${paymentRef}/simulate`, {
    body: { outcome: 'success' }
  });
  check('rejeu du paiement idempotent', replay.json?.payment?.status === 'Réussi', replay.json);

  const overpay = await api('POST', '/payments', {
    token: clientToken,
    body: { bookingId: b.id }
  });
  check('second paiement refuse (deja solde)', overpay.status === 409, overpay.json);

  // --- Execution de la course --------------------------------------------
  console.log('\nExecution de la mission');
  const started = await api('PATCH', `/rides/${rideId}/status`, {
    token: adminToken,
    body: { status: 'En cours', startMileage: 32_100 }
  });
  check('course demarree', started.json?.ride?.status === 'En cours', started.json);

  const bookingInProgress = await api('GET', `/bookings/${b.id}`, { token: adminToken });
  check(
    'reservation passee "En cours" automatiquement',
    bookingInProgress.json?.booking?.status === 'En cours',
    bookingInProgress.json?.booking?.status
  );

  const badMileage = await api('PATCH', `/rides/${rideId}/status`, {
    token: adminToken,
    body: { status: 'Terminée', endMileage: 30_000 }
  });
  check('kilometrage de fin incoherent refuse', badMileage.status === 409, badMileage.json);

  const completed = await api('PATCH', `/rides/${rideId}/status`, {
    token: adminToken,
    body: { status: 'Terminée', endMileage: 32_650 }
  });
  check('course terminee', completed.json?.ride?.status === 'Terminée', completed.json);
  check('distance calculee (550 km)', completed.json?.ride?.distanceKm === 550, completed.json?.ride);

  const finalBooking = await api('GET', `/bookings/${b.id}`, { token: adminToken });
  check(
    'reservation cloturee',
    finalBooking.json?.booking?.status === 'Terminée',
    finalBooking.json?.booking?.status
  );
  check('facture emise automatiquement', !!finalBooking.json?.booking?.invoiceId);
  check(
    'historique de statuts trace',
    (finalBooking.json?.statusHistory?.length ?? 0) >= 3,
    finalBooking.json?.statusHistory
  );

  const vehicleAfter = await api('GET', `/vehicles/${vehicle.id}`);
  check(
    'vehicule libere apres la mission',
    vehicleAfter.json?.vehicle?.status === 'Disponible',
    vehicleAfter.json?.vehicle?.status
  );
  check(
    'compteur kilometrique mis a jour',
    vehicleAfter.json?.vehicle?.currentMileage === 32_650,
    vehicleAfter.json?.vehicle?.currentMileage
  );

  // --- Fidelite -----------------------------------------------------------
  console.log('\nFidelite et facturation');
  const loyalty = await api('GET', '/users/me/loyalty', { token: clientToken });
  const expectedPoints = 500 + Math.floor(expectedTotal / 1000);
  check(
    `points de fidelite credites (${expectedPoints})`,
    loyalty.json?.loyaltyPoints === expectedPoints,
    loyalty.json
  );
  check('palier fidelite Silver (769 pts)', loyalty.json?.tier === 'Silver', loyalty.json?.tier);

  const invoices = await api('GET', '/invoices', { token: clientToken });
  check('facture visible par le client', (invoices.json?.data?.length ?? 0) === 1, invoices.json?.meta);
  const invoice = invoices.json?.data?.[0];
  check('facture soldee', invoice?.status === 'Payée', invoice?.status);
  check('numero de facture FAC-AAAA-XXXX', /^FAC-\d{4}-\d{4}$/.test(invoice?.number ?? ''), invoice?.number);
  check('montant facture = montant reservation', invoice?.totalAmount === expectedTotal, invoice?.totalAmount);
  check('lignes de facture detaillees', (invoice?.lines?.length ?? 0) >= 3, invoice?.lines);

  // --- Avis ---------------------------------------------------------------
  console.log('\nAvis client');
  const review = await api('POST', '/reviews', {
    token: clientToken,
    body: { bookingId: b.id, rating: 5, comment: 'Chauffeur ponctuel, véhicule impeccable.' }
  });
  check('avis depose', review.status === 201, review.json);

  const duplicate = await api('POST', '/reviews', {
    token: clientToken,
    body: { bookingId: b.id, rating: 4 }
  });
  check('second avis refuse', duplicate.status === 409, duplicate.json);

  // --- Notifications ------------------------------------------------------
  console.log('\nNotifications');
  const notifications = await api('GET', '/notifications?pageSize=50', { token: clientToken });
  const types = (notifications.json?.data ?? []).map((n) => n.type);
  check('accuse de reception envoye', types.includes('booking_received'), types);
  check('validation envoyee', types.includes('booking_validated'), types);
  check('affectation chauffeur envoyee', types.includes('driver_assigned'), types);
  check('paiement notifie', types.includes('payment_received'), types);
  check('fin de mission notifiee', types.includes('trip_completed'), types);

  const outbox = await api('GET', '/notifications/outbox', { token: adminToken });
  check('file du simulateur consultable', (outbox.json?.data?.length ?? 0) > 0, outbox.json?.provider);

  // --- Pilotage -----------------------------------------------------------
  console.log('\nPilotage');
  const dashboard = await api('GET', '/analytics/dashboard', { token: adminToken });
  check('tableau de bord disponible', dashboard.status === 200, dashboard.json);
  check('chiffre d affaires consolide', (dashboard.json?.revenue?.period ?? 0) > 0, dashboard.json?.revenue);
  check('carnet de commandes expose', (dashboard.json?.revenue?.upcoming ?? -1) >= 0, dashboard.json?.revenue);
  check('flotte comptabilisee', (dashboard.json?.fleet?.total ?? 0) >= 12, dashboard.json?.fleet);

  const revenue = await api('GET', '/analytics/revenue?groupBy=month', { token: adminToken });
  check('serie de chiffre d affaires', (revenue.json?.series?.length ?? 0) > 0, revenue.json?.series);

  const fleet = await api('GET', '/analytics/fleet', { token: adminToken });
  check('performance de flotte calculee', (fleet.json?.vehicles?.length ?? 0) >= 12, fleet.json?.vehicles?.length);

  const audit = await api('GET', '/analytics/audit-log', { token: adminToken });
  check('journal d audit alimente', (audit.json?.data?.length ?? 0) > 0);

  // --- Annulation ---------------------------------------------------------
  console.log('\nAnnulation');
  const second = await api('POST', '/bookings', {
    token: clientToken,
    body: {
      vehicleId: vehicle.id,
      startDate: isoDay(40),
      endDate: isoDay(42),
      startTime: '09:00',
      endTime: '17:00',
      pickupLocation: 'Plateau, Abidjan',
      dropoffLocation: 'Bassam',
      formula: 'Journée (8h-18h)',
      fuelIncluded: false,
      promoCode: 'NYOKAH5'
    }
  });
  check('seconde reservation creee', second.status === 201, second.json);
  check('code promo NYOKAH5 applique', second.json?.booking?.discountPercentage === 5);

  const cancelled = await api('POST', `/bookings/${second.json.booking.id}/cancel`, {
    token: clientToken,
    body: { reason: 'Report de la mission' }
  });
  check('annulation par le client', cancelled.json?.booking?.status === 'Annulée', cancelled.json);

  const recheck = await api(
    'GET',
    `/vehicles/${vehicle.id}/availability?startDate=${isoDay(40)}&endDate=${isoDay(42)}`
  );
  check('creneau libere apres annulation', recheck.json?.available === true, recheck.json);

  // --- Cloisonnement des donnees -----------------------------------------
  console.log('\nCloisonnement des donnees');
  const b2b = await api('POST', '/auth/login', {
    body: { email: 'a.toure@orange.ci', password: 'Nyokah@2026' }
  });
  const b2bToken = b2b.json?.accessToken;
  check('connexion compte entreprise', b2b.status === 200, b2b.json);

  const otherBooking = await api('GET', `/bookings/${b.id}`, { token: b2bToken });
  check('reservation d un tiers inaccessible', otherBooking.status === 403, otherBooking.status);

  const b2bList = await api('GET', '/bookings', { token: b2bToken });
  check('liste entreprise vide (aucune reservation)', b2bList.json?.data?.length === 0, b2bList.json?.meta);

  const b2bQuoteScoped = await api('POST', '/pricing/quote', {
    token: b2bToken,
    body: {
      vehicleId: vehicle.id,
      startDate: isoDay(60),
      endDate: isoDay(61),
      formula: 'Journée (8h-18h)',
      fuelIncluded: false
    }
  });
  check(
    'remise contractuelle Orange (-20 %) appliquee automatiquement',
    b2bQuoteScoped.json?.quote?.discountPercentage === 20,
    b2bQuoteScoped.json?.quote?.discountReason
  );

  // --- Parametres ---------------------------------------------------------
  console.log('\nParametres');
  const settings = await api('GET', '/settings', { token: adminToken });
  check('parametres accessibles a l administrateur', settings.status === 200, settings.json);
  check('grille tarifaire exposee', settings.json?.pricing?.vatRate === 0.18, settings.json?.pricing);
  check('parametres generaux exposes', !!settings.json?.general?.supportPhone, settings.json?.general);
  check('valeurs par defaut fournies', !!settings.json?.defaults?.general, Object.keys(settings.json?.defaults ?? {}));
  check('informations systeme exposees', !!settings.json?.system?.paymentProvider, settings.json?.system);

  const settingsForbidden = await api('GET', '/settings', { token: clientToken });
  check('parametres inaccessibles a un client', settingsForbidden.status === 403);

  // Un parametre modifie doit changer le comportement du domaine, pas seulement la base.
  const original = settings.json.general;
  const customPhone = '+225 27 00 00 00 42';

  const updated = await api('PUT', '/settings/general', {
    token: adminToken,
    body: { ...original, supportPhone: customPhone, bookingLeadTimeHours: 6 }
  });
  check('parametres generaux enregistres', updated.json?.general?.supportPhone === customPhone, updated.json);

  const guarded = await api('POST', '/bookings', {
    token: clientToken,
    body: {
      vehicleId: vehicle.id,
      startDate: isoDay(0),
      endDate: isoDay(0),
      startTime: '00:01',
      endTime: '23:00',
      pickupLocation: 'Plateau, Abidjan',
      dropoffLocation: 'Cocody, Abidjan',
      formula: 'Journée (8h-18h)',
      fuelIncluded: false
    }
  });
  check('delai de prevenance applique (422)', guarded.status === 422, guarded.json?.error?.message);

  // Le nouveau numero doit apparaitre dans les messages sortants.
  const freshEmail = `param.${Date.now()}@nyokah.ci`;
  const freshUser = await api('POST', '/auth/register/individual', {
    body: {
      fullName: 'Contrôle Paramètres',
      email: freshEmail,
      phone: '+225 07 00 00 00 02',
      password: 'MotDePasse@2026'
    }
  });
  const freshNotifs = await api('GET', '/notifications?pageSize=5', {
    token: freshUser.json?.accessToken
  });
  const welcome = (freshNotifs.json?.data ?? []).find((n) => n.type === 'account_welcome');
  check(
    'coordonnees de conciergerie reprises dans les messages',
    welcome?.messageBody?.includes(customPhone),
    welcome?.messageBody?.slice(-120)
  );

  const reset = await api('POST', '/settings/general/reset', { token: adminToken });
  check(
    'reinitialisation des parametres generaux',
    reset.json?.general?.supportPhone === '+225 27 20 21 00 00',
    { status: reset.status, body: reset.json }
  );

  // --- Resultat -----------------------------------------------------------
  console.log(`\n${passed} verifications reussies, ${failed} echec(s).\n`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error('\nErreur pendant le test :', error);
  process.exit(1);
});
