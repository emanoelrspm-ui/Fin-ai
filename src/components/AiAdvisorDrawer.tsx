import { FormEvent, useEffect, useRef, useState } from 'react';
import { Loader2, PanelRightClose, Send, Sparkles } from 'lucide-react';
import { ChatMessage } from '../types/finance';

interface AiAdvisorDrawerProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function AiAdvisorDrawer({
  messages,
  onSendMessage,
  isLoading,
  error,
  isOpen,
  onClose,
}: AiAdvisorDrawerProps) {
  const [draft, setDraft] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed || isLoading) return;
    setDraft('');
    await onSendMessage(trimmed);
  };

  if (!isOpen) return null;

  return (
    <aside
      aria-label="Assistente de Inteligência Financeira"
      className="fixed inset-y-0 right-0 z-40 w-full max-w-[380px] xl:static xl:z-auto xl:w-[360px] xl:shrink-0 flex flex-col bg-white dark:bg-[#111827]/90 dark:backdrop-blur-md border-l border-slate-200 dark:border-white/[0.08] shadow-2xl xl:shadow-none"
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-white/[0.08]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50 leading-tight">
              Consultor FinAI
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Análise contextual em BRL
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Recolher painel do assistente"
          className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
        >
          <PanelRightClose className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
        {messages.length === 0 && !isLoading && (
          <div className="h-full flex flex-col items-center justify-center text-center px-4 py-10 space-y-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
              Nenhuma conversa ainda
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-[240px]">
              Faça uma pergunta sobre seus gastos, categorias ou orçamentos quando houver lançamentos registrados.
            </p>
          </div>
        )}

        {messages.map((msg) =>
          msg.role === 'user' ? (
            <div key={msg.id} className="flex flex-col items-end gap-1">
              <div className="max-w-[88%] rounded-2xl rounded-tr-sm px-4 py-2.5 bg-slate-100 dark:bg-[#1E293B] border border-slate-200 dark:border-white/[0.08] text-sm text-slate-900 dark:text-slate-100 leading-relaxed">
                {msg.text}
              </div>
              <span className="text-[11px] font-mono-num text-slate-400 dark:text-slate-500 pr-1">
                {msg.timestamp}
              </span>
            </div>
          ) : (
            <div key={msg.id} className="space-y-3">
              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-md bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                    {msg.text}
                  </p>
                  <span className="block text-[11px] font-mono-num text-slate-400 dark:text-slate-500">
                    FinAI · {msg.timestamp}
                  </span>
                </div>
              </div>

              {msg.structuredCard && (
                <div className="ml-8 rounded-xl bg-slate-50 dark:bg-[#0B0F17]/75 border border-slate-200 dark:border-white/[0.08] p-3.5 space-y-2.5">
                  <div>
                    <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                      {msg.structuredCard.title}
                    </h4>
                    {msg.structuredCard.subtitle && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {msg.structuredCard.subtitle}
                      </p>
                    )}
                  </div>
                  <div className="divide-y divide-slate-200/80 dark:divide-white/[0.06]">
                    {msg.structuredCard.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-2 py-1.5 first:pt-0 last:pb-0 text-xs"
                      >
                        <span className="text-slate-600 dark:text-slate-400">{item.label}</span>
                        <span
                          className={`font-mono-num font-semibold ${
                            item.tone === 'positive'
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : item.tone === 'warning'
                              ? 'text-orange-600 dark:text-orange-400'
                              : 'text-slate-900 dark:text-slate-100'
                          }`}
                        >
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        )}

        {isLoading && (
          <div className="flex items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-600 dark:text-emerald-400" />
            <span>Analisando seus dados financeiros...</span>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        <div ref={endRef} />
      </div>

      <div className="p-4 border-t border-slate-200 dark:border-white/[0.08] bg-slate-50/70 dark:bg-[#0B0F17]/50">
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 rounded-xl bg-white dark:bg-[#1E293B]/80 border border-slate-200 dark:border-white/[0.1] px-3 py-2 focus-within:border-[#0D9488] dark:focus-within:border-emerald-500 transition-colors"
        >
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={isLoading}
            placeholder="Pergunte sobre suas despesas..."
            aria-label="Mensagem para o consultor financeiro"
            className="w-full bg-transparent text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={isLoading || !draft.trim()}
            aria-label="Enviar mensagem"
            className="w-8 h-8 rounded-lg bg-[#0D9488] hover:bg-[#047857] dark:bg-emerald-500 dark:hover:bg-teal-400 text-white dark:text-[#0B0F17] flex items-center justify-center shrink-0 disabled:opacity-40 transition-colors cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </aside>
  );
}
