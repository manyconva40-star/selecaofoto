import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://aulerhoqdfojonvwnduo.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1bGVyaG9xZGZvam9udnduZHVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTA5NjM0OCwiZXhwIjoyMDk2NjcyMzQ4fQ.3muUY-7oXW_1c9-SkB4L7BGvqOSeIvb7QWVGh6m0Blc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function keepAlive() {
  console.log(`📡 Enviando ping de keep-alive para o Supabase em ${supabaseUrl}...`);
  try {
    const { data, error } = await supabase.from('sessions').select('id').limit(1);
    if (error) {
      console.error('❌ Erro no ping do Supabase:', error.message);
      process.exit(1);
    }
    console.log('✅ Supabase ativo e respondendo com sucesso! Registrado atividade no banco.');
  } catch (e: any) {
    console.error('❌ Exceção ao conectar ao Supabase:', e.message || e);
    process.exit(1);
  }
}

keepAlive();
