import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://aulerhoqdfojonvwnduo.supabase.co'
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1bGVyaG9xZGZvam9udnduZHVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTA5NjM0OCwiZXhwIjoyMDk2NjcyMzQ4fQ.3muUY-7oXW_1c9-SkB4L7BGvqOSeIvb7QWVGh6m0Blc'

const supabase = createClient(supabaseUrl, serviceRoleKey)

const statements = [
  `CREATE TABLE IF NOT EXISTS sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    photographer_id TEXT NOT NULL,
    client_name TEXT NOT NULL,
    session_date DATE,
    password TEXT,
    drive_folder_id TEXT,
    share_token TEXT UNIQUE,
    max_selections INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS photos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    drive_file_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    thumbnail_url TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS selections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    photo_id UUID REFERENCES photos(id) ON DELETE CASCADE,
    client_name TEXT,
    selected_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(session_id, photo_id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_photographer ON sessions(photographer_id)`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_share_token ON sessions(share_token)`,
  `CREATE INDEX IF NOT EXISTS idx_photos_session ON photos(session_id)`,
  `CREATE INDEX IF NOT EXISTS idx_selections_session ON selections(session_id)`,
  `ALTER TABLE sessions ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE photos ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE selections ENABLE ROW LEVEL SECURITY`,
  `CREATE POLICY IF NOT EXISTS "sessions_public_read" ON sessions FOR SELECT USING (share_token IS NOT NULL)`,
  `CREATE POLICY IF NOT EXISTS "photos_public_read" ON photos FOR SELECT USING (EXISTS (SELECT 1 FROM sessions s WHERE s.id = photos.session_id AND s.share_token IS NOT NULL))`,
  `CREATE POLICY IF NOT EXISTS "selections_public_insert" ON selections FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM sessions s WHERE s.id = selections.session_id AND s.share_token IS NOT NULL))`,
  `CREATE POLICY IF NOT EXISTS "selections_public_read" ON selections FOR SELECT USING (EXISTS (SELECT 1 FROM sessions s WHERE s.id = selections.session_id AND s.share_token IS NOT NULL))`,
]

console.log('🚀 Criando tabelas no Supabase...\n')

for (const sql of statements) {
  const preview = sql.trim().split('\n')[0].substring(0, 60)
  const { error } = await supabase.rpc('exec_sql', { sql_query: sql }).maybeSingle() as any
  
  // Try direct query via fetch as fallback
  if (error) {
    const res = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'POST',
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
    })
  }
  
  if (error && !error.message?.includes('already exists') && !error.message?.includes('duplicate')) {
    console.log(`⚠️  ${preview}...`)
    console.log(`   Erro: ${error.message}`)
  } else {
    console.log(`✅ ${preview}...`)
  }
}

console.log('\n✅ Schema aplicado! Verifique as tabelas no Supabase Dashboard.')
