// Self-contained client-side download helpers (no external deps, CSP-safe).

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadText(filename: string, text: string, mime = "text/plain") {
  triggerDownload(new Blob([text], { type: `${mime};charset=utf-8` }), filename);
}

/** Rows = array of flat objects; columns inferred from the first row unless given. */
export function downloadCSV(filename: string, rows: Record<string, any>[], columns?: string[]) {
  const cols = columns ?? (rows[0] ? Object.keys(rows[0]) : []);
  const esc = (v: any) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))];
  downloadText(filename, lines.join("\n"), "text/csv");
}

export function downloadSVG(filename: string, svgMarkup: string) {
  const doc = svgMarkup.startsWith("<?xml") ? svgMarkup : `<?xml version="1.0" encoding="UTF-8"?>\n${svgMarkup}`;
  triggerDownload(new Blob([doc], { type: "image/svg+xml;charset=utf-8" }), filename);
}

export function downloadHTML(filename: string, html: string) {
  downloadText(filename, html, "text/html");
}
