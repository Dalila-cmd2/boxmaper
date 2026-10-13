/** Sugerencias que coinciden con lo escrito (sin repetir el valor exacto). */
export function filterSuggestions(
  suggestions: string[],
  query: string,
  showOnFocus = false,
  limit = 12
): string[] {
  const q = query.trim().toLowerCase();
  const minChars = showOnFocus ? 0 : 2;
  if (q.length < minChars) return [];
  return suggestions
    .filter((item) => {
      const lower = item.toLowerCase();
      if (lower === q) return false;
      return !q || lower.includes(q);
    })
    .slice(0, limit);
}
