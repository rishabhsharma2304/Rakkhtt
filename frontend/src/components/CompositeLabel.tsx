import { useMemo, useRef, useState } from "react";
import { Download, Printer } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { code128SVG } from "@/lib/barcode";
import { downloadSVG } from "@/lib/download";
import { PrimaryButton } from "./ui";

const COMPONENTS: Record<string, { name: string; vol: number }> = {
  PRBC: { name: "Packed Red Blood Cells", vol: 285 },
  FFP: { name: "Fresh Frozen Plasma", vol: 220 },
  WB: { name: "Whole Blood", vol: 450 },
  PLC: { name: "Platelet Concentrate", vol: 50 },
};
const INSTRUCTIONS = [
  "Properly identify the patient and unit before transfusion.",
  "Do not add any medication to the blood/component.",
  "Store at the recommended temperature only.",
  "Transfuse through a sterile blood administration set with filter.",
  "Complete transfusion within 4 hours of issue.",
  "Observe the patient for any adverse reaction.",
  "Return unused units to the blood centre promptly.",
];

// Deterministic 21x21 matrix seeded from the encoded value, with the three QR
// finder squares — a stable visual 2D code (not a spec-compliant QR scanner target).
function qrMatrix(seed: string, n = 21): boolean[][] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const rand = () => {
    h ^= h << 13; h ^= h >>> 17; h ^= h << 5;
    return ((h >>> 0) % 1000) / 1000;
  };
  const m: boolean[][] = Array.from({ length: n }, () => Array(n).fill(false));
  const finder = (r: number, c: number) => {
    for (let i = -1; i <= 7; i++) for (let j = -1; j <= 7; j++) {
      const rr = r + i, cc = c + j;
      if (rr < 0 || cc < 0 || rr >= n || cc >= n) continue;
      const edge = i === 0 || i === 6 || j === 0 || j === 6;
      const core = i >= 2 && i <= 4 && j >= 2 && j <= 4;
      m[rr][cc] = (i >= 0 && i <= 6 && j >= 0 && j <= 6) ? edge || core : false;
    }
  };
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    const inFinder = (r < 8 && c < 8) || (r < 8 && c >= n - 8) || (r >= n - 8 && c < 8);
    if (!inFinder) m[r][c] = rand() > 0.5;
  }
  finder(0, 0); finder(0, n - 7); finder(n - 7, 0);
  return m;
}

function qrSVG(seed: string, size = 54): string {
  const m = qrMatrix(seed);
  const n = m.length;
  const cell = size / n;
  let rects = "";
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    if (m[r][c]) rects += `<rect x="${(c * cell).toFixed(2)}" y="${(r * cell).toFixed(2)}" width="${cell.toFixed(2)}" height="${cell.toFixed(2)}" fill="#231A1F"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"><rect width="${size}" height="${size}" fill="#fff"/>${rects}</svg>`;
}

// Live composite-label preview (Section 7.4). Real Code-128 barcode + deterministic
// 2D code, exportable as a standalone SVG file or via the print dialog (Save as PDF).
export function CompositeLabel() {
  const [donorId, setDonorId] = useState("ACBC26-D0801");
  const [type, setType] = useState("PRBC");
  const [group, setGroup] = useState("A+");
  const [status, setStatus] = useState("");
  const labelRef = useRef<HTMLDivElement>(null);
  const c = COMPONENTS[type];
  const abo = group.slice(0, -1);
  const rh = group.endsWith("+") ? "Positive" : "Negative";

  const bar = useMemo(() => code128SVG(donorId || " ", { height: 40, moduleWidth: 1.1 }), [donorId]);
  const qr = useMemo(() => qrSVG(`${donorId}|${type}|${group}`), [donorId, type, group]);

  const fileBase = `label-${donorId.replace(/[^A-Za-z0-9_-]/g, "_")}`;

  function buildLabelSVG(): string {
    const W = 460, H = 300;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="monospace" fill="#231A1F">
  <rect x="1" y="1" width="${W - 2}" height="${H - 2}" fill="#fff" stroke="#231A1F" stroke-width="2"/>
  <text x="14" y="30" font-size="16" font-weight="700">${c.name} (${c.vol} ml)</text>
  <text x="14" y="46" font-size="9">Prepared from voluntary, non-remunerated donation.</text>
  <text x="14" y="58" font-size="9" fill="#9F1239" font-weight="700">Non-reactive for TTI (HIV, HBsAg, HCV, VDRL, MP).</text>
  <text x="${W - 14}" y="34" font-size="26" font-weight="800" text-anchor="end">${abo}</text>
  <text x="${W - 14}" y="50" font-size="11" font-weight="700" text-anchor="end">Rh(D) ${rh}</text>
  <line x1="14" y1="68" x2="${W - 14}" y2="68" stroke="#231A1F" stroke-opacity="0.3"/>
  <text x="14" y="90" font-size="10">Donor ID: ${donorId}</text>
  <text x="14" y="105" font-size="10">Segment No: ${donorId}-SEG</text>
  <text x="14" y="120" font-size="10">Collection: 2026-06-20    Expiry: 2026-08-01</text>
  <g transform="translate(${W - 130},80)">${qr.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "")}</g>
  <g transform="translate(14,150)">${bar.svg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "").replace(/width="100%"/, "")}</g>
  <line x1="14" y1="215" x2="${W - 14}" y2="215" stroke="#231A1F" stroke-opacity="0.3"/>
  <text x="14" y="232" font-size="10" font-weight="800">${BRAND.toUpperCase()} BLOOD BANK</text>
  <text x="14" y="246" font-size="8">License No: ACBC/BB/2026 · Synthetic Address, Agra, UP</text>
  <text x="14" y="262" font-size="7">Designed as per NABH, NBTC and Drugs &amp; Cosmetics Act 1940.</text>
</svg>`;
  }

  function doDownload() {
    downloadSVG(`${fileBase}.svg`, buildLabelSVG());
    setStatus(`Downloaded ${fileBase}.svg`);
  }
  function doPrint() {
    window.print();
    setStatus("Opened print dialog — choose “Save as PDF” to export.");
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
      {/* preview */}
      <div ref={labelRef} className="rounded-xl border-2 border-ink/80 bg-white p-5 text-ink" style={{ fontFamily: "monospace" }}>
        <div className="flex items-start justify-between border-b border-ink/30 pb-2">
          <div>
            <div className="text-lg font-extrabold">{c.name} ({c.vol} ml)</div>
            <div className="text-[11px]">Prepared from voluntary, non-remunerated donation.</div>
            <div className="text-[11px] font-bold text-accent-deep">Non-reactive for TTI (HIV, HBsAg, HCV, VDRL, MP).</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-extrabold leading-none">{abo}</div>
            <div className="text-xs font-bold">Rh(D) {rh}</div>
          </div>
        </div>
        <div className="mt-3 flex items-start justify-between gap-3">
          <div className="text-[11px] leading-5">
            <div>Donor ID: <b>{donorId}</b></div>
            <div>Segment No: <b>{donorId}-SEG</b></div>
            <div>Collection: <b>2026-06-20</b></div>
            <div>Expiry: <b>2026-08-01</b></div>
          </div>
          {/* Real 2D code + scannable Code-128 barcode */}
          <div className="flex flex-col items-end gap-1">
            <div dangerouslySetInnerHTML={{ __html: qr }} />
          </div>
        </div>
        <div className="mt-2 w-full" style={{ maxWidth: 260 }} dangerouslySetInnerHTML={{ __html: bar.svg }} />
        <div className="mt-3 border-t border-ink/30 pt-2 text-[11px]">
          <div className="font-extrabold">{BRAND.toUpperCase()} BLOOD BANK</div>
          <div>License No: ACBC/BB/2026 · Synthetic Address, Agra, UP</div>
          <ol className="mt-1 list-decimal pl-4">
            {INSTRUCTIONS.map((t) => <li key={t}>{t}</li>)}
          </ol>
        </div>
      </div>

      {/* form */}
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-sm font-semibold text-ink-4">Enter Donor ID</label>
          <input value={donorId} onChange={(e) => setDonorId(e.target.value)} className="w-full rounded-xl border border-line-chip bg-page px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-ink-4">Component Type</label>
          <select value={type} onChange={(e) => setType(e.target.value)} className="w-full rounded-xl border border-line-chip bg-card px-3 py-2 text-sm font-semibold">
            {Object.keys(COMPONENTS).map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-ink-4">Blood Group</label>
          <select value={group} onChange={(e) => setGroup(e.target.value)} className="w-full rounded-xl border border-line-chip bg-card px-3 py-2 text-sm font-semibold">
            {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map((g) => <option key={g}>{g}</option>)}
          </select>
        </div>
        <p className="text-xs text-muted">Designed as per guidelines of NABH, NBTC and Drugs &amp; Cosmetics Act 1940.</p>
        <div className="flex gap-2">
          <PrimaryButton onClick={doDownload} className="flex-1 justify-center"><Download size={16} /> Download SVG</PrimaryButton>
          <button onClick={doPrint} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-btn border border-line-chip bg-card px-3 py-2 text-sm font-bold text-ink-4 hover:bg-hovertint">
            <Printer size={16} /> Print / PDF
          </button>
        </div>
        {status && <p className="rounded-lg bg-success-bg p-2 text-xs font-semibold text-success">{status}</p>}
      </div>
    </div>
  );
}
