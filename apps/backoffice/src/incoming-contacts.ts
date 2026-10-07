import type { GoogleContact } from './contact-types.ts';
import {
  normalizedContact,
  cleanName,
  capitalizeName,
} from './contact-identity.ts';

const animalKey = (name: string) =>
  cleanName(name)
    .toLocaleLowerCase('fr')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');

/** Ingest Google or preview DTOs. Remember animals independently of name edits. */
export async function normalizeIncomingContacts(
  contacts: GoogleContact[],
  db?: D1Database
): Promise<GoogleContact[]> {
  const normalized = contacts.map(normalizedContact);
  if (!db || !normalized.length) return normalized;
  // Bounded batches keep ingestion below the Worker subrequest limit.
  for (let offset = 0; offset < normalized.length; offset += 200) {
    const batch = normalized.slice(offset, offset + 200);
    await db
      .prepare(
        'INSERT OR IGNORE INTO contact_animal_overrides(contact_id) SELECT value FROM json_each(?)'
      )
      .bind(JSON.stringify(batch.map((c) => c.id)))
      .run();
    const overrides = await db
      .prepare(
        'SELECT contact_id,names,version FROM contact_animal_overrides WHERE contact_id IN (SELECT value FROM json_each(?))'
      )
      .bind(JSON.stringify(batch.map((c) => c.id)))
      .all<{ contact_id: string; names: string | null; version: string }>();
    const overrideById = new Map(
      overrides.results.map((row) => [row.contact_id, row])
    );
    const animals = batch.flatMap((contact) =>
      contact.animals
        .map((name) => ({
          contact_id: contact.id,
          animal_key: animalKey(name),
          name: cleanName(name),
        }))
        .filter((a) => a.name)
    );
    if (animals.length)
      await db
        .prepare(
          `INSERT OR IGNORE INTO known_contact_animals(contact_id,animal_key,name)
      SELECT json_extract(value,'$.contact_id'),json_extract(value,'$.animal_key'),json_extract(value,'$.name') FROM json_each(?)`
        )
        .bind(JSON.stringify(animals))
        .run();
    const rows = await db
      .prepare(
        'SELECT contact_id, animal_key, name FROM known_contact_animals WHERE contact_id IN (SELECT value FROM json_each(?)) ORDER BY animal_key'
      )
      .bind(JSON.stringify(batch.map((c) => c.id)))
      .all<{ contact_id: string; animal_key: string; name: string }>();
    const byId = new Map(batch.map((c) => [c.id, c]));
    for (const row of rows.results) {
      const contact = byId.get(row.contact_id)!;
      if (
        !contact.identity &&
        !contact.animals.some((name) => animalKey(name) === row.animal_key)
      )
        contact.animals.push(capitalizeName(row.name));
    }
    for (const contact of batch) {
      const override = overrideById.get(contact.id);
      contact.animalsVersion = override?.version ?? '';
      if (override?.names !== null && override?.names !== undefined)
        contact.animals = (JSON.parse(override.names) as string[]).map(
          capitalizeName
        );
    }
  }
  return normalized;
}
