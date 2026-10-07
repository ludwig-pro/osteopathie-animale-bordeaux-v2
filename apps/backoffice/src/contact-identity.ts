import type { GoogleContact } from './contact-types.ts';

export interface ContactAnimal {
  id: string;
  name: string;
  source: 'calendly' | 'name' | 'manual';
}
export interface IdentityCorrection {
  id: string;
  etag: string;
  givenName: string;
  familyName: string;
  animals: ContactAnimal[];
}
export const capitalizeName = (value: string) =>
  cleanName(value).replace(
    /(^|[\s’'\-])(\p{L})/gu,
    (_, prefix: string, letter: string) =>
      prefix + letter.toLocaleUpperCase('fr')
  );
export const cleanName = (value: string) =>
  value.normalize('NFC').trim().replace(/\s+/gu, ' ');
const comparable = (value: string) => cleanName(value).toLocaleLowerCase('fr');

export function identitySuggestion(contact: GoogleContact) {
  const suffix = /\s*\(([^()]+)\)\s*$/.exec(contact.name);
  const label = cleanName(
    suffix ? contact.name.slice(0, suffix.index) : contact.name
  );
  const structured = Boolean(
    contact.familyName &&
    contact.givenName &&
    !/[()]/.test(contact.givenName + contact.familyName)
  );
  // Historical surname-first convention is a suggestion, never an automatic write.
  const words = label.split(' ');
  const givenName = structured
    ? cleanName(contact.givenName)
    : words.length > 1
      ? words.slice(1).join(' ')
      : label;
  const familyName = structured
    ? cleanName(contact.familyName)
    : words.length > 1
      ? words[0]!
      : '';
  const animals: ContactAnimal[] =
    contact.identity?.animals.map((a) => ({ ...a })) ??
    contact.animals.map((name, index) => ({
      id: `existing-${index}`,
      name: cleanName(name),
      source: 'calendly',
    }));
  const annotation = suffix ? cleanName(suffix[1]!) : '';
  if (
    annotation &&
    !animals.some((a) => comparable(a.name) === comparable(annotation))
  )
    animals.push({ id: 'suggested-name', name: annotation, source: 'name' });
  return {
    givenName,
    familyName,
    animals,
    annotation,
    needsReview: !contact.identity && (Boolean(suffix) || !structured),
    uncertainOrder: !structured && words.length > 1,
  };
}

export function validateIdentityCorrection(input: unknown): IdentityCorrection {
  const value = input as IdentityCorrection | null;
  const text = (v: unknown, max: number): v is string =>
    typeof v === 'string' && v.length <= max && !/[\x00-\x1f\x7f]/.test(v);
  if (
    !value ||
    !text(value.id, 200) ||
    !/^people\/[\w-]+$/.test(value.id) ||
    !text(value.etag, 2048) ||
    !value.etag ||
    !text(value.givenName, 200) ||
    !text(value.familyName, 200) ||
    !(cleanName(value.givenName) || cleanName(value.familyName)) ||
    !Array.isArray(value.animals) ||
    value.animals.length > 30 ||
    !value.animals.every(
      (a) =>
        a &&
        text(a.id, 100) &&
        /^[\w-]+$/.test(a.id) &&
        text(a.name, 200) &&
        cleanName(a.name) &&
        ['calendly', 'name', 'manual'].includes(a.source)
    ) ||
    new Set(value.animals.map((a) => a.id)).size !== value.animals.length
  )
    throw new Error('invalid_identity');
  return {
    id: value.id,
    etag: value.etag,
    givenName: cleanName(value.givenName),
    familyName: cleanName(value.familyName),
    animals: value.animals.map((a) => ({
      id: a.id,
      name: cleanName(a.name),
      source: a.source,
    })),
  };
}

// Operator policy: unstructured labels are family names; parentheses are animals.
export function automaticIdentity(
  contact: GoogleContact
): IdentityCorrection | null {
  const annotations: string[] = [];
  const strip = (value: string) => {
    let result = '';
    let start = 0;
    let depth = 0;
    let nested = false;
    for (let index = 0; index < value.length; index++) {
      if (value[index] === '(') {
        if (depth === 0) {
          result += value.slice(start, index);
          start = index;
          nested = false;
        } else nested = true;
        depth++;
      } else if (value[index] === ')' && depth > 0 && --depth === 0) {
        // Preserve ambiguous nested annotations as a whole. Extracting just
        // their inner group would invent another animal on the next read.
        if (nested) result += value.slice(start, index + 1);
        else {
          const animal = cleanName(value.slice(start + 1, index));
          if (animal) annotations.push(animal);
          result += ' ';
        }
        start = index + 1;
      }
    }
    return cleanName(result + value.slice(start));
  };
  const label = strip(contact.name);
  const given = strip(contact.givenName);
  const family = strip(contact.familyName);
  const structured = Boolean(given && family);
  const givenName = structured ? capitalizeName(given) : '';
  const familyName = capitalizeName(
    structured ? family : family || given || label
  );
  if (!familyName && !givenName) return null;
  const animals: ContactAnimal[] = [];
  const keys = new Set<string>();
  const add = (name: string, source: ContactAnimal['source']) => {
    name = capitalizeName(name);
    const key = comparable(name)
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '');
    if (!name || keys.has(key)) return;
    keys.add(key);
    animals.push({ id: `animal-${animals.length}`, name, source });
  };
  contact.animals.forEach((name) => add(name, 'calendly'));
  annotations.forEach((annotation) =>
    annotation
      .split(/\s*(?:[\/;,&+]|\bet\b)\s*/iu)
      .forEach((name) => add(name, 'name'))
  );
  const name = [givenName, familyName].filter(Boolean).join(' ');
  if (
    name === contact.name &&
    givenName === contact.givenName &&
    familyName === contact.familyName &&
    JSON.stringify(animals.map((a) => a.name)) ===
      JSON.stringify(contact.animals)
  )
    return null;
  return validateIdentityCorrection({
    id: contact.id,
    etag: contact.etag,
    givenName,
    familyName,
    animals,
  });
}

// Every incoming DTO, including later edits, follows the same server-side policy.
// No write to the upstream Google account is triggered by reading a contact.
export function normalizedContact(contact: GoogleContact): GoogleContact {
  const correction = automaticIdentity(contact);
  if (!correction) return { ...contact, animals: [...contact.animals] };
  return {
    ...contact,
    givenName: correction.givenName,
    familyName: correction.familyName,
    name: [correction.givenName, correction.familyName]
      .filter(Boolean)
      .join(' '),
    animals: correction.animals.map((animal) => animal.name),
  };
}
