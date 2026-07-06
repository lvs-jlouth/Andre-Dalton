interface StatusRingProps {
  size?: number;
  active?: boolean;
  pulsing?: boolean;
  color?: string;
  label?: string;
}

/** Decorative animated status ring for the HUD. */
export function StatusRing({
  size = 80,
  active = false,
  pulsing = false,
  color = 'stroke-aurora-cyan',
  label,
}: StatusRingProps) {
  const r = (size / 2) * 0.85;
  const circ = 2 * Math.PI * r;

  return (
    <div
      role="presentation"
      aria-hidden="true"
      className={`relative inline-flex items-center justify-center ${pulsing ? 'animate-pulse-slow' : ''}`}
      style={{ width: size, height: size }}
      title={label}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          className="stroke-aurora-border/30"
          strokeWidth={2}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r * 0.76}
          fill="none"
          className="stroke-aurora-cyan/15"
          strokeWidth={1}
          strokeDasharray={`${circ * 0.16} ${circ * 0.08}`}
          transform={`rotate(-70 ${size / 2} ${size / 2})`}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          className={`${color} transition-all duration-700`}
          strokeWidth={active ? 2.5 : 1}
          strokeDasharray={circ}
          strokeDashoffset={active ? 0 : circ * 0.6}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
    </div>
  );
}
