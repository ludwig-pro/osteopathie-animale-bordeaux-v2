type FormFieldProps = {
  name: string;
  placeholder: string;
  type?: 'text' | 'email' | 'tel' | 'textarea';
  rows?: number;
  autoComplete?: string;
  required?: boolean;
  error?: string | undefined;
  invalid?: boolean;
  ariaDescribedBy?: string | undefined;
};

export default function FormField({
  name,
  placeholder,
  type = 'text',
  rows,
  autoComplete,
  required = false,
  error,
  invalid = false,
  ariaDescribedBy,
}: FormFieldProps) {
  const baseClassName =
    'block w-full shadow-sm py-3 px-4 placeholder-gray-500 focus:ring-gold-500 focus:border-gold-500 border-gray-300 rounded-md';
  const errorId = error ? `${name}-error` : undefined;
  const describedBy =
    [errorId, ariaDescribedBy].filter(Boolean).join(' ') || undefined;
  const isInvalid = Boolean(error) || invalid;

  if (type === 'textarea') {
    return (
      <>
        <label htmlFor={name} className="sr-only">
          {placeholder}
        </label>
        <textarea
          id={name}
          name={name}
          rows={rows ?? 4}
          className={baseClassName}
          placeholder={placeholder}
          required={required}
          aria-invalid={isInvalid || undefined}
          aria-describedby={describedBy}
        />
        {error && (
          <p id={errorId} role="alert" className="mt-2 text-sm text-red-600">
            {error}
          </p>
        )}
      </>
    );
  }

  return (
    <>
      <label htmlFor={name} className="sr-only">
        {placeholder}
      </label>
      <input
        type={type}
        name={name}
        id={name}
        autoComplete={autoComplete}
        className={baseClassName}
        placeholder={placeholder}
        required={required}
        aria-invalid={isInvalid || undefined}
        aria-describedby={describedBy}
      />
      {error && (
        <p id={errorId} role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}
    </>
  );
}
