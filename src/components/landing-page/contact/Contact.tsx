import ContactInfo from './ContactInfo';
import ContactForm from './ContactForm';

export default function Contact({ id = 'contact' }: { id?: string }) {
  return (
    <section id={id} className="contact-section">
      <div className="site-container contact-grid">
        <ContactInfo />
        <ContactForm />
      </div>
    </section>
  );
}
