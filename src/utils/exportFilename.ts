function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** `BoxMaper_<Proyecto>_<AAAA-MM-DD>.<ext>`, sin tildes ni caracteres inválidos en nombres de archivo. */
export function buildExportFilename(projectName: string, date: Date, extension: string): string {
  const project =
    projectName
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "_") || "proyecto";
  const stamp = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return `BoxMaper_${project}_${stamp}.${extension}`;
}
