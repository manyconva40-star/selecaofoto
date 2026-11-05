import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDriveClient, getOrCreateParentFolder } from '@/lib/googleDrive';
import { saveSessionLocalAndRemote, savePhotoLocalAndRemote, readLocalDb } from '@/lib/db';
import crypto from 'crypto';

export const revalidate = 0;

export async function GET(request: Request) {
  try {
    // 1. Verificar autenticação do fotógrafo
    const session = (await getServerSession(authOptions)) as any;
    if (!session || !session.user || !session.accessToken) {
      return NextResponse.json(
        { error: 'Não autorizado. Faça login com sua conta Google.' },
        { status: 401 }
      );
    }

    const photographerEmail = session.user.email;
    const photographerName = session.user.name || 'Fotógrafo';

    if (!photographerEmail) {
      return NextResponse.json(
        { error: 'E-mail do fotógrafo não encontrado na sessão.' },
        { status: 400 }
      );
    }

    // 2. Conectar com o Google Drive
    const drive = getDriveClient(session.accessToken as string);
    
    // Obter pasta raiz "FotoSelecao"
    const parentFolderId = await getOrCreateParentFolder(drive);

    // 3. Listar todas as subpastas (sessões) no Google Drive
    const foldersResponse = await drive.files.list({
      q: `'${parentFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id, name, createdTime)',
      spaces: 'drive',
    });

    const driveFolders = foldersResponse.data.files || [];
    const syncedSessions = [];
    const localDb = readLocalDb();

    // 4. Processar cada pasta do Drive
    for (const folder of driveFolders) {
      if (!folder.id || !folder.name) continue;

      const existingLocalSession = localDb.sessions.find(
        (s) => s.drive_folder_id === folder.id
      );

      let sessionId = existingLocalSession?.id || crypto.randomUUID();

      let clientName = folder.name;
      if (folder.name.includes(' - ')) {
        clientName = folder.name.split(' - ')[0].trim();
      } else if (folder.name.includes(' -')) {
        clientName = folder.name.split(' -')[0].trim();
      } else if (folder.name.includes('- ')) {
        clientName = folder.name.split('- ')[0].trim();
      }

      const sessionDate = folder.createdTime
        ? folder.createdTime.split('T')[0]
        : new Date().toISOString().split('T')[0];

      const savedSession = await saveSessionLocalAndRemote({
        id: sessionId,
        client_name: clientName,
        session_date: sessionDate,
        max_selections: 0,
        drive_folder_id: folder.id,
        photographer_id: photographerEmail,
        photographer_name: photographerName,
        status: existingLocalSession?.status || 'active',
      });

      sessionId = savedSession.id;

      // 5. Sincronizar as fotos desta pasta do Drive
      const filesResponse = await drive.files.list({
        q: `'${folder.id}' in parents and mimeType != 'application/vnd.google-apps.folder' and trashed = false`,
        fields: 'files(id, name, mimeType)',
        spaces: 'drive',
      });

      const driveFiles = filesResponse.data.files || [];
      let newPhotosCount = 0;

      for (const file of driveFiles) {
        if (!file.id || !file.name) continue;

        const isImage =
          file.mimeType?.startsWith('image/') ||
          /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name);
        if (!isImage) continue;

        const photoId = crypto.randomUUID();
        const thumbnail_url = `https://drive.google.com/thumbnail?id=${file.id}&sz=w1200`;

        // Definir permissão pública no Drive
        try {
          await drive.permissions.create({
            fileId: file.id,
            requestBody: {
              role: 'reader',
              type: 'anyone',
            },
          });
        } catch (permError) {
          console.warn(
            `Erro ao definir permissão pública para o arquivo ${file.name}:`,
            permError
          );
        }

        await savePhotoLocalAndRemote({
          id: photoId,
          session_id: sessionId,
          filename: file.name,
          drive_file_id: file.id,
          thumbnail_url,
        });

        newPhotosCount++;
      }

      syncedSessions.push({
        id: sessionId,
        folderName: folder.name,
        syncedPhotos: newPhotosCount,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Sincronização realizada com sucesso!',
      syncedSessions,
    });
  } catch (error: any) {
    console.error('Erro no endpoint /api/sessions/sync:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno ao sincronizar.' },
      { status: 500 }
    );
  }
}

