import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Biohazard, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { canWrite } from "@/lib/rbac";
import { ComponentChip, Card, EmptyState, SectionBanner } from "@/components/ui";
import { fmtDate } from "@/lib/format";

const REASONS = ["HIV Reactive", "HBsAg Reactive", "HCV Reactive", "VDRL Reactive", "Expired Component", "Quantity Not Sufficient (QNS)"];

export function QuarantinePage() {
  const { me } = useAuth();
  const qc = useQueryClient();
  const mayDiscard = canWrite(me?.role, "discard");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [reason, setReason] = useState(REASONS[0]);
  const [notice, setNotice] = useState("");

  const { data, isLoading } = useQuery({ queryKey: ["quarantine"], queryFn: async () => (await api.get("/quarantine")).data });
  const items: any[] = data?.items ?? [];

  const discard = useMutation({
    mutationFn: async () => (await api.post("/discard", { component_ids: [...selected], reason })).data,
    onSuccess: (d) => {
      setNotice(`Discarded ${d.discarded} component(s) — reason: ${d.reason}.`);
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["quarantine"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: any) => setNotice(e?.response?.data?.detail ?? "Could not discard."),
  });

  function toggle(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  return (
    <div className="space-y-5">
      <SectionBanner
        icon={<Biohazard size={22} />}
        title="Lab — Quarantine & Discard"
        subtitle="Reactive / expired units held for discard · routed automatically from TTI"
        right={
          mayDiscard && (
            <div className="flex items-center gap-2">
              <select value={reason} onChange={(e) => setReason(e.target.value)} className="rounded-btn bg-white/90 px-3 py-2 text-sm font-semibold text-ink-4">
                {REASONS.map((r) => <option key={r}>{r}</option>)}
              </select>
              <button
                onClick={() => discard.mutate()}
                disabled={selected.size === 0 || discard.isPending}
                className="inline-flex items-center gap-1.5 rounded-btn bg-white px-4 py-2 text-sm font-bold text-accent-deep disabled:opacity-50"
              >
                <Trash2 size={15} /> Discard {selected.size || ""}
              </button>
            </div>
          )
        }
      />
      {notice && <Card className="p-3 text-sm font-semibold text-accent-deep">{notice}</Card>}
      <Card className="p-6">
        <h3 className="mb-4 font-display text-[17px] font-bold text-ink">Quarantined Components · {items.length}</h3>
        {isLoading ? (
          <p className="py-10 text-center text-muted">Loading…</p>
        ) : items.length === 0 ? (
          <EmptyState message="No components in quarantine." />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-line-table">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-fill text-[12px] font-bold uppercase text-muted">
                  {mayDiscard && <th className="px-3 py-2.5">Sel</th>}
                  <th className="px-4 py-2.5 text-left">Component</th>
                  <th className="px-4 py-2.5 text-left">Group</th>
                  <th className="px-4 py-2.5 text-right">Volume</th>
                  <th className="px-4 py-2.5 text-left">Prepared</th>
                  <th className="px-4 py-2.5 text-left">Expiry</th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c.id} className="border-t border-line-table hover:bg-rowtint">
                    {mayDiscard && (
                      <td className="px-3 py-2.5 text-center">
                        <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} />
                      </td>
                    )}
                    <td className="px-4 py-2.5"><ComponentChip type={c.type} /></td>
                    <td className="px-4 py-2.5 font-bold text-accent-deep">{c.blood_group}</td>
                    <td className="px-4 py-2.5 text-right">{c.volume_ml}</td>
                    <td className="px-4 py-2.5 text-ink-3">{fmtDate(c.prepared_date)}</td>
                    <td className="px-4 py-2.5 text-ink-3">{fmtDate(c.expiry_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
