import { useQuery } from "@tanstack/react-query";
import { useParams, useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import { LoadingState, ErrorState } from "@/components/ui";
import { ReportSheet, ReportOrg } from "@/components/ReportSheet";
import { fmtINR } from "@/lib/format";

interface MisSummary {
  report: string;
  title: string;
  unit: string;
  from: string;
  to: string;
  value: number;
  note: string | null;
  org: ReportOrg;
}

const CURRENCY_UNITS = new Set(["INR"]);

export function MisSummaryReportPage() {
  const { key = "" } = useParams<{ key: string }>();
  const [params] = useSearchParams();
  const from = params.get("from") || undefined;
  const to = params.get("to") || undefined;
  const overrideTitle = params.get("title") || undefined;

  const { data, isLoading, error } = useQuery({
    queryKey: ["mis-summary", key, from, to],
    queryFn: async () => (await api.get<MisSummary>(`/reports/mis/${key}`, { params: { from, to } })).data,
  });

  if (isLoading) return <LoadingState message="Generating report…" />;
  if (error || !data) return <ErrorState error={error} fallback="This report could not be generated." />;

  const isCurrency = CURRENCY_UNITS.has(data.unit);
  const display = isCurrency ? fmtINR(data.value) : data.value.toLocaleString("en-IN");

  return (
    <ReportSheet org={data.org} title={overrideTitle || data.title} from={data.from} to={data.to} maxWidth="max-w-[820px]">
      <div className="mt-10 flex flex-col items-center">
        <p className="text-[13px] font-bold uppercase tracking-wide text-muted">{overrideTitle || data.title}</p>
        <p className="mt-3 font-display text-[64px] font-extrabold leading-none text-ink">{display}</p>
        {!isCurrency && data.unit && <p className="mt-2 text-sm capitalize text-muted">{data.unit}</p>}
        {data.note && (
          <p className="mt-6 max-w-md rounded-xl bg-fill px-5 py-3 text-center text-[13px] text-muted">{data.note}</p>
        )}
      </div>

      <div className="mt-10 overflow-x-auto">
        <table className="w-full border-collapse text-left text-[13px]">
          <tbody className="text-ink-3">
            <tr>
              <td className="w-1/3 border border-line-table bg-fill px-4 py-2.5 font-semibold text-ink">Report</td>
              <td className="border border-line-table px-4 py-2.5">{overrideTitle || data.title}</td>
            </tr>
            <tr>
              <td className="border border-line-table bg-fill px-4 py-2.5 font-semibold text-ink">Period</td>
              <td className="border border-line-table px-4 py-2.5">{data.from} to {data.to}</td>
            </tr>
            <tr>
              <td className="border border-line-table bg-fill px-4 py-2.5 font-semibold text-ink">Value</td>
              <td className="border border-line-table px-4 py-2.5 font-semibold text-ink">{display}{!isCurrency && data.unit ? ` ${data.unit}` : ""}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </ReportSheet>
  );
}
