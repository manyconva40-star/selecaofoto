import Link from 'next/link';
import { Camera, CheckCircle, Database, Shield, Zap } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="flex-1 flex flex-col bg-dark-bg text-foreground min-h-screen font-sans relative overflow-hidden">
      {/* Background Glow effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-gold-premium/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-white/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="border-b border-dark-border/40 bg-black/20 backdrop-blur-md z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 text-gold-premium">
            <Camera className="w-6 h-6" />
            <span className="font-serif text-xl font-bold tracking-widest uppercase">FotoSeleção</span>
          </div>

          <Link
            href="/dashboard"
            className="border border-gold-premium/30 hover:border-gold-premium hover:bg-gold-premium hover:text-zinc-950 text-gold-premium font-medium px-5 py-2.5 rounded-lg text-sm transition-all duration-300 cursor-pointer"
          >
            Acessar Painel
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-grow flex flex-col justify-center items-center px-4 py-20 z-10 text-center">
        <div className="max-w-3xl space-y-6">
          <span className="text-xs font-semibold tracking-widest text-gold-premium uppercase bg-gold-premium/10 border border-gold-premium/20 px-3.5 py-1.5 rounded-full">
            Para Fotógrafos Profissionais
          </span>
          
          <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl text-white font-medium tracking-tight leading-tight">
            A seleção de fotos de forma <span className="text-gold-premium">impecável</span>.
          </h1>
          
          <p className="text-text-muted text-base sm:text-lg lg:text-xl font-light max-w-xl mx-auto leading-relaxed">
            Seus previews enviados direto para o seu Google Drive, uma galeria de tirar o fôlego para sua cliente selecionar, e a lista pronta para filtrar no Lightroom.
          </p>

          <div className="pt-8 flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/dashboard"
              className="bg-gold-premium hover:bg-gold-premium-hover text-zinc-950 font-semibold px-8 py-4 rounded-lg transition-all duration-300 shadow-lg shadow-gold-premium/15 hover:shadow-gold-premium/25 cursor-pointer text-center"
            >
              Criar Galeria Agora
            </Link>
            
            <Link
              href="/login"
              className="border border-dark-border bg-dark-card hover:bg-zinc-800 text-white font-medium px-8 py-4 rounded-lg transition-all duration-300 text-center"
            >
              Entrar na Plataforma
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-3 gap-8 mt-24 pt-16 border-t border-dark-border/40">
          
          <div className="bg-dark-card/50 border border-dark-border/60 p-6 rounded-xl text-left space-y-4 hover:border-zinc-750 transition-colors">
            <div className="w-10 h-10 bg-gold-premium/10 rounded-lg flex items-center justify-center text-gold-premium">
              <Database className="w-5 h-5" />
            </div>
            <h3 className="font-serif text-lg font-semibold text-white">Google Drive API</h3>
            <p className="text-text-muted text-sm font-light leading-relaxed">
              Upload automatizado. Suas fotos são salvas em pastas organizadas no seu próprio Google Drive, sem taxas adicionais de armazenamento.
            </p>
          </div>

          <div className="bg-dark-card/50 border border-dark-border/60 p-6 rounded-xl text-left space-y-4 hover:border-zinc-750 transition-colors">
            <div className="w-10 h-10 bg-gold-premium/10 rounded-lg flex items-center justify-center text-gold-premium">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="font-serif text-lg font-semibold text-white">Filtro Lightroom</h3>
            <p className="text-text-muted text-sm font-light leading-relaxed">
              Copie e cole a lista de fotos selecionadas diretamente na busca do Adobe Lightroom Classic. Economize horas de trabalho braçal.
            </p>
          </div>

          <div className="bg-dark-card/50 border border-dark-border/60 p-6 rounded-xl text-left space-y-4 hover:border-zinc-750 transition-colors">
            <div className="w-10 h-10 bg-gold-premium/10 rounded-lg flex items-center justify-center text-gold-premium">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="font-serif text-lg font-semibold text-white">Segurança & Senha</h3>
            <p className="text-text-muted text-sm font-light leading-relaxed">
              Crie links únicos e protegidos por senha opcional para garantir a privacidade dos ensaios de seus clientes.
            </p>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-dark-border/40 py-8 text-center text-xs text-text-muted z-10 font-light tracking-wide bg-zinc-950/20">
        FotoSeleção © {new Date().getFullYear()}. Desenvolvido com sofisticação para fotógrafos.
      </footer>
    </div>
  );
}
