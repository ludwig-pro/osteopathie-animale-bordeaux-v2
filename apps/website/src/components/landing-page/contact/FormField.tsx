import { Input, Textarea } from '../../ui/input';

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
  const errorId = error ? `${name}-error` : undefined;
  const describedBy =
    [errorId, ariaDescribedBy].filter(Boolean).join(' ') || undefined;
  const shared = {
    id: name,
    name,
    placeholder,
    required,
    'aria-invalid': Boolean(error) || invalid || undefined,
    'aria-describedby': describedBy,
  };
  return (
    <div className="form-field">
      <label htmlFor={name}>
        {placeholder}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      {type === 'textarea' ? (
        <Textarea {...shared} rows={rows ?? 4} />
      ) : (
        <Input {...shared} type={type} autoComplete={autoComplete} />
      )}
      {error && (
        <p id={errorId} role="alert" className="mt-2 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
