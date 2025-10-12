import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3';
import Contact from './Contact';
import { API_CONFIG } from '../../../lib/constants/api';

type ContactWrapperProps = {
  id?: string | undefined;
};

export default function ContactWrapper({ id }: ContactWrapperProps) {
  const recaptchaKey = API_CONFIG.recaptcha.siteKey;

  if (!recaptchaKey) {
    console.error('ReCAPTCHA key is missing from environment variables');
    return <Contact {...(id ? { id } : {})} />;
  }

  return (
    <GoogleReCaptchaProvider reCaptchaKey={recaptchaKey}>
      <Contact {...(id ? { id } : {})} />
    </GoogleReCaptchaProvider>
  );
}
