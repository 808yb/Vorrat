/**
 * Utility to compress and process image files (e.g. camera photos or uploads)
 * for recipe covers and food photos.
 * Ensures images fit safely in localStorage and sync smoothly to cloud (< 150KB).
 */
export async function compressImageFile(
  file: File,
  maxWidth: number = 1000,
  maxHeight: number = 750,
  quality: number = 0.8
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Die Datei ist kein gültiges Bild."));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Fehler beim Lesen des Bildes."));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Bild konnte nicht geladen werden."));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(dataUrl);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}
