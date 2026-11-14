import { FormEvent, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Moon,
  Sun,
  User,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { ThemeMode } from '../types/finance';

type AuthView = 'login' | 'signup' | 'forgot' | 'recovery';

interface AuthScreenProps {
  theme: ThemeMode;
  onToggleTheme: () => void;
}

interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  barClass: string;
  textClass: string;
}

function evaluatePasswordStrength(password: string): PasswordStrength {
  if (!password) {
    return {
      score: 0,
      label: 'Mínimo 8 caracteres',
      barClass: 'bg-slate-200 dark:bg-slate-700',
      textClass: 'text-slate-500 dark:text-slate-400',
    };
  }

  let points = 0;
  if (password.length >= 8) points += 1;
  if (password.length >= 12) points += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) points += 1;
  if (/\d/.test(password)) points += 1;
  if (/[^A-Za-z0-9]/.test(password)) points += 1;

  if (password.length < 8 || points <= 1) {
    return {
      score: 1,
      label: 'Fraca',
      barClass: 'bg-red-500',
      textClass: 'text-red-600 dark:text-red-400',
    };
  }
  if (points === 2) {
    return {
      score: 2,
      label: 'Média',
      barClass: 'bg-amber-500',
      textClass: 'text-amber-600 dark:text-amber-400',
    };
  }
  if (points === 3 || points === 4) {
    return {
      score: 3,
      label: 'Forte',
      barClass: 'bg-[#0D9488] dark:bg-emerald-500',
      textClass: 'text-[#0D9488] dark:text-emerald-400',
    };
  }
  return {
    score: 4,
    label: 'Muito forte',
    barClass: 'bg-emerald-600 dark:bg-emerald-400',
    textClass: 'text-emerald-700 dark:text-emerald-400',
  };
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function AuthScreen({ theme, onToggleTheme }: AuthScreenProps) {
  const {
    isConfigured,
    isRecoveryMode,
    signIn,
    signUp,
    resetPassword,
    updatePassword,
    clearRecoveryMode,
  } = useAuth();

  const [view, setView] = useState<AuthView>(isRecoveryMode ? 'recovery' : 'login');
  const effectiveView: AuthView = isRecoveryMode ? 'recovery' : view;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const strength = useMemo(() => evaluatePasswordStrength(password), [password]);

  const switchView = (next: AuthView) => {
    setView(next);
    setErrorMessage(null);
    setSuccessMessage(null);
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!isConfigured) {
      setErrorMessage(
        'As variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não estão configuradas neste ambiente.'
      );
      return;
    }

    if (effectiveView === 'login') {
      if (!isValidEmail(email)) {
        setErrorMessage('Informe um endereço de e-mail válido.');
        return;
      }
      if (password.length < 8) {
        setErrorMessage('A senha deve ter pelo menos 8 caracteres.');
        return;
      }
      setSubmitting(true);
      try {
        await signIn(email, password);
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : 'Falha ao entrar.');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (effectiveView === 'signup') {
      if (name.trim().length < 2) {
        setErrorMessage('Informe seu nome completo (mínimo 2 caracteres).');
        return;
      }
      if (!isValidEmail(email)) {
        setErrorMessage('Informe um endereço de e-mail válido.');
        return;
      }
      if (password.length < 8) {
        setErrorMessage('A senha deve ter no mínimo 8 caracteres.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('As senhas digitadas não coincidem.');
        return;
      }

      setSubmitting(true);
      try {
        const result = await signUp(email, password, name);
        if (result.needsEmailConfirmation) {
          setSuccessMessage(
            'Conta criada com sucesso. Enviamos um link de confirmação para o seu e-mail.'
          );
          setPassword('');
          setConfirmPassword('');
        }
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : 'Falha ao criar conta.');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (effectiveView === 'forgot') {
      if (!isValidEmail(email)) {
        setErrorMessage('Informe um endereço de e-mail válido.');
        return;
      }
      setSubmitting(true);
      try {
        await resetPassword(email);
        setSuccessMessage(
          'Se este e-mail estiver cadastrado, enviaremos instruções de recuperação em instantes. Verifique sua caixa de entrada e spam.'
        );
      } catch (err) {
        setErrorMessage(
          err instanceof Error
            ? err.message
            : 'Não foi possível enviar o e-mail de recuperação.'
        );
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (effectiveView === 'recovery') {
      if (password.length < 8) {
        setErrorMessage('A nova senha deve ter no mínimo 8 caracteres.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('As senhas digitadas não coincidem.');
        return;
      }
      setSubmitting(true);
      try {
        await updatePassword(password);
        setSuccessMessage('Senha redefinida com sucesso.');
        setView('login');
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : 'Não foi possível redefinir a senha.'
        );
      } finally {
        setSubmitting(false);
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] dark:bg-[#0B0F17] text-[#0F172A] dark:text-[#F9FAFB] transition-colors">
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/[0.08] bg-white/80 dark:bg-[#111827]/80 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#0D9488] dark:bg-emerald-500 text-white dark:text-[#0B0F17] flex items-center justify-center font-display font-bold text-sm">
            F
          </div>
          <span className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-slate-50 whitespace-nowrap">
            FinAI
          </span>
        </div>

        <button
          type="button"
          onClick={onToggleTheme}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-[#1E293B]/70 text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-[#0D9488] dark:hover:border-emerald-500/40 whitespace-nowrap shrink-0 transition-colors cursor-pointer"
        >
          {theme === 'dark' ? (
            <>
              <Sun className="w-3.5 h-3.5 text-emerald-400" />
              <span>FinAI Claro</span>
            </>
          ) : (
            <>
              <Moon className="w-3.5 h-3.5 text-[#0D9488]" />
              <span>Obsidian Escuro</span>
            </>
          )}
        </button>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#111827]/90 dark:backdrop-blur-md border border-slate-200 dark:border-white/[0.08] p-6 sm:p-8 shadow-[0_12px_32px_-8px_rgba(15,23,42,0.08)] space-y-6">
          <div className="space-y-1.5">
            {effectiveView === 'login' && (
              <>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
                  Entrar no FinAI
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Acesse sua conta para acompanhar suas despesas e inteligência financeira.
                </p>
              </>
            )}

            {effectiveView === 'signup' && (
              <>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
                  Criar sua conta
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Comece a registrar e organizar seus gastos em reais (R$).
                </p>
              </>
            )}

            {effectiveView === 'forgot' && (
              <>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
                  Recuperar senha
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Informe seu e-mail para receber o link de redefinição de acesso.
                </p>
              </>
            )}

            {effectiveView === 'recovery' && (
              <>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
                  Definir nova senha
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Escolha uma nova senha segura com no mínimo 8 caracteres.
                </p>
              </>
            )}
          </div>

          {!isConfigured && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-3.5 py-3 text-xs text-amber-800 dark:text-amber-300"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Variáveis <strong>VITE_SUPABASE_URL</strong> e{' '}
                <strong>VITE_SUPABASE_ANON_KEY</strong> não configuradas neste ambiente.
              </span>
            </div>
          )}

          {errorMessage && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-3.5 py-3 text-xs text-red-700 dark:text-red-300"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div
              role="status"
              className="flex items-start gap-2.5 rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 px-3.5 py-3 text-xs text-emerald-800 dark:text-emerald-300"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {effectiveView === 'signup' && (
              <div>
                <label
                  htmlFor="auth-name"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Nome completo
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="auth-name"
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome"
                    className="w-full h-11 pl-10 pr-3.5 rounded-lg bg-white dark:bg-[#0B0F17]/70 border border-slate-300 dark:border-white/[0.1] text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-[#0D9488] dark:focus:border-emerald-500 focus:ring-3 focus:ring-[#0D9488]/15"
                  />
                </div>
              </div>
            )}

            {effectiveView !== 'recovery' && (
              <div>
                <label
                  htmlFor="auth-email"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  E-mail
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="auth-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="voce@exemplo.com"
                    className="w-full h-11 pl-10 pr-3.5 rounded-lg bg-white dark:bg-[#0B0F17]/70 border border-slate-300 dark:border-white/[0.1] text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-[#0D9488] dark:focus:border-emerald-500 focus:ring-3 focus:ring-[#0D9488]/15"
                  />
                </div>
              </div>
            )}

            {effectiveView !== 'forgot' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="auth-password"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                  >
                    {effectiveView === 'recovery' ? 'Nova senha' : 'Senha'}
                  </label>
                  {effectiveView === 'login' && (
                    <button
                      type="button"
                      onClick={() => switchView('forgot')}
                      className="text-xs font-medium text-[#0D9488] dark:text-emerald-400 hover:underline cursor-pointer"
                    >
                      Esqueci minha senha
                    </button>
                  )}
                </div>

                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={
                      effectiveView === 'login' ? 'current-password' : 'new-password'
                    }
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    className="w-full h-11 pl-10 pr-10 rounded-lg bg-white dark:bg-[#0B0F17]/70 border border-slate-300 dark:border-white/[0.1] text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-[#0D9488] dark:focus:border-emerald-500 focus:ring-3 focus:ring-[#0D9488]/15"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {(effectiveView === 'signup' || effectiveView === 'recovery') && (
                  <div className="space-y-1.5 pt-0.5">
                    <div className="grid grid-cols-4 gap-1.5">
                      {[1, 2, 3, 4].map((step) => (
                        <div
                          key={step}
                          className={`h-1.5 rounded-full transition-colors ${
                            strength.score >= step
                              ? strength.barClass
                              : 'bg-slate-200 dark:bg-white/[0.08]'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 dark:text-slate-400">
                        Força da senha:
                      </span>
                      <span className={`font-medium ${strength.textClass}`}>
                        {strength.label}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {(effectiveView === 'signup' || effectiveView === 'recovery') && (
              <div>
                <label
                  htmlFor="auth-confirm-password"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Confirmar senha
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="auth-confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a senha"
                    className="w-full h-11 pl-10 pr-3.5 rounded-lg bg-white dark:bg-[#0B0F17]/70 border border-slate-300 dark:border-white/[0.1] text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-[#0D9488] dark:focus:border-emerald-500 focus:ring-3 focus:ring-[#0D9488]/15"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-11 inline-flex items-center justify-center gap-2 rounded-lg bg-[#0D9488] hover:bg-[#047857] dark:bg-emerald-500 dark:hover:bg-teal-400 text-white dark:text-[#0B0F17] text-sm font-semibold active:scale-[0.99] disabled:opacity-50 transition-all cursor-pointer"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>
                {effectiveView === 'login' && (submitting ? 'Entrando...' : 'Entrar')}
                {effectiveView === 'signup' && (submitting ? 'Criando conta...' : 'Criar conta')}
                {effectiveView === 'forgot' &&
                  (submitting ? 'Enviando...' : 'Enviar link de recuperação')}
                {effectiveView === 'recovery' &&
                  (submitting ? 'Salvando...' : 'Salvar nova senha')}
              </span>
            </button>
          </form>

          <div className="pt-4 border-t border-slate-100 dark:border-white/[0.06] text-center text-xs text-slate-600 dark:text-slate-400">
            {effectiveView === 'login' && (
              <span>
                Ainda não tem conta?{' '}
                <button
                  type="button"
                  onClick={() => switchView('signup')}
                  className="font-semibold text-[#0D9488] dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  Criar conta
                </button>
              </span>
            )}

            {effectiveView === 'signup' && (
              <span>
                Já possui uma conta?{' '}
                <button
                  type="button"
                  onClick={() => switchView('login')}
                  className="font-semibold text-[#0D9488] dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  Entrar
                </button>
              </span>
            )}

            {effectiveView === 'forgot' && (
              <button
                type="button"
                onClick={() => switchView('login')}
                className="inline-flex items-center gap-1.5 font-semibold text-[#0D9488] dark:text-emerald-400 hover:underline cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Voltar para o login
              </button>
            )}

            {effectiveView === 'recovery' && (
              <button
                type="button"
                onClick={() => {
                  clearRecoveryMode();
                  switchView('login');
                }}
                className="inline-flex items-center gap-1.5 font-semibold text-[#0D9488] dark:text-emerald-400 hover:underline cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Cancelar e voltar ao login
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
