export interface Session {
  id: string;
  created_at: string;
  name: string;
  client_name: string;
  date: string;
  max_photos: number;
  password?: string | null;
  status: 'Aguardando seleção' | 'Seleção concluída';
  folder_id: string;
  photographer_email: string;
  photographer_name: string;
  completed_at?: string | null;
}

export interface Photo {
  id: string;
  session_id: string;
  file_name: string;
  drive_file_id: string;
  url: string;
  selected: boolean;
  created_at: string;
}
