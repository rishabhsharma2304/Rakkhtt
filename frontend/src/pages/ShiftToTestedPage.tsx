import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRightLeft } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { canWrite } from "@/lib/rbac";
import { Card, EmptyState, ErrorNote, ErrorState, LoadingState, PrimaryButton, SectionBanner } from "@/components/ui";
import { ComponentChip } from "@/components/ui";
import { fmtDate } from "@/lib/format";

export function ShiftToTestedPage() {
  const qc = useQueryClient();
  const { me } = useAuth();
  const mayShift = canWrite(me?.role, "shift");
  const { data, isLoading, isError, error } = useQuery({ queryKey: ["untested"], queryFn: async () => (await api.get("/stock/untested")).data });
  const shift = useMutation({
    mutationFn: async () => (await api.post("/stock/shift-to-tested", { ids: [] })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["untested"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const items: any[] = data?.items ?? [];

  return (
    <div className="space-y-5">
      <SectionBanner
        icon={<ArrowRightLeft size={22} />}
        title="Shift To Tested Stock"
        subtitle="Validated grouping + TTI-clear components move to issuable tested stock"
        right={
          mayShift ? (
            <PrimaryButton onClick={() => shift.mutate()} disabled={shift.isPending || items.length === 0} className="!bg-white !text-accent-deep !shadow-none">
              {shift.isPending ? "Shifting…" : "Shift Eligible →"}
            </PrimaryButton>
          ) : undefined
        }
      />
      {shift.isError && <ErrorNote error={shift.error} fallback="Could not shift components to tested stock." />}
      {shift.data && (
        <Card className="border-success/30 bg-success-bg/40 p-4 text-sm font-semibold text-success">
          Moved {shift.data.moved} component(s) to tested stock. {shift.data.blocked} blocked (pending validation / reactive).
        </Card>
      )}
      <Card className="p-6">
        <h3 className="mb-4 font-display text-[17px] font-bold text-ink">Untested Components · {items.length}</h3>
        {isLoading ? (
          <LoadingState />
        ) : isError ? (
          <ErrorState error={error} />
        ) : items.length === 0 ? (
          <EmptyState message="No untested components — all stock is tested." />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-line-table">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-fill text-[12px] font-bold uppercase text-muted">
                  <th className="px-4 py-2.5 text-left">Component</th>
                  <th className="px-4 py-2.5 text-left">Group</th>
                  <th className="px-4 py-2.5 text-right">Volume</th>
                  <th className="px-4 py-2.5 text-left">Prepared</th>
                  <th className="px-4 py-2.5 text-left">Expiry</th>
                </tr>
              </thead>
              <tbody>
                {items.slice(0, 100).map((c) => (
                  <tr key={c.id} className="border-t border-line-table hover:bg-rowtint">
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
