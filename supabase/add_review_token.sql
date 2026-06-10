-- Migration: Adicionar coluna review_token na tabela sessions
-- Execute este script no SQL Editor do Supabase para habilitar o link reutilizável

ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS review_token TEXT UNIQUE;

-- Criar índice para busca por token
CREATE INDEX IF NOT EXISTS idx_sessions_review_token ON sessions(review_token);
