import type { ChangeEventHandler, HTMLAttributes } from 'react';

type FormFieldProps = {
  name: string;
  placeholder: string;
  type?: 'text' | 'email' | 'tel' | 'textarea';
  rows?: number;
  autoComplete?: string;
  error?: string | undefined;
  inputMode?: HTMLAttributes<HTMLInputElement>['inputMode'] | undefined;
  onChange?:
    | ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement>
    | undefined;
  required?: boolean;
};

export default function FormField({
  name,
  placeholder,
  type = 'text',
  rows,
  autoComplete,
  error,
  inputMode,
  onChange,
  required = false,
}: FormFieldProps) {
  const baseClassName =
    'block w-full rounded-md border py-3 px-4 shadow-sm placeholder-gray-500 focus:border-gold-500 focus:ring-gold-500';
  const descriptionId = error ? `${name}-error` : undefined;
  const sharedProps = {
    'aria-describedby': descriptionId,
    'aria-invalid': Boolean(error),
    className: `${baseClassName} ${
      error ? 'border-red-300' : 'border-gray-300'
    }`,
    onChange,
    placeholder,
    required,
  };

  if (type === 'textarea') {
    return (
      <div>
        <label htmlFor={name} className="sr-only">
          {placeholder}
        </label>
        <textarea id={name} name={name} rows={rows ?? 4} {...sharedProps} />
        {error && (
          <p id={descriptionId} className="mt-2 text-sm text-red-600">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      <label htmlFor={name} className="sr-only">
        {placeholder}
      </label>
      <input
        type={type}
        name={name}
        id={name}
        autoComplete={autoComplete}
        inputMode={inputMode}
        {...sharedProps}
      />
      {error && (
        <p id={descriptionId} className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
