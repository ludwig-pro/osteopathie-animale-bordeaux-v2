# Données du backoffice par environnement

| Environnement       | Données métier                                                                                 |
| ------------------- | ---------------------------------------------------------------------------------------------- |
| Production          | Données réelles : Google Contacts, historique Calendly, Google Calendar et D1/R2 du backoffice |
| Preview             | Copie exacte des données métier de production, indépendante et datée                           |
| Développement local | Copie de ce même jeu de données, dans SQLite et des fichiers privés                            |

Les copies incluent les contacts, libellés, animaux et corrections, notes manuelles
et réservations structurées, synthèses et leurs sources, listes et accords,
comptes rendus originaux et le prochain rendez-vous Calendar observé. Les notes
restent dans une table privée séparée de la liste générale des contacts.

Les secrets OAuth/OpenAI, les règles Access, les baux de traitement et les modes
des runners restent propres à chaque environnement. Preview et local ne font
aucune écriture dans Google ou la production et ne lancent aucune génération IA.
Les tests automatisés utilisent exclusivement des données fictives isolées.

## Copie production vers preview

La migration `0010_complete_preview_copy.sql` étend les snapshots existants sans
supprimer leurs contacts ni leurs corrections. Déployer les migrations et les
lectures privées `/sources` et `/next-appointment` de contacts-sync avant de
lancer `yarn preview:copy:backoffice` avec la session Wrangler de l’opérateur.
Aucune interface de gestion des copies n’est exposée dans le backoffice.
Les configurations privées production et preview doivent désigner les mêmes
ressources cibles, distinctes de celles de production. Le script utilise des
bindings distants temporaires et reprend les étapes persistantes en D1.

La copie avance par pages : contacts, libellés, notes/historique, données D1,
puis agenda. Les dates, identifiants, statuts, textes et empreintes des données
métier sont conservés. Les données D1 sont comparées par empreinte SHA-256 avant
l’activation ; si elles ont changé pendant la pagination, elles sont relues.
Une source manquante ou un PDF indisponible bloque l’activation. L’ancien snapshot
reste consultable et la copie peut reprendre après interruption.

L’activation et le remplacement des données D1 se font dans une transaction.
Les corrections et listes de la copie précédente sont archivées dans ses
`copied_business_rows` ; ses contacts restent dans le snapshot précédent.
Une copie ne réexécute pas les anciennes corrections de noms sur les contacts
actuels. Les PDF sont copiés byte pour byte dans un bucket indépendant avant
publication de leurs métadonnées.

Deux buckets R2 privés doivent exister avant le déploiement :

```sh
yarn wrangler r2 bucket create osteo-backoffice-reports
yarn wrangler r2 bucket create osteo-backoffice-preview-reports
```

La production possède `REPORTS` (lecture de ses originaux) et `PREVIEW_REPORTS`
(écriture de la copie) ; la preview possède uniquement son propre `REPORTS`.
`BACKOFFICE_REPORTS_BUCKET` et `PREVIEW_REPORTS_BUCKET` permettent de configurer
les noms privés existants ; ils doivent rester distincts et correspondre entre
les configurations production et preview. La livraison du code ne crée ni ne
déploie ces ressources.

## Copie preview vers local

```sh
yarn preview:pull:backoffice
yarn preview:backoffice
```

La récupération refuse une ancienne copie partielle. Elle télécharge les données
D1 et les PDF privés, vérifie chaque PDF par taille et SHA-256, puis enregistre
le JSON privé. Les champs D1 sont réimportés sans perdre leurs dates ni rejouer
les journaux de correction. Répertoires en mode 0700, fichiers en mode 0600,
tous ignorés par Git ; aucun contenu métier n’est écrit dans les journaux.

Une base locale déjà utilisée reste intacte. Pour renouveler explicitement la
copie, arrêter le serveur, lancer `yarn preview:pull:backoffice --reset-local`,
puis le redémarrer. L’ancienne base est conservée en sauvegarde privée.
Les essais effectués après une copie restent locaux jusqu’à la prochaine copie
explicite. Le rendez-vous Calendar est celui observé au moment de la copie ;
l’interface affiche sa date de copie.

Le serveur local ne bascule jamais automatiquement en données fictives. Le mode
`BACKOFFICE_PREVIEW_DEMO=1` et l’export HTML de démonstration restent des outils
distincts, alimentés exclusivement par des fixtures.

## État vérifié le 8 octobre 2026

Les contrôles statiques, 198 tests unitaires (26 site, 69 contacts-sync,
103 backoffice), 42 tests E2E du site et les builds Workers en `--dry-run`
réussissent. Les tests vérifient la fidélité des champs et PDF de bout en bout,
les corrections archivées, les changements de données pendant la copie, les
sources manquantes, la reprise et l’isolation des écritures.

Les Workers et les migrations 0006 à 0010 ont été déployés après autorisation.
Les applications utilisent leurs domaines déjà protégés par Access :
`osteo-backoffice.lvantours.workers.dev` et
`osteo-backoffice-preview.lvantours.workers.dev`. La politique a été vérifiée
dans le tableau de bord Cloudflare : les deux comptes exacts, Google uniquement,
sessions de huit heures. L’audience et les bases D1 ont été comparées à la
configuration existante ; les API sans session renvoient vers Access.
Le jeton OAuth Wrangler ne permet pas le contrôle Access par API ; aucune règle
Access n’a été modifiée pour contourner cette limitation.

Versions publiées : contacts-sync `7f0347b5-98ed-4910-ae59-755a87d498da`,
production `e32a6063-beb1-4958-9c6c-5f22eefae57e`,
preview `280cc55f-a85f-4fe8-97bb-b9e69d7cd67a`.
Les deux buckets R2 privés ont été créés. Le mode Calendly existant est conservé.

La copie complète `data_version=1` a été exécutée depuis la production, puis
récupérée dans le serveur local sur le port 8793 : 1 702 contacts et sources,
4 libellés, 2 461 réservations associées, 1 702 corrections d’animaux,
1 834 animaux connus, aucune liste ni aucun compte rendu présent en production.
Les empreintes des données métier D1 sont identiques en production, preview,
export local et SQLite local, y compris après ouverture des interfaces.
La dernière copie a été exécutée par la commande technique ; le bouton et la
fenêtre de copie ont été supprimés du backoffice. Les 1 518 revues d’identité de l’ancienne preview
ont été archivées ; l’ancienne base locale et ses 1 702 corrections d’animaux
restent dans une sauvegarde privée. Les exports D1 avant migration, le reçu de
vérification et la capture locale restent dans `.credentials/`, hors Git.

Une erreur réelle « too many terms in compound SELECT » a interrompu la copie
avant activation. Les unions ont été réparties en groupes de cinq, vérifiés en
lecture sur D1 hébergé ; la copie a ensuite repris et terminé sans recommencer
les sources ni remplacer prématurément l’ancienne preview.

Une lecture répétée d’un nom comportant des parenthèses imbriquées ajoutait un
animal dans la copie. Ces annotations ambiguës sont maintenant conservées
entières. Un test fictif vérifie la stabilité des lectures, puis une nouvelle
copie a confirmé les empreintes identiques après chargement des trois interfaces.
Les E2E ont utilisé un port isolé (14321), car le port standard 4321 servait un
autre projet ; les assertions exécutées sur ce mauvais serveur ont été écartées
après diagnostic, et la suite entière a été relancée sur le bon site.

L’agenda renvoie `not_connected` en production ; cet état daté est fidèlement
copié en preview et local. La connexion Calendar reste à terminer selon
`docs/backoffice-google-calendar.md`. Les synthèses restent en pause ; aucun
appel réel à Luna n’a été effectué.
