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
    // podemos usar a URL de exportação pública do Google Drive pelo backend.
    // O backend atua como cliente, contornando bloqueios de CORS ou cookies de terceiros do navegador do usuário.
    const url = `https://drive.google.com/uc?export=download&id=${fileId}`;

    const response = await fetch(url, {
      // É importante não enviar headers de autenticação para que o Google não tente validar tokens ausentes
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      // Permite seguir redirects (o Google costuma redirecionar uc?export para um servidor de download)
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
