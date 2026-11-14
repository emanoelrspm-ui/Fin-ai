export type ExpenseCategory =
  | 'Alimentação'
  | 'Transporte'
  | 'Educação'
  | 'Lazer'
  | 'Outros';

export type Category = ExpenseCategory;

export type PaymentMethod = 'Débito' | 'Crédito' | 'Pix' | 'Transferência';

export type ExpenseSource = 'manual' | 'text' | 'image';

export type NavSection =
  | 'overview'
  | 'ledger'
  | 'intelligence'
  | 'budgets'
  | 'settings';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface AiConfidenceScores {
  merchant: number;
  amount: number;
  date: number;
  category: number;
}

export interface AiExpenseDraft {
  merchant: string | null;
  amount_cents: number | null;
  expense_date: string | null;
  category: ExpenseCategory;
  confidence: AiConfidenceScores;
}

export interface Transaction {
  id: string;
  title: string;
  amountCents: number;
  category: ExpenseCategory;
  paymentMethod: PaymentMethod;
  date: string; // YYYY-MM-DD
  source: ExpenseSource;
  aiConfidence?: number | AiConfidenceScores | null;
  receiptKey?: string | null;
}

export interface CategoryBudgetProgress {
  category: ExpenseCategory;
  limit_cents: number;
  spent_cents: number;
  percentage: number;
  status: 'unset' | 'ok' | 'warning' | 'exceeded';
}

export interface InsightItem {
  id: string;
  title: string;
  text: string;
  tone: 'neutral' | 'positive' | 'warning';
}

export interface CategoryVariation {
  category: ExpenseCategory;
  current_cents: number;
  previous_cents: number;
  delta_cents: number;
  delta_pct: number;
  limit_cents: number;
  budget_pct: number | null;
}

export interface InsightsResponse {
  month: string;
  previous_month: string;
  total_current_cents: number;
  total_previous_cents: number;
  top_expense: {
    merchant: string;
    amount_cents: number;
    expense_date: string;
    category: ExpenseCategory;
  } | null;
  category_variations: CategoryVariation[];
  insights: InsightItem[];
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

export interface MiniChartPoint {
  label: string;
  value_cents: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  structuredCard?: StructuredCard;
  miniChart?: MiniChartPoint[];
  suggestions?: string[];
}
