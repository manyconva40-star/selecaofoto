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
    // usamos a API do Google Drive v3 com API Key para servir o conteúdo binário.
    // Isso é mais confiável do que uc?export=download, que pode redirecionar para vírus-scan.
    const apiKey = process.env.GOOGLE_API_KEY;
    const url = apiKey
      ? `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${apiKey}`
      : `https://drive.google.com/uc?export=download&id=${fileId}`;

    const response = await fetch(url, {
      // Não enviar headers de autenticação para requisições com API Key pública
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      console.error(`Falha ao buscar imagem do Drive (Status: ${response.status})`);
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
  } catch (error: any) {
    console.error('Erro no proxy público de imagem:', error);
    return new NextResponse('Erro ao carregar imagem.', { status: 500 });
  }
}
