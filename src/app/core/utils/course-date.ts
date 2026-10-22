// Las fechas LocalDateTime de la API expresan hora académica de Lima (UTC-5).
export function courseTimestamp(value: string | null | undefined): number {
  if (!value) return Number.NaN;
  return Date.parse(/(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value}-05:00`);
}
