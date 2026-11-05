import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params;

    if (!fileId) {
      return new NextResponse('File ID obrigatório.', { status: 400 });
    }

    // Como as imagens foram marcadas como públicas (role: reader, type: anyone) durante o upload,
    // usamos o endpoint de miniaturas (thumbnail) do Google Drive. Ele retorna a imagem
    // em tamanho médio e otimizado (sz=w1200) de forma pública e confiável, sem exigir
    // autenticação OAuth 2.0 ou chaves de API (que não são suportadas com alt=media)
    // e sem cair no aviso de vírus-scan do uc?export=download.
    const url = `https://drive.google.com/thumbnail?id=${fileId}&sz=w1200`;

    let response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      redirect: 'follow',
    });

    // Fallback: se o endpoint de miniatura falhar por qualquer motivo, tenta a URL uc
    if (!response.ok) {
      console.warn(`Falha ao buscar miniatura do Drive (Status: ${response.status}). Tentando export/download fallback...`);
      const fallbackUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
      response = await fetch(fallbackUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        redirect: 'follow',
      });
    }

    if (!response.ok) {
      console.error(`Falha ao buscar imagem do Drive em ambos os endpoints (Status: ${response.status})`);
      return new NextResponse('Imagem inacessível.', { status: response.status });
    }

    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600',
      },
    });
  } catch (error) {
    console.error('Erro no proxy público de imagem:', error);
    return new NextResponse('Erro ao carregar imagem.', { status: 500 });
  }
}
