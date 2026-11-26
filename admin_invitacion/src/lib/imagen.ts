// Procesamiento de imágenes en el navegador antes de subirlas a R2:
// recorte cuadrado, redimensionado y conversión a WebP (JPG si el navegador no soporta WebP).

export type Recorte = { sx: number; sy: number; lado: number };

export const cargarImagen = (archivo: File) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(archivo);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo leer la imagen'));
    };
    img.src = url;
  });

const aBlob = (canvas: HTMLCanvasElement, calidad: number) =>
  new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (webp) => {
        if (webp && webp.type === 'image/webp') return resolve(webp);
        canvas.toBlob((jpg) => (jpg ? resolve(jpg) : reject(new Error('No se pudo procesar la imagen'))), 'image/jpeg', calidad);
      },
      'image/webp',
      calidad,
    );
  });

/** Recorta un cuadrado de la imagen (coordenadas de la imagen original) y lo exporta a `tamano` px. */
export function exportarRecorte(img: HTMLImageElement, r: Recorte, tamano = 800) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = tamano;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, r.sx, r.sy, r.lado, r.lado, 0, 0, tamano, tamano);
  return aBlob(canvas, 0.86);
}

/** Encaja la imagen completa dentro de un cuadrado (para escudos/logos), con fondo blanco. */
export function exportarAjustada(img: HTMLImageElement, tamano = 600) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = tamano;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, tamano, tamano);
  const escala = Math.min(tamano / img.naturalWidth, tamano / img.naturalHeight);
  const w = img.naturalWidth * escala;
  const h = img.naturalHeight * escala;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, (tamano - w) / 2, (tamano - h) / 2, w, h);
  return aBlob(canvas, 0.9);
}
