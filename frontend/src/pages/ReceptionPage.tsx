import { useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, ChevronsUpDown, ClipboardCheck, Plus, RotateCcw } from "lucide-react";
import { api, fetchList } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { canWrite } from "@/lib/rbac";
import { fmtDate, BLOOD_GROUPS } from "@/lib/format";
import { ComponentChip, EmptyState, SectionBanner, StatusBadge } from "@/components/ui";
import { Card } from "@/components/ui";
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

export function ReceptionPage() {
  const { me } = useAuth();
  const qc = useQueryClient();
  const mayIssue = canWrite(me?.role, "reception");
  const [notice, setNotice] = useState("");
  const [addOpen, setAddOpen] = useState(false);
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

  const issue = useMutation({
    mutationFn: async (id: string) => (await api.post("/reception/issue", { request_id: id })).data,
    onSuccess: (d) => {
      setNotice(`Issued ${d.issued} unit(s) · invoice #${d.invoice_no} raised for ${d.request_id}.`);
      qc.invalidateQueries({ queryKey: ["reception"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: any) => setNotice(e?.response?.data?.detail ?? "Could not issue request."),
  });

  const returnToStock = useMutation({
    mutationFn: async (id: string) => (await api.post("/reception/return-to-stock", { request_id: id })).data,
    onSuccess: (d) => {
      setNotice(`Returned ${d.returned} unit(s) to stock for ${d.request_id}.`);
      qc.invalidateQueries({ queryKey: ["reception"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["accounting"] });
    },
    onError: (e: any) => setNotice(e?.response?.data?.detail ?? "Could not return stock."),
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
          mayIssue && (
            <button onClick={() => setAddOpen(true)} className="inline-flex items-center gap-1.5 rounded-btn bg-white px-4 py-2 text-sm font-bold text-accent-deep hover:brightness-95">
              <Plus size={15} /> New Request
            </button>
          )
        }
      />

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
                <th className="px-4 py-3 text-left">Component</th>
                <th className="px-4 py-3 text-center">Billing</th>
                <th className="px-4 py-3 text-center">Serology</th>
                {mayIssue && <th className="px-4 py-3 text-center">Action</th>}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={mayIssue ? 7 : 6}><EmptyState message="No requests match your filters." /></td></tr>
              ) : (
                rows.map((r: any) => {
                  const issued = (r.issued_component_ids ?? []).length > 0;
                  return (
                    <tr key={r.id} className="border-t border-line-table hover:bg-rowtint">
                      <td className="px-4 py-3 text-ink-3">{fmtDate(r.date)}</td>
                      <td className="px-4 py-3 font-bold text-accent">{r.request_id}</td>
                      <td className="px-4 py-3 font-bold text-ink">{r.patient_name}</td>
                      <td className="px-4 py-3"><ComponentChip type={r.component} /></td>
                      <td className="px-4 py-3 text-center"><StatusBadge value={r.billing_status} /></td>
                      <td className="px-4 py-3 text-center"><StatusBadge value={r.serology_status} /></td>
                      {mayIssue && (
                        <td className="px-4 py-3 text-center">
                          {issued ? (
                            <button
                              onClick={() => returnToStock.mutate(r.id)}
                              disabled={returnToStock.isPending}
                              className="inline-flex items-center gap-1 rounded-lg border border-line-chip px-3 py-1.5 text-xs font-bold text-ink-4 hover:bg-hovertint disabled:opacity-50"
                            >
                              <RotateCcw size={13} /> Return
                            </button>
                          ) : (
                            <button
                              onClick={() => issue.mutate(r.id)}
                              disabled={issue.isPending}
                              className="rounded-lg bg-accent px-3 py-1.5 text-xs font-bold text-white hover:brightness-110 disabled:opacity-50"
                            >
                              Issue
                            </button>
                          )}
                        </td>
                      )}
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
