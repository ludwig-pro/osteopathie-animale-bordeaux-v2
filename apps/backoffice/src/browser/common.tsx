import type { ReactNode } from 'react';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  UserGroupIcon,
} from '@heroicons/react/20/solid';
import { Button } from './ui/button';
import { Subheading } from './ui/heading';
import { Text } from './ui/text';

export function Notice({
  children,
  success = false,
}: {
  children: ReactNode;
  success?: boolean;
}) {
  const Icon = success ? CheckCircleIcon : ExclamationCircleIcon;
  return (
    <div
      role={success ? 'status' : 'alert'}
      className={`flex items-start gap-2.5 rounded-lg px-3.5 py-3 text-sm/6 ${success ? 'bg-green-50 text-green-800' : 'bg-amber-50 text-amber-900'}`}
    >
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  onAction,
}: {
  title: string;
  description: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center px-5 py-16 text-center">
      <div className="mb-4 rounded-full bg-zinc-100 p-3">
        <UserGroupIcon className="size-6 text-zinc-500" aria-hidden="true" />
      </div>
      <Subheading>{title}</Subheading>
      <Text className="mt-2 max-w-md">{description}</Text>
      {action && (
        <Button outline className="mt-5" onClick={onAction}>
          {action}
        </Button>
      )}
    </div>
  );
}
