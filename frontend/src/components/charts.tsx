// Hand-built charts matching the design handoff (conic-gradient donuts, flex bars,
// SVG polylines) — faithful to the mock's exact visual treatment.

export interface Datum {
  label: string;
  value: number;
  color?: string;
}

// ---------- Donut (conic-gradient ring with center total) ----------
export function Donut({
  data,
  size = 140,
  hole = 24,
  centerValue,
  centerLabel,
}: {
  data: Datum[];
  size?: number;
  hole?: number;
  centerValue?: string | number;
  centerLabel?: string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const segments = data.filter((d) => d.value > 0);
  let acc = 0;
  const stops = segments
    .map((d) => {
      const start = (acc / total) * 360;
      acc += d.value;
      const end = (acc / total) * 360;
      return `${d.color} ${start}deg ${end}deg`;
    })
    .join(", ");
  const bg = total > 0 ? `conic-gradient(${stops})` : "#F3E5EA";
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div className="h-full w-full rounded-full" style={{ background: bg }} />
      <div
        className="absolute rounded-full bg-card"
        style={{ inset: hole }}
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="font-display text-2xl font-extrabold text-ink">{centerValue ?? total}</div>
        {centerLabel && <div className="text-[11px] font-bold tracking-wider text-muted">{centerLabel}</div>}
      </div>
    </div>
  );
}

export function Legend({ data }: { data: Datum[] }) {
  return (
    <div className="space-y-2">
      {data.map((d) => (
        <div key={d.label} className="flex items-center justify-between gap-4 text-sm">
          <span className="flex items-center gap-2 text-ink">
            <span className="h-3 w-3 rounded-sm" style={{ background: d.color }} />
            {d.label}
          </span>
          <span className="font-bold text-ink">{d.value}</span>
        </div>
      ))}
    </div>
  );
}

// ---------- Vertical bar chart ----------
export function BarChart({
  data,
  height = 180,
  gradientClass = "bg-bar-home",
  maxBarWidth = 40,
}: {
  data: Datum[];
  height?: number;
  gradientClass?: string;
  maxBarWidth?: number;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end justify-between gap-3" style={{ height }}>
      {data.map((d) => {
        const pct = d.value > 0 ? Math.max((d.value / max) * 100, 5) : 1.5;
        return (
          <div key={d.label} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
            <div className="font-display text-sm font-extrabold text-ink">{d.value}</div>
            {/* track fills remaining height; bar height is a % of the track */}
            <div className="flex w-full flex-1 items-end justify-center">
              <div
                className={`${gradientClass} w-full`}
                style={{ height: `${pct}%`, maxWidth: maxBarWidth, borderRadius: "8px 8px 4px 4px" }}
              />
            </div>
            <div className="text-[11px] font-semibold text-muted">{d.label}</div>
          </div>
        );
      })}
    </div>
  );
}

// ---------- Sparkline ----------
export function Sparkline({ series, stroke = "#DC2626", width = 120, height = 34 }: { series: number[]; stroke?: string; width?: number; height?: number }) {
  if (!series.length) return null;
  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = max - min || 1;
  const pts = series.map((v, i) => {
    const x = (i / (series.length - 1)) * width;
    const y = height - ((v - min) / span) * (height - 4) - 2;
    return [x, y];
  });
  const line = pts.map((p) => p.join(",")).join(" ");
  const area = `0,${height} ${line} ${width},${height}`;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} preserveAspectRatio="none">
      <polyline points={area} fill={stroke} opacity={0.12} stroke="none" />
      <polyline points={line} fill="none" stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ---------- Line chart (with nodes) ----------
export function LineChart({ series, labels, stroke = "#DC2626", width = 300, height = 150 }: { series: number[]; labels?: string[]; stroke?: string; width?: number; height?: number }) {
  const pad = 10;
  const min = Math.min(...series, 0);
  const max = Math.max(...series, 1);
  const span = max - min || 1;
  const pts = series.map((v, i) => {
    const x = pad + (i / (series.length - 1)) * (width - pad * 2);
    const y = height - pad - ((v - min) / span) * (height - pad * 2);
    return [x, y];
  });
  const line = pts.map((p) => p.join(",")).join(" ");
  const area = `${pad},${height - pad} ${line} ${width - pad},${height - pad}`;
  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height}>
        <polyline points={area} fill={stroke} opacity={0.08} stroke="none" />
        <polyline points={line} fill="none" stroke={stroke} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, i) => (
          <circle key={i} cx={p[0]} cy={p[1]} r={3.5} fill="#fff" stroke={stroke} strokeWidth={2} />
        ))}
      </svg>
      {labels && (
        <div className="flex justify-between px-2 text-[11px] font-semibold text-muted">
          {labels.map((l) => (
            <span key={l}>{l}</span>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- Progress ring ----------
export function ProgressRing({ pct, size = 78 }: { pct: number; size?: number }) {
  const deg = (pct / 100) * 360;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div
        className="h-full w-full rounded-full"
        style={{ background: `conic-gradient(var(--accent) ${deg}deg, #F3E5EA ${deg}deg)` }}
      />
      <div className="absolute rounded-full bg-card" style={{ inset: 9 }} />
      <div className="absolute inset-0 flex items-center justify-center font-display text-base font-extrabold text-ink">
        {pct}%
      </div>
    </div>
  );
}
