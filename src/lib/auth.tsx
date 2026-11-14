import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from './supabase';
import { registerUnauthorizedHandler } from './api';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isConfigured: boolean;
  isRecoveryMode: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    name: string
  ) => Promise<{ needsEmailConfirmation: boolean }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  updateProfileName: (name: string) => Promise<void>;
  clearRecoveryMode: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function mapSupabaseAuthError(err: unknown): string {
  const raw =
    err instanceof Error
      ? err.message
      : typeof err === 'string'
      ? err
      : 'Erro de autenticação.';
  const lower = raw.toLowerCase();

  if (
    lower.includes('invalid login credentials') ||
    lower.includes('invalid_credentials')
  ) {
    return 'E-mail ou senha inválidos.';
  }
  if (lower.includes('email not confirmed')) {
    return 'E-mail ainda não confirmado. Verifique sua caixa de entrada.';
  }
  if (
    lower.includes('user already registered') ||
    lower.includes('already been registered') ||
    lower.includes('already exists')
  ) {
    return 'Este e-mail já está cadastrado. Tente entrar ou recuperar sua senha.';
  }
  if (
    lower.includes('rate limit') ||
    lower.includes('too many requests') ||
    lower.includes('only request this after') ||
    lower.includes('429')
  ) {
    return 'Muitas tentativas em sequência. Aguarde alguns instantes e tente novamente.';
  }
  if (
    lower.includes('password should be at least') ||
    lower.includes('weak_password')
  ) {
    return 'A senha deve conter no mínimo 8 caracteres.';
  }
  if (
    lower.includes('different from the old password') ||
    lower.includes('same password')
  ) {
    return 'A nova senha deve ser diferente da senha anterior.';
  }
  if (
    lower.includes('invalid email') ||
    lower.includes('unable to validate email')
  ) {
    return 'Informe um endereço de e-mail válido.';
  }
  if (lower.includes('network') || lower.includes('failed to fetch')) {
    return 'Falha de conexão com o serviço de autenticação. Verifique sua internet.';
  }

  return raw;
}

function hasRecoveryHashInUrl(): boolean {
  if (typeof window === 'undefined') return false;
  const hash = window.location.hash || '';
  const search = window.location.search || '';
  return hash.includes('type=recovery') || search.includes('type=recovery');
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(isSupabaseConfigured);
  const [isRecoveryMode, setIsRecoveryMode] = useState<boolean>(
    hasRecoveryHashInUrl
  );

  const clearLocalSessionState = useCallback(() => {
    setSession(null);
    setUser(null);
    setIsRecoveryMode(false);
  }, []);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let mounted = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return;
        setSession(data.session ?? null);
        setUser(data.session?.user ?? null);
        setLoading(false);
      })
      .catch(() => {
        if (!mounted) return;
        setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession ?? null);
      setUser(nextSession?.user ?? null);

      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveryMode(true);
      } else if (event === 'SIGNED_OUT') {
        setIsRecoveryMode(false);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    clearLocalSessionState();
  }, [clearLocalSessionState]);

  useEffect(() => {
    registerUnauthorizedHandler(() => {
      void signOut();
    });
  }, [signOut]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) {
      throw new Error('Autenticação Supabase não configurada neste ambiente.');
    }
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      throw new Error(mapSupabaseAuthError(error));
    }
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, name: string) => {
      if (!supabase) {
        throw new Error('Autenticação Supabase não configurada neste ambiente.');
      }
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: name.trim(),
            name: name.trim(),
          },
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) {
        throw new Error(mapSupabaseAuthError(error));
      }
      return {
        needsEmailConfirmation: !data.session,
      };
    },
    []
  );

  const resetPassword = useCallback(async (email: string) => {
    if (!supabase) {
      throw new Error('Autenticação Supabase não configurada neste ambiente.');
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin,
    });
    if (error) {
      const lower = error.message.toLowerCase();
      if (
        lower.includes('rate limit') ||
        lower.includes('429') ||
        lower.includes('only request')
      ) {
        throw new Error(mapSupabaseAuthError(error));
      }
    }
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    if (!supabase) {
      throw new Error('Autenticação Supabase não configurada neste ambiente.');
    }
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (error) {
      throw new Error(mapSupabaseAuthError(error));
    }
    setIsRecoveryMode(false);
    if (
      typeof window !== 'undefined' &&
      window.location.hash.includes('type=recovery')
    ) {
      window.history.replaceState(
        null,
        '',
        window.location.pathname + window.location.search
      );
    }
  }, []);

  const updateProfileName = useCallback(async (name: string) => {
    if (!supabase) {
      throw new Error('Autenticação Supabase não configurada neste ambiente.');
    }
    const trimmed = name.trim();
    const { data, error } = await supabase.auth.updateUser({
      data: {
        full_name: trimmed,
        name: trimmed,
      },
    });
    if (error) {
      throw new Error(mapSupabaseAuthError(error));
    }
    if (data.user) {
      setUser(data.user);
    }
  }, []);

  const clearRecoveryMode = useCallback(() => {
    setIsRecoveryMode(false);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      loading,
      isConfigured: isSupabaseConfigured,
      isRecoveryMode,
      signIn,
      signUp,
      signOut,
      resetPassword,
      updatePassword,
      updateProfileName,
      clearRecoveryMode,
    }),
    [
      user,
      session,
      loading,
      isRecoveryMode,
      signIn,
      signUp,
      signOut,
      resetPassword,
      updatePassword,
      updateProfileName,
      clearRecoveryMode,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth deve ser utilizado dentro de AuthProvider.');
  }
  return ctx;
}
