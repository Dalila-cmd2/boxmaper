/**
 * Descarga un archivo generado en el navegador.
 * - El enlace se añade al documento (Firefox/Safari lo necesitan).
 * - La URL se libera tarde: si se libera enseguida, algunos móviles cancelan la descarga.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(url);
  }, 4000);
}
