export function fileToBase64(file: File): Promise<string> {
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
