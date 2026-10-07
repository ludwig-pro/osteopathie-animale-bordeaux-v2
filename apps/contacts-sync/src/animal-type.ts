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
  ] as const;
  const matches = types.filter(([, pattern]) => pattern.test(text));
  return matches.length === 1 ? matches[0]![0] : null;
}
