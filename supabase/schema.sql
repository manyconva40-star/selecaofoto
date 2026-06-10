-- Script de Criação do Banco de Dados para o FotoSeleção
-- Execute este script no SQL Editor do seu projeto Supabase.

-- Habilitar a extensão UUID caso não esteja ativa
create extension if not exists "uuid-ossp";

-- Limpar tabelas se já existirem (para fins de desenvolvimento)
-- drop table if exists public.photos;
-- drop table if exists public.sessions;

-- 1. TABELA DE SESSÕES
create table public.sessions (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null, -- Nome do Ensaio (ex: Ensaio Gestante)
  client_name text not null, -- Nome da Cliente (ex: Maria Silva)
  date date not null, -- Data do ensaio ou da seleção
  max_photos integer not null, -- Limite de fotos a selecionar
  password text, -- Senha opcional para acessar a galeria (texto simples)
  status text default 'Aguardando seleção'::text not null, -- 'Aguardando seleção' ou 'Seleção concluída'
  folder_id text not null, -- ID da pasta no Google Drive do fotógrafo
  photographer_email text not null, -- E-mail do fotógrafo (dono da sessão)
  photographer_name text not null, -- Nome do fotógrafo para personalização
  completed_at timestamp with time zone,
  
  -- Garante que o status só possa ser um dos dois valores válidos
  constraint sessions_status_check check (status in ('Aguardando seleção', 'Seleção concluída'))
);

-- 2. TABELA DE FOTOS
create table public.photos (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references public.sessions(id) on delete cascade not null,
  file_name text not null, -- Nome original do arquivo (ex: DSC_0142.jpg)
  drive_file_id text not null, -- ID do arquivo no Google Drive
  url text not null, -- URL pública de exibição
  selected boolean default false not null, -- Se foi selecionada pela cliente
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. CRIAÇÃO DE ÍNDICES PARA PERFORMANCE
create index if not exists photos_session_id_idx on public.photos(session_id);
create index if not exists sessions_photographer_email_idx on public.sessions(photographer_email);

-- 4. POLÍTICAS DE SEGURANÇA (Row Level Security - RLS)
-- Como o backend do Next.js fará as operações de escrita usando a chave SERVICE_ROLE (ignora RLS),
-- podemos habilitar RLS e criar políticas simples apenas para leitura pública (anon) se necessário.

alter table public.sessions enable row level security;
alter table public.photos enable row level security;

-- Política de leitura pública para sessões (necessário para a cliente acessar a galeria via ID)
create policy "Permitir leitura pública de sessões" 
on public.sessions for select 
using (true);

-- Política de leitura pública para fotos (necessário para a cliente visualizar as fotos da galeria)
create policy "Permitir leitura pública de fotos" 
on public.photos for select 
using (true);

-- Políticas de escrita total para a chave de serviço (Service Role)
-- Nota: Por padrão, a chave 'service_role' do Supabase ignora todas as regras de RLS,
-- então as APIs do Next.js poderão ler/escrever/deletar livremente.
