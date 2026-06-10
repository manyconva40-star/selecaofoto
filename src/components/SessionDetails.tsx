'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Camera, ArrowLeft, Download, ExternalLink, 
  Trash2, User, Calendar, CheckSquare, 
  Image as ImageIcon, Check, Link as LinkIcon 
} from 'lucide-react';

interface SessionDetailsProps {
  sessionData: any;
  photosData: any[];
}

export default function SessionDetails({ sessionData, photosData }: SessionDetailsProps) {
  const router = useRouter();
  const [photos] = useState<any[]>(photosData);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const selectedPhotos = photos.filter((p) => p.is_selected);
  const totalPhotos = photos.length;
  const isCompleted = sessionData.status === 'closed';

  const handleCopyLink = async () => {
    const origin = window.location.origin;
    
    try {
      let clientLink = `${origin}/galeria/${sessionData.id}`;

      // Se a sessão está fechada, gerar um review token para reabrir
      if (isCompleted) {
        const res = await fetch(`/api/sessions/${sessionData.id}/review-token`, {
          method: 'POST',
        });
        if (res.ok) {
          const { token } = await res.json();
          clientLink = `${origin}/galeria/${sessionData.id}?token=${token}`;
        }
      }

      await navigator.clipboard.writeText(clientLink);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Erro ao copiar link:', err);
    }
  };

  const handleDeleteSession = async () => {
    if (!confirm('Tem certeza que deseja excluir esta sessão? Isso apagará as fotos associadas no banco de dados e a pasta do Google Drive correspondente.')) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/sessions/${sessionData.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Falha ao excluir sessão');
      }

      router.push('/dashboard');
    } catch (error) {
      console.error('Erro ao deletar sessão:', error);
      alert('Erro ao excluir sessão do servidor.');
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg text-foreground flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-dark-border bg-dark-card/50 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-text-muted hover:text-white transition-colors text-sm cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar ao painel</span>
          </Link>

          <div className="flex items-center gap-2 text-gold-premium">
            <Camera className="w-6 h-6" />
            <span className="font-serif text-xl font-bold tracking-widest uppercase">FotoSeleção</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Info Grid / Session Overview */}
        <div className="bg-dark-card border border-dark-border rounded-xl p-6 lg:p-8 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            
            {/* Detalhes da Sessão */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                  isCompleted 
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}>
                  {sessionData.status}
                </span>
                
                {sessionData.password && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs bg-zinc-800 text-zinc-400 border border-dark-border font-light">
                    Protegida por senha: {sessionData.password}
                  </span>
                )}
              </div>

              <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-white tracking-tight">
                {sessionData.name}
              </h1>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-text-muted text-sm sm:text-base font-light">
                <div className="flex items-center gap-1.5">
                  <User className="w-4 h-4 text-gold-premium" />
                  <span>Cliente: <strong className="text-white font-normal">{sessionData.client_name}</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-gold-premium" />
                  <span>Data: {sessionData.session_date ? new Date(sessionData.session_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '—'}</span>
                </div>
              </div>
            </div>

            {/* Ações Rápidas */}
            <div className="flex flex-col sm:flex-row gap-3 lg:self-center shrink-0">
              <button
                onClick={handleCopyLink}
                className={`flex items-center justify-center gap-2 border px-5 py-3 rounded-lg font-medium text-sm transition-all cursor-pointer ${
                  copySuccess 
                    ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-400' 
                    : 'border-dark-border bg-zinc-900/50 hover:bg-zinc-850 text-white'
                }`}
              >
                <LinkIcon className="w-4.5 h-4.5 text-gold-premium" />
                <span>{copySuccess ? 'Link da Cliente Copiado!' : 'Copiar Link da Cliente'}</span>
              </button>

              <a
                href={`/galeria/${sessionData.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 border border-dark-border bg-zinc-900/50 hover:bg-zinc-850 text-white px-5 py-3 rounded-lg font-medium text-sm transition-all text-center"
              >
                <ExternalLink className="w-4.5 h-4.5 text-gold-premium" />
                <span>Visualizar Galeria</span>
              </a>

              <button
                onClick={handleDeleteSession}
                disabled={isDeleting}
                className="flex items-center justify-center gap-2 border border-dark-border bg-zinc-900/50 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 text-text-muted px-5 py-3 rounded-lg font-medium text-sm transition-all cursor-pointer"
              >
                <Trash2 className="w-4.5 h-4.5" />
                <span>Excluir Sessão</span>
              </button>
            </div>

          </div>

          {/* Estatísticas e Botões de Exportação */}
          <div className="mt-8 pt-8 border-t border-dark-border/40 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            
            {/* Contadores */}
            <div className="flex items-center gap-8 text-center md:text-left">
              <div>
                <span className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1">
                  Fotos Uploaded
                </span>
                <span className="font-serif text-3xl font-bold text-white flex items-center gap-1.5 justify-center md:justify-start">
                  <ImageIcon className="w-6 h-6 text-gold-premium" />
                  {totalPhotos}
                </span>
              </div>
              <div className="border-l border-dark-border/60 pl-8">
                <span className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1">
                  Selecionadas
                </span>
                <span className={`font-serif text-3xl font-bold flex items-center gap-1.5 justify-center md:justify-start ${
                  selectedPhotos.length > 0 ? 'text-gold-premium' : 'text-white'
                }`}>
                  <CheckSquare className="w-6 h-6" />
                  {selectedPhotos.length} / {sessionData.max_selections}
                </span>
              </div>
            </div>

            {/* Exportar Lightroom */}
            {selectedPhotos.length > 0 ? (
              <div className="flex flex-col sm:flex-row gap-3 shrink-0">
                <a
                  href={`/api/sessions/${sessionData.id}/export?format=txt`}
                  className="flex items-center justify-center gap-2 bg-gold-premium hover:bg-gold-premium-hover text-zinc-950 font-semibold px-5 py-3.5 rounded-lg transition-all duration-300 shadow-md shadow-gold-premium/15"
                >
                  <Download className="w-4.5 h-4.5" />
                  <span>Exportar .TXT (Lightroom Classic)</span>
                </a>
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-zinc-900/50 border border-dark-border/40 text-xs text-text-muted max-w-md font-sans">
                💡 **Aguardando seleção da cliente:** Assim que a cliente finalizar e selecionar as fotos, os botões de exportação de arquivos para o Lightroom Classic ficarão disponíveis aqui de forma imediata.
              </div>
            )}

          </div>

        </div>

        {/* Lightroom Info Tip */}
        {selectedPhotos.length > 0 && (
          <div className="mb-8 p-4 rounded-lg bg-zinc-900/50 border border-gold-premium/15 text-xs text-text-muted leading-relaxed font-sans max-w-4xl">
            <span className="font-semibold text-gold-premium block mb-1">💡 Como usar no Adobe Lightroom Classic:</span>
            Baixe o arquivo `.txt`, copie o conteúdo completo (uma linha de nomes de arquivos com espaços). No painel esquerdo do Lightroom, acesse a pasta do ensaio. Abra o filtro de biblioteca (**Biblioteca** {`->`} **Filtro de Texto**), selecione **Nome do Arquivo** {`->`} **Contém**, e cole o texto copiado. Apenas as fotos selecionadas aparecerão no grid imediatamente!
          </div>
        )}

        {/* Grid de Fotos */}
        <div>
          <h2 className="font-serif text-2xl font-semibold text-white tracking-tight mb-6">
            Imagens no Ensaio ({photos.length})
          </h2>

          {photos.length === 0 ? (
            <div className="text-center py-16 border border-dark-border/40 rounded-xl bg-dark-card/20 text-text-muted font-sans font-light">
              Nenhuma imagem carregada nesta sessão.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  className={`bg-dark-card border rounded-lg overflow-hidden transition-all duration-300 relative group aspect-square ${
                    photo.selected 
                      ? 'border-gold-premium ring-1 ring-gold-premium' 
                      : 'border-dark-border hover:border-zinc-700'
                  }`}
                >
                  {/* Imagem */}
                  <img
                    src={`/api/photos/proxy/${photo.drive_file_id}`}
                    alt={photo.filename}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />

                  {/* Badge de Selecionado */}
                  {photo.selected && (
                    <div className="absolute top-2.5 right-2.5 bg-gold-premium text-zinc-950 p-1 rounded-full shadow-md z-10">
                      <Check className="w-4 h-4 stroke-[3]" />
                    </div>
                  )}

                  {/* Nome do Arquivo Overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-2.5 bg-gradient-to-t from-black/85 via-black/50 to-transparent text-[10px] sm:text-xs font-mono text-zinc-300 truncate">
                    {photo.filename}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
