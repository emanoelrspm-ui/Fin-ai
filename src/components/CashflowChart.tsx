import { useState } from 'react';
import { CashflowMonth } from '../types/finance';
import { formatCentsBRL } from '../lib/format';

interface CashflowChartProps {
  data: CashflowMonth[];
  isLoading?: boolean;
}

export function CashflowChart({ data, isLoading }: CashflowChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(
    data.length > 0 ? data.length - 1 : null
  );

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-5 w-48 rounded bg-slate-200 dark:bg-white/[0.08]" />
        <div className="h-3 w-64 rounded bg-slate-100 dark:bg-white/[0.05]" />
        <div className="h-52 w-full rounded-xl bg-slate-100 dark:bg-white/[0.04]" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="h-full flex flex-col justify-between space-y-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50">
            Evolução de Despesas
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Série histórica mensal consolidada em reais (R$)
          </p>
        </div>
        <div className="flex-1 min-h-[200px] flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 dark:border-white/[0.08] p-6 text-center">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Nenhuma despesa ainda
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-xs">
            O gráfico mensal será exibido assim que seus primeiros lançamentos forem registrados.
          </p>
        </div>
      </div>
    );
  }

  const width = 640;
  const height = 240;
  const padLeft = 56;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 34;

  const plotWidth = width - padLeft - padRight;
  const plotHeight = height - padTop - padBottom;

  const maxVal = Math.max(...data.flatMap((d) => [d.totalCents, d.budgetCents]), 100000);
  const yMax = Math.ceil(maxVal / 100000) * 100000;

  const xFor = (i: number) =>
    data.length <= 1 ? padLeft + plotWidth / 2 : padLeft + (i / (data.length - 1)) * plotWidth;
  const yFor = (val: number) => padTop + plotHeight - (val / yMax) * plotHeight;

  const buildPath = (key: 'totalCents' | 'budgetCents') =>
    data
      .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i).toFixed(1)} ${yFor(d[key]).toFixed(1)}`)
      .join(' ');

  const buildArea = (key: 'totalCents') => {
    const line = buildPath(key);
    const lastX = xFor(data.length - 1).toFixed(1);
    const firstX = xFor(0).toFixed(1);
    const bottomY = (padTop + plotHeight).toFixed(1);
    return `${line} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  };

  const activePoint =
    hoveredIdx !== null && data[hoveredIdx] ? data[hoveredIdx] : data[data.length - 1];
  const gridSteps = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50">
            Evolução de Despesas
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Comparativo entre gasto realizado e orçamento mensal
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <span className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#0D9488] dark:bg-emerald-400" />
            Despesas
          </span>
          <span className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
            <span className="w-2.5 h-2.5 rounded-sm bg-slate-400 dark:bg-slate-500" />
            Orçamento
          </span>
        </div>
      </div>

      {activePoint && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs py-2 border-y border-slate-100 dark:border-white/[0.06]">
          <span className="font-semibold text-slate-900 dark:text-slate-100">
            Mês: {activePoint.label}
          </span>
          <span className="text-slate-600 dark:text-slate-400">
            Gasto:{' '}
            <strong className="font-mono-num text-slate-900 dark:text-slate-100">
              {formatCentsBRL(activePoint.totalCents)}
            </strong>
          </span>
          <span className="text-slate-600 dark:text-slate-400">
            Orçamento:{' '}
            <strong className="font-mono-num text-teal-700 dark:text-emerald-400">
              {formatCentsBRL(activePoint.budgetCents)}
            </strong>
          </span>
        </div>
      )}

      <div className="w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto select-none"
          role="img"
          aria-label="Gráfico de evolução mensal de despesas"
        >
          <defs>
            <linearGradient id="finaiExpenseArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0.01" />
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
                  {val === 0 ? 'R$ 0' : `${(val / 100000).toFixed(0)}k`}
                </text>
              </g>
            );
          })}

          <path d={buildArea('totalCents')} fill="url(#finaiExpenseArea)" />

          <path
            d={buildPath('budgetCents')}
            fill="none"
            className="stroke-slate-400 dark:stroke-slate-500"
            strokeDasharray="4 4"
            strokeWidth="1.8"
          />
          <path
            d={buildPath('totalCents')}
            fill="none"
            className="stroke-[#0D9488] dark:stroke-emerald-400"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {data.map((d, i) => {
            const x = xFor(i);
            const yVal = yFor(d.totalCents);
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
                <circle
                  cx={x}
                  cy={yVal}
                  r={isHovered ? 5 : 3.5}
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
                  {d.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
