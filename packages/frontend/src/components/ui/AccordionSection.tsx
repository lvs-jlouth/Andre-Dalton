import type { ReactNode } from 'react';

interface AccordionSectionProps {
  id: string;
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function AccordionSection({
  id,
  title,
  subtitle,
  defaultOpen = false,
  children,
}: AccordionSectionProps) {
  return (
    <details
      id={id}
      open={defaultOpen}
      className="group rounded-lg border border-aurora-border/40 bg-aurora-bg/30"
    >
      <summary
        className="
          list-none cursor-pointer select-none
          px-3 py-2 min-h-[44px]
          flex items-center justify-between gap-3
          focus:outline-none focus:ring-2 focus:ring-aurora-cyan/50 rounded-lg
        "
      >
        <div className="min-w-0">
          <p className="text-xs font-mono font-semibold tracking-widest uppercase text-aurora-muted">
            {title}
          </p>
          {subtitle && <p className="text-xs text-aurora-muted/90 mt-0.5">{subtitle}</p>}
        </div>
        <span
          aria-hidden="true"
          className="text-aurora-cyan transition-transform duration-150 group-open:rotate-180"
        >
          ▾
        </span>
      </summary>
      <div className="px-3 pb-3">{children}</div>
    </details>
  );
}
