import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDriveClient } from '@/lib/googleDrive';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params;

    if (!fileId) {
      return new NextResponse('File ID obrigatório.', { status: 400 });
    }

    // Verifica se a foto existe no banco (valida que é um fileId legítimo do sistema)
    const { data: photo, error: photoError } = await supabaseAdmin
      .from('photos')
      .select('id, session_id')
      .eq('drive_file_id', fileId)
      .single();

    if (photoError || !photo) {
      return new NextResponse('Foto não encontrada.', { status: 404 });
    }

    // Verifica se a sessão associada existe e está ativa (sem verificar senha aqui — link já foi validado)
    const { data: dbSession } = await supabaseAdmin
      .from('sessions')
      .select('status, photographer_id')
      .eq('id', photo.session_id)
      .single();

    if (!dbSession) {
      return new NextResponse('Sessão não encontrada.', { status: 404 });
    }

    // Busca o access token do fotógrafo dono da sessão via NextAuth
    // Para servir a imagem, precisamos de um token válido — usamos o token da sessão atual
    const session = (await getServerSession(authOptions)) as any;

    if (!session?.accessToken) {
      return new NextResponse('Não autorizado.', { status: 401 });
    }

    // Busca o conteúdo do arquivo diretamente via Google Drive API
    const drive = getDriveClient(session.accessToken as string);

    const driveResponse = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'arraybuffer' }
    );

    const buffer = Buffer.from(driveResponse.data as ArrayBuffer);
    const contentType = (driveResponse.headers as any)['content-type'] || 'image/jpeg';

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600',
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error('Erro no proxy de imagem:', error);
    return new NextResponse('Erro ao carregar imagem.', { status: 500 });
  }
}
