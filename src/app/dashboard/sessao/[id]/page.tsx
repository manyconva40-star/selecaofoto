import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';
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

  // 1. Buscar a sessão para garantir que existe e pertence a este fotógrafo
  const { data: dbSession, error: sessionError } = await supabaseAdmin
    .from('sessions')
    .select('*')
    .eq('id', id)
    .eq('photographer_id', session.user.email)
    .single();

  if (sessionError || !dbSession) {
    console.error('Erro ao buscar sessão no banco de dados:', sessionError);
    redirect('/dashboard');
  }

  // 2. Buscar todas as fotos desta sessão
  const { data: dbPhotos, error: photosError } = await supabaseAdmin
    .from('photos')
    .select('id, filename, thumbnail_url, drive_file_id')
    .eq('session_id', id)
    .order('filename', { ascending: true });

  if (photosError) {
    console.error('Erro ao buscar fotos da sessão no banco de dados:', photosError);
  }

  // 3. Buscar quais fotos foram selecionadas pela cliente
  const { data: dbSelections } = await supabaseAdmin
    .from('selections')
    .select('photo_id, selected_at')
    .eq('session_id', id);

  const selectedPhotoIds = new Set((dbSelections || []).map((s: any) => s.photo_id));
  const selectedAt = dbSelections && dbSelections.length > 0 ? dbSelections[0].selected_at : null;

  // 4. Marcar cada foto com is_selected
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
