'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { 
  Camera, ArrowLeft, Upload, FileImage, 
  Trash2, Plus, Loader2, CheckCircle2, 
  AlertCircle, ShieldAlert 
} from 'lucide-react';
import { resizeImageIfNeeded } from '@/utils/resizeImage';

interface UploadQueueItem {
  file: File;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  errorMsg?: string;
}

export default function NovaSessaoPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    name: '',
    client_name: '',
    date: new Date().toISOString().split('T')[0],
    max_photos: '30',
    password: '',
  });

  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUploadIndex, setCurrentUploadIndex] = useState<number | null>(null);
  const [globalProgress, setGlobalProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [createdSessionId, setCreatedSessionId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Redireciona se não estiver logado
  if (authStatus === 'unauthenticated') {
    router.push('/login');
    return null;
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFilesToQueue(Array.from(e.target.files));
    }
  };

  const addFilesToQueue = (files: File[]) => {
    // Filtrar apenas imagens
    const imageFiles = files.filter((file) => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
      alert('Por favor, selecione apenas arquivos de imagem.');
      return;
    }

    const newItems = imageFiles.map((file) => ({
      file,
      status: 'pending' as const,
      progress: 0,
    }));

    setUploadQueue((prev) => [...prev, ...newItems]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      addFilesToQueue(Array.from(e.dataTransfer.files));
    }
  };

  const handleRemoveFromQueue = (index: number) => {
    setUploadQueue((prev) => prev.filter((_, i) => i !== index));
  };

  const handleClearQueue = () => {
    setUploadQueue([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploadQueue.length === 0) {
      setError('Por favor, adicione pelo menos uma foto antes de criar a sessão.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setGlobalProgress(0);

    try {
      // 1. Criar a sessão no banco e pasta no Drive
      const sessionResponse = await fetch('/api/sessions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!sessionResponse.ok) {
        const errData = await sessionResponse.json();
        throw new Error(errData.error || 'Erro ao criar sessão.');
      }

      const createdSession = await sessionResponse.json();
      setCreatedSessionId(createdSession.id);

      // 2. Fazer upload das fotos uma a uma com redimensionamento
      const totalFiles = uploadQueue.length;
      let completedCount = 0;

      for (let i = 0; i < totalFiles; i++) {
        setCurrentUploadIndex(i);
        setUploadQueue((prev) => {
          const updated = [...prev];
          updated[i].status = 'uploading';
          return updated;
        });

        const item = uploadQueue[i];

        try {
          // A: Redimensionar no cliente se ativado/necessário
          const resizedFile = await resizeImageIfNeeded(item.file, 1200);

          // B: Preparar FormData
          const uploadFormData = new FormData();
          uploadFormData.append('file', resizedFile);
          uploadFormData.append('sessionId', createdSession.id);

          // C: Fazer upload com XMLHttpRequest para monitorar progresso se quiséssemos, 
          // mas como o upload é rápido (devido ao redimensionamento de 150KB), podemos usar fetch padrão
          const uploadResponse = await fetch('/api/photos/upload', {
            method: 'POST',
            body: uploadFormData,
          });

          if (!uploadResponse.ok) {
            const uploadErr = await uploadResponse.json();
            throw new Error(uploadErr.error || 'Erro no upload.');
          }

          completedCount++;
          setUploadQueue((prev) => {
            const updated = [...prev];
            updated[i].status = 'success';
            updated[i].progress = 100;
            return updated;
          });
        } catch (fileError: any) {
          console.error(`Erro ao subir arquivo ${item.file.name}:`, fileError);
          setUploadQueue((prev) => {
            const updated = [...prev];
            updated[i].status = 'error';
            updated[i].errorMsg = fileError.message || 'Erro no envio';
            return updated;
          });
        }

        // Atualizar progresso global
        setGlobalProgress(Math.round((completedCount / totalFiles) * 100));
      }

      setIsSuccess(true);
    } catch (err: any) {
      console.error('Erro na criação da sessão:', err);
      setError(err.message || 'Ocorreu um erro ao criar a sessão.');
    } finally {
      setIsSubmitting(false);
      setCurrentUploadIndex(null);
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg text-foreground flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-dark-border bg-dark-card/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-text-muted hover:text-white transition-colors text-sm cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar ao painel</span>
          </Link>

          <div className="flex items-center gap-2 text-gold-premium">
            <Camera className="w-5 h-5" />
            <span className="font-serif text-lg font-bold tracking-widest uppercase">FotoSeleção</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-grow max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {isSuccess ? (
          // Tela de Sucesso
          <div className="max-w-md mx-auto text-center py-16 px-6 bg-dark-card border border-dark-border rounded-2xl shadow-xl">
            <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-6" />
            <h2 className="font-serif text-3xl font-semibold text-white tracking-tight mb-3">Sessão Criada!</h2>
            <p className="text-text-muted text-sm leading-relaxed font-light mb-8">
              A sessão <strong>"{formData.name}"</strong> para <strong>{formData.client_name}</strong> foi configurada com sucesso.
              As fotos estão salvas na pasta correspondente do seu Google Drive.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  const origin = window.location.origin;
                  navigator.clipboard.writeText(`${origin}/galeria/${createdSessionId}`);
                  alert('Link copiado com sucesso!');
                }}
                className="w-full bg-gold-premium hover:bg-gold-premium-hover text-zinc-950 font-medium py-3 rounded-lg transition-all cursor-pointer"
              >
                Copiar Link da Cliente
              </button>
              <Link
                href="/dashboard"
                className="w-full border border-dark-border bg-zinc-900/50 hover:bg-zinc-800 text-white font-medium py-3 rounded-lg text-sm transition-all text-center"
              >
                Ir para o Painel
              </Link>
            </div>
          </div>
        ) : (
          // Formulário e Upload
          <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row gap-8">
            {/* Lado Esquerdo - Detalhes da Sessão */}
            <div className="flex-1 bg-dark-card border border-dark-border rounded-xl p-6 lg:p-8 flex flex-col justify-between">
              <div>
                <h2 className="font-serif text-2xl font-semibold text-white tracking-tight mb-2">
                  Nova Sessão
                </h2>
                <p className="text-text-muted text-sm font-light mb-8">
                  Preencha os dados da sessão antes de selecionar as fotos para envio.
                </p>

                <div className="space-y-5">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
                      Nome da Cliente
                    </label>
                    <input
                      type="text"
                      name="client_name"
                      required
                      placeholder="Ex: Maria Carolina"
                      value={formData.client_name}
                      onChange={handleInputChange}
                      disabled={isSubmitting}
                      className="w-full bg-zinc-900 border border-dark-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-gold-premium text-white transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
                      Nome do Ensaio / Sessão
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      placeholder="Ex: Ensaio Externo Gestante"
                      value={formData.name}
                      onChange={handleInputChange}
                      disabled={isSubmitting}
                      className="w-full bg-zinc-900 border border-dark-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-gold-premium text-white transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
                        Data da Sessão
                      </label>
                      <input
                        type="date"
                        name="date"
                        required
                        value={formData.date}
                        onChange={handleInputChange}
                        disabled={isSubmitting}
                        className="w-full bg-zinc-900 border border-dark-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-gold-premium text-white transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
                        Limite de Fotos
                      </label>
                      <input
                        type="number"
                        name="max_photos"
                        required
                        min="1"
                        value={formData.max_photos}
                        onChange={handleInputChange}
                        disabled={isSubmitting}
                        className="w-full bg-zinc-900 border border-dark-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-gold-premium text-white transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
                      Senha de Acesso (Opcional)
                    </label>
                    <input
                      type="text"
                      name="password"
                      placeholder="Deixe em branco para acesso sem senha"
                      value={formData.password}
                      onChange={handleInputChange}
                      disabled={isSubmitting}
                      className="w-full bg-zinc-900 border border-dark-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-gold-premium text-white transition-colors"
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="mt-6 flex items-start gap-2.5 p-4 rounded-lg bg-red-500/10 border border-red-500/25 text-red-400 text-sm leading-relaxed">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Botão de Envio */}
              {!isSubmitting && (
                <button
                  type="submit"
                  className="mt-8 w-full bg-gold-premium hover:bg-gold-premium-hover text-zinc-950 font-semibold py-3.5 rounded-lg transition-all duration-300 shadow-md shadow-gold-premium/15 hover:shadow-gold-premium/30 cursor-pointer active:scale-98"
                >
                  Criar Sessão e Enviar Fotos
                </button>
              )}
            </div>

            {/* Lado Direito - Área de Upload */}
            <div className="flex-1 bg-dark-card border border-dark-border rounded-xl p-6 lg:p-8 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-serif text-xl font-semibold text-white">
                    Fotos do Preview ({uploadQueue.length})
                  </h3>
                  {uploadQueue.length > 0 && !isSubmitting && (
                    <button
                      type="button"
                      onClick={handleClearQueue}
                      className="text-xs text-text-muted hover:text-red-400 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Limpar lista</span>
                    </button>
                  )}
                </div>

                {/* Área Drag and Drop */}
                {!isSubmitting && (
                  <div
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-dark-border hover:border-gold-premium rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 bg-zinc-900/35 hover:bg-zinc-900/60 min-h-[180px]"
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      multiple
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <Upload className="w-10 h-10 text-gold-premium mb-3" />
                    <span className="text-white text-sm font-medium block mb-1">
                      Arraste as fotos aqui ou clique para selecionar
                    </span>
                    <span className="text-text-muted text-xs font-light max-w-xs leading-relaxed">
                      Selecione previews em JPG ou PNG. Redimensionamento inteligente automático para 1200px ativado para uploads instantâneos.
                    </span>
                  </div>
                )}

                {/* Progresso de Upload Global */}
                {isSubmitting && (
                  <div className="p-5 border border-dark-border rounded-xl bg-zinc-900/60 mb-6 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-gold-premium">
                        Criando pasta no Google Drive & Enviando arquivos...
                      </span>
                      <span className="text-sm font-bold text-white">{globalProgress}%</span>
                    </div>
                    <div className="w-full bg-zinc-800 h-2.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-gold-premium h-full transition-all duration-300"
                        style={{ width: `${globalProgress}%` }}
                      />
                    </div>
                    <p className="text-xs text-text-muted font-light leading-relaxed">
                      Aguarde enquanto os arquivos são processados, redimensionados e enviados de forma segura diretamente para o seu Google Drive.
                    </p>
                  </div>
                )}

                {/* Fila de arquivos */}
                <div className="mt-6 space-y-3.5 max-h-[350px] overflow-y-auto pr-1">
                  {uploadQueue.map((item, index) => {
                    const isUploading = item.status === 'uploading';
                    const isSuccess = item.status === 'success';
                    const isError = item.status === 'error';

                    return (
                      <div 
                        key={index} 
                        className={`flex items-center justify-between p-3.5 rounded-lg border text-sm transition-all duration-200 ${
                          isUploading ? 'border-gold-premium/40 bg-gold-premium/5' :
                          isSuccess ? 'border-emerald-500/30 bg-emerald-500/5' :
                          isError ? 'border-red-500/35 bg-red-500/5' :
                          'border-dark-border/80 bg-zinc-900/20'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <FileImage className={`w-5 h-5 shrink-0 ${
                            isUploading ? 'text-gold-premium animate-pulse' :
                            isSuccess ? 'text-emerald-400' :
                            isError ? 'text-red-400' :
                            'text-text-muted'
                          }`} />
                          <div className="min-w-0">
                            <span className="text-white block font-medium truncate text-xs sm:text-sm">
                              {item.file.name}
                            </span>
                            <span className="text-text-muted text-[10px] sm:text-xs">
                              {(item.file.size / 1024 / 1024).toFixed(2)} MB
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          {isUploading && (
                            <span className="text-gold-premium text-xs flex items-center gap-1 font-medium">
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Enviando...</span>
                            </span>
                          )}
                          {isSuccess && (
                            <span className="text-emerald-400 text-xs font-semibold flex items-center gap-1">
                              <span>Pronto</span>
                            </span>
                          )}
                          {isError && (
                            <span className="text-red-400 text-xs font-medium flex items-center gap-1" title={item.errorMsg}>
                              <span>Erro</span>
                            </span>
                          )}
                          {!isSubmitting && !isSuccess && (
                            <button
                              type="button"
                              onClick={() => handleRemoveFromQueue(index)}
                              className="p-1 rounded text-text-muted hover:text-red-400 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {uploadQueue.length === 0 && (
                    <div className="text-center py-12 text-text-muted text-sm font-light">
                      Nenhuma foto selecionada.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
