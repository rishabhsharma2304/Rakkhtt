import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PhoneCall } from "lucide-react";
import { api } from "@/lib/api";
import { BLOOD_GROUPS, fmtDate } from "@/lib/format";
import { Card, EmptyState, SectionBanner, StatusPill } from "@/components/ui";

const INTENT: Record<string, { tone: any; label: string }> = {
  high: { tone: "danger", label: "High" },
  normal: { tone: "warn", label: "Normal" },
  low: { tone: "good", label: "Low" },
};

export function DonorRecallPage() {
  const [intent, setIntent] = useState("");
  const [group, setGroup] = useState("");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["recall", intent, group, search],
    queryFn: async () => (await api.get("/donor/recall", { params: { intent: intent || undefined, blood_group: group || undefined, search: search || undefined } })).data,
  });
  const items: any[] = data?.items ?? [];

  return (
    <div className="space-y-5">
      <SectionBanner icon={<PhoneCall size={22} />} title="Donor Recall" subtitle="Donors due for recall by recency · NABH / NBTC compliance" />
      <Card className="p-5">
        {/* per-column filters */}
        <div className="mb-4 flex flex-wrap gap-3">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name / contact…" className="rounded-lg border border-line-chip bg-page px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent/30" />
          <select value={intent} onChange={(e) => setIntent(e.target.value)} className="rounded-lg border border-line-chip bg-card px-3 py-2 text-sm font-semibold text-ink-4">
            <option value="">All intents</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </select>
          <select value={group} onChange={(e) => setGroup(e.target.value)} className="rounded-lg border border-line-chip bg-card px-3 py-2 text-sm font-semibold text-ink-4">
            <option value="">All groups</option>
            {BLOOD_GROUPS.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto rounded-xl border border-line-table">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-fill text-[12px] font-bold uppercase text-muted">
                <th className="px-4 py-2.5 text-left">Donor</th>
                <th className="px-4 py-2.5 text-left">Group</th>
                <th className="px-4 py-2.5 text-left">Contact</th>
                <th className="px-4 py-2.5 text-left">Last Donation</th>
                <th className="px-4 py-2.5 text-right">Days Since</th>
                <th className="px-4 py-2.5 text-center">Recall Intent</th>
                <th className="px-4 py-2.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="py-10 text-center text-muted">Loading…</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={7}><EmptyState message="No donors match your filters." /></td></tr>
              ) : (
                items.slice(0, 100).map((d) => {
                  const it = INTENT[d.recall_intent] ?? INTENT.low;
                  return (
                    <tr key={d.id} className="border-t border-line-table hover:bg-rowtint">
                      <td className="px-4 py-2.5 font-bold text-ink">{d.name}</td>
                      <td className="px-4 py-2.5 font-bold text-accent-deep">{d.blood_group}</td>
                      <td className="px-4 py-2.5 text-ink-3">{d.contact}</td>
                      <td className="px-4 py-2.5 text-ink-3">{fmtDate(d.last_donation_date)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{d.days_since_last ?? "—"}</td>
                      <td className="px-4 py-2.5 text-center"><StatusPill tone={it.tone}>{it.label}</StatusPill></td>
                      <td className="px-4 py-2.5 text-center">
                        <button
                          title="WhatsApp recall"
                          onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`Dear ${d.name}, you are due for blood donation. Please visit our centre.`)}`, "_blank")}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#25D366] text-white hover:brightness-110"
                        >
                          <PhoneCall size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
