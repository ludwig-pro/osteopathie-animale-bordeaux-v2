import type { ComponentProps } from 'react';
import { cn } from '../../lib/utils';

export const fieldClassName =
  'w-full rounded-xl border border-input bg-background px-4 py-3.5 text-base text-foreground placeholder:text-muted-foreground outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/25 disabled:opacity-50 aria-invalid:border-destructive';

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return (
    <input
      data-slot="input"
      className={cn(fieldClassName, className)}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(fieldClassName, 'min-h-32 resize-y', className)}
      {...props}
    />
  );
}
