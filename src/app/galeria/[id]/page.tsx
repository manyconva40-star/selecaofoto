import { supabaseAdmin } from '@/lib/supabase';
import ClientGallery from '@/components/ClientGallery';
import { Camera, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export const revalidate = 0; // Evita cache

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string; modo?: string }>;
}

export default async function ClientGalleryPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { token, modo } = await searchParams;

  // 1. Buscar metadados essenciais da sessão no Supabase (sem carregar a senha real no HTML inicial)
  const { data: dbSession, error } = await supabaseAdmin
    .from('sessions')
    .select('id, client_name, session_date, max_selections, status, photographer_id, password, review_token, cover_image_url, photographer_name')
    .eq('id', id)
    .single();

  if (error || !dbSession) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-dark-bg min-h-screen px-4 text-center font-sans">
        <div className="max-w-sm p-8 bg-dark-card border border-dark-border rounded-2xl shadow-xl space-y-5">
          <div className="w-12 h-12 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="font-serif text-2xl font-semibold text-white tracking-tight">Link Inválido</h2>
          <p className="text-text-muted text-xs font-light leading-relaxed">
            A galeria que você está tentando acessar não existe ou o link expirou. Verifique com o seu fotógrafo se o link está correto.
          </p>
          <div className="flex items-center gap-2 text-gold-premium justify-center text-xs font-semibold pt-4">
            <Camera className="w-4 h-4" />
            <span className="tracking-widest uppercase font-serif">FotoSeleção</span>
          </div>
        </div>
      </div>
    );
  }

  // Verificar se o token de revisão é válido (permite reabrir sessão fechada)
  const isReopened =
    token !== undefined &&
    token !== '' &&
    dbSession.review_token !== null &&
    token === dbSession.review_token;

  // Sanitizar o objeto da sessão para a galeria pública, informando apenas se possui senha
  const sanitizedSession = {
    id: dbSession.id,
    client_name: dbSession.client_name,
    date: dbSession.session_date,
    max_photos: dbSession.max_selections,
    hasPassword: dbSession.password !== null && dbSession.password !== '',
    status: isReopened ? 'active' : dbSession.status,
    photographer_id: dbSession.photographer_id,
    reviewToken: isReopened ? token : undefined,
    cover_image_url: dbSession.cover_image_url,
    photographer_name: dbSession.photographer_name,
    isAdditionalMode: isReopened && modo === 'adicional',
  };

  return <ClientGallery session={sanitizedSession} />;
}
