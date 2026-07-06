import type { ReactNode } from 'react';

interface PanelProps {
  children: ReactNode;
  title?: string;
  className?: string;
  role?: string;
  'aria-label'?: string;
}

/** Glassmorphism panel — the base building block of the AURORA HUD. */
export function Panel({ children, title, className = '', role, 'aria-label': ariaLabel }: PanelProps) {
  return (
    <section
      role={role ?? 'region'}
      aria-label={ariaLabel ?? title}
      className={`
        aurora-panel relative overflow-hidden
        border border-aurora-border/60
        rounded-[1.4rem] backdrop-blur-xl
        ${className}
      `}
    >
      {title && (
        <header className="relative flex items-center justify-between gap-3 border-b border-aurora-border/40 px-4 py-3">
          <h2 className="text-[11px] font-mono font-semibold uppercase tracking-[0.34em] text-aurora-cyan/80">
            {title}
          </h2>
          <span className="h-px flex-1 bg-gradient-to-r from-aurora-cyan/40 to-transparent" aria-hidden="true" />
        </header>
      )}
      <div className="relative p-4">{children}</div>
    </section>
  );
}
