import Contact from './Contact';

type ContactWrapperProps = {
  id?: string | undefined;
};

export default function ContactWrapper({ id }: ContactWrapperProps) {
  return <Contact {...(id ? { id } : {})} />;
}
