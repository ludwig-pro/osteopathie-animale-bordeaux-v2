import ContactInfo from './ContactInfo';
import ContactForm from './ContactForm';

type ContactProps = {
  id?: string;
};

export default function Contact({ id }: ContactProps) {
  return (
    <div id={id} className="relative bg-white">
      <div className="absolute inset-0">
        <div className="absolute inset-y-0 left-0 w-1/2 bg-gold-50"></div>
      </div>
      <div className="relative max-w-7xl mx-auto lg:grid lg:grid-cols-5">
        <ContactInfo />
        <ContactForm />
      </div>
    </div>
  );
}
