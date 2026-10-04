import type { ComponentProps } from 'react';
import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { PlusIcon } from '@phosphor-icons/react';
import { cn } from '../../lib/utils';

export const Accordion = AccordionPrimitive.Root;

export function AccordionItem({
  className,
  ...props
}: ComponentProps<typeof AccordionPrimitive.Item>) {
  return (
    <AccordionPrimitive.Item
      className={cn('border-b border-border', className)}
      {...props}
    />
  );
}

export function AccordionTrigger({
  className,
  children,
  ...props
}: ComponentProps<typeof AccordionPrimitive.Trigger>) {
  return (
    <AccordionPrimitive.Header>
      <AccordionPrimitive.Trigger
        className={cn(
          'group flex w-full items-center justify-between gap-5 py-6 text-left text-lg font-medium text-primary outline-none hover:text-forest-deep focus-visible:ring-2 focus-visible:ring-ring',
          className
        )}
        {...props}
      >
        {children}
        <PlusIcon
          aria-hidden="true"
          className="size-5 shrink-0 transition-transform group-data-[state=open]:rotate-45"
        />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

export function AccordionContent({
  className,
  children,
  ...props
}: ComponentProps<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content
      className="consultation-answer overflow-hidden"
      {...props}
    >
      <div
        className={cn(
          'pb-6 text-lg leading-relaxed text-muted-foreground',
          className
        )}
      >
        {children}
      </div>
    </AccordionPrimitive.Content>
  );
}
