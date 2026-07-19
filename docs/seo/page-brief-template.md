# Gabarit de brief pour une page pilote

## État du gabarit

La matrice du 19 juillet 2026 n'approuve aucun candidat. Ce document définit le
contrat d'un futur brief mais ne l'instancie pas et n'autorise aucune route. Si
la matrice est réévaluée, il faudra créer exactement une instance complète par
candidat approuvé, après le commit documentaire de la nouvelle décision.

## Identité et intention

Une instance doit consigner ensemble :

- l'identifiant du candidat et la décision de matrice qui l'autorise ;
- l'intention principale, ses variantes non-marque observées et la source
  datée de demande ;
- le persona, son besoin concret et la modalité réellement proposée ;
- le slug, l'URL absolue et le canonical auto-référent ;
- le `title`, la meta description et le H1, tous cohérents mais non dupliqués ;
- une promesse distincte, factuelle et dépourvue de résultat clinique garanti.

## Valeur propre et structure

L'instance doit fournir une table où chaque section indique sa fonction, la
donnée utilisée, son URL ou fichier source, sa date de vérification, sa personne
responsable et sa prochaine revue. Elle doit couvrir au minimum :

1. la réponse directe à l'intention et ce qui distingue la page de l'accueil ;
2. les espèces, modes, zone et conditions réellement confirmés ;
3. les modalités de rendez-vous et tarifs repris de
   `docs/seo/local-business-truth.md` ;
4. les limites de pratique et l'orientation vétérinaire reprises de
   `docs/editorial/health-content-policy.md` ;
5. au moins deux preuves ou données de première main propres à la page ;
6. des questions réelles agrégées et non identifiantes, avec leur méthode de
   collecte et leur date, si elles sont utilisées ;
7. un CTA dont le libellé correspond à la modalité disponible.

Aucune donnée de santé ne peut être créée depuis ce gabarit. Toute nouvelle
assertion doit d'abord entrer dans `docs/editorial/claim-inventory.md` et suivre
la politique éditoriale.

## Preuves et médias

Chaque preuve doit être traçable, publiable et maintenable. Pour une photo,
l'instance doit indiquer l'actif, la personne ou l'animal représenté, la portée
du consentement, le détenteur des droits et la date de revue. En l'absence de
preuve de droits, le média reste exclu. Les avis, cas et questions doivent être
anonymisés et ne jamais permettre de reconstruire une donnée personnelle ou
médicale.

## Maillage et données structurées

L'instance doit lister séparément :

- chaque lien entrant prévu, son ancre et la page source ;
- chaque lien sortant interne, son ancre et sa destination ;
- les liens officiels externes nécessaires à la vérification ;
- les changements à apporter à l'accueil pour éviter deux pages concurrentes
  sur la même intention.

Le schema autorisé est limité à `Service` lorsque la page décrit un service
réellement offert, et à `BreadcrumbList` lorsqu'un fil d'Ariane visible et
cohérent existe. Les propriétés doivent refléter le contenu visible. Aucun avis,
note, FAQ, professionnel de santé ou offre ne peut être balisé sans preuve et
affichage correspondant.

## Gouvernance et mesure

Une instance doit nommer l'auteur, le relecteur responsable, la date de
publication, la date de dernière vérification et une prochaine revue au plus
tard annuelle. Elle doit aussi définir :

- la conversion primaire et les paramètres d'attribution par page ;
- les micro-conversions suivies sans les confondre avec un rendez-vous ;
- la baseline J0 et les revues J+28, J+56 et J+90 ;
- la décision de rollback applicable ;
- les conditions précises de cannibalisation à surveiller face à l'accueil.

## Test anti-template obligatoire

Avant toute approbation, masquer le nom de l'animal ou du lieu dans le brief. Si
la promesse, les preuves et les sections peuvent être réutilisées sans perte de
sens pour un autre animal ou une autre ville, la page est interchangeable : la
décision repasse à `REJECT` et aucune route n'est créée.

L'instance doit enfin démontrer que la page reste utile dans le HTML statique,
sans JavaScript, sur mobile et bureau, avec canonical, title, description, H1,
CTA et données structurées testés route par route.
