RFC — Migration formulaire de contact vers Netlify Forms (Quick Win)

Auteur : Ludwig • Date : 2025‑10‑12 • Statut : Draft → À valider
Contexte : Site vitrine en Astro/React déployé sur Netlify. Le formulaire actuel envoie vers Getform (coûteux). Objectif : migrer vers Netlify Forms intégré (gratuit, 0 maintenance).

⸻

## 1. Problème

• **Getform est trop coûteux** pour un simple formulaire de contact (~$20-50/mois)
• Besoin d'une solution **minimaliste et fiable** : recevoir soumissions → envoyer email
• Volume estimé : **~10-20 soumissions/mois** (site vitrine ostéopathe)

⸻

## 2. Solution retenue : Netlify Forms

**Pourquoi Netlify Forms ?**
- ✅ Déjà sur Netlify → **0 infrastructure additionnelle**
- ✅ **Gratuit jusqu'à 100 soumissions/mois** (largement suffisant)
- ✅ Spam filtering intégré (honeypot + Turnstile)
- ✅ Email de notification automatique
- ✅ Délivrabilité gérée par Netlify (SPF/DKIM configurés)
- ✅ Dashboard UI pour consulter les soumissions
- ✅ Export CSV si besoin
- ✅ **0 maintenance, 0 code backend**

**Alternative évaluée et rejetée** : Cloudflare Workers custom
- Raison : Complexité excessive (7j dev + 14j warmup) pour un besoin simple
- Volume trop faible pour justifier le self-hosted

⸻

## 3. Architecture cible

```
[Formulaire Astro/React]
        |
        | data-netlify="true"
        v
[Netlify Forms Service]
        |
        | Email notification
        v
[Gmail destinataire]
```

**Flux simplifié** :
1. User soumet le formulaire HTML
2. Netlify intercepte automatiquement (détection via attribut `data-netlify`)
3. Spam check (honeypot + optionnel Turnstile)
4. Stockage soumission dans Netlify UI
5. Email envoyé au destinataire configuré

⸻

## 4. Implémentation (migration)

### Étape 1 : Modifier le formulaire HTML

**Avant (Getform)** :
```html
<form
  action="https://getform.io/f/xxxxx"
  method="POST"
>
```

**Après (Netlify Forms)** :
```html
<form
  name="contact"
  method="POST"
  data-netlify="true"
  data-netlify-honeypot="bot-field"
>
  <!-- Champ honeypot caché (spam) -->
  <input type="hidden" name="bot-field" />

  <!-- Champs existants -->
  <input name="name" ... />
  <input name="animal" ... />
  <input name="email" ... />
  <input name="phone" ... />
  <textarea name="message" ... />

  <button type="submit">Envoyer</button>
</form>
```

**Note importante** : Netlify détecte les forms au build-time. Le formulaire doit exister en HTML statique (pas uniquement en React client-side).

### Étape 2 : (Optionnel) Ajouter Turnstile

Si besoin de protection anti-spam renforcée :

```html
<form
  name="contact"
  method="POST"
  data-netlify="true"
  data-netlify-recaptcha="true"
>
  <!-- Netlify injecte automatiquement le widget Turnstile -->
</form>
```

Ou utiliser Cloudflare Turnstile custom (plus moderne) :
```html
<!-- Widget Turnstile -->
<div class="cf-turnstile" data-sitekey="YOUR_SITE_KEY"></div>
<input type="hidden" name="cf-turnstile-response" />
```

### Étape 3 : Configuration Netlify UI

1. Aller dans **Netlify Dashboard** → Site → **Forms**
2. Configurer **Form notifications** :
   - Email destinataire : `agathe.lescout.osteo@gmail.com`
   - Outgoing email : `forms@osteopathie-animale-bordeaux.fr` (ou défaut Netlify)
3. Activer **Spam filtering** (recommandé : Akismet ou Honeypot minimum)

### Étape 4 : Adapter l'UX React (optionnel)

**Soumission Ajax avec Netlify Forms** :

```tsx
// ContactForm.tsx
const handleSubmit = async (e: FormEvent) => {
  e.preventDefault();
  const formData = new FormData(e.target as HTMLFormElement);

  try {
    const response = await fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(formData as any).toString(),
    });

    if (response.ok) {
      // Afficher message succès
      setSuccess(true);
    }
  } catch (error) {
    setError(true);
  }
};
```

⸻

## 5. Contrat d'interface

### Champs du formulaire
- **name** : string (nom du client)
- **animal** : string (nom de l'animal)
- **email** : string (email de contact)
- **phone** : string (téléphone)
- **message** : string (message)
- **bot-field** : string (honeypot, doit rester vide)
- **(Optionnel) cf-turnstile-response** : string (token Turnstile)

### Validation côté Netlify
- Email format valide : automatique
- Spam check : honeypot + (optionnel) Turnstile
- Rate limiting : géré par Netlify (protection DDoS)

### Email de notification reçu
```
From: forms@osteopathie-animale-bordeaux.fr
To: agathe.lescout.osteo@gmail.com
Reply-To: [email saisi dans le formulaire]

Subject: New form submission from contact

Name: [name]
Animal: [animal]
Email: [email]
Phone: [phone]
Message: [message]

---
Submitted at: [timestamp]
```

⸻

## 6. Anti-spam & Sécurité

### Protection intégrée Netlify
1. **Honeypot** (gratuit, recommandé) :
   - Champ caché `bot-field` détecte bots basiques
   - Efficace contre 80% du spam

2. **Turnstile/reCAPTCHA** (optionnel) :
   - Pour sites à fort trafic
   - `data-netlify-recaptcha="true"` active automatiquement
   - Ou custom Cloudflare Turnstile (meilleure UX)

3. **Akismet** (premium, $19/mois) :
   - Filtrage ML avancé
   - Seulement si spam massif

### Rate limiting
- Géré automatiquement par Netlify
- Protection DDoS incluse
- Pas de configuration nécessaire

⸻

## 7. Limitations & Monitoring

### Limites plan gratuit Netlify
- **100 soumissions/mois** (largement suffisant pour le site)
- **100 MB stockage** de soumissions
- **Email notifications** illimitées

### Si dépassement (improbable)
- Plan Pro : **$19/mois** → 1000 soumissions/mois
- Ou export CSV + switch vers autre service

### Monitoring
- **Dashboard Netlify** : voir toutes les soumissions en temps réel
- **Email notifications** : alerte à chaque soumission
- **Export CSV** : backup mensuel des données

⸻

## 8. Migration & Rollback

### Plan de migration (Progressive)

**Phase 1 : Test (1 jour)**
1. Créer branche `feature/netlify-forms`
2. Modifier formulaire avec `data-netlify="true"`
3. Deploy sur branch preview Netlify
4. Tester soumission → vérifier email reçu

**Phase 2 : Production (même jour)**
1. Merge vers `main` si tests OK
2. Netlify deploy automatique
3. Tester en prod
4. **Garder URL Getform en backup** (commentée) pendant 1 semaine

**Phase 3 : Cleanup (après 1 semaine)**
1. Vérifier toutes soumissions arrivent
2. Supprimer référence Getform
3. Annuler abonnement Getform

### Rollback plan
Si problème détecté :
1. Revert commit (1 min)
2. Redéploy automatique Netlify
3. Retour à Getform immédiat

**Risque** : Quasi nul (Netlify Forms = service stable utilisé par millions de sites)

⸻

## 9. Délivrabilité email

### Gérée automatiquement par Netlify
- **SPF/DKIM** : Configurés par Netlify pour `@netlify.com`
- **Réputation** : Domaine Netlify déjà warmé (millions d'emails/jour)
- **Inbox rate** : ~99% (Gmail, Outlook, etc.)

### Optionnel : Custom domain email
Pour envoyer depuis `@osteopathie-animale-bordeaux.fr` :
1. Configurer **Netlify Forms custom email** (plan Pro requis)
2. Ajouter DNS records (SPF/DKIM fournis par Netlify)

**Recommandation v1** : Utiliser email Netlify par défaut (fiable et gratuit)

⸻

## 10. RGPD & Conformité

### Mentions légales requises
Ajouter au formulaire :
```html
<p class="text-sm text-gray-500">
  En soumettant ce formulaire, vous acceptez que vos données soient
  traitées pour vous contacter.
  <a href="/politique-confidentialite">Politique de confidentialité</a>
</p>
```

### Stockage des données
- **Netlify** : Stocke les soumissions (UE/US, conforme RGPD)
- **Rétention** : Configurable (défaut : 30 jours)
- **Export/Suppression** : Via UI Netlify

### Droits utilisateurs
- Droit d'accès : Export CSV Netlify
- Droit à l'oubli : Suppression manuelle via UI

⸻

## 11. Critères de complétion

### MVP (fonctionnel minimal)
- [ ] Formulaire modifié avec `data-netlify="true"`
- [ ] Honeypot ajouté (`bot-field`)
- [ ] Email notification configuré dans Netlify UI
- [ ] Soumission test → email reçu sur Gmail
- [ ] UX succès/erreur fonctionnelle (React)
- [ ] Migration prod effectuée
- [ ] Getform annulé (après 1 semaine de validation)

### Succès mesurable
- ✅ **Coût** : $0/mois (vs $20-50/mois Getform)
- ✅ **Fiabilité** : 99.9% uptime Netlify
- ✅ **Maintenance** : 0 heure/mois
- ✅ **Délivrabilité** : >95% inbox rate
- ✅ **Setup time** : <2 heures (vs 2-3 semaines pour self-hosted)

⸻

## 12. Extensions futures (hors scope v1)

Si besoin futur :
- **Webhook** : Netlify → API custom (stockage DB, CRM, etc.)
- **Zapier/Make** : Intégration no-code (Google Sheets, Notion, etc.)
- **Custom email templates** : Plan Pro Netlify
- **Analytics** : Tracking soumissions (Google Analytics, Plausible)

⸻

## Références

- [Netlify Forms Docs](https://docs.netlify.com/forms/setup/)
- [Netlify Forms Spam Filtering](https://docs.netlify.com/forms/spam-filters/)
- [Netlify Forms Ajax](https://docs.netlify.com/forms/setup/#submit-forms-via-ajax)
- [Cloudflare Turnstile + Netlify](https://docs.netlify.com/forms/spam-filters/#custom-recaptcha)
