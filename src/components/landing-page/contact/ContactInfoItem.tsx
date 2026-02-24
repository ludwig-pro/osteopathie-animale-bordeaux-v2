import type { ReactNode } from 'react';
import { pushDataLayerEvent } from '../../../lib/analytics';

type ContactInfoItemProps = {
  icon: ReactNode;
  href: string;
  label: string;
  srLabel: string;
};

export default function ContactInfoItem({
  icon,
  href,
  label,
  srLabel,
}: ContactInfoItemProps) {
  const handleClick = () => {
    if (href.startsWith('tel:')) {
      pushDataLayerEvent('contact_phone_clicked', {
        source: 'contact_info',
      });
      return;
    }

    if (href.startsWith('mailto:')) {
      pushDataLayerEvent('contact_email_clicked', {
        source: 'contact_info',
      });
    }
  };

  return (
    <div className="mt-3">
      <dt className="sr-only">{srLabel}</dt>
      <dd className="flex">
        <a href={href} onClick={handleClick} className="flex text-gray-500">
          {icon}
          <span className="ml-3">{label}</span>
        </a>
      </dd>
    </div>
  );
}
