import { useId, type ComponentProps, type ReactNode } from 'react';
import { CircleAlert } from 'lucide-react';
import { cn } from '@/lib/cn';

const controlBase = cn(
  'w-full rounded-control border border-border-strong bg-surface px-3.5 text-[0.9375rem] text-ink',
  'placeholder:text-ink-subtle transition-shadow',
  'focus:outline-none focus:ring-2 focus:ring-focus/40 focus:border-focus',
  'aria-[invalid=true]:border-danger aria-[invalid=true]:ring-danger/25',
  'disabled:opacity-60',
);

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn(controlBase, 'h-11', className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<'select'>) {
  return <select className={cn(controlBase, 'h-11 pr-8', className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea className={cn(controlBase, 'min-h-24 py-2.5 leading-relaxed', className)} {...props} />;
}

interface FieldProps {
  label: ReactNode;
  error?: string;
  hint?: ReactNode;
  optional?: boolean;
  className?: string;
  /** Render-prop receives the ids to wire label/description to the control. */
  children: (ids: { id: string; describedBy: string | undefined; invalid: boolean }) => ReactNode;
}

/** Label + control + hint + error, with correct aria wiring. */
export function Field({ label, error, hint, optional, className, children }: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(' ') || undefined;
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={id} className="flex items-baseline justify-between text-sm font-medium text-ink">
        <span>{label}</span>
        {optional && <span className="text-xs font-normal text-ink-subtle">Optional</span>}
      </label>
      {children({ id, describedBy, invalid: Boolean(error) })}
      {hint && !error && (
        <p id={hintId} className="text-xs text-ink-muted">
          {hint}
        </p>
      )}
      <FieldError id={errorId} message={error} />
    </div>
  );
}

export function FieldError({ id, message }: { id?: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="flex items-center gap-1.5 text-xs font-medium text-danger">
      <CircleAlert className="size-3.5 shrink-0" aria-hidden />
      {message}
    </p>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className="flex items-start gap-2 rounded-xl bg-danger-soft px-3.5 py-3 text-sm text-danger">
      <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{message}</span>
    </div>
  );
}

export function Checkbox({
  label,
  description,
  className,
  ...props
}: ComponentProps<'input'> & { label: ReactNode; description?: ReactNode }) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-control border border-border bg-surface p-3.5',
        'has-[:checked]:border-accent has-[:checked]:bg-accent-soft has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-focus/40',
        className,
      )}
    >
      <input id={id} type="checkbox" className="mt-0.5 size-5 shrink-0 accent-[var(--color-accent)]" {...props} />
      <span>
        <span className="block text-sm font-medium text-ink">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-ink-muted">{description}</span>}
      </span>
    </label>
  );
}

export interface ChoiceOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

interface ChoiceGroupProps<T extends string> {
  legend: ReactNode;
  options: readonly ChoiceOption<T>[];
  error?: string;
  hint?: ReactNode;
  optional?: boolean;
  className?: string;
  columns?: 2 | 3;
}

type SingleChoiceProps<T extends string> = ChoiceGroupProps<T> & {
  multiple?: false;
  value: T | null;
  onChange: (value: T | null) => void;
  /** Allow clicking the selected option again to clear it. */
  allowDeselect?: boolean;
};

type MultiChoiceProps<T extends string> = ChoiceGroupProps<T> & {
  multiple: true;
  value: T[];
  onChange: (value: T[]) => void;
};

/**
 * Accessible chip-style radio / checkbox group. Selection is shown with a
 * check mark and border — never by colour alone.
 */
export function ChoiceGroup<T extends string>(props: SingleChoiceProps<T> | MultiChoiceProps<T>) {
  const { legend, options, error, hint, optional, className, columns = 2 } = props;
  const name = useId();
  const errorId = `${name}-error`;
  const isSelected = (v: T) => (props.multiple ? props.value.includes(v) : props.value === v);

  function toggle(v: T) {
    if (props.multiple) {
      props.onChange(props.value.includes(v) ? props.value.filter((x) => x !== v) : [...props.value, v]);
    } else if (props.value === v && props.allowDeselect) {
      props.onChange(null);
    } else {
      props.onChange(v);
    }
  }

  return (
    <fieldset className={cn('space-y-2', className)} aria-describedby={error ? errorId : undefined}>
      <legend className="flex w-full items-baseline justify-between text-sm font-medium text-ink">
        <span>{legend}</span>
        {optional && <span className="text-xs font-normal text-ink-subtle">Optional</span>}
      </legend>
      {hint && <p className="text-xs text-ink-muted">{hint}</p>}
      <div className={cn('grid gap-2', columns === 3 ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2')}>
        {options.map((option) => {
          const selected = isSelected(option.value);
          return (
            <label
              key={option.value}
              className={cn(
                'relative flex min-h-11 cursor-pointer items-center gap-2 rounded-control border px-3 py-2 text-sm',
                'transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-focus/40',
                selected
                  ? 'border-accent bg-accent-soft font-medium text-accent-ink'
                  : 'border-border bg-surface text-ink hover:border-border-strong',
              )}
            >
              <input
                type={props.multiple ? 'checkbox' : 'radio'}
                name={name}
                value={option.value}
                checked={selected}
                onChange={() => toggle(option.value)}
                onClick={() => {
                  // Radios don't fire change when re-clicked; support deselect.
                  if (!props.multiple && selected && props.allowDeselect) props.onChange(null);
                }}
                className="sr-only"
              />
              {option.icon && (
                <span aria-hidden className="text-base leading-none">
                  {option.icon}
                </span>
              )}
              <span className="flex-1">{option.label}</span>
              {selected && (
                <svg aria-hidden viewBox="0 0 16 16" className="size-4 shrink-0 fill-none stroke-current stroke-2">
                  <path d="M3.5 8.5l3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </label>
          );
        })}
      </div>
      <FieldError id={errorId} message={error} />
    </fieldset>
  );
}
