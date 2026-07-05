// ============================================================================
// Bridges the in-memory AppData shape (nested objects/arrays, exactly what
// every page already expects) with the normalized Supabase/Postgres schema
// defined in supabase/schema.sql. Pages never talk to Supabase directly —
// only DataContext calls into this module.
// ============================================================================

import { supabase } from './supabaseClient';
import type { AppData } from './mockData';
import type {
  Trainer, Timing, Subscription, Player, Parent, Worker, Expense, CaisseTransaction,
  Activity, MoneyEntry, StaffPayment, Payment, MedicalRecord, AssignedSubscription, ClubContact, ClubInfo,
  AttendanceRecord, PlayerEvaluation, PlayerInsurance, Match, MatchExpense, Doctor,
} from './types';

// keys of AppData that are plain arrays managed through add/updateItem/remove
export type Collections = {
  [K in keyof AppData]: AppData[K] extends Array<infer _T> ? K : never;
}[keyof AppData];

const TABLE_MAP: Record<Collections, string> = {
  categories: 'categories',
  groups: 'player_groups',
  sports: 'sports',
  stadiums: 'stadiums',
  roles: 'roles',
  expenseCategories: 'expense_categories',
  insuranceTypes: 'insurance_types',
  trainers: 'trainers',
  timings: 'timings',
  subscriptions: 'subscriptions',
  players: 'players',
  parents: 'parents',
  workers: 'workers',
  doctors: 'doctors',
  matches: 'matches',
  expenses: 'expenses',
  transactions: 'caisse_transactions',
  activities: 'activities',
};

const NAME_ONLY: ReadonlySet<Collections> = new Set([
  'categories', 'groups', 'sports', 'stadiums', 'roles', 'expenseCategories', 'insuranceTypes',
]);

// Mirrors the `on delete set null` foreign keys in supabase/schema.sql. When a row in one
// of these collections is deleted, Postgres nulls the referencing column server-side, but
// the client's in-memory cache doesn't know that — so a later edit of the (now-orphaned)
// dependent row would resend the stale id and fail with a foreign-key violation. Applied
// locally after a successful delete in DataContext.remove() to keep the cache consistent.
export const CASCADE_SET_NULL: Partial<Record<Collections, { collection: Collections; field: string }[]>> = {
  categories: [{ collection: 'timings', field: 'categoryId' }, { collection: 'matches', field: 'categoryId' }],
  groups: [{ collection: 'timings', field: 'groupId' }],
  sports: [{ collection: 'timings', field: 'sportId' }],
  stadiums: [{ collection: 'timings', field: 'stadiumId' }, { collection: 'matches', field: 'stadiumId' }],
  trainers: [{ collection: 'timings', field: 'trainerId' }],
  timings: [{ collection: 'subscriptions', field: 'timingId' }],
  parents: [{ collection: 'players', field: 'parentId' }],
  roles: [{ collection: 'workers', field: 'roleId' }],
  expenseCategories: [{ collection: 'expenses', field: 'categoryId' }],
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

async function checkErr<T extends { error: { message: string } | null }>(p: PromiseLike<T>): Promise<T> {
  const res = await p;
  if (res.error) throw new Error(res.error.message || 'Supabase request failed');
  return res;
}

export function emptyAppData(): AppData {
  return {
    categories: [], groups: [], sports: [], stadiums: [], roles: [], expenseCategories: [], insuranceTypes: [],
    trainers: [], timings: [], subscriptions: [], players: [], parents: [], workers: [], doctors: [], matches: [],
    expenses: [], transactions: [], activities: [],
    contact: { facebook: '', instagram: '', tiktok: '', map: '', phone: '', whatsapp: '', email: '' },
    club: { logo: '', cachet: '', name: '', description: '', email: '', phone: '', address: '', nif: '', nis: '', article: '', rc: '', regFeeAmount: 0 },
  };
}

// ============================== row -> app mappers ==============================

const mapMoneyEntry = (r: Row): MoneyEntry => ({ id: r.id, amount: r.amount, description: r.description || '', date: r.date });

const mapStaffPayment = (r: Row): StaffPayment => ({
  id: r.id, date: r.date, description: r.description || '', amount: r.amount,
  monthsCovered: r.months_covered || [], acompteIds: r.acompte_ids || [], absenceIds: r.absence_ids || [],
  subscriptionIds: r.subscription_ids || [],
});

const mapPlayerPayment = (r: Row): Payment => ({ id: r.id, date: r.date, amount: r.amount, note: r.note || '', kind: r.kind });

const mapMedicalRecord = (r: Row): MedicalRecord => ({ id: r.id, status: !!r.status, description: r.description || '', date: r.date, doctorId: r.doctor_id || undefined });

const mapAttendanceRecord = (r: Row): AttendanceRecord => ({ id: r.id, timingId: r.timing_id || '', date: r.date, status: r.status, scannedAt: r.scanned_at || undefined });

const mapPlayerEvaluation = (r: Row): PlayerEvaluation => ({
  id: r.id, date: r.date, speed: r.speed ?? 0, ballControl: r.ball_control ?? 0, dribbling: r.dribbling ?? 0,
  passing: r.passing ?? 0, fitness: r.fitness ?? 0, discipline: r.discipline ?? 0, description: r.description || '',
});

const mapPlayerInsurance = (r: Row): PlayerInsurance => ({
  id: r.id, typeId: r.type_id || '', price: r.price ?? 0, startDate: r.start_date, endDate: r.end_date, description: r.description || '',
});

const mapMatchExpense = (r: Row): MatchExpense => ({ id: r.id, name: r.name, amount: r.amount ?? 0 });

function mapMatch(r: Row, expenseRows: Row[]): Match {
  return {
    id: r.id, categoryId: r.category_id || '', stadiumId: r.stadium_id || '', matchDate: r.match_date,
    opponent: r.opponent || '', description: r.description || '',
    expenses: expenseRows.filter((e) => e.match_id === r.id).map(mapMatchExpense),
    createdAt: r.created_at,
  };
}

function mapDoctor(r: Row, moneyRows: Row[], paymentRows: Row[]): Doctor {
  const mine = moneyRows.filter((m) => m.doctor_id === r.id);
  return {
    id: r.id, fullName: r.full_name, phone: r.phone || '', address: r.address || '',
    payType: r.pay_type, payAmount: r.pay_amount ?? 0, accountActive: r.account_active,
    email: r.email || undefined, username: r.username || undefined, createdAt: r.created_at,
    acomptes: mine.filter((m) => m.kind === 'acompte').map(mapMoneyEntry),
    absences: mine.filter((m) => m.kind === 'absence').map(mapMoneyEntry),
    payments: paymentRows.filter((p) => p.doctor_id === r.id).map(mapStaffPayment),
  };
}

const mapSubscription = (r: Row): Subscription => ({
  id: r.id, name: r.name, timingId: r.timing_id || '', periodDays: r.period_days,
  totalSeances: r.total_seances, pricePerSeance: r.price_per_seance, totalPrice: r.total_price,
});

const mapTiming = (r: Row): Timing => ({
  id: r.id, name: r.name, categoryId: r.category_id || '', groupId: r.group_id || '',
  sportId: r.sport_id || '', stadiumId: r.stadium_id || '', trainerId: r.trainer_id || '',
  days: r.days || [], startTime: r.start_time || '', endTime: r.end_time || '',
});

interface PlayerChildRows {
  payments: Row[];
  medical: Row[];
  attendance: Row[];
  evaluations: Row[];
  insurances: Row[];
}

function mapPlayer(r: Row, rel: PlayerChildRows): Player {
  const assignedSubscription: AssignedSubscription | undefined = r.sub_subscription_id
    ? {
      subscriptionId: r.sub_subscription_id, timingId: r.sub_timing_id, startDate: r.sub_start_date,
      expiryDate: r.sub_expiry_date, price: r.sub_price, amountPaid: r.sub_amount_paid,
      rest: r.sub_rest, status: r.sub_status,
    }
    : undefined;
  return {
    id: r.id, firstName: r.first_name, lastName: r.last_name, birthDate: r.birth_date || '',
    birthPlace: r.birth_place || '', address: r.address || '', phone: r.phone || '', email: r.email || '',
    parentId: r.parent_id || undefined, createdAt: r.created_at, subscriptionCostPaid: r.subscription_cost_paid,
    photoUrl: r.photo_url || '', documentUrls: r.document_urls || [],
    assignedSubscription,
    payments: rel.payments.filter((p) => p.player_id === r.id).map(mapPlayerPayment),
    medicalRecords: rel.medical.filter((m) => m.player_id === r.id).map(mapMedicalRecord),
    attendanceRecords: rel.attendance.filter((a) => a.player_id === r.id).map(mapAttendanceRecord),
    evaluations: rel.evaluations.filter((e) => e.player_id === r.id).map(mapPlayerEvaluation),
    insurances: rel.insurances.filter((i) => i.player_id === r.id).map(mapPlayerInsurance),
  };
}

function mapParent(r: Row, players: Player[]): Parent {
  return {
    id: r.id, firstName: r.first_name, lastName: r.last_name, phone: r.phone || '',
    address: r.address || '', email: r.email || '',
    playerIds: players.filter((p) => p.parentId === r.id).map((p) => p.id),
  };
}

function mapTrainer(r: Row, moneyRows: Row[], paymentRows: Row[], timingsByTrainer: Map<string, string[]>): Trainer {
  const mine = moneyRows.filter((m) => m.trainer_id === r.id);
  return {
    id: r.id, fullName: r.full_name, phone: r.phone || '', email: r.email || '', address: r.address || '',
    paymentType: r.payment_type, monthlyAmount: r.monthly_amount ?? undefined, percentage: r.percentage ?? undefined,
    timingIds: timingsByTrainer.get(r.id) || [],
    acomptes: mine.filter((m) => m.kind === 'acompte').map(mapMoneyEntry),
    absences: mine.filter((m) => m.kind === 'absence').map(mapMoneyEntry),
    payments: paymentRows.filter((p) => p.trainer_id === r.id).map(mapStaffPayment),
    createdAt: r.created_at,
  };
}

function mapWorker(r: Row, moneyRows: Row[], paymentRows: Row[]): Worker {
  const mine = moneyRows.filter((m) => m.worker_id === r.id);
  return {
    id: r.id, fullName: r.full_name, birthDate: r.birth_date || '', idCard: r.id_card || undefined,
    phone: r.phone || '', roleId: r.role_id || '', payActive: r.pay_active, payType: r.pay_type,
    payAmount: r.pay_amount, accountActive: r.account_active, email: r.email || undefined,
    username: r.username || undefined, permissions: r.permissions || { pages: [], actions: {} },
    startDate: r.start_date,
    acomptes: mine.filter((m) => m.kind === 'acompte').map(mapMoneyEntry),
    absences: mine.filter((m) => m.kind === 'absence').map(mapMoneyEntry),
    payments: paymentRows.filter((p) => p.worker_id === r.id).map(mapStaffPayment),
  };
}

const mapExpense = (r: Row): Expense => ({ id: r.id, name: r.name, categoryId: r.category_id || '', description: r.description || '', amount: r.amount, date: r.date });
const mapTransaction = (r: Row): CaisseTransaction => ({ id: r.id, type: r.type, amount: r.amount, date: r.date, description: r.description || '' });
const mapActivity = (r: Row): Activity => ({ id: r.id, name: r.name, description: r.description || '', image: r.image || 'grad-1' });
const mapClub = (r: Row): ClubInfo => ({ logo: r.logo_url || '', cachet: r.cachet_url || '', name: r.name || '', description: r.description || '', email: r.email || '', phone: r.phone || '', address: r.address || '', nif: r.nif || '', nis: r.nis || '', article: r.article || '', rc: r.rc || '', regFeeAmount: r.reg_fee_amount ?? 0 });
const mapContact = (r: Row): ClubContact => ({ facebook: r.facebook || '', instagram: r.instagram || '', tiktok: r.tiktok || '', map: r.map || '', phone: r.phone || '', whatsapp: r.whatsapp || '', email: r.email || '' });

// ============================== fetching ==============================

/** Public data only — used when nobody is logged in (e.g. the /website page). */
export async function fetchPublicData(): Promise<Pick<AppData, 'club' | 'contact' | 'activities'>> {
  const [club, contact, activities] = await Promise.all([
    supabase.from('club_info').select('*').eq('id', 1).maybeSingle(),
    supabase.from('club_contact').select('*').eq('id', 1).maybeSingle(),
    supabase.from('activities').select('*'),
  ]);
  return {
    club: club.data ? mapClub(club.data) : emptyAppData().club,
    contact: contact.data ? mapContact(contact.data) : emptyAppData().contact,
    activities: (activities.data || []).map(mapActivity),
  };
}

/** Full dataset — used once a user (admin or worker) is signed in. */
export async function fetchAllData(): Promise<AppData> {
  const results = await Promise.all([
    supabase.from('categories').select('*'),
    supabase.from('player_groups').select('*'),
    supabase.from('sports').select('*'),
    supabase.from('stadiums').select('*'),
    supabase.from('roles').select('*'),
    supabase.from('expense_categories').select('*'),
    supabase.from('insurance_types').select('*'),
    supabase.from('trainers').select('*'),
    supabase.from('trainer_money_entries').select('*'),
    supabase.from('trainer_payments').select('*'),
    supabase.from('timings').select('*'),
    supabase.from('subscriptions').select('*'),
    supabase.from('parents').select('*'),
    supabase.from('players').select('*'),
    supabase.from('player_payments').select('*'),
    supabase.from('player_medical_records').select('*'),
    supabase.from('attendance_records').select('*'),
    supabase.from('player_evaluations').select('*'),
    supabase.from('player_insurances').select('*'),
    supabase.from('workers').select('*'),
    supabase.from('worker_money_entries').select('*'),
    supabase.from('worker_payments').select('*'),
    supabase.from('doctors').select('*'),
    supabase.from('doctor_money_entries').select('*'),
    supabase.from('doctor_payments').select('*'),
    supabase.from('matches').select('*'),
    supabase.from('match_expenses').select('*'),
    supabase.from('expenses').select('*'),
    supabase.from('caisse_transactions').select('*'),
    supabase.from('activities').select('*'),
    supabase.from('club_info').select('*').eq('id', 1).maybeSingle(),
    supabase.from('club_contact').select('*').eq('id', 1).maybeSingle(),
  ] as const);

  const [
    categories, groups, sports, stadiums, roles, expenseCategories, insuranceTypes,
    trainers, trainerMoney, trainerPayments, timings, subscriptions, parents,
    players, playerPayments, playerMedical, playerAttendance, playerEvaluations, playerInsurances,
    workers, workerMoney, workerPayments, doctors, doctorMoney, doctorPayments,
    matches, matchExpenses, expenses, transactions, activities, club, contact,
  ] = results;

  for (const r of results) if (r.error) throw new Error(r.error.message);

  const timingsMapped = (timings.data || []).map(mapTiming);
  const timingsByTrainer = new Map<string, string[]>();
  for (const tm of timingsMapped) {
    if (!tm.trainerId) continue;
    const arr = timingsByTrainer.get(tm.trainerId) || [];
    arr.push(tm.id);
    timingsByTrainer.set(tm.trainerId, arr);
  }

  const playersMapped = (players.data || []).map((p) => mapPlayer(p, {
    payments: playerPayments.data || [],
    medical: playerMedical.data || [],
    attendance: playerAttendance.data || [],
    evaluations: playerEvaluations.data || [],
    insurances: playerInsurances.data || [],
  }));

  return {
    categories: categories.data || [],
    groups: groups.data || [],
    sports: sports.data || [],
    stadiums: stadiums.data || [],
    roles: roles.data || [],
    expenseCategories: expenseCategories.data || [],
    insuranceTypes: insuranceTypes.data || [],
    trainers: (trainers.data || []).map((t) => mapTrainer(t, trainerMoney.data || [], trainerPayments.data || [], timingsByTrainer)),
    timings: timingsMapped,
    subscriptions: (subscriptions.data || []).map(mapSubscription),
    players: playersMapped,
    parents: (parents.data || []).map((p) => mapParent(p, playersMapped)),
    workers: (workers.data || []).map((w) => mapWorker(w, workerMoney.data || [], workerPayments.data || [])),
    doctors: (doctors.data || []).map((d) => mapDoctor(d, doctorMoney.data || [], doctorPayments.data || [])),
    matches: (matches.data || []).map((m) => mapMatch(m, matchExpenses.data || [])),
    expenses: (expenses.data || []).map(mapExpense),
    transactions: (transactions.data || []).map(mapTransaction),
    activities: (activities.data || []).map(mapActivity),
    contact: contact.data ? mapContact(contact.data) : emptyAppData().contact,
    club: club.data ? mapClub(club.data) : emptyAppData().club,
  };
}

// ============================== singleton (club / contact) ==============================

export async function upsertClub(c: ClubInfo): Promise<void> {
  await checkErr(supabase.from('club_info').upsert({
    id: 1, logo_url: c.logo, cachet_url: c.cachet, name: c.name, description: c.description, email: c.email, phone: c.phone,
    address: c.address, nif: c.nif, nis: c.nis, article: c.article, rc: c.rc, reg_fee_amount: c.regFeeAmount,
  }));
}

export async function upsertContact(c: ClubContact): Promise<void> {
  await checkErr(supabase.from('club_contact').upsert({
    id: 1, facebook: c.facebook, instagram: c.instagram, tiktok: c.tiktok, map: c.map,
    phone: c.phone, whatsapp: c.whatsapp, email: c.email,
  }));
}

// ============================== child-array diff sync ==============================

async function syncMoneyEntries(table: string, parentCol: string, parentId: string, kind: 'acompte' | 'absence', oldArr: MoneyEntry[], newArr: MoneyEntry[]) {
  const oldIds = new Set(oldArr.map((x) => x.id));
  const newIds = new Set(newArr.map((x) => x.id));
  const toInsert = newArr.filter((x) => !oldIds.has(x.id));
  const toDelete = oldArr.filter((x) => !newIds.has(x.id)).map((x) => x.id);
  if (toInsert.length) {
    await checkErr(supabase.from(table).insert(toInsert.map((e) => ({
      id: e.id, [parentCol]: parentId, kind, amount: e.amount, description: e.description, date: e.date,
    }))));
  }
  if (toDelete.length) await checkErr(supabase.from(table).delete().in('id', toDelete));
}

async function syncStaffPayments(table: string, parentCol: string, parentId: string, oldArr: StaffPayment[], newArr: StaffPayment[]) {
  const oldIds = new Set(oldArr.map((x) => x.id));
  const newIds = new Set(newArr.map((x) => x.id));
  const toInsert = newArr.filter((x) => !oldIds.has(x.id));
  const toDelete = oldArr.filter((x) => !newIds.has(x.id)).map((x) => x.id);
  if (toInsert.length) {
    await checkErr(supabase.from(table).insert(toInsert.map((p) => ({
      id: p.id, [parentCol]: parentId, date: p.date, description: p.description || '', amount: p.amount,
      months_covered: p.monthsCovered, acompte_ids: p.acompteIds, absence_ids: p.absenceIds,
      ...(table === 'trainer_payments' ? { subscription_ids: p.subscriptionIds || [] } : {}),
    }))));
  }
  if (toDelete.length) await checkErr(supabase.from(table).delete().in('id', toDelete));
}

async function syncPlayerPayments(playerId: string, oldArr: Payment[], newArr: Payment[]) {
  const oldIds = new Set(oldArr.map((x) => x.id));
  const newIds = new Set(newArr.map((x) => x.id));
  const toInsert = newArr.filter((x) => !oldIds.has(x.id));
  const toDelete = oldArr.filter((x) => !newIds.has(x.id)).map((x) => x.id);
  if (toInsert.length) {
    await checkErr(supabase.from('player_payments').insert(toInsert.map((p) => ({
      id: p.id, player_id: playerId, date: p.date, amount: p.amount, note: p.note || '', kind: p.kind,
    }))));
  }
  if (toDelete.length) await checkErr(supabase.from('player_payments').delete().in('id', toDelete));
}

async function syncMedicalRecords(playerId: string, oldArr: MedicalRecord[], newArr: MedicalRecord[]) {
  const oldIds = new Set(oldArr.map((x) => x.id));
  const newIds = new Set(newArr.map((x) => x.id));
  const toInsert = newArr.filter((x) => !oldIds.has(x.id));
  const toDelete = oldArr.filter((x) => !newIds.has(x.id)).map((x) => x.id);
  if (toInsert.length) {
    await checkErr(supabase.from('player_medical_records').insert(toInsert.map((m) => ({
      id: m.id, player_id: playerId, status: m.status, description: m.description, date: m.date, doctor_id: m.doctorId || null,
    }))));
  }
  if (toDelete.length) await checkErr(supabase.from('player_medical_records').delete().in('id', toDelete));
}

// Deletes run BEFORE inserts here: attendance_records has a unique (player_id,
// timing_id, date) constraint, and a manual override replaces the old record
// with a new id for the same day — the old row must be gone before the insert.
async function syncAttendanceRecords(playerId: string, oldArr: AttendanceRecord[], newArr: AttendanceRecord[]) {
  const oldById = new Map(oldArr.map((x) => [x.id, x]));
  const newIds = new Set(newArr.map((x) => x.id));
  const toInsert = newArr.filter((x) => !oldById.has(x.id));
  const toDelete = oldArr.filter((x) => !newIds.has(x.id)).map((x) => x.id);
  const toUpdate = newArr.filter((x) => {
    const prev = oldById.get(x.id);
    return prev && (prev.status !== x.status || prev.scannedAt !== x.scannedAt);
  });
  if (toDelete.length) await checkErr(supabase.from('attendance_records').delete().in('id', toDelete));
  for (const a of toUpdate) {
    await checkErr(supabase.from('attendance_records').update({ status: a.status, scanned_at: a.scannedAt || null }).eq('id', a.id));
  }
  if (toInsert.length) {
    await checkErr(supabase.from('attendance_records').insert(toInsert.map((a) => ({
      id: a.id, player_id: playerId, timing_id: a.timingId || null, date: a.date, status: a.status, scanned_at: a.scannedAt || null,
    }))));
  }
}

async function syncPlayerEvaluations(playerId: string, oldArr: PlayerEvaluation[], newArr: PlayerEvaluation[]) {
  const oldIds = new Set(oldArr.map((x) => x.id));
  const newIds = new Set(newArr.map((x) => x.id));
  const toInsert = newArr.filter((x) => !oldIds.has(x.id));
  const toDelete = oldArr.filter((x) => !newIds.has(x.id)).map((x) => x.id);
  if (toInsert.length) {
    await checkErr(supabase.from('player_evaluations').insert(toInsert.map((e) => ({
      id: e.id, player_id: playerId, date: e.date, speed: e.speed, ball_control: e.ballControl,
      dribbling: e.dribbling, passing: e.passing, fitness: e.fitness, discipline: e.discipline,
      description: e.description,
    }))));
  }
  if (toDelete.length) await checkErr(supabase.from('player_evaluations').delete().in('id', toDelete));
}

async function syncPlayerInsurances(playerId: string, oldArr: PlayerInsurance[], newArr: PlayerInsurance[]) {
  const oldIds = new Set(oldArr.map((x) => x.id));
  const newIds = new Set(newArr.map((x) => x.id));
  const toInsert = newArr.filter((x) => !oldIds.has(x.id));
  const toDelete = oldArr.filter((x) => !newIds.has(x.id)).map((x) => x.id);
  if (toInsert.length) {
    await checkErr(supabase.from('player_insurances').insert(toInsert.map((i) => ({
      id: i.id, player_id: playerId, type_id: i.typeId || null, price: i.price,
      start_date: i.startDate, end_date: i.endDate, description: i.description,
    }))));
  }
  if (toDelete.length) await checkErr(supabase.from('player_insurances').delete().in('id', toDelete));
}

async function syncMatchExpenses(matchId: string, oldArr: MatchExpense[], newArr: MatchExpense[]) {
  const oldIds = new Set(oldArr.map((x) => x.id));
  const newIds = new Set(newArr.map((x) => x.id));
  const toInsert = newArr.filter((x) => !oldIds.has(x.id));
  const toDelete = oldArr.filter((x) => !newIds.has(x.id)).map((x) => x.id);
  if (toInsert.length) {
    await checkErr(supabase.from('match_expenses').insert(toInsert.map((e) => ({
      id: e.id, match_id: matchId, name: e.name, amount: e.amount,
    }))));
  }
  if (toDelete.length) await checkErr(supabase.from('match_expenses').delete().in('id', toDelete));
}

// ============================== insert ==============================

export async function insertRow<K extends Collections>(key: K, item: AppData[K][number]): Promise<void> {
  if (NAME_ONLY.has(key)) {
    const it = item as { id: string; name: string };
    await checkErr(supabase.from(TABLE_MAP[key]).insert({ id: it.id, name: it.name }));
    return;
  }
  switch (key) {
    case 'trainers': {
      const t = item as Trainer;
      await checkErr(supabase.from('trainers').insert({
        id: t.id, full_name: t.fullName, phone: t.phone, email: t.email, address: t.address,
        payment_type: t.paymentType, monthly_amount: t.monthlyAmount ?? null, percentage: t.percentage ?? null,
        created_at: t.createdAt,
      }));
      return;
    }
    case 'timings': {
      const tm = item as Timing;
      await checkErr(supabase.from('timings').insert({
        id: tm.id, name: tm.name, category_id: tm.categoryId || null, group_id: tm.groupId || null,
        sport_id: tm.sportId || null, stadium_id: tm.stadiumId || null, trainer_id: tm.trainerId || null,
        days: tm.days, start_time: tm.startTime, end_time: tm.endTime,
      }));
      return;
    }
    case 'subscriptions': {
      const s = item as Subscription;
      await checkErr(supabase.from('subscriptions').insert({
        id: s.id, name: s.name, timing_id: s.timingId || null, period_days: s.periodDays,
        total_seances: s.totalSeances, price_per_seance: s.pricePerSeance, total_price: s.totalPrice,
      }));
      return;
    }
    case 'parents': {
      const p = item as Parent;
      await checkErr(supabase.from('parents').insert({
        id: p.id, first_name: p.firstName, last_name: p.lastName, phone: p.phone, address: p.address, email: p.email,
      }));
      return;
    }
    case 'players': {
      const p = item as Player;
      const a = p.assignedSubscription;
      await checkErr(supabase.from('players').insert({
        id: p.id, first_name: p.firstName, last_name: p.lastName, birth_date: p.birthDate || null,
        birth_place: p.birthPlace, address: p.address || '', phone: p.phone, email: p.email, parent_id: p.parentId || null,
        created_at: p.createdAt, subscription_cost_paid: p.subscriptionCostPaid,
        photo_url: p.photoUrl || '', document_urls: p.documentUrls || [],
        sub_subscription_id: a?.subscriptionId ?? null, sub_timing_id: a?.timingId ?? null,
        sub_start_date: a?.startDate ?? null, sub_expiry_date: a?.expiryDate ?? null,
        sub_price: a?.price ?? null, sub_amount_paid: a?.amountPaid ?? null, sub_rest: a?.rest ?? null,
        sub_status: a?.status ?? null,
      }));
      if (p.medicalRecords?.length) await syncMedicalRecords(p.id, [], p.medicalRecords);
      if (p.attendanceRecords?.length) await syncAttendanceRecords(p.id, [], p.attendanceRecords);
      if (p.evaluations?.length) await syncPlayerEvaluations(p.id, [], p.evaluations);
      if (p.insurances?.length) await syncPlayerInsurances(p.id, [], p.insurances);
      return;
    }
    case 'matches': {
      const m = item as Match;
      await checkErr(supabase.from('matches').insert({
        id: m.id, category_id: m.categoryId || null, stadium_id: m.stadiumId || null,
        match_date: m.matchDate, opponent: m.opponent, description: m.description, created_at: m.createdAt,
      }));
      if (m.expenses?.length) await syncMatchExpenses(m.id, [], m.expenses);
      return;
    }
    case 'doctors': {
      const d = item as Doctor;
      await checkErr(supabase.from('doctors').insert({
        id: d.id, full_name: d.fullName, phone: d.phone, address: d.address,
        pay_type: d.payType, pay_amount: d.payAmount, account_active: false, email: null, username: null,
        created_at: d.createdAt,
      }));
      return;
    }
    case 'workers': {
      const w = item as Worker;
      await checkErr(supabase.from('workers').insert({
        id: w.id, full_name: w.fullName, birth_date: w.birthDate || null, id_card: w.idCard || null,
        phone: w.phone, role_id: w.roleId || null, pay_active: w.payActive, pay_type: w.payType,
        pay_amount: w.payAmount, account_active: false, email: null, username: null,
        permissions: w.permissions, start_date: w.startDate,
      }));
      return;
    }
    case 'expenses': {
      const e = item as Expense;
      await checkErr(supabase.from('expenses').insert({
        id: e.id, name: e.name, category_id: e.categoryId || null, description: e.description, amount: e.amount, date: e.date,
      }));
      return;
    }
    case 'transactions': {
      const tx = item as CaisseTransaction;
      await checkErr(supabase.from('caisse_transactions').insert({
        id: tx.id, type: tx.type, amount: tx.amount, date: tx.date, description: tx.description,
      }));
      return;
    }
    case 'activities': {
      const a = item as Activity;
      await checkErr(supabase.from('activities').insert({ id: a.id, name: a.name, description: a.description, image: a.image }));
      return;
    }
  }
}

// ============================== update ==============================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function updateRow<K extends Collections>(key: K, id: string, patch: Partial<AppData[K][number]>, prev: AppData[K][number] | undefined): Promise<void> {
  if (NAME_ONLY.has(key)) {
    const p = patch as { name?: string };
    if (p.name !== undefined) await checkErr(supabase.from(TABLE_MAP[key]).update({ name: p.name }).eq('id', id));
    return;
  }

  switch (key) {
    case 'trainers': {
      const p = patch as Partial<Trainer>;
      const prevT = prev as Trainer | undefined;
      const cols: Row = {};
      if (p.fullName !== undefined) cols.full_name = p.fullName;
      if (p.phone !== undefined) cols.phone = p.phone;
      if (p.email !== undefined) cols.email = p.email;
      if (p.address !== undefined) cols.address = p.address;
      if (p.paymentType !== undefined) cols.payment_type = p.paymentType;
      if ('monthlyAmount' in p) cols.monthly_amount = p.monthlyAmount ?? null;
      if ('percentage' in p) cols.percentage = p.percentage ?? null;
      if (Object.keys(cols).length) await checkErr(supabase.from('trainers').update(cols).eq('id', id));
      if (p.acomptes && prevT) await syncMoneyEntries('trainer_money_entries', 'trainer_id', id, 'acompte', prevT.acomptes, p.acomptes);
      if (p.absences && prevT) await syncMoneyEntries('trainer_money_entries', 'trainer_id', id, 'absence', prevT.absences, p.absences);
      if (p.payments && prevT) await syncStaffPayments('trainer_payments', 'trainer_id', id, prevT.payments, p.payments);
      // p.timingIds is derived (real relation = timings.trainer_id) — intentionally ignored here
      return;
    }
    case 'timings': {
      const p = patch as Partial<Timing>;
      const cols: Row = {};
      if (p.name !== undefined) cols.name = p.name;
      if (p.categoryId !== undefined) cols.category_id = p.categoryId || null;
      if (p.groupId !== undefined) cols.group_id = p.groupId || null;
      if (p.sportId !== undefined) cols.sport_id = p.sportId || null;
      if (p.stadiumId !== undefined) cols.stadium_id = p.stadiumId || null;
      if (p.trainerId !== undefined) cols.trainer_id = p.trainerId || null;
      if (p.days !== undefined) cols.days = p.days;
      if (p.startTime !== undefined) cols.start_time = p.startTime;
      if (p.endTime !== undefined) cols.end_time = p.endTime;
      if (Object.keys(cols).length) await checkErr(supabase.from('timings').update(cols).eq('id', id));
      return;
    }
    case 'subscriptions': {
      const p = patch as Partial<Subscription>;
      const cols: Row = {};
      if (p.name !== undefined) cols.name = p.name;
      if (p.timingId !== undefined) cols.timing_id = p.timingId || null;
      if (p.periodDays !== undefined) cols.period_days = p.periodDays;
      if (p.totalSeances !== undefined) cols.total_seances = p.totalSeances;
      if (p.pricePerSeance !== undefined) cols.price_per_seance = p.pricePerSeance;
      if (p.totalPrice !== undefined) cols.total_price = p.totalPrice;
      if (Object.keys(cols).length) await checkErr(supabase.from('subscriptions').update(cols).eq('id', id));
      return;
    }
    case 'parents': {
      const p = patch as Partial<Parent>;
      const cols: Row = {};
      if (p.firstName !== undefined) cols.first_name = p.firstName;
      if (p.lastName !== undefined) cols.last_name = p.lastName;
      if (p.phone !== undefined) cols.phone = p.phone;
      if (p.address !== undefined) cols.address = p.address;
      if (p.email !== undefined) cols.email = p.email;
      if (Object.keys(cols).length) await checkErr(supabase.from('parents').update(cols).eq('id', id));
      // p.playerIds is derived (real relation = players.parent_id) — intentionally ignored here
      return;
    }
    case 'players': {
      const p = patch as Partial<Player>;
      const prevP = prev as Player | undefined;
      const cols: Row = {};
      if (p.firstName !== undefined) cols.first_name = p.firstName;
      if (p.lastName !== undefined) cols.last_name = p.lastName;
      if (p.birthDate !== undefined) cols.birth_date = p.birthDate || null;
      if (p.birthPlace !== undefined) cols.birth_place = p.birthPlace;
      if (p.address !== undefined) cols.address = p.address;
      if (p.phone !== undefined) cols.phone = p.phone;
      if (p.email !== undefined) cols.email = p.email;
      if ('parentId' in p) cols.parent_id = p.parentId || null;
      if (p.subscriptionCostPaid !== undefined) cols.subscription_cost_paid = p.subscriptionCostPaid;
      if (p.photoUrl !== undefined) cols.photo_url = p.photoUrl;
      if (p.documentUrls !== undefined) cols.document_urls = p.documentUrls;
      if ('assignedSubscription' in p) {
        const a = p.assignedSubscription;
        cols.sub_subscription_id = a?.subscriptionId ?? null;
        cols.sub_timing_id = a?.timingId ?? null;
        cols.sub_start_date = a?.startDate ?? null;
        cols.sub_expiry_date = a?.expiryDate ?? null;
        cols.sub_price = a?.price ?? null;
        cols.sub_amount_paid = a?.amountPaid ?? null;
        cols.sub_rest = a?.rest ?? null;
        cols.sub_status = a?.status ?? null;
      }
      if (Object.keys(cols).length) await checkErr(supabase.from('players').update(cols).eq('id', id));
      if (p.payments && prevP) await syncPlayerPayments(id, prevP.payments, p.payments);
      if (p.medicalRecords && prevP) await syncMedicalRecords(id, prevP.medicalRecords, p.medicalRecords);
      if (p.attendanceRecords && prevP) await syncAttendanceRecords(id, prevP.attendanceRecords, p.attendanceRecords);
      if (p.evaluations && prevP) await syncPlayerEvaluations(id, prevP.evaluations, p.evaluations);
      if (p.insurances && prevP) await syncPlayerInsurances(id, prevP.insurances, p.insurances);
      return;
    }
    case 'matches': {
      const p = patch as Partial<Match>;
      const prevM = prev as Match | undefined;
      const cols: Row = {};
      if (p.categoryId !== undefined) cols.category_id = p.categoryId || null;
      if (p.stadiumId !== undefined) cols.stadium_id = p.stadiumId || null;
      if (p.matchDate !== undefined) cols.match_date = p.matchDate;
      if (p.opponent !== undefined) cols.opponent = p.opponent;
      if (p.description !== undefined) cols.description = p.description;
      if (Object.keys(cols).length) await checkErr(supabase.from('matches').update(cols).eq('id', id));
      if (p.expenses && prevM) await syncMatchExpenses(id, prevM.expenses, p.expenses);
      return;
    }
    case 'doctors': {
      const p = patch as Partial<Doctor>;
      const prevD = prev as Doctor | undefined;
      const cols: Row = {};
      if (p.fullName !== undefined) cols.full_name = p.fullName;
      if (p.phone !== undefined) cols.phone = p.phone;
      if (p.address !== undefined) cols.address = p.address;
      if (p.payType !== undefined) cols.pay_type = p.payType;
      if (p.payAmount !== undefined) cols.pay_amount = p.payAmount;
      // email / username / accountActive only change through
      // admin_upsert_doctor_account (keeps the Supabase Auth login in sync).
      if (Object.keys(cols).length) await checkErr(supabase.from('doctors').update(cols).eq('id', id));
      if (p.acomptes && prevD) await syncMoneyEntries('doctor_money_entries', 'doctor_id', id, 'acompte', prevD.acomptes, p.acomptes);
      if (p.absences && prevD) await syncMoneyEntries('doctor_money_entries', 'doctor_id', id, 'absence', prevD.absences, p.absences);
      if (p.payments && prevD) await syncStaffPayments('doctor_payments', 'doctor_id', id, prevD.payments, p.payments);
      return;
    }
    case 'workers': {
      const p = patch as Partial<Worker>;
      const prevW = prev as Worker | undefined;
      const cols: Row = {};
      if (p.fullName !== undefined) cols.full_name = p.fullName;
      if (p.birthDate !== undefined) cols.birth_date = p.birthDate || null;
      if ('idCard' in p) cols.id_card = p.idCard || null;
      if (p.phone !== undefined) cols.phone = p.phone;
      if ('roleId' in p) cols.role_id = p.roleId || null;
      if (p.payActive !== undefined) cols.pay_active = p.payActive;
      if (p.payType !== undefined) cols.pay_type = p.payType;
      if (p.payAmount !== undefined) cols.pay_amount = p.payAmount;
      if (p.permissions !== undefined) cols.permissions = p.permissions;
      if (p.startDate !== undefined) cols.start_date = p.startDate;
      // email / username / accountActive are intentionally NOT written here —
      // they only change through admin_upsert_worker_account (keeps the
      // linked Supabase Auth login in sync). See Workers.tsx.
      if (Object.keys(cols).length) await checkErr(supabase.from('workers').update(cols).eq('id', id));
      if (p.acomptes && prevW) await syncMoneyEntries('worker_money_entries', 'worker_id', id, 'acompte', prevW.acomptes, p.acomptes);
      if (p.absences && prevW) await syncMoneyEntries('worker_money_entries', 'worker_id', id, 'absence', prevW.absences, p.absences);
      if (p.payments && prevW) await syncStaffPayments('worker_payments', 'worker_id', id, prevW.payments, p.payments);
      return;
    }
    case 'expenses': {
      const p = patch as Partial<Expense>;
      const cols: Row = {};
      if (p.name !== undefined) cols.name = p.name;
      if (p.categoryId !== undefined) cols.category_id = p.categoryId || null;
      if (p.description !== undefined) cols.description = p.description;
      if (p.amount !== undefined) cols.amount = p.amount;
      if (p.date !== undefined) cols.date = p.date;
      if (Object.keys(cols).length) await checkErr(supabase.from('expenses').update(cols).eq('id', id));
      return;
    }
    case 'transactions': {
      const p = patch as Partial<CaisseTransaction>;
      const cols: Row = {};
      if (p.type !== undefined) cols.type = p.type;
      if (p.amount !== undefined) cols.amount = p.amount;
      if (p.date !== undefined) cols.date = p.date;
      if (p.description !== undefined) cols.description = p.description;
      if (Object.keys(cols).length) await checkErr(supabase.from('caisse_transactions').update(cols).eq('id', id));
      return;
    }
    case 'activities': {
      const p = patch as Partial<Activity>;
      const cols: Row = {};
      if (p.name !== undefined) cols.name = p.name;
      if (p.description !== undefined) cols.description = p.description;
      if (p.image !== undefined) cols.image = p.image;
      if (Object.keys(cols).length) await checkErr(supabase.from('activities').update(cols).eq('id', id));
      return;
    }
  }
}

// ============================== delete ==============================

export async function deleteRow(key: Collections, id: string): Promise<void> {
  if (key === 'workers') {
    await checkErr(supabase.rpc('admin_delete_worker', { p_worker_id: id }));
    return;
  }
  if (key === 'doctors') {
    await checkErr(supabase.rpc('admin_delete_doctor', { p_doctor_id: id }));
    return;
  }
  await checkErr(supabase.from(TABLE_MAP[key]).delete().eq('id', id));
}
