import { google } from 'googleapis';
import { Readable } from 'stream';

/**
 * Retorna o cliente autenticado do Google Drive
 */
export function getDriveClient(accessToken: string) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2Client.setCredentials({ access_token: accessToken });
  return google.drive({ version: 'v3', auth: oauth2Client });
}

/**
 * Localiza ou cria a pasta principal "FotoSelecao" na raiz do Drive
 */
export async function getOrCreateParentFolder(drive: any): Promise<string> {
  try {
    // Buscar se a pasta já existe
    const response = await drive.files.list({
      q: "name = 'FotoSelecao' and mimeType = 'application/vnd.google-apps.folder' and trashed = false",
      fields: 'files(id)',
      spaces: 'drive',
    });

    const files = response.data.files;
    if (files && files.length > 0) {
      return files[0].id;
    }

    // Se não existir, criar a pasta
    const folderMetadata = {
      name: 'FotoSelecao',
      mimeType: 'application/vnd.google-apps.folder',
    };

    const folder = await drive.files.create({
      requestBody: folderMetadata,
      fields: 'id',
    });

    return folder.data.id!;
  } catch (error) {
    console.error('Erro ao buscar/criar pasta principal FotoSelecao:', error);
    throw error;
  }
}

/**
 * Cria uma subpasta para a sessão de fotos dentro de "FotoSelecao"
 */
export async function createSessionFolder(
  drive: any,
  parentFolderId: string,
  clientName: string,
  sessionName: string
): Promise<string> {
  try {
    const folderMetadata = {
      name: `${clientName} - ${sessionName}`,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId],
    };

    const folder = await drive.files.create({
      requestBody: folderMetadata,
      fields: 'id',
    });

    return folder.data.id!;
  } catch (error) {
    console.error('Erro ao criar pasta da sessão no Google Drive:', error);
    throw error;
  }
}

/**
 * Faz upload de um arquivo para uma pasta específica no Google Drive e o torna público
 */
export async function uploadPhotoToDrive(
  drive: any,
  folderId: string,
  fileName: string,
  mimeType: string,
  buffer: Buffer
): Promise<{ id: string; url: string }> {
  try {
    // Converter o Buffer em um Readable Stream
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);

    const fileMetadata = {
      name: fileName,
      parents: [folderId],
    };

    const media = {
      mimeType: mimeType,
      body: stream,
    };

    // 1. Criar o arquivo no Google Drive
    const file = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name',
    });

    const fileId = file.data.id!;

    // 2. Tornar o arquivo público (leitor para qualquer pessoa)
    await drive.permissions.create({
      fileId: fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });

    // 3. Gerar URL pública de exibição via thumbnail do Google Drive
    // sz=w1200 define largura máxima de 1200px — confiável para exibição pública com <img>
    const url = `https://drive.google.com/thumbnail?id=${fileId}&sz=w1200`;

    return {
      id: fileId,
      url,
    };
  } catch (error) {
    console.error(`Erro ao fazer upload do arquivo ${fileName} para o Drive:`, error);
    throw error;
  }
}

/**
 * Exclui uma pasta (ou arquivo) no Google Drive
 */
export async function deleteFolderFromDrive(drive: any, folderId: string): Promise<void> {
  try {
    await drive.files.delete({
      fileId: folderId,
    });
  } catch (error) {
    console.error(`Erro ao deletar pasta/arquivo ${folderId} do Drive:`, error);
    throw error;
  }
}
