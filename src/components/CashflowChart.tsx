import { useState } from 'react';
import { CashflowMonth } from '../types/finance';
import { formatBRL } from '../utils/format';

interface CashflowChartProps {
  data: CashflowMonth[];
}

export function CashflowChart({ data }: CashflowChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(data.length - 1);

  const width = 640;
  const height = 240;
  const padLeft = 56;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 34;

  const plotWidth = width - padLeft - padRight;
  const plotHeight = height - padTop - padBottom;

  const maxVal = Math.max(
    ...data.flatMap((d) => [d.income, d.expenses, d.invested]),
    1000
  );
  const yMax = Math.ceil(maxVal / 2000) * 2000;

  const xFor = (i: number) =>
    data.length <= 1 ? padLeft + plotWidth / 2 : padLeft + (i / (data.length - 1)) * plotWidth;
  const yFor = (val: number) => padTop + plotHeight - (val / yMax) * plotHeight;

  const buildPath = (key: 'income' | 'expenses') =>
    data
      .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i).toFixed(1)} ${yFor(d[key]).toFixed(1)}`)
      .join(' ');

  const buildArea = (key: 'income' | 'expenses') => {
    if (data.length === 0) return '';
    const line = buildPath(key);
    const lastX = xFor(data.length - 1).toFixed(1);
    const firstX = xFor(0).toFixed(1);
    const bottomY = (padTop + plotHeight).toFixed(1);
    return `${line} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  };

  const activePoint = hoveredIdx !== null && data[hoveredIdx] ? data[hoveredIdx] : data[data.length - 1];
  const gridSteps = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50">
            Fluxo de Caixa Mensal
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Comparativo entre receitas e despesas nos últimos 6 meses
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <span className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#0D9488] dark:bg-emerald-400" />
            Receitas
          </span>
          <span className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
            <span className="w-2.5 h-2.5 rounded-sm bg-slate-400 dark:bg-slate-500" />
            Despesas
          </span>
        </div>
      </div>

      {activePoint && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs py-2 border-y border-slate-100 dark:border-white/[0.06]">
          <span className="font-semibold text-slate-900 dark:text-slate-100">
            Mês: {activePoint.month} 2026
          </span>
          <span className="text-slate-600 dark:text-slate-400">
            Receitas:{' '}
            <strong className="font-mono-num text-emerald-700 dark:text-emerald-400">
              {formatBRL(activePoint.income)}
            </strong>
          </span>
          <span className="text-slate-600 dark:text-slate-400">
            Despesas:{' '}
            <strong className="font-mono-num text-slate-900 dark:text-slate-100">
              {formatBRL(activePoint.expenses)}
            </strong>
          </span>
          <span className="text-slate-600 dark:text-slate-400">
            Saldo Líquido:{' '}
            <strong className="font-mono-num text-teal-700 dark:text-teal-300">
              {formatBRL(activePoint.income - activePoint.expenses, { showPlus: true })}
            </strong>
          </span>
        </div>
      )}

      <div className="w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto select-none"
          role="img"
          aria-label="Gráfico de fluxo de caixa mensal entre receitas e despesas"
        >
          <defs>
            <linearGradient id="finaiIncomeGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.24" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0.01" />
            </linearGradient>
            <linearGradient id="finaiExpenseGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#64748B" stopOpacity="0.14" />
              <stop offset="100%" stopColor="#64748B" stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {gridSteps.map((step) => {
            const val = yMax * step;
            const y = yFor(val);
            return (
              <g key={step}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={width - padRight}
                  y2={y}
                  className="stroke-slate-200 dark:stroke-white/[0.06]"
                  strokeDasharray={step === 0 ? undefined : '3 3'}
                  strokeWidth="1"
                />
                <text
                  x={padLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-slate-400 dark:fill-slate-500 text-[10px] font-mono-num"
                >
                  {val === 0 ? 'R$ 0' : `${(val / 1000).toFixed(0)}k`}
                </text>
              </g>
            );
          })}

          <path d={buildArea('expenses')} fill="url(#finaiExpenseGrad)" />
          <path d={buildArea('income')} fill="url(#finaiIncomeGrad)" />

          <path
            d={buildPath('expenses')}
            fill="none"
            className="stroke-slate-400 dark:stroke-slate-500"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d={buildPath('income')}
            fill="none"
            className="stroke-[#0D9488] dark:stroke-emerald-400"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {data.map((d, i) => {
            const x = xFor(i);
            const yInc = yFor(d.income);
            const yExp = yFor(d.expenses);
            const isHovered = hoveredIdx === i;

            return (
              <g
                key={d.month}
                onMouseEnter={() => setHoveredIdx(i)}
                onClick={() => setHoveredIdx(i)}
                className="cursor-pointer"
              >
                <rect
                  x={x - plotWidth / (data.length * 2)}
                  y={padTop}
                  width={plotWidth / data.length}
                  height={plotHeight + padBottom}
                  fill="transparent"
                />
                {isHovered && (
                  <line
                    x1={x}
                    y1={padTop}
                    x2={x}
                    y2={padTop + plotHeight}
                    className="stroke-teal-500/40 dark:stroke-emerald-400/40"
                    strokeWidth="1"
                  />
                )}
                <circle
                  cx={x}
                  cy={yExp}
                  r={isHovered ? 4.5 : 3}
                  className="fill-slate-400 dark:fill-slate-500 stroke-white dark:stroke-[#111827]"
                  strokeWidth="1.5"
                />
                <circle
                  cx={x}
                  cy={yInc}
                  r={isHovered ? 5.5 : 3.5}
                  className="fill-[#0D9488] dark:fill-emerald-400 stroke-white dark:stroke-[#111827]"
                  strokeWidth="2"
                />
                <text
                  x={x}
                  y={height - 10}
                  textAnchor="middle"
                  className={`text-[11px] font-medium ${
                    isHovered
                      ? 'fill-slate-900 dark:fill-emerald-300 font-semibold'
                      : 'fill-slate-500 dark:fill-slate-400'
                  }`}
                >
                  {d.month}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
