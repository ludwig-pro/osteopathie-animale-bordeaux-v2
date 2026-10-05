import type { ComponentProps } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { XIcon } from '@phosphor-icons/react';
import { cn } from '../../lib/utils';

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;
export const SheetTitle = DialogPrimitive.Title;
export const SheetDescription = DialogPrimitive.Description;

export function SheetContent({
  className,
  children,
  ...props
}: ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-forest-deep/35 backdrop-blur-sm" />
      <DialogPrimitive.Content
        className={cn(
          'fixed inset-y-0 right-0 z-50 w-[min(90vw,380px)] overflow-y-auto bg-background px-7 py-10 shadow-xl',
          className
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute top-5 right-5 rounded-full p-3 text-primary hover:bg-secondary focus-visible:outline-2">
          <XIcon className="size-5" />
          <span className="sr-only">Fermer le menu</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
