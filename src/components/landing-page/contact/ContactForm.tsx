import { useState, type FormEvent } from 'react';
import { GoogleReCaptcha } from 'react-google-recaptcha-v3';
import FormField from './FormField';

export default function ContactForm() {
  const [token, setToken] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    setError(false);

    const form = e.currentTarget;
    const formData = new FormData(form);

    // Add form-name for Netlify
    formData.append('form-name', 'contact');

    try {
      // eslint-disable-next-line no-undef
      const response = await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(
          formData as unknown as Record<string, string>
        ).toString(),
      });

      if (response.ok) {
        setSuccess(true);
        form.reset();
        // Reset success message after 5 seconds
        setTimeout(() => setSuccess(false), 5000);
      } else {
        setError(true);
      }
    } catch (_err) {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white py-16 px-4 sm:px-6 lg:col-span-3 lg:py-24 lg:px-8 xl:pl-12">
      <div className="max-w-lg mx-auto lg:max-w-none">
        <form
          id="contactForm"
          name="contact"
          method="POST"
          data-netlify="true"
          data-netlify-honeypot="bot-field"
          onSubmit={handleSubmit}
          className="grid grid-cols-1 gap-y-6"
        >
          {/* Honeypot field for spam protection */}
          <input type="hidden" name="bot-field" />

          {/* Hidden field for Netlify form detection */}
          <input type="hidden" name="form-name" value="contact" />

          <FormField
            name="name"
            placeholder="Nom"
            type="text"
            autoComplete="name"
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
          />

          <FormField
            name="phone"
            placeholder="Téléphone"
            type="tel"
            autoComplete="tel"
          />

          <FormField
            name="message"
            placeholder="Message"
            type="textarea"
            rows={4}
          />

          <input
            type="hidden"
            id="captchaResponse"
            name="g-recaptcha-response"
            value={token}
          />

          <GoogleReCaptcha
            onVerify={(token) => {
              setToken(token);
            }}
          />

          {/* RGPD compliance text */}
          <p className="text-sm text-gray-500">
            En soumettant ce formulaire, vous acceptez que vos données soient
            traitées pour vous contacter.
          </p>

          {/* Success message */}
          {success && (
            <div className="rounded-md bg-green-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
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
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
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

          <button
            type="submit"
            disabled={loading}
            className="inline-flex justify-center py-3 px-6 border border-transparent shadow-sm text-base font-medium rounded-md text-white bg-gold-500 hover:bg-gold-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gold-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Envoi en cours...' : 'Envoyer'}
          </button>
        </form>
      </div>
    </div>
  );
}
