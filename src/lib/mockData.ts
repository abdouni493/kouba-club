import type {
  Category, Group, Sport, Stadium, Trainer, Timing, Subscription, Player, Parent,
  Worker, Role, Expense, ExpenseCategory, CaisseTransaction, Activity, ClubContact,
  ClubInfo,
} from './types';

// ============ Shape of the in-memory dataset, backed by Supabase ============
// (see src/lib/dataAdapter.ts for how this is fetched from / synced to the DB)

export interface AppData {
  categories: Category[];
  groups: Group[];
  sports: Sport[];
  stadiums: Stadium[];
  roles: Role[];
  expenseCategories: ExpenseCategory[];
  trainers: Trainer[];
  timings: Timing[];
  subscriptions: Subscription[];
  players: Player[];
  parents: Parent[];
  workers: Worker[];
  expenses: Expense[];
  transactions: CaisseTransaction[];
  activities: Activity[];
  contact: ClubContact;
  club: ClubInfo;
}
