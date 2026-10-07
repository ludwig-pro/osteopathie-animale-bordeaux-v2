import { ContactsError } from './contacts.ts';
import { capitalizeName } from './contact-identity.ts';
import type { Env } from './config.ts';

/** Replace the local animal names; later upstream reads cannot restore removed names. */
export async function saveContactAnimals(input: unknown, env: Env) {
  const value = input as {
    id?: unknown;
    version?: unknown;
    animals?: unknown;
  } | null;
  if (
    !value ||
    typeof value.id !== 'string' ||
    !/^people\/[\w-]+$/.test(value.id) ||
    typeof value.version !== 'string' ||
    value.version.length > 100 ||
    !Array.isArray(value.animals) ||
    value.animals.length > 30 ||
    !value.animals.every(
      (name) =>
        typeof name === 'string' &&
        name.trim() &&
        name.length <= 200 &&
        !/[\x00-\x1f\x7f]/.test(name)
    )
  )
    throw new ContactsError(400, 'invalid_animals');
  if (!env.DB) throw new ContactsError(503, 'animals_storage_unavailable');
  const animals = [
    ...new Map(
      (value.animals as string[]).map((name) => {
        name = capitalizeName(name);
        return [name.toLocaleLowerCase('fr'), name];
      })
    ).values(),
  ];
  const version = crypto.randomUUID();
  const result = await env.DB.prepare(
    'UPDATE contact_animal_overrides SET names=?,version=? WHERE contact_id=? AND version=?'
  )
    .bind(JSON.stringify(animals), version, value.id, value.version)
    .run();
  if (!result.meta.changes) throw new ContactsError(409, 'contact_changed');
  return { saved: true, animals, version };
}
