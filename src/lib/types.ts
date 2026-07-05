// ============ Core domain types for the Football Club manager ============

export interface Category { id: string; name: string }
export interface Group { id: string; name: string }
export interface Sport { id: string; name: string }
export interface Stadium { id: string; name: string }
export interface Role { id: string; name: string }
export interface ExpenseCategory { id: string; name: string }

export interface Trainer {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  address: string;
  paymentType: 'month' | 'percentage';
  monthlyAmount?: number;
  percentage?: number; // % of subscription revenue
  timingIds: string[];
  acomptes: MoneyEntry[];
  absences: MoneyEntry[];
  payments: StaffPayment[];
  createdAt: string;
}

export interface Timing {
  id: string;
  name: string; // generated: Category + Group + Trainer
  categoryId: string;
  groupId: string;
  sportId: string;
  stadiumId: string;
  trainerId: string;
  days: string[]; // e.g. ['monday','wednesday']
  startTime: string; // '17:00'
  endTime: string;   // '18:30'
}

export interface Subscription {
  id: string;
  name: string;        // usually the timing name
  timingId: string;
  periodDays: number;  // duration in days
  totalSeances: number;
  pricePerSeance: number;
  totalPrice: number;
}

export interface AssignedSubscription {
  subscriptionId: string;
  timingId: string;
  startDate: string;
  expiryDate: string;
  price: number;
  amountPaid: number;
  rest: number;
  status: 'payed' | 'debt';
}

export interface Payment {
  id: string;
  date: string;
  amount: number;
  note?: string;
  kind: 'subscription' | 'debt' | 'fee';
}

export interface MedicalRecord {
  id: string;
  status: boolean;   // true = OK / apte (green), false = problème (red)
  description: string;
  date: string;
  doctorId?: string; // set when a doctor recorded it
}

export interface AttendanceRecord {
  id: string;
  timingId: string;
  date: string;
  status: 'present' | 'absent';
  scannedAt?: string; // set when the record came from a card scan
}

export interface PlayerEvaluation {
  id: string;
  date: string;
  // 0–100 scale for each metric
  speed: number;
  ballControl: number;
  dribbling: number;
  passing: number;
  fitness: number;
  discipline: number;
  description: string;
}

export interface InsuranceType { id: string; name: string }

export interface PlayerInsurance {
  id: string;
  typeId: string;
  price: number;
  startDate: string;
  endDate: string;
  description: string;
}

export interface Player {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  birthPlace: string;
  address: string;
  phone: string;
  email: string;
  parentId?: string;
  createdAt: string;
  subscriptionCostPaid: boolean; // one-time registration fee paid or not
  photoUrl: string;              // player portrait (player-photos bucket)
  documentUrls: string[];        // scanned documents (player-documents bucket)
  assignedSubscription?: AssignedSubscription;
  payments: Payment[];
  medicalRecords: MedicalRecord[];
  attendanceRecords: AttendanceRecord[];
  evaluations: PlayerEvaluation[];
  insurances: PlayerInsurance[];
}

export interface Parent {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  email: string;
  playerIds: string[];
}

export interface MoneyEntry {
  id: string;
  amount: number; // for absences this is the "cost"
  description: string;
  date: string;
}

export interface StaffPayment {
  id: string;
  date: string;
  description?: string;
  amount: number;
  monthsCovered: string[];   // ['2026-05', ...]
  acompteIds: string[];
  absenceIds: string[];
  subscriptionIds?: string[]; // for percentage trainers
}

export interface WorkerPermissions {
  pages: string[];                  // page keys visible in sidebar
  actions: Record<string, string[]>; // pageKey -> allowed action keys
}

export interface Worker {
  id: string;
  fullName: string;
  birthDate: string;
  idCard?: string;
  phone: string;
  roleId: string;
  payActive: boolean;
  payType: 'day' | 'month';
  payAmount: number;
  accountActive: boolean;
  email?: string;
  username?: string;
  permissions: WorkerPermissions;
  startDate: string;
  acomptes: MoneyEntry[];
  absences: MoneyEntry[];
  payments: StaffPayment[];
}

export interface MatchExpense {
  id: string;
  name: string;   // e.g. Transport, Hôtel, or custom
  amount: number;
}

export interface Match {
  id: string;
  categoryId: string;
  stadiumId: string;
  matchDate: string;
  opponent: string;
  description: string; // opponent formation / notes
  expenses: MatchExpense[];
  createdAt: string;
}

export interface Doctor {
  id: string;
  fullName: string;
  phone: string;
  address: string;
  payType: 'day' | 'month' | 'session';
  payAmount: number;
  accountActive: boolean;
  email?: string;
  username?: string;
  createdAt: string;
  acomptes: MoneyEntry[];
  absences: MoneyEntry[];
  payments: StaffPayment[];
}

export interface Expense {
  id: string;
  name: string;
  categoryId: string;
  description: string;
  amount: number;
  date: string;
}

export interface CaisseTransaction {
  id: string;
  type: 'deposit' | 'withdraw';
  amount: number;
  date: string;
  description: string;
}

export interface Activity {
  id: string;
  name: string;
  description: string;
  image: string; // url or gradient placeholder
}

export interface ClubContact {
  facebook: string;
  instagram: string;
  tiktok: string;
  map: string;
  phone: string;
  whatsapp: string;
  email: string;
}

export interface ClubInfo {
  logo: string;
  cachet: string; // official stamp/seal (stored in the club-logo bucket)
  name: string;
  description: string;
  email: string;
  phone: string;
  address: string;
  nif: string;
  nis: string;
  article: string;
  rc: string;
  regFeeAmount: number;
}

