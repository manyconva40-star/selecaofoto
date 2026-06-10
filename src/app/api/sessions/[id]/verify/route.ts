import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { password } = await request.json();

    // Buscar a sessão
    const { data: dbSession, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('password')
      .eq('id', id)
      .single();

    if (sessionError || !dbSession) {
      return NextResponse.json(
        { error: 'Sessão não encontrada.' },
        { status: 404 }
      );
    }

    // Se a sessão não tiver senha, é válida automaticamente
    if (!dbSession.password) {
      return NextResponse.json({ success: true });
    }

    // Verificar correspondência
    if (dbSession.password.trim() === password.trim()) {
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { success: false, error: 'Senha incorreta. Tente novamente.' },
      { status: 401 }
    );
  } catch (error: any) {
    console.error('Erro no endpoint /api/sessions/[id]/verify:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno ao verificar senha.' },
      { status: 500 }
    );
  }
}
