import { useQuery } from "@tanstack/react-query";
import { MessageSquareHeart, Star } from "lucide-react";
import { api } from "@/lib/api";
import { DataTable, type Column } from "@/components/DataTable";
import { Card, SectionBanner } from "@/components/ui";
import { fmtDate } from "@/lib/format";

const SRC_LABEL: Record<string, string> = { donor: "Donors", recipient: "Recipients", camp_organiser: "Camp Organisers" };

function SummaryCards() {
  const { data } = useQuery({ queryKey: ["feedback-summary"], queryFn: async () => (await api.get("/reports/feedback-summary")).data });
  const cards = data?.cards ?? [];
  return (
    <div className="grid grid-cols-1 gap-[18px] md:grid-cols-3">
      {cards.map((c: any) => (
        <Card key={c.source} className="p-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-[17px] font-bold text-ink">{SRC_LABEL[c.source] ?? c.source}</h3>
            <span className="rounded-full bg-hovertint px-2.5 py-1 text-xs font-bold text-accent-deep">{c.count}</span>
          </div>
          {[
            ["Overall Experience", c.overall],
            ["Cleanliness", c.cleanliness],
            ["Staff Behaviour", c.staff_behaviour],
            ["Would Recommend", c.would_recommend],
          ].map(([label, v]) => (
            <div key={label as string} className="flex items-center justify-between border-b border-line-table py-1.5 text-sm">
              <span className="text-muted">{label}</span>
              <span className="font-bold text-ink">{v} / 5</span>
            </div>
          ))}
        </Card>
      ))}
    </div>
  );
}

function Stars({ n }: { n: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={13} className={i <= n ? "fill-comp-plc text-comp-plc" : "text-line-chip"} />
      ))}
    </span>
  );
}

const columns: Column<any>[] = [
  { key: "source", label: "Source", render: (r) => <span className="capitalize font-semibold text-ink">{(r.source || "").replace(/_/g, " ")}</span> },
  { key: "overall", label: "Overall", render: (r) => <Stars n={r.overall} /> },
  { key: "cleanliness", label: "Cleanliness", render: (r) => <Stars n={r.cleanliness} /> },
  { key: "staff_behaviour", label: "Staff", render: (r) => <Stars n={r.staff_behaviour} /> },
  { key: "would_recommend", label: "Recommend", render: (r) => <Stars n={r.would_recommend} /> },
  { key: "date", label: "Date", sortable: true, render: (r) => fmtDate(r.date) },
];

export function FeedbackPage() {
  return (
    <div className="space-y-5">
      <SectionBanner icon={<MessageSquareHeart size={22} />} title="Feedbacks" subtitle="Donor, recipient & camp organiser feedback" />
      <SummaryCards />
      <div className="rounded-card2 border border-line-card bg-card p-5 shadow-card">
        <DataTable path="/feedback" columns={columns} searchPlaceholder="Search source…" defaultSort="date" emptyMessage="No feedback yet." />
      </div>
    </div>
  );
}
