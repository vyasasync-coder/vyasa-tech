import { create } from 'zustand';
import { supabase, type UserProfile } from '../lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;

  setSession: (session: Session | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setError: (error: string | null) => void;

  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string, fullName: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  initAuth: () => Promise<() => void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  isLoading: true,
  error: null,

  setSession: (session) => set({ session, user: session?.user ?? null }),
  setProfile: (profile) => set({ profile }),
  setError: (error) => set({ error }),

  signIn: async (email, password) => {
    set({ isLoading: true, error: null });
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      set({ error: error.message, isLoading: false });
      return false;
    }
    set({ session: data.session, user: data.user, isLoading: false });
    get().fetchProfile();
    return true;
  },

  signUp: async (email, password, fullName) => {
    set({ isLoading: true, error: null });
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) {
      set({ error: error.message, isLoading: false });
      return false;
    }
    set({ session: data.session, user: data.user, isLoading: false });
    if (data.user) {
      // Cria perfil inicial no banco
      await supabase.from('profiles').upsert({
        id: data.user.id,
        email,
        full_name: fullName,
        plan: 'free',
      });
      get().fetchProfile();
    }
    return true;
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null, profile: null });
  },

  fetchProfile: async () => {
    const { user } = get();
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (data) set({ profile: data as UserProfile });
  },

  initAuth: async () => {
    set({ isLoading: true });

    const { data: { session } } = await supabase.auth.getSession();
    set({ session, user: session?.user ?? null, isLoading: false });
    if (session?.user) get().fetchProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user ?? null });
      if (session?.user) get().fetchProfile();
    });

    return () => subscription.unsubscribe();
  },
}));
