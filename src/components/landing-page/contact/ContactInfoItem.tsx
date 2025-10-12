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
    <a href={href} className="text-gray-500">
      <div className="mt-3">
        <dt className="sr-only">{srLabel}</dt>
        <dd className="flex">
          {icon}
          <span className="ml-3">{label}</span>
        </dd>
      </div>
    </a>
  );
}
