import { createClient } from '@supabase/supabase-js';

// Usamos fallbacks para evitar erros de compilação durante o build (quando as variáveis ainda não estão definidas)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-project.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Cliente padrão (usado no cliente e em consultas públicas básicas)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Cliente administrador (usado APENAS no servidor/rotas de API para ignorar RLS e realizar operações administrativas)
export const supabaseAdmin = typeof window === 'undefined' && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : supabase;
