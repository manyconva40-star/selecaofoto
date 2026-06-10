-- FotoSeleção - Schema do Banco de Dados
-- Execute este script no SQL Editor do Supabase

-- Tabela de sessões fotográficas
CREATE TABLE IF NOT EXISTS sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  photographer_id TEXT NOT NULL,       -- e-mail do fotógrafo (do Google OAuth)
  photographer_name TEXT,              -- nome do fotógrafo/estúdio
  client_name TEXT NOT NULL,
  session_date DATE,
  password TEXT,                       -- senha da galeria (hash bcrypt ou plain para MVP)
  drive_folder_id TEXT,               -- ID da pasta no Google Drive
  share_token TEXT UNIQUE,            -- token público para link da galeria
  max_selections INTEGER DEFAULT 0,   -- 0 = sem limite
  status TEXT DEFAULT 'active',       -- active | closed
  cover_image_url TEXT,               -- URL da foto de capa (hero banner)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de fotos
CREATE TABLE IF NOT EXISTS photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  drive_file_id TEXT NOT NULL,        -- ID do arquivo no Google Drive
  filename TEXT NOT NULL,             -- nome original do arquivo
  thumbnail_url TEXT,                 -- link público do Drive para exibição
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de seleções da cliente
CREATE TABLE IF NOT EXISTS selections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  photo_id UUID REFERENCES photos(id) ON DELETE CASCADE,
  client_name TEXT,
  selected_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, photo_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_sessions_photographer ON sessions(photographer_id);
CREATE INDEX IF NOT EXISTS idx_sessions_share_token ON sessions(share_token);
CREATE INDEX IF NOT EXISTS idx_photos_session ON photos(session_id);
CREATE INDEX IF NOT EXISTS idx_selections_session ON selections(session_id);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sessions_updated_at
  BEFORE UPDATE ON sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Políticas de Row Level Security (RLS)
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE selections ENABLE ROW LEVEL SECURITY;

-- Service role bypassa RLS (usado pelo backend)
-- As políticas abaixo são para acesso via anon key (galeria pública)

-- Galeria: cliente pode ver sessão pelo share_token
CREATE POLICY "sessions_public_read" ON sessions
  FOR SELECT USING (share_token IS NOT NULL);

-- Galeria: cliente pode ver fotos de sessão com share_token
CREATE POLICY "photos_public_read" ON photos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sessions s
      WHERE s.id = photos.session_id
      AND s.share_token IS NOT NULL
    )
  );

-- Galeria: cliente pode inserir seleções
CREATE POLICY "selections_public_insert" ON selections
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM sessions s
      WHERE s.id = selections.session_id
      AND s.share_token IS NOT NULL
    )
  );

-- Galeria: cliente pode ver suas seleções
CREATE POLICY "selections_public_read" ON selections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sessions s
      WHERE s.id = selections.session_id
      AND s.share_token IS NOT NULL
    )
  );
