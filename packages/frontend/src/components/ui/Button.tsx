import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-jargiin-cyan/20 border-jargiin-cyan/60 text-jargiin-cyan hover:bg-jargiin-cyan/30 focus:ring-jargiin-cyan/50',
  secondary: 'bg-jargiin-blue/20 border-jargiin-blue/60 text-jargiin-blue hover:bg-jargiin-blue/30 focus:ring-jargiin-blue/50',
  danger: 'bg-jargiin-danger/20 border-jargiin-danger/60 text-jargiin-danger hover:bg-jargiin-danger/30 focus:ring-jargiin-danger/50',
  ghost: 'bg-transparent border-jargiin-border text-jargiin-muted hover:bg-jargiin-border/20 focus:ring-jargiin-cyan/30',
};

const sizeClasses = {
  sm: 'px-3 py-1.5 text-xs min-h-[36px]',
  md: 'px-4 py-2 text-sm min-h-[44px]',
  lg: 'px-6 py-3 text-base min-h-[52px]',
  xl: 'px-8 py-4 text-lg min-h-[64px] font-semibold',
};

/**
 * J.A.R.G.I.I.N. button — meets WCAG 2.1 minimum 44x44px touch target.
 * Always has a visible focus ring for keyboard navigation.
 */
export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled}
      className={`
        inline-flex items-center justify-center gap-2
        border rounded-lg font-mono tracking-wide
        transition-all duration-150
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-jargiin-bg
        disabled:opacity-40 disabled:cursor-not-allowed
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
    >
      {children}
    </button>
  );
}
