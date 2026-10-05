import { ArrowUpRightIcon } from '@phosphor-icons/react';
import { Button, type buttonVariants } from '../ui/button';
import type { VariantProps } from 'class-variance-authority';
import { pushDataLayerEvent } from '../../lib/analytics';

export const BOOKING_URL =
  'https://calendly.com/osteopathe-animalier/consultation-osteopathique';

export default function BookingLink({
  source,
  label = 'Rendez-vous en cabinet',
  testId,
  className,
  variant,
}: {
  source: string;
  label?: string;
  testId?: string;
  className?: string;
  variant?: VariantProps<typeof buttonVariants>['variant'];
}) {
  return (
    <Button asChild className={className} variant={variant}>
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
