import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDriveClient, uploadPhotoToDrive } from '@/lib/googleDrive';
import { supabaseAdmin } from '@/lib/supabase';

// Aumentar o limite de tamanho do payload se necessário, embora Next.js cuide disso automaticamente.
export async function POST(request: Request) {
  try {
    // 1. Verificar autenticação do fotógrafo
    const session = (await getServerSession(authOptions)) as any;
    if (!session || !session.user || !session.accessToken) {
      return NextResponse.json(
        { error: 'Não autorizado. Faça login com sua conta Google.' },
        { status: 401 }
      );
    }

    const photographerEmail = session.user.email;

    // 2. Processar multipart/form-data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const sessionId = formData.get('sessionId') as string;

    if (!file || !sessionId) {
      return NextResponse.json(
        { error: 'Parâmetros obrigatórios ausentes: file, sessionId.' },
        { status: 400 }
      );
    }

    // 3. Buscar a sessão para validar o proprietário e obter o folder_id
    const { data: dbSession, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError || !dbSession) {
      return NextResponse.json(
        { error: 'Sessão não encontrada.' },
        { status: 404 }
      );
    }

    // Garantir que o fotógrafo que está fazendo upload é o dono da sessão
    if (dbSession.photographer_id !== photographerEmail) {
      return NextResponse.json(
        { error: 'Acesso negado. Você não é o proprietário desta sessão.' },
        { status: 403 }
      );
    }

    // 4. Ler o arquivo em um Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 5. Instanciar cliente do Google Drive
    const drive = getDriveClient(session.accessToken as string);

    // 6. Fazer upload para a pasta no Google Drive correspondente à sessão e torná-lo público
    const uploadResult = await uploadPhotoToDrive(
      drive,
      dbSession.drive_folder_id,
      file.name,
      file.type,
      buffer
    );

    // 7. Inserir metadados da foto no Supabase
    const { data: dbPhoto, error: photoError } = await supabaseAdmin
      .from('photos')
      .insert([
        {
          session_id: sessionId,
          filename: file.name,
          drive_file_id: uploadResult.id,
          thumbnail_url: uploadResult.url,
        },
      ])
      .select()
      .single();

    if (photoError) {
      console.error('Erro ao salvar foto no Supabase:', photoError);
      return NextResponse.json(
        { error: `Erro ao salvar foto no banco de dados: ${photoError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(dbPhoto);
  } catch (error: any) {
    console.error('Erro no endpoint /api/photos/upload:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno ao processar upload.' },
      { status: 500 }
    );
  }
}
