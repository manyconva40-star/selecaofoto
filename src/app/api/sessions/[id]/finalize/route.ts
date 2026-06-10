import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { Resend } from 'resend';

// Inicializa o Resend se a chave estiver configurada
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { selectedPhotoIds } = await request.json();

    if (!Array.isArray(selectedPhotoIds)) {
      return NextResponse.json(
        { error: 'Parâmetro selectedPhotoIds deve ser uma lista de IDs.' },
        { status: 400 }
      );
    }

    // 1. Buscar a sessão para obter metadados
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

    if (dbSession.status === 'closed') {
      return NextResponse.json(
        { error: 'Esta seleção já foi finalizada anteriormente.' },
        { status: 400 }
      );
    }

    // 2. Apagar seleções anteriores desta sessão (caso a cliente tenha tentado mais de uma vez)
    const { error: deleteSelectionsError } = await supabaseAdmin
      .from('selections')
      .delete()
      .eq('session_id', id);

    if (deleteSelectionsError) {
      console.error('Erro ao limpar seleções anteriores:', deleteSelectionsError);
      return NextResponse.json(
        { error: 'Erro ao processar seleção de fotos.' },
        { status: 500 }
      );
    }

    // 3. Inserir as novas seleções na tabela selections
    if (selectedPhotoIds.length > 0) {
      const selectionsToInsert = selectedPhotoIds.map((photoId: string) => ({
        session_id: id,
        photo_id: photoId,
        client_name: dbSession.client_name,
      }));

      const { error: insertError } = await supabaseAdmin
        .from('selections')
        .insert(selectionsToInsert);

      if (insertError) {
        console.error('Erro ao salvar seleções no Supabase:', insertError);
        return NextResponse.json(
          { error: 'Erro ao salvar fotos selecionadas.' },
          { status: 500 }
        );
      }
    }

    // 4. Atualizar o status da sessão para "closed"
    const { error: updateSessionError } = await supabaseAdmin
      .from('sessions')
      .update({ status: 'closed' })
      .eq('id', id);

    if (updateSessionError) {
      console.error('Erro ao atualizar status da sessão:', updateSessionError);
      return NextResponse.json(
        { error: 'Erro ao finalizar a sessão no banco de dados.' },
        { status: 500 }
      );
    }

    // 5. Enviar notificação por e-mail para o fotógrafo via Resend
    let emailSent = false;
    let emailError = null;

    if (resend && process.env.RESEND_API_KEY !== 're_seu_token_aqui') {
      try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const dashboardUrl = `${appUrl}/dashboard/sessao/${id}`;

        const emailResult = await resend.emails.send({
          from: 'FotoSeleção <onboarding@resend.dev>',
          to: dbSession.photographer_id,
          subject: `✨ Seleção Concluída! ${dbSession.client_name} escolheu as fotos`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; background-color: #ffffff; color: #333333;">
              <h2 style="color: #b88f29; font-family: serif; border-bottom: 2px solid #b88f29; padding-bottom: 10px;">Seleção de Fotos Concluída!</h2>
              <p>Olá fotógrafo(a),</p>
              <p>Sua cliente <strong>${dbSession.client_name}</strong> finalizou a seleção de fotos.</p>
              
              <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Cliente:</strong> ${dbSession.client_name}</p>
                <p style="margin: 5px 0;"><strong>Fotos Selecionadas:</strong> ${selectedPhotoIds.length} de ${dbSession.max_selections}</p>
                <p style="margin: 5px 0;"><strong>Finalizado em:</strong> ${new Date().toLocaleString('pt-BR')}</p>
              </div>

              <p>Acesse o painel para visualizar as fotos selecionadas.</p>
              
              <div style="text-align: center; margin-top: 30px; margin-bottom: 20px;">
                <a href="${dashboardUrl}" style="background-color: #b88f29; color: #ffffff; text-decoration: none; padding: 12px 25px; border-radius: 5px; font-weight: bold; font-size: 16px; display: inline-block;">Ver Seleção no Painel</a>
              </div>

              <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 30px 0;" />
              <p style="font-size: 12px; color: #888888; text-align: center;">Este é um e-mail automático enviado pelo FotoSeleção.</p>
            </div>
          `,
        });

        if (emailResult.error) {
          emailError = emailResult.error;
          console.error('Erro de API no Resend:', emailResult.error);
        } else {
          emailSent = true;
        }
      } catch (err: any) {
        emailError = err.message;
        console.error('Erro ao enviar e-mail via Resend:', err);
      }
    } else {
      console.warn('Resend não configurado. Adicione RESEND_API_KEY no arquivo .env.');
    }

    return NextResponse.json({
      success: true,
      emailSent,
      emailError,
    });
  } catch (error: any) {
    console.error('Erro geral no endpoint /api/sessions/[id]/finalize:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor ao finalizar seleção.' },
      { status: 500 }
    );
  }
}
