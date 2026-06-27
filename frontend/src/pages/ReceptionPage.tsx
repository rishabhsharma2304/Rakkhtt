import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, ChevronsUpDown, ClipboardCheck, Database, History, Plus } from "lucide-react";
import { api, fetchList } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { canWrite } from "@/lib/rbac";
import { fmtDate, BLOOD_GROUPS } from "@/lib/format";
import { ComponentChip, EmptyState, ExportButtons, Modal, SectionBanner, StatusBadge } from "@/components/ui";
import { Card } from "@/components/ui";
import { downloadCSV } from "@/lib/download";
import { EntityForm } from "@/components/EntityForm";
import type { Field } from "@/components/DataTable";

const COMPONENTS = ["PRBC", "FFP", "WB", "PLC", "SDP", "CRYO"];
const REQUEST_FIELDS: Field[] = [
  { name: "patient_name", label: "Patient Name", required: true, full: true },
  { name: "date", label: "Request Date", type: "date", required: true },
  { name: "request_type", label: "Request Type", type: "select", default: "blood", options: [
    { value: "blood", label: "Issue" }, { value: "bulk", label: "Bulk Request" },
    { value: "fractionation", label: "Fractionation" }, { value: "inward", label: "Inward Stock" },
  ] },
  { name: "blood_group", label: "Blood Group", type: "select", options: BLOOD_GROUPS.map((g) => ({ value: g, label: g })) },
  { name: "component", label: "Component", type: "select", options: COMPONENTS.map((c) => ({ value: c, label: c })) },
  { name: "qty", label: "Quantity", type: "number" },
];

const TABS = [
  { key: "blood", label: "Issue" },
  { key: "bulk", label: "Bulk Request" },
  { key: "fractionation", label: "Fractionation" },
  { key: "inward", label: "Inward Stock" },
];

// Serology workflow stages → the label shown on the pending-only action button.
const SEROLOGY_LABELS: Record<string, string> = {
  grouping: "Blood Grouping",
  crossmatch: "Crossmatch",
  issue: "Issue",
};

export function ReceptionPage() {
  const { me } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const mayIssue = canWrite(me?.role, "reception");
  const [notice, setNotice] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [invOpen, setInvOpen] = useState(false);
  const [histOpen, setHistOpen] = useState(false);
  const [tab, setTab] = useState("blood");
  const [search, setSearch] = useState("");
  const [pendingOnly, setPendingOnly] = useState(false);
  const [sortCol, setSortCol] = useState<"date" | "patient_name">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const { data } = useQuery({
    queryKey: ["reception", tab, search, sortCol, sortDir, page],
    queryFn: () =>
      fetchList("/blood-requests", {
        request_type: tab,
        search,
        sort: sortCol,
        order: sortDir,
        page,
        page_size: pageSize,
      }),
    placeholderData: keepPreviousData,
  });

  let rows = data?.items ?? [];
  if (pendingOnly)
    rows = rows.filter((r: any) => r.billing_status === "pending" || r.serology_status === "pending");
  const total = data?.total ?? 0;

  // Advance a request one step through serology (grouping → crossmatch → issue).
  // The final "issue" step allocates units, raises the invoice and completes the request.
  const advanceSerology = useMutation({
    mutationFn: async (id: string) => (await api.post("/reception/serology/advance", { request_id: id })).data,
    onSuccess: (d) => {
      if (d.serology_stage === "done")
        setNotice(`Issued ${d.issued} unit(s) · invoice #${d.invoice_no} raised for ${d.request_id}.`);
      else
        setNotice(`${SEROLOGY_LABELS[d.serology_stage] ?? d.serology_stage} pending for ${d.request_id}.`);
      qc.invalidateQueries({ queryKey: ["reception"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: any) => setNotice(e?.response?.data?.detail ?? "Could not update serology."),
  });

  function sort(col: "date" | "patient_name") {
    if (sortCol === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortCol(col);
      setSortDir(col === "date" ? "desc" : "asc");
    }
  }
  const arrow = (col: string) =>
    sortCol !== col ? <ChevronsUpDown size={13} className="opacity-40" /> : sortDir === "asc" ? <ChevronUp size={13} /> : <ChevronDown size={13} />;

  return (
    <div className="space-y-5">
      <SectionBanner
        icon={<ClipboardCheck size={22} />}
        title="Reception"
        subtitle="Blood issue requests, billing & serology status"
        right={
          <div className="flex items-center gap-2">
            {mayIssue && (
              <button onClick={() => setAddOpen(true)} className="inline-flex items-center gap-1.5 rounded-btn bg-white px-4 py-2 text-sm font-bold text-accent-deep hover:brightness-95">
                <Plus size={15} /> New Request
              </button>
            )}
            <button onClick={() => setInvOpen(true)} className="inline-flex items-center gap-1.5 rounded-btn border border-white/40 bg-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/20">
              <Database size={15} /> Blood Inventory
            </button>
            <button onClick={() => setHistOpen(true)} aria-label="History" title="History" className="inline-flex items-center justify-center rounded-btn border border-white/40 bg-white/10 p-2 text-white hover:bg-white/20">
              <History size={17} />
            </button>
          </div>
        }
      />

      <InventoryModal open={invOpen} onClose={() => setInvOpen(false)} />
      <HistoryModal open={histOpen} onClose={() => setHistOpen(false)} />

      <EntityForm
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="New Blood Request"
        path="/reception/request"
        fields={REQUEST_FIELDS}
        submitLabel="Create Request"
        invalidate={[["reception"]]}
        onSuccess={(r) => setNotice(`Request ${r.request_id} created.`)}
      />

      {notice && (
        <Card className="border-success/30 p-3 text-sm font-semibold text-success">{notice}</Card>
      )}

      <Card className="overflow-hidden">
        {/* tabs */}
        <div className="flex border-b border-line-table px-4">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => {
                setTab(t.key);
                setPage(1);
              }}
              className={`relative px-4 py-3 text-sm font-bold transition ${
                tab === t.key ? "text-accent" : "text-muted hover:text-ink-4"
              }`}
            >
              {t.label}
              {tab === t.key && <span className="absolute inset-x-3 bottom-0 h-[3px] rounded-t bg-accent" />}
            </button>
          ))}
        </div>

        {/* toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4">
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search patient or request ID…"
            className="w-72 rounded-xl border border-line-chip bg-page px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent/30"
          />
          <label className="flex cursor-pointer items-center gap-2.5 text-sm font-semibold text-ink-4">
            Show Pending Only
            <span
              onClick={() => setPendingOnly((p) => !p)}
              className={`relative h-[26px] w-[45px] rounded-full transition ${pendingOnly ? "bg-accent" : "bg-[#D8CCD1]"}`}
            >
              <span className={`absolute top-[3.5px] h-[19px] w-[19px] rounded-full bg-white transition-all ${pendingOnly ? "left-[23px]" : "left-[3px]"}`} />
            </span>
          </label>
        </div>

        {/* table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-fill text-[12.5px] font-bold uppercase tracking-wide text-muted">
                <th onClick={() => sort("date")} className="cursor-pointer px-4 py-3 text-left"><span className="inline-flex items-center gap-1">Date {arrow("date")}</span></th>
                <th className="px-4 py-3 text-left">Request ID</th>
                <th onClick={() => sort("patient_name")} className="cursor-pointer px-4 py-3 text-left"><span className="inline-flex items-center gap-1">Patient {arrow("patient_name")}</span></th>
                <th className="px-4 py-3 text-center">Billing</th>
                <th className="px-4 py-3 text-center">Serology</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={5}><EmptyState message="No requests match your filters." /></td></tr>
              ) : (
                rows.map((r: any) => {
                  const serologyPending = r.serology_status !== "completed";
                  const stage = SEROLOGY_LABELS[r.serology_stage] ? r.serology_stage : "grouping";
                  return (
                    <tr
                      key={r.id}
                      onClick={() => navigate(`/reception/blood-request/invoice/${r.id}`)}
                      className="cursor-pointer border-t border-line-table hover:bg-rowtint"
                    >
                      <td className="px-4 py-3 text-ink-3">{fmtDate(r.date)}</td>
                      <td className="px-4 py-3 font-bold text-accent">{r.request_id}</td>
                      <td className="px-4 py-3 font-bold text-ink">{r.patient_name}</td>
                      <td className="px-4 py-3 text-center"><StatusBadge value={r.billing_status} /></td>
                      <td className="px-4 py-3 text-center">
                        {pendingOnly && serologyPending && mayIssue ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              advanceSerology.mutate(r.id);
                            }}
                            disabled={advanceSerology.isPending}
                            className="min-w-[104px] rounded-full bg-amber-400 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:brightness-105 disabled:opacity-50"
                          >
                            {SEROLOGY_LABELS[stage]}
                          </button>
                        ) : (
                          <StatusBadge value={r.serology_status} />
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* footer */}
        <div className="flex items-center justify-between gap-3 p-4 text-sm text-muted">
          <span>Showing {rows.length} of {total} requests</span>
          <div className="flex items-center gap-1">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-line-chip px-3 py-1.5 font-semibold disabled:opacity-40 hover:bg-hovertint">Previous</button>
            <span className="rounded-lg bg-accent px-3 py-1.5 font-bold text-white">{page}</span>
            <button disabled={page * pageSize >= total} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-line-chip px-3 py-1.5 font-semibold disabled:opacity-40 hover:bg-hovertint">Next</button>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ---------- shared helpers ----------
function printTable(title: string, headers: string[], rows: (string | number | null | undefined)[][]) {
  const head = headers.map((h) => `<th>${h}</th>`).join("");
  const body = rows
    .map((r) => `<tr>${r.map((c) => `<td>${c ?? "—"}</td>`).join("")}</tr>`)
    .join("");
  const w = window.open("", "_blank", "width=900,height=700");
  if (!w) return;
  w.document.write(`<!doctype html><title>${title}</title>
    <style>body{font-family:system-ui,sans-serif;padding:24px;color:#1f2937}
    h2{margin:0 0 16px}table{border-collapse:collapse;width:100%;font-size:13px}
    th,td{border:1px solid #e5e7eb;padding:8px 10px;text-align:left}
    th{background:#f3f4f6}</style>
    <h2>${title}</h2><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`);
  w.document.close();
  w.focus();
  w.print();
}

const PageBar = ({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage: (p: number) => void }) => (
  <div className="flex items-center justify-between gap-3 pt-4 text-sm text-muted">
    <span>
      Showing {total === 0 ? 0 : (page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} entries
    </span>
    <div className="flex items-center gap-1">
      <button disabled={page <= 1} onClick={() => onPage(page - 1)} className="rounded-lg border border-line-chip px-3 py-1.5 font-semibold disabled:opacity-40 hover:bg-hovertint">Previous</button>
      <span className="rounded-lg bg-accent px-3 py-1.5 font-bold text-white">{page}</span>
      <button disabled={page * pageSize >= total} onClick={() => onPage(page + 1)} className="rounded-lg border border-line-chip px-3 py-1.5 font-semibold disabled:opacity-40 hover:bg-hovertint">Next</button>
    </div>
  </div>
);

// ---------- Blood Inventory modal ----------
const INV_TABS = [
  { key: "available", label: "Available" },
  { key: "allotted", label: "Allotted" },
  { key: "issued", label: "Issued" },
];

function InventoryModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [bucket, setBucket] = useState("available");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const { data } = useQuery({
    queryKey: ["reception-inventory", bucket, search, page],
    queryFn: async () =>
      (await api.get("/reception/inventory", { params: { bucket, search, page, page_size: pageSize } })).data,
    enabled: open,
    placeholderData: keepPreviousData,
  });
  const rows = data?.items ?? [];
  const counts = data?.counts ?? {};
  const total = data?.total ?? 0;

  const exportRows = () =>
    rows.map((r: any) => ({
      "Donor ID": r.unit_id, "Component Type": r.component_type,
      "Blood Group": r.blood_group, "Expiry Date": fmtDate(r.expiry_date, "dd/MM/yyyy"),
    }));

  return (
    <Modal open={open} onClose={onClose} title={<span className="inline-flex items-center gap-2"><Database size={18} /> Blood Inventory</span>} width="max-w-3xl">
      <div className="flex flex-wrap items-center gap-2 border-b border-line-table pb-3">
        {INV_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => { setBucket(t.key); setPage(1); }}
            className={`rounded-full px-4 py-2 text-sm font-bold transition ${
              bucket === t.key ? "bg-accent text-white" : "bg-fill text-ink-4 hover:bg-hovertint"
            }`}
          >
            {t.label} <span className={`ml-1 rounded-full px-1.5 text-xs ${bucket === t.key ? "bg-white/25" : "bg-danger/15 text-danger"}`}>{counts[t.key] ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 py-3">
        <ExportButtons
          onExcel={() => downloadCSV(`inventory-${bucket}.csv`, exportRows())}
          onPrint={() => printTable(`Blood Inventory — ${bucket}`, ["Donor ID", "Component Type", "Blood Group", "Expiry Date"], rows.map((r: any) => [r.unit_id, r.component_type, r.blood_group, fmtDate(r.expiry_date, "dd/MM/yyyy")]))}
        />
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search…"
          className="w-56 rounded-xl border border-line-chip bg-page px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent/30"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-fill text-[12.5px] font-bold uppercase tracking-wide text-muted">
              <th className="px-4 py-3 text-left">Donor ID</th>
              <th className="px-4 py-3 text-left">Component Type</th>
              <th className="px-4 py-3 text-left">Blood Group</th>
              <th className="px-4 py-3 text-left">Expiry Date</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={4}><EmptyState message="No units in this bucket." /></td></tr>
            ) : (
              rows.map((r: any) => (
                <tr key={r.id} className="border-t border-line-table hover:bg-rowtint">
                  <td className="px-4 py-3 font-bold text-accent">{r.unit_id}</td>
                  <td className="px-4 py-3"><ComponentChip type={r.component_type} /></td>
                  <td className="px-4 py-3 font-semibold text-ink">{r.blood_group}</td>
                  <td className="px-4 py-3 text-ink-3">{fmtDate(r.expiry_date, "dd/MM/yyyy")}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <PageBar page={page} pageSize={pageSize} total={total} onPage={setPage} />
    </Modal>
  );
}

// ---------- History modal ----------
function HistoryModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const { data } = useQuery({
    queryKey: ["reception-activity", search, page],
    queryFn: async () =>
      (await api.get("/reception/activity", { params: { search, page, page_size: pageSize } })).data,
    enabled: open,
    placeholderData: keepPreviousData,
  });
  const rows = data?.items ?? [];
  const total = data?.total ?? 0;
  const fmtTs = (t: string) => fmtDate(t, "dd MMM yyyy hh:mm a");

  return (
    <Modal open={open} onClose={onClose} title={<span className="inline-flex items-center gap-2"><History size={18} /> History</span>} width="max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
        <ExportButtons
          onExcel={() => downloadCSV("reception-history.csv", rows.map((r: any) => ({ User: r.user, Action: r.action, "Created At": fmtTs(r.created_at) })))}
          onPrint={() => printTable("Reception History", ["User", "Action", "Created At"], rows.map((r: any) => [r.user, r.action, fmtTs(r.created_at)]))}
        />
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search…"
          className="w-56 rounded-xl border border-line-chip bg-page px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent/30"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-fill text-[12.5px] font-bold uppercase tracking-wide text-muted">
              <th className="px-4 py-3 text-left">User</th>
              <th className="px-4 py-3 text-left">Action</th>
              <th className="px-4 py-3 text-left">Created At</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={3}><EmptyState message="No history yet." /></td></tr>
            ) : (
              rows.map((r: any) => (
                <tr key={r.id} className="border-t border-line-table hover:bg-rowtint">
                  <td className="px-4 py-3 font-semibold text-ink">{r.user ?? "—"}</td>
                  <td className="px-4 py-3 text-accent">{r.action}</td>
                  <td className="px-4 py-3 text-ink-3">{fmtTs(r.created_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <PageBar page={page} pageSize={pageSize} total={total} onPage={setPage} />
    </Modal>
  );
}
