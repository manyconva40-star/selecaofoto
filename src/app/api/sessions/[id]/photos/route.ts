import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const clientPassword = searchParams.get('password') || '';

    // 1. Buscar a sessão para verificar a senha
    const { data: dbSession, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('password, status')
      .eq('id', id)
      .single();

    if (sessionError || !dbSession) {
      return NextResponse.json(
        { error: 'Sessão não encontrada.' },
        { status: 404 }
      );
    }

    // 2. Se a sessão tiver senha, verificar correspondência
    if (dbSession.password && dbSession.password !== clientPassword) {
      return NextResponse.json(
        { error: 'Acesso negado. Senha incorreta.' },
        { status: 403 }
      );
    }

    // 3. Buscar todas as fotos da sessão (apenas colunas necessárias para exibição pública)
    const { data: photos, error: photosError } = await supabaseAdmin
      .from('photos')
      .select('id, filename, thumbnail_url, drive_file_id')
      .eq('session_id', id)
      .order('filename', { ascending: true });

    if (photosError || !photos) {
      console.error('Erro ao buscar fotos:', photosError);
      return NextResponse.json(
        { error: 'Erro ao carregar as fotos da galeria.' },
        { status: 500 }
      );
    }

    // Construir URL proxy local para cada foto
    const photosWithProxyUrl = photos.map((photo: any) => ({
      ...photo,
      thumbnail_url: `/api/photos/proxy/${photo.drive_file_id}`,
    }));

    return NextResponse.json(photosWithProxyUrl);
  } catch (error: any) {
    console.error('Erro no endpoint /api/sessions/[id]/photos:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno ao carregar fotos.' },
      { status: 500 }
    );
  }
}
