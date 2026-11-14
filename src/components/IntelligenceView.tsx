import { useMemo, useState } from 'react';
import { Sparkles, TrendingUp } from 'lucide-react';
import { SavingsGoal, Transaction } from '../types/finance';
import { formatBRL } from '../utils/format';

interface IntelligenceViewProps {
  transactions: Transaction[];
  goals: SavingsGoal[];
  onAskAiScenario: (prompt: string) => void;
}

type ScenarioKey = 'conservador' | 'base' | 'otimista';

const SCENARIO_RATES: Record<ScenarioKey, { label: string; monthlyYield: number; note: string }> = {
  conservador: {
    label: 'Conservador (100% CDI)',
    monthlyYield: 0.0085,
    note: 'Liquidez diária em Tesouro Selic / CDB 100% CDI',
  },
  base: {
    label: 'Base (CDI + IPCA)',
    monthlyYield: 0.0102,
    note: 'Carteira mista: 60% Pós-fixado · 40% Tesouro IPCA+',
  },
  otimista: {
    label: 'Otimista (Multimercado)',
    monthlyYield: 0.0124,
    note: 'Alocação balanceada com dividendos e FIIs',
  },
};

export function IntelligenceView({
  transactions,
  goals,
  onAskAiScenario,
}: IntelligenceViewProps) {
  const totalIncome = transactions
    .filter((t) => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions
    .filter((t) => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const initialPatrimony = goals.reduce((sum, g) => sum + g.currentAmount, 0);
  const currentSurplus = Math.max(1500, Math.round(totalIncome - totalExpense));

  const [scenario, setScenario] = useState<ScenarioKey>('base');
  const [monthlyContribution, setMonthlyContribution] = useState<number>(4950);

  const projection = useMemo(() => {
    const months = ['Dez', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai'];
    const rate = SCENARIO_RATES[scenario].monthlyYield;
    let balance = initialPatrimony;

    return months.map((m, idx) => {
      balance = balance * (1 + rate) + monthlyContribution;
      const investedOnly = initialPatrimony + monthlyContribution * (idx + 1);
      return {
        month: m,
        projected: Math.round(balance),
        principal: Math.round(investedOnly),
        yieldGain: Math.round(balance - investedOnly),
      };
    });
  }, [initialPatrimony, monthlyContribution, scenario]);

  const finalProjection = projection[projection.length - 1];
  const maxBar = Math.max(...projection.map((p) => p.projected), 1);

  return (
    <div className="space-y-6">
      {/* Top Intelligence Banner */}
      <div className="rounded-2xl bg-white dark:bg-[#111827]/85 dark:backdrop-blur-md border border-slate-200 dark:border-white/[0.08] p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1 max-w-2xl">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
              Simulador de Trajetória Patrimonial
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Projeção de 6 meses combinando seu patrimônio alocado atual (
              <span className="font-mono-num font-semibold text-slate-900 dark:text-slate-100">
                {formatBRL(initialPatrimony)}
              </span>
              ) com aportes mensais e juros compostos.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              onAskAiScenario(
                `Simule um plano para eu aportar ${formatBRL(monthlyContribution)} por mês no cenário ${SCENARIO_RATES[scenario].label} considerando meu superávit atual de ${formatBRL(currentSurplus)}.`
              )
            }
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#0D9488] hover:bg-[#047857] dark:bg-emerald-500 dark:hover:bg-teal-400 text-white dark:text-[#0B0F17] text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Analisar cenário com IA
          </button>
        </div>

        {/* Scenario Selector + Contribution Slider */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 pt-5 border-t border-slate-100 dark:border-white/[0.06]">
          <div className="lg:col-span-6 space-y-3">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Perfil de Rentabilidade
            </label>
            <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800/80">
              {(Object.keys(SCENARIO_RATES) as ScenarioKey[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setScenario(key)}
                  className={`py-2 px-2 text-xs font-medium rounded-md capitalize whitespace-nowrap truncate transition-colors cursor-pointer ${
                    scenario === key
                      ? 'bg-white dark:bg-[#1E293B] text-slate-900 dark:text-emerald-300 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {key}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {SCENARIO_RATES[scenario].note} ·{' '}
              <span className="font-mono-num text-emerald-700 dark:text-emerald-400 font-medium">
                {(SCENARIO_RATES[scenario].monthlyYield * 100).toFixed(2).replace('.', ',')}% a.m.
              </span>
            </p>
          </div>

          <div className="lg:col-span-6 space-y-3">
            <div className="flex items-center justify-between">
              <label
                htmlFor="monthly-contribution-range"
                className="text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Aporte Mensal Planejado
              </label>
              <span className="text-base font-bold font-mono-num text-[#0D9488] dark:text-emerald-400">
                {formatBRL(monthlyContribution)}/mês
              </span>
            </div>
            <input
              id="monthly-contribution-range"
              type="range"
              min={1000}
              max={12000}
              step={250}
              value={monthlyContribution}
              onChange={(e) => setMonthlyContribution(Number(e.target.value))}
              className="w-full accent-[#0D9488] dark:accent-emerald-400 cursor-pointer"
            />
            <div className="flex items-center justify-between text-[11px] font-mono-num text-slate-400">
              <span>R$ 1.000</span>
              <span>Superávit atual: {formatBRL(currentSurplus)}</span>
              <span>R$ 12.000</span>
            </div>
          </div>
        </div>
      </div>

      {/* Projection KPI + Bar Visual */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 rounded-2xl bg-white dark:bg-[#111827]/85 dark:backdrop-blur-md border border-slate-200 dark:border-white/[0.08] p-6 space-y-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50">
                Evolução Projetada (6 Meses)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Principal aportado vs. rendimentos acumulados
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold font-mono-num text-emerald-700 dark:text-emerald-400">
              <TrendingUp className="w-4 h-4" />
              +{formatBRL(finalProjection.yieldGain)} em juros
            </span>
          </div>

          <div className="grid grid-cols-6 gap-3 items-end h-52 pt-4">
            {projection.map((point) => {
              const totalPct = Math.round((point.projected / maxBar) * 100);
              const principalPct = Math.round((point.principal / point.projected) * 100);

              return (
                <div key={point.month} className="flex flex-col items-center gap-2 h-full justify-end">
                  <span className="text-[11px] font-mono-num font-semibold text-slate-700 dark:text-slate-200">
                    {(point.projected / 1000).toFixed(1).replace('.', ',')}k
                  </span>
                  <div
                    className="w-full max-w-[44px] rounded-t-lg overflow-hidden bg-emerald-400 dark:bg-emerald-400 flex flex-col justify-end transition-all duration-300"
                    style={{ height: `${Math.max(totalPct, 24)}%` }}
                    title={`${point.month}: ${formatBRL(point.projected)}`}
                  >
                    <div
                      className="w-full bg-[#0D9488] dark:bg-[#059669]"
                      style={{ height: `${principalPct}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {point.month}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-4 rounded-2xl bg-white dark:bg-[#111827]/85 dark:backdrop-blur-md border border-slate-200 dark:border-white/[0.08] p-6 flex flex-col justify-between space-y-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50">
              Síntese em Mai 2027
            </h3>

            <div className="divide-y divide-slate-100 dark:divide-white/[0.06]">
              <div className="py-3 flex items-center justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Patrimônio base</span>
                <span className="font-mono-num font-medium text-slate-900 dark:text-slate-100">
                  {formatBRL(initialPatrimony)}
                </span>
              </div>
              <div className="py-3 flex items-center justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Novos aportes (6m)</span>
                <span className="font-mono-num font-medium text-slate-900 dark:text-slate-100">
                  {formatBRL(monthlyContribution * 6)}
                </span>
              </div>
              <div className="py-3 flex items-center justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Ganho financeiro</span>
                <span className="font-mono-num font-semibold text-emerald-700 dark:text-emerald-400">
                  +{formatBRL(finalProjection.yieldGain)}
                </span>
              </div>
              <div className="pt-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Total estimado
                </span>
                <span className="text-xl font-bold font-mono-num text-[#0D9488] dark:text-emerald-400">
                  {formatBRL(finalProjection.projected)}
                </span>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Cálculo líquido referencial com capitalização mensal constante sobre a base alocada nas metas atuais.
          </p>
        </div>
      </div>
    </div>
  );
}
