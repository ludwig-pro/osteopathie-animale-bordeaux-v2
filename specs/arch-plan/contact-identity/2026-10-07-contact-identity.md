# Architecture : identité des clients et animaux

Statut : architecture validée par l’utilisateur. Parcours local/preview implémenté ;
application Google en production différée jusqu’aux essais opérateur.

## Objectif

Afficher et corriger séparément l’identité du client et ses animaux, avec une
référence unique par donnée et le même comportement en production, preview et local.

## État vérifié

- En production, le backoffice lit Google People API par le binding privé du
  Worker contacts-sync. Une correction des coordonnées est écrite dans Google.
- D1 contacts-sync conserve les réservations Calendly et les correspondances avec
  Google. Les animaux affichés sont actuellement des chaînes dérivées de cet
  historique ; il n’existe pas de registre métier autonome des animaux.
- D1 backoffice production conserve les listes et leurs affectations.
- D1 preview conserve un instantané modifiable des contacts. Un nouvel import
  remplace l’instantané actif et élimine ensuite les anciens instantanés.
- Le local charge une copie privée de la preview ; ses modifications restent en
  mémoire jusqu’à l’arrêt du serveur.
- Le navigateur privilégie actuellement le nom d’affichage Google, sans séparer
  les annotations entre parenthèses. Le runner Calendly préserve les noms Google
  déjà renseignés, mais peut créer un nom non structuré pour un contact sans nom.

### Mesures sur la copie locale, le 7 octobre 2026

| Observation                                                | Contacts |
| ---------------------------------------------------------- | -------: |
| Total                                                      |    1 702 |
| Prénom renseigné, nom de famille vide                      |    1 432 |
| Prénom et nom de famille renseignés                        |      261 |
| Nom de famille seul                                        |        9 |
| Nom d’affichage terminé par des parenthèses                |    1 229 |
| Contenu de ces parenthèses correspondant à un animal connu |      924 |
| Parenthèses présentes, aucun animal connu                  |      248 |
| Parenthèses présentes et animaux connus différents         |       57 |

La correspondance compare le texte complet des parenthèses, après neutralisation
de la casse, des accents et des espaces. Elle ne démontre ni l’identité d’un
animal ni la justesse du prénom et du nom. Ces mesures décrivent la copie locale,
pas une nouvelle lecture du carnet Google en production.

## Décisions

1. **Google reste la référence des coordonnées humaines.** Conserver prénom, nom,
   e-mails et téléphones dans Google évite deux carnets maîtres et une nouvelle
   synchronisation bidirectionnelle. Les corrections validées y sont répercutées.
2. **D1 backoffice devient la référence des animaux validés.** Un animal a son
   propre identifiant, son nom, un lien vers le contact et une provenance.
   Calendly fournit des observations à rapprocher, sans écraser les corrections.
   Le nom d’un animal ne sert pas d’identifiant unique.
3. **Une couche de lecture commune compose l’affichage.** Elle distingue les
   données sources, les animaux confirmés et les propositions de nettoyage. Elle
   s’applique aux sources Google, preview et locale, avant affichage et recherche.
   Elle ne déclenche aucune écriture lors d’une lecture.
4. **La déduction reste une proposition.** Ne pas inverser automatiquement les
   deux mots d’un nom, appliquer une casse de titre générale, inventer des accents
   ou prendre toute parenthèse pour un animal. Préserver noms composés, particules,
   apostrophes, mononymes et parenthèses ayant une autre signification.
5. **L’ordre d’affichage retenu est “Prénom Nom” lorsque les champs sont fiables.**
   À défaut, conserver le texte source nettoyé de ses seuls espaces superflus.
   Une parenthèse confirmée comme animal peut disparaître de l’affichage du client
   et apparaître dans la colonne Animaux ; la valeur brute reste consultable.
6. **Les corrections Google sont explicites et limitées aux noms.** L’éditeur
   actuel remplace aussi e-mails et téléphones : il ne doit pas servir tel quel
   à une migration des noms. Utiliser un masque limité aux noms et préserver les
   autres attributs du nom lors de sa reconstruction.

## Composants et contrats

### Lecture et propositions — domaine du backoffice

Entrée : identité Google brute, identifiant du contact, version source, animaux
issus de Calendly et décisions déjà validées. Sortie : libellé affiché, valeurs
sources et suggestions avec motif, origine et statut de validation.

La recherche doit retrouver le nom d’origine, le nom affiché et les animaux.
Les mêmes règles alimentent le tableau, les cartes mobiles et la fiche contact.
La présence de deux champs Google remplis ne suffit pas à les considérer comme
corrects : ils peuvent contenir eux aussi une annotation ou une inversion.

### Animaux et décisions — D1 backoffice de chaque environnement

Conserver les animaux validés, les liens contact/animal et les décisions de revue
hors des tables d’instantanés remplaçables. Identifier les liens par compte et
ressource Google, sans rapprochement automatique par nom ou e-mail. Un identifiant
Google disparu ou changé exige une revue du lien, pas une fusion silencieuse.

Les suggestions sont rattachées à la version de leurs données sources. Une nouvelle
lecture invalide les suggestions périmées sans effacer les décisions historiques.
Les observations Calendly conservent leur provenance ; une correspondance textuelle
seule ne fusionne pas deux animaux.

### Écriture Google — service contacts-sync existant

Entrée : correction explicitement validée, identité et version attendues. Le service
relit le contact, vérifie les etags et ne modifie que les champs approuvés. Il renvoie
la version obtenue ou un conflit à revoir. Les écritures d’un même compte sont
séquentielles, conformément à la documentation Google.

Il n’existe pas de transaction atomique D1 + Google. Enregistrer durablement l’animal
et la décision avant de retirer son nom de Google, puis conserver l’état de l’écriture
Google. En cas de résultat incertain, relire avant reprise. Ne jamais relancer une
mutation aveuglément. Conserver un avant/après privé permettant une restauration
contrôlée par etag, sans écraser des modifications plus récentes.

## Flux et environnements

```text
Google (coordonnées) + Calendly (observations) + D1 (animaux et décisions)
                          ↓
              Lecture commune et propositions
                          ↓
          Tableau / recherche / revue avant-après
                          ↓ validation
       Animal et décision durables → correction Google → relecture
```

En preview, les mêmes commandes corrigent uniquement la copie D1. En local, elles
utilisent le transport local. Aucun client Google n’est disponible dans ces deux
parcours. Étendre la copie preview et son export local aux animaux et décisions,
avec une activation cohérente de l’ensemble. Une réimportation ne doit pas écraser
silencieusement un travail de revue effectué en preview : détecter le conflit et
demander explicitement de conserver ou réinitialiser ces décisions.

## Mise en œuvre proposée

### Périmètre 1 — lecture, proposition et revue locale/preview

Introduire le modèle d’animaux et de décisions, la projection commune, les
suggestions explicables et leur validation dans la fiche. Exemple fictif :
“Martin Camille (Luna)” propose prénom Camille, nom Martin, animal Luna ; l’ordre
des noms et l’interprétation de Luna doivent être confirmés avant correction.

Terminé lorsque la revue est persistante en preview, fonctionne avec plusieurs
animaux, respecte les cas ambigus et survit aux relectures ; les tests prouvent
l’absence d’écriture Google et les recherches ancien/nouveau nom fonctionnent.

### Périmètre 2 — application contrôlée en production

Dépend du périmètre 1. Ajouter la commande limitée aux noms, son journal privé,
les vérifications de concurrence, la reprise et la restauration. Valider sur des
contacts fictifs puis un lot explicitement choisi avant une éventuelle migration.

Terminé lorsque les tests couvrent conflit d’etag, changement depuis la revue,
succès Google avec réponse perdue, reprise sans doublon et conservation des autres
champs. Une simulation seule ne vaut pas validation d’une migration réelle.

## Questions et limites

- La convention historique “Nom Prénom (Animal)” est fréquente selon l’utilisateur,
  mais n’est pas universelle. La décision par contact résout cette ambiguïté.
- Ce périmètre sépare client et animaux ; il ne transforme pas encore le backoffice
  en dossier médical vétérinaire complet.
- Aucun rapprochement de contacts ou d’animaux n’est fondé seulement sur leurs noms.
- Les captures, tests et journaux partagés utilisent des données fictives ; l’audit
  actuel ne conserve dans ce document que les agrégats de la copie autorisée.

## Références examinées

- Demande utilisateur du 7 octobre 2026 : normaliser les contacts, séparer les
  animaux et déterminer la responsabilité de Google et de la base applicative.
- `apps/contacts-sync/src/contacts-reader.ts` : lecture People API et enrichissement Calendly.
- `apps/contacts-sync/src/contact-editor.ts` : écritures et contrôle des versions.
- `apps/contacts-sync/src/model.ts` : conservation des noms existants par le runner.
- `apps/backoffice/src/contact-types.ts` et `src/browser/contacts-model.ts` : modèle et affichage.
- `apps/backoffice/src/preview-contacts.ts`, `src/preview-copy.ts`, `migrations/` : copie et isolation.
- `apps/backoffice/scripts/local-preview-data.mjs`, `scripts/preview.mjs` : source locale et durée de vie.
- `docs/calendly-google-contacts.md`, `docs/backoffice-cloudflare.md` : responsabilités opérationnelles.
- [Google : structure des noms](https://developers.google.com/people/api/rest/v1/people#Name).
- [Google : updateContact, masques, etags et écritures séquentielles](https://developers.google.com/people/api/rest/v1/people/updateContact).

## Livraison du 7 octobre 2026

- Version preview : `5b6b0590-fd26-4b3c-8829-ef3b3edaa1d6`.
- URL : https://osteo-backoffice-preview.lvantours.workers.dev/contacts.
- Migrations 0003/0004 : journal, animaux indépendants, application atomique,
  protection du début d’import et de l’activation d’un nouvel instantané.
- Local : SQLite persistante, même API métier ; export privé enrichi du journal
  et des animaux ; réimport explicite avec sauvegarde de la base locale.
- Validation : 55 tests backoffice, 26 tests unitaires site, contrôles statiques,
  42 tests E2E site sur port isolé 4328. Premier lancement E2E interrompu car le
  port 4321 répondait avec un autre projet ; aucune assertion assouplie.
- Essais navigateur fictifs local et preview : correction, persistance, recherche
  par ancien nom, historique et annulation. Fiche fictive hébergée retirée après
  l’essai. Aucun contact réel corrigé automatiquement.
- Phase production restante : commande Google limitée aux noms, conservation
  durable préalable des animaux en D1 production, journal des tentatives et reprise
  après réponse perdue, comparaison avec la source fraîche, validation du lot. Les
  etags de preview sont synthétiques et ne peuvent pas être envoyés à Google.
- La remise à zéro de la preview après corrections est volontairement bloquée.
  Une future commande explicite de réinitialisation devra sauvegarder le journal
  avant d’autoriser un nouvel import ; aucun effacement implicite n’est livré.

### Règle opérateur du 7 octobre : correction automatique

L’opérateur remplace la revue obligatoire par une normalisation en lot. Sans prénom et nom distincts, le libellé entier hors parenthèses devient le nom de famille et le prénom reste vide. Les champs déjà distincts sont conservés. Les parenthèses désignent les animaux ; les séparateurs explicites `/`, `;`, `,`, `&`, `+`, `et` produisent plusieurs animaux, en conservant les noms composés avec espaces. Déduplication insensible aux accents et à la casse ; conservation des animaux Calendly existants.

`POST /api/contact-normalization` parcourt la copie par lots de dix avec curseur et snapshot. Il réutilise l’écriture atomique et son historique, conserve les identités déjà corrigées, ne modifie pas les coordonnées et reste limité à la preview. Une relance est idempotente. La revue individuelle demeure facultative pour consulter l’historique et annuler. Aucune validation contact par contact n’est requise.

Version preview automatique : `2d0fb797-6831-4d68-8d29-701e318773cd`. Tests backoffice : 57 réussis, dont pagination, idempotence, noms composés et interdiction en production. Google et production restent hors de cette phase de test.

Exécution authentifiée en preview terminée : 1 518 corrigés, 184 inchangés, 0 non traité sur 1 702 contacts. Export et réimport local terminés, historique inclus ; serveur local relancé sur 8788. Vérification de toutes les 1 518 corrections : e-mails, téléphones, listes et rendez-vous inchangés, documents exportés identiques aux états après correction. Ancienne base locale sauvegardée. L’export SQL a été regroupé en sous-requête pour respecter la limite D1 sur les termes d’un SELECT composé. Vérification navigateur locale : nom sans parenthèses et Chanelle dans la colonne animaux.

### Validation opérateur et ingestion transparente

L’opérateur valide la preview et demande la disparition de tout lancement manuel. Le bouton et sa modale sont supprimés. `contactsPage` normalise chaque entrée reçue du binding avant exposition et avant import de preview ; les nouveaux contacts suivent automatiquement la règle. Migration 0005 : mémoire des animaux indépendante du nom Google, partagée par la lecture locale/preview/production et exportée dans la copie locale. Les etags upstream sont conservés.

Cette livraison active la normalisation du backoffice de production. Elle ne lance pas la migration massive des noms dans Google décrite comme phase distincte ci-dessus : Google reste la source brute, tandis que la représentation du backoffice est normalisée. La lecture n’écrit jamais dans Google. 59 tests backoffice valident notamment une nouvelle entrée dans les trois environnements, les noms composés, l’idempotence et la conservation d’un animal après modification du nom upstream.

Livraison vérifiée : preview `7c00210b-d0bd-40e0-8e45-ac69253d67d5`, production `2aba6e4f-9a68-47e1-af5c-8633d6009cf6`. Migrations appliquées aux deux D1. Sessions Access authentifiées : 1 702 contacts chargés en production et preview, aucun bouton de normalisation, premier nom sans parenthèses. Local également vérifié. Checks statiques réussis, 26 tests unitaires site et 59 backoffice, 42 E2E site réussis sur port isolé 4328. Pas de mutation massive Google, pas de modification de politique Access.
