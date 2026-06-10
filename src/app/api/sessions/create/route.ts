import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDriveClient, getOrCreateParentFolder, createSessionFolder } from '@/lib/googleDrive';
import { supabaseAdmin } from '@/lib/supabase';

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

    const { name, client_name, date, max_photos, password } = await request.json();
    // 'name' é o nome da sessão — não existe como coluna separada no schema, será ignorado

    // Validação básica
    if (!client_name || !date || !max_photos) {
      return NextResponse.json(
        { error: 'Parâmetros obrigatórios ausentes: client_name, date, max_photos.' },
        { status: 400 }
      );
    }

    const photographerEmail = session.user.email;
    const photographerName = session.user.name || 'Fotógrafo';

    if (!photographerEmail) {
      return NextResponse.json(
        { error: 'E-mail do fotógrafo não encontrado na sessão.' },
        { status: 400 }
      );
    }

    // 2. Conectar com o Google Drive e criar pastas
    const drive = getDriveClient(session.accessToken as string);
    
    // Obter ou criar pasta raiz "FotoSelecao"
    const parentFolderId = await getOrCreateParentFolder(drive);
    
    // Criar pasta da sessão
    const folderId = await createSessionFolder(drive, parentFolderId, client_name, name);

    // 3. Salvar metadados da sessão no Supabase
    const { data: dbSession, error } = await supabaseAdmin
      .from('sessions')
      .insert([
        {
          client_name,
          session_date: date,
          max_selections: parseInt(max_photos, 10),
          password: password && password.trim() !== '' ? password.trim() : null,
          drive_folder_id: folderId,
          photographer_id: photographerEmail,
          photographer_name: photographerName,
          status: 'active',
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Erro ao salvar sessão no Supabase:', error);
      return NextResponse.json(
        { error: `Erro ao salvar no banco de dados: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(dbSession);
  } catch (error: any) {
    console.error('Erro geral no endpoint /api/sessions/create:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor ao criar sessão.' },
      { status: 500 }
    );
  }
}
