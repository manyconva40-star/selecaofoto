import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { randomUUID } from 'crypto';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. Verificar autenticação do fotógrafo
    const session = (await getServerSession(authOptions)) as any;
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Não autorizado.' },
        { status: 401 }
      );
    }

    // 2. Buscar a sessão para validar propriedade
    const { data: dbSession, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('id, photographer_id, status')
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
        { error: 'Acesso negado.' },
        { status: 403 }
      );
    }

    // 3. Gerar token único e salvar no banco
    const reviewToken = randomUUID();

    const { error: updateError } = await supabaseAdmin
      .from('sessions')
      .update({ review_token: reviewToken })
      .eq('id', id);

    if (updateError) {
      console.error('Erro ao salvar review_token:', updateError);
      return NextResponse.json(
        { error: 'Erro ao gerar token de revisão.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ token: reviewToken });
  } catch (error: any) {
    console.error('Erro no endpoint /api/sessions/[id]/review-token:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno.' },
      { status: 500 }
    );
  }
}
