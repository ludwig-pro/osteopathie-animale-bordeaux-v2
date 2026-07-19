const OFFICIAL_SOURCES = [
  {
    label: 'Définition réglementaire des actes d’ostéopathie animale',
    href: 'https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000034451012',
  },
  {
    label: 'Règles professionnelles et orientation vétérinaire',
    href: 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000034451034',
  },
  {
    label: 'Ordre national des vétérinaires',
    href: 'https://www.veterinaire.fr/la-profession-veterinaire/nos-grands-dossiers/osteopathie-animale',
  },
] as const;

export default function EditorialReview() {
  return (
    <aside
      aria-labelledby="editorial-review-title"
      className="mt-8 rounded-lg border border-gold-200 bg-gold-50 p-5 text-sm text-gray-700"
      data-testid="editorial-review"
    >
      <h3
        id="editorial-review-title"
        className="text-base font-semibold text-gold-700"
      >
        Revue documentaire
      </h3>
      <p className="mt-2">Responsable du site : Agathe Lescout</p>
      <p>
        Dernière révision : <time dateTime="2026-07-19">19 juillet 2026</time>
      </p>
      <p>
        Prochaine revue : <time dateTime="2027-07-19">19 juillet 2027</time>
      </p>
      <p className="mt-3">Sources officielles consultées :</p>
      <ul className="mt-1 list-disc space-y-1 pl-5">
        {OFFICIAL_SOURCES.map((source) => (
          <li key={source.href}>
            <a
              href={source.href}
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              {source.label}
            </a>
          </li>
        ))}
      </ul>
    </aside>
  );
}
