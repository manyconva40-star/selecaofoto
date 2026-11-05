import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getSessionDetailsById } from '@/lib/db';
import SessionDetails from '@/components/SessionDetails';

export const revalidate = 0; // Evita cache para garantir dados sempre atualizados

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SessionDetailsPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  const { id } = await params;

  if (!session || !session.user || !session.user.email) {
    redirect('/login');
  }

  const { session: dbSession, photos: dbPhotos, selections: dbSelections } = await getSessionDetailsById(id);

  if (!dbSession) {
    console.error('Sessão não encontrada');
    redirect('/dashboard');
  }

  const selectedPhotoIds = new Set((dbSelections || []).map((s: any) => s.photo_id));
  const selectedAt = dbSelections && dbSelections.length > 0 ? dbSelections[0].selected_at : null;

  const photosData = (dbPhotos || []).map((photo: any) => ({
    ...photo,
    is_selected: selectedPhotoIds.has(photo.id),
  }));

  return (
    <SessionDetails 
      sessionData={{
        ...dbSession,
        selected_at: selectedAt
      }} 
      photosData={photosData} 
    />
  );
}

