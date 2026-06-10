'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Camera, Lock, Eye, Heart, X, ChevronLeft, 
  ChevronRight, CheckCircle2, AlertCircle, Loader2 
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface ClientGalleryProps {
  session: {
    id: string;
    client_name: string;
    date: string;
    max_photos: number;
    hasPassword: boolean;
    status: string;
    photographer_id: string;
  };
}

export default function ClientGallery({ session }: ClientGalleryProps) {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(!session.hasPassword);
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activePhotoIndex, setActivePhotoIndex] = useState<number | null>(null);
  
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(session.status === 'closed');
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Carregar fotos do servidor
  const fetchPhotos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/sessions/${session.id}/photos${password ? `?password=${encodeURIComponent(password)}` : ''}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Erro ao carregar fotos.');
      }

      const data = await response.json();
      setPhotos(data);
      // Não há coluna 'selected' no schema — seleções ficam na tabela selections
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao carregar fotos da galeria.');
    } finally {
      setLoading(false);
    }
  }, [session.id, password]);

  // Carregar fotos se já estiver autenticado no início
  useEffect(() => {
    if (isAuthenticated && session.status !== 'closed') {
      fetchPhotos();
    }
  }, [isAuthenticated, session.status, fetchPhotos]);

  // Lidar com envio de senha
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch(`/api/sessions/${session.id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao verificar senha.');
      }

      setIsAuthenticated(true);
      // O useEffect vai disparar e chamar fetchPhotos automaticamente com a senha agora que isAuthenticated = true.
    } catch (err: any) {
      setError(err.message || 'Senha incorreta. Tente novamente.');
      setLoading(false);
    }
  };

  // Alternar seleção da foto
  const toggleSelectPhoto = (photoId: string) => {
    if (session.status === 'closed') return;

    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(photoId)) {
        newSet.delete(photoId);
      } else {
        newSet.add(photoId);
      }
      return newSet;
    });
  };

  // Finalizar seleção
  const handleFinalize = async () => {
    setIsSubmitting(true);
    setError(null);
    setShowConfirmModal(false);

    try {
      const response = await fetch(`/api/sessions/${session.id}/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectedPhotoIds: Array.from(selectedIds),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao finalizar seleção.');
      }

      // Confetti celebration!
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#C5A880', '#FFFFFF', '#161618'],
      });

      setIsSuccess(true);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Falha ao salvar sua seleção.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Navegar no Lightbox por teclado
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (activePhotoIndex === null) return;
    
    if (e.key === 'ArrowRight') {
      setActivePhotoIndex((prev) => (prev !== null && prev < photos.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowLeft') {
      setActivePhotoIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'Escape') {
      setActivePhotoIndex(null);
    }
  }, [activePhotoIndex, photos.length]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Renderizar Tela de Sucesso (Agradecimento)
  if (isSuccess) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-dark-bg min-h-screen px-4 py-12 text-center">
        <div className="max-w-md mx-auto p-8 bg-dark-card border border-dark-border rounded-2xl shadow-xl space-y-6">
          <div className="w-16 h-16 bg-gold-premium/10 text-gold-premium rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h1 className="font-serif text-3xl font-semibold text-white tracking-tight">
            Seleção Finalizada!
          </h1>
          <p className="text-text-muted text-sm leading-relaxed font-light">
            Olá, <strong>{session.client_name}</strong>! Suas fotos escolhidas foram enviadas com sucesso para o fotógrafo.
          </p>
          <div className="bg-zinc-900/50 p-4 border border-dark-border rounded-lg text-left text-xs space-y-2">
            <p className="text-zinc-300 font-medium">Resumo do Envio:</p>
            <p className="text-text-muted"><strong>Fotos selecionadas:</strong> {selectedIds.size} fotos</p>
            <p className="text-text-muted"><strong>Status:</strong> Seleção Concluída (E-mail enviado)</p>
          </div>
          <p className="text-gold-premium text-xs font-medium pt-2">
            O fotógrafo já foi notificado e entrará em contato em breve. Obrigado!
          </p>
        </div>
      </div>
    );
  }

  // Renderizar Tela de Senha
  if (!isAuthenticated) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-dark-bg min-h-screen px-4">
        <div className="w-full max-w-sm p-8 bg-dark-card border border-dark-border rounded-2xl shadow-xl space-y-6">
          <div className="flex items-center gap-2 text-gold-premium justify-center">
            <Camera className="w-6 h-6" />
            <span className="font-serif text-lg font-bold tracking-widest uppercase">FotoSeleção</span>
          </div>

          <div className="text-center">
            <div className="w-12 h-12 bg-zinc-900 border border-dark-border rounded-full flex items-center justify-center mx-auto mb-3">
              <Lock className="w-5 h-5 text-gold-premium" />
            </div>
            <h2 className="font-serif text-2xl font-semibold text-white tracking-tight">Galeria Protegida</h2>
            <p className="text-text-muted text-xs font-light mt-1.5 leading-relaxed">
              Insira a senha fornecida pelo fotógrafo para acessar as fotos do ensaio de **{session.client_name}**.
            </p>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <input
              type="password"
              required
              placeholder="Digite a senha de acesso"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className="w-full bg-zinc-900 border border-dark-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-gold-premium text-white text-center tracking-wide"
            />
            {error && (
              <p className="text-red-400 text-xs flex items-center justify-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{error}</span>
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gold-premium hover:bg-gold-premium-hover text-zinc-950 font-medium py-3 rounded-lg text-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <span>Acessar Galeria</span>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Renderizar Carregamento
  if (loading && photos.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-dark-bg min-h-screen">
        <Loader2 className="w-8 h-8 text-gold-premium animate-spin mb-4" />
        <p className="text-text-muted text-sm font-sans tracking-wide">Carregando galeria...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-bg text-foreground flex flex-col font-sans">
      {/* Header Cliente */}
      <header className="border-b border-dark-border bg-dark-card/30 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div>
            <span className="text-xs text-text-muted block font-light">Fotógrafo: {session.photographer_id}</span>
            <span className="font-serif text-lg text-white font-medium">{session.client_name}</span>
          </div>

          <div className="text-right">
            <span className="text-xs text-text-muted block font-light">Cliente</span>
            <span className="font-medium text-sm text-gold-premium">{session.client_name}</span>
          </div>
        </div>
      </header>

      {/* Galeria Grid */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-32">
        {error ? (
          <div className="max-w-md mx-auto text-center py-12 p-6 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
            <AlertCircle className="w-10 h-10 mx-auto mb-3" />
            <p className="font-medium">{error}</p>
            <button 
              onClick={() => fetchPhotos(password)} 
              className="mt-4 text-xs underline cursor-pointer hover:text-white"
            >
              Tentar novamente
            </button>
          </div>
        ) : photos.length === 0 ? (
          <div className="text-center py-20 text-text-muted font-light">
            Não há fotos cadastradas nesta sessão.
          </div>
        ) : (
          <div>
            {/* Boas vindas cliente */}
            <div className="mb-8 border-b border-dark-border/40 pb-6 text-center sm:text-left">
              <h2 className="font-serif text-2xl sm:text-3xl font-medium text-white">
                Selecione suas fotos favoritas
              </h2>
              <p className="text-text-muted text-xs sm:text-sm font-light mt-1.5 leading-relaxed">
                Clique na foto para ver em tela cheia. Clique no coração para selecionar.
              </p>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {photos.map((photo, index) => {
                const isSelected = selectedIds.has(photo.id);

                return (
                  <div
                    key={photo.id}
                    className={`bg-dark-card border rounded-xl overflow-hidden aspect-square transition-all duration-300 relative group cursor-pointer ${
                      isSelected 
                        ? 'border-gold-premium ring-1 ring-gold-premium' 
                        : 'border-dark-border/70 hover:border-zinc-650'
                    }`}
                  >
                    {/* Imagem do grid */}
                    <img
                      src={photo.thumbnail_url}
                      alt={photo.filename}
                      loading="lazy"
                      onClick={() => setActivePhotoIndex(index)}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-103"
                    />

                    {/* Botão de coração de seleção */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // Evita abrir o lightbox ao selecionar
                        toggleSelectPhoto(photo.id);
                      }}
                      className={`absolute top-2.5 right-2.5 p-2 rounded-full shadow-md z-10 transition-all duration-300 active:scale-90 cursor-pointer ${
                        isSelected
                          ? 'bg-gold-premium text-zinc-950 scale-105'
                          : 'bg-black/60 text-white hover:bg-black/80 opacity-90 group-hover:opacity-100'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${isSelected ? 'fill-zinc-950' : 'fill-none'}`} />
                    </button>

                    {/* Nome do arquivo sutil overlay ao hover */}
                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-zinc-300 truncate">
                      {photo.filename}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Barra de Progresso Inferior Fixa */}
      {photos.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-dark-card/90 backdrop-blur-md border-t border-dark-border z-25 py-5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left flex-1">
              <span className="block text-xs uppercase tracking-wider text-text-muted mb-0.5">
                Fotos Escolhidas
              </span>
              <span className="font-serif text-lg font-bold text-white">
                <span className="text-gold-premium">{selectedIds.size}</span> foto{selectedIds.size !== 1 ? 's' : ''}
              </span>
            </div>

            <button
              onClick={() => setShowConfirmModal(true)}
              disabled={selectedIds.size === 0 || isSubmitting}
              className="w-full sm:w-auto bg-gold-premium hover:bg-gold-premium-hover disabled:bg-zinc-800 disabled:text-text-muted text-zinc-950 font-semibold px-8 py-3 rounded-lg transition-all duration-300 cursor-pointer disabled:cursor-not-allowed shadow-md shadow-gold-premium/10 hover:shadow-gold-premium/20 active:scale-95"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Enviando...</span>
                </span>
              ) : (
                <span>Finalizar Seleção</span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Lightbox / Visualização em Tela Cheia */}
      {activePhotoIndex !== null && (
        <div className="fixed inset-0 bg-black/95 z-50 flex flex-col justify-between select-none">
          {/* Header Lightbox */}
          <div className="h-20 px-4 sm:px-6 lg:px-8 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent">
            <span className="font-mono text-xs text-zinc-400">
              {photos[activePhotoIndex].filename} ({activePhotoIndex + 1} de {photos.length})
            </span>
            
            <button
              onClick={() => setActivePhotoIndex(null)}
              className="p-2 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Área Central da Imagem */}
          <div className="flex-grow flex items-center justify-between px-2 sm:px-6 relative">
            {/* Botão Anterior */}
            <button
              onClick={() => setActivePhotoIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : prev))}
              disabled={activePhotoIndex === 0}
              className="p-3 rounded-full bg-black/45 text-white hover:bg-zinc-800 disabled:opacity-20 disabled:cursor-not-allowed transition-all active:scale-90 cursor-pointer z-10"
            >
              <ChevronLeft className="w-7 h-7" />
            </button>

            {/* Imagem */}
            <div className="w-full h-[70vh] flex items-center justify-center relative">
              <img
                src={photos[activePhotoIndex].thumbnail_url}
                alt={photos[activePhotoIndex].filename}
                className="max-w-full max-h-full object-contain"
              />
            </div>

            {/* Botão Próximo */}
            <button
              onClick={() => setActivePhotoIndex((prev) => (prev !== null && prev < photos.length - 1 ? prev + 1 : prev))}
              disabled={activePhotoIndex === photos.length - 1}
              className="p-3 rounded-full bg-black/45 text-white hover:bg-zinc-800 disabled:opacity-20 disabled:cursor-not-allowed transition-all active:scale-90 cursor-pointer z-10"
            >
              <ChevronRight className="w-7 h-7" />
            </button>
          </div>

          {/* Footer Lightbox */}
          <div className="h-24 px-4 flex flex-col items-center justify-center gap-2 bg-gradient-to-t from-black/80 to-transparent pb-4">
            <button
              onClick={() => toggleSelectPhoto(photos[activePhotoIndex].id)}
              className={`flex items-center gap-2 px-6 py-3.5 rounded-full font-medium text-sm transition-all duration-300 active:scale-95 cursor-pointer shadow-md ${
                selectedIds.has(photos[activePhotoIndex].id)
                  ? 'bg-gold-premium text-zinc-950 scale-105'
                  : 'bg-zinc-800 text-white hover:bg-zinc-700'
              }`}
            >
              <Heart className={`w-4 h-4 ${selectedIds.has(photos[activePhotoIndex].id) ? 'fill-zinc-950' : 'fill-none'}`} />
              <span>
                {selectedIds.has(photos[activePhotoIndex].id) ? 'Selecionada' : 'Selecionar Foto'}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Modal de Confirmação */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/75 z-40 flex items-center justify-center p-4">
          <div className="bg-dark-card border border-dark-border p-6 sm:p-8 rounded-2xl max-w-sm w-full space-y-6 shadow-2xl">
            <div className="w-12 h-12 bg-gold-premium/10 text-gold-premium rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            
            <div className="text-center space-y-2">
              <h3 className="font-serif text-xl font-semibold text-white">Finalizar Seleção?</h3>
              <p className="text-text-muted text-sm font-light leading-relaxed">
                Você selecionou <strong>{selectedIds.size}</strong> fotos. Após a confirmação, sua escolha será enviada e **não poderá ser modificada**.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 border border-dark-border bg-zinc-900/50 hover:bg-zinc-800 text-white font-medium py-3 rounded-lg text-sm transition-all cursor-pointer"
              >
                Revisar
              </button>
              <button
                onClick={handleFinalize}
                className="flex-grow bg-gold-premium hover:bg-gold-premium-hover text-zinc-950 font-semibold py-3 rounded-lg text-sm transition-all cursor-pointer"
              >
                Confirmar e Enviar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
