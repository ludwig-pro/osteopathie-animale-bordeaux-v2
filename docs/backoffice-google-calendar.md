# Prochain rendez-vous Google Calendar

L’accueil du backoffice présente le prochain rendez-vous à horaire précis de l’agenda d’Agathe Lescout : titre original, date, heure de début et de fin, lieu s’il est renseigné, lien vers Google Calendar. Les heures sont affichées en Europe/Paris, y compris lors des changements d’heure. Un événement provisoire porte la mention « À confirmer ».

La lecture est indépendante de l’historique Calendly et des synthèses Luna. Elle ne modifie aucun événement, n’utilise pas de modèle et conserve uniquement le rendez-vous observé dans D1 lors de la copie de production vers preview. Ce rendez-vous est ensuite copié en local. Les descriptions et les coordonnées des invités sont exclues. Aucun événement ou jeton n’est journalisé.

## Lecture et accès

`GET /api/next-appointment` exige la session Cloudflare Access habituelle. Le backoffice utilise le binding privé `GOOGLE_CONTACTS` et son endpoint `/next-appointment`, avec le compte d’Agathe fixé côté serveur. Le navigateur ne reçoit aucun secret Google, et la route publique de contacts-sync ne sert jamais cet agenda. La réponse est privée et non mise en cache.

contacts-sync renouvelle l’accès OAuth existant et revérifie l’identité Google avant la lecture Calendar. Par défaut, `primary` désigne l’agenda principal du compte vérifié. `GOOGLE_CALENDAR_ID` dans la configuration privée du Worker permet de sélectionner un autre agenda appartenant à Agathe, par exemple son agenda de consultations. Le client ne peut pas sélectionner un agenda via l’API.

L’appel [`events.list`](https://developers.google.com/workspace/calendar/api/v3/reference/events/list) utilise `singleEvents=true`, `orderBy=startTime`, `eventTypes=default` et `showDeleted=false`. Les récurrences sont développées par Google, avec leurs exceptions et reports. Puisque `timeMin` filtre la fin des événements, le service écarte également les événements déjà commencés. Il ignore les invitations refusées par Agathe, les événements annulés, les journées entières et les types spécifiques comme les absences ou les lieux de travail. Les autres événements à horaire précis de l’agenda choisi sont considérés comme des rendez-vous ; aucun type de consultation n’est déduit de leur texte.

La lecture parcourt au plus trois pages de 100 événements et conserve les délais d’expiration des appels Google. Une page intermédiaire vide reprend son curseur. Une lecture interrompue, une limite atteinte ou une réponse invalide donne un état indisponible, jamais « aucun rendez-vous ». Seule une lecture complète sans rendez-vous admissible affiche l’état vide. Les réponses Calendar sont limitées à 2 Mio ; la réponse privée au backoffice à 64 Kio, sans troncature silencieuse.

La carte est relue à l’ouverture de l’accueil puis chaque minute tant que la page est visible, et au retour sur la page. La boucle s’arrête en quittant l’accueil. Aucun bouton d’actualisation n’est ajouté.

## Configuration opérateur

Les étapes suivantes concernent la mise en service et ne sont pas exécutées par les tests ou la preview.

1. Activer **Google Calendar API** dans le projet Google Cloud du client OAuth existant.
2. Ajouter le [scope](https://developers.google.com/workspace/calendar/api/auth) `https://www.googleapis.com/auth/calendar.events.owned.readonly` à l’écran de consentement, en conservant `openid`, `email` et `https://www.googleapis.com/auth/contacts`. Il donne la lecture des événements des agendas appartenant au compte, sans écriture Calendar.
3. Réautoriser Agathe avec le script existant et l’option `--calendar` :

   ```sh
   cd apps/contacts-sync
   yarn authorize --env production --credentials /chemin/prive/client-oauth.json --calendar
   ```

   Le script vérifie le compte et les droits Contacts et Calendar accordés, puis enregistre directement `GOOGLE_OAUTH` dans les secrets Cloudflare, sans afficher les jetons. La configuration et les identifiants réels restent hors Git. Pour les réautorisations suivantes, conserver l’option `--calendar` afin de conserver la lecture de l’agenda.

4. Si les consultations sont dans un agenda secondaire appartenant à Agathe, renseigner `GOOGLE_CALENDAR_ID` dans `wrangler.local.json`, ou passer cette variable au script `scripts/configure.mjs`. Sans cette variable, seul l’agenda principal est consulté.
5. Déployer contacts-sync puis le backoffice lors d’une opération explicitement autorisée. Le mode du runner Calendly reste inchangé ; cette lecture d’agenda ne lance aucun import ni aucune écriture.

Un compte ou un droit non configuré affiche « L’agenda d’Agathe n’est pas encore connecté ». Une panne temporaire affiche « Impossible de lire l’agenda pour le moment ». Ces deux situations restent distinctes d’un agenda vide.

## Preview et vérification

La preview et le local affichent une copie exacte du rendez-vous observé en production, avec la date de copie. Ils ne relisent pas directement l’agenda Google, même si un binding Google leur est injecté. Une copie manquante affiche un état indisponible et ne fabrique aucun rendez-vous. Le mode local `BACKOFFICE_PREVIEW_DEMO=1` présente uniquement un rendez-vous futur fictif, identifié « Exemple fictif ». L’export HTML conserve cette séparation et ne fabrique pas de rendez-vous pour des contacts copiés.

Les tests utilisent exclusivement des jetons et événements fictifs. Ils couvrent les récurrences et exceptions, le prochain horaire autour du changement d’heure, les annulations et refus, les événements en cours ou sans horaire, la pagination, les lectures incomplètes, les réponses invalides ou volumineuses, les permissions/quota/pannes, les liens autorisés, le compte Google, l’authentification Access, les méthodes et l’isolation preview.

Vérification du 8 octobre 2026 : 198 tests unitaires réussis (26 site, 69 contacts-sync, 103 backoffice), dont 11 tests Calendar ; 42 tests E2E du site réussis. Les contrôles de formatage et de types, le build Astro et les builds Workers en `--dry-run` passent. L’accueil fictif a été vérifié sur ordinateur et à 390 px sans débordement horizontal ; captures dans `docs/screenshots/calendar-next-appointment-desktop.jpg` et `docs/screenshots/calendar-next-appointment-mobile.jpg`.

Les Workers sont maintenant déployés. La lecture réelle renvoie `not_connected` ; la copie complète de production a conservé cet état en preview et local, sans fabriquer de rendez-vous. Les étapes de configuration Google ci-dessus restent à terminer avant de pouvoir afficher un événement réel.
