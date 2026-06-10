import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { getDriveClient, deleteFolderFromDrive } from '@/lib/googleDrive';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. Verificar autenticação
    const session = (await getServerSession(authOptions)) as any;
    if (!session || !session.user || !session.accessToken) {
      return NextResponse.json(
        { error: 'Não autorizado. Faça login com sua conta Google.' },
        { status: 401 }
      );
    }

    // 2. Buscar a sessão para validar propriedade e obter o folder_id
    const { data: dbSession, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('*')
      .eq('id', id)
      .single();

    if (sessionError || !dbSession) {
      return NextResponse.json(
        { error: 'Sessão não encontrada.' },
        { status: 404 }
      );
    }

    if (dbSession.photographer_id !== session.user.email) {
      return NextResponse.json(
        { error: 'Acesso negado. Você não é o proprietário desta sessão.' },
        { status: 403 }
      );
    }

    // 3. Deletar pasta correspondente no Google Drive (se folder_id existir)
    if (dbSession.drive_folder_id) {
      try {
        const drive = getDriveClient(session.accessToken as string);
        await deleteFolderFromDrive(drive, dbSession.drive_folder_id);
      } catch (driveErr) {
        console.error('Falha ao deletar pasta no Google Drive (prosseguindo com a deleção no banco):', driveErr);
      }
    }

    // 4. Deletar a sessão no Supabase (deleta fotos em cascata devido à foreign key)
    const { error: deleteError } = await supabaseAdmin
      .from('sessions')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Erro ao deletar sessão no Supabase:', deleteError);
      return NextResponse.json(
        { error: 'Erro ao deletar sessão do banco de dados.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro no endpoint DELETE /api/sessions/[id]:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno ao excluir sessão.' },
      { status: 500 }
    );
  }
}
