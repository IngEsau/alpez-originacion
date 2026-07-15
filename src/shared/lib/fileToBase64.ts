const IMAGE_COMPRESSION_THRESHOLD_BYTES = 750_000;
const IMAGE_MAX_DIMENSION = 1_600;
const IMAGE_TARGET_BYTES = 1_100_000;

function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("No pudimos leer el archivo."));
    };
    reader.onerror = () => reject(new Error("No pudimos leer el archivo."));
    reader.readAsDataURL(file);
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

async function optimizeImage(file: File): Promise<string | null> {
  if (
    file.size <= IMAGE_COMPRESSION_THRESHOLD_BYTES ||
    typeof document === "undefined" ||
    typeof createImageBitmap !== "function"
  ) {
    return null;
  }

  let bitmap: ImageBitmap | undefined;
  try {
    bitmap = await createImageBitmap(file);
    const scale = Math.min(1, IMAGE_MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    for (const quality of [0.82, 0.68, 0.54]) {
      const optimized = await canvasToBlob(canvas, quality);
      if (!optimized) continue;
      if (optimized.size <= IMAGE_TARGET_BYTES || quality === 0.54) {
        return readAsDataUrl(optimized);
      }
    }
    return null;
  } catch {
    return null;
  } finally {
    bitmap?.close();
  }
}

export async function optimizeImageDataUrl(
  dataUrl: string,
  fileName: string,
  fileType: string,
): Promise<string> {
  if (!fileType.startsWith("image/") || !dataUrl.startsWith("data:")) return dataUrl;
  try {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const file = new File([blob], fileName, { type: blob.type || fileType });
    return await optimizeImage(file) ?? dataUrl;
  } catch {
    return dataUrl;
  }
}

export async function fileToBase64(file: File): Promise<string> {
  const optimized = file.type.startsWith("image/") ? await optimizeImage(file) : null;
  return optimized ?? readAsDataUrl(file);
}
