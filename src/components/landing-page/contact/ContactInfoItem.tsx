import type { ReactNode } from 'react';

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
  return (
    <div className="mt-3">
      <dt className="sr-only">{srLabel}</dt>
      <dd className="flex">
        <a href={href} className="flex text-gray-500">
          {icon}
          <span className="ml-3">{label}</span>
        </a>
      </dd>
    </div>
  );
}
