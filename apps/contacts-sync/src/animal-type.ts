/** Only explicit species words; never infer a species from an animal's name. */
export function animalTypeFrom(value: string | undefined): string | null {
  const text = (value ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('fr');
  const types = [
    ['Chien', /\b(?:chien(?:ne)?s?|canin(?:e)?s?)\b/],
    ['Chat', /\b(?:chats?|chattes?|felin(?:e)?s?)\b/],
    ['Cheval', /\b(?:cheval|chevaux|equins?|equines?|poneys?|juments?)\b/],
    ['Lapin', /\blapin(?:e)?s?\b/],
    ['Oiseau', /\b(?:oiseau|oiseaux)\b/],
    ['Bovin', /\b(?:bovin(?:e)?s?|vaches?|veaux?)\b/],
    ['Caprin', /\b(?:caprin(?:e)?s?|chevres?)\b/],
    ['Ovin', /\b(?:ovin(?:e)?s?|moutons?|brebis)\b/],
    ['NAC', /\bnac\b/],
    ['Autre', /^autre(?: \(.*\))?$/],
  ] as const;
  const matches = types.filter(([, pattern]) => pattern.test(text));
  return matches.length === 1 ? matches[0]![0] : null;
}

// Deliberately bounded aliases, checked against FCI / LOOF nomenclatures.
// No fuzzy matching, no animal names or clinical notes. Ambiguous names such as
// "shetland", "angora", "rex", "nain" and "croisé" are not enough on their own.
const breedAliases: Record<string, string[]> = {
  Chien: [
    'berger australien',
    'bouledogue francais',
    'bouledogues francais',
    'golden retriever',
    'golden retreiver',
    'golden',
    'border collie',
    'labrador',
    'labrador retriever',
    'cavalier king charles',
    'ckc',
    'chihuahua',
    'chiwawa',
    'jack russel',
    'jack russell',
    'jack russell terrier',
    'staffie',
    'staffy',
    'staffordshire bull terrier',
    'teckel',
    'teckel nain',
    'husky',
    'husky siberien',
    'spitz',
    'spitz nain',
    'spitz moyen',
    'spitz loup',
    'malinois',
    'berger belge malinois',
    'berger allemand',
    'cocker',
    'cocker anglais',
    'cocker americain',
    'cocker spaniel anglais',
    'yorkshire',
    'yorkshire terrier',
    'york terrier',
    'york',
    'yokshire',
    'shiba',
    'shiba inu',
    'berger blanc suisse',
    'berger suisse',
    'beagle',
    'bouvier bernois',
    'beauceron',
    'setter',
    'setter anglais',
    'boxer',
    'epagneul breton',
    'carlin',
    'dalmatien',
    'bulldog anglais',
    'bouledogue anglais',
    'bouledogue americain',
    'bouledogue',
    'welsh corgi pembroke',
    'corgi pembroke',
    'corgi',
    'rottweiler',
    'coton de tulear',
    'fox terrier',
    'cane corso',
    'samoyede',
    'berger americain',
    'berger americain miniature',
    'american staff',
    'americain staff',
    'american staffordshire terrier',
    'amstaff',
    'american bully',
    'pinscher nain',
    'caniche',
    'berger shetland',
    'berger des shetland',
    'shih tzu',
    'shih tsu',
    'shi tzu',
    'shitzu',
    'ratier',
    'pointer',
    'eurasier',
    'leonberg',
    'dogue de bordeaux',
    'whippet',
    'schnauzer nain',
    'finnois de laponie',
    'epagneul papillon',
    'westie',
    'royal bourbon',
    'pomsky',
    'parson russel',
    'parson russell',
    'griffon',
    'chow chow',
    'bichon',
    'bichon maltais',
    'terre neuve',
    'springer',
    'lhassa apso',
    'grand bouvier suisse',
    'colley',
    'braque de weimar',
  ],
  Chat: [
    'maine coon',
    'main coon',
    'maincoon',
    'europeen',
    'europeenne',
    'european shorthair',
    'gouttiere',
    'persan',
    'siamois',
    'bengal',
    'ragdoll',
    'sacre de birmanie',
    'british shorthair',
    'british short hair',
    'british longhair',
    'chartreux',
    'norvegien',
    'sphynx',
    'abyssin',
    'bleu russe',
    'scottish fold',
    'scottish straight',
    'devon rex',
    'cornish rex',
  ],
};
const normalizeBreed = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('fr')
    .replace(/[’'_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
const breeds = new Map(
  Object.entries(breedAliases).flatMap(([species, aliases]) =>
    aliases.map((alias) => [alias, species] as const)
  )
);

export function animalTypeFromBreed(value: string | undefined): string | null {
  const text = normalizeBreed(value ?? '');
  const direct = breeds.get(text);
  if (direct) return direct;
  const explicit = animalTypeFrom(text);
  // Recognize crosses only when every named breed is known and agrees.
  const parts = text
    .replace(/^croise[e]?\s+/, '')
    .replace(/\s+croise[e]?$/, '')
    .split(/\s*(?:\bx\b|\bcroise[e]?\b|\bcoupe\b|\bet\b|[\/+&])\s*/);
  const matches = parts.map(
    (part) => breeds.get(part.trim()) ?? animalTypeFrom(part)
  );
  if (matches.some((type) => type && explicit && type !== explicit))
    return null;
  if (explicit) return explicit;
  return matches.length && matches.every((type) => type && type === matches[0])
    ? matches[0]!
    : null;
}

export function bookingAnimalType(booking: {
  animalType?: string;
  breed?: string;
}): string | null {
  // An explicit answer (including unknown/ambiguous text) is never replaced by a guess.
  return booking.animalType?.trim()
    ? animalTypeFrom(booking.animalType)
    : animalTypeFromBreed(booking.breed);
}
