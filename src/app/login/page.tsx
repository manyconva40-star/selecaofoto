'use client';

import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Camera, ArrowRight, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (session) {
      router.push('/dashboard');
    }
  }, [session, router]);

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      await signIn('google', { callbackUrl: '/dashboard' });
    } catch (error) {
      console.error('Erro ao fazer login:', error);
      setIsLoading(false);
    }
  };

  if (status === 'loading' || session) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-dark-bg min-h-screen">
        <Loader2 className="w-8 h-8 text-gold-premium animate-spin mb-4" />
        <p className="text-text-muted text-sm font-sans tracking-wide">Redirecionando...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col md:flex-row min-h-screen bg-dark-bg">
      {/* Lado Esquerdo - Banner Editorial Premium */}
      <div className="hidden md:flex md:w-1/2 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-800 via-neutral-900 to-black p-12 flex-col justify-between relative overflow-hidden border-r border-dark-border">
        {/* Efeito sutil de brilho de luz */}
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-gold-premium/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-white/5 rounded-full blur-[100px]" />
        
        <div className="flex items-center gap-2 text-gold-premium z-10">
          <Camera className="w-6 h-6" />
          <span className="font-serif text-xl font-bold tracking-widest uppercase">FotoSeleção</span>
        </div>

        <div className="z-10 max-w-lg">
          <h1 className="font-serif text-4xl lg:text-5xl font-semibold leading-tight text-white mb-6">
            A arte de selecionar, com a elegância que seu trabalho exige.
          </h1>
          <p className="text-text-muted text-base leading-relaxed font-sans font-light">
            Simplifique a comunicação com seus clientes. Suba as fotos da sessão diretamente para seu Google Drive e receba a lista pronta para filtrar no Lightroom em instantes.
          </p>
        </div>

        <div className="text-xs text-text-muted z-10 font-sans tracking-wider">
          © {new Date().getFullYear()} FotoSeleção. Todos os direitos reservados.
        </div>
      </div>

      {/* Lado Direito - Formulário */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-20 bg-dark-bg relative">
        <div className="absolute top-1/4 left-1/4 w-[250px] h-[250px] bg-gold-premium/5 rounded-full blur-[80px] md:hidden" />
        
        <div className="mx-auto w-full max-w-sm z-10">
          {/* Logo Visível apenas no Mobile */}
          <div className="flex items-center gap-2 text-gold-premium mb-8 md:hidden justify-center">
            <Camera className="w-8 h-8" />
            <span className="font-serif text-2xl font-bold tracking-widest uppercase">FotoSeleção</span>
          </div>

          <div className="text-center md:text-left">
            <h2 className="font-serif text-3xl font-semibold text-white tracking-tight mb-2">
              Painel do Fotógrafo
            </h2>
            <p className="text-text-muted text-sm font-sans mb-8">
              Acesse sua conta para gerenciar suas sessões e entregas.
            </p>
          </div>

          <div className="space-y-6">
            <button
              onClick={handleLogin}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 px-5 py-4 border border-dark-border rounded-lg bg-dark-card hover:bg-zinc-800 hover:border-gold-premium transition-all duration-300 group cursor-pointer text-white font-medium text-sm shadow-sm"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 text-gold-premium animate-spin" />
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    fill="#EA4335"
                  />
                </svg>
              )}
              <span className="font-sans">
                {isLoading ? 'Conectando...' : 'Entrar com o Google'}
              </span>
              {!isLoading && (
                <ArrowRight className="w-4 h-4 ml-1 text-text-muted group-hover:text-gold-premium group-hover:translate-x-1 transition-all duration-300" />
              )}
            </button>

            <div className="p-4 rounded-lg bg-zinc-900/50 border border-dark-border/60 text-xs text-text-muted leading-relaxed font-sans">
              <span className="font-semibold text-gold-premium block mb-1">Aviso sobre permissões:</span>
              Para que a plataforma funcione, solicitamos acesso para criar pastas e subir arquivos no seu Google Drive. Nós apenas acessamos os arquivos que são criados por este próprio aplicativo (**FotoSeleção**).
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
