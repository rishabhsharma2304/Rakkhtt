import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, ThumbsUp } from "lucide-react";
import { api } from "@/lib/api";
import { DataTable, type Column } from "@/components/DataTable";
import { Card, SectionBanner } from "@/components/ui";
import { fmtDate } from "@/lib/format";

const SRC_LABEL: Record<string, string> = { donor: "Donors", recipient: "Recipients", camp_organiser: "Camp Organisers" };

const METRICS: [string, string][] = [
  ["Overall Experience", "overall"],
  ["Cleanliness", "cleanliness"],
  ["Staff Behaviour", "staff_behaviour"],
  ["Would Recommend Us To Family and Friends", "would_recommend"],
];

function SummaryCards() {
  const { data } = useQuery({ queryKey: ["feedback-summary"], queryFn: async () => (await api.get("/reports/feedback-summary")).data });
  const cards = data?.cards ?? ["donor", "recipient", "camp_organiser"].map((source) => ({ source, count: 0 }));
  return (
    <div className="grid grid-cols-1 gap-[18px] md:grid-cols-3">
      {cards.map((c: any) => (
        <Card key={c.source} className="p-7">
          <div className="text-center">
            <div className="font-display text-[72px] font-extrabold leading-none text-ink">{c.count ?? 0}</div>
            <h3 className="mt-3 font-display text-[22px] font-bold text-ink">{SRC_LABEL[c.source] ?? c.source}</h3>
          </div>
          <div className="mt-5">
            {METRICS.map(([label, key], i) => (
              <div
                key={key}
                className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-[13px] ${i % 2 === 0 ? "bg-fill" : ""}`}
              >
                <span className="pr-3 font-semibold text-info">{label}</span>
                <span className="whitespace-nowrap font-bold text-ink">{c[key] ?? 0}/5</span>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

const columns: Column<any>[] = [
  { key: "date", label: "Date", sortable: true, render: (r) => fmtDate(r.date) },
  { key: "name", label: "Name", render: (r) => r.name || "—" },
  {
    key: "source",
    label: "Type",
    render: (r) => <span className="font-semibold capitalize text-ink">{(r.source || "").replace(/_/g, " ")}</span>,
  },
  { key: "contact", label: "Number", render: (r) => r.contact || "—" },
  { key: "comment", label: "Suggestion", render: (r) => r.comment || "—" },
  { key: "action_taken", label: "Action Taken", render: (r) => r.action_taken || "—" },
];

function DateSearch({ onSearch }: { onSearch: (date: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSearch(value);
      }}
      className="flex items-center gap-2"
    >
      <input
        type="date"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search By Date…"
        className="rounded-xl border border-white/20 bg-white/95 px-3 py-2 text-sm text-ink outline-none focus:ring-2 focus:ring-white/40"
      />
      <button
        type="submit"
        className="grid h-[38px] w-[42px] place-items-center rounded-xl bg-info text-white transition hover:brightness-110"
        title="Search"
      >
        <Search size={16} />
      </button>
    </form>
  );
}

export function FeedbackPage() {
  const [dateFilter, setDateFilter] = useState("");
  return (
    <div className="space-y-5">
      <SectionBanner
        icon={<ThumbsUp size={22} />}
        title="Feedbacks"
        right={<DateSearch onSearch={setDateFilter} />}
      />
      <SummaryCards />
      <Card className="p-5">
        <h3 className="mb-4 font-display text-[17px] font-bold text-ink">Suggestions</h3>
        <DataTable
          path="/feedback"
          columns={columns}
          filters={{ date: dateFilter }}
          searchPlaceholder="Search…"
          defaultSort="date"
          emptyMessage="No data available in table."
        />
      </Card>
    </div>
  );
}
