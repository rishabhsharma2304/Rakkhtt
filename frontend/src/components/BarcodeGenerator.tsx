import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Barcode, Check, ChevronDown, Download, Info, Printer } from "lucide-react";
import { api } from "@/lib/api";
import { code128SVG } from "@/lib/barcode";
import { downloadSVG } from "@/lib/download";
import { Modal, PrimaryButton } from "./ui";

// ---- Tab + option model (mirrors the production Barcode Generator) ----
type TabKey = "blood_bag" | "request" | "deferred_donor";

interface Option {
  label: string;
  code: string; // short prefix embedded in the encoded value
}

const PRIMARY_BAGS: Option[] = [
  { label: "DB-SAGM-350", code: "DB350" },
  { label: "DB-SAGM-450", code: "DB450" },
  { label: "TB-SAGM-350", code: "TB350" },
  { label: "TB-SAGM-450", code: "TB450" },
];
const OTHER_BAGS: Option[] = [
  { label: "QUADRA-350F", code: "QD350F" },
  { label: "QUADRA-450F", code: "QD450F" },
  { label: "QUADRA-350N", code: "QD350N" },
  { label: "QUADRA-450N", code: "QD450N" },
  { label: "SDP-CLOSED", code: "SDPC" },
  { label: "LEUKAPHERESIS", code: "LEUK" },
  { label: "SB-100", code: "SB100" },
  { label: "SB-350", code: "SB350" },
  { label: "SB-450", code: "SB450" },
  { label: "DB-350", code: "DB350P" },
  { label: "DB-450", code: "DB450P" },
  { label: "TB-350", code: "TB350P" },
  { label: "TB-450", code: "TB450P" },
];
const REQUESTS: Option[] = [
  { label: "Blood Request", code: "REQ" },
  { label: "Bulk / Loan Request", code: "BLK" },
  { label: "Fractionation", code: "FRC" },
];
const DEFERRED: Option[] = [{ label: "Deferred Donor", code: "DEF" }];

const TABS: { key: TabKey; label: string }[] = [
  { key: "blood_bag", label: "Blood Bags" },
  { key: "request", label: "Requests" },
  { key: "deferred_donor", label: "Deferred Donor" },
];

// Tab each option belongs to — used by the Info catalog to switch + select.
const OPTION_TAB = new Map<string, TabKey>([
  ...PRIMARY_BAGS.map((o) => [o.code, "blood_bag"] as [string, TabKey]),
  ...OTHER_BAGS.map((o) => [o.code, "blood_bag"] as [string, TabKey]),
  ...REQUESTS.map((o) => [o.code, "request"] as [string, TabKey]),
  ...DEFERRED.map((o) => [o.code, "deferred_donor"] as [string, TabKey]),
]);

// Full catalog shown in the "Barcode Information" modal, in display order.
const CATALOG: Option[] = [...PRIMARY_BAGS, ...OTHER_BAGS, ...REQUESTS, ...DEFERRED];

interface BarcodeItem {
  value: string;
  svg: string;
}

export function BarcodeGenerator() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<TabKey>("blood_bag");
  const [selected, setSelected] = useState<Option>(PRIMARY_BAGS[0]);
  const [otherOpen, setOtherOpen] = useState(false);
  const [prepend, setPrepend] = useState("");
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");
  const [copies, setCopies] = useState("1");
  const [items, setItems] = useState<BarcodeItem[]>([]);
  const [error, setError] = useState("");
  const [infoOpen, setInfoOpen] = useState(false);

  // Options shown as chips for the current tab.
  const tabOptions = tab === "blood_bag" ? PRIMARY_BAGS : tab === "request" ? REQUESTS : DEFERRED;

  function pickTab(key: TabKey) {
    setTab(key);
    setItems([]);
    setError("");
    setOtherOpen(false);
    setSelected(key === "blood_bag" ? PRIMARY_BAGS[0] : key === "request" ? REQUESTS[0] : DEFERRED[0]);
  }

  // Select any option from the Info catalog: switch to its tab + select it.
  function pickFromCatalog(o: Option) {
    const t = OPTION_TAB.get(o.code) ?? "blood_bag";
    setTab(t);
    setSelected(o);
    setOtherOpen(false);
    setInfoOpen(false);
  }

  // Persist a history row so it appears in the batches table below.
  const record = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post("/barcode-batches", body).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["list", "/barcode-batches"] }),
  });

  function generate() {
    setError("");
    const start = parseInt(rangeStart, 10);
    const end = parseInt(rangeEnd, 10);
    const reps = Math.max(1, parseInt(copies, 10) || 1);
    if (Number.isNaN(start) || Number.isNaN(end)) {
      setError("Enter a numeric Starting and Ending Range.");
      return;
    }
    if (end < start) {
      setError("Ending Range must be greater than or equal to Starting Range.");
      return;
    }
    if (end - start + 1 > 500) {
      setError("Range is too large — limit a single batch to 500 codes.");
      return;
    }
    if ((end - start + 1) * reps > 1000) {
      setError("Too many labels — range × copies must not exceed 1000.");
      return;
    }
    const pad = String(end).length;
    const out: BarcodeItem[] = [];
    for (let n = start; n <= end; n++) {
      const value = `${prepend}${selected.code}${String(n).padStart(pad, "0")}`;
      const { svg } = code128SVG(value, { height: 48, moduleWidth: 1.3 });
      for (let c = 0; c < reps; c++) out.push({ value, svg });
    }
    setItems(out);
    record.mutate({
      batch_type: tab,
      bag_type: selected.label,
      prepend_text: prepend || null,
      range_start: start,
      range_end: end,
      copies: reps,
    });
  }

  // A4-ish printable sheet of all generated barcodes.
  function sheetSVG(): string {
    const cols = 3;
    const cellW = 220;
    const cellH = 90;
    const rows = Math.ceil(items.length / cols);
    const W = cols * cellW;
    const H = rows * cellH;
    const cells = items
      .map((it, i) => {
        const x = (i % cols) * cellW;
        const y = Math.floor(i / cols) * cellH;
        const inner = it.svg
          .replace(/^<svg[^>]*>/, "")
          .replace(/<\/svg>$/, "")
          .replace(/width="100%"/, "");
        return `<g transform="translate(${x + 10},${y + 8})">${inner}</g>`;
      })
      .join("");
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#fff"/>${cells}</svg>`;
  }

  function doDownload() {
    if (!items.length) return;
    downloadSVG(`barcodes-${selected.code}-${rangeStart}-${rangeEnd}.svg`, sheetSVG());
  }

  const total = items.length;
  const unique = useMemo(() => new Set(items.map((i) => i.value)).size, [items]);

  return (
    <div className="space-y-5">
      {/* Info action */}
      <div className="flex justify-end">
        <button
          onClick={() => setInfoOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-btn bg-accent px-4 py-2 text-sm font-bold text-white shadow-primary hover:brightness-110"
        >
          <Info size={16} /> Info
        </button>
      </div>

      {/* Barcode Information modal */}
      <Modal open={infoOpen} onClose={() => setInfoOpen(false)} title="Barcode Information" width="max-w-md">
        <p className="mb-3 text-xs text-muted">Select a barcode type to use it in the generator.</p>
        <div className="max-h-[60vh] overflow-y-auto rounded-xl border border-line-chip">
          {CATALOG.map((o) => {
            const on = selected.code === o.code;
            return (
              <button
                key={o.code}
                onClick={() => pickFromCatalog(o)}
                className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-sm font-semibold transition ${
                  on ? "bg-accent text-white" : "text-ink-4 hover:bg-hovertint"
                }`}
              >
                <span>{o.label}</span>
                {on && <Check size={16} />}
              </button>
            );
          })}
        </div>
      </Modal>

      {/* Tab switcher */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => pickTab(t.key)}
            className={`rounded-full px-5 py-2.5 text-sm font-bold transition ${
              tab === t.key ? "bg-accent text-white shadow-card" : "text-ink-4 hover:bg-hovertint"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Option chips */}
      <div className="flex flex-wrap items-center gap-3">
        {tabOptions.map((o) => {
          const on = selected.code === o.code;
          return (
            <button
              key={o.code}
              onClick={() => setSelected(o)}
              className={`rounded-full border px-5 py-2 text-sm font-bold transition ${
                on ? "border-accent bg-accent/10 text-accent" : "border-line-chip text-ink-4 hover:border-accent/60"
              }`}
            >
              {o.label}
            </button>
          );
        })}

        {tab === "blood_bag" && (
          <div className="relative">
            <button
              onClick={() => setOtherOpen((v) => !v)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-5 py-2 text-sm font-bold transition ${
                OTHER_BAGS.some((o) => o.code === selected.code)
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-line-chip text-ink-4 hover:border-accent/60"
              }`}
            >
              {OTHER_BAGS.find((o) => o.code === selected.code)?.label ?? "Other Bags"}
              <ChevronDown size={15} />
            </button>
            {otherOpen && (
              <div className="absolute z-10 mt-1 w-52 overflow-hidden rounded-xl border border-line-card bg-card py-1 shadow-card">
                {OTHER_BAGS.map((o) => (
                  <button
                    key={o.code}
                    onClick={() => {
                      setSelected(o);
                      setOtherOpen(false);
                    }}
                    className="block w-full px-4 py-2 text-left text-sm font-semibold text-ink-4 hover:bg-hovertint"
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Prepend text */}
      <div>
        <label className="mb-1 block text-sm font-semibold text-ink-4">Prepend Text</label>
        <input
          value={prepend}
          onChange={(e) => setPrepend(e.target.value)}
          placeholder="Optional prefix, e.g. ACBC26-"
          className="w-full rounded-xl border border-line-chip bg-page px-3 py-2 text-sm"
        />
      </div>

      {/* Range + copies */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto_1fr_auto]">
        <div>
          <label className="mb-1 block text-sm font-semibold text-ink-4">Starting Range</label>
          <input
            value={rangeStart}
            onChange={(e) => setRangeStart(e.target.value)}
            inputMode="numeric"
            className="w-full rounded-xl border border-line-chip bg-page px-3 py-2 text-sm"
          />
        </div>
        <div className="hidden items-end pb-2 font-display text-lg font-bold text-ink-4 sm:flex">To</div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-ink-4">Ending Range</label>
          <input
            value={rangeEnd}
            onChange={(e) => setRangeEnd(e.target.value)}
            inputMode="numeric"
            className="w-full rounded-xl border border-line-chip bg-page px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-ink-4">Copies</label>
          <input
            value={copies}
            onChange={(e) => setCopies(e.target.value)}
            inputMode="numeric"
            className="w-24 rounded-xl border border-line-chip bg-page px-3 py-2 text-sm"
          />
        </div>
      </div>

      {error && <p className="rounded-xl border border-accent/30 bg-accent/10 p-3 text-xs font-semibold text-accent">{error}</p>}

      <div className="flex justify-center">
        <PrimaryButton onClick={generate} className="px-8">
          <Barcode size={18} /> Generate Barcodes
        </PrimaryButton>
      </div>

      {/* Results */}
      {items.length > 0 && (
        <div className="space-y-3 border-t border-line-table pt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-ink-4">
              {total} barcode{total === 1 ? "" : "s"} ({unique} unique × {Math.max(1, parseInt(copies, 10) || 1)} cop
              {Math.max(1, parseInt(copies, 10) || 1) === 1 ? "y" : "ies"})
            </p>
            <div className="flex gap-2">
              <PrimaryButton onClick={doDownload}>
                <Download size={16} /> Download SVG
              </PrimaryButton>
              <button
                onClick={() => window.print()}
                className="inline-flex items-center justify-center gap-1.5 rounded-btn border border-line-chip bg-card px-3 py-2 text-sm font-bold text-ink-4 hover:bg-hovertint"
              >
                <Printer size={16} /> Print
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((it, i) => (
              <div key={i} className="rounded-xl border border-line-chip bg-white p-3">
                <div dangerouslySetInnerHTML={{ __html: it.svg }} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
