import type { ButtonHTMLAttributes, InputHTMLAttributes } from "react";

export function Button(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className = "", ...rest } = props;
  return (
    <button
      {...rest}
      className={`min-h-12 rounded-full border-2 border-edge bg-accent px-6 text-[16px] font-extrabold text-accent-ink disabled:opacity-60 ${className}`}
    />
  );
}

type FieldProps = InputHTMLAttributes<HTMLInputElement> & { label: string; name: string; hint?: string };

export function Field({ label, name, hint, ...rest }: FieldProps) {
  const id = `field-${name}`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[14px] font-bold">
        {label}
      </label>
      <input
        id={id}
        name={name}
        {...rest}
        className="min-h-12 rounded-2xl border-2 border-line bg-surface px-4 text-[16px] text-ink placeholder:text-ink-2"
      />
      {hint && <p className="text-[13px] text-ink-2">{hint}</p>}
    </div>
  );
}

export function FormMessage({ error }: { error?: string }) {
  if (!error) return null;
  return (
    <p role="alert" className="text-[14px] text-danger">
      {error}
    </p>
  );
}
