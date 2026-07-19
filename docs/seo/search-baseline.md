# Baseline de recherche et de conversion

## Décision au 19 juillet 2026

Cette baseline ne permet pas d'autoriser une page SEO programmatique. Elle
établit ce qui a été observé publiquement et, séparément, les données
propriétaires qui manquent. Aucun volume, taux ou historique n'est remplacé par
une estimation synthétique.

| Champ | Valeur observée ou disponibilité |
| --- | --- |
| Période | Photographie publique du 19 juillet 2026 ; aucun historique Search Console ou GA4 disponible pour les 16 derniers mois |
| Date d'extraction | 19 juillet 2026 |
| Source | Brave Search France non connecté, Google Autocomplete avec `hl=fr&gl=fr`, API publique Ahrefs, dépôt Git et instrumentation du site |
| Pays et appareil | France, français, navigation de bureau non connectée ; aucune ventilation mobile disponible |
| Marque | Requête de contrôle : `agathe lescout ostéopathe animalier` ; aucune série d'impressions ou de clics accessible |
| Non-marque | Cinq intentions exploratoires : `ostéopathe chien bordeaux`, `ostéopathe chat bordeaux`, `ostéopathe NAC bordeaux`, `ostéopathe animalier bègles`, `ostéopathe animalier bordeaux` |
| Pages | La page d'accueil `/` concentre actuellement les cinq intentions ; aucune route espèce ou zone dédiée |
| Impressions | Indisponibles : aucune propriété Search Console ni export agrégé n'est présent dans le dépôt |
| Clics | Indisponibles : aucune propriété Search Console, Google Business Profile ou export agrégé n'est présent dans le dépôt |
| CTR | Non calculable sans impressions et clics observés |
| Position | Aucun historique propriétaire ; uniquement un échantillon Brave ponctuel documenté dans `competitor-landscape.md`, qui n'est pas une position Google stable |
| Conversions | L'événement primaire techniquement vérifiable est `contact_form_submit_succeeded`, mais aucun compte observé n'est disponible |
| Limites | Pas de GSC, GA4, statistiques Google Business Profile, volumes de mots-clés, saisonnalité, domaines référents, backlinks comparables ni preuve qu'un clic Calendly devient un rendez-vous |

## Signaux observés

Google Autocomplete a renvoyé des formulations qualitatives associées au chien,
au chat, au canin, à l'ostéopathie animale à Bordeaux et à Bègles. Aucun signal
Autocomplete NAC n'a été observé. Ces suggestions indiquent au plus l'existence
d'une formulation recherchée ; elles ne mesurent ni volume, ni clic, ni
conversion. La demande reçoit donc au maximum `1/3` dans la matrice.

L'échantillon Brave montre déjà la page d'accueil parmi les résultats des cinq
intentions. Il sert à identifier les types de pages en concurrence, pas à
produire un suivi de position. Un nouveau passage a déclenché un CAPTCHA : le
snapshot daté reste publié avec cette limite et ne doit pas être présenté comme
un classement reproductible en continu.

## Modèle de conversion vérifiable

La conversion primaire est une soumission réussie du formulaire, observée par
`contact_form_submit_succeeded`. Pour une future route candidate, l'attribution
doit conserver au minimum `page_path`, `page_location` et la date, puis être
agrégée sans donnée personnelle.

Les clics vers Calendly, `tel:` et `mailto:` sont uniquement des
micro-conversions. Un clic Calendly ne prouve ni une réservation ni une
consultation. Aucun de ces événements ne dispose ici d'une baseline de compte
ou de taux ; la mesure reste donc à `1/3`, celle d'un CTA générique existant.

## Données nécessaires à une nouvelle décision

Une réévaluation exige des agrégats datés par requête et page depuis Search
Console, des conversions par page réellement observées, et un export d'un
outil SEO reconnu donnant volumes, zone, date, Domaines référents et Backlinks.
Les statistiques Google Business Profile, appels ou rendez-vous peuvent
compléter le dossier, mais aucun export brut, token, requête nominative ou
donnée personnelle ne doit entrer dans Git.

Si ces éléments deviennent disponibles, la première hypothèse à isoler est la
page chat face à l'accueil. Cette priorité future n'est pas une approbation.
