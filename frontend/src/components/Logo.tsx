// Rakkhtt droplet + EKG-pulse mark (the design's own logo, rebuilt as inline SVG).
export function Logo({ size = 30 }: { size?: number }) {
  const h = (size / 30) * 34;
  return (
    <svg width={size} height={h} viewBox="0 0 30 34" fill="none" aria-label="Rakkhtt logo">
      <defs>
        <linearGradient id="rakDrop" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#E11D48" />
          <stop offset="1" stopColor="#9F1239" />
        </linearGradient>
      </defs>
      <path
        d="M15 1.5C15 1.5 26.5 14 26.5 22.8A11.5 11.5 0 0 1 3.5 22.8C3.5 14 15 1.5 15 1.5Z"
        fill="url(#rakDrop)"
      />
      <polyline
        points="7.5,22 11,22 13,17.5 16,26.5 18,22 22.5,22"
        fill="none"
        stroke="#fff"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
