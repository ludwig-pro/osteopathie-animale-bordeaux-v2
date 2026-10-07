import { parsePhoneNumberFromString } from 'libphonenumber-js/max';

/** Format for display only; keep unrecognised source values intact. */
export function formatPhoneNumber(value: string | undefined): string {
  if (!value) return '';
  const phone = parsePhoneNumberFromString(value, {
    defaultCountry: 'FR',
    extract: false,
  });
  if (!phone?.isValid()) return value;
  return phone.country === 'FR'
    ? phone.formatNational()
    : phone.formatInternational();
}
