import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const revalidate = 0;

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('sessions')
      .select('id')
      .limit(1);

    if (error) {
      console.error('Erro de conexão com o banco no healthcheck:', error);
      return NextResponse.json(
        { status: 'error', database: 'disconnected', error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Erro geral no endpoint /api/health:', error);
    return NextResponse.json(
      { status: 'error', message: error.message || 'Erro interno do servidor.' },
      { status: 500 }
    );
  }
}
