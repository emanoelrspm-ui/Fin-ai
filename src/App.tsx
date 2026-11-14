import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  LayoutDashboard,
  ListOrdered,
  LogOut,
  Moon,
  PanelRightOpen,
  Plus,
  Sparkles,
  Sun,
  Target,
} from 'lucide-react';
import { api, apiFetch, MeResponse } from './lib/api';
import { AuthProvider, useAuth } from './lib/auth';
import {
  ChatMessage,
  NavSection,
  ThemeMode,
  Transaction,
} from './types/finance';
import { AuthScreen } from './components/AuthScreen';
import { OverviewView } from './components/OverviewView';
import { LedgerView } from './components/LedgerView';
import { IntelligenceView } from './components/IntelligenceView';
import { BudgetsView } from './components/BudgetsView';
import { AiAdvisorDrawer } from './components/AiAdvisorDrawer';
import { TransactionModal } from './components/TransactionModal';

const NAV_ITEMS: Array<{
  id: NavSection;
  label: string;
  mobileLabel: string;
  icon: typeof LayoutDashboard;
}> = [
  { id: 'overview', label: 'Visão Geral', mobileLabel: 'Resumo', icon: LayoutDashboard },
  { id: 'ledger', label: 'Lançamentos', mobileLabel: 'Extrato', icon: ListOrdered },
  { id: 'intelligence', label: 'Projeções', mobileLabel: 'Projeções', icon: BarChart3 },
  { id: 'budgets', label: 'Orçamentos', mobileLabel: 'Metas', icon: Target },
];

function getInitials(name: string, email: string): string {
  const source = name.trim() || email.trim();
  if (!source) return 'U';
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

function FinAIWorkspace() {
  const { user, session, loading: authLoading, isRecoveryMode, signOut } = useAuth();

  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('finai-theme');
    return saved === 'dark' ? 'dark' : 'light';
  });

  const [activeSection, setActiveSection] = useState<NavSection>('overview');
  const [me, setMe] = useState<MeResponse | null>(null);
  const [meLoading, setMeLoading] = useState(false);
  const [meError, setMeError] = useState<string | null>(null);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isAiChatLoading, setIsAiChatLoading] = useState(false);
  const [aiChatError, setAiChatError] = useState<string | null>(null);
  const [isAdvisorOpen, setIsAdvisorOpen] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1280 : true
  );

  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('finai-theme', theme);
  }, [theme]);

  const loadMe = useCallback(async () => {
    if (!session) return;
    setMeLoading(true);
    setMeError(null);
    try {
      const profile = await api.getMe();
      setMe(profile);
    } catch (err) {
      setMeError(
        err instanceof Error ? err.message : 'Erro ao carregar perfil em /api/me.'
      );
    } finally {
      setMeLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (session && !isRecoveryMode) {
      void loadMe();
    } else {
      setMe(null);
      setTransactions([]);
      setChatMessages([]);
      setMeError(null);
      setAiChatError(null);
    }
  }, [session, isRecoveryMode, loadMe]);

  const handleSignOut = async () => {
    setMe(null);
    setTransactions([]);
    setChatMessages([]);
    setMeError(null);
    setAiChatError(null);
    await signOut();
  };

  const handleSaveTransaction = async (txData: Omit<Transaction, 'id'>) => {
    const created = await apiFetch<Transaction>('/api/expenses', {
      method: 'POST',
      body: JSON.stringify(txData),
    });
    setTransactions((prev) => [created, ...prev]);
  };

  const handleSendChatMessage = async (text: string) => {
    const nowTime = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date());

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text,
      timestamp: nowTime,
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setIsAiChatLoading(true);
    setAiChatError(null);
    if (!isAdvisorOpen) setIsAdvisorOpen(true);

    try {
      const data = await apiFetch<{
        reply: string;
        structuredCard?: ChatMessage['structuredCard'];
      }>('/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: text,
          history: chatMessages.map((m) => ({ role: m.role, text: m.text })),
        }),
      });

      const replyTime = new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date());

      setChatMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          text: data.reply,
          timestamp: replyTime,
          structuredCard: data.structuredCard,
        },
      ]);
    } catch (err) {
      setAiChatError(
        err instanceof Error ? err.message : 'Erro ao consultar assistente financeiro.'
      );
    } finally {
      setIsAiChatLoading(false);
    }
  };

  const toggleTheme = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'));

  const displayEmail = me?.email || user?.email || '';
  const displayName = me?.name || null;
  const initials = useMemo(
    () => getInitials(displayName || '', displayEmail),
    [displayName, displayEmail]
  );

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] dark:bg-[#0B0F17] p-6">
        <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/[0.08] p-6 space-y-4 animate-pulse">
          <div className="h-6 w-28 rounded bg-slate-200 dark:bg-white/[0.08]" />
          <div className="h-4 w-56 rounded bg-slate-100 dark:bg-white/[0.05]" />
          <div className="h-10 w-full rounded-lg bg-slate-100 dark:bg-white/[0.05]" />
        </div>
      </div>
    );
  }

  if (!session || !user || isRecoveryMode) {
    return <AuthScreen theme={theme} onToggleTheme={toggleTheme} />;
  }

  const currentNavLabel =
    NAV_ITEMS.find((n) => n.id === activeSection)?.label || 'Visão Geral';

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#F8FAFC] dark:bg-[#0B0F17] text-[#0F172A] dark:text-[#F9FAFB] transition-colors">
      {/* Desktop Left Sidebar */}
      <aside className="hidden lg:flex lg:w-[260px] lg:shrink-0 flex-col justify-between bg-white dark:bg-[#111827] border-r border-slate-200 dark:border-white/[0.08] p-5">
        <div className="space-y-8">
          <div className="flex items-center gap-2.5 px-2">
            <div className="w-8 h-8 rounded-lg bg-[#0D9488] dark:bg-emerald-500 text-white dark:text-[#0B0F17] flex items-center justify-center font-display font-bold text-sm">
              F
            </div>
            <span className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-slate-50 whitespace-nowrap">
              FinAI
            </span>
          </div>

          <nav aria-label="Navegação principal" className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors cursor-pointer ${
                    active
                      ? 'bg-teal-50 dark:bg-emerald-500/15 text-[#0D9488] dark:text-emerald-400 font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-white/[0.04] hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  <Icon className="w-[18px] h-[18px] shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-white/[0.08]">
          <button
            type="button"
            onClick={toggleTheme}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-slate-200 dark:border-white/[0.08] bg-slate-50/70 dark:bg-white/[0.03] text-xs font-medium text-slate-700 dark:text-slate-300 hover:border-teal-600/40 dark:hover:border-emerald-500/40 transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2 whitespace-nowrap">
              {theme === 'dark' ? (
                <Moon className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Sun className="w-3.5 h-3.5 text-[#0D9488]" />
              )}
              {theme === 'dark' ? 'Obsidian Escuro' : 'FinAI Claro'}
            </span>
            <span className="text-[11px] text-slate-400 dark:text-slate-500">Alternar</span>
          </button>

          <div className="flex items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-slate-900 dark:bg-emerald-500/20 text-white dark:text-emerald-300 flex items-center justify-center text-xs font-semibold shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {displayName || 'Conta FinAI'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {displayEmail}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              title="Sair"
              aria-label="Sair da conta"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 shrink-0 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Shell */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-4 px-4 sm:px-8 py-3.5 bg-[#F8FAFC]/90 dark:bg-[#0B0F17]/90 backdrop-blur-md border-b border-slate-200 dark:border-white/[0.08]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex lg:hidden items-center gap-2 shrink-0">
              <div className="w-7 h-7 rounded-md bg-[#0D9488] dark:bg-emerald-500 text-white dark:text-[#0B0F17] flex items-center justify-center font-display font-bold text-xs">
                F
              </div>
              <span className="font-display text-base font-bold text-slate-900 dark:text-slate-50">
                FinAI
              </span>
            </div>
            <span className="hidden lg:inline text-xs font-medium text-slate-500 dark:text-slate-400">
              FinAI <span className="mx-1.5 text-slate-300 dark:text-slate-700">/</span>
              <span className="text-slate-900 dark:text-slate-100 font-semibold">
                {currentNavLabel}
              </span>
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Alternar tema claro e escuro"
              className="lg:hidden w-9 h-9 rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-[#111827] flex items-center justify-center text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={handleSignOut}
              aria-label="Sair da conta"
              className="lg:hidden inline-flex items-center gap-1 px-2.5 h-9 rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-[#111827] text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sair</span>
            </button>

            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0D9488] hover:bg-[#047857] dark:bg-emerald-500 dark:hover:bg-teal-400 text-white dark:text-[#0B0F17] text-xs font-semibold whitespace-nowrap shrink-0 active:scale-[0.98] transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nova despesa</span>
            </button>

            {!isAdvisorOpen && (
              <button
                type="button"
                onClick={() => setIsAdvisorOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-[#1E293B]/70 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-[#0D9488] dark:hover:border-emerald-500/40 whitespace-nowrap shrink-0 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#0D9488] dark:text-emerald-400" />
                <span className="hidden sm:inline">Consultor IA</span>
                <PanelRightOpen className="w-3.5 h-3.5 sm:hidden" />
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-8 py-6 pb-24 lg:pb-8 max-w-[1200px] w-full mx-auto">
          {activeSection === 'overview' && (
            <OverviewView
              userName={displayName}
              userEmail={displayEmail}
              meLoading={meLoading}
              meError={meError}
              onRetryMe={loadMe}
              transactions={transactions}
              cashflow={[]}
              onNavigateToLedger={() => setActiveSection('ledger')}
              onOpenNewModal={() => setIsModalOpen(true)}
            />
          )}

          {activeSection === 'ledger' && (
            <LedgerView
              transactions={transactions}
              onOpenNewModal={() => setIsModalOpen(true)}
            />
          )}

          {activeSection === 'intelligence' && (
            <IntelligenceView onOpenNewModal={() => setIsModalOpen(true)} />
          )}

          {activeSection === 'budgets' && (
            <BudgetsView onOpenNewModal={() => setIsModalOpen(true)} />
          )}
        </main>
      </div>

      {/* Collapsible Right AI Advisor Drawer */}
      <AiAdvisorDrawer
        messages={chatMessages}
        onSendMessage={handleSendChatMessage}
        isLoading={isAiChatLoading}
        error={aiChatError}
        isOpen={isAdvisorOpen}
        onClose={() => setIsAdvisorOpen(false)}
      />

      {/* Mobile Bottom Navigation Dock */}
      <nav
        aria-label="Navegação móvel"
        className="lg:hidden fixed bottom-0 inset-x-0 z-30 h-14 bg-white/95 dark:bg-[#111827]/95 backdrop-blur-md border-t border-slate-200 dark:border-white/[0.08] grid grid-cols-4"
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveSection(item.id)}
              className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium whitespace-nowrap cursor-pointer ${
                active
                  ? 'text-[#0D9488] dark:text-emerald-400 font-semibold'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.mobileLabel}</span>
            </button>
          );
        })}
      </nav>

      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTransaction}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <FinAIWorkspace />
    </AuthProvider>
  );
}
