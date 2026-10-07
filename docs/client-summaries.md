# Synthèses client : notes et historique

L’onglet « Résumé » de la fiche client affiche une synthèse de 3 à 5 phrases, sa date et son état. Il ne présente aucun bouton d’actualisation, référence numérotée ou bloc de notes détaillées. Les onglets « Coordonnées » et « Historique », dont les comptes rendus de consultation, conservent leur fonctionnement. Le contenu des PDF ne fait pas partie de cette première génération. Les notes manuelles restent dans Google Contacts ; leur lecture ne modifie aucun contact. La saisie de nouvelles notes dans le backoffice est une évolution future, avec sa propre provenance.

## Architecture

`GoogleContactsService` expose `/sources?pageToken=…` (100 contacts) et `/source?id=people/…` uniquement via le binding privé, avec contrôle du compte. Les notes ne sont jamais ajoutées à la liste générale. La copie privée de production en preview et en local conserve les notes et les synthèses dans leurs tables séparées. Le texte avant et après le bloc Calendly est conservé exactement ; un bloc absent après synchronisation, modifié, inconnu, dupliqué ou dans un format non pris en charge exige une vérification. Les réservations viennent de D1 : motifs, espèces, dates et liens de report. Les coordonnées ne font pas partie de ce contrat.

Le D1 du backoffice contient les sources observées, leur empreinte, les tâches de relecture/génération et le dernier résumé. Celui-ci conserve les sources et les références de sa génération pour le contrôle opérateur via l’API authentifiée, même quand les notes évoluent. Les corrections d’animaux du backoffice font partie du contexte sans réécrire les réservations historiques. L’identifiant Google reste la clé, y compris sans e-mail.

Le cron de production, chaque minute, avance d’une page et traite au plus deux tâches, une seule pendant le parcours initial ou en pilote, pour préserver le budget de requêtes du forfait gratuit. Un bail de 120 secondes protège le lot ; aucune nouvelle tâche ne commence après 30 secondes. Les appels Google et Luna ont des délais d’expiration. Les parcours reprennent leur curseur après interruption. Après un parcours complet, toute fiche absente fait l’objet d’une lecture directe ; seul un retour explicite « contact supprimé » efface ses notes et sa synthèse du backoffice.

La vérification complète se répète 60 minutes après la fin du parcours. `SUMMARY_REFRESH_MINUTES` permet d’adapter cette durée (minimum 5 minutes). La fiche se met à jour automatiquement, sans action d’actualisation. Une source inchangée ne relance pas Luna. Une modification d’animaux en production met également la fiche en attente de relecture. Les futures mutations de notes doivent réutiliser cette ingestion et cette invalidation.

La génération appelle `gpt-6-luna` via Responses avec raisonnement `low`, `store: false`, aucun outil et un schéma JSON strict. Chaque phrase référence ses sources. Les résultats incomplets, refusés, trop longs, avec références inconnues, dates relatives ou e-mails sont rejetés. Les sources de plus de 120 000 octets demandent une intervention : elles restent lisibles et ne sont jamais tronquées pour l’IA. Les données insuffisantes et les blocs ambigus ne déclenchent aucun appel. La fidélité du texte doit être vérifiée lors du pilote ; les contrôles structurels ne prouvent pas toutes les affirmations.

Les erreurs temporaires sont réessayées au plus cinq fois, avec délai progressif et `Retry-After`. L’ancien résumé reste affiché avec son état périmé ; son dossier d’origine reste enregistré en D1. Une demande de relecture via l’API opérateur permet de reprendre une tâche en erreur. Le résultat d’une tâche ne peut publier que si son empreinte, sa version, le bail et le mode opérateur sont encore valides. Une demande de relecture pendant l’appel rend aussi son résultat obsolète.

## Installation et opérations

Ces étapes sont des actions opérateur explicites. Les déploiements et migrations ont été exécutés le 8 octobre 2026 ; le runner reste en pause, sans clé OpenAI ni appel réel à Luna. Les exemples suivants partent de `apps/backoffice`.

1. Déployer d’abord `contacts-sync` avec les lectures privées et préserver son mode actuel. La consultation des sources n’utilise pas son runner Calendly.
2. Configurer et déployer le backoffice de production avec la migration `0009_contact_summaries.sql`, après les migrations des comptes rendus et de leur import Gmail. Cette migration démarre en **pause** et préserve les autres données. La preview n’a ni cron ni binding Google pour cette fonction.
3. Vérifier le projet API OpenAI et son accès à Luna ; ajouter la clé avec `yarn wrangler secret put OPENAI_API_KEY --config wrangler.local.json --env production`. Ne pas utiliser cette clé dans des tests ou previews.
4. Passer en lecture seule pour vérifier les sources via l’API authentifiée `/api/contact-summary?id=people/…` :

```sh
yarn summaries:admin observe
yarn summaries:admin status
```

Le mode `observe` vérifie les sources sans appeler le modèle. `pause` arrête les nouveaux traitements ; un appel déjà envoyé peut néanmoins finir, sans publication si le mode a changé. `rescan` demande un nouveau parcours après celui en cours. Les commandes n’affichent que des états et compteurs.

5. Choisir 20 contacts variés : notes seules, plusieurs animaux, historique long, réservations annulées/reportées, notes contradictoires et données rares. Placer exactement leurs 20 identifiants Google dans un tableau JSON privé, hors Git. Ils sont pré-réservés ; aucun autre contact ne peut entrer dans le pilote.

```sh
yarn summaries:admin pilot --contacts-file /chemin/prive/pilote.json --confirm-model-calls
yarn summaries:admin status
```

Le pilote limite les contacts distincts, pas les tentatives d’actualisation de ces mêmes fiches. Les réservations de slots sont conservées après une erreur ou un changement de mode. Garder la même sélection en cas de reprise. Examiner avec Agathe les résumés et leurs références. `status` fournit les tokens et durées des résumés publiés ; les appels échoués ou dont le résultat a été écarté doivent aussi être comptabilisés depuis le projet OpenAI pour évaluer la facture réelle.

6. Après validation du pilote, lancer l’ensemble du carnet :

```sh
yarn summaries:admin live --confirm-model-calls
yarn summaries:admin status
```

Sans clé API, les lectures continuent et les générations restent en attente. Pour arrêter seulement la génération et conserver les relectures : `observe`. Pour tout suspendre : `pause`. Revenir en `live` reprend les tâches persistantes.

## Confidentialité et vérification

Les notes peuvent contenir des informations personnelles ; une partie est transmise à OpenAI après activation de la génération. La clé reste un secret Cloudflare. `store: false` désactive la conservation de la réponse comme objet Responses ; cela ne garantit pas l’absence de toute rétention chez le fournisseur. Aucun corps, note, réponse amont, jeton ou coordonnée n’est journalisé. La notice du service mentionne ce traitement.

La preview hébergée et le développement local utilisent une copie exacte des données métier de production, dont les notes et les synthèses. Les secrets et traitements IA restent propres à la production. Seuls les tests et l’export HTML de démonstration utilisent des données fictives. La démonstration locale peut présenter une synthèse fictive avec `BACKOFFICE_PREVIEW_DEMO=1 yarn preview`. Une lecture de fiche appelle seulement D1, jamais Luna.

Tests : données fictives, Google et OpenAI simulés, migrations exécutées sur SQLite en mémoire. Couvrir extraction sans perte, rendez-vous séparés, indisponibilité des sources, pagination, reprise, quotas, réponses invalides, changements concurrents, suppression confirmée, limites du pilote, authentification, origine et isolation preview/production.

Vérification après rebase sur `main` (`e07e983`) : contrôles statiques et formatage réussis, 198 tests unitaires (26 site, 69 contacts-sync, 103 backoffice) et 42 tests E2E du site réussis. Le build Astro et les builds Workers en `--dry-run` passent. La démonstration fictive du backoffice a été vérifiée sur ordinateur et à 390 px, sans débordement horizontal, avec ouverture de l’onglet « Résumé » et absence du bouton d’actualisation, des notes détaillées et des références visibles. Les onglets Coordonnées et Historique restent accessibles. Les captures sont disponibles dans `docs/screenshots/client-summary-desktop.jpg` et `docs/screenshots/client-summary-mobile.png`. Le 8 octobre, les Workers ont été publiés et les 1 702 dossiers sources réels copiés en preview et local, sans génération IA. L’accès du compte API et la fidélité des générations restent à valider pendant le pilote.

Références : [Luna](https://developers.openai.com/api/docs/models/gpt-6-luna), [sorties structurées](https://developers.openai.com/api/docs/guides/structured-outputs), [données API](https://developers.openai.com/api/docs/guides/your-data), [cron Workers](https://developers.cloudflare.com/workers/configuration/cron-triggers/).
