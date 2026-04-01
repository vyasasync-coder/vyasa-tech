import { createClient } from '@supabase/supabase-js';

// Configure com suas credenciais do Supabase em variáveis de ambiente (.env.local)
// VITE_SUPABASE_URL=https://xxx.supabase.co
// VITE_SUPABASE_ANON_KEY=eyJ...
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[Vyasa Sync] Supabase não configurado. Crie um arquivo .env.local com VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.'
  );
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

export type UserProfile = {
  id: string;
  email: string;
  full_name: string | null;
  company: string | null;
  plan: 'free' | 'pro';
  created_at: string;
};
