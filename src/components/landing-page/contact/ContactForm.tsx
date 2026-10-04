import { useEffect, useState, type SubmitEvent } from 'react';
import { pushDataLayerEvent } from '../../../lib/analytics';
import FormField from './FormField';
import { Button } from '../../ui/button';

type ValidationErrors = {
  name?: string;
  email?: string;
  contactMethod?: string;
  message?: string;
};

const readFormString = (formData: FormData, name: string) => {
  const value = formData.get(name);
  return typeof value === 'string' ? value.trim() : '';
};

export default function ContactForm() {
  const [success, setSuccess] = useState(false);
  const [submitError, setSubmitError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hydrationReady, setHydrationReady] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>(
    {}
  );

  useEffect(() => {
    setHydrationReady(true);
  }, []);

  const handleSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const name = readFormString(formData, 'name');
    const animal = readFormString(formData, 'animal');
    const email = readFormString(formData, 'email');
    const phone = readFormString(formData, 'phone');
    const message = readFormString(formData, 'message');
    const emailInput = form.elements.namedItem(
      'email'
    ) as HTMLInputElement | null;
    const nextValidationErrors: ValidationErrors = {};

    if (!name) {
      nextValidationErrors.name = 'Veuillez renseigner votre nom.';
    }

    if (!message) {
      nextValidationErrors.message = 'Veuillez décrire votre demande.';
    }

    if (!email && !phone) {
      nextValidationErrors.contactMethod =
        'Veuillez renseigner un email ou un téléphone.';
    }

    if (email && emailInput?.validity.typeMismatch) {
      nextValidationErrors.email = 'Veuillez renseigner un email valide.';
    }

    if (Object.keys(nextValidationErrors).length > 0) {
      setValidationErrors(nextValidationErrors);
      setSuccess(false);
      setSubmitError(false);
      const firstInvalidName = nextValidationErrors.name
        ? 'name'
        : nextValidationErrors.email || nextValidationErrors.contactMethod
          ? 'email'
          : 'message';
      form.querySelector<HTMLElement>(`[name="${firstInvalidName}"]`)?.focus();
      return;
    }

    setValidationErrors({});
    formData.set('name', name);
    formData.set('animal', animal);
    formData.set('email', email);
    formData.set('phone', phone);
    formData.set('message', message);
    formData.set('form-name', 'contact');
    setLoading(true);
    setSuccess(false);
    setSubmitError(false);
    pushDataLayerEvent('contact_form_submit_started', {
      formName: 'contact',
    });

    try {
      // Convert FormData to URLSearchParams for Netlify Forms
      const body = new URLSearchParams();
      formData.forEach((value, key) => {
        if (typeof value === 'string') {
          body.append(key, value);
        }
      });

      // eslint-disable-next-line no-undef
      const response = await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });

      if (response.ok) {
        setSuccess(true);
        pushDataLayerEvent('contact_form_submit_succeeded', {
          formName: 'contact',
        });
        form.reset();
        // Reset success message after 5 seconds
        setTimeout(() => setSuccess(false), 5000);
      } else {
        setSubmitError(true);
        pushDataLayerEvent('contact_form_submit_failed', {
          formName: 'contact',
          status: response.status,
        });
      }
    } catch (_err) {
      setSubmitError(true);
      pushDataLayerEvent('contact_form_submit_failed', {
        formName: 'contact',
        status: 'network_error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="contact-form-panel">
      <div>
        <h3>Me contacter</h3>
        <form
          id="contactForm"
          name="contact"
          method="POST"
          data-netlify="true"
          data-netlify-honeypot="bot-field"
          onSubmit={handleSubmit}
          noValidate={hydrationReady}
          className="contact-form-grid"
        >
          {/* Honeypot field for spam protection */}
          <div
            data-testid="contact-honeypot"
            className="hidden"
            aria-hidden="true"
          >
            <label htmlFor="bot-field">
              Ne remplissez pas ce champ si vous êtes humain
            </label>
            <input
              id="bot-field"
              type="text"
              name="bot-field"
              tabIndex={-1}
              autoComplete="off"
            />
          </div>

          {/* Hidden field for Netlify form detection */}
          <input type="hidden" name="form-name" value="contact" />

          <FormField
            name="name"
            placeholder="Nom"
            type="text"
            autoComplete="name"
            required
            error={validationErrors.name}
          />

          <FormField
            name="animal"
            placeholder="Nom de l'animal"
            type="text"
            autoComplete="name"
          />

          <FormField
            name="email"
            placeholder="Email"
            type="email"
            autoComplete="email"
            error={validationErrors.email}
            invalid={Boolean(validationErrors.contactMethod)}
            ariaDescribedBy={
              validationErrors.contactMethod
                ? 'contact-method-error'
                : undefined
            }
          />

          <FormField
            name="phone"
            placeholder="Téléphone"
            type="tel"
            autoComplete="tel"
            invalid={Boolean(validationErrors.contactMethod)}
            ariaDescribedBy={
              validationErrors.contactMethod
                ? 'contact-method-error'
                : undefined
            }
          />
          {validationErrors.contactMethod && (
            <p
              id="contact-method-error"
              role="alert"
              className="contact-form-full text-xs text-destructive"
            >
              {validationErrors.contactMethod}
            </p>
          )}

          <FormField
            name="message"
            placeholder="Message"
            type="textarea"
            rows={4}
            required
            error={validationErrors.message}
          />

          {/* RGPD compliance text */}
          <p className="contact-form-full text-[10px] leading-relaxed text-muted-foreground">
            En soumettant ce formulaire, vous acceptez que vos données soient
            traitées pour vous contacter.
          </p>

          {/* Success message */}
          {success && (
            <div className="contact-form-full rounded-xl bg-green-50 p-4">
              <div className="flex">
                <div className="shrink-0">
                  <svg
                    className="h-5 w-5 text-green-400"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-800">
                    Message envoyé ! Nous vous répondrons rapidement.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error message */}
          {submitError && (
            <div className="contact-form-full rounded-xl bg-red-50 p-4">
              <div className="flex">
                <div className="shrink-0">
                  <svg
                    className="h-5 w-5 text-red-400"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-800">
                    Une erreur est survenue. Veuillez réessayer.
                  </p>
                </div>
              </div>
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="contact-form-full"
          >
            {loading ? 'Envoi en cours...' : 'Envoyer'}
          </Button>
        </form>
      </div>
    </div>
  );
}
