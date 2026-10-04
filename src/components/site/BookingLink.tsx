import { ArrowUpRightIcon } from '@phosphor-icons/react';
import { Button } from '../ui/button';
import { pushDataLayerEvent } from '../../lib/analytics';

export const BOOKING_URL =
  'https://calendly.com/osteopathe-animalier/consultation-osteopathique';

export default function BookingLink({
  source,
  label = 'Prendre rendez-vous',
  testId,
  className,
}: {
  source: string;
  label?: string;
  testId?: string;
  className?: string;
}) {
  return (
    <Button asChild className={className}>
      <a
        href={BOOKING_URL}
        target="_blank"
        rel="noopener noreferrer"
        data-testid={testId}
        onClick={() =>
          pushDataLayerEvent('calendly_external_link_clicked', {
            destination: BOOKING_URL,
            source,
            target: '_blank',
          })
        }
      >
        {label}
        <ArrowUpRightIcon aria-hidden="true" />
      </a>
    </Button>
  );
}
