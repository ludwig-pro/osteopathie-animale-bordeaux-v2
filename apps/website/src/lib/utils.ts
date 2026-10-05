import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isDomAvailable(): boolean {
  return (
    typeof window !== 'undefined' &&
    !!window.document &&
    !!window.document.createElement
  );
}
