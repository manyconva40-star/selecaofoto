import fs from 'fs';
import path from 'path';
import { supabaseAdmin } from './supabase';

const DB_FILE_PATH = path.join(process.cwd(), 'data', 'db.json');

export interface DbSession {
  id: string;
  photographer_id: string;
  photographer_name?: string;
  client_name: string;
  session_date?: string;
  password?: string | null;
  drive_folder_id?: string;
  share_token?: string | null;
  max_selections?: number;
  status?: string;
  cover_image_url?: string | null;
  created_at?: string;
  updated_at?: string;
  photos?: any[];
  selections?: any[];
}

export interface DbPhoto {
  id: string;
  session_id: string;
  drive_file_id: string;
  filename: string;
  thumbnail_url?: string;
  order_index?: number;
  created_at?: string;
}

export interface DbSelection {
  id: string;
  session_id: string;
  photo_id: string;
  client_name?: string;
  selected_at?: string;
}

interface LocalSchema {
  sessions: DbSession[];
  photos: DbPhoto[];
  selections: DbSelection[];
}

function ensureDataDirExists() {
  try {
    const dir = path.dirname(DB_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch {
    // Silently ignore on serverless read-only filesystem
  }
}

export function readLocalDb(): LocalSchema {
  try {
    ensureDataDirExists();
    if (!fs.existsSync(DB_FILE_PATH)) {
      return { sessions: [], photos: [], selections: [] };
    }
    const content = fs.readFileSync(DB_FILE_PATH, 'utf-8');
    return JSON.parse(content) as LocalSchema;
  } catch (e) {
    return { sessions: [], photos: [], selections: [] };
  }
}

export function writeLocalDb(data: LocalSchema) {
  try {
    ensureDataDirExists();
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch {
    // Silently ignore in serverless environments
  }
}

export async function fetchSessionsForPhotographer(
  photographerEmail: string
): Promise<{ sessions: DbSession[]; error: string | null }> {
  let dbError: string | null = null;
  try {
    const { data: remoteSessions, error } = await supabaseAdmin
      .from('sessions')
      .select(`
        *,
        photos (
          id,
          session_id,
          drive_file_id,
          filename,
          thumbnail_url,
          order_index,
          created_at
        ),
        selections (
          id,
          session_id,
          photo_id,
          client_name,
          selected_at
        )
      `)
      .eq('photographer_id', photographerEmail)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar do Supabase:', error);
      dbError = error.message || 'Erro de conexão com o banco de dados Supabase.';
    } else if (remoteSessions) {
      // Sync remote data to local json file
      const local = readLocalDb();
      for (const s of remoteSessions) {
        const idx = local.sessions.findIndex((ls) => ls.id === s.id);
        if (idx >= 0) {
          local.sessions[idx] = s;
        } else {
          local.sessions.push(s);
        }

        if (s.photos && s.photos.length > 0) {
          for (const p of s.photos) {
            if (!local.photos.some((lp) => lp.id === p.id)) {
              local.photos.push(p);
            }
          }
        }
        if (s.selections && s.selections.length > 0) {
          for (const sel of s.selections) {
            if (!local.selections.some((lsel) => lsel.id === sel.id)) {
              local.selections.push(sel);
            }
          }
        }
      }
      writeLocalDb(local);
      return { sessions: remoteSessions, error: null };
    }
  } catch (e: any) {
    console.warn('Supabase não disponível, tentando banco local:', e);
    dbError = e?.message || 'Banco de dados pausado ou indisponível.';
  }

  // Fallback to local db
  const local = readLocalDb();
  const userSessions = local.sessions
    .filter((s) => !s.photographer_id || s.photographer_id === photographerEmail)
    .map((s) => {
      const photos = local.photos.filter((p) => p.session_id === s.id);
      const selections = local.selections.filter((sel) => sel.session_id === s.id);
      return {
        ...s,
        photos,
        selections,
      };
    });

  return { sessions: userSessions, error: dbError };
}

export async function saveSessionLocalAndRemote(sessionData: DbSession): Promise<DbSession> {
  const local = readLocalDb();
  const existingIdx = local.sessions.findIndex((s) => s.id === sessionData.id || (s.drive_folder_id && s.drive_folder_id === sessionData.drive_folder_id));
  
  if (existingIdx >= 0) {
    local.sessions[existingIdx] = { ...local.sessions[existingIdx], ...sessionData };
  } else {
    local.sessions.push(sessionData);
  }
  writeLocalDb(local);

  try {
    const { data, error } = await supabaseAdmin
      .from('sessions')
      .upsert(sessionData)
      .select()
      .single();
    if (!error && data) {
      return data;
    }
  } catch (e) {
    console.warn('Falha ao salvar no Supabase, mantido localmente:', e);
  }

  return sessionData;
}

export async function savePhotoLocalAndRemote(photoData: DbPhoto): Promise<DbPhoto> {
  const local = readLocalDb();
  const existingIdx = local.photos.findIndex((p) => p.id === photoData.id || (p.session_id === photoData.session_id && p.drive_file_id === photoData.drive_file_id));
  
  if (existingIdx >= 0) {
    local.photos[existingIdx] = { ...local.photos[existingIdx], ...photoData };
  } else {
    local.photos.push(photoData);
  }
  writeLocalDb(local);

  try {
    const { data, error } = await supabaseAdmin
      .from('photos')
      .upsert(photoData)
      .select()
      .single();
    if (!error && data) {
      return data;
    }
  } catch (e) {
    console.warn('Falha ao salvar foto no Supabase, mantida localmente:', e);
  }

  return photoData;
}

export async function getSessionDetailsById(id: string): Promise<{ session: DbSession | null; photos: DbPhoto[]; selections: DbSelection[] }> {
  try {
    const { data: remoteSession } = await supabaseAdmin
      .from('sessions')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    const { data: remotePhotos } = await supabaseAdmin
      .from('photos')
      .select('*')
      .eq('session_id', id)
      .order('filename', { ascending: true });

    const { data: remoteSelections } = await supabaseAdmin
      .from('selections')
      .select('*')
      .eq('session_id', id);

    if (remoteSession) {
      return {
        session: remoteSession,
        photos: remotePhotos || [],
        selections: remoteSelections || [],
      };
    }
  } catch (e) {
    console.warn('Supabase não disponível para detalhes de sessão, buscando local:', e);
  }

  const local = readLocalDb();
  const session = local.sessions.find((s) => s.id === id) || null;
  const photos = local.photos.filter((p) => p.session_id === id);
  const selections = local.selections.filter((sel) => sel.session_id === id);

  return {
    session,
    photos,
    selections,
  };
}

