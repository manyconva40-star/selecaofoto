import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';
import DashboardList from '@/components/DashboardList';

export const revalidate = 0; // Evita cache para garantir dados sempre atualizados

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !session.user.email) {
    redirect('/login');
  }

  // Buscar todas as sessões do fotógrafo com as fotos aninhadas (para contagem de seleção)
  const { data: sessions, error } = await supabaseAdmin
    .from('sessions')
    .select(`
      *,
      photos (
        id
      )
    `)
    .eq('photographer_id', session.user.email)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao buscar sessões do Supabase:', error);
  }

  const initialSessions = sessions || [];
  const photographerName = session.user.name || 'Fotógrafo';

  return (
    <DashboardList 
      initialSessions={initialSessions} 
      photographerName={photographerName} 
    />
  );
}
