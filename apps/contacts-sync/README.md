# Synchronisation Calendly → Google Contacts

Worker TypeScript + D1, mono-utilisateur. Réception signée, import paginé, rapprochement Google, notes préservées et reprises durables. L’état initial est **paused**.

Depuis la racine :

```sh
yarn dev:sync
yarn workspace @osteo/contacts-sync run check
yarn workspace @osteo/contacts-sync test
yarn build:sync
yarn sync:admin status --local
```

`dev:sync` applique les migrations à D1 local. Le cron local se déclenche explicitement par `curl http://localhost:8787/__scheduled`; aucune API distante n’est appelée en mode pause. Les tests injectent uniquement des API fictives et n’utilisent aucun secret local.

[Guide d’installation, architecture, limites et résolution des conflits](../../docs/calendly-google-contacts.md).
