export const contactColumns = [
  { id: 'name', label: 'Nom et e-mail', width: 280, min: 160 },
  { id: 'phone', label: 'Téléphone', width: 160, min: 120 },
  { id: 'animals', label: 'Animal / animaux', width: 180, min: 120 },
  { id: 'animalTypes', label: 'Type d’animal', width: 140, min: 100 },
  { id: 'appointment', label: 'Dernier rendez-vous', width: 200, min: 160 },
  { id: 'lists', label: 'Listes', width: 144, min: 100 },
] as const;

export type ContactColumn = (typeof contactColumns)[number];
export type ColumnWidths = Record<ContactColumn['id'], number>;
export const maximumColumnWidth = 800;
export const columnWidthsStorageKey = 'osteo-contact-column-widths-v1';

export function clampColumnWidth(column: ContactColumn, width: number): number {
  return Number.isFinite(width)
    ? Math.min(maximumColumnWidth, Math.max(column.min, Math.round(width)))
    : column.width;
}

export function parseColumnWidths(raw: string | null): ColumnWidths {
  let stored: Record<string, unknown> = {};
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed))
      stored = parsed as Record<string, unknown>;
  } catch {
    // Unavailable or outdated preferences must never prevent loading contacts.
  }
  return Object.fromEntries(
    contactColumns.map((column) => [
      column.id,
      clampColumnWidth(
        column,
        typeof stored[column.id] === 'number'
          ? (stored[column.id] as number)
          : column.width
      ),
    ])
  ) as ColumnWidths;
}
