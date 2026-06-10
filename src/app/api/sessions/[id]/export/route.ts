import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. Verificar se o fotógrafo está logado
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Não autorizado. Faça login com sua conta Google.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'txt'; // 'txt' ou 'csv'

    // 2. Buscar a sessão para validar propriedade
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

    // 3. Buscar fotos selecionadas via tabela selections
    const { data: selections, error: selectionsError } = await supabaseAdmin
      .from('selections')
      .select('photo_id, photos(filename)')
      .eq('session_id', id)
      .order('photo_id', { ascending: true });

    if (selectionsError || !selections) {
      return NextResponse.json(
        { error: 'Erro ao buscar fotos selecionadas.' },
        { status: 500 }
      );
    }

    const photos = selections.map((s: any) => ({ filename: s.photos?.filename || '' }));

    const clientSlug = (dbSession.client_name || 'cliente').toLowerCase().replace(/[^a-z0-9]/g, '_');
    const sessionSlug = (dbSession.session_date || id).toString().replace(/[^a-z0-9]/g, '_');
    const baseFileName = `selecao_${clientSlug}_${sessionSlug}`;

    // 4. Gerar resposta com base no formato
    if (format === 'csv') {
      // Formato CSV
      let csvContent = 'Nome do Arquivo,Status\n';
      photos.forEach((photo) => {
        const cleanedName = photo.filename.replace(/"/g, '""');
        csvContent += `"${cleanedName}",Selecionada\n`;
      });

      return new Response(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${baseFileName}.csv"`,
        },
      });
    } else {
      // Extrai apenas os números do nome do arquivo
      // Ex: SAM_0047.JPG → 0047 | IMG_0005.jpg → 0005
      const numbersArray = photos.map((p) => {
        const match = p.filename.match(/(\d+)/g);
        // Pega o último grupo de números encontrado (geralmente é o número da foto)
        return match ? match[match.length - 1] : p.filename;
      });

      const txtContent = numbersArray.join(',');

      return new Response(txtContent, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Content-Disposition': `attachment; filename="${baseFileName}.txt"`,
        },
      });
    }
  } catch (error: any) {
    console.error('Erro no endpoint /api/sessions/[id]/export:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno ao exportar arquivos.' },
      { status: 500 }
    );
  }
}
