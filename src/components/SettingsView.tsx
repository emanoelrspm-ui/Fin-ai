import { FormEvent, useEffect, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  LogOut,
  Monitor,
  Moon,
  Settings,
  Sun,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { ThemeMode } from '../types/finance';

interface SettingsViewProps {
  userName: string | null;
  userEmail: string;
  theme: ThemeMode;
  onChangeTheme: (theme: ThemeMode) => void;
  onProfileUpdated: () => Promise<void>;
  onDataDeleted: () => void;
  onSignOut: () => Promise<void>;
}

export function SettingsView({
  userName,
  userEmail,
  theme,
  onChangeTheme,
  onProfileUpdated,
  onDataDeleted,
  onSignOut,
}: SettingsViewProps) {
  const { updateProfileName } = useAuth();

  const [nameInput, setNameInput] = useState(userName || '');
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameSuccess, setNameSuccess] = useState<string | null>(null);

  const [deleteModalStep, setDeleteModalStep] = useState<0 | 1 | 2>(0);
  const [ackDelete, setAckDelete] = useState(false);
  const [confirmWord, setConfirmWord] = useState('');
  const [deletingData, setDeletingData] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);

  useEffect(() => {
    setNameInput(userName || '');
  }, [userName]);

  const handleSaveName = async (e: FormEvent) => {
    e.preventDefault();
    setNameError(null);
    setNameSuccess(null);

    const trimmed = nameInput.trim();
    if (trimmed.length < 2) {
      setNameError('Informe um nome com pelo menos 2 caracteres.');
      return;
    }

    setSavingName(true);
    try {
      await updateProfileName(trimmed);
      await onProfileUpdated();
      setNameSuccess('Nome atualizado no seu perfil.');
    } catch (err) {
      setNameError(
        err instanceof Error ? err.message : 'Não foi possível atualizar o nome.'
      );
    } finally {
      setSavingName(false);
    }
  };

  const openDeleteFlow = () => {
    setDeleteError(null);
    setDeleteSuccess(null);
    setAckDelete(false);
    setConfirmWord('');
    setDeleteModalStep(1);
  };

  const closeDeleteFlow = () => {
    if (deletingData) return;
    setDeleteModalStep(0);
    setAckDelete(false);
    setConfirmWord('');
    setDeleteError(null);
  };

  const handleConfirmDeleteAll = async () => {
    if (!ackDelete || confirmWord.trim().toUpperCase() !== 'EXCLUIR') {
      setDeleteError('Marque a confirmação e digite EXCLUIR para continuar.');
      return;
    }

    setDeleteError(null);
    setDeletingData(true);
    try {
      await api.deleteAllUserData();
      onDataDeleted();
      setDeleteModalStep(0);
      setDeleteSuccess(
        'Todos os seus dados financeiros (despesas, orçamentos, regras e comprovantes) foram excluídos.'
      );
    } catch (err) {
      setDeleteError(
        err instanceof Error
          ? err.message
          : 'Não foi possível excluir seus dados agora.'
      );
    } finally {
      setDeletingData(false);
    }
  };

  const themeOptions: Array<{
    id: ThemeMode;
    label: string;
    description: string;
    icon: typeof Sun;
  }> = [
    { id: 'light', label: 'Claro', description: 'Fundo claro FinAI', icon: Sun },
    { id: 'dark', label: 'Escuro', description: 'Obsidian Emerald', icon: Moon },
    { id: 'system', label: 'Sistema', description: 'Segue o dispositivo', icon: Monitor },
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <section className="rounded-2xl bg-white dark:bg-[#111827]/80 dark:backdrop-blur-md border border-slate-200 dark:border-white/[0.07] p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-emerald-500/15 text-[#0D9488] dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
              Perfil e Configurações
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Gerencie suas informações de conta, aparência e privacidade dos seus dados.
            </p>
          </div>
        </div>
      </section>

      {deleteSuccess && (
        <div
          role="status"
          className="flex items-center gap-2.5 rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-3 text-xs text-emerald-800 dark:text-emerald-300"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{deleteSuccess}</span>
        </div>
      )}

      {/* Profile Section */}
      <section className="rounded-2xl bg-white dark:bg-[#111827]/80 dark:backdrop-blur-md border border-slate-200 dark:border-white/[0.07] p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)] space-y-5">
        <div className="flex items-center gap-2.5">
          <User className="w-4 h-4 text-[#0D9488] dark:text-emerald-400" />
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
            Dados do Perfil
          </h2>
        </div>

        <form onSubmit={handleSaveName} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="settings-name"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Nome de exibição
              </label>
              <input
                id="settings-name"
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Seu nome"
                className="w-full h-10 px-3.5 rounded-lg bg-slate-50 dark:bg-[#0B0F17]/70 border border-slate-200 dark:border-white/[0.1] text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#0D9488] dark:focus:border-emerald-500"
              />
            </div>

            <div>
              <label
                htmlFor="settings-email"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                E-mail da conta
              </label>
              <input
                id="settings-email"
                type="email"
                value={userEmail}
                readOnly
                disabled
                className="w-full h-10 px-3.5 rounded-lg bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] text-sm text-slate-500 dark:text-slate-400 cursor-not-allowed"
              />
            </div>
          </div>

          {nameError && (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-lg border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{nameError}</span>
            </div>
          )}

          {nameSuccess && (
            <div
              role="status"
              className="flex items-center gap-2 rounded-lg border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-2 text-xs text-emerald-800 dark:text-emerald-300"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{nameSuccess}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <button
              type="submit"
              disabled={savingName}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0D9488] hover:bg-[#047857] dark:bg-emerald-500 dark:hover:bg-teal-400 text-white dark:text-[#0B0F17] text-xs font-semibold disabled:opacity-50 transition-colors cursor-pointer"
            >
              {savingName && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{savingName ? 'Salvando...' : 'Salvar nome'}</span>
            </button>

            <button
              type="button"
              onClick={() => void onSignOut()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-white/[0.1] text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sair da conta
            </button>
          </div>
        </form>
      </section>

      {/* Theme Preferences */}
      <section className="rounded-2xl bg-white dark:bg-[#111827]/80 dark:backdrop-blur-md border border-slate-200 dark:border-white/[0.07] p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)] space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
            Aparência do Aplicativo
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Escolha entre o tema Claro, Escuro ou sincronizado automaticamente com o sistema operacional.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {themeOptions.map((option) => {
            const Icon = option.icon;
            const selected = theme === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onChangeTheme(option.id)}
                className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-colors cursor-pointer ${
                  selected
                    ? 'border-[#0D9488] dark:border-emerald-500 bg-teal-50/60 dark:bg-emerald-500/10'
                    : 'border-slate-200 dark:border-white/[0.08] bg-slate-50/50 dark:bg-[#0B0F17]/50 hover:border-slate-300 dark:hover:border-white/[0.18]'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    selected
                      ? 'bg-[#0D9488] dark:bg-emerald-500 text-white dark:text-[#0B0F17]'
                      : 'bg-white dark:bg-white/[0.06] text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    {option.label}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {option.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Danger Zone */}
      <section className="rounded-2xl bg-white dark:bg-[#111827]/80 border border-red-200 dark:border-red-500/25 p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)] space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-red-50 dark:bg-red-500/15 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
              Excluir meus dados
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Remove permanentemente todas as suas despesas, orçamentos, regras de estabelecimentos, histórico de uso de IA no D1 e todas as imagens de comprovantes armazenadas no R2. Esta ação não pode ser desfeita.
            </p>
          </div>
        </div>

        <div className="pt-1">
          <button
            type="button"
            onClick={openDeleteFlow}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-red-300 dark:border-red-500/40 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-xs font-semibold text-red-700 dark:text-red-300 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Excluir meus dados
          </button>
        </div>
      </section>

      {/* Double-Confirmation Modal */}
      {deleteModalStep > 0 && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-data-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm"
        >
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/[0.1] p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-red-50 dark:bg-red-500/15 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h3
                    id="delete-data-title"
                    className="text-base font-semibold text-slate-900 dark:text-slate-50"
                  >
                    {deleteModalStep === 1
                      ? 'Confirmar exclusão de dados (1/2)'
                      : 'Confirmação definitiva (2/2)'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Conta: {userEmail}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeDeleteFlow}
                disabled={deletingData}
                aria-label="Fechar janela de confirmação"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {deleteModalStep === 1 ? (
              <div className="space-y-4">
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Ao prosseguir, todas as despesas lançadas, orçamentos por categoria, regras aprendidas e comprovantes anexados serão removidos permanentemente dos servidores.
                </p>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={closeDeleteFlow}
                    className="px-4 py-2 rounded-lg border border-slate-200 dark:border-white/[0.1] text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteModalStep(2)}
                    className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold cursor-pointer"
                  >
                    Continuar para confirmação
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <label className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ackDelete}
                    onChange={(e) => setAckDelete(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-red-600 focus:ring-red-500"
                  />
                  <span>
                    Entendo que esta ação é permanente e não poderá ser recuperada.
                  </span>
                </label>

                <div>
                  <label
                    htmlFor="confirm-delete-word"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    Digite <strong>EXCLUIR</strong> para confirmar:
                  </label>
                  <input
                    id="confirm-delete-word"
                    type="text"
                    value={confirmWord}
                    onChange={(e) => setConfirmWord(e.target.value)}
                    placeholder="EXCLUIR"
                    className="w-full h-10 px-3 rounded-lg bg-slate-50 dark:bg-[#0B0F17]/70 border border-slate-300 dark:border-white/[0.12] text-sm font-mono-num text-slate-900 dark:text-slate-100 focus:outline-none focus:border-red-500"
                  />
                </div>

                {deleteError && (
                  <div
                    role="alert"
                    className="flex items-center gap-2 rounded-lg border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{deleteError}</span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    disabled={deletingData}
                    onClick={() => setDeleteModalStep(1)}
                    className="px-4 py-2 rounded-lg border border-slate-200 dark:border-white/[0.1] text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer"
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    disabled={
                      deletingData ||
                      !ackDelete ||
                      confirmWord.trim().toUpperCase() !== 'EXCLUIR'
                    }
                    onClick={() => void handleConfirmDeleteAll()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold disabled:opacity-45 cursor-pointer"
                  >
                    {deletingData && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>
                      {deletingData ? 'Excluindo...' : 'Confirmar exclusão'}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
