import React, { forwardRef, useEffect, useRef, useState } from 'react';
import cn from 'classnames';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

/** Convert Arabic-Indic digits + comma/Arabic-comma to Latin digits + period */
function normalizeNumStr(raw: string): string {
  return raw
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[،,]/g, '.');
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, icon, iconPosition = 'right', type, onChange, onFocus, onBlur, value, ...props }, ref) => {
    const isNumber = type === 'number';

    // For number inputs we manage display separately so typing "5." doesn't
    // get eaten by the parent storing Number("5.") = 5.
    const [numDisplay, setNumDisplay] = useState<string>(
      isNumber && value !== undefined ? String(value ?? '') : ''
    );
    const isFocused = useRef(false);

    // Sync display when parent value changes externally (and user is not typing)
    useEffect(() => {
      if (!isNumber || isFocused.current) return;
      setNumDisplay(value !== undefined ? String(value ?? '') : '');
    }, [value, isNumber]);

    // For number inputs: use text+inputMode to avoid browser quirks
    const inputType = isNumber ? 'text' : type;
    const inputMode = isNumber ? 'decimal' : props.inputMode;

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      isFocused.current = true;
      if (isNumber) e.target.select();
      onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      isFocused.current = false;
      if (isNumber) {
        // Strip trailing period on blur, sync to parent value
        const cleaned = numDisplay.replace(/\.$/, '');
        setNumDisplay(cleaned !== '' ? cleaned : String(value ?? ''));
      }
      onBlur?.(e);
    };

    const handleChange = isNumber
      ? (e: React.ChangeEvent<HTMLInputElement>) => {
          const raw = e.target.value;
          // Normalize: Arabic-Indic digits → Latin, comma/Arabic-comma → period
          const normalized = normalizeNumStr(raw);
          // Allow valid number-in-progress: '', '-', '5', '5.', '5.25', '-3.1'
          if (normalized === '' || normalized === '-' || /^-?\d*\.?\d*$/.test(normalized)) {
            setNumDisplay(normalized);
            // Pass normalized value to parent
            e.target.value = normalized;
            onChange?.(e);
          }
        }
      : onChange;

    return (
      <div className="relative">
        {icon && iconPosition === 'right' && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          type={inputType}
          inputMode={inputMode}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onChange={handleChange}
          value={isNumber ? numDisplay : value}
          {...props}
          className={cn(
            'w-full rounded-xl bg-slate-900/60 border px-3 py-2.5 text-sm text-slate-100',
            'placeholder:text-slate-500',
            'focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50',
            'transition-all duration-200',
            error
              ? 'border-red-500/50 focus:ring-red-500/30 focus:border-red-500/50'
              : 'border-slate-700/70 hover:border-slate-600',
            icon && iconPosition === 'right' && 'pr-10',
            icon && iconPosition === 'left' && 'pl-10',
            className
          )}
        />
        {icon && iconPosition === 'left' && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
            {icon}
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

// Textarea Component
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        {...props}
        className={cn(
          'w-full rounded-xl bg-slate-900/60 border px-3 py-2.5 text-sm text-slate-100',
          'placeholder:text-slate-500 min-h-[100px] resize-y',
          'focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50',
          'transition-all duration-200',
          error 
            ? 'border-red-500/50 focus:ring-red-500/30 focus:border-red-500/50' 
            : 'border-slate-700/70 hover:border-slate-600',
          className
        )}
      />
    );
  }
);

Textarea.displayName = 'Textarea';

// Form Field Wrapper
interface FormFieldProps {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function FormField({ label, error, hint, required, children, className }: FormFieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label className="block text-xs font-medium text-slate-400">
          {label}
          {required && <span className="text-red-400 mr-0.5">*</span>}
        </label>
      )}
      {children}
      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}
      {hint && !error && (
        <p className="text-xs text-slate-500">{hint}</p>
      )}
    </div>
  );
}
