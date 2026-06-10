/**
 * Redimensiona uma imagem no navegador antes de fazer o upload.
 * Reduz a maior dimensão da imagem para no máximo 1200px, mantendo a proporção.
 * Retorna o arquivo original caso ele já seja menor que 1200px em ambas as dimensões.
 */
export async function resizeImageIfNeeded(file: File, maxDimension: number = 1200): Promise<File> {
  // Apenas processa imagens JPEG/PNG
  if (!file.type.startsWith('image/')) {
    return file;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      
      img.onload = () => {
        const width = img.width;
        const height = img.height;

        // Se a imagem for menor que o limite, resolve com o arquivo original
        if (width <= maxDimension && height <= maxDimension) {
          resolve(file);
          return;
        }

        // Calcular novas dimensões mantendo o aspect ratio
        let newWidth = width;
        let newHeight = height;

        if (width > height) {
          if (width > maxDimension) {
            newHeight = Math.round((height * maxDimension) / width);
            newWidth = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            newWidth = Math.round((width * maxDimension) / height);
            newHeight = maxDimension;
          }
        }

        // Criar canvas e desenhar a imagem redimensionada
        const canvas = document.createElement('canvas');
        canvas.width = newWidth;
        canvas.height = newHeight;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file); // Fallback caso ocorra erro no contexto 2D
          return;
        }

        // Suavização premium para a imagem redimensionada
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        ctx.drawImage(img, 0, 0, newWidth, newHeight);

        // Converter canvas de volta para Blob/File
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const resizedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now(),
              });
              resolve(resizedFile);
            } else {
              resolve(file);
            }
          },
          file.type,
          0.85 // Qualidade de compressão JPEG: 85% é ideal para previews de alta qualidade e tamanho reduzido
        );
      };

      img.onerror = () => {
        resolve(file);
      };
    };

    reader.onerror = () => {
      resolve(file);
    };
  });
}
