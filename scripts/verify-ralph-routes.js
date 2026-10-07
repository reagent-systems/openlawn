#!/usr/bin/env node
/**
 * Headless check that seeded emulator data can produce a daily route.
 */
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';

const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'openlawn';
const COMPANY_ID = 'company-ralph-test';
const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

if (!admin.getApps().length) {
  admin.initializeApp({ projectId: PROJECT_ID });
}

const db = getFirestore();

function weekday(date) {
  return DAYS[date.getDay()];
}

function isAvailable(user, day) {
  const slot = user.schedule?.[day];
  if (!slot || slot.available === false) return false;
  return Boolean(slot.start && slot.end);
}

function needsService(customer, date) {
  if (customer.status !== 'active') return false;
  const preferred = customer.servicePreferences?.preferredDays;
  const days = Array.isArray(preferred) && preferred.length ? preferred : DAYS;
  if (!days.includes(weekday(date))) return false;
  return true;
}

function canService(capabilities, customer) {
  const types = (customer.services || []).map((s) => s.type);
  if (!capabilities.length) return types.length > 0;
  return types.some((type) => capabilities.includes(type));
}

async function main() {
  const date = new Date();
  const day = weekday(date);

  const usersSnap = await db.collection('users').where('companyId', '==', COMPANY_ID).get();
  const customersSnap = await db.collection('customers').where('companyId', '==', COMPANY_ID).get();
  const users = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const customers = customersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const crews = new Map();
  for (const user of users) {
    if (user.crewId && isAvailable(user, day)) {
      if (!crews.has(user.crewId)) {
        crews.set(user.crewId, { members: [], capabilities: new Set() });
      }
      const crew = crews.get(user.crewId);
      crew.members.push(user.name);
      (user.crewServiceTypes || []).forEach((t) => crew.capabilities.add(t));
    }
  }

  const needing = customers.filter((c) => needsService(c, date));
  const routes = [];
  for (const [crewId, crew] of crews) {
    const capabilities = Array.from(crew.capabilities);
    const stops = needing.filter((c) => canService(capabilities, c)).map((c) => c.name);
    routes.push({ crewId, members: crew.members, capabilities, stops });
  }

  const result = {
    day,
    crews: routes,
    routedStops: routes.reduce((n, r) => n + r.stops.length, 0),
    ok: routes.some((r) => r.stops.length > 0),
  };

  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
