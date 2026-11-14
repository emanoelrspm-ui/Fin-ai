export type Category =
  | 'Alimentação'
  | 'Transporte'
  | 'Educação'
  | 'Lazer'
  | 'Outros'
  | 'Receita';

export type ExpenseCategory = Exclude<Category, 'Receita'>;

export type PaymentMethod = 'Débito' | 'Crédito' | 'Pix' | 'Transferência';

export type NavSection = 'overview' | 'ledger' | 'intelligence' | 'budgets';

export type ThemeMode = 'light' | 'dark';

export interface Transaction {
  id: string;
  title: string;
  amount: number; // Negative = expense, Positive = income
  category: Category;
  paymentMethod: PaymentMethod;
  date: string; // YYYY-MM-DD
  source?: 'manual' | 'ai';
}

export interface CategoryBudget {
  category: ExpenseCategory;
  limit: number;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  monthlyContribution: number;
}

export interface CashflowMonth {
  month: string;
  income: number;
  expenses: number;
  invested: number;
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
