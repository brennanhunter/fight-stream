/** ISO 3166-1 alpha-2 country code + display name. */
export type Country = { code: string; name: string };

/**
 * The "main boxing countries" list — what shows in the nationality dropdown
 * by default. Picked for boxing relevance, not exhaustive geography.
 * Operators can pick "Custom" to type any other nationality.
 */
export const MAIN_BOXING_COUNTRIES: Country[] = [
  { code: 'AR', name: 'Argentina' },
  { code: 'AU', name: 'Australia' },
  { code: 'BR', name: 'Brazil' },
  { code: 'CA', name: 'Canada' },
  { code: 'CN', name: 'China' },
  { code: 'CO', name: 'Colombia' },
  { code: 'CU', name: 'Cuba' },
  { code: 'DO', name: 'Dominican Republic' },
  { code: 'FR', name: 'France' },
  { code: 'DE', name: 'Germany' },
  { code: 'GH', name: 'Ghana' },
  { code: 'IE', name: 'Ireland' },
  { code: 'IT', name: 'Italy' },
  { code: 'JP', name: 'Japan' },
  { code: 'KZ', name: 'Kazakhstan' },
  { code: 'MX', name: 'Mexico' },
  { code: 'NI', name: 'Nicaragua' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'PA', name: 'Panama' },
  { code: 'PH', name: 'Philippines' },
  { code: 'PR', name: 'Puerto Rico' },
  { code: 'RU', name: 'Russia' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'KR', name: 'South Korea' },
  { code: 'ES', name: 'Spain' },
  { code: 'TH', name: 'Thailand' },
  { code: 'UA', name: 'Ukraine' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'US', name: 'United States' },
  { code: 'UZ', name: 'Uzbekistan' },
  { code: 'VE', name: 'Venezuela' },
];

const BY_CODE = new Map(MAIN_BOXING_COUNTRIES.map((c) => [c.code, c]));

/**
 * Convert an ISO 3166-1 alpha-2 code into a Unicode flag emoji using
 * regional indicator codepoints. e.g. "US" → 🇺🇸. Returns empty string
 * if the input isn't a valid 2-letter code.
 */
export function flagFromCode(code: string): string {
  if (!/^[A-Za-z]{2}$/.test(code)) return '';
  return code
    .toUpperCase()
    .split('')
    .map((c) => String.fromCodePoint(c.charCodeAt(0) + 127397))
    .join('');
}

export function lookupCountry(code: string): Country | null {
  return BY_CODE.get(code.toUpperCase()) ?? null;
}

/**
 * Resolve a stored nationality value into something displayable.
 * - 2-letter codes (e.g. "MX") → flag + country name
 * - Anything else → returned as-is with no flag (free-text custom values,
 *   plus legacy data from before the dropdown existed).
 */
export function formatNationality(value: string | null | undefined): {
  flag: string;
  label: string;
} {
  if (!value) return { flag: '', label: '' };
  const trimmed = value.trim();
  if (/^[A-Za-z]{2}$/.test(trimmed)) {
    const country = lookupCountry(trimmed);
    return {
      flag: flagFromCode(trimmed),
      label: country?.name ?? trimmed.toUpperCase(),
    };
  }
  return { flag: '', label: trimmed };
}

/** Whether a given stored value looks like a known country code from our dropdown. */
export function isKnownCountryCode(value: string | null | undefined): boolean {
  if (!value) return false;
  return BY_CODE.has(value.trim().toUpperCase());
}
