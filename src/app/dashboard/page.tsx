import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { fetchSessionsForPhotographer } from '@/lib/db';
import DashboardList from '@/components/DashboardList';

export const revalidate = 0; // Evita cache para garantir dados sempre atualizados

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !session.user.email) {
    redirect('/login');
  }

  let sessions: any[] = [];
  let dbError: string | null = null;

  try {
    const result = await fetchSessionsForPhotographer(session.user.email);
    sessions = result.sessions;
    dbError = result.error;
  } catch (err: any) {
    console.error('Exceção ao carregar sessões:', err);
    dbError = err.message || 'Falha ao buscar sessões.';
  }

  const photographerName = session.user.name || 'Fotógrafo';

  return (
    <DashboardList 
      initialSessions={sessions} 
      photographerName={photographerName} 
      dbError={dbError}
    />
  );
}


