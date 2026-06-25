import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FlaskConical } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { canWrite } from "@/lib/rbac";
import { AllCompleted, PipelineStepper, type Stage } from "@/components/Pipeline";
import { Card, EmptyState, ErrorNote, PrimaryButton, SectionBanner } from "@/components/ui";

const PIPELINES: Record<string, { title: string; stages: Stage[] }> = {
  component: {
    title: "Component Preparation",
    stages: [
      { key: "segmentation", label: "Segment Grouping" },
      { key: "processing", label: "Blood Processing" },
      { key: "volume", label: "Volume Measurement" },
      { key: "validation", label: "Validation" },
    ],
  },
  grouping: {
    title: "Blood Grouping",
    stages: [
      { key: "forward-reverse", label: "Forward / Reverse" },
      { key: "validation", label: "Validation" },
    ],
  },
  tti: {
    title: "TTI Screening",
    stages: [
      { key: "hiv-hbsag-hcv", label: "HIV / HBsAg / HCV" },
      { key: "vdrl-mp", label: "VDRL / MP" },
      { key: "validation", label: "Validation" },
    ],
  },
};

// The component CRUD route lives at `/components`, so its pipeline endpoints are
// mounted under the plural prefix. Grouping/TTI use their key verbatim.
const API_PREFIX: Record<string, string> = { component: "components" };

export function PipelinePage() {
  const { pipeline = "component", stage = "" } = useParams();
  const cfg = PIPELINES[pipeline];
  const apiPipeline = API_PREFIX[pipeline] ?? pipeline;
  const qc = useQueryClient();
  const { me } = useAuth();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Validation stages require a supervisor; data-entry stages require a technician.
  const mayAdvance = canWrite(me?.role, stage === "validation" ? "validation" : apiPipeline);

  const queryKey = ["pipeline", pipeline, stage];
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => (await api.get(`/${apiPipeline}/pipeline/${stage}`)).data,
    enabled: !!cfg,
  });

  const advance = useMutation({
    mutationFn: async (ids: string[]) => (await api.post(`/${apiPipeline}/pipeline/${stage}/advance`, { ids, data: {} })).data,
    onSuccess: () => {
      setSelected(new Set());
      qc.invalidateQueries({ queryKey });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const items: any[] = data?.items ?? [];
  const cols = useMemo(
    () => (items[0] ? Object.keys(items[0]).filter((k) => !["org_id", "is_deleted", "created_at", "updated_at"].includes(k)).slice(0, 6) : []),
    [items],
  );

  if (!cfg) return <EmptyState message="Unknown pipeline." />;

  function toggle(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }
  function toggleAll() {
    setSelected((s) => (s.size === items.length ? new Set() : new Set(items.map((i) => i.id))));
  }

  return (
    <div className="space-y-5">
      <SectionBanner
        icon={<FlaskConical size={22} />}
        title={cfg.title}
        subtitle={`Stage: ${cfg.stages.find((s) => s.key === stage)?.label ?? stage}`}
      />
      <Card className="p-6">
        <PipelineStepper stages={cfg.stages} active={stage} basePath={`/pipeline/${pipeline}`} />
      </Card>

      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-[17px] font-bold text-ink">Queue · {data?.queue_count ?? 0} pending</h3>
          {items.length > 0 && mayAdvance && (
            <PrimaryButton onClick={() => advance.mutate([...selected])} disabled={selected.size === 0 || advance.isPending}>
              {advance.isPending ? "Advancing…" : `Advance ${selected.size || ""} →`}
            </PrimaryButton>
          )}
        </div>

        {advance.isError && <ErrorNote className="mb-4" error={advance.error} fallback="Could not advance the selected items." />}

        {isLoading ? (
          <p className="py-10 text-center text-muted">Loading…</p>
        ) : items.length === 0 ? (
          <AllCompleted />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-line-table">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-fill text-[12px] font-bold uppercase text-muted">
                  <th className="px-3 py-2.5"><input type="checkbox" checked={selected.size === items.length} onChange={toggleAll} /></th>
                  {cols.map((c) => (
                    <th key={c} className="px-3 py-2.5 text-left">{c.replace(/_/g, " ")}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id} className="border-t border-line-table hover:bg-rowtint">
                    <td className="px-3 py-2.5 text-center"><input type="checkbox" checked={selected.has(row.id)} onChange={() => toggle(row.id)} /></td>
                    {cols.map((c) => (
                      <td key={c} className="px-3 py-2.5 text-ink-3">{String(row[c] ?? "—").slice(0, 28)}</td>
                    ))}
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
