import type { ReactNode } from 'react';

interface PanelProps {
  children: ReactNode;
  title?: string;
  className?: string;
  role?: string;
  'aria-label'?: string;
}

/** Glassmorphism panel — the base building block of the J.A.R.G.I.I.N. HUD. */
export function Panel({ children, title, className = '', role, 'aria-label': ariaLabel }: PanelProps) {
  return (
    <section
      role={role ?? 'region'}
      aria-label={ariaLabel ?? title}
      className={`
        relative overflow-hidden
        bg-jargiin-panel/80 backdrop-blur-sm
        border border-jargiin-border/60
        rounded-xl shadow-lg shadow-black/40
        ${className}
      `}
    >
      {title && (
        <header className="px-4 py-2 border-b border-jargiin-border/40">
          <h2 className="text-xs font-mono font-semibold tracking-widest uppercase text-jargiin-cyan/80">
            {title}
          </h2>
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}
