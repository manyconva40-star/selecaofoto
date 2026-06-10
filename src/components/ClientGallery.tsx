'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Lock, Heart, X, ChevronLeft, 
  ChevronRight, CheckCircle2, AlertCircle, Loader2, ShieldAlert,
  ChevronUp, ChevronDown
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
    reviewToken?: string;
    cover_image_url?: string;
    photographer_name?: string;
    isAdditionalMode?: boolean;
  };
}

export default function ClientGallery({ session }: ClientGalleryProps) {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(!session.hasPassword);
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(!session.hasPassword);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // IDs das fotos já selecionadas anteriormente (visíveis em P&B no modo adicional)
  const [previouslySelectedIds, setPreviouslySelectedIds] = useState<Set<string>>(new Set());
  const [activePhotoIndex, setActivePhotoIndex] = useState<number | null>(null);
  
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(session.status === 'closed');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showCopyrightWarning, setShowCopyrightWarning] = useState(false);
  const [isSheetExpanded, setIsSheetExpanded] = useState(false);
  // Track whether lightbox was opened from thumbnail strip (to restore expanded state on close)
  const [lbOpenedFromSheet, setLbOpenedFromSheet] = useState(false);

  const lightboxPhotos = lbOpenedFromSheet
    ? photos.filter((p) => selectedIds.has(p.id))
    : photos;

  const getCoverPosition = () => {
    if (!session.cover_image_url) return 'center';
    const match = session.cover_image_url.match(/[&?]pos=(\d+)/);
    return match ? `center ${match[1]}%` : 'center';
  };

  // Ajustar o índice ativo caso uma foto selecionada seja removida da visualização no lightbox
  useEffect(() => {
    if (activePhotoIndex !== null && lbOpenedFromSheet) {
      const selectedCount = photos.filter((p) => selectedIds.has(p.id)).length;
      if (selectedCount === 0) {
        setActivePhotoIndex(null);
        setLbOpenedFromSheet(false);
      } else if (activePhotoIndex >= selectedCount) {
        setActivePhotoIndex(selectedCount - 1);
      }
    }
  }, [selectedIds, activePhotoIndex, lbOpenedFromSheet, photos]);

  // Drag state for bottom sheet
  const sheetDragStart = useRef<number | null>(null);
  const sheetDragDelta = useRef<number>(0);

  const handleSheetPointerDown = (e: React.PointerEvent) => {
    sheetDragStart.current = e.clientY;
    sheetDragDelta.current = 0;
  };

  const handleSheetPointerMove = (e: React.PointerEvent) => {
    if (sheetDragStart.current === null) return;
    sheetDragDelta.current = e.clientY - sheetDragStart.current;
  };

  const handleSheetPointerUp = () => {
    if (sheetDragStart.current === null) return;
    const delta = sheetDragDelta.current;
    if (delta < -30) setIsSheetExpanded(true);   // swipe up
    if (delta > 30) setIsSheetExpanded(false);   // swipe down
    sheetDragStart.current = null;
    sheetDragDelta.current = 0;
  };

  const handleSheetTouchStart = (e: React.TouchEvent) => {
    sheetDragStart.current = e.touches[0].clientY;
    sheetDragDelta.current = 0;
  };

  const handleSheetTouchMove = (e: React.TouchEvent) => {
    if (sheetDragStart.current === null) return;
    sheetDragDelta.current = e.touches[0].clientY - sheetDragStart.current;
  };

  const handleSheetTouchEnd = () => {
    if (sheetDragStart.current === null) return;
    const delta = sheetDragDelta.current;
    if (delta < -30) setIsSheetExpanded(true);
    if (delta > 30) setIsSheetExpanded(false);
    sheetDragStart.current = null;
    sheetDragDelta.current = 0;
  };

  const isAdditionalMode = session.isAdditionalMode === true;

  // Calcular excedente de fotos (desativado no modo adicional)
  const packageLimit = session.max_photos || 0;
  const overLimit = !isAdditionalMode && packageLimit > 0 ? Math.max(0, selectedIds.size - packageLimit) : 0;
  const isOverLimit = !isAdditionalMode && overLimit > 0;

  // Proteção contra Printscreen, Impressão e Cópia
  useEffect(() => {
    // 1. Bloquear perda de foco (captura printscreen de celular/PC)
    const handleBlur = () => {
      if (isAuthenticated && !isSuccess) {
        setShowCopyrightWarning(true);
      }
    };

    // 2. Bloquear teclas de printscreen, impressão e ferramentas de dev
    const handleKeyDownProtection = (e: KeyboardEvent) => {
      if (!isAuthenticated || isSuccess) return;

      const isMac = typeof window !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      // Tecla PrintScreen / PrtScn
      if (e.key === 'PrintScreen' || e.key === 'PrtScn' || e.keyCode === 44) {
        e.preventDefault();
        setShowCopyrightWarning(true);
        try {
          navigator.clipboard.writeText('Galeria Protegida © - Cópia Proibida');
        } catch (_) {}
        return;
      }

      // Ctrl+P ou Cmd+P (Imprimir)
      if (cmdOrCtrl && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        setShowCopyrightWarning(true);
        return;
      }

      // Ctrl+S ou Cmd+S (Salvar página)
      if (cmdOrCtrl && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        setShowCopyrightWarning(true);
        return;
      }

      // F12 ou Ctrl+Shift+I / Cmd+Opt+I (Ferramentas de desenvolvedor)
      if (
        e.key === 'F12' ||
        (cmdOrCtrl && e.shiftKey && (e.key === 'i' || e.key === 'I')) ||
        (cmdOrCtrl && e.shiftKey && (e.key === 'j' || e.key === 'J'))
      ) {
        e.preventDefault();
        setShowCopyrightWarning(true);
        return;
      }

      // Ctrl+U / Cmd+Opt+U (Código fonte)
      if (cmdOrCtrl && (e.key === 'u' || e.key === 'U')) {
        e.preventDefault();
        setShowCopyrightWarning(true);
        return;
      }
    };

    // 3. Bloquear botão direito (menu de contexto)
    const handleContextMenu = (e: MouseEvent) => {
      if (isAuthenticated && !isSuccess) {
        e.preventDefault();
      }
    };

    // 4. Bloquear cópia e recorte de tela
    const handleCopy = (e: ClipboardEvent) => {
      if (isAuthenticated && !isSuccess) {
        e.preventDefault();
        setShowCopyrightWarning(true);
      }
    };

    // 5. Bloquear arrastar imagens
    const handleDragStart = (e: DragEvent) => {
      if (isAuthenticated && !isSuccess) {
        e.preventDefault();
      }
    };

    window.addEventListener('blur', handleBlur);
    window.addEventListener('keydown', handleKeyDownProtection, true);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('cut', handleCopy);
    document.addEventListener('dragstart', handleDragStart);

    return () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('keydown', handleKeyDownProtection, true);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('cut', handleCopy);
      document.removeEventListener('dragstart', handleDragStart);
    };
  }, [isAuthenticated, isSuccess]);


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
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        setPhotos(data.photos || []);
        if (data.selectedPhotoIds) {
          if (isAdditionalMode) {
            // Em modo adicional: fotos antigas ficam em P&B (previouslySelectedIds)
            // e a nova seleção começa vazia
            setPreviouslySelectedIds(new Set(data.selectedPhotoIds));
            setSelectedIds(new Set());
          } else {
            setSelectedIds(new Set(data.selectedPhotoIds));
          }
        }
      } else {
        setPhotos(Array.isArray(data) ? data : []);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao carregar fotos da galeria.');
    } finally {
      setLoading(false);
    }
  }, [session.id, password, isAdditionalMode]);

  // Carregar fotos se já estiver autenticado no início
  useEffect(() => {
    if (isAuthenticated) {
      fetchPhotos();
    }
  }, [isAuthenticated, fetchPhotos]);

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
      setPassword('');
      setLoading(false);
    }
  };

  // Alternar seleção da foto
  const toggleSelectPhoto = (photoId: string) => {
    if (session.status === 'closed') return;
    // Em modo adicional, fotos já selecionadas não podem ser alteradas
    if (isAdditionalMode && previouslySelectedIds.has(photoId)) return;

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
          reviewToken: session.reviewToken,
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
      setActivePhotoIndex((prev) => (prev !== null && prev < lightboxPhotos.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowLeft') {
      setActivePhotoIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'Escape') {
      setActivePhotoIndex(null);
    }
  }, [activePhotoIndex, lightboxPhotos.length]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Renderizar Tela de Senha
  if (!isAuthenticated) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-dark-bg min-h-screen px-4">
        <div className="w-full max-w-sm p-8 bg-dark-card border border-dark-border rounded-2xl shadow-xl space-y-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-zinc-900 border border-dark-border rounded-full flex items-center justify-center mx-auto mb-3">
              <Lock className="w-5 h-5 text-gold-premium" />
            </div>
            <h2 className="font-serif text-2xl font-semibold text-white tracking-tight">Galeria Protegida</h2>
            <p className="text-text-muted text-xs font-light mt-1.5 leading-relaxed">
              Insira a senha fornecida pelo fotógrafo para acessar as fotos do ensaio de {session.client_name}.
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
            Oi, deusa, já recebi suas fotos selecionadas e em breve entro em contato com você.
          </p>
          <div className="bg-zinc-900/50 p-4 border border-dark-border rounded-lg text-left text-xs space-y-2">
            <p className="text-zinc-300 font-medium">Resumo:</p>
            {isAdditionalMode ? (
              <p className="text-text-muted"><strong>Fotos adicionais selecionadas:</strong> {selectedIds.size}</p>
            ) : (
              <>
                <p className="text-text-muted"><strong>Total de fotos:</strong> {selectedIds.size}</p>
                {overLimit > 0 && (
                  <p className="text-text-muted"><strong>Adicionais:</strong> {overLimit}</p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  }



  return (
    <div
      className="min-h-screen bg-dark-bg text-foreground flex flex-col font-sans"
      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
    >
      {/* Banner de Imersão/Capa (se houver) */}
      {session.cover_image_url && (
        <div className="relative w-full h-[85vh] md:h-screen flex flex-col items-center justify-center overflow-hidden">
          {/* Imagem de Fundo */}
          <div className="absolute inset-0 z-0">
            <img
              src={session.cover_image_url}
              alt="Capa da Galeria"
              className="w-full h-full object-cover pointer-events-none select-none"
              style={{ objectPosition: getCoverPosition() }}
            />
            {/* Gradiente escuro para contraste e legibilidade */}
            <div className="absolute inset-0 bg-black/45 backdrop-brightness-[0.9] bg-gradient-to-b from-black/30 via-black/25 to-dark-bg" />
          </div>

          {/* Conteúdo Textual Centralizado */}
          <div className="relative z-10 flex flex-col items-center text-center px-4 max-w-3xl mx-auto space-y-6">
            <h1 className="font-serif text-4xl sm:text-6xl md:text-7xl font-extralight text-white tracking-widest uppercase drop-shadow-xl leading-tight select-none">
              {session.client_name}
            </h1>
            
            <button
              onClick={() => {
                document.getElementById('gallery-grid')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="mt-8 border border-white hover:border-gold-premium hover:bg-gold-premium hover:text-zinc-950 text-white font-serif tracking-[0.2em] text-[10px] sm:text-xs uppercase px-8 py-3.5 rounded-none transition-all duration-300 cursor-pointer shadow-lg active:scale-95 hover:scale-103"
            >
              Ver Galeria
            </button>
          </div>
        </div>
      )}

      {/* Header Cliente (apenas se não houver imagem de capa para evitar redundância) */}
      {!session.cover_image_url && (
        <header className="border-b border-dark-border bg-dark-card/30 backdrop-blur-md sticky top-0 z-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
            <div>
              <span className="font-serif text-lg text-white font-medium">{session.client_name}</span>
            </div>
          </div>
        </header>
      )}

      {/* Galeria Grid */}
      <main id="gallery-grid" className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-48">
        {error ? (
          <div className="max-w-md mx-auto text-center py-12 p-6 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
            <AlertCircle className="w-10 h-10 mx-auto mb-3" />
            <p className="font-medium">{error}</p>
            <button 
              onClick={() => fetchPhotos()} 
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
              {isAdditionalMode && (
                <div className="inline-flex items-center gap-2 mb-3 px-3 py-1.5 rounded-full bg-gold-premium/10 border border-gold-premium/30 text-gold-premium text-xs font-semibold tracking-wide">
                  <span className="w-1.5 h-1.5 rounded-full bg-gold-premium animate-pulse" />
                  Modo Fotos Adicionais
                </div>
              )}
              <h2 className="font-serif text-2xl sm:text-3xl font-medium text-white">
                {isAdditionalMode ? 'Selecione suas fotos adicionais' : 'Selecione suas fotos favoritas'}
              </h2>
              <p className="text-text-muted text-xs sm:text-sm font-light mt-1.5 leading-relaxed">
                {isAdditionalMode
                  ? 'As fotos em preto e branco já foram selecionadas. Escolha apenas as novas fotos que deseja adicionar.'
                  : 'Clique na foto para ver em tela cheia. Clique no coração para selecionar.'}
              </p>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {photos.map((photo, index) => {
                const isSelected = selectedIds.has(photo.id);
                const isPrevious = isAdditionalMode && previouslySelectedIds.has(photo.id);

                return (
                  <div
                    key={photo.id}
                    className={`bg-dark-card border rounded-xl overflow-hidden aspect-square transition-all duration-300 relative group ${
                      isPrevious
                        ? 'border-zinc-700/50 cursor-default opacity-70'
                        : isSelected
                          ? 'border-gold-premium ring-1 ring-gold-premium cursor-pointer'
                          : 'border-dark-border/70 hover:border-zinc-650 cursor-pointer'
                    }`}
                  >
                    {/* Imagem do grid com proteção anti-print */}
                    <div
                      className="relative w-full h-full"
                      onClick={() => !isPrevious && setActivePhotoIndex(index)}
                    >
                      <img
                        src={photo.thumbnail_url}
                        alt={photo.filename}
                        loading="lazy"
                        draggable={false}
                        onContextMenu={(e) => e.preventDefault()}
                        className={`w-full h-full object-cover transition-all duration-500 pointer-events-none ${
                          isPrevious
                            ? 'grayscale brightness-75'
                            : 'group-hover:scale-103'
                        }`}
                      />
                      {/* Overlay anti-screenshot transparente */}
                      <div className="absolute inset-0" style={{ background: 'transparent' }} />
                    </div>

                    {/* Badge "Já Selecionada" para modo adicional */}
                    {isPrevious && (
                      <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded-full bg-black/70 border border-zinc-600/50 text-zinc-400 text-[10px] font-semibold tracking-wide z-10">
                        <CheckCircle2 className="w-3 h-3 shrink-0" />
                        <span>Já selecionada</span>
                      </div>
                    )}

                    {/* Botão de coração de seleção (oculto para fotos já selecionadas) */}
                    {!isPrevious && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
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
                    )}

                    {/* Nome do arquivo sutil overlay ao hover */}
                    {!isPrevious && (
                      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-zinc-300 truncate">
                        {photo.filename}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Overlay escuro quando sheet expandida */}
      {isSheetExpanded && (
        <div
          className="fixed inset-0 bg-black/60 z-24 transition-opacity duration-400"
          onClick={() => setIsSheetExpanded(false)}
        />
      )}

      {/* Bottom Sheet - Barra de Progresso Expansível */}
      {photos.length > 0 && (
        <div
          className="fixed left-0 right-0 bg-dark-card/97 backdrop-blur-xl border-t border-dark-border z-25"
          style={{
            bottom: 0,
            height: isSheetExpanded ? '80vh' : 'auto',
            transition: 'height 0.45s cubic-bezier(0.32, 0.72, 0, 1)',
          }}
        >
          {/* Handle de Expandir/Recolher — clique para alternar */}
          <div
            className="flex flex-col items-center pt-2 pb-1.5 cursor-pointer select-none"
            onClick={() => setIsSheetExpanded((v) => !v)}
          >
            {isSheetExpanded ? (
              <ChevronDown className="w-4.5 h-4.5 text-gold-premium/80 mb-0.5" />
            ) : (
              <ChevronUp className="w-4.5 h-4.5 text-gold-premium/80 mb-0.5 animate-bounce" style={{ animationDuration: '3s' }} />
            )}
            {selectedIds.size > 0 && (
              <span className="text-[9px] text-zinc-500 tracking-widest uppercase font-medium">
                {isSheetExpanded ? 'Clique para recolher' : 'Clique para conferir sua seleção'}
              </span>
            )}
          </div>

          {/* Área de Miniaturas */}
          {selectedIds.size > 0 && (
            <div
              className="overflow-y-auto no-scrollbar"
              style={{ maxHeight: isSheetExpanded ? 'calc(80vh - 130px)' : undefined }}
            >
              {isSheetExpanded ? (
                /* Grade expandida: fotos maiores em grid */
                <div className="px-4 pb-2">
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                    {photos
                      .filter((p) => selectedIds.has(p.id))
                      .map((photo) => (
                        <div
                          key={photo.id}
                          className="relative rounded-xl overflow-hidden border-2 border-gold-premium group cursor-pointer transition-transform duration-200 hover:scale-105 active:scale-95 aspect-square"
                          onClick={() => {
                            setLbOpenedFromSheet(true);
                            const selectedPhotos = photos.filter((p) => selectedIds.has(p.id));
                            setActivePhotoIndex(selectedPhotos.indexOf(photo));
                          }}
                        >
                          <img
                            src={photo.thumbnail_url}
                            alt={photo.filename}
                            draggable={false}
                            onContextMenu={(e) => e.preventDefault()}
                            className="w-full h-full object-cover pointer-events-none"
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSelectPhoto(photo.id);
                            }}
                            className="absolute top-1 right-1 bg-black/70 hover:bg-red-600 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                            title="Remover seleção"
                          >
                            <X className="w-3 h-3 text-white" />
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              ) : (
                /* Tira horizontal: miniaturas pequenas */
                <div
                  className="flex gap-2 px-4 py-2 overflow-x-auto no-scrollbar border-b border-dark-border/50"
                  style={{ WebkitOverflowScrolling: 'touch' }}
                >
                  {photos
                    .filter((p) => selectedIds.has(p.id))
                    .map((photo) => (
                      <div
                        key={photo.id}
                        className="relative shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 border-gold-premium group cursor-pointer transition-transform duration-200 hover:scale-105 active:scale-95"
                        onClick={() => {
                          setLbOpenedFromSheet(true);
                          const selectedPhotos = photos.filter((p) => selectedIds.has(p.id));
                          setActivePhotoIndex(selectedPhotos.indexOf(photo));
                        }}
                      >
                        <img
                          src={photo.thumbnail_url}
                          alt={photo.filename}
                          draggable={false}
                          onContextMenu={(e) => e.preventDefault()}
                          className="w-full h-full object-cover pointer-events-none"
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelectPhoto(photo.id);
                          }}
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                          title="Remover seleção"
                        >
                          <X className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* Contador e Botão Finalizar */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 py-3">
            <div className="text-center sm:text-left flex-1">
              <span className="block text-xs uppercase tracking-wider text-text-muted mb-0.5">
                {isAdditionalMode ? 'Fotos adicionais' : 'Selecionadas'}
              </span>
              <div className="flex items-center gap-2">
                <span className="font-serif text-lg font-bold text-white">
                  {isAdditionalMode ? (
                    <>
                      <span className="text-gold-premium">{selectedIds.size}</span>
                      <span className="text-sm font-normal text-text-muted ml-1">
                        foto{selectedIds.size !== 1 ? 's' : ''} selecionada{selectedIds.size !== 1 ? 's' : ''}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className={isOverLimit ? 'text-amber-400' : 'text-gold-premium'}>{selectedIds.size}</span>
                      {packageLimit > 0 && <span className="text-text-muted font-normal"> / {packageLimit}</span>}
                      <span className="text-sm font-normal text-text-muted ml-1">foto{selectedIds.size !== 1 ? 's' : ''}</span>
                    </>
                  )}
                </span>
                {!isAdditionalMode && isOverLimit && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-semibold">
                    +{overLimit} extra{overLimit !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              {!isAdditionalMode && isOverLimit && (
                <p className="text-amber-400 text-[11px] font-medium mt-1 leading-snug max-w-xs">
                  Você atingiu a quantidade de fotos contratadas. A partir de agora, haverá um acréscimo de R$ 30 por foto adicional.
                </p>
              )}
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
      {activePhotoIndex !== null && lightboxPhotos[activePhotoIndex] && (
        <div className="fixed inset-0 bg-black/95 z-50 flex flex-col justify-between select-none">
          {/* Header Lightbox */}
          <div className="h-20 px-4 sm:px-6 lg:px-8 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent">
            <span className="font-mono text-xs text-zinc-400">
              {lightboxPhotos[activePhotoIndex].filename} ({activePhotoIndex + 1} de {lightboxPhotos.length})
            </span>
            
            <button
              onClick={() => {
                setActivePhotoIndex(null);
                if (lbOpenedFromSheet) setIsSheetExpanded(true);
                setLbOpenedFromSheet(false);
              }}
              className="p-2 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Área Central da Imagem — setas para navegar (todas as plataformas) */}
          <div className="flex-grow flex items-center justify-between px-2 sm:px-6 relative">
            {/* Botão Anterior */}
            <button
              onClick={() => setActivePhotoIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : prev))}
              disabled={activePhotoIndex === 0}
              className="p-3 rounded-full bg-black/45 text-white hover:bg-zinc-800 disabled:opacity-20 disabled:cursor-not-allowed transition-all active:scale-90 cursor-pointer z-10 shrink-0"
            >
              <ChevronLeft className="w-7 h-7" />
            </button>

            {/* Imagem */}
            <div className="flex-1 h-[70vh] flex items-center justify-center relative select-none">
              <img
                src={lightboxPhotos[activePhotoIndex].thumbnail_url}
                alt={lightboxPhotos[activePhotoIndex].filename}
                draggable={false}
                onContextMenu={(e) => e.preventDefault()}
                className="max-w-full max-h-full object-contain pointer-events-none"
                style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
              />
              {/* Overlay anti-screenshot no lightbox */}
              <div className="absolute inset-0" style={{ background: 'transparent', pointerEvents: 'none' }} />
            </div>

            {/* Botão Próximo */}
            <button
              onClick={() => setActivePhotoIndex((prev) => (prev !== null && prev < lightboxPhotos.length - 1 ? prev + 1 : prev))}
              disabled={activePhotoIndex === lightboxPhotos.length - 1}
              className="p-3 rounded-full bg-black/45 text-white hover:bg-zinc-800 disabled:opacity-20 disabled:cursor-not-allowed transition-all active:scale-90 cursor-pointer z-10 shrink-0"
            >
              <ChevronRight className="w-7 h-7" />
            </button>
          </div>

          {/* Footer Lightbox */}
          <div className="h-24 px-4 flex flex-col items-center justify-center gap-2 bg-gradient-to-t from-black/80 to-transparent pb-4">
            <button
              onClick={() => toggleSelectPhoto(lightboxPhotos[activePhotoIndex].id)}
              className={`flex items-center gap-2 px-6 py-3.5 rounded-full font-medium text-sm transition-all duration-300 active:scale-95 cursor-pointer shadow-md ${
                selectedIds.has(lightboxPhotos[activePhotoIndex].id)
                  ? 'bg-gold-premium text-zinc-950 scale-105'
                  : 'bg-zinc-800 text-white hover:bg-zinc-700'
              }`}
            >
              <Heart className={`w-4 h-4 ${selectedIds.has(lightboxPhotos[activePhotoIndex].id) ? 'fill-zinc-950' : 'fill-none'}`} />
              <span>
                {selectedIds.has(lightboxPhotos[activePhotoIndex].id) ? 'Selecionada' : 'Selecionar Foto'}
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
                Você selecionou <strong>{selectedIds.size}</strong> foto{selectedIds.size !== 1 ? 's' : ''}{isAdditionalMode ? ' adicionais' : ''}. Após a confirmação, sua escolha será enviada e **não poderá ser modificada**.
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

      {/* Modal/Overlay de Proteção de Direitos Autorais */}
      {showCopyrightWarning && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fade-in select-none">
          <div className="bg-dark-card border border-gold-premium/30 p-8 sm:p-10 rounded-2xl max-w-md w-full space-y-6 shadow-2xl text-center relative overflow-hidden">
            {/* Brilho dourado premium de fundo */}
            <div className="absolute -top-10 -left-10 w-40 h-40 bg-gold-premium/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-gold-premium/5 rounded-full blur-3xl pointer-events-none" />

            <div className="w-16 h-16 bg-gold-premium/15 text-gold-premium rounded-full flex items-center justify-center mx-auto ring-1 ring-gold-premium/30">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <div className="space-y-3">
              <h3 className="font-serif text-2xl font-semibold text-white tracking-tight">
                Proteção de Direitos Autorais
              </h3>
              <p className="text-text-muted text-sm font-light leading-relaxed">
                Esta galeria é protegida contra cópias e capturas de tela (printscreen). 
                Para garantir a melhor qualidade e integridade do ensaio de <strong className="text-white">{session.client_name}</strong>, use os botões de seleção da plataforma.
              </p>
              <p className="text-gold-premium/90 text-xs font-medium bg-gold-premium/5 border border-gold-premium/20 py-2.5 px-3 rounded-lg">
                Prints e capturas não autorizadas violam os termos de serviço e a propriedade intelectual do fotógrafo.
              </p>
            </div>

            <button
              onClick={() => setShowCopyrightWarning(false)}
              className="w-full bg-gold-premium hover:bg-gold-premium-hover text-zinc-950 font-bold py-3.5 rounded-lg text-sm transition-all duration-300 shadow-md shadow-gold-premium/10 hover:shadow-gold-premium/20 active:scale-98 cursor-pointer"
            >
              Continuar na Galeria
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
