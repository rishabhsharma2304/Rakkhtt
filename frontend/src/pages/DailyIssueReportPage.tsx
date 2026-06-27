import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import { LoadingState, ErrorState } from "@/components/ui";
import { ReportSheet, ReportOrg } from "@/components/ReportSheet";

interface MatrixRow {
  name: string;
  groups: Record<string, number>;
  total: number;
}
interface DetailRow {
  request_date: string;
  request_id: string;
  patient_name: string;
  age: number | null;
  sex: string | null;
  blood_group: string | null;
  hospital: string;
  issued: string[];
  cross_match_by: string;
  issued_by: string;
  remarks: string;
}
interface DailyIssueReport {
  title: string;
  from: string;
  to: string;
  org: ReportOrg;
  columns: { key: string; label: string }[];
  matrix: { rows: MatrixRow[]; totals: Record<string, number>; grand_total: number };
  detail: DetailRow[];
}

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-US", { month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export function DailyIssueReportPage() {
  const [params] = useSearchParams();
  const from = params.get("from") || undefined;
  const to = params.get("to") || undefined;

  const { data, isLoading, error } = useQuery({
    queryKey: ["daily-issue-report", from, to],
    queryFn: async () =>
      (await api.get<DailyIssueReport>("/reports/mis/daily-issue-report", { params: { from, to } })).data,
  });

  if (isLoading) return <LoadingState message="Generating Daily Issue Report…" />;
  if (error || !data) return <ErrorState error={error} fallback="This report could not be generated." />;

  return (
    <ReportSheet org={data.org} title={data.title} from={data.from} to={data.to}>
      {/* blood-group matrix */}
      <div className="mt-7 overflow-x-auto">
        <table className="w-full border-collapse text-center text-[12px]">
          <thead>
            <tr className="font-bold text-ink">
              <th className="border border-line-table px-3 py-2 text-left">Name</th>
              {data.columns.map((c) => (
                <th key={c.key} className="border border-line-table px-2 py-2">{c.label}</th>
              ))}
              <th className="border border-line-table px-2 py-2">Total</th>
            </tr>
          </thead>
          <tbody>
            {data.matrix.rows.map((row) => (
              <tr key={row.name} className="text-ink-3">
                <td className="border border-line-table px-3 py-2 text-left font-semibold text-ink">{row.name}</td>
                {data.columns.map((c) => (
                  <td key={c.key} className="border border-line-table px-2 py-2">{row.groups[c.key] ?? 0}</td>
                ))}
                <td className="border border-line-table px-2 py-2 font-semibold text-ink">{row.total}</td>
              </tr>
            ))}
            <tr className="font-bold text-ink">
              <td className="border border-line-table px-3 py-2 text-left">Total</td>
              {data.columns.map((c) => (
                <td key={c.key} className="border border-line-table px-2 py-2">{data.matrix.totals[c.key] ?? 0}</td>
              ))}
              <td className="border border-line-table px-2 py-2">{data.matrix.grand_total}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* detail line-items */}
      <h3 className="mt-10 text-center font-display text-lg font-extrabold text-ink">{data.title}</h3>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-collapse text-left text-[12px]">
          <thead>
            <tr className="font-bold text-ink">
              <th className="border border-line-table px-2 py-2">S.No</th>
              <th className="border border-line-table px-2 py-2">Request Date &amp; Time</th>
              <th className="border border-line-table px-2 py-2">Request ID</th>
              <th className="border border-line-table px-2 py-2">Patient Name</th>
              <th className="border border-line-table px-2 py-2">Age</th>
              <th className="border border-line-table px-2 py-2">Sex</th>
              <th className="border border-line-table px-2 py-2">Blood Group</th>
              <th className="border border-line-table px-2 py-2">Hospital</th>
              <th className="border border-line-table px-2 py-2">Donor ID / Component Issued</th>
              <th className="border border-line-table px-2 py-2">Cross Match By</th>
              <th className="border border-line-table px-2 py-2">Issued By</th>
              <th className="border border-line-table px-2 py-2">Remarks</th>
            </tr>
          </thead>
          <tbody>
            {data.detail.length === 0 ? (
              <tr>
                <td colSpan={12} className="border border-line-table px-2 py-6 text-center text-muted">
                  No issues recorded in this period.
                </td>
              </tr>
            ) : (
              data.detail.map((r, i) => (
                <tr key={r.request_id + i} className="align-top text-ink-3">
                  <td className="border border-line-table px-2 py-2">{i + 1}</td>
                  <td className="border border-line-table px-2 py-2">{fmtDateTime(r.request_date)}</td>
                  <td className="border border-line-table px-2 py-2">{r.request_id}</td>
                  <td className="border border-line-table px-2 py-2">{r.patient_name}</td>
                  <td className="border border-line-table px-2 py-2">{r.age ?? "—"}</td>
                  <td className="border border-line-table px-2 py-2 capitalize">{r.sex || "—"}</td>
                  <td className="border border-line-table px-2 py-2">{r.blood_group || "—"}</td>
                  <td className="border border-line-table px-2 py-2">{r.hospital}</td>
                  <td className="border border-line-table px-2 py-2">{r.issued.join(", ")}</td>
                  <td className="border border-line-table px-2 py-2">{r.cross_match_by}</td>
                  <td className="border border-line-table px-2 py-2">{r.issued_by}</td>
                  <td className="border border-line-table px-2 py-2">{r.remarks}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </ReportSheet>
  );
}
