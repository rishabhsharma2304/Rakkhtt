import { useState } from "react";
import { differenceInDays } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Boxes } from "lucide-react";
import { DataTable, type Column, type Field } from "@/components/DataTable";
import { Card, EmptyState, SectionBanner, StatCard, StatusPill } from "@/components/ui";
import { fetchList } from "@/lib/api";
import { fmtDate } from "@/lib/format";

const ITEM_TYPES = [
  { value: "blood_bag", label: "Blood Bag" },
  { value: "reagent", label: "Reagent" },
  { value: "consumable", label: "Consumable" },
];

function daysLeft(date?: string): number | null {
  if (!date) return null;
  return differenceInDays(new Date(date), new Date());
}
function expiringSoon(date?: string) {
  const d = daysLeft(date);
  return d !== null && d >= 0 && d <= 30;
}

const expiryCell = (r: any) => {
  const d = daysLeft(r.expiry_date);
  const expired = d !== null && d < 0;
  return (
    <span className="flex items-center gap-2">
      {fmtDate(r.expiry_date)}
      {expired && <StatusPill tone="danger">Expired</StatusPill>}
      {expiringSoon(r.expiry_date) && <StatusPill tone="danger">Expiring Soon!</StatusPill>}
    </span>
  );
};

const columns: Column<any>[] = [
  { key: "name", label: "Item", sortable: true, render: (r) => <span className="font-bold text-ink">{r.name}</span> },
  { key: "item_type", label: "Type", render: (r) => <span className="capitalize">{(r.item_type || "").replace(/_/g, " ")}</span> },
  { key: "supplier", label: "Supplier" },
  { key: "quantity", label: "Qty", align: "right", sortable: true },
  { key: "expiry_date", label: "Expiry", sortable: true, render: expiryCell },
];

const fields: Field[] = [
  { name: "name", label: "Item Name", required: true, full: true },
  { name: "item_type", label: "Type", type: "select", options: ITEM_TYPES, required: true },
  { name: "supplier", label: "Supplier" },
  { name: "quantity", label: "Quantity", type: "number" },
  { name: "expiry_date", label: "Expiry Date", type: "date" },
];

const TABS = [
  { key: "list", label: "Item's List" },
  { key: "expiring", label: "Expiring Soon" },
];

export function StorePage() {
  const [tab, setTab] = useState("list");

  // Expiring-soon view: pull the full list and flag items within 30 days client-side
  // (the generic CRUD filter only supports equality, not date ranges).
  const { data, isLoading } = useQuery({
    queryKey: ["store-expiring"],
    queryFn: () => fetchList("/store-items", { page_size: 500, sort: "expiry_date", order: "asc" }),
    enabled: tab === "expiring",
  });
  const expiring = (data?.items ?? []).filter((r: any) => expiringSoon(r.expiry_date));

  return (
    <div className="space-y-5">
      <SectionBanner icon={<Boxes size={22} />} title="Store / Inventory" subtitle="Consumables, blood bags & reagents · expiry forecast" />

      <Card className="overflow-hidden">
        <div className="flex border-b border-line-table px-4">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`relative px-4 py-3 text-sm font-bold transition ${tab === t.key ? "text-accent" : "text-muted hover:text-ink-4"}`}
            >
              {t.label}
              {tab === t.key && <span className="absolute inset-x-3 bottom-0 h-[3px] rounded-t bg-accent" />}
            </button>
          ))}
        </div>

        <div className="p-5">
          {tab === "list" ? (
            <DataTable
              path="/store-items"
              columns={columns}
              searchPlaceholder="Search item / supplier…"
              defaultSort="expiry_date"
              defaultOrder="asc"
              emptyMessage="No items in store."
              filterFields={[{ name: "item_type", label: "Type", options: ITEM_TYPES }]}
              crud={{ name: "Item", fields }}
            />
          ) : (
            <ExpiringView items={expiring} isLoading={isLoading} />
          )}
        </div>
      </Card>
    </div>
  );
}

function ExpiringView({ items, isLoading }: { items: any[]; isLoading: boolean }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-3">
        <StatCard label="Expiring ≤ 30 days" value={items.length} icon={<AlertTriangle size={20} />} />
        <StatCard label="Expiring ≤ 7 days" value={items.filter((r) => (daysLeft(r.expiry_date) ?? 99) <= 7).length} />
        <StatCard label="Total units at risk" value={items.reduce((s, r) => s + (Number(r.quantity) || 0), 0)} />
      </div>
      <div className="overflow-x-auto rounded-xl border border-line-table">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-fill text-[12.5px] font-bold uppercase tracking-wide text-muted">
              <th className="px-4 py-3 text-left">Item</th>
              <th className="px-4 py-3 text-left">Type</th>
              <th className="px-4 py-3 text-left">Supplier</th>
              <th className="px-4 py-3 text-right">Qty</th>
              <th className="px-4 py-3 text-left">Expiry</th>
              <th className="px-4 py-3 text-center">Days Left</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="py-12 text-center text-muted">Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={6}><EmptyState message="Nothing expiring within 30 days." /></td></tr>
            ) : (
              items.map((r) => (
                <tr key={r.id} className="border-t border-line-table hover:bg-rowtint">
                  <td className="px-4 py-3 font-bold text-ink">{r.name}</td>
                  <td className="px-4 py-3 capitalize text-ink-3">{(r.item_type || "").replace(/_/g, " ")}</td>
                  <td className="px-4 py-3 text-ink-3">{r.supplier || "—"}</td>
                  <td className="px-4 py-3 text-right text-ink-3">{r.quantity}</td>
                  <td className="px-4 py-3 text-ink-3">{fmtDate(r.expiry_date)}</td>
                  <td className="px-4 py-3 text-center">
                    <StatusPill tone={(daysLeft(r.expiry_date) ?? 99) <= 7 ? "danger" : "warn"}>
                      {daysLeft(r.expiry_date)} d
                    </StatusPill>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
