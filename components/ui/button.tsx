import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "default" | "sm";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--brand)] text-white shadow-[var(--shadow-brand)] hover:bg-[var(--brand-dark)] hover:shadow-[0_6px_20px_-4px_rgb(99_102_241_/_0.45)] hover:-translate-y-px active:translate-y-0 focus-visible:ring-[var(--brand)]",
  secondary:
    "border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] shadow-[var(--shadow-sm)] hover:border-[rgb(99_102_241_/_0.25)] hover:bg-[var(--brand-light)] focus-visible:ring-[var(--brand)]",
  ghost:
    "text-[var(--muted)] hover:bg-[var(--brand-light)] hover:text-[var(--brand-dark)] focus-visible:ring-[var(--brand)]",
};

const sizeClasses: Record<ButtonSize, string> = {
  default: "h-9 px-4 text-sm",
  sm: "h-8 px-3 text-xs",
};

export function Button({
  variant = "primary",
  size = "default",
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center rounded-[var(--radius)] font-medium transition-[background-color,box-shadow,border-color,color,transform] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
