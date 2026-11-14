export type ExpenseCategory =
  | 'Alimentação'
  | 'Transporte'
  | 'Educação'
  | 'Lazer'
  | 'Outros';

export type Category = ExpenseCategory;

export type PaymentMethod = 'Débito' | 'Crédito' | 'Pix' | 'Transferência';

export type NavSection = 'overview' | 'ledger' | 'intelligence' | 'budgets';

export type ThemeMode = 'light' | 'dark';

export interface Transaction {
  id: string;
  title: string;
  amountCents: number; // Integer cents
  category: ExpenseCategory;
  paymentMethod: PaymentMethod;
  date: string; // YYYY-MM-DD
  source?: 'manual' | 'ai';
  receiptKey?: string | null;
}

export interface CategoryBudget {
  category: ExpenseCategory;
  limitCents: number;
}

export interface CashflowMonth {
  month: string; // YYYY-MM
  label: string;
  totalCents: number;
  budgetCents: number;
}

export interface StructuredCardItem {
  label: string;
  value: string;
  tone: 'neutral' | 'positive' | 'warning';
}

export interface StructuredCard {
  title: string;
  subtitle?: string;
  items: StructuredCardItem[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  structuredCard?: StructuredCard;
}
