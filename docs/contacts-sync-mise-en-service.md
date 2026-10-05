# Mise en service — 5 octobre 2026

## Vérifications réelles

- Worker de production déployé, base D1 liée et traitement planifié chaque minute.
- Autorisation Google obtenue pour le compte destinataire attendu ; lecture et écriture People API réussies.
- Abonnement webhook Calendly personnel actif ; deux notifications réelles reçues et traitées durablement.
- Inventaire Calendly : 2 482 événements accessibles. Lecture des invités en cours ; première réservation récupérée le 16 avril 2021.
- Simulation initiale sans écriture Google : contacts à créer et contacts existants à compléter identifiés sans conflit sur cet échantillon. La simulation de tout l’historique n’était pas terminée au lancement du pilote.
- Pilote plafonné à cinq contacts : cinq écritures Google réussies. Vérification par relecture People API et second passage réussie : les cinq contacts ont finalement le résultat `unchanged`, sans conflit. Une fiche a aussi reçu un rendez-vous supplémentaire découvert pendant l’analyse historique, puis a été confirmée stable.
- 34 tests automatisés réussis, TypeScript et formatage vérifiés.

Le mode `live` a ensuite été activé : import historique reprenable et nouvelles notifications traitées automatiquement. Premier contrôle après activation : six contacts synchronisés avec succès (donc dépassement confirmé du pilote), aucun conflit et aucune erreur en cours. L’import historique est encore en cours, pas déclaré terminé.

## Correctifs validés pendant l’installation

Le transport HTTP utilise fetch sans liaison de `this` et refuse les redirections sans les suivre, conformément au comportement du runtime Workers. La commande de statut accepte la sortie JSON de Wrangler. Le traitement planifié travaille par lots bornés, avec écritures séquentielles et verrou D1 ; l’inventaire Calendly pagine par 100 événements.

Ces correctifs ont été déployés sur le Worker pendant l’installation. Leur livraison dans Git et la fusion des PR font l’objet d’une étape distincte, autorisée ensuite par le propriétaire.

## Limites

Le pilote ne prouve pas que chaque contact historique sera dépourvu de conflit. Les cas ambigus restent bloqués individuellement sans fusion ni suppression. Le contrôle après 24 heures reste à réaliser ; aucune surveillance différée par Codex n’est programmée.

## Optimisation du 5 octobre 2026

Authentification mutualisée dans chaque invocation, bail unique pour le lot, regroupement des opérations de suivi D1, deux lectures Calendly parallèles, index Google incrémental par pages de 1 000, lecture directe des contacts déjà associés. Les écritures Google restent séquentielles et conditionnées par une relecture, l’etag, le mode et le bail. Le budget de requêtes HTTP externes est borné à 45 ; le lot démarre au plus 30 unités et cesse d’en démarrer après 50 secondes.

La migration 0002 a été appliquée en pause sans remise à zéro des réservations, contacts ou tâches. Les tests comprennent la pagination incrémentale, les suppressions et changements d’e-mail, l’expiration du jeton d’index, la reprise d’une création incertaine et la pause entre deux écritures. Un test reproduit puis valide le nettoyage de l’intention d’écriture lorsqu’un arrêt intervient avant l’appel Google. 42 tests passent, ainsi que TypeScript, le formatage et la compilation Worker. La requête atomique de contrôle du bail a aussi été exécutée sur D1 local.

Un conflit de notes a été détecté pendant la validation (`notes_manually_modified`, tâche 2548). La fiche présente une intention d’écriture en attente, sans écriture précédemment confirmée. Aucun contenu réel n’a été affiché dans les sorties ; l’origine précise du conflit sur cette fiche n’est donc pas déclarée résolue. Elle a alors été laissée bloquée pour examen, sans effacement forcé du bloc ni nouvelle écriture. Sa résolution ultérieure est décrite ci-dessous.

Les changements ont été validés et déployés sur le Worker avant leur livraison dans Git. Aucun changement de forfait n’a été effectué.

### Mesure après déploiement final

Le 05/10/2026 à 16:58 (Paris), sur 3.02 minutes de fonctionnement :

| Mesure                                    | Avant optimisation, fenêtre active d’environ 5,8 minutes | Après optimisation, fenêtre active d’environ 3 minutes |
| ----------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------ |
| Rendez-vous traités par minute            | 5,6                                                      | 11.2                                                   |
| Nouveaux contacts synchronisés par minute | 1,4                                                      | 5.0                                                    |

La fenêtre finale passe de 405 à 439 événements traités et de 62 à 77 contacts synchronisés. Les compteurs concernent des tâches réelles ; la composition des lots varie, ces débits ne garantissent pas une durée totale d’import. Plusieurs passages cron observés ont le résultat `ok`, sans exception. Le rafraîchissement incrémental a réussi en production après le premier inventaire. Aucun nouveau conflit n’a été observé dans cette fenêtre.

État au dernier contrôle : `live`, 439 événements traités sur 2 482 inventoriés, 441 réservations invitées enregistrées, 77 contacts synchronisés, un conflit de notes conservé, aucune erreur en cours. L’import reste en cours.

## Résolution du conflit de notes, 5 octobre 2026

La commande privée d’inspection a relu la fiche de la tâche 2548 dans Google et renvoyé uniquement des indicateurs techniques : une intention d’écriture en attente, aucun bloc confirmé, aucune synchronisation auparavant réussie, aucune balise Calendly et aucun marqueur technique présent dans Google. Les notes actuelles ont un format pris en charge.

La reprise a été explicitement autorisée par le propriétaire dans la conversation. `resolve-notes 2548 --preserve-existing-notes` a relu la fiche et ignoré uniquement l’ancienne intention non confirmée pour construire la mise à jour. Le contenu existant reste le préfixe intégral des notes ; la nouvelle section Calendly est ajoutée après. Le contact existant est mis à jour par son identifiant, sans création ni fusion. L’etag, le bail et le mode sont toujours contrôlés.

Résultat réel : tâche terminée, écriture Google confirmée, bloc Calendly enregistré dans D1, intention en attente effacée et zéro conflit restant au contrôle. Second passage réel vérifié : tâche terminée avec le résultat `unchanged`, aucun changement supplémentaire nécessaire. Le service est en mode `live`, sans erreur en cours et sans aucun conflit restant. La migration 0003 ajoute un diagnostic limité aux indicateurs, sans texte Google copié dans les sorties. 46 tests passent, ainsi que TypeScript, le formatage et la compilation ; ils couvrent aussi le refus de la reprise si les notes changent après inspection.

## Conservation de la configuration locale

La configuration privée `apps/contacts-sync/wrangler.local.json` a été copiée dans le checkout durable de `local_sources`, avec vérification de contenu identique et permissions `0600`. Ce fichier reste ignoré et non suivi par Git ; les secrets restent dans Cloudflare. L’archivage du worktree de développement ne suspend pas le Worker ni le traitement D1.

## Contrôle pendant la livraison du code

Le contrôle du 5 octobre 2026, après sauvegarde de la configuration, confirme le mode `live`, aucune erreur globale ni reconnexion Google nécessaire : 751 événements historiques traités sur 2 482, 753 réservations enregistrées et 203 tâches de contacts terminées. L’import continue. Un nouveau conflit `google_contact_shared_by_emails` (tâche 2898) concerne une correspondance ambiguë ; la fiche est conservée sans fusion automatique et ce conflit est distinct du conflit de notes résolu précédemment.

## État final observé avant fusion

Le dernier contrôle de production confirme 2 482 tâches événement terminées, 2 483 réservations enregistrées, 1 451 tâches contact terminées et aucune tâche en attente. Treize correspondances ambiguës restent en conflit `google_contact_shared_by_emails`, sans fusion automatique. Le mode est `live`, aucune erreur globale et aucune reconnexion Google ne sont signalées. L’historique accessible a été parcouru entièrement ; la résolution de ces treize cas et le contrôle après 24 heures restent à effectuer.

Les vérifications locales passent (46 tests Worker, 26 tests unitaires du site et 42 tests Playwright). La CI du même code a validé le Worker et les parcours du site avant le commit de relance de preview ; sa vérification Lighthouse avait alors échoué faute de preview. La preview finale est désormais publiée et vérifiée. Les nouveaux contrôles GitHub sont en file d’attente pendant un incident Actions annoncé le 5 octobre 2026 à 19:11 UTC : [état officiel GitHub](https://www.githubstatus.com/). La fusion demandée utilise les règles normales du dépôt, sans désactiver de protection ni forcer une approbation.
