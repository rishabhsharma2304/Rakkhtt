import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CalendarDays, Droplet, MapPin, Plus, Tent } from "lucide-react";
import { DataTable, type Column, type Field } from "@/components/DataTable";
import { EntityForm } from "@/components/EntityForm";
import { Card, PrimaryButton, SectionBanner, StatusBadge } from "@/components/ui";
import { fetchList } from "@/lib/api";
import { fmtDate } from "@/lib/format";

const BAG_TYPES = ["DB-SAGM-350", "DB-SAGM-450", "TB-SAGM-350", "TB-SAGM-450", "SB-350"];
const BAG_TYPE_OPTS = BAG_TYPES.map((t) => ({ value: t, label: t }));
const BAG_STATUS_OPTS = [
  { value: "collected", label: "Collected" },
  { value: "processed", label: "Processed" },
  { value: "discarded", label: "Discarded" },
];

function bagFields(): Field[] {
  return [
    { name: "donor_id", label: "Donor", type: "select", optionsPath: "/donors", optionLabel: "name", required: true, full: true },
    { name: "bag_no", label: "Bag No", required: true },
    { name: "bag_type", label: "Bag type", type: "select", options: BAG_TYPE_OPTS, required: true },
    { name: "gross_volume_ml", label: "Volume (ml)", type: "number" },
    { name: "segment_no", label: "Segment No" },
    { name: "collection_date", label: "Collection date", type: "date", required: true },
    { name: "status", label: "Status", type: "select", options: BAG_STATUS_OPTS },
  ];
}

// ---------------- Choose-a-Camp grid ----------------
function CampPicker({ onPick }: { onPick: (camp: any) => void }) {
  const { data } = useQuery({
    queryKey: ["bag-camps"],
    queryFn: () => fetchList("/camps", { page_size: 100, sort: "date", order: "desc" }),
  });
  const camps = data?.items ?? [];

  return (
    <Card className="p-6">
      <h3 className="mb-1 font-display text-[18px] font-bold text-ink">Choose a Camp</h3>
      <p className="mb-5 text-sm text-muted">Select the camp (or in-house session) you are entering bags for.</p>
      {camps.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">No camps available. Create one from the Camp screen first.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {camps.map((c: any) => (
            <button
              key={c.id}
              onClick={() => onPick(c)}
              className="group flex flex-col items-start gap-2 rounded-card2 border border-line-card bg-page p-4 text-left transition hover:border-accent hover:shadow-card"
            >
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-hovertint text-accent-deep">
                  <Tent size={17} />
                </div>
                <span className="font-bold text-ink group-hover:text-accent-deep">{c.name}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted">
                <CalendarDays size={13} /> {fmtDate(c.date)}
                {c.type === "inhouse" && <span className="ml-1 rounded bg-info-bg px-1.5 py-0.5 font-bold text-info">In-house</span>}
              </div>
              {c.location_text && (
                <div className="flex items-center gap-1.5 text-xs text-muted">
                  <MapPin size={13} /> {c.location_text}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}

// ---------------- Bags for a chosen camp ----------------
function CampBags({ camp, onBack }: { camp: any; onBack: () => void }) {
  const [adding, setAdding] = useState(false);

  const { data: donorData } = useQuery({
    queryKey: ["lookup", "/donors"],
    queryFn: () => fetchList("/donors", { page_size: 500 }),
  });
  const donorMap = useMemo(() => {
    const m: Record<string, any> = {};
    for (const d of donorData?.items ?? []) m[d.id] = d;
    return m;
  }, [donorData]);

  const columns: Column<any>[] = [
    { key: "bag_no", label: "Bag No", sortable: true, render: (r) => <span className="font-bold text-accent">{r.bag_no}</span> },
    {
      key: "donor_id",
      label: "Donor",
      render: (r) => {
        const d = donorMap[r.donor_id];
        return d ? <span className="font-semibold text-ink">{d.name} <span className="font-bold text-accent-deep">{d.blood_group ?? ""}</span></span> : "—";
      },
    },
    { key: "bag_type", label: "Bag Type", render: (r) => <span className="rounded-lg bg-info-bg px-2 py-1 text-[12px] font-bold text-info">{r.bag_type}</span> },
    { key: "collection_date", label: "Collected", sortable: true, render: (r) => fmtDate(r.collection_date) },
    { key: "gross_volume_ml", label: "Volume (ml)", align: "right" },
    { key: "segment_no", label: "Segment" },
    { key: "status", label: "Status", align: "center", render: (r) => <StatusBadge value={r.status} /> },
  ];

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="rounded-lg border border-line-chip p-2 text-muted hover:bg-hovertint" title="Choose another camp">
            <ArrowLeft size={16} />
          </button>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-hovertint text-accent-deep">
            <Tent size={20} />
          </div>
          <div>
            <div className="font-display text-lg font-bold text-ink">{camp.name}</div>
            <div className="flex items-center gap-2 text-xs text-muted">
              <CalendarDays size={13} /> {fmtDate(camp.date)}
              {camp.location_text && <><MapPin size={13} /> {camp.location_text}</>}
            </div>
          </div>
        </div>
        <PrimaryButton onClick={() => setAdding(true)}><Plus size={16} /> Add Bag</PrimaryButton>
      </Card>

      <div className="rounded-card2 border border-line-card bg-card p-5 shadow-card">
        <DataTable
          path="/bags"
          columns={columns}
          filters={{ camp_id: camp.id }}
          searchPlaceholder="Search bag no / type…"
          defaultSort="collection_date"
          emptyMessage="No bags entered for this camp yet."
        />
      </div>

      <EntityForm
        open={adding}
        onClose={() => setAdding(false)}
        title={`Add Bag · ${camp.name}`}
        path="/bags"
        fields={bagFields()}
        initial={{ camp_id: camp.id, collection_date: String(camp.date).slice(0, 10), status: "collected" }}
        invalidate={[["list", "/bags"]]}
        submitLabel="Add Bag"
      />
    </div>
  );
}

export function BagsPage() {
  const [camp, setCamp] = useState<any | null>(null);
  return (
    <div className="space-y-5">
      <SectionBanner icon={<Droplet size={22} />} title="Blood Bag Entry" subtitle="Choose a camp, then enter the bags collected from each donor" />
      {camp ? <CampBags camp={camp} onBack={() => setCamp(null)} /> : <CampPicker onPick={setCamp} />}
    </div>
  );
}
