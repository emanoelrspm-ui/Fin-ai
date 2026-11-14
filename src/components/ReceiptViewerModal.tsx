import { useEffect, useState } from 'react';
import { AlertCircle, Loader2, X } from 'lucide-react';
import { api } from '../lib/api';

interface ReceiptViewerModalProps {
  receiptKey: string | null;
  title?: string;
  onClose: () => void;
}

export function ReceiptViewerModal({
  receiptKey,
  title,
  onClose,
}: ReceiptViewerModalProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!receiptKey) {
      setImageUrl(null);
      setError(null);
      return;
    }

    let active = true;
    let createdUrl: string | null = null;
    setLoading(true);
    setError(null);

    api
      .fetchReceiptObjectUrl(receiptKey)
      .then((url) => {
        if (!active) {
          URL.revokeObjectURL(url);
          return;
        }
        createdUrl = url;
        setImageUrl(url);
      })
      .catch((err) => {
        if (!active) return;
        setError(
          err instanceof Error
            ? err.message
            : 'Não foi possível carregar o comprovante.'
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [receiptKey]);

  if (!receiptKey) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Visualizar comprovante"
    >
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/[0.08] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/[0.06]">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50 truncate">
              {title ? `Comprovante · ${title}` : 'Comprovante'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Armazenamento privado autenticado
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar comprovante"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/[0.06] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 flex items-center justify-center min-h-[280px] bg-slate-50 dark:bg-[#0B0F17]/60">
          {loading && (
            <div className="flex flex-col items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-[#0D9488] dark:text-emerald-400" />
              <span>Carregando imagem do R2...</span>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center gap-2 text-center max-w-xs text-xs text-red-600 dark:text-red-400">
              <AlertCircle className="w-6 h-6" />
              <span>{error}</span>
            </div>
          )}

          {!loading && !error && imageUrl && (
            <img
              src={imageUrl}
              alt={title ? `Comprovante de ${title}` : 'Comprovante da despesa'}
              referrerPolicy="no-referrer"
              className="max-h-[70vh] w-auto rounded-xl border border-slate-200 dark:border-white/[0.08] object-contain"
            />
          )}
        </div>
      </div>
    </div>
  );
}
