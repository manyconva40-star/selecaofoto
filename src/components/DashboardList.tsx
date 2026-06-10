'use client';

import { useState } from 'react';
import { signOut } from 'next-auth/react';
import Link from 'next/link';
import { 
  Camera, Plus, Link as LinkIcon, Trash2, Eye, 
  CheckCircle, Clock, LogOut, Calendar, User, 
  Image as ImageIcon, CheckSquare, Loader2 
} from 'lucide-react';

interface DashboardListProps {
  initialSessions: any[];
  photographerName: string;
}

export default function DashboardList({ initialSessions, photographerName }: DashboardListProps) {
  const [sessions, setSessions] = useState(initialSessions);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  const handleCopyLink = async (sessionId: string) => {
    const origin = window.location.origin;
    const clientLink = `${origin}/galeria/${sessionId}`;
    
    try {
      await navigator.clipboard.writeText(clientLink);
      setCopySuccess(sessionId);
      setTimeout(() => setCopySuccess(null), 2000);
    } catch (err) {
      console.error('Erro ao copiar link:', err);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta sessão? Isso apagará as fotos associadas no banco de dados e a pasta do Google Drive correspondente.')) {
      return;
    }

    setDeletingId(sessionId);
    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Falha ao excluir sessão');
      }

      setSessions(sessions.filter((s) => s.id !== sessionId));
    } catch (error) {
      console.error('Erro ao deletar sessão:', error);
      alert('Erro ao excluir sessão do servidor.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg text-foreground flex flex-col font-sans">
      {/* Header Premium */}
      <header className="border-b border-dark-border bg-dark-card/50 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-gold-premium">
            <Camera className="w-6 h-6" />
            <span className="font-serif text-xl font-bold tracking-widest uppercase">FotoSeleção</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <span className="text-sm font-medium text-white block">{photographerName}</span>
              <span className="text-xs text-text-muted">Fotógrafo</span>
            </div>
            
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="p-2.5 rounded-lg border border-dark-border bg-dark-card hover:bg-zinc-800 hover:text-red-400 transition-all duration-300 cursor-pointer"
              title="Sair"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Banner de Boas-Vindas */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 mb-10 pb-8 border-b border-dark-border/40">
          <div>
            <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-white tracking-tight">
              Suas Sessões
            </h1>
            <p className="text-text-muted mt-2 text-sm sm:text-base font-light">
              Crie novas entregas de fotos e acompanhe a seleção de suas clientes.
            </p>
          </div>

          <Link
            href="/dashboard/nova-sessao"
            className="flex items-center justify-center gap-2 bg-gold-premium hover:bg-gold-premium-hover text-zinc-950 font-medium px-5 py-3 rounded-lg transition-all duration-300 cursor-pointer shadow-md shadow-gold-premium/10 hover:shadow-gold-premium/20 active:scale-95"
          >
            <Plus className="w-5 h-5" />
            <span>Nova Sessão</span>
          </Link>
        </div>

        {/* Lista de Sessões */}
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center p-16 border border-dashed border-dark-border/80 rounded-2xl bg-dark-card/20 max-w-2xl mx-auto mt-8">
            <ImageIcon className="w-12 h-12 text-zinc-700 mb-4" />
            <h3 className="font-serif text-xl font-medium text-white mb-2">Nenhuma sessão criada</h3>
            <p className="text-text-muted text-sm font-light max-w-sm mb-8 leading-relaxed">
              Você ainda não tem sessões cadastradas. Comece criando um novo link para sua cliente.
            </p>
            <Link
              href="/dashboard/nova-sessao"
              className="flex items-center gap-2 border border-gold-premium hover:bg-gold-premium hover:text-zinc-950 text-gold-premium font-medium px-5 py-3 rounded-lg transition-all duration-300 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Criar minha primeira sessão</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sessions.map((session) => {
              const totalPhotos = session.photos?.length || 0;
              const selectedPhotos = session.photos?.filter((p: any) => p.selected).length || 0;
              const isCompleted = session.status === 'Seleção concluída';

              return (
                <div 
                  key={session.id}
                  className="bg-dark-card border border-dark-border hover:border-zinc-700 rounded-xl p-6 flex flex-col justify-between transition-all duration-300 hover:translate-y-[-2px] relative overflow-hidden group"
                >
                  {/* Status Banner */}
                  <div className="absolute top-0 left-0 right-0 h-[3px] bg-dark-border group-hover:bg-zinc-700 transition-colors" />

                  <div>
                    {/* Linha Superior: Nome Cliente e Badge Status */}
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex items-center gap-2 text-white">
                        <User className="w-4 h-4 text-gold-premium" />
                        <h3 className="font-medium text-lg leading-tight group-hover:text-gold-premium transition-colors">
                          {session.client_name}
                        </h3>
                      </div>
                      
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        isCompleted 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25' 
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/25'
                      }`}>
                        {isCompleted ? (
                          <CheckCircle className="w-3.5 h-3.5" />
                        ) : (
                          <Clock className="w-3.5 h-3.5" />
                        )}
                        {session.status}
                      </span>
                    </div>

                    {/* Nome do Ensaio */}
                    <p className="text-white font-serif text-xl font-medium tracking-tight mb-6">
                      {session.name}
                    </p>

                    {/* Metadados */}
                    <div className="space-y-2.5 border-t border-dark-border/40 pt-4 mb-6">
                      <div className="flex items-center gap-2 text-text-muted text-sm font-light">
                        <Calendar className="w-4 h-4" />
                        <span>Data: {new Date(session.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-text-muted text-sm font-light">
                        <ImageIcon className="w-4 h-4" />
                        <span>Fotos do preview: {totalPhotos} arquivos</span>
                      </div>

                      <div className="flex items-center gap-2 text-text-muted text-sm font-light">
                        <CheckSquare className="w-4 h-4" />
                        <span className={isCompleted ? 'text-emerald-400 font-medium' : ''}>
                          Selecionadas: {selectedPhotos} de {session.max_photos}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="grid grid-cols-3 gap-2.5 pt-4 border-t border-dark-border/40">
                    <Link
                      href={`/dashboard/sessao/${session.id}`}
                      className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border border-dark-border bg-zinc-900/50 hover:bg-zinc-800 text-white text-xs font-medium transition-all cursor-pointer"
                      title="Visualizar Detalhes"
                    >
                      <Eye className="w-4 h-4 text-gold-premium" />
                      <span>Ver</span>
                    </Link>

                    <button
                      onClick={() => handleCopyLink(session.id)}
                      className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                        copySuccess === session.id
                          ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-400'
                          : 'border-dark-border bg-zinc-900/50 hover:bg-zinc-800 text-white'
                      }`}
                      title="Copiar Link para Cliente"
                    >
                      <LinkIcon className="w-4 h-4 text-gold-premium" />
                      <span>{copySuccess === session.id ? 'Copiado!' : 'Link'}</span>
                    </button>

                    <button
                      onClick={() => handleDeleteSession(session.id)}
                      disabled={deletingId === session.id}
                      className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border border-dark-border bg-zinc-900/50 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 text-text-muted text-xs font-medium transition-all cursor-pointer disabled:opacity-50"
                      title="Excluir Sessão"
                    >
                      {deletingId === session.id ? (
                        <Loader2 className="w-4 h-4 animate-spin text-red-400" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                      <span>Excluir</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
