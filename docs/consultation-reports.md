# Comptes rendus de consultation

Les PDF originaux envoyés par `agathe.lescout.osteo@gmail.com` peuvent être importés dans le fil client du backoffice. L’événement affiche la **date d’envoi**, et non une date de consultation déduite du nom du fichier ou du texte manuscrit.

## Accès Gmail séparé

Créer un client OAuth **Application de bureau** dédié, dans le projet Google d’Agathe, activer Gmail API, puis télécharger son fichier JSON dans un dossier privé. Le client Google Contacts existant et ses autorisations restent indépendants.

Depuis la racine du dépôt :

```sh
node --experimental-strip-types apps/backoffice/scripts/authorize-gmail.mjs \
  --credentials /chemin/prive/client-gmail.json
```

Ouvrir l’URL OAuth affichée, choisir exclusivement le compte d’Agathe et consentir à `gmail.readonly`. Le callback loopback utilise PKCE et `state`. Le script vérifie le compte via Gmail et refuse un jeton dont les scopes dépassent cette lecture seule. Il conserve uniquement le refresh token dans `apps/backoffice/.credentials/gmail-readonly.json`, permissions 0600, hors Git. Aucun droit d’envoi, modification, suppression ou lecture de Google Contacts n’est demandé. Google peut imposer une durée courte en mode test ; une expiration nécessite une nouvelle autorisation. Ne jamais copier le fichier de secrets dans une PR, un journal ou une preview publique.

## Import local explicite

La base existante et sa copie JSON doivent être présentes dans `apps/backoffice/.credentials/`. Le script ne remplace jamais la copie des contacts et ne lance aucune synchronisation Google Contacts.

```sh
# Simulation : aucune écriture dans la base ni les fichiers PDF.
node --experimental-strip-types apps/backoffice/scripts/import-consultation-reports.mjs \
  --gmail apps/backoffice/.credentials/gmail-readonly.json

# Import : sauvegarde SQLite, migration, puis conservation des originaux.
node --experimental-strip-types apps/backoffice/scripts/import-consultation-reports.mjs \
  --gmail apps/backoffice/.credentials/gmail-readonly.json --apply

# Un message original téléchargé dans Gmail peut aussi servir de pilote.
node --experimental-strip-types apps/backoffice/scripts/import-consultation-reports.mjs \
  /chemin/prive/message.eml --apply
```

Les options `--database` et `--snapshot` permettent de sélectionner explicitement une autre copie locale. Chaque import appliqué crée une sauvegarde SQLite avant migration. Les compteurs de progression ne contiennent ni adresses, ni noms, ni contenu de consultation. Un échec Gmail interrompt la collecte ; les originaux déjà enregistrés restent disponibles. Une nouvelle exécution reparcourt la liste des messages, mais ne retélécharge pas ceux dont le traitement a réussi (points de reprise dans `gmail_import_messages`, migration `0008`). Les documents non rattachés sont réévalués contre le carnet courant. Le rythme est limité à quatre téléchargements à la fois, avec une pause entre lots et une reprise exponentielle sur les erreurs de quota 403/429.

Le parcours pagine tous les résultats de `in:sent has:attachment filename:pdf`, confirme le libellé SENT et l’expéditeur Agathe, puis analyse les messages MIME originaux. Il sélectionne les PDF nommés « Compte rendu » / « CR », ainsi que l’unique PDF d’un message intitulé « Compte rendu » (hors facture/devis). **Cette sélection ne prouve pas l’exhaustivité des documents nommés autrement** : contrôler les exclusions avant d’annoncer un import intégral. Les fichiers non PDF, supérieurs à 20 Mio ou les messages sans date/identifiant valide sont refusés. Un PDF manuscrit reste intact ; aucune information clinique n’est interprétée automatiquement.

## Rattachement et doublons

- Comparer les adresses destinataires **À** aux e-mails des contacts actifs, après espaces/casse uniquement. Ne pas supprimer les points ou les suffixes `+`.
- Un rattachement automatique exige que tous les destinataires externes correspondent sans ambiguïté à une même fiche. Les copies CC/BCC ne servent pas au rattachement.
- Sans correspondance, conserver le PDF privé avec `unmatched`. Plusieurs fiches pour une adresse ou des destinataires différents donnent `ambiguous`. Ces documents ne sont pas accessibles par l’API de téléchargement.
- Une nouvelle importation peut résoudre un document non rattaché après correction du carnet. Un document déjà rattaché conserve sa fiche historique, même si l’adresse change ensuite.
- L’identifiant du message MIME et l’index de pièce jointe rendent la réimportation idempotente. L’empreinte SHA-256 conserve un seul original identique sur disque. Plusieurs envois du même PDF à la même fiche produisent une seule entrée, à la première date d’envoi ; leurs sources restent enregistrées. Un PDF révisé a sa propre entrée.

Pour examiner les documents non rattachés, utiliser localement la table `consultation_reports` (`match_status`, `recipients`, `message_id`). Ne pas exporter ces informations privées dans les logs ou Git. L’interface de résolution manuelle et la synchronisation planifiée ne sont pas implémentées.

## Stockage et consultation

La migration `0007_consultation_reports.sql` contient les métadonnées. En local, les originaux restent dans `.credentials/consultation-reports/<sha256>.pdf` (dossier 0700, fichiers 0600), à côté de SQLite. Le serveur local applique ses contrôles loopback habituels et sert les PDF via le même handler que le Worker.

Le fil client charge `/api/consultation-reports?contactId=…`. Le bouton « Voir le PDF » ouvre un visionneur PDF.js dans le backoffice, avec navigation par page, zoom et téléchargement facultatif. Les octets originaux sont lus via `/api/consultation-pdf?id=…` ; le rendu utilise un canvas et un worker local, sans iframe ni service tiers. Les protections CSP restent inchangées. Sur le Worker, ces routes passent par Cloudflare Access avant toute lecture. Les réponses sont privées, sans cache, avec `nosniff` et un nom de fichier encodé ; aucun lien public de stockage n’est généré.

**Activation hébergée distincte :** avant utilisation sur le domaine privé, appliquer la migration D1, provisionner un bucket R2 privé et sa liaison `REPORTS`, puis transférer explicitement les originaux et métadonnées vers le même environnement. L’importeur livré écrit uniquement dans la copie SQLite locale ; il ne déploie ni ne transfère automatiquement les consultations dans le cloud. Les exports de preview existants n’incluent pas ces PDF : sauvegarder ensemble SQLite et le dossier des originaux.

## Vérifications

Les tests utilisent uniquement des e-mails et PDF fictifs : matching exact, adresses partagées, MIME, mauvaise boîte, pagination Gmail, simulation, réimportation, renvois, révisions, conservation du rattachement, permissions disque et routes Access GET/HEAD.

Références : [messages.list](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/list), [messages.get](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/get), [quotas Gmail](https://developers.google.com/workspace/gmail/api/reference/quota), [OAuth pour applications natives](https://developers.google.com/identity/protocols/oauth2/native-app).

## Validation avant publication

Exécuter `yarn check:static`, `yarn test:unit`, `yarn test:e2e` et le build backoffice en simulation production/preview. Vérifier manuellement l’ouverture du premier onglet Résumé, l’accès aux coordonnées et à l’historique, le visionneur sur un PDF de plusieurs pages (navigation, zoom, fermeture, téléchargement), ainsi que le menu d’actions dans le tableau.

Pour un import réel, comparer les identifiants de l’inventaire Gmail aux points de reprise, contrôler les exclusions, puis vérifier les tailles, empreintes SHA-256 et permissions des originaux ainsi que `PRAGMA integrity_check`. Conserver les bilans opérateur, captures, PDF et données client dans `.credentials/`, hors Git. Les connexions SQLite locales attendent jusqu’à cinq secondes en cas de verrou concurrent.
